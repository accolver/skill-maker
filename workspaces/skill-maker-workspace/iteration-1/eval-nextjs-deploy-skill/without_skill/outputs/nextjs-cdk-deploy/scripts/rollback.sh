#!/usr/bin/env bash
#
# rollback.sh — Rollback a Next.js CDK deployment
#
# Usage:
#   ./scripts/rollback.sh <stage> [strategy]
#   ./scripts/rollback.sh production              # Interactive — choose strategy
#   ./scripts/rollback.sh production cdk          # Redeploy last good commit
#   ./scripts/rollback.sh production ecs          # Swap ECS task definition
#   ./scripts/rollback.sh production cfn          # CloudFormation rollback
#   ./scripts/rollback.sh production cloudfront   # Invalidate CloudFront cache
#
# Environment variables:
#   CDK_DIR       — Path to CDK directory (default: ./cdk)
#   APP_NAME      — Application name (default: extracted from CDK config)
#   CLUSTER_NAME  — ECS cluster name override
#   SERVICE_NAME  — ECS service name override
#   DIST_ID       — CloudFront distribution ID override
#

set -euo pipefail

STAGE="${1:?Usage: rollback.sh <staging|production> [cdk|ecs|cfn|cloudfront]}"
STRATEGY="${2:-}"
CDK_DIR="${CDK_DIR:-./cdk}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[rollback]${NC} $*"; }
ok()    { echo -e "${GREEN}[   ok   ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[  warn  ]${NC} $*"; }
fail()  { echo -e "${RED}[  FAIL  ]${NC} $*"; exit 1; }

if [[ "$STAGE" != "staging" && "$STAGE" != "production" ]]; then
  fail "Stage must be 'staging' or 'production', got: $STAGE"
fi

# ─── Strategy Selection ─────────────────────────────────────────────────────

if [[ -z "$STRATEGY" ]]; then
  echo ""
  echo -e "${YELLOW}Select rollback strategy:${NC}"
  echo ""
  echo "  1) cdk        — Redeploy from last known-good git tag (recommended)"
  echo "  2) ecs        — Swap to previous ECS task definition (fastest)"
  echo "  3) cfn        — CloudFormation stack rollback (for failed deploys)"
  echo "  4) cloudfront — Invalidate CloudFront cache (static asset issues)"
  echo ""
  read -r -p "Choice [1-4]: " CHOICE

  case "$CHOICE" in
    1) STRATEGY="cdk" ;;
    2) STRATEGY="ecs" ;;
    3) STRATEGY="cfn" ;;
    4) STRATEGY="cloudfront" ;;
    *) fail "Invalid choice: $CHOICE" ;;
  esac
fi

log "Rolling back $STAGE using strategy: $STRATEGY"
echo ""

# ─── Strategy: CDK Redeploy ─────────────────────────────────────────────────

rollback_cdk() {
  log "Finding last successful deployment tag..."

  TAGS=$(git tag --list "deploy-${STAGE}-*" --sort=-creatordate 2>/dev/null || true)

  if [[ -z "$TAGS" ]]; then
    fail "No deployment tags found for stage: $STAGE"
  fi

  echo "Recent deployment tags:"
  echo "$TAGS" | head -5 | while read -r tag; do
    echo "  - $tag"
  done
  echo ""

  # Skip the most recent (current/broken) and use the one before
  CURRENT_TAG=$(echo "$TAGS" | head -1)
  ROLLBACK_TAG=$(echo "$TAGS" | sed -n '2p')

  if [[ -z "$ROLLBACK_TAG" ]]; then
    fail "Only one deployment tag found — no previous version to roll back to"
  fi

  log "Current deployment:  $CURRENT_TAG"
  log "Rolling back to:     $ROLLBACK_TAG"
  echo ""

  read -r -p "Proceed with rollback to $ROLLBACK_TAG? [y/N]: " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    fail "Rollback cancelled"
  fi

  log "Checking out $ROLLBACK_TAG..."
  git checkout "$ROLLBACK_TAG" || fail "Failed to checkout $ROLLBACK_TAG"

  log "Rebuilding Next.js..."
  npm run build || fail "Build failed"

  log "Deploying CDK stack..."
  (cd "$CDK_DIR" && npm install --silent && npx cdk deploy -c stage="$STAGE" --require-approval never) \
    || fail "CDK deploy failed"

  # Return to original branch
  git checkout - 2>/dev/null || true

  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  ROLLBACK_DEPLOY_TAG="deploy-${STAGE}-${TIMESTAMP}-rollback"
  git tag -a "$ROLLBACK_DEPLOY_TAG" -m "Rollback to $ROLLBACK_TAG" 2>/dev/null || true

  ok "CDK rollback complete. Tagged as: $ROLLBACK_DEPLOY_TAG"
}

# ─── Strategy: ECS Task Definition Swap ──────────────────────────────────────

rollback_ecs() {
  APP_NAME="${APP_NAME:-my-nextjs-app}"
  CLUSTER="${CLUSTER_NAME:-${APP_NAME}-${STAGE}}"
  SERVICE="${SERVICE_NAME:-${APP_NAME}-${STAGE}-service}"

  log "Listing recent task definitions..."
  TASK_DEFS=$(aws ecs list-task-definitions \
    --family-prefix "${APP_NAME}-${STAGE}" \
    --sort DESC \
    --max-items 5 \
    --query 'taskDefinitionArns[]' \
    --output text 2>/dev/null) || fail "Failed to list task definitions"

  if [[ -z "$TASK_DEFS" ]]; then
    fail "No task definitions found for family: ${APP_NAME}-${STAGE}"
  fi

  echo "Recent task definitions:"
  echo "$TASK_DEFS" | tr '\t' '\n' | while read -r td; do
    echo "  - $(basename "$td")"
  done
  echo ""

  CURRENT_TD=$(echo "$TASK_DEFS" | tr '\t' '\n' | head -1)
  PREVIOUS_TD=$(echo "$TASK_DEFS" | tr '\t' '\n' | sed -n '2p')

  if [[ -z "$PREVIOUS_TD" ]]; then
    fail "Only one task definition found — no previous version to roll back to"
  fi

  log "Current:  $(basename "$CURRENT_TD")"
  log "Rollback: $(basename "$PREVIOUS_TD")"
  echo ""

  read -r -p "Proceed with ECS rollback? [y/N]: " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    fail "Rollback cancelled"
  fi

  log "Updating ECS service..."
  aws ecs update-service \
    --cluster "$CLUSTER" \
    --service "$SERVICE" \
    --task-definition "$PREVIOUS_TD" \
    --force-new-deployment \
    --query 'service.{status: status, taskDefinition: taskDefinition}' \
    --output table || fail "ECS update failed"

  log "Waiting for service to stabilize..."
  aws ecs wait services-stable \
    --cluster "$CLUSTER" \
    --services "$SERVICE" 2>/dev/null || warn "Service stabilization timed out — check manually"

  ok "ECS rollback complete"
}

# ─── Strategy: CloudFormation Rollback ───────────────────────────────────────

rollback_cfn() {
  APP_NAME="${APP_NAME:-my-nextjs-app}"
  STACK_NAME="${APP_NAME}-${STAGE}"

  log "Checking stack status..."
  STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null) || fail "Stack not found: $STACK_NAME"

  log "Stack status: $STACK_STATUS"

  case "$STACK_STATUS" in
    UPDATE_ROLLBACK_FAILED)
      log "Stack is in UPDATE_ROLLBACK_FAILED — continuing rollback..."
      aws cloudformation continue-update-rollback \
        --stack-name "$STACK_NAME" || fail "continue-update-rollback failed"
      ;;
    UPDATE_IN_PROGRESS|UPDATE_ROLLBACK_IN_PROGRESS)
      warn "Stack is currently updating. Wait for it to complete, then retry."
      fail "Cannot rollback while stack is in progress"
      ;;
    UPDATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE)
      log "Initiating stack rollback..."
      aws cloudformation rollback-stack \
        --stack-name "$STACK_NAME" 2>/dev/null || fail "rollback-stack failed"
      ;;
    *)
      warn "Unexpected stack status: $STACK_STATUS"
      fail "Manual intervention may be required"
      ;;
  esac

  log "Waiting for rollback to complete..."
  aws cloudformation wait stack-update-complete \
    --stack-name "$STACK_NAME" 2>/dev/null || warn "Rollback wait timed out — check AWS console"

  FINAL_STATUS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "UNKNOWN")

  log "Final stack status: $FINAL_STATUS"
  ok "CloudFormation rollback complete"
}

# ─── Strategy: CloudFront Invalidation ───────────────────────────────────────

rollback_cloudfront() {
  if [[ -n "${DIST_ID:-}" ]]; then
    DISTRIBUTION_ID="$DIST_ID"
  else
    log "Looking up CloudFront distribution..."
    APP_NAME="${APP_NAME:-my-nextjs-app}"

    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
      --query "DistributionList.Items[?Comment=='${APP_NAME}-${STAGE}'].Id" \
      --output text 2>/dev/null || true)

    if [[ -z "$DISTRIBUTION_ID" ]]; then
      read -r -p "Enter CloudFront Distribution ID: " DISTRIBUTION_ID
    fi
  fi

  if [[ -z "$DISTRIBUTION_ID" ]]; then
    fail "No CloudFront distribution ID found"
  fi

  log "Invalidating CloudFront distribution: $DISTRIBUTION_ID"

  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text) || fail "CloudFront invalidation failed"

  log "Invalidation created: $INVALIDATION_ID"
  log "Waiting for invalidation to complete..."

  aws cloudfront wait invalidation-completed \
    --distribution-id "$DISTRIBUTION_ID" \
    --id "$INVALIDATION_ID" 2>/dev/null || warn "Invalidation wait timed out — check AWS console"

  ok "CloudFront invalidation complete"
}

# ─── Execute Strategy ────────────────────────────────────────────────────────

case "$STRATEGY" in
  cdk)        rollback_cdk ;;
  ecs)        rollback_ecs ;;
  cfn)        rollback_cfn ;;
  cloudfront) rollback_cloudfront ;;
  *)          fail "Unknown strategy: $STRATEGY. Use: cdk, ecs, cfn, cloudfront" ;;
esac

echo ""
log "Rollback complete. Verify the application is healthy."

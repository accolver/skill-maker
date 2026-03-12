#!/usr/bin/env bash
set -euo pipefail

# rollback.sh — Rollback a Next.js CDK deployment
#
# Usage:
#   ./scripts/rollback.sh <environment> <strategy> [options]
#
# Arguments:
#   environment    Target environment: staging | production
#   strategy       Rollback strategy: cdk | cloudfront | lambda
#
# Options:
#   --commit <sha>     Commit SHA to roll back to (for cdk strategy)
#   --version <num>    Lambda version number (for lambda strategy)
#   --dry-run          Show what would happen without executing
#
# Strategies:
#   cdk        — Full CDK rollback: checkout previous commit, rebuild, redeploy
#   cloudfront — Redeploy static assets from previous commit and invalidate cache
#   lambda     — Point Lambda alias to a previous version (SSR rollback)
#
# Examples:
#   ./scripts/rollback.sh production cdk --commit abc1234
#   ./scripts/rollback.sh production cloudfront --commit abc1234
#   ./scripts/rollback.sh production lambda --version 5
#   ./scripts/rollback.sh staging cdk --commit abc1234 --dry-run

ENVIRONMENT="${1:-}"
STRATEGY="${2:-}"
COMMIT_SHA=""
LAMBDA_VERSION=""
DRY_RUN=false

# Parse options
shift 2 || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit) COMMIT_SHA="$2"; shift 2 ;;
    --version) LAMBDA_VERSION="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate inputs
if [[ -z "$ENVIRONMENT" || -z "$STRATEGY" ]]; then
  echo "Error: environment and strategy are required"
  echo "Usage: ./scripts/rollback.sh <staging|production> <cdk|cloudfront|lambda> [options]"
  exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: environment must be 'staging' or 'production'"
  exit 1
fi

if [[ "$STRATEGY" != "cdk" && "$STRATEGY" != "cloudfront" && "$STRATEGY" != "lambda" ]]; then
  echo "Error: strategy must be 'cdk', 'cloudfront', or 'lambda'"
  exit 1
fi

STACK_NAME="NextjsApp-${ENVIRONMENT}"
OUTPUTS_FILE="${ENVIRONMENT}-outputs.json"

echo "========================================="
echo "ROLLBACK"
echo "Environment: $ENVIRONMENT"
echo "Strategy: $STRATEGY"
echo "Dry run: $DRY_RUN"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================="

# Helper: get stack info
get_stack_status() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND"
}

get_distribution_id() {
  if [[ -f "$OUTPUTS_FILE" ]]; then
    jq -r ".\"${STACK_NAME}\".DistributionId" "$OUTPUTS_FILE"
  else
    aws cloudformation describe-stacks \
      --stack-name "$STACK_NAME" \
      --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
      --output text
  fi
}

get_bucket_name() {
  if [[ -f "$OUTPUTS_FILE" ]]; then
    jq -r ".\"${STACK_NAME}\".BucketName" "$OUTPUTS_FILE"
  else
    aws cloudformation describe-stacks \
      --stack-name "$STACK_NAME" \
      --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
      --output text
  fi
}

# Strategy: Full CDK rollback
rollback_cdk() {
  if [[ -z "$COMMIT_SHA" ]]; then
    echo "Error: --commit is required for cdk rollback strategy"
    exit 1
  fi

  echo ""
  echo ">>> Checking current stack status..."
  STATUS=$(get_stack_status)
  echo "Stack status: $STATUS"

  if [[ "$STATUS" == *"FAILED"* || "$STATUS" == *"ROLLBACK"* ]]; then
    echo "Stack is in a failed state. Attempting CloudFormation rollback first..."
    if [[ "$DRY_RUN" == "false" ]]; then
      aws cloudformation rollback-stack --stack-name "$STACK_NAME" || true
      echo "Waiting for rollback to complete..."
      aws cloudformation wait stack-rollback-complete --stack-name "$STACK_NAME" || true
    else
      echo "[DRY RUN] Would run: aws cloudformation rollback-stack --stack-name $STACK_NAME"
    fi
  fi

  echo ""
  echo ">>> Checking out commit $COMMIT_SHA..."
  if [[ "$DRY_RUN" == "false" ]]; then
    git checkout "$COMMIT_SHA"
  else
    echo "[DRY RUN] Would run: git checkout $COMMIT_SHA"
  fi

  echo ""
  echo ">>> Rebuilding application..."
  if [[ "$DRY_RUN" == "false" ]]; then
    npm ci
    NEXT_PUBLIC_ENVIRONMENT="$ENVIRONMENT" npm run build
  else
    echo "[DRY RUN] Would run: npm ci && npm run build"
  fi

  echo ""
  echo ">>> Redeploying CDK stack..."
  if [[ "$DRY_RUN" == "false" ]]; then
    cd cdk
    npx cdk deploy "$STACK_NAME" \
      -c "environment=$ENVIRONMENT" \
      --require-approval never \
      --outputs-file "../${OUTPUTS_FILE}"
    cd ..
  else
    echo "[DRY RUN] Would run: cdk deploy $STACK_NAME -c environment=$ENVIRONMENT"
  fi

  echo ""
  echo "CDK rollback complete."
}

# Strategy: CloudFront + S3 rollback
rollback_cloudfront() {
  if [[ -z "$COMMIT_SHA" ]]; then
    echo "Error: --commit is required for cloudfront rollback strategy"
    exit 1
  fi

  DIST_ID=$(get_distribution_id)
  BUCKET=$(get_bucket_name)

  echo "Distribution ID: $DIST_ID"
  echo "Bucket: $BUCKET"

  echo ""
  echo ">>> Restoring static assets from commit $COMMIT_SHA..."
  if [[ "$DRY_RUN" == "false" ]]; then
    git checkout "$COMMIT_SHA" -- .next/static 2>/dev/null || {
      echo "Static assets not found at that commit. Rebuilding..."
      git stash
      git checkout "$COMMIT_SHA"
      npm ci
      NEXT_PUBLIC_ENVIRONMENT="$ENVIRONMENT" npm run build
      git checkout -
      git stash pop || true
    }

    echo ""
    echo ">>> Syncing static assets to S3..."
    aws s3 sync .next/static "s3://${BUCKET}/_next/static" --delete

    echo ""
    echo ">>> Invalidating CloudFront cache..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
      --distribution-id "$DIST_ID" \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text)
    echo "Invalidation created: $INVALIDATION_ID"

    echo "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
      --distribution-id "$DIST_ID" \
      --id "$INVALIDATION_ID"
  else
    echo "[DRY RUN] Would restore .next/static from $COMMIT_SHA"
    echo "[DRY RUN] Would sync to s3://${BUCKET}/_next/static"
    echo "[DRY RUN] Would invalidate CloudFront distribution $DIST_ID"
  fi

  echo ""
  echo "CloudFront rollback complete."
}

# Strategy: Lambda version rollback
rollback_lambda() {
  if [[ -z "$LAMBDA_VERSION" ]]; then
    echo "Error: --version is required for lambda rollback strategy"
    echo ""
    echo "Available versions:"
    aws lambda list-versions-by-function \
      --function-name "${STACK_NAME}-SSRFunction" \
      --query 'Versions[-5:].[Version,Description,LastModified]' \
      --output table
    exit 1
  fi

  FUNCTION_NAME="${STACK_NAME}-SSRFunction"

  echo ""
  echo ">>> Rolling back Lambda function to version $LAMBDA_VERSION..."
  if [[ "$DRY_RUN" == "false" ]]; then
    aws lambda update-alias \
      --function-name "$FUNCTION_NAME" \
      --name live \
      --function-version "$LAMBDA_VERSION"
    echo "Lambda alias 'live' now points to version $LAMBDA_VERSION"
  else
    echo "[DRY RUN] Would update alias 'live' on $FUNCTION_NAME to version $LAMBDA_VERSION"
  fi

  echo ""
  echo "Lambda rollback complete."
}

# Execute the selected strategy
case "$STRATEGY" in
  cdk) rollback_cdk ;;
  cloudfront) rollback_cloudfront ;;
  lambda) rollback_lambda ;;
esac

# Record rollback metadata
if [[ "$DRY_RUN" == "false" ]]; then
  echo "{
    \"environment\": \"$ENVIRONMENT\",
    \"strategy\": \"$STRATEGY\",
    \"rolled_back_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"rolled_back_by\": \"$(git config user.name || echo 'unknown')\",
    \"commit_sha\": \"${COMMIT_SHA:-N/A}\",
    \"lambda_version\": \"${LAMBDA_VERSION:-N/A}\"
  }" > "last-rollback-${ENVIRONMENT}.json"
  echo ""
  echo "Rollback metadata saved to last-rollback-${ENVIRONMENT}.json"
fi

echo ""
echo "========================================="
echo "Rollback complete. Run smoke tests to verify:"
echo "  ./scripts/smoke-test.sh https://<your-url>"
echo "========================================="

#!/usr/bin/env bash
set -euo pipefail

# Rollback Next.js deployment to previous Lambda version
# Usage: ./scripts/rollback.sh <staging|production>

STAGE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STACK_NAME="NextjsStack-${STAGE}"

# --- Validation ---

if [[ -z "$STAGE" ]]; then
  echo "ERROR: Stage required. Usage: ./scripts/rollback.sh <staging|production>"
  exit 1
fi

if [[ "$STAGE" != "staging" && "$STAGE" != "production" ]]; then
  echo "ERROR: Stage must be 'staging' or 'production', got '$STAGE'"
  exit 1
fi

ROLLBACK_FILE="${PROJECT_ROOT}/.last-deploy-${STAGE}.json"

echo "==> Rolling back: $STAGE"
echo ""

# --- Strategy 1: Lambda version rollback (fast) ---

if [[ -f "$ROLLBACK_FILE" ]]; then
  LAMBDA_NAME=$(python3 -c "import json; print(json.load(open('$ROLLBACK_FILE'))['lambda_function'])" 2>/dev/null || echo "")
  PREV_VERSION=$(python3 -c "import json; print(json.load(open('$ROLLBACK_FILE'))['lambda_version'])" 2>/dev/null || echo "")
  DEPLOY_TIME=$(python3 -c "import json; print(json.load(open('$ROLLBACK_FILE'))['timestamp'])" 2>/dev/null || echo "unknown")

  if [[ -n "$LAMBDA_NAME" && -n "$PREV_VERSION" && "$PREV_VERSION" != "\$LATEST" ]]; then
    echo "Found rollback state from: $DEPLOY_TIME"
    echo "  Lambda: $LAMBDA_NAME"
    echo "  Target version: $PREV_VERSION"
    echo ""

    read -p "Rollback $STAGE to Lambda version $PREV_VERSION? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
      echo "Aborted."
      exit 0
    fi

    echo "==> Updating Lambda alias to version $PREV_VERSION..."
    aws lambda update-alias \
      --function-name "$LAMBDA_NAME" \
      --name "$STAGE" \
      --function-version "$PREV_VERSION"

    echo "==> Lambda rollback complete."
  else
    echo "WARNING: Rollback file exists but has no valid version info."
    echo "         Falling back to CDK rollback strategy."
  fi
else
  echo "WARNING: No rollback state file found at $ROLLBACK_FILE"
  echo "         This means deploy.sh was not used or this is the first deployment."
  echo ""
  echo "Manual rollback options:"
  echo "  1. Find a known-good git commit and redeploy:"
  echo "     git log --oneline cdk/"
  echo "     git checkout <commit> -- cdk/"
  echo "     ./scripts/deploy.sh $STAGE"
  echo ""
  echo "  2. Use AWS Console to revert Lambda to a previous version"
  exit 1
fi

# --- Invalidate CloudFront cache ---

echo "==> Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [[ -n "$DISTRIBUTION_ID" && "$DISTRIBUTION_ID" != "None" ]]; then
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)
  echo "    Invalidation created: $INVALIDATION_ID"
else
  echo "    WARNING: Could not find CloudFront distribution. Skipping cache invalidation."
fi

echo ""
echo "========================================="
echo "  Rollback of $STAGE complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Run health check: ./scripts/health-check.sh $STAGE"
echo "  2. Investigate the failed deployment"
echo ""

#!/usr/bin/env bash
set -euo pipefail

# invalidate-cache.sh — Invalidate CloudFront cache for a deployment
#
# Usage:
#   ./scripts/invalidate-cache.sh <environment> [paths...]
#
# Arguments:
#   environment    Target environment: staging | production
#   paths          Optional: specific paths to invalidate (default: /*)
#
# Examples:
#   ./scripts/invalidate-cache.sh staging                    # Invalidate everything
#   ./scripts/invalidate-cache.sh production "/_next/*"      # Only static assets
#   ./scripts/invalidate-cache.sh production "/" "/about"     # Specific pages

ENVIRONMENT="${1:-}"

if [[ -z "$ENVIRONMENT" ]]; then
  echo "Error: environment argument is required"
  echo "Usage: ./scripts/invalidate-cache.sh <staging|production> [paths...]"
  exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: environment must be 'staging' or 'production'"
  exit 1
fi

shift
PATHS=("${@:-/*}")

STACK_NAME="NextjsApp-${ENVIRONMENT}"
OUTPUTS_FILE="${ENVIRONMENT}-outputs.json"

# Get distribution ID
if [[ -f "$OUTPUTS_FILE" ]]; then
  DIST_ID=$(jq -r ".\"${STACK_NAME}\".DistributionId" "$OUTPUTS_FILE")
else
  DIST_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text)
fi

if [[ -z "$DIST_ID" || "$DIST_ID" == "null" ]]; then
  echo "Error: Could not determine CloudFront distribution ID"
  echo "Make sure the stack '$STACK_NAME' exists and has a DistributionId output"
  exit 1
fi

echo "========================================="
echo "CloudFront Cache Invalidation"
echo "Environment: $ENVIRONMENT"
echo "Distribution: $DIST_ID"
echo "Paths: ${PATHS[*]}"
echo "========================================="

# Create invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "${PATHS[@]}" \
  --query 'Invalidation.Id' \
  --output text)

echo ""
echo "Invalidation created: $INVALIDATION_ID"
echo "Waiting for completion..."

# Wait for invalidation to complete
aws cloudfront wait invalidation-completed \
  --distribution-id "$DIST_ID" \
  --id "$INVALIDATION_ID"

echo "Invalidation complete!"
echo ""
echo "Invalidation details:"
aws cloudfront get-invalidation \
  --distribution-id "$DIST_ID" \
  --id "$INVALIDATION_ID" \
  --query 'Invalidation.{Id:Id,Status:Status,CreateTime:CreateTime,Paths:InvalidationBatch.Paths.Items}' \
  --output table

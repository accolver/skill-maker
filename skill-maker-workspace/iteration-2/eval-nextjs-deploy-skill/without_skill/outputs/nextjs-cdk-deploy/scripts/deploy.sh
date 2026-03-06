#!/usr/bin/env bash
set -euo pipefail

# Deploy Next.js app to AWS using CDK
# Usage: ./scripts/deploy.sh <staging|production>

STAGE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STACK_NAME="NextjsStack-${STAGE}"

# --- Validation ---

if [[ -z "$STAGE" ]]; then
  echo "ERROR: Stage required. Usage: ./scripts/deploy.sh <staging|production>"
  exit 1
fi

if [[ "$STAGE" != "staging" && "$STAGE" != "production" ]]; then
  echo "ERROR: Stage must be 'staging' or 'production', got '$STAGE'"
  exit 1
fi

CONFIG_FILE="${PROJECT_ROOT}/config/${STAGE}.env"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "ERROR: Config file not found: $CONFIG_FILE"
  exit 1
fi

# --- Production safety gate ---

if [[ "$STAGE" == "production" ]]; then
  echo ""
  echo "========================================="
  echo "  PRODUCTION DEPLOYMENT"
  echo "========================================="
  echo ""
  read -p "Are you sure you want to deploy to PRODUCTION? (type 'yes' to confirm): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo "==> Deploying to: $STAGE"
echo "==> Stack name: $STACK_NAME"
echo "==> Config: $CONFIG_FILE"
echo ""

# --- Step 1: Install dependencies ---

echo "==> [1/5] Installing dependencies..."
npm ci
(cd "${PROJECT_ROOT}/cdk" && npm ci)

# --- Step 2: Build Next.js ---

echo "==> [2/5] Building Next.js application..."
NEXT_PUBLIC_STAGE="$STAGE" npx next build

# Verify standalone output exists
if [[ ! -d "${PROJECT_ROOT}/.next/standalone" ]]; then
  echo "ERROR: .next/standalone not found. Ensure next.config.js has output: 'standalone'"
  exit 1
fi

# --- Step 3: CDK Synth ---

echo "==> [3/5] Synthesizing CDK stack..."
(cd "${PROJECT_ROOT}/cdk" && npx cdk synth "$STACK_NAME" --context stage="$STAGE")

# --- Step 4: Record pre-deploy state (for rollback) ---

echo "==> [4/5] Recording current deployment state..."
ROLLBACK_FILE="${PROJECT_ROOT}/.last-deploy-${STAGE}.json"

# Capture current Lambda version if stack exists
LAMBDA_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='SSRFunctionName'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [[ -n "$LAMBDA_NAME" && "$LAMBDA_NAME" != "None" ]]; then
  CURRENT_VERSION=$(aws lambda list-versions-by-function \
    --function-name "$LAMBDA_NAME" \
    --query "Versions[-1].Version" \
    --output text 2>/dev/null || echo "")

  echo "{\"stage\": \"$STAGE\", \"lambda_function\": \"$LAMBDA_NAME\", \"lambda_version\": \"$CURRENT_VERSION\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$ROLLBACK_FILE"
  echo "    Saved rollback info to $ROLLBACK_FILE"
else
  echo "    No existing stack found — first deployment, no rollback state to save."
fi

# --- Step 5: CDK Deploy ---

echo "==> [5/5] Deploying CDK stack..."
(cd "${PROJECT_ROOT}/cdk" && npx cdk deploy "$STACK_NAME" \
  --context stage="$STAGE" \
  --require-approval never \
  --outputs-file "${PROJECT_ROOT}/cdk-outputs-${STAGE}.json")

echo ""
echo "========================================="
echo "  Deployment to $STAGE complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Run health check: ./scripts/health-check.sh $STAGE"
if [[ "$STAGE" == "staging" ]]; then
  echo "  2. If healthy, deploy to production: ./scripts/deploy.sh production"
fi
echo ""

#!/usr/bin/env bash
set -euo pipefail

# Health check for deployed Next.js application
# Usage: ./scripts/health-check.sh <staging|production>

STAGE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
STACK_NAME="NextjsStack-${STAGE}"

# --- Validation ---

if [[ -z "$STAGE" ]]; then
  echo "ERROR: Stage required. Usage: ./scripts/health-check.sh <staging|production>"
  exit 1
fi

if [[ "$STAGE" != "staging" && "$STAGE" != "production" ]]; then
  echo "ERROR: Stage must be 'staging' or 'production', got '$STAGE'"
  exit 1
fi

# --- Load domain from config ---

CONFIG_FILE="${PROJECT_ROOT}/config/${STAGE}.env"
if [[ -f "$CONFIG_FILE" ]]; then
  DOMAIN_NAME=$(grep '^DOMAIN_NAME=' "$CONFIG_FILE" | cut -d'=' -f2)
else
  echo "ERROR: Config file not found: $CONFIG_FILE"
  exit 1
fi

BASE_URL="https://${DOMAIN_NAME}"
HEALTH_ENDPOINT="${BASE_URL}/api/health"
MAX_RETRIES=5
RETRY_DELAY=10
PASSED=0
FAILED=0

echo "==> Health check for: $STAGE"
echo "    URL: $BASE_URL"
echo ""

# --- Check 1: Health endpoint ---

echo "[1/4] Health endpoint ($HEALTH_ENDPOINT)..."
for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "      PASS (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
    break
  fi
  if [[ $i -eq $MAX_RETRIES ]]; then
    echo "      FAIL (HTTP $HTTP_CODE after $MAX_RETRIES retries)"
    FAILED=$((FAILED + 1))
  else
    echo "      Retry $i/$MAX_RETRIES (HTTP $HTTP_CODE)... waiting ${RETRY_DELAY}s"
    sleep $RETRY_DELAY
  fi
done

# --- Check 2: Homepage loads ---

echo "[2/4] Homepage ($BASE_URL)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "      PASS (HTTP $HTTP_CODE)"
  PASSED=$((PASSED + 1))
else
  echo "      FAIL (HTTP $HTTP_CODE)"
  FAILED=$((FAILED + 1))
fi

# --- Check 3: Static assets accessible ---

echo "[3/4] Static assets (/_next/static/)..."
# Fetch homepage and extract a static asset URL
ASSET_URL=$(curl -s --max-time 10 "$BASE_URL" 2>/dev/null | grep -oP '/_next/static/[^"]+' | head -1 || echo "")
if [[ -n "$ASSET_URL" ]]; then
  ASSET_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${ASSET_URL}" 2>/dev/null || echo "000")
  if [[ "$ASSET_CODE" == "200" ]]; then
    echo "      PASS (HTTP $ASSET_CODE)"
    PASSED=$((PASSED + 1))
  else
    echo "      FAIL (HTTP $ASSET_CODE for $ASSET_URL)"
    FAILED=$((FAILED + 1))
  fi
else
  echo "      SKIP (no static asset URLs found in homepage)"
fi

# --- Check 4: Lambda function health ---

echo "[4/4] Lambda function status..."
LAMBDA_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='SSRFunctionName'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [[ -n "$LAMBDA_NAME" && "$LAMBDA_NAME" != "None" ]]; then
  LAMBDA_STATE=$(aws lambda get-function \
    --function-name "$LAMBDA_NAME" \
    --query "Configuration.State" \
    --output text 2>/dev/null || echo "Unknown")
  if [[ "$LAMBDA_STATE" == "Active" ]]; then
    echo "      PASS (State: $LAMBDA_STATE)"
    PASSED=$((PASSED + 1))
  else
    echo "      FAIL (State: $LAMBDA_STATE)"
    FAILED=$((FAILED + 1))
  fi
else
  echo "      SKIP (could not determine Lambda function name)"
fi

# --- Summary ---

echo ""
echo "========================================="
echo "  Health Check Results: $STAGE"
echo "========================================="
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
echo "========================================="
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo "UNHEALTHY — Consider rollback: ./scripts/rollback.sh $STAGE"
  exit 1
else
  echo "HEALTHY — Deployment verified."
  exit 0
fi

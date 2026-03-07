#!/usr/bin/env bash
#
# smoke-test.sh — Run smoke tests against a deployed Next.js application
#
# Usage:
#   ./scripts/smoke-test.sh <url>
#   ./scripts/smoke-test.sh https://staging.example.com
#
# Environment variables:
#   SMOKE_TEST_TIMEOUT  — Request timeout in seconds (default: 30)
#   SMOKE_TEST_RETRIES  — Number of retries for each check (default: 3)
#   SMOKE_TEST_DELAY    — Delay between retries in seconds (default: 5)
#   HEALTH_PATH         — Health check endpoint path (default: /api/health)
#

set -euo pipefail

URL="${1:?Usage: smoke-test.sh <url>}"
TIMEOUT="${SMOKE_TEST_TIMEOUT:-30}"
RETRIES="${SMOKE_TEST_RETRIES:-3}"
DELAY="${SMOKE_TEST_DELAY:-5}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"

# Strip trailing slash
URL="${URL%/}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[smoke]${NC} $*"; }
ok()    { echo -e "${GREEN}[ pass]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ warn]${NC} $*"; }
fail_test() { echo -e "${RED}[ FAIL]${NC} $*"; FAILURES=$((FAILURES + 1)); }

FAILURES=0
TOTAL=0

# ─── Test Helper ─────────────────────────────────────────────────────────────

run_test() {
  local name="$1"
  local test_url="$2"
  local expected_status="${3:-200}"
  local check_body="${4:-}"

  TOTAL=$((TOTAL + 1))

  for attempt in $(seq 1 "$RETRIES"); do
    RESPONSE=$(curl -s -o /tmp/smoke-response -w "%{http_code}|%{time_total}" \
      --max-time "$TIMEOUT" \
      -H "User-Agent: smoke-test/1.0" \
      "$test_url" 2>/dev/null || echo "000|0")

    HTTP_STATUS=$(echo "$RESPONSE" | cut -d'|' -f1)
    RESPONSE_TIME=$(echo "$RESPONSE" | cut -d'|' -f2)

    if [[ "$HTTP_STATUS" == "$expected_status" ]]; then
      # Check body content if specified
      if [[ -n "$check_body" ]]; then
        if grep -q "$check_body" /tmp/smoke-response 2>/dev/null; then
          ok "$name — HTTP $HTTP_STATUS (${RESPONSE_TIME}s)"
          return 0
        else
          if [[ "$attempt" -lt "$RETRIES" ]]; then
            sleep "$DELAY"
            continue
          fi
          fail_test "$name — Body check failed (expected: $check_body)"
          return 1
        fi
      fi

      ok "$name — HTTP $HTTP_STATUS (${RESPONSE_TIME}s)"
      return 0
    fi

    if [[ "$attempt" -lt "$RETRIES" ]]; then
      warn "$name — Attempt $attempt/$RETRIES failed (HTTP $HTTP_STATUS), retrying in ${DELAY}s..."
      sleep "$DELAY"
    fi
  done

  fail_test "$name — Expected HTTP $expected_status, got HTTP $HTTP_STATUS"
  return 1
}

# ─── Run Tests ───────────────────────────────────────────────────────────────

echo ""
log "Running smoke tests against: $URL"
log "Timeout: ${TIMEOUT}s | Retries: $RETRIES | Delay: ${DELAY}s"
echo ""

# Test 1: Homepage loads
run_test "Homepage returns 200" "$URL" "200"

# Test 2: Health endpoint
run_test "Health endpoint" "${URL}${HEALTH_PATH}" "200"

# Test 3: Static assets (Next.js _next directory)
run_test "Static assets accessible" "${URL}/_next/static/" "200" || true
# Note: This may 403/404 depending on config, so we don't fail on it

# Test 4: Check for common error pages (should NOT get 500)
HTTP_500_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo "000")
if [[ "$HTTP_500_CHECK" -ge 500 ]]; then
  fail_test "Server error detected — HTTP $HTTP_500_CHECK"
else
  TOTAL=$((TOTAL + 1))
  ok "No server errors on homepage"
fi

# Test 5: Response time check
TOTAL=$((TOTAL + 1))
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo "999")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "0")

if (( $(echo "$RESPONSE_TIME < 5.0" | bc -l 2>/dev/null || echo 0) )); then
  ok "Response time acceptable — ${RESPONSE_MS%.*}ms"
else
  fail_test "Response time too slow — ${RESPONSE_MS%.*}ms (threshold: 5000ms)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

echo ""
PASSED=$((TOTAL - FAILURES))

if [[ "$FAILURES" -eq 0 ]]; then
  echo -e "${GREEN}All $TOTAL smoke tests passed${NC}"
  exit 0
else
  echo -e "${RED}$FAILURES of $TOTAL smoke tests failed${NC}"
  exit 1
fi

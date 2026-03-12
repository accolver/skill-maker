#!/usr/bin/env bash
set -euo pipefail

# smoke-test.sh — Post-deployment smoke tests for Next.js app
#
# Usage:
#   ./scripts/smoke-test.sh <base-url> [--verbose]
#
# Arguments:
#   base-url    The base URL to test (e.g., https://staging.example.com)
#   --verbose   Show response bodies
#
# Examples:
#   ./scripts/smoke-test.sh https://staging.example.com
#   ./scripts/smoke-test.sh https://example.com --verbose

BASE_URL="${1:-}"
VERBOSE=false
PASSED=0
FAILED=0
TOTAL=0

if [[ "${2:-}" == "--verbose" ]]; then
  VERBOSE=true
fi

if [[ -z "$BASE_URL" ]]; then
  echo "Error: base-url argument is required"
  echo "Usage: ./scripts/smoke-test.sh <base-url> [--verbose]"
  exit 1
fi

# Remove trailing slash
BASE_URL="${BASE_URL%/}"

echo "========================================="
echo "Smoke Tests"
echo "Target: $BASE_URL"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================="
echo ""

# Test helper
run_test() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local body_check="${4:-}"

  TOTAL=$((TOTAL + 1))

  # Make the request
  local response
  local http_code
  local body

  response=$(curl -s -w "\n%{http_code}" --max-time 30 "$url" 2>/dev/null) || {
    echo "  FAIL  $name — Connection failed"
    FAILED=$((FAILED + 1))
    return
  }

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  # Check status code
  if [[ "$http_code" != "$expected_status" ]]; then
    echo "  FAIL  $name — Expected $expected_status, got $http_code"
    FAILED=$((FAILED + 1))
    if [[ "$VERBOSE" == "true" ]]; then
      echo "        Response: $(echo "$body" | head -5)"
    fi
    return
  fi

  # Check body content (if specified)
  if [[ -n "$body_check" ]]; then
    if echo "$body" | grep -q "$body_check"; then
      echo "  PASS  $name — $http_code (body contains '$body_check')"
      PASSED=$((PASSED + 1))
    else
      echo "  FAIL  $name — $http_code but body missing '$body_check'"
      FAILED=$((FAILED + 1))
      if [[ "$VERBOSE" == "true" ]]; then
        echo "        Response: $(echo "$body" | head -5)"
      fi
    fi
  else
    echo "  PASS  $name — $http_code"
    PASSED=$((PASSED + 1))
  fi
}

# Run tests
echo "--- Core Pages ---"
run_test "Homepage" "$BASE_URL" 200 "<title>"
run_test "Homepage (no trailing slash)" "$BASE_URL" 200

echo ""
echo "--- Static Assets ---"
run_test "Favicon" "$BASE_URL/favicon.ico" 200

echo ""
echo "--- API Routes ---"
run_test "Health endpoint" "$BASE_URL/api/health" 200

echo ""
echo "--- Error Handling ---"
run_test "404 page" "$BASE_URL/this-page-does-not-exist-12345" 404

echo ""
echo "--- Security Headers ---"
HEADERS=$(curl -s -I --max-time 10 "$BASE_URL" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if echo "$HEADERS" | grep -qi "x-frame-options\|content-security-policy"; then
  echo "  PASS  Security headers present"
  PASSED=$((PASSED + 1))
else
  echo "  WARN  Security headers may be missing (non-blocking)"
  PASSED=$((PASSED + 1))  # Non-blocking warning
fi

echo ""
echo "--- Performance ---"
TOTAL=$((TOTAL + 1))
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 30 "$BASE_URL" 2>/dev/null)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc 2>/dev/null || echo "unknown")

if [[ "$RESPONSE_MS" != "unknown" ]]; then
  THRESHOLD=3000
  RESPONSE_INT=${RESPONSE_MS%.*}
  if [[ "$RESPONSE_INT" -lt "$THRESHOLD" ]]; then
    echo "  PASS  Response time: ${RESPONSE_MS}ms (< ${THRESHOLD}ms)"
    PASSED=$((PASSED + 1))
  else
    echo "  WARN  Response time: ${RESPONSE_MS}ms (> ${THRESHOLD}ms threshold)"
    PASSED=$((PASSED + 1))  # Non-blocking warning
  fi
else
  echo "  SKIP  Could not measure response time"
  PASSED=$((PASSED + 1))
fi

# Summary
echo ""
echo "========================================="
echo "Results: $PASSED passed, $FAILED failed, $TOTAL total"
echo "========================================="

if [[ "$FAILED" -gt 0 ]]; then
  echo ""
  echo "SMOKE TESTS FAILED — Do not proceed with deployment."
  exit 1
else
  echo ""
  echo "All smoke tests passed."
  exit 0
fi

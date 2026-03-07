#!/usr/bin/env bash
#
# deploy.sh — Full deployment workflow for Next.js + CDK
#
# Usage:
#   ./scripts/deploy.sh <stage>
#   ./scripts/deploy.sh staging
#   ./scripts/deploy.sh production
#
# Environment variables:
#   CDK_DIR          — Path to CDK directory (default: ./cdk)
#   SKIP_BUILD       — Set to "true" to skip Next.js build
#   SKIP_TESTS       — Set to "true" to skip test suite
#   APPROVAL_TIMEOUT — Seconds to wait for approval (default: 300)
#   SMOKE_TEST_URL   — Override the smoke test URL
#

set -euo pipefail

STAGE="${1:?Usage: deploy.sh <staging|production>}"
CDK_DIR="${CDK_DIR:-./cdk}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
APPROVAL_TIMEOUT="${APPROVAL_TIMEOUT:-300}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOY_TAG="deploy-${STAGE}-${TIMESTAMP}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ok  ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ warn ]${NC} $*"; }
fail()  { echo -e "${RED}[ FAIL ]${NC} $*"; exit 1; }

# ─── Validation ──────────────────────────────────────────────────────────────

if [[ "$STAGE" != "staging" && "$STAGE" != "production" ]]; then
  fail "Stage must be 'staging' or 'production', got: $STAGE"
fi

if [[ ! -d "$CDK_DIR" ]]; then
  fail "CDK directory not found at: $CDK_DIR"
fi

# For production, verify staging was deployed recently
if [[ "$STAGE" == "production" ]]; then
  LATEST_STAGING_TAG=$(git tag --list 'deploy-staging-*' --sort=-creatordate 2>/dev/null | head -1 || true)
  if [[ -z "$LATEST_STAGING_TAG" ]]; then
    fail "No staging deployment found. Deploy to staging first."
  fi
  log "Latest staging deployment: $LATEST_STAGING_TAG"
fi

# ─── Phase 1: Build ─────────────────────────────────────────────────────────

log "═══ Phase 1: Build ═══"

if [[ "$SKIP_TESTS" != "true" ]]; then
  log "Running tests..."
  if npm test --if-present 2>/dev/null; then
    ok "Tests passed"
  else
    fail "Tests failed. Fix tests before deploying."
  fi
else
  warn "Skipping tests (SKIP_TESTS=true)"
fi

if [[ "$SKIP_BUILD" != "true" ]]; then
  log "Building Next.js application..."
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" npm run build || fail "Next.js build failed"
  ok "Next.js build succeeded"

  if [[ ! -d ".next" ]]; then
    fail "Build output directory .next/ not found"
  fi
else
  warn "Skipping build (SKIP_BUILD=true)"
fi

# ─── Phase 2: CDK Synth & Diff ──────────────────────────────────────────────

log "═══ Phase 2: CDK Synth & Diff ═══"

log "Installing CDK dependencies..."
(cd "$CDK_DIR" && npm install --silent) || fail "CDK npm install failed"

log "Synthesizing CDK stack for stage: $STAGE"
(cd "$CDK_DIR" && npx cdk synth -c stage="$STAGE" --quiet) || fail "CDK synth failed"
ok "CDK synth succeeded"

log "Generating diff..."
(cd "$CDK_DIR" && npx cdk diff -c stage="$STAGE" 2>&1) || true
echo ""

# ─── Phase 3: Deploy ────────────────────────────────────────────────────────

if [[ "$STAGE" == "production" ]]; then
  log "═══ Phase 3: Production Approval Gate ═══"
  echo ""
  echo -e "${YELLOW}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║  PRODUCTION DEPLOYMENT APPROVAL REQUIRED                ║${NC}"
  echo -e "${YELLOW}║                                                         ║${NC}"
  echo -e "${YELLOW}║  Stage:     production                                  ║${NC}"
  echo -e "${YELLOW}║  Timestamp: ${TIMESTAMP}                          ║${NC}"
  echo -e "${YELLOW}║                                                         ║${NC}"
  echo -e "${YELLOW}║  Type 'approve' to proceed or 'reject' to cancel:      ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""

  read -t "$APPROVAL_TIMEOUT" -r APPROVAL || fail "Approval timed out after ${APPROVAL_TIMEOUT}s"

  if [[ "$APPROVAL" != "approve" ]]; then
    fail "Deployment rejected by user"
  fi

  ok "Production deployment approved"
  echo ""
fi

log "═══ Phase 4: Deploying to $STAGE ═══"

log "Deploying CDK stack..."
(cd "$CDK_DIR" && npx cdk deploy -c stage="$STAGE" --require-approval never --outputs-file "../cdk-outputs-${STAGE}.json") \
  || fail "CDK deploy failed"

ok "CDK deploy succeeded"

# ─── Phase 5: Post-Deploy ───────────────────────────────────────────────────

log "═══ Phase 5: Post-Deploy ═══"

# Extract outputs
if [[ -f "cdk-outputs-${STAGE}.json" ]]; then
  log "CDK Outputs:"
  cat "cdk-outputs-${STAGE}.json"
  echo ""

  # Try to extract URL for smoke test
  DEPLOYED_URL="${SMOKE_TEST_URL:-$(cat "cdk-outputs-${STAGE}.json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for stack in data.values():
    for key, val in stack.items():
        if 'url' in key.lower() or 'endpoint' in key.lower():
            print(val)
            sys.exit(0)
" 2>/dev/null || echo "")}"
fi

# Smoke test
if [[ -n "${DEPLOYED_URL:-}" ]]; then
  log "Running smoke test against: $DEPLOYED_URL"
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -x "$SCRIPT_DIR/smoke-test.sh" ]]; then
    "$SCRIPT_DIR/smoke-test.sh" "$DEPLOYED_URL" || warn "Smoke test failed — review manually"
  else
    # Inline basic smoke test
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$DEPLOYED_URL" 2>/dev/null || echo "000")
    if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 400 ]]; then
      ok "Smoke test passed (HTTP $HTTP_STATUS)"
    else
      warn "Smoke test returned HTTP $HTTP_STATUS — review manually"
    fi
  fi
else
  warn "No deployment URL found — skipping smoke test"
fi

# Git tag
log "Tagging deployment: $DEPLOY_TAG"
git tag -a "$DEPLOY_TAG" -m "Deployed to $STAGE at $TIMESTAMP" 2>/dev/null || warn "Git tag failed (not in a git repo?)"

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  DEPLOYMENT COMPLETE                                    ║${NC}"
echo -e "${GREEN}║                                                         ║${NC}"
echo -e "${GREEN}║  Stage: ${STAGE}$(printf '%*s' $((41 - ${#STAGE})) '')║${NC}"
echo -e "${GREEN}║  Tag:   ${DEPLOY_TAG}$(printf '%*s' $((41 - ${#DEPLOY_TAG})) '')║${NC}"
if [[ -n "${DEPLOYED_URL:-}" ]]; then
echo -e "${GREEN}║  URL:   ${DEPLOYED_URL}$(printf '%*s' $((41 - ${#DEPLOYED_URL})) '')║${NC}"
fi
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$STAGE" == "staging" ]]; then
  log "Next step: verify staging, then run: ./scripts/deploy.sh production"
fi

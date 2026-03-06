#!/usr/bin/env bash
#
# synth-and-diff.sh — Synthesize CDK stack and show diff without deploying
#
# Usage:
#   ./scripts/synth-and-diff.sh <stage>
#   ./scripts/synth-and-diff.sh staging
#   ./scripts/synth-and-diff.sh production
#
# Environment variables:
#   CDK_DIR — Path to CDK directory (default: ./cdk)
#

set -euo pipefail

STAGE="${1:?Usage: synth-and-diff.sh <staging|production>}"
CDK_DIR="${CDK_DIR:-./cdk}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[synth]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ok ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ warn]${NC} $*"; }
fail()  { echo -e "${RED}[ FAIL]${NC} $*"; exit 1; }

# ─── Validation ──────────────────────────────────────────────────────────────

if [[ "$STAGE" != "staging" && "$STAGE" != "production" ]]; then
  fail "Stage must be 'staging' or 'production', got: $STAGE"
fi

if [[ ! -d "$CDK_DIR" ]]; then
  fail "CDK directory not found at: $CDK_DIR"
fi

# ─── Install Dependencies ───────────────────────────────────────────────────

log "Installing CDK dependencies..."
(cd "$CDK_DIR" && npm install --silent) || fail "npm install failed"
ok "Dependencies installed"

# ─── Synthesize ──────────────────────────────────────────────────────────────

log "Synthesizing CDK stack for stage: $STAGE"
echo ""

SYNTH_OUTPUT=$(cd "$CDK_DIR" && npx cdk synth -c stage="$STAGE" 2>&1) || {
  echo "$SYNTH_OUTPUT"
  fail "CDK synth failed"
}

ok "CDK synth succeeded"

# Show template size
TEMPLATE_DIR="$CDK_DIR/cdk.out"
if [[ -d "$TEMPLATE_DIR" ]]; then
  TEMPLATE_SIZE=$(find "$TEMPLATE_DIR" -name "*.template.json" -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}')
  if [[ -n "$TEMPLATE_SIZE" ]]; then
    log "Template size: $(echo "$TEMPLATE_SIZE" | numfmt --to=iec 2>/dev/null || echo "${TEMPLATE_SIZE} bytes")"
  fi
fi

echo ""

# ─── Diff ────────────────────────────────────────────────────────────────────

log "Generating diff against deployed stack..."
echo ""
echo "─────────────────────────────────────────────────────────────"

DIFF_OUTPUT=$(cd "$CDK_DIR" && npx cdk diff -c stage="$STAGE" 2>&1) || true
echo "$DIFF_OUTPUT"

echo "─────────────────────────────────────────────────────────────"
echo ""

# Analyze diff for risky changes
if echo "$DIFF_OUTPUT" | grep -qi "destroy\|replace"; then
  warn "⚠ Destructive changes detected! Review carefully before deploying."
elif echo "$DIFF_OUTPUT" | grep -qi "no differences"; then
  ok "No infrastructure changes detected"
else
  log "Infrastructure changes detected — review the diff above"
fi

echo ""
log "To deploy these changes, run: ./scripts/deploy.sh $STAGE"

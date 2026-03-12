#!/usr/bin/env bash
set -euo pipefail

# deploy.sh — Full deployment pipeline for Next.js CDK app
#
# Usage:
#   ./scripts/deploy.sh <environment> [--skip-tests] [--auto-approve]
#
# Arguments:
#   environment    Target environment: staging | production
#   --skip-tests   Skip lint, typecheck, and unit tests (not recommended)
#   --auto-approve Skip CDK approval prompts (use with caution)
#
# Examples:
#   ./scripts/deploy.sh staging
#   ./scripts/deploy.sh production --auto-approve
#   ./scripts/deploy.sh staging --skip-tests

ENVIRONMENT="${1:-}"
SKIP_TESTS=false
AUTO_APPROVE=false

# Parse flags
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=true; shift ;;
    --auto-approve) AUTO_APPROVE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
  echo "Error: environment argument is required"
  echo "Usage: ./scripts/deploy.sh <staging|production> [--skip-tests] [--auto-approve]"
  exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Error: environment must be 'staging' or 'production'"
  exit 1
fi

# Production safety check
if [[ "$ENVIRONMENT" == "production" ]]; then
  if [[ ! -f "deployment-approval.json" ]]; then
    echo "Error: No deployment-approval.json found."
    echo "Deploy to staging first and create an approval record before deploying to production."
    exit 1
  fi

  APPROVAL_COMMIT=$(jq -r '.commit_sha' deployment-approval.json)
  CURRENT_COMMIT=$(git rev-parse HEAD)

  if [[ "$APPROVAL_COMMIT" != "$CURRENT_COMMIT" ]]; then
    echo "Warning: Approved commit ($APPROVAL_COMMIT) differs from current commit ($CURRENT_COMMIT)"
    echo "Re-approve or checkout the approved commit before deploying to production."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
fi

echo "========================================="
echo "Deploying to: $ENVIRONMENT"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================="

# Step 1: Install dependencies
echo ""
echo ">>> Step 1: Installing dependencies..."
npm ci

# Step 2: Run tests (unless skipped)
if [[ "$SKIP_TESTS" == "false" ]]; then
  echo ""
  echo ">>> Step 2: Running lint, typecheck, and tests..."
  npm run lint
  npx tsc --noEmit
  npm test -- --passWithNoTests
else
  echo ""
  echo ">>> Step 2: Skipping tests (--skip-tests flag set)"
fi

# Step 3: Build the Next.js app
echo ""
echo ">>> Step 3: Building Next.js app for $ENVIRONMENT..."
NEXT_PUBLIC_ENVIRONMENT="$ENVIRONMENT" npm run build

# Verify build output
if [[ ! -d ".next" ]]; then
  echo "Error: .next directory not found after build"
  exit 1
fi

# Step 4: Synthesize CDK stack
echo ""
echo ">>> Step 4: Synthesizing CDK stack..."
cd cdk
npx cdk synth -c "environment=$ENVIRONMENT" --quiet

# Step 5: Show diff
echo ""
echo ">>> Step 5: CDK diff..."
npx cdk diff -c "environment=$ENVIRONMENT" 2>&1 || true

# Step 6: Deploy
echo ""
echo ">>> Step 6: Deploying to $ENVIRONMENT..."

DEPLOY_ARGS=(
  "NextjsApp-$ENVIRONMENT"
  "-c" "environment=$ENVIRONMENT"
  "--outputs-file" "../${ENVIRONMENT}-outputs.json"
)

if [[ "$AUTO_APPROVE" == "true" ]]; then
  DEPLOY_ARGS+=("--require-approval" "never")
else
  DEPLOY_ARGS+=("--require-approval" "broadening")
fi

npx cdk deploy "${DEPLOY_ARGS[@]}"

cd ..

# Step 7: Post-deployment smoke test
echo ""
echo ">>> Step 7: Running smoke tests..."
OUTPUTS_FILE="${ENVIRONMENT}-outputs.json"

if [[ -f "$OUTPUTS_FILE" ]]; then
  DEPLOY_URL=$(jq -r ".\"NextjsApp-${ENVIRONMENT}\".DistributionDomainName" "$OUTPUTS_FILE")
  ./scripts/smoke-test.sh "https://${DEPLOY_URL}"
else
  echo "Warning: Outputs file not found, skipping smoke tests"
fi

echo ""
echo "========================================="
echo "Deployment to $ENVIRONMENT complete!"
echo "========================================="

# Record deployment metadata
echo "{
  \"environment\": \"$ENVIRONMENT\",
  \"commit_sha\": \"$(git rev-parse HEAD)\",
  \"deployed_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"deployed_by\": \"$(git config user.name || echo 'unknown')\"
}" > "last-deployment-${ENVIRONMENT}.json"

echo "Deployment metadata saved to last-deployment-${ENVIRONMENT}.json"

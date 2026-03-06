---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with a full staging-to-production workflow including build, synth, deploy, manual approval gates, environment configs, and rollback procedures. Use when deploying Next.js to AWS, setting up CDK infrastructure for Next.js, creating deployment pipelines, managing staging and production environments, or when the user mentions Next.js deployment, AWS CDK, CloudFront, Lambda@Edge, or SSR hosting on AWS.
---

# Next.js CDK Deploy

Full deployment workflow for Next.js applications on AWS using CDK. Covers
build, synth, staging deploy, approval gate, production deploy, and rollback.

## Overview

This skill manages the complete lifecycle of deploying a Next.js app to AWS via
CDK. It handles environment-specific configuration, staged deployments with
approval gates, and rollback procedures when things go wrong.

## When to use

- When deploying a Next.js application to AWS
- When setting up CDK infrastructure for Next.js (CloudFront, Lambda, S3)
- When creating a staging → production deployment pipeline
- When you need environment-specific configs (API URLs, feature flags)
- When rolling back a failed production deployment
- When adding a manual approval gate between staging and production

**Do NOT use when:**

- Deploying to Vercel, Netlify, or other managed platforms
- The app is a static export only (use S3 + CloudFront directly)
- Using Terraform or Pulumi instead of CDK

## Workflow

### 1. Verify prerequisites

Before starting, confirm these are available:

```bash
bun run scripts/preflight-check.ts
```

Required:

- Node.js 18+ and npm/pnpm/yarn
- AWS CDK CLI (`npm install -g aws-cdk`)
- AWS credentials configured (`aws sts get-caller-identity`)
- Next.js project with `next.config.js`

### 2. Configure environments

Create or verify environment config files. Use `scripts/gen-env-config.ts`:

```bash
bun run scripts/gen-env-config.ts --env staging --region us-east-1
bun run scripts/gen-env-config.ts --env production --region us-east-1
```

Environment configs live in `cdk/config/`:

```typescript
// cdk/config/staging.ts
export const config = {
  env: { account: "123456789012", region: "us-east-1" },
  domainName: "staging.example.com",
  apiUrl: "https://api-staging.example.com",
  logLevel: "debug",
  enableSourceMaps: true,
};
```

**Key differences between environments:**

| Setting       | Staging                 | Production      |
| ------------- | ----------------------- | --------------- |
| Domain        | staging.example.com     | example.com     |
| API URL       | api-staging.example.com | api.example.com |
| Log level     | debug                   | warn            |
| Source maps   | enabled                 | disabled        |
| Cache TTL     | 60s                     | 86400s (24h)    |
| Min instances | 1                       | 3               |

### 3. Build the Next.js app

```bash
# Install dependencies
npm ci

# Build with environment-specific variables
NEXT_PUBLIC_API_URL=$API_URL \
NEXT_PUBLIC_ENV=$DEPLOY_ENV \
npm run build
```

Verify the build output:

- `.next/` directory exists
- `standalone/` output if using `output: 'standalone'` in next.config.js
- No build errors or warnings about missing env vars

### 4. Synthesize the CDK stack

```bash
npx cdk synth --context env=staging
```

Review the synthesized CloudFormation template. Key resources to verify:

- CloudFront distribution with correct origins
- Lambda@Edge or Lambda function URLs for SSR
- S3 bucket for static assets
- Route53 records (if using custom domain)
- WAF rules (if configured)

### 5. Deploy to staging

```bash
npx cdk deploy NextJsStack-staging \
  --context env=staging \
  --require-approval never \
  --outputs-file cdk-outputs-staging.json
```

After deployment completes:

1. Verify the staging URL loads correctly
2. Run smoke tests against staging
3. Check CloudWatch logs for errors

```bash
bun run scripts/preflight-check.ts --post-deploy --env staging
```

### 6. Manual approval gate

**STOP HERE.** Do not proceed to production without explicit user approval.

Present to the user:

- Staging URL and deployment status
- Any warnings from smoke tests
- Diff between staging and production stacks:
  `npx cdk diff NextJsStack-production --context env=production`

Wait for the user to confirm: "Deploy to production" or equivalent.

### 7. Deploy to production

```bash
# Tag the current production for rollback
PREV_VERSION=$(aws cloudformation describe-stacks \
  --stack-name NextJsStack-production \
  --query 'Stacks[0].Tags[?Key==`Version`].Value' \
  --output text 2>/dev/null || echo "none")

# Deploy
npx cdk deploy NextJsStack-production \
  --context env=production \
  --require-approval broadening \
  --outputs-file cdk-outputs-production.json
```

After production deployment:

1. Verify production URL
2. Monitor CloudWatch metrics for 5 minutes
3. Check error rates in CloudWatch alarms

### 8. Rollback (if needed)

If production deployment fails or causes issues:

```bash
# Option 1: CDK rollback (if deployment is in progress)
# CDK automatically rolls back failed deployments

# Option 2: Redeploy previous version
git checkout $PREV_COMMIT_SHA
npm ci && npm run build
npx cdk deploy NextJsStack-production --context env=production

# Option 3: CloudFormation rollback to last known good
aws cloudformation rollback-stack --stack-name NextJsStack-production
```

**Rollback decision tree:**

1. Deployment failed mid-way → CDK auto-rolls back, verify stack state
2. Deployment succeeded but app is broken → Redeploy previous git commit
3. Partial failure (some resources updated) → CloudFormation rollback-stack
4. Data migration issue → This requires manual intervention, escalate

## Checklist

- [ ] Prerequisites verified (Node, CDK CLI, AWS creds)
- [ ] Environment configs created for staging and production
- [ ] Next.js build succeeds with correct env vars
- [ ] CDK synth produces valid CloudFormation
- [ ] Staging deployment succeeds
- [ ] Staging smoke tests pass
- [ ] User approves production deployment
- [ ] Production deployment succeeds
- [ ] Production monitoring shows no errors (5 min)
- [ ] Rollback plan documented and tested

## Examples

**Example: Full deployment flow**

```bash
# 1. Preflight
bun run scripts/preflight-check.ts

# 2. Build
NEXT_PUBLIC_API_URL=https://api-staging.example.com npm run build

# 3. Synth + Deploy staging
npx cdk synth --context env=staging
npx cdk deploy NextJsStack-staging --context env=staging --require-approval never

# 4. Verify staging
curl -s https://staging.example.com | head -20

# 5. [USER APPROVAL]

# 6. Deploy production
npx cdk deploy NextJsStack-production --context env=production --require-approval broadening

# 7. Monitor
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 5xxErrorRate \
  --period 300 --statistics Average \
  --start-time $(date -u -v-10M +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)
```

## Common mistakes

| Mistake                                        | Fix                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| Deploying to production without staging first  | Always deploy staging first — catch issues before they hit users   |
| Forgetting NEXT_PUBLIC_ prefix for env vars    | Client-side vars MUST start with NEXT_PUBLIC_ or they're undefined |
| Not pinning CDK version                        | Pin in package.json — CDK minor versions can have breaking changes |
| Skipping `cdk diff` before production          | Always diff to see what will change before deploying               |
| Using `--require-approval never` in production | Use `broadening` — you want to review IAM/security changes         |
| Not capturing previous version for rollback    | Tag or record the commit SHA before deploying                      |
| Building with wrong env vars                   | Verify NEXT_PUBLIC_* vars match the target environment             |
| Ignoring CloudFront cache after deploy         | Create invalidation: `aws cloudfront create-invalidation`          |

## Quick reference

| Operation           | Command                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| Preflight check     | `bun run scripts/preflight-check.ts`                                    |
| Generate env config | `bun run scripts/gen-env-config.ts --env staging`                       |
| Build               | `NEXT_PUBLIC_API_URL=... npm run build`                                 |
| Synth               | `npx cdk synth --context env=staging`                                   |
| Deploy staging      | `npx cdk deploy NextJsStack-staging --context env=staging`              |
| Diff production     | `npx cdk diff NextJsStack-production --context env=production`          |
| Deploy production   | `npx cdk deploy NextJsStack-production --context env=production`        |
| Invalidate cache    | `aws cloudfront create-invalidation --distribution-id $ID --paths "/*"` |
| Rollback            | `aws cloudformation rollback-stack --stack-name NextJsStack-production` |

## Key principles

1. **Staging before production, always** — Never skip staging. Even "small"
   changes can break SSR, API routes, or edge functions in ways that only
   surface in a deployed environment.
2. **Explicit approval gates** — Production deployments require human
   confirmation. Automated pipelines should pause and wait, never auto-promote.
3. **Rollback-ready at all times** — Before every production deploy, record the
   current version. If you can't roll back, you shouldn't deploy.
4. **Environment parity** — Staging and production should be as similar as
   possible. Differences in config are expected; differences in infrastructure
   are bugs.
5. **Cache invalidation is part of deployment** — A deploy isn't complete until
   CloudFront caches are invalidated. Stale caches cause the most confusing
   post-deploy bugs.

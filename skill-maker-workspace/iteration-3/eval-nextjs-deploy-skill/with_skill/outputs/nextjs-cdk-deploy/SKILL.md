---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with staged rollouts (staging then production), environment-specific configuration, manual approval gates, and automated rollback procedures. Use when deploying Next.js apps to AWS, setting up CDK infrastructure for Next.js, creating deployment pipelines with staging and production stages, configuring environment-specific settings for AWS deployments, implementing rollback procedures for failed deployments, or when the user mentions Next.js CDK, AWS deployment pipeline, staged deployment, or production approval gate.
---

# Next.js CDK Deploy

Deploy Next.js applications to AWS using CDK with a staging-first pipeline,
manual approval gates, and rollback procedures.

## Overview

This skill guides the full deployment workflow: build the Next.js app,
synthesize the CDK stack, deploy to staging, verify, get manual approval, then
deploy to production. It handles environment-specific configs and provides
rollback procedures when deployments fail.

## When to use

- When deploying a Next.js application to AWS using CDK
- When setting up a staged deployment pipeline (staging -> approval ->
  production)
- When you need environment-specific configuration management for AWS
- When implementing rollback procedures for Next.js on AWS
- When creating CDK infrastructure stacks for Next.js (Lambda@Edge, CloudFront,
  S3)

**Do NOT use when:**

- Deploying to Vercel, Netlify, or non-AWS platforms
- Using Terraform, Pulumi, or non-CDK IaC tools
- The app is not Next.js (use generic CDK deployment patterns instead)

## Workflow

### 1. Validate prerequisites

Confirm the project has the required structure before proceeding. This prevents
wasted time on builds that will fail during synthesis.

```bash
# Check required tools
bun run scripts/preflight-check.ts --project-dir .
```

Required:

- Node.js 18+ and npm/pnpm/yarn
- AWS CDK CLI (`npx cdk --version`)
- AWS credentials configured (`aws sts get-caller-identity`)
- A `next.config.js` or `next.config.mjs` in the project root
- A `cdk.json` or `infra/` directory with CDK stack definitions

If CDK infrastructure doesn't exist yet, scaffold it using the reference
architecture in
[references/cdk-stack-reference.md](references/cdk-stack-reference.md).

### 2. Configure environment settings

Load environment-specific configuration. Each environment (staging, production)
needs its own config because domains, scaling, caching, and API endpoints
differ.

Config resolution order (first wins):

1. `config/{env}.env` file (e.g., `config/staging.env`)
2. `cdk.context.json` environment overrides
3. CDK stack props passed at synth time

Key environment variables to set per stage:

| Variable              | Staging                           | Production                |
| --------------------- | --------------------------------- | ------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://api-staging.example.com` | `https://api.example.com` |
| `DOMAIN_NAME`         | `staging.example.com`             | `example.com`             |
| `CDK_DEPLOY_ACCOUNT`  | AWS account ID                    | AWS account ID            |
| `CDK_DEPLOY_REGION`   | `us-east-1`                       | `us-east-1`               |
| `MIN_INSTANCES`       | `1`                               | `3`                       |
| `MAX_INSTANCES`       | `2`                               | `10`                      |
| `LOG_LEVEL`           | `debug`                           | `warn`                    |

### 3. Build the Next.js application

```bash
# Clean previous build artifacts
rm -rf .next out

# Install dependencies
npm ci

# Build with environment-specific config
NODE_ENV=production NEXT_PUBLIC_ENV=staging npm run build
```

Verify the build succeeded by checking:

- `.next/` directory exists and contains `server/` and `static/`
- No TypeScript errors in build output
- `next.config.js` output mode matches CDK expectations (`standalone` for
  Lambda)

### 4. Synthesize the CDK stack

```bash
# Synthesize for the target environment
npx cdk synth --context env=staging --all
```

Verify synthesis:

- `cdk.out/` directory contains CloudFormation templates
- No synthesis errors or unresolved tokens
- Stack names match expected pattern (e.g., `NextjsStaging`, `NextjsProduction`)

Run `cdk diff` to preview changes before deploying:

```bash
npx cdk diff --context env=staging
```

Review the diff carefully. Watch for:

- **Security group changes** that open unexpected ports
- **IAM policy changes** that grant broader permissions
- **Resource replacements** (marked with `[-]` then `[+]`) that cause downtime
- **CloudFront distribution changes** that invalidate caches

### 5. Deploy to staging

```bash
bun run scripts/deploy.ts --env staging --project-dir . --require-approval never
```

The deploy script:

1. Runs `cdk deploy` with the staging context
2. Waits for CloudFormation stack to reach `CREATE_COMPLETE` or
   `UPDATE_COMPLETE`
3. Outputs the staging URL and stack outputs as JSON
4. Records the deployment timestamp and stack version for rollback

After deployment, verify staging:

- Hit the staging URL and confirm the app loads
- Check CloudWatch logs for startup errors
- Run smoke tests if available (`npm run test:e2e -- --env staging`)

### 6. Manual approval gate

**Do NOT proceed to production without explicit user approval.**

Present the staging deployment results to the user:

- Staging URL
- CloudFormation stack status
- Any warnings from the deploy
- Diff summary of what will change in production

Ask: "Staging deployment is live at {url}. Ready to deploy to production?"

Only proceed when the user explicitly confirms.

### 7. Deploy to production

```bash
bun run scripts/deploy.ts --env production --project-dir . --require-approval broadening
```

Production deployment uses `--require-approval broadening` so CDK prompts for
any IAM or security group changes. This is a safety net because production
permission changes should always be reviewed.

After deployment:

- Verify the production URL loads correctly
- Check CloudWatch for errors in the first 5 minutes
- Monitor CloudFront cache hit rates
- Confirm DNS resolution if using custom domains

### 8. Post-deployment verification

```bash
bun run scripts/preflight-check.ts --project-dir . --verify-deployment --env production
```

Check:

- HTTP 200 from the production URL
- No 5xx errors in CloudWatch in the first 5 minutes
- Lambda cold start times are acceptable (< 5s for initial, < 500ms warm)
- CloudFront is serving cached static assets

## Rollback procedures

Rollback is critical when a production deployment causes errors. Follow these
steps in order based on the failure type.

### Rollback Option A: CDK rollback (preferred)

Use when the CloudFormation stack update failed or the app has errors but
infrastructure is intact.

1. Identify the last known good deployment version from CloudFormation stack
   history
2. Run rollback:
   ```bash
   bun run scripts/deploy.ts --env production --rollback --project-dir .
   ```
3. The script finds the previous successful stack version and triggers a
   CloudFormation rollback
4. Wait for stack status to return to `UPDATE_ROLLBACK_COMPLETE`
5. Verify the production URL serves the previous version
6. Check CloudWatch logs confirm the old version is running

### Rollback Option B: CloudFront failover

Use when the Lambda function is broken but CloudFront is still serving cached
content.

1. Update the CloudFront origin to point to the S3 static export fallback
2. Invalidate the CloudFront cache:
   `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"`
3. This serves the static fallback while you fix the Lambda function
4. Once fixed, redeploy through the normal pipeline (staging -> approval ->
   production)

### Rollback Option C: DNS failover

Use as a last resort when both Lambda and CloudFront are broken.

1. Switch DNS to point to the previous deployment's CloudFront distribution
2. If using Route 53 health checks, this may happen automatically
3. Manually verify DNS propagation: `dig +short production.example.com`
4. Fix the broken deployment in a new iteration through staging first

### After any rollback

1. Document what went wrong in a post-mortem
2. Add the failure scenario to your smoke tests
3. Fix the root cause in a new branch
4. Deploy the fix through the full pipeline (staging -> approval -> production)

## Checklist

- [ ] Prerequisites validated (Node.js, CDK CLI, AWS credentials)
- [ ] Environment configs set for staging and production
- [ ] Next.js build succeeds with no errors
- [ ] CDK synthesis produces valid CloudFormation templates
- [ ] `cdk diff` reviewed with no unexpected changes
- [ ] Staging deployment succeeds and app is accessible
- [ ] User has explicitly approved production deployment
- [ ] Production deployment succeeds and app is accessible
- [ ] Post-deployment verification passes
- [ ] Rollback procedure documented and tested

## Common mistakes

| Mistake                                              | Fix                                                                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Deploying to production without staging verification | Always deploy staging first and verify the app loads. Skipping staging means production issues are discovered by users.                      |
| Forgetting `output: 'standalone'` in next.config.js  | Lambda deployments require standalone output mode. Add `output: 'standalone'` to `next.config.js` or the Lambda function will fail to start. |
| Using `cdk deploy --all` without environment context | This deploys ALL stacks including production. Always pass `--context env=staging` or `--context env=production` explicitly.                  |
| Not checking `cdk diff` before deploying             | Resource replacements cause downtime. Always run `cdk diff` and review for `[-]`/`[+]` markers before deploying.                             |
| Hardcoding environment variables in CDK stack        | Use config files or CDK context for environment-specific values. Hardcoded values break when deploying to different stages.                  |
| Missing CloudFront invalidation after deploy         | Static assets may serve stale content. Invalidate CloudFront cache after production deploys or set appropriate cache headers.                |
| No rollback plan before deploying                    | Always know your rollback path before deploying. Check that the previous CloudFormation stack version is accessible.                         |
| Using `--require-approval never` in production       | Production should use `--require-approval broadening` to catch IAM and security group changes that could be dangerous.                       |

## Quick reference

| Operation         | Command                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Preflight check   | `bun run scripts/preflight-check.ts --project-dir .`                                       |
| Build Next.js     | `npm ci && NODE_ENV=production npm run build`                                              |
| Synth CDK         | `npx cdk synth --context env={stage} --all`                                                |
| Diff changes      | `npx cdk diff --context env={stage}`                                                       |
| Deploy staging    | `bun run scripts/deploy.ts --env staging --project-dir .`                                  |
| Deploy production | `bun run scripts/deploy.ts --env production --project-dir . --require-approval broadening` |
| Rollback          | `bun run scripts/deploy.ts --env production --rollback --project-dir .`                    |
| Verify deployment | `bun run scripts/preflight-check.ts --project-dir . --verify-deployment --env production`  |

## Key principles

1. **Staging first, always** - Never deploy directly to production. The staging
   environment exists to catch issues before they affect users. Even "trivial"
   changes can break in unexpected ways.
2. **Explicit approval gates** - Production deployments require human
   confirmation. Automated pipelines are efficient but a human must verify
   staging works before promoting to production.
3. **Rollback readiness** - Before every deployment, confirm you can roll back.
   Know which rollback option (CDK, CloudFront, DNS) applies to your situation
   and verify the previous version is accessible.
4. **Environment isolation** - Staging and production must use separate AWS
   resources (different CloudFront distributions, different Lambda functions,
   different S3 buckets). Shared resources between environments cause cascading
   failures.
5. **Diff before deploy** - Always run `cdk diff` and review changes before
   deploying. This catches resource replacements, permission changes, and
   unintended modifications before they reach AWS.

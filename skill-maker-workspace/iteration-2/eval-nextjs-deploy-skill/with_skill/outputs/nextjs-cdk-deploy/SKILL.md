---
name: nextjs-cdk-deploy
description: Deploys Next.js applications to AWS using CDK with staged rollouts (staging then production), environment-specific configuration, manual approval gates, and rollback procedures. Use when deploying a Next.js app to AWS, setting up CDK infrastructure for Next.js, creating a staging-to-production deployment pipeline, rolling back a failed AWS deployment, or managing environment-specific CDK stacks.
---

# Next.js CDK Deploy

Deploy Next.js applications to AWS using CDK with a staged rollout workflow:
build, synthesize, deploy to staging, approve, deploy to production — with
rollback at every step.

## Overview

This skill guides the full deployment lifecycle for Next.js on AWS via CDK. It
assumes a Next.js app with a CDK infrastructure directory (typically `infra/` or
`cdk/`). The CDK stack provisions resources like Lambda@Edge or CloudFront + S3
for static assets, or an ECS/Fargate service for SSR.

## When to use

- When deploying a Next.js application to AWS
- When setting up CDK infrastructure for a Next.js project
- When creating a staging-to-production deployment pipeline
- When you need to roll back a failed deployment on AWS
- When managing environment-specific configuration (dev/staging/prod) for CDK
  stacks

**Do NOT use when:**

- Deploying to Vercel, Netlify, or non-AWS platforms
- The project uses Terraform, Pulumi, or SAM instead of CDK
- Deploying a non-Next.js application (use general CDK skills instead)

## Available scripts

All scripts use Bun. Run with `bun run <path>`.

- **`scripts/deploy.ts`** — Orchestrates the full deploy pipeline (build, synth,
  deploy to a target environment). Run `bun run scripts/deploy.ts --help`
- **`scripts/rollback.ts`** — Rolls back a deployment to a previous
  CloudFormation stack version. Run `bun run scripts/rollback.ts --help`
- **`scripts/check-health.ts`** — Checks deployment health by hitting the app
  endpoint and verifying HTTP status. Run
  `bun run scripts/check-health.ts --help`

## Deployment Workflow

Follow these steps in order. Each step has a verification gate — do not proceed
until the gate passes.

### 1. Pre-flight checks

Verify the environment is ready before touching anything.

```bash
# Verify AWS credentials are configured
aws sts get-caller-identity

# Verify CDK is bootstrapped in the target account/region
cdk bootstrap --show-template > /dev/null 2>&1

# Verify Next.js builds cleanly
npm run build  # or: bun run build
```

**Gate:** All three commands succeed. If `cdk bootstrap` has never been run in
this account/region, run it now:

```bash
cdk bootstrap aws://ACCOUNT_ID/REGION
```

### 2. Configure environment

Load environment-specific configuration. CDK stacks should read config from a
structured file, not hardcoded values.

**Recommended pattern:** Use a `config/` directory with per-environment files:

```
config/
  staging.ts    # { domainName: "staging.example.com", ... }
  production.ts # { domainName: "example.com", ... }
```

Each config file exports a typed object:

```typescript
// config/staging.ts
import type { EnvConfig } from "./types";

export const config: EnvConfig = {
  envName: "staging",
  domainName: "staging.example.com",
  certificateArn: "arn:aws:acm:us-east-1:123456789:certificate/abc-123",
  logRetentionDays: 7,
  enableWaf: false,
  minCapacity: 1,
  maxCapacity: 2,
};
```

The CDK stack imports the correct config based on a context variable:

```typescript
const envName = app.node.tryGetContext("env") || "staging";
const { config } = await import(`../config/${envName}`);
```

**Gate:** Config file exists for the target environment and passes TypeScript
type checking.

### 3. Build the Next.js application

```bash
# Clean previous build artifacts
rm -rf .next out

# Build with the target environment
NODE_ENV=production npm run build
```

Or use the bundled script:

```bash
bun run scripts/deploy.ts --stage build --env staging
```

**Gate:** Build completes with exit code 0 and `.next/` directory exists.

### 4. Synthesize the CDK stack

```bash
cdk synth --context env=staging --output cdk.out/staging
```

Review the synthesized CloudFormation template for unexpected changes:

```bash
cdk diff --context env=staging
```

**Gate:** `cdk synth` succeeds and `cdk diff` shows only expected changes. If
diff shows resource replacements (especially databases or stateful resources),
STOP and review with the team.

### 5. Deploy to staging

```bash
cdk deploy --context env=staging --require-approval never --outputs-file cdk-outputs-staging.json
```

Or use the bundled script:

```bash
bun run scripts/deploy.ts --env staging
```

After deployment completes, verify the staging environment:

```bash
bun run scripts/check-health.ts --url https://staging.example.com --expect-status 200
```

**Gate:** Deployment succeeds AND health check passes. If health check fails,
run rollback (see Rollback Procedures below) before proceeding.

### 6. Manual approval gate

**This step is intentionally manual.** Do not auto-approve production deploys.

Present the following to the user for approval:

- Staging URL for manual verification
- `cdk diff` output for production (so they see what will change)
- Health check results from staging

```bash
# Show what production deploy will change
cdk diff --context env=production
```

**Gate:** User explicitly approves production deployment.

### 7. Deploy to production

```bash
cdk deploy --context env=production --require-approval never --outputs-file cdk-outputs-production.json
```

Or use the bundled script:

```bash
bun run scripts/deploy.ts --env production
```

After deployment:

```bash
bun run scripts/check-health.ts --url https://example.com --expect-status 200
```

**Gate:** Deployment succeeds AND health check passes. If health check fails,
immediately run rollback.

### 8. Post-deployment verification

- Verify CloudFront distribution is serving the new version
- Check CloudWatch logs for errors in the first 5 minutes
- Verify static assets load correctly (check browser console)
- Confirm environment variables are correctly set

```bash
# Check recent CloudWatch logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/nextjs-ssr \
  --start-time $(date -d '5 minutes ago' +%s000) \
  --filter-pattern "ERROR"
```

## Rollback Procedures

Rollback is critical. Every deployment must be reversible. Use these procedures
when a deployment fails health checks or causes errors.

### Quick rollback (CloudFormation)

CloudFormation tracks previous stack states. Roll back to the last known good
state:

```bash
bun run scripts/rollback.ts --env production --reason "Health check failed after deploy"
```

Or manually:

```bash
# 1. Find the last successful stack update
aws cloudformation describe-stack-events \
  --stack-name NextjsProdStack \
  --query "StackEvents[?ResourceStatus=='UPDATE_COMPLETE'].Timestamp" \
  --output text | head -1

# 2. Roll back the stack
aws cloudformation rollback-stack --stack-name NextjsProdStack

# 3. Wait for rollback to complete
aws cloudformation wait stack-rollback-complete --stack-name NextjsProdStack

# 4. Verify health after rollback
bun run scripts/check-health.ts --url https://example.com --expect-status 200
```

### CloudFront rollback (cache-level)

If the issue is with static assets served via CloudFront:

```bash
# Create an invalidation to clear cached bad assets
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"
```

### Full redeploy rollback

If CloudFormation rollback fails or the stack is in a broken state:

1. Check out the last known good commit: `git checkout <last-good-sha>`
2. Rebuild: `npm run build`
3. Redeploy: `cdk deploy --context env=production --require-approval never`
4. Verify health: `bun run scripts/check-health.ts --url https://example.com`

### Rollback decision tree

| Symptom                         | Action                                            |
| ------------------------------- | ------------------------------------------------- |
| Health check returns non-200    | Run `scripts/rollback.ts --env <env>`             |
| Static assets 404               | Invalidate CloudFront cache, then check S3 bucket |
| Lambda errors in CloudWatch     | Roll back CloudFormation stack                    |
| Stack in UPDATE_ROLLBACK_FAILED | Delete and redeploy from last good commit         |
| DNS not resolving               | Check Route53 records — likely not a deploy issue |

## Common mistakes

| Mistake                                                   | Fix                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Deploying to production without testing staging first     | Always deploy staging first and verify with health checks before requesting production approval               |
| Forgetting to run `cdk bootstrap` in a new account/region | Run `cdk bootstrap aws://ACCOUNT/REGION` before first deploy — CDK cannot deploy without it                   |
| Hardcoding environment values in the CDK stack            | Use typed config files per environment (`config/staging.ts`, `config/production.ts`) loaded via CDK context   |
| Not checking `cdk diff` before deploying                  | Always run `cdk diff` to catch unexpected resource replacements, especially stateful resources like databases |
| Skipping health checks after deployment                   | Always run `scripts/check-health.ts` after every deploy — a successful CDK deploy does not mean the app works |
| Using `--require-approval broadening` for production      | Use `--require-approval never` only after explicit human approval in step 6 — never auto-approve IAM changes  |
| Not capturing CDK outputs after deploy                    | Use `--outputs-file` flag to save stack outputs (URLs, ARNs) for downstream use                               |
| Running `cdk destroy` instead of rollback                 | Use CloudFormation rollback to preserve resources — `cdk destroy` deletes everything including databases      |

## Checklist

- [ ] AWS credentials configured and verified (`aws sts get-caller-identity`)
- [ ] CDK bootstrapped in target account/region
- [ ] Environment config file exists for target environment
- [ ] Next.js builds successfully (`npm run build`)
- [ ] CDK synth succeeds (`cdk synth --context env=<env>`)
- [ ] `cdk diff` reviewed — no unexpected resource replacements
- [ ] Staging deployed and health check passes
- [ ] User approved production deployment
- [ ] Production deployed and health check passes
- [ ] Post-deployment CloudWatch logs checked for errors
- [ ] Rollback procedure tested or documented for this stack

## Quick reference

| Operation                 | Command                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| Full deploy to staging    | `bun run scripts/deploy.ts --env staging`                                |
| Full deploy to production | `bun run scripts/deploy.ts --env production`                             |
| Health check              | `bun run scripts/check-health.ts --url <url> --expect-status 200`        |
| Rollback                  | `bun run scripts/rollback.ts --env <env> --reason "<reason>"`            |
| CDK diff                  | `cdk diff --context env=<env>`                                           |
| CDK synth                 | `cdk synth --context env=<env>`                                          |
| Bootstrap new account     | `cdk bootstrap aws://ACCOUNT/REGION`                                     |
| Invalidate CloudFront     | `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"` |

## Key principles

1. **Staging before production, always** — Never deploy directly to production.
   The staging environment exists to catch issues before they affect users.
   Skipping it saves minutes but risks hours of downtime.

2. **Human approval is non-negotiable** — Production deployments require
   explicit human approval. Automated pipelines can deploy to staging, but the
   staging-to-production gate must be manual because the cost of a bad
   production deploy far exceeds the cost of waiting for approval.

3. **Every deploy must be reversible** — If you cannot roll back a deployment,
   you should not make it. Verify that CloudFormation rollback works for your
   stack before relying on it. Stateful resources (databases, S3 buckets) need
   special rollback consideration.

4. **Config is code, not environment variables** — Environment-specific
   configuration belongs in typed, version-controlled config files. Environment
   variables are for secrets only. This makes deployments reproducible and
   diffable.

5. **Health checks are the source of truth** — A successful `cdk deploy` means
   CloudFormation finished, not that the application works. Always verify with
   an HTTP health check against the actual endpoint.

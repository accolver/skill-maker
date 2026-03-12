---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with staged rollouts (staging then production), manual approval gates, environment-specific configuration, and rollback procedures. Use when deploying Next.js to AWS, setting up CDK stacks for Next.js, creating staging-to-production pipelines, configuring environment-specific builds, implementing rollback for Next.js deployments, or building AWS infrastructure for Next.js apps with CloudFront, Lambda@Edge, or SST.
---

# Next.js CDK Deploy

Deploy Next.js applications to AWS using CDK with a staging-first pipeline,
manual approval gates between environments, environment-specific configuration,
and automated rollback procedures.

## Overview

This skill guides you through the full deployment lifecycle for Next.js on AWS
via CDK: building the app, synthesizing the CDK stack, deploying to staging,
validating, promoting to production with a manual approval gate, and rolling
back if something goes wrong. It handles the complexity that agents typically
miss: environment-specific configs, CloudFront invalidation, Lambda@Edge cold
starts, and safe rollback without downtime.

## When to use

- When deploying a Next.js app to AWS using CDK
- When setting up a staging → production pipeline for Next.js
- When creating CDK stacks for Next.js (CloudFront + S3 + Lambda@Edge or
  Lambda + API Gateway)
- When adding environment-specific configuration to Next.js AWS deployments
- When implementing rollback procedures for Next.js on AWS
- When migrating a Next.js app from Vercel/Netlify to AWS

**Do NOT use when:**

- Deploying to Vercel, Netlify, or other managed platforms (no CDK needed)
- Using SST v3 Ion (different deployment model — use SST docs directly)
- Deploying a static-only Next.js export (use S3 + CloudFront without Lambda)
- Writing Next.js application code (this skill is for infrastructure only)

## Workflow

### 1. Assess the Next.js application

Before writing any CDK, understand what you're deploying:

```bash
bun run scripts/assess-nextjs-app.ts <path-to-nextjs-app>
```

This checks:

- **Rendering mode**: SSR, SSG, ISR, or hybrid (determines Lambda vs S3-only)
- **Output configuration**: `next.config.js` output setting (`standalone`,
  `export`, or default)
- **API routes**: presence of `/api` routes (requires Lambda)
- **Middleware**: Edge middleware (requires Lambda@Edge or CloudFront Functions)
- **Image optimization**: `next/image` usage (requires image optimization
  Lambda)
- **Environment variables**: `.env*` files and `NEXT_PUBLIC_*` usage

The script outputs a JSON assessment that determines which CDK constructs are
needed. **Do not skip this step** — deploying SSG-only apps with Lambda is
wasteful, and deploying SSR apps without Lambda will break.

### 2. Configure environment-specific settings

Create or update the environment configuration file. Each environment needs its
own settings because Next.js bakes `NEXT_PUBLIC_*` variables at build time.

**File: `cdk/config/environments.ts`**

```typescript
export interface EnvironmentConfig {
  account: string;
  region: string;
  domainName: string;
  certificateArn: string;
  hostedZoneId: string;
  nextPublicVars: Record<string, string>;
  lambdaMemory: number;
  lambdaTimeout: number;
  enableWaf: boolean;
  logRetentionDays: number;
}

export const environments: Record<string, EnvironmentConfig> = {
  staging: {
    account: process.env.CDK_STAGING_ACCOUNT!,
    region: "us-east-1",
    domainName: "staging.example.com",
    certificateArn: process.env.CDK_STAGING_CERT_ARN!,
    hostedZoneId: process.env.CDK_STAGING_ZONE_ID!,
    nextPublicVars: {
      NEXT_PUBLIC_API_URL: "https://api-staging.example.com",
      NEXT_PUBLIC_ENV: "staging",
    },
    lambdaMemory: 512,
    lambdaTimeout: 10,
    enableWaf: false,
    logRetentionDays: 7,
  },
  production: {
    account: process.env.CDK_PROD_ACCOUNT!,
    region: "us-east-1",
    domainName: "example.com",
    certificateArn: process.env.CDK_PROD_CERT_ARN!,
    hostedZoneId: process.env.CDK_PROD_ZONE_ID!,
    nextPublicVars: {
      NEXT_PUBLIC_API_URL: "https://api.example.com",
      NEXT_PUBLIC_ENV: "production",
    },
    lambdaMemory: 1024,
    lambdaTimeout: 10,
    enableWaf: true,
    logRetentionDays: 90,
  },
};
```

**Critical**: `NEXT_PUBLIC_*` variables are embedded at build time, not runtime.
This means you must build the Next.js app separately for each environment. A
single build artifact deployed to both staging and production will have
staging's public variables in production. This is the most common mistake agents
make.

### 3. Build the Next.js application

Build per-environment because `NEXT_PUBLIC_*` vars are compile-time:

```bash
bun run scripts/build-nextjs.ts --env staging --app-dir ./my-next-app --out-dir ./build/staging
```

The script:

1. Loads environment-specific `NEXT_PUBLIC_*` variables
2. Runs `next build` with `output: 'standalone'`
3. Copies the standalone output, static assets, and public directory
4. Creates a deployment manifest (`manifest.json`) with build metadata
5. Validates the build output structure

**Always use `output: 'standalone'`** for AWS Lambda deployments. This produces
a self-contained server that doesn't need `node_modules`. Without it, your
Lambda deployment package will be 200MB+ instead of ~20MB.

### 4. Synthesize and deploy the CDK stack

Deploy follows a strict order: staging first, validate, then production.

#### Deploy to staging

```bash
bun run scripts/deploy.ts --env staging --app-dir ./my-next-app
```

This runs the full pipeline:

1. Build the Next.js app for staging (Step 3)
2. `cdk synth` the staging stack
3. `cdk diff` to show what will change
4. `cdk deploy` with `--require-approval never` (staging is auto-approved)
5. Run post-deployment health checks
6. Record the deployment in the deployment log

#### Validate staging

After staging deploys, validate before promoting:

- Hit the staging URL and verify 200 response
- Check CloudFront distribution status is `Deployed`
- Verify Lambda function is responding (if SSR)
- Run smoke tests if available

```bash
bun run scripts/validate-deployment.ts --env staging --url https://staging.example.com
```

#### Manual approval gate

**Do NOT auto-deploy to production.** The deployment script will pause and
prompt for confirmation:

```
✅ Staging deployment validated successfully.

Ready to deploy to production?
  Staging URL: https://staging.example.com
  Production URL: https://example.com
  Changes: 3 resources updated, 1 added

To proceed: bun run scripts/deploy.ts --env production --app-dir ./my-next-app
To abort:   No action needed.
```

In CI/CD, implement this as a GitHub Actions environment protection rule or an
AWS CodePipeline manual approval action.

#### Deploy to production

```bash
bun run scripts/deploy.ts --env production --app-dir ./my-next-app
```

Same pipeline as staging but with `--require-approval broadening` (CDK will
prompt for security-sensitive changes).

### 5. Rollback procedures

If production deployment fails or causes issues:

#### Quick rollback (CloudFront + Lambda versioning)

```bash
bun run scripts/rollback.ts --env production
```

This script:

1. Reads the deployment log to find the previous successful deployment
2. Updates the Lambda alias to point to the previous version
3. Creates a CloudFront invalidation for `/*`
4. Waits for invalidation to complete
5. Validates the rollback

**Why this works**: Every deployment publishes a new Lambda version and updates
an alias. Rolling back just moves the alias pointer — no redeployment needed.
CloudFront invalidation clears cached static assets.

#### Full rollback (CDK)

If the quick rollback isn't sufficient (e.g., infrastructure changes broke
things):

```bash
bun run scripts/rollback.ts --env production --full
```

This:

1. Checks out the previous deployment's git commit
2. Rebuilds the app from that commit
3. Runs `cdk deploy` with the previous stack

**Warning**: Full rollback takes 5-15 minutes. Use quick rollback first.

### 6. Post-deployment

After successful production deployment:

1. **Invalidate CloudFront cache**: The deploy script does this automatically,
   but verify with `aws cloudfront get-invalidation`
2. **Monitor error rates**: Check CloudWatch for Lambda errors, 5xx responses
3. **Update deployment log**: The deploy script records this automatically
4. **Tag the release**: `git tag -a v<version> -m "Deployed to production"`

## Checklist

- [ ] Next.js app assessed (rendering mode, API routes, middleware)
- [ ] `output: 'standalone'` set in `next.config.js`
- [ ] Environment configs created for staging and production
- [ ] `NEXT_PUBLIC_*` vars are per-environment (separate builds)
- [ ] CDK stack synthesizes without errors (`cdk synth`)
- [ ] Staging deployed and validated
- [ ] Manual approval gate before production
- [ ] Production deployed
- [ ] CloudFront invalidation completed
- [ ] Rollback procedure tested at least once
- [ ] Deployment log updated
- [ ] Lambda memory/timeout tuned per environment

## Common mistakes

| Mistake                                | Fix                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Single build for all environments      | Build separately per environment. `NEXT_PUBLIC_*` vars are compile-time, not runtime.                   |
| Missing `output: 'standalone'`         | Add to `next.config.js`. Without it, Lambda packages are 200MB+ and cold starts are 10s+.               |
| CloudFront certificate in wrong region | ACM certificates for CloudFront **must** be in `us-east-1`, regardless of your app's region.            |
| No Lambda versioning                   | Always publish versions and use aliases. Without this, rollback requires full redeployment.             |
| Skipping CloudFront invalidation       | Stale cached assets cause broken deployments. Always invalidate `/*` after deploy.                      |
| Auto-deploying to production           | Always gate production behind manual approval. Staging validation catches issues before users see them. |
| Lambda@Edge in non-us-east-1           | Lambda@Edge functions must be created in `us-east-1`. CDK handles this with `EdgeFunction` construct.   |
| Hardcoded environment values in CDK    | Use the environment config pattern (Step 2). Hardcoded values drift and break.                          |
| No rollback plan                       | Always deploy with Lambda versioning + aliases. Test rollback before you need it.                       |
| Deploying `node_modules` to Lambda     | Use `standalone` output. The standalone server includes only needed dependencies at ~20MB vs 200MB+.    |

## Quick reference

| Operation           | Command                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| Assess app          | `bun run scripts/assess-nextjs-app.ts <app-dir>`                         |
| Build for env       | `bun run scripts/build-nextjs.ts --env <env> --app-dir <dir>`            |
| Deploy to env       | `bun run scripts/deploy.ts --env <env> --app-dir <dir>`                  |
| Validate deployment | `bun run scripts/validate-deployment.ts --env <env> --url <url>`         |
| Quick rollback      | `bun run scripts/rollback.ts --env <env>`                                |
| Full rollback       | `bun run scripts/rollback.ts --env <env> --full`                         |
| View deploy history | `bun run scripts/deploy-history.ts --env <env>`                          |
| CDK diff            | `cd cdk && npx cdk diff -c env=<env>`                                    |
| CDK synth           | `cd cdk && npx cdk synth -c env=<env>`                                   |
| Invalidate cache    | `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"` |

## Key principles

1. **Build per environment** — `NEXT_PUBLIC_*` variables are baked at build
   time. A staging build deployed to production will point to staging APIs.
   Always build separately for each target environment.

2. **Staging first, always** — Never deploy directly to production. Deploy to
   staging, validate, get manual approval, then promote. This catches CloudFront
   misconfigurations, Lambda cold start issues, and environment variable
   mistakes before users see them.

3. **Rollback in seconds, not minutes** — Use Lambda versioning and aliases so
   rollback is an alias pointer change + CloudFront invalidation (~30 seconds),
   not a full CDK redeployment (~10 minutes).

4. **Standalone output is non-negotiable** — `output: 'standalone'` in
   `next.config.js` reduces Lambda package size from 200MB+ to ~20MB, cuts cold
   start time from 10s+ to <2s, and eliminates `node_modules` deployment issues.

5. **Certificates in us-east-1** — CloudFront requires ACM certificates in
   `us-east-1` regardless of your application region. Lambda@Edge functions must
   also be in `us-east-1`. CDK's `EdgeFunction` construct handles this
   automatically.

---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with staged rollouts, environment-specific configuration, and rollback procedures. Use when deploying Next.js to AWS, setting up CDK infrastructure for Next.js, creating staging-to-production deployment pipelines, configuring environment-specific builds, implementing deployment rollback, or managing AWS infrastructure as code for frontend applications.
---

# Next.js CDK Deploy

Deploy Next.js applications to AWS using CDK with a staging-first pipeline,
manual production approval gate, and automated rollback.

## Overview

This skill guides the full deployment workflow: building the Next.js app,
synthesizing the CDK stack, deploying to staging, verifying, then promoting to
production with a manual approval gate. It handles environment-specific
configuration and provides rollback procedures when deployments fail.

## When to use

- When deploying a Next.js application to AWS
- When setting up CDK infrastructure for a Next.js project
- When creating a staging-to-production deployment pipeline
- When you need environment-specific configuration (dev/staging/prod)
- When implementing rollback procedures for AWS deployments
- When managing CloudFront, S3, Lambda@Edge, or SSR infrastructure for Next.js

**Do NOT use when:**

- Deploying to Vercel, Netlify, or non-AWS platforms
- Using Terraform, Pulumi, or SAM instead of CDK
- The application is not Next.js (use general CDK patterns instead)

## Workflow

### 1. Validate prerequisites

Before starting, verify the environment is ready:

```bash
bun run scripts/preflight-check.ts
```

This checks for AWS CLI, CDK CLI, Node.js, valid AWS credentials, and required
environment variables. Fix any failures before proceeding because CDK synth will
fail with cryptic errors if prerequisites are missing.

### 2. Configure environment

Create or verify environment config files. Each environment needs its own
configuration in `cdk/config/`:

```
cdk/config/
  staging.ts    # Staging-specific values
  production.ts # Production-specific values
  shared.ts     # Values common to all environments
```

**Environment config structure:**

```typescript
// cdk/config/staging.ts
export const config = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  domainName: "staging.example.com",
  certificateArn: process.env.STAGING_CERT_ARN,
  nextPublicApiUrl: "https://api-staging.example.com",
  logRetentionDays: 7,
  enableWaf: false,
  minCapacity: 1,
  maxCapacity: 5,
};
```

Key differences between environments:

| Setting            | Staging             | Production  |
| ------------------ | ------------------- | ----------- |
| `domainName`       | staging.example.com | example.com |
| `logRetentionDays` | 7                   | 90          |
| `enableWaf`        | false               | true        |
| `minCapacity`      | 1                   | 3           |
| `maxCapacity`      | 5                   | 50          |

### 3. Build the Next.js application

```bash
# Install dependencies
npm ci

# Build with environment-specific variables
NEXT_PUBLIC_API_URL=$API_URL \
NEXT_PUBLIC_ENV=$DEPLOY_ENV \
  npm run build
```

Verify the build output exists at `.next/` and contains both static assets and
server bundles. A missing `.next/standalone/` directory means the Next.js config
is missing `output: 'standalone'` — this is required for Lambda deployment.

**Required next.config.js settings:**

```javascript
module.exports = {
  output: "standalone",
  images: {
    unoptimized: false, // Use CloudFront for image optimization
  },
};
```

### 4. Synthesize the CDK stack

```bash
cd cdk
npx cdk synth --context env=staging --strict
```

The `--strict` flag catches common issues early. Review the synthesized
CloudFormation template in `cdk.out/` for unexpected changes. If synth fails,
check:

- Missing environment variables referenced in config
- CDK version mismatches between `package.json` and globally installed CLI
- TypeScript compilation errors in stack definitions

### 5. Deploy to staging

```bash
npx cdk deploy NextJsStack-staging \
  --context env=staging \
  --require-approval never \
  --outputs-file staging-outputs.json
```

`--require-approval never` is safe for staging because it's a non-production
environment. The `--outputs-file` captures CloudFront URL, S3 bucket name, and
other outputs needed for verification.

After deployment completes:

1. Run smoke tests against the staging URL
2. Verify CloudFront distribution is serving the correct version
3. Check CloudWatch logs for Lambda@Edge errors
4. Test critical user flows manually or with automated tests

### 6. Manual approval gate

**Do NOT deploy to production without explicit approval.** Present the staging
verification results and ask for confirmation:

```
Staging deployment complete:
- URL: https://staging.example.com
- CloudFront distribution: E1234567890
- Build version: abc123
- Smoke tests: PASSED

Deploy to production? (requires explicit confirmation)
```

Wait for explicit user approval before proceeding. Never auto-promote to
production.

### 7. Deploy to production

```bash
npx cdk deploy NextJsStack-production \
  --context env=production \
  --require-approval broadening \
  --outputs-file production-outputs.json
```

`--require-approval broadening` ensures CDK prompts for any IAM or security
group changes. This is a critical safety net for production.

After deployment:

1. Verify production URL serves the new version
2. Monitor CloudWatch error rates for 15 minutes
3. Check CloudFront cache invalidation completed
4. Confirm DNS resolution is correct

### 8. Post-deployment verification

```bash
bun run scripts/verify-deployment.ts --env production --url https://example.com
```

This script checks HTTP status, response headers, build version tag, and SSL
certificate validity.

## Rollback Procedures

### Immediate rollback (CloudFront)

If the deployment is broken but infrastructure is intact, roll back CloudFront
to the previous S3 origin:

```bash
# List previous deployment versions
aws s3 ls s3://your-bucket/ --recursive | head -20

# Update CloudFront to point to previous version prefix
aws cloudfront update-distribution \
  --id E1234567890 \
  --distribution-config file://previous-config.json
```

### CDK rollback (full stack)

If infrastructure changes caused the issue:

```bash
# Find the last successful deployment
aws cloudformation describe-stack-events \
  --stack-name NextJsStack-production \
  --query "StackEvents[?ResourceStatus=='UPDATE_COMPLETE'].Timestamp" \
  --output text | head -1

# Roll back to previous stack state
npx cdk deploy NextJsStack-production \
  --context env=production \
  --context rollback=true \
  --require-approval broadening
```

### Emergency rollback (DNS failover)

If both CloudFront and CDK rollback fail, switch DNS to a static maintenance
page or previous stable deployment:

```bash
# Switch Route53 to maintenance page
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch file://failover-dns.json
```

### Rollback decision tree

1. **Page loads but wrong version** -> CloudFront invalidation + S3 origin
   switch
2. **5xx errors from Lambda** -> CDK rollback to previous stack
3. **CloudFront not responding** -> DNS failover to maintenance page
4. **Database migration issue** -> Application-level rollback (out of scope)

## CDK Stack Architecture

The recommended stack structure for Next.js on AWS:

```
NextJsStack
├── S3 Bucket (static assets + standalone build)
├── CloudFront Distribution
│   ├── Default behavior -> Lambda@Edge (SSR)
│   ├── /_next/static/* -> S3 Origin (static assets)
│   └── /api/* -> Lambda@Edge (API routes)
├── Lambda@Edge Function (server-side rendering)
├── Route53 Record (custom domain)
├── ACM Certificate (SSL/TLS)
└── WAF WebACL (production only)
```

## Checklist

- [ ] Prerequisites verified (AWS CLI, CDK, credentials)
- [ ] Environment config files created for staging and production
- [ ] `next.config.js` has `output: 'standalone'`
- [ ] Next.js build succeeds with environment-specific variables
- [ ] CDK synth completes without errors
- [ ] Staging deployment succeeds
- [ ] Staging smoke tests pass
- [ ] Manual approval received for production
- [ ] Production deployment succeeds
- [ ] Post-deployment verification passes
- [ ] Rollback procedure documented and tested

## Common mistakes

| Mistake                                                | Fix                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Missing `output: 'standalone'` in next.config.js       | Add it — Lambda deployment requires standalone output mode                                   |
| Using `--require-approval never` for production        | Always use `--require-approval broadening` for production to catch IAM changes               |
| Hardcoding environment values in CDK stack             | Use config files per environment and pass via CDK context                                    |
| Not invalidating CloudFront cache after deploy         | Add `aws cloudfront create-invalidation --distribution-id $ID --paths "/*"` to deploy script |
| Deploying to production without staging verification   | Always deploy staging first — the approval gate exists for a reason                          |
| CDK version mismatch between local and CI              | Pin CDK version in package.json and use `npx cdk` instead of global install                  |
| Forgetting to set NEXT_PUBLIC_* env vars at build time | Next.js inlines NEXT_PUBLIC_* at build time, not runtime — set them before `npm run build`   |
| Lambda@Edge function exceeding 1MB size limit          | Enable tree-shaking, exclude dev dependencies, use standalone output                         |

## Quick reference

| Operation         | Command                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Preflight check   | `bun run scripts/preflight-check.ts`                                                           |
| Build for staging | `NEXT_PUBLIC_ENV=staging npm run build`                                                        |
| Synth staging     | `npx cdk synth --context env=staging --strict`                                                 |
| Deploy staging    | `npx cdk deploy NextJsStack-staging --context env=staging --require-approval never`            |
| Deploy production | `npx cdk deploy NextJsStack-production --context env=production --require-approval broadening` |
| Verify deployment | `bun run scripts/verify-deployment.ts --env production --url https://example.com`              |
| Invalidate cache  | `aws cloudfront create-invalidation --distribution-id $ID --paths "/*"`                        |
| Rollback CDK      | `npx cdk deploy NextJsStack-production --context env=production --context rollback=true`       |

## Key principles

1. **Staging first, always** — Never deploy directly to production. The staging
   environment exists to catch issues before they affect users. Skipping it
   saves minutes but risks hours of incident response.
2. **Explicit approval gates** — Production deployments require human
   confirmation. Automated pipelines should pause and wait, never auto-promote.
   This prevents cascading failures from bad builds.
3. **Environment parity** — Staging and production should be as similar as
   possible. Differences in configuration should be limited to domain names,
   scaling parameters, and security settings. Divergent environments hide bugs.
4. **Rollback readiness** — Every deployment should be reversible. Know which
   rollback procedure to use before deploying. Test rollback procedures
   periodically — an untested rollback is not a rollback plan.
5. **Build-time vs runtime config** — Next.js `NEXT_PUBLIC_*` variables are
   inlined at build time. Environment-specific values must be set before
   `npm run build`, not at deployment time. Getting this wrong produces a
   staging build with production URLs or vice versa.

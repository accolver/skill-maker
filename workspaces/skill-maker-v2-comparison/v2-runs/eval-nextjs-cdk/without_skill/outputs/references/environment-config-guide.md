# Environment Configuration Guide

## Overview

This guide explains how environment-specific configuration works in the Next.js
CDK deployment pipeline. Getting this right is critical — misconfigured
environments are the #1 cause of deployment issues.

## Configuration File Structure

```
config/
├── shared.env          # Variables common to all stages
├── staging.env         # Staging-specific overrides
└── production.env      # Production-specific overrides
```

**Load order:** `shared.env` is loaded first, then `<stage>.env` overrides any
shared values.

## Required Variables

Every stage config MUST include these variables:

| Variable          | Description                  | Example (staging)     | Example (production) |
| ----------------- | ---------------------------- | --------------------- | -------------------- |
| `AWS_ACCOUNT_ID`  | AWS account for this stage   | `111111111111`        | `222222222222`       |
| `AWS_REGION`      | AWS region to deploy to      | `us-east-1`           | `us-east-1`          |
| `DOMAIN_NAME`     | Custom domain for this stage | `staging.example.com` | `www.example.com`    |
| `CERTIFICATE_ARN` | ACM certificate ARN          | `arn:aws:acm:...`     | `arn:aws:acm:...`    |
| `MIN_INSTANCES`   | Minimum Lambda concurrency   | `1`                   | `3`                  |
| `MAX_INSTANCES`   | Maximum Lambda concurrency   | `5`                   | `50`                 |
| `LOG_LEVEL`       | Logging verbosity            | `debug`               | `warn`               |

## Next.js Environment Variables

### Build-Time vs Runtime

This is the most important distinction:

| Type            | Prefix         | When Resolved | Can Change Without Rebuild?  |
| --------------- | -------------- | ------------- | ---------------------------- |
| **Client-side** | `NEXT_PUBLIC_` | Build time    | No — baked into JS bundle    |
| **Server-side** | No prefix      | Runtime       | Yes — set in Lambda env vars |

### Implications

1. **`NEXT_PUBLIC_API_URL`** — If you change this, you MUST rebuild the app. The
   value is embedded in the client-side JavaScript bundle during `next build`.

2. **`DATABASE_URL`** — Can be changed by updating the Lambda environment
   variable. No rebuild needed.

3. **Staging and production MUST be built separately** — You cannot build once
   and deploy to both stages because `NEXT_PUBLIC_*` values differ.

### Example: What Goes Where

```env
# config/staging.env

# Build-time (NEXT_PUBLIC_) — baked into JS bundle
NEXT_PUBLIC_API_URL=https://api-staging.example.com
NEXT_PUBLIC_STAGE=staging
NEXT_PUBLIC_ANALYTICS_ID=UA-000000-1

# CDK infrastructure config — used by CDK at synth/deploy time
AWS_ACCOUNT_ID=111111111111
AWS_REGION=us-east-1
DOMAIN_NAME=staging.example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:111111111111:certificate/abc123

# Runtime server-side — set as Lambda environment variables
DATABASE_URL=postgresql://staging-db.example.com:5432/myapp
REDIS_URL=redis://staging-redis.example.com:6379
SESSION_SECRET=staging-secret-value
LOG_LEVEL=debug
```

## Multi-Account Strategy

For production workloads, use separate AWS accounts per stage:

```
Organization
├── Management Account (billing, org policies)
├── Staging Account (111111111111)
│   └── us-east-1: staging stack
└── Production Account (222222222222)
    └── us-east-1: production stack
```

**Benefits:**

- Blast radius isolation (staging issues can't affect production)
- Separate IAM boundaries
- Independent billing tracking
- Different security policies per stage

**CDK configuration for multi-account:**

```typescript
// infra/app.ts
const app = new cdk.App();
const stage = app.node.tryGetContext("stage") || "staging";
const config = loadConfig(stage);

new NextjsStack(app, `nextjs-app-${stage}`, {
  env: {
    account: config.account,
    region: config.region,
  },
  config,
});
```

## Secrets Management

**Never store secrets in `.env` files committed to git.**

Options for managing secrets:

### Option 1: AWS Secrets Manager (Recommended)

```typescript
// In CDK stack
const dbSecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  "DbSecret",
  `nextjs-app/${stage}/database-url`,
);

serverFunction.addEnvironment(
  "DATABASE_URL",
  dbSecret.secretValue.unsafeUnwrap(),
);
```

### Option 2: AWS SSM Parameter Store

```typescript
const dbUrl = ssm.StringParameter.fromStringParameterName(
  this,
  "DbUrl",
  `/nextjs-app/${stage}/database-url`,
);

serverFunction.addEnvironment("DATABASE_URL", dbUrl.stringValue);
```

### Option 3: Doppler / External Secret Manager

Use a secrets sync to push values to SSM or Secrets Manager, then reference them
in CDK as above.

## Adding a New Environment Variable

### Client-side (`NEXT_PUBLIC_*`)

1. Add to `config/staging.env` and `config/production.env`
2. Reference in your Next.js code: `process.env.NEXT_PUBLIC_MY_VAR`
3. **Rebuild and redeploy** — the value is baked in at build time

### Server-side (no prefix)

1. Add to `config/staging.env` and `config/production.env`
2. Update the CDK stack to pass it to the Lambda:
   ```typescript
   serverFunction.addEnvironment("MY_VAR", config.myVar);
   ```
3. Reference in API routes / server components: `process.env.MY_VAR`
4. **Redeploy** (rebuild optional — only CDK changes needed)

### Infrastructure-only

1. Add to `config/staging.env` and `config/production.env`
2. Update `loadConfig()` in `infra/config.ts` to read it
3. Use in CDK constructs
4. **Run `cdk diff` to verify**, then deploy

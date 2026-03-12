---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with staged rollouts (staging then production), manual approval gates, environment-specific configuration, and rollback procedures. Covers building the app, synthesizing CDK stacks, deploying infrastructure, and operating the deployment pipeline.
---

# Next.js CDK Deploy

Deploy Next.js applications to AWS using AWS CDK with a staged deployment
pipeline: build, synthesize, deploy to staging, approve, deploy to production —
with rollback at every stage.

## When to Use

- Deploying a Next.js app (App Router or Pages Router) to AWS
- Setting up CDK infrastructure for Next.js (CloudFront, Lambda@Edge or Lambda,
  S3, API Gateway)
- Creating a staging → production deployment pipeline with approval gates
- Managing environment-specific configuration (env vars, domains, scaling)
- Rolling back a failed deployment

## Workflow

### Step 1: Validate Prerequisites

Before starting, confirm the environment is ready:

```bash
# Check required tools
node --version    # >= 18.x
npm --version     # or pnpm/yarn
npx cdk --version # >= 2.x
aws sts get-caller-identity  # AWS credentials configured
```

Verify the project has:

- A valid `next.config.js` or `next.config.mjs`
- A `cdk.json` at the repo root (or create one)
- Environment config files per stage (see Step 2)

If `cdk.json` does not exist, create it:

```json
{
  "app": "npx ts-node --prefer-ts-exts infra/app.ts",
  "context": {
    "@aws-cdk/core:stackName": "nextjs-app"
  }
}
```

### Step 2: Configure Environments

Create environment-specific configuration files. Each stage (staging,
production) gets its own config.

**Directory structure:**

```
config/
  staging.env
  production.env
  shared.env
infra/
  app.ts
  stacks/
    nextjs-stack.ts
    pipeline-stack.ts
  constructs/
    nextjs-site.ts
    cdn.ts
```

**config/staging.env:**

```env
NEXT_PUBLIC_API_URL=https://api-staging.example.com
NEXT_PUBLIC_STAGE=staging
AWS_ACCOUNT_ID=111111111111
AWS_REGION=us-east-1
DOMAIN_NAME=staging.example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:111111111111:certificate/xxx
MIN_INSTANCES=1
MAX_INSTANCES=5
LOG_LEVEL=debug
```

**config/production.env:**

```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_STAGE=production
AWS_ACCOUNT_ID=222222222222
AWS_REGION=us-east-1
DOMAIN_NAME=www.example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:222222222222:certificate/yyy
MIN_INSTANCES=3
MAX_INSTANCES=50
LOG_LEVEL=warn
```

**Loading config in CDK (infra/config.ts):**

```typescript
import * as dotenv from "dotenv";
import * as path from "path";

export interface StageConfig {
  stage: string;
  account: string;
  region: string;
  domainName: string;
  certificateArn: string;
  minInstances: number;
  maxInstances: number;
  logLevel: string;
  nextPublicEnv: Record<string, string>;
}

export function loadConfig(stage: string): StageConfig {
  // Load shared first, then stage-specific (stage overrides shared)
  dotenv.config({ path: path.resolve(__dirname, "../config/shared.env") });
  const env = dotenv.config({
    path: path.resolve(__dirname, `../config/${stage}.env`),
  });

  if (env.error) {
    throw new Error(`Missing config file: config/${stage}.env`);
  }

  const get = (key: string): string => {
    const val = process.env[key];
    if (!val) {
      throw new Error(`Missing required config: ${key} for stage ${stage}`);
    }
    return val;
  };

  // Collect all NEXT_PUBLIC_ vars for build-time injection
  const nextPublicEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_") && value) {
      nextPublicEnv[key] = value;
    }
  }

  return {
    stage,
    account: get("AWS_ACCOUNT_ID"),
    region: get("AWS_REGION"),
    domainName: get("DOMAIN_NAME"),
    certificateArn: get("CERTIFICATE_ARN"),
    minInstances: parseInt(get("MIN_INSTANCES"), 10),
    maxInstances: parseInt(get("MAX_INSTANCES"), 10),
    logLevel: get("LOG_LEVEL"),
    nextPublicEnv,
  };
}
```

### Step 3: Build the Next.js Application

Build the app with the correct environment variables for the target stage:

```bash
# Usage: bun run scripts/build.ts <stage>
# Example: bun run scripts/build.ts staging
```

The build script (see `scripts/build.ts`):

1. Loads environment variables from `config/<stage>.env`
2. Runs `next build` with `output: "standalone"` configured
3. Copies static assets to the expected output structure
4. Validates the build output exists and is non-empty

**Critical: `next.config.js` must have `output: "standalone"`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // ... other config
};

module.exports = nextConfig;
```

Without `output: "standalone"`, the build won't produce the self-contained
server needed for Lambda/container deployment.

### Step 4: Synthesize the CDK Stack

Synthesize CloudFormation templates to verify infrastructure changes before
deploying:

```bash
# Usage: bun run scripts/synth.ts <stage>
# Example: bun run scripts/synth.ts staging
```

The synth script:

1. Loads stage config
2. Runs `cdk synth --stage <stage>`
3. Outputs the CloudFormation template to `cdk.out/`
4. Runs `cdk diff --stage <stage>` to show what will change

**Review the diff carefully.** Look for:

- Security group changes (unexpected open ports)
- IAM policy changes (overly broad permissions)
- Resource replacements (will cause downtime)
- Database changes (potential data loss)

### Step 5: Deploy to Staging

Deploy to staging first. Never deploy directly to production.

```bash
# Usage: bun run scripts/deploy.ts staging
```

The deploy script:

1. Runs the build (Step 3)
2. Runs synth and diff (Step 4)
3. Executes `cdk deploy --stage staging --require-approval never`
4. Waits for CloudFormation stack to reach `CREATE_COMPLETE` or
   `UPDATE_COMPLETE`
5. Runs smoke tests against the staging URL
6. Records the deployment metadata (stack version, timestamp, commit SHA)

**Smoke tests** (run automatically after staging deploy):

- HTTP 200 from the root URL
- HTTP 200 from `/api/health` (if it exists)
- Response time under 3 seconds
- No console errors in the response

### Step 6: Manual Approval Gate

After staging is verified, prompt for production approval:

```bash
# Usage: bun run scripts/approve.ts <deployment-id>
```

The approval gate:

1. Displays the staging deployment summary (what changed, test results)
2. Shows the `cdk diff` for production
3. Requires explicit confirmation: type `APPROVE` to proceed
4. Records who approved and when
5. Generates a deployment ticket/record

**Do NOT skip the approval gate.** Even for "small" changes. The gate exists to
catch issues that automated tests miss.

### Step 7: Deploy to Production

After approval, deploy to production:

```bash
# Usage: bun run scripts/deploy.ts production
```

The production deploy:

1. Verifies approval exists and is recent (within 4 hours)
2. Runs the build with production config
3. Executes `cdk deploy --stage production --require-approval never`
4. Performs progressive rollout (if configured):
   - Deploy to 10% of traffic
   - Monitor error rates for 5 minutes
   - If healthy, shift to 50%, then 100%
5. Runs production smoke tests
6. Records deployment metadata

### Step 8: Rollback (If Needed)

If something goes wrong, rollback immediately:

```bash
# Usage: bun run scripts/rollback.ts <stage> [--to-version <version>]
# Example: bun run scripts/rollback.ts production
# Example: bun run scripts/rollback.ts production --to-version v42
```

The rollback script:

1. Identifies the previous successful deployment version
2. Triggers CloudFormation rollback or redeploys the previous version
3. Waits for rollback to complete
4. Runs smoke tests to verify the rollback
5. Sends notification (Slack/email) about the rollback

**Rollback strategies by failure type:**

| Failure Type                          | Strategy                       | Command                                                             |
| ------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Lambda/compute error                  | Redeploy previous code version | `bun run scripts/rollback.ts <stage>`                               |
| Infrastructure change broke something | CloudFormation rollback        | `bun run scripts/rollback.ts <stage> --cfn-rollback`                |
| Bad config/env vars                   | Fix config and redeploy        | Edit `config/<stage>.env`, then `bun run scripts/deploy.ts <stage>` |
| Database migration issue              | Restore from snapshot          | Manual — see references/database-rollback.md                        |
| CDN/DNS issue                         | Revert CloudFront config       | `bun run scripts/rollback.ts <stage> --cdn-only`                    |

## CDK Stack Architecture

The CDK stack creates these AWS resources:

```
CloudFront Distribution
  ├── S3 Bucket (static assets: _next/static/*)
  ├── Lambda Function URL or API Gateway (server-side rendering)
  │   └── Lambda Function (Next.js standalone server)
  ├── Lambda@Edge (optional: for middleware/rewrites)
  └── ACM Certificate (HTTPS)

Route53 (DNS)
  └── A Record → CloudFront

IAM Roles
  ├── Lambda execution role
  └── CloudFront OAI/OAC for S3
```

**Key CDK construct (infra/constructs/nextjs-site.ts):**

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { StageConfig } from "../config";

export interface NextjsSiteProps {
  config: StageConfig;
  buildOutputPath: string;
}

export class NextjsSite extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly serverFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: NextjsSiteProps) {
    super(scope, id);

    const { config, buildOutputPath } = props;

    // S3 bucket for static assets
    const staticBucket = new s3.Bucket(this, "StaticAssets", {
      removalPolicy: config.stage === "production"
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.stage !== "production",
    });

    // Lambda function for SSR
    this.serverFunction = new lambda.Function(this, "ServerFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${buildOutputPath}/.next/standalone`),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
        STAGE: config.stage,
        ...config.nextPublicEnv,
      },
    });

    const functionUrl = this.serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, "CDN", {
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(functionUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
      additionalBehaviors: {
        "_next/static/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(staticBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      domainNames: [config.domainName],
      certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        "Cert",
        config.certificateArn,
      ),
    });

    // Deploy static assets to S3
    new s3deploy.BucketDeployment(this, "DeployStatic", {
      sources: [
        s3deploy.Source.asset(`${buildOutputPath}/.next/static`),
      ],
      destinationBucket: staticBucket,
      destinationKeyPrefix: "_next/static",
      distribution: this.distribution,
      distributionPaths: ["/_next/static/*"],
    });
  }
}
```

## Common Mistakes

| Mistake                                        | Why It Fails                                | Fix                                                                    |
| ---------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Missing `output: "standalone"` in next.config  | Build doesn't produce self-contained server | Add `output: "standalone"` to next.config.js                           |
| Deploying to production without staging first  | No safety net for catching issues           | Always deploy staging first, verify, then promote                      |
| Hardcoding env vars in CDK stack               | Different stages get wrong config           | Use `loadConfig(stage)` pattern from Step 2                            |
| Not setting `NEXT_PUBLIC_*` at build time      | Client-side env vars are empty              | Pass `NEXT_PUBLIC_*` vars during `next build`, not at runtime          |
| Lambda timeout too low                         | SSR pages timeout on cold start             | Set timeout to 30s minimum; use provisioned concurrency for production |
| Skipping `cdk diff` before deploy              | Unexpected infrastructure changes           | Always run diff and review before deploy                               |
| S3 bucket with `DESTROY` removal in production | Deleting stack deletes all static assets    | Use `RETAIN` removal policy for production buckets                     |
| Not invalidating CloudFront cache after deploy | Users see stale content                     | Include distribution paths in BucketDeployment or run invalidation     |
| Using `cdk deploy *` without stage filter      | Deploys all stages simultaneously           | Always specify the stage: `cdk deploy --context stage=staging`         |
| Rolling back without checking database state   | App version and DB schema mismatch          | Check migration status before rollback; restore DB snapshot if needed  |

## Quick Reference

| Operation                    | Command                                                   |
| ---------------------------- | --------------------------------------------------------- |
| Build for staging            | `bun run scripts/build.ts staging`                        |
| Build for production         | `bun run scripts/build.ts production`                     |
| Synth & diff staging         | `bun run scripts/synth.ts staging`                        |
| Synth & diff production      | `bun run scripts/synth.ts production`                     |
| Deploy to staging            | `bun run scripts/deploy.ts staging`                       |
| Deploy to production         | `bun run scripts/deploy.ts production`                    |
| Rollback staging             | `bun run scripts/rollback.ts staging`                     |
| Rollback production          | `bun run scripts/rollback.ts production`                  |
| Rollback to specific version | `bun run scripts/rollback.ts production --to-version v42` |
| View deployment history      | `bun run scripts/history.ts <stage>`                      |
| Run smoke tests              | `bun run scripts/smoke-test.ts <stage>`                   |
| Approve for production       | `bun run scripts/approve.ts <deployment-id>`              |

## Environment Variable Handling

Next.js has two types of environment variables with different behaviors:

| Type        | Prefix                           | Available At                                 | Injected When                     |
| ----------- | -------------------------------- | -------------------------------------------- | --------------------------------- |
| Server-side | No prefix (e.g., `DATABASE_URL`) | Server only (API routes, getServerSideProps) | Runtime (Lambda env vars)         |
| Client-side | `NEXT_PUBLIC_`                   | Client and server                            | Build time (baked into JS bundle) |

**This means:** `NEXT_PUBLIC_*` vars must be set correctly BEFORE `next build`.
They cannot be changed at deploy time without rebuilding. Server-side vars can
be set in the Lambda environment and changed without rebuilding.

## Progressive Rollout (Production)

For production deployments, use weighted routing to gradually shift traffic:

1. **Deploy canary (10%):** New version gets 10% of traffic via CloudFront
   weighted origins or Lambda aliases
2. **Monitor (5 min):** Watch error rates, latency p99, and 5xx responses in
   CloudWatch
3. **Promote to 50%:** If metrics are healthy, shift to 50%
4. **Monitor (5 min):** Continue watching metrics
5. **Promote to 100%:** Full traffic to new version
6. **Cleanup:** Remove old version resources after 24 hours

If any monitoring step shows degradation (error rate > 1% or p99 > 3s),
automatically rollback to 0% on the new version.

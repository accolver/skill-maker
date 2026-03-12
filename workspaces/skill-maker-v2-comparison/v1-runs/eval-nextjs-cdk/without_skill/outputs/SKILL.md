---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with staged rollouts (staging then production), manual approval gates, environment-specific configuration, and rollback procedures. Covers building the app, synthesizing CDK stacks, deploying infrastructure, and operating the deployment pipeline.
---

# Next.js CDK Deploy

Deploy Next.js applications to AWS using AWS CDK with a staged deployment
pipeline: build, synthesize, deploy to staging, approve, deploy to production.
Includes environment-specific configuration, rollback procedures, and
operational scripts.

## When to Use

- Deploying a Next.js app (App Router or Pages Router) to AWS
- Setting up CDK infrastructure for Next.js (Lambda@Edge, CloudFront, S3, etc.)
- Creating a staging → production deployment pipeline with approval gates
- Managing environment-specific configs (API URLs, feature flags, secrets)
- Rolling back a failed production deployment

## Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- A Next.js application (v13+ recommended)
- AWS account with permissions for CloudFormation, S3, CloudFront, Lambda, IAM

## Workflow

### Step 1: Validate the Next.js Application

Before any deployment, confirm the app builds cleanly.

```bash
# Install dependencies
npm ci

# Run linting and type checks
npm run lint
npx tsc --noEmit

# Run tests
npm test

# Build the Next.js app
npm run build
```

**Checkpoints:**

- `.next/` directory is created with no errors
- No TypeScript errors
- All tests pass

### Step 2: Set Up Environment Configuration

Create environment-specific configuration files. Each environment (staging,
production) gets its own config.

**Directory structure:**

```
config/
├── base.env          # Shared across all environments
├── staging.env       # Staging-specific overrides
└── production.env    # Production-specific overrides
```

**Example `config/base.env`:**

```env
NEXT_PUBLIC_APP_NAME=MyApp
NEXT_PUBLIC_LOG_LEVEL=info
```

**Example `config/staging.env`:**

```env
NEXT_PUBLIC_API_URL=https://api.staging.example.com
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_FEATURE_FLAGS=debug_panel,beta_features
AWS_ACCOUNT_ID=111111111111
AWS_REGION=us-east-1
DOMAIN_NAME=staging.example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:111111111111:certificate/staging-cert-id
```

**Example `config/production.env`:**

```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_FEATURE_FLAGS=
AWS_ACCOUNT_ID=222222222222
AWS_REGION=us-east-1
DOMAIN_NAME=example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:222222222222:certificate/prod-cert-id
```

**Config loader utility (`lib/load-config.ts`):**

```typescript
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

export interface DeploymentConfig {
  environment: string;
  awsAccountId: string;
  awsRegion: string;
  domainName: string;
  certificateArn: string;
  envVars: Record<string, string>;
}

export function loadConfig(environment: string): DeploymentConfig {
  const configDir = path.resolve(__dirname, "../config");

  // Load base config
  const baseEnv = dotenv.parse(
    fs.readFileSync(path.join(configDir, "base.env")),
  );

  // Load environment-specific config
  const envFile = path.join(configDir, `${environment}.env`);
  if (!fs.existsSync(envFile)) {
    throw new Error(`Config file not found: ${envFile}`);
  }
  const envSpecific = dotenv.parse(fs.readFileSync(envFile));

  // Merge: environment-specific overrides base
  const merged = { ...baseEnv, ...envSpecific };

  return {
    environment,
    awsAccountId: merged.AWS_ACCOUNT_ID,
    awsRegion: merged.AWS_REGION || "us-east-1",
    domainName: merged.DOMAIN_NAME,
    certificateArn: merged.CERTIFICATE_ARN,
    envVars: Object.fromEntries(
      Object.entries(merged).filter(
        ([key]) =>
          !["AWS_ACCOUNT_ID", "AWS_REGION", "DOMAIN_NAME", "CERTIFICATE_ARN"]
            .includes(key),
      ),
    ),
  };
}
```

### Step 3: Define the CDK Stack

Create a CDK stack that deploys the Next.js app using S3 + CloudFront +
Lambda@Edge (or Lambda function URLs for server-side rendering).

**Stack structure:**

```
cdk/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   ├── nextjs-stack.ts      # Main stack definition
│   └── constructs/
│       ├── static-site.ts   # S3 + CloudFront for static assets
│       └── ssr-function.ts  # Lambda for SSR
├── cdk.json
└── tsconfig.json
```

**CDK app entry point (`cdk/bin/app.ts`):**

```typescript
#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NextjsStack } from "../lib/nextjs-stack";
import { loadConfig } from "../../lib/load-config";

const app = new cdk.App();
const environment = app.node.tryGetContext("environment") || "staging";
const config = loadConfig(environment);

new NextjsStack(app, `NextjsApp-${config.environment}`, {
  env: {
    account: config.awsAccountId,
    region: config.awsRegion,
  },
  config,
  tags: {
    Environment: config.environment,
    Project: "nextjs-app",
    ManagedBy: "cdk",
  },
});
```

**Main stack (`cdk/lib/nextjs-stack.ts`):**

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { DeploymentConfig } from "../../lib/load-config";

interface NextjsStackProps extends cdk.StackProps {
  config: DeploymentConfig;
}

export class NextjsStack extends cdk.Stack {
  public readonly distributionId: string;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: NextjsStackProps) {
    super(scope, id, props);

    const { config } = props;

    // S3 bucket for static assets
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `${config.domainName}-assets`,
      removalPolicy: config.environment === "production"
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== "production",
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Lambda function for SSR
    const ssrFunction = new lambda.Function(this, "SSRFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(".next/standalone"),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: config.envVars,
    });

    // CloudFront distribution
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      config.certificateArn,
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(
          ssrFunction.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
          }),
        ),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      additionalBehaviors: {
        "_next/static/*": {
          origin: new origins.S3Origin(siteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        "*.ico": {
          origin: new origins.S3Origin(siteBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      domainNames: [config.domainName],
      certificate,
    });

    // Deploy static assets to S3
    new s3deploy.BucketDeployment(this, "DeployStaticAssets", {
      sources: [s3deploy.Source.asset(".next/static")],
      destinationBucket: siteBucket,
      destinationKeyPrefix: "_next/static",
      distribution,
      distributionPaths: ["/_next/static/*"],
    });

    // Outputs
    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: siteBucket.bucketName,
    });

    this.distributionId = distribution.distributionId;
    this.bucketName = siteBucket.bucketName;
  }
}
```

### Step 4: Synthesize the CDK Stack

Synthesize to validate the CloudFormation template before deploying.

```bash
# Synthesize for staging
cd cdk
npx cdk synth -c environment=staging

# Review the generated template
cat cdk.out/NextjsApp-staging.template.json | jq '.Resources | keys'

# Diff against current deployed stack (if any)
npx cdk diff -c environment=staging
```

**Checkpoints:**

- `cdk.out/` directory contains the synthesized template
- No synthesis errors
- `cdk diff` shows expected changes (new resources or updates, no unexpected
  deletions)

### Step 5: Deploy to Staging

Deploy to the staging environment first. Always deploy staging before
production.

```bash
# Bootstrap CDK (first time only)
npx cdk bootstrap aws://111111111111/us-east-1

# Deploy to staging
npx cdk deploy NextjsApp-staging \
  -c environment=staging \
  --require-approval broadening \
  --outputs-file staging-outputs.json
```

**Post-deployment validation:**

```bash
# Get the CloudFront URL from outputs
STAGING_URL=$(jq -r '.["NextjsApp-staging"].DistributionDomainName' staging-outputs.json)

# Health check
curl -s -o /dev/null -w "%{http_code}" "https://${STAGING_URL}"

# Smoke test critical paths
curl -s "https://${STAGING_URL}" | grep -q "<title>" && echo "Homepage OK"
curl -s "https://${STAGING_URL}/api/health" | jq .status
```

**Checkpoints:**

- CloudFormation stack status is `CREATE_COMPLETE` or `UPDATE_COMPLETE`
- Health check returns 200
- Smoke tests pass on critical paths
- No errors in CloudWatch logs for the Lambda function

### Step 6: Manual Approval Gate

**STOP HERE.** Do not proceed to production until staging has been validated.

**Approval checklist:**

1. All smoke tests pass on staging
2. QA team has verified critical user flows
3. No error spikes in CloudWatch metrics
4. Performance metrics are within acceptable range
5. Rollback plan is documented and tested

**To record approval:**

```bash
# Create an approval record
echo "{
  \"approved_by\": \"$(git config user.name)\",
  \"approved_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"staging_url\": \"https://${STAGING_URL}\",
  \"commit_sha\": \"$(git rev-parse HEAD)\",
  \"notes\": \"All smoke tests pass. QA approved.\"
}" > deployment-approval.json

git add deployment-approval.json
git commit -m "chore: approve deployment $(git rev-parse --short HEAD) for production"
```

### Step 7: Deploy to Production

After approval, deploy to production.

```bash
# Build with production config
NEXT_PUBLIC_ENVIRONMENT=production npm run build

# Synthesize production stack
cd cdk
npx cdk synth -c environment=production

# Review diff carefully
npx cdk diff -c environment=production

# Deploy to production (requires explicit approval for IAM/security changes)
npx cdk deploy NextjsApp-production \
  -c environment=production \
  --require-approval broadening \
  --outputs-file production-outputs.json
```

**Post-deployment validation:**

```bash
PROD_URL=$(jq -r '.["NextjsApp-production"].DistributionDomainName' production-outputs.json)

# Health check
curl -s -o /dev/null -w "%{http_code}" "https://${PROD_URL}"

# Smoke tests
curl -s "https://${PROD_URL}" | grep -q "<title>" && echo "Homepage OK"
curl -s "https://${PROD_URL}/api/health" | jq .status
```

### Step 8: Rollback Procedures

If production deployment fails or causes issues, follow these rollback steps.

#### Option A: CDK Rollback (Recommended)

Roll back to the previous CloudFormation stack version:

```bash
# Check current stack status
aws cloudformation describe-stacks \
  --stack-name NextjsApp-production \
  --query 'Stacks[0].StackStatus'

# If stack is in a failed state, roll back
aws cloudformation rollback-stack --stack-name NextjsApp-production

# If stack update succeeded but app is broken, redeploy previous version
git checkout <previous-commit-sha>
npm ci && npm run build
cd cdk && npx cdk deploy NextjsApp-production -c environment=production
```

#### Option B: CloudFront Rollback (Fast)

If only static assets are broken, invalidate CloudFront and redeploy assets:

```bash
# Get distribution ID
DIST_ID=$(jq -r '.["NextjsApp-production"].DistributionId' production-outputs.json)

# Redeploy previous static assets
git checkout <previous-commit-sha> -- .next/static
aws s3 sync .next/static s3://<bucket-name>/_next/static --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*"
```

#### Option C: Lambda Version Rollback (SSR Issues)

If SSR is broken but static assets are fine:

```bash
# List Lambda versions
aws lambda list-versions-by-function \
  --function-name NextjsApp-production-SSRFunction \
  --query 'Versions[-3:].[Version,Description]'

# Point alias to previous version
aws lambda update-alias \
  --function-name NextjsApp-production-SSRFunction \
  --name live \
  --function-version <previous-version-number>
```

#### Rollback Decision Tree

```
Is the site completely down?
├── Yes → Option A: Full CDK rollback
└── No
    ├── Are static assets broken (CSS/JS 404s)?
    │   └── Yes → Option B: CloudFront + S3 rollback
    ├── Is SSR returning errors?
    │   └── Yes → Option C: Lambda version rollback
    └── Is it a config issue?
        └── Yes → Update environment variables and redeploy Lambda
```

## Common Mistakes

| Mistake                                               | Why It Fails                                                   | Fix                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| Deploying to production without staging               | No validation of changes in a safe environment                 | Always deploy staging first, validate, then production     |
| Not using `output: 'standalone'` in `next.config.js`  | Lambda deployment package is too large or missing dependencies | Add `output: 'standalone'` to `next.config.js`             |
| Hardcoding environment values                         | Same config used in staging and production                     | Use environment-specific config files loaded at build time |
| Skipping `cdk diff` before deploy                     | Unexpected resource deletions or replacements                  | Always run `cdk diff` and review before `cdk deploy`       |
| Not setting `removalPolicy: RETAIN` for production S3 | Bucket deleted on stack teardown, losing all assets            | Use `RETAIN` for production, `DESTROY` for staging         |
| Forgetting to invalidate CloudFront cache             | Users see stale content after deployment                       | Include cache invalidation in deployment script            |
| Not bootstrapping CDK in the target account           | `cdk deploy` fails with bootstrap errors                       | Run `cdk bootstrap` once per account/region                |
| Using `NODEJS_16_X` runtime                           | Node 16 is EOL, Lambda will deprecate it                       | Use `NODEJS_18_X` or `NODEJS_20_X`                         |

## Quick Reference

| Operation          | Command                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| Build app          | `npm run build`                                                              |
| Synth staging      | `cd cdk && npx cdk synth -c environment=staging`                             |
| Diff staging       | `cd cdk && npx cdk diff -c environment=staging`                              |
| Deploy staging     | `cd cdk && npx cdk deploy NextjsApp-staging -c environment=staging`          |
| Synth production   | `cd cdk && npx cdk synth -c environment=production`                          |
| Diff production    | `cd cdk && npx cdk diff -c environment=production`                           |
| Deploy production  | `cd cdk && npx cdk deploy NextjsApp-production -c environment=production`    |
| Rollback stack     | `aws cloudformation rollback-stack --stack-name NextjsApp-production`        |
| Invalidate cache   | `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"` |
| View Lambda logs   | `aws logs tail /aws/lambda/NextjsApp-production-SSRFunction --follow`        |
| Check stack status | `aws cloudformation describe-stacks --stack-name NextjsApp-production`       |

## Scripts

The following scripts are bundled in the `scripts/` directory:

- **`deploy.sh`** — Full deployment pipeline (build → synth → deploy) for a
  given environment
- **`rollback.sh`** — Automated rollback with environment and strategy selection
- **`smoke-test.sh`** — Post-deployment smoke tests against a target URL
- **`invalidate-cache.sh`** — CloudFront cache invalidation helper

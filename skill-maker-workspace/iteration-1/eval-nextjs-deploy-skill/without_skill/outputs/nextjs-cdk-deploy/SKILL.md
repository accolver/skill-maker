---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with staged rollouts (staging → production), environment-specific configs, manual approval gates, and rollback procedures.
---

# Next.js CDK Deploy Skill

Deploy Next.js applications to AWS using AWS CDK. Covers the full lifecycle:
build, synth, deploy to staging, approve, deploy to production, and rollback if
needed.

## Architecture Overview

```
Next.js App → Docker/Lambda → ALB/CloudFront → Route53
                  ↓
            CDK Stack (per environment)
            ├── Compute (ECS Fargate or Lambda@Edge)
            ├── CDN (CloudFront Distribution)
            ├── Storage (S3 for static assets)
            ├── DNS (Route53 records)
            └── Monitoring (CloudWatch alarms)
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+ and npm/pnpm
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Docker (if using containerized deployment)
- The Next.js project must have a valid `next.config.js`

## Workflow

### Phase 1: Pre-Deploy Validation

1. **Verify environment config** exists for the target stage
2. **Run the Next.js build** to catch errors early
3. **Run tests** if present
4. **Synthesize the CDK stack** to validate infrastructure

### Phase 2: Deploy to Staging

1. Deploy CDK stack with staging config
2. Run smoke tests against staging URL
3. Verify CloudWatch alarms are healthy
4. Output staging URL for manual verification

### Phase 3: Manual Approval Gate

1. Present staging URL and deployment summary
2. **Wait for explicit user approval** before proceeding
3. Log approval decision with timestamp

### Phase 4: Deploy to Production

1. Deploy CDK stack with production config
2. Run smoke tests against production URL
3. Verify DNS propagation
4. Confirm CloudWatch alarms are healthy

### Phase 5: Post-Deploy

1. Tag the deployment in git
2. Record deployment metadata
3. Notify team (if webhook configured)

---

## Environment Configuration

Each environment requires a config file at `cdk/config/<env>.ts` or
`cdk/config/<env>.json`.

### Config Structure

```typescript
// cdk/config/staging.ts
import { EnvironmentConfig } from "../types";

export const config: EnvironmentConfig = {
  env: {
    account: "123456789012",
    region: "us-east-1",
  },
  appName: "my-nextjs-app",
  stage: "staging",
  domain: "staging.example.com",
  certificateArn: "arn:aws:acm:us-east-1:123456789012:certificate/xxx",
  compute: {
    type: "fargate", // 'fargate' | 'lambda'
    cpu: 512, // Fargate CPU units
    memory: 1024, // Fargate memory (MB)
    desiredCount: 2, // Number of tasks
    minCount: 1,
    maxCount: 4,
  },
  cdn: {
    enabled: true,
    priceClass: "PriceClass_100",
    cacheTtl: 300, // seconds
  },
  monitoring: {
    alarmEmail: "team@example.com",
    errorRateThreshold: 5, // percent
    latencyThreshold: 3000, // ms
  },
  environment: {
    // Next.js runtime env vars
    NEXT_PUBLIC_API_URL: "https://api-staging.example.com",
    DATABASE_URL: "{{resolve:ssm:/myapp/staging/database-url}}",
  },
};
```

### Production Config Differences

Production configs typically differ in:

- Higher `desiredCount` and `maxCount`
- Lower `cacheTtl` or different cache policies
- Production domain and certificate
- Production environment variables
- Stricter monitoring thresholds

---

## CDK Stack Structure

### Recommended Stack Layout

```
cdk/
├── bin/
│   └── app.ts                 # CDK app entry point
├── lib/
│   ├── nextjs-stack.ts        # Main stack
│   ├── constructs/
│   │   ├── compute.ts         # ECS/Lambda construct
│   │   ├── cdn.ts             # CloudFront construct
│   │   ├── storage.ts         # S3 construct
│   │   ├── dns.ts             # Route53 construct
│   │   └── monitoring.ts      # CloudWatch construct
│   └── types.ts               # Shared types
├── config/
│   ├── staging.ts
│   └── production.ts
├── cdk.json
├── tsconfig.json
└── package.json
```

### CDK App Entry Point

```typescript
// cdk/bin/app.ts
import * as cdk from "aws-cdk-lib";
import { NextjsStack } from "../lib/nextjs-stack";
import { config as stagingConfig } from "../config/staging";
import { config as productionConfig } from "../config/production";

const app = new cdk.App();
const stage = app.node.tryGetContext("stage") || "staging";

const config = stage === "production" ? productionConfig : stagingConfig;

new NextjsStack(app, `${config.appName}-${stage}`, {
  env: config.env,
  config,
});
```

---

## Scripts Reference

All scripts are in the `scripts/` directory of this skill. Copy them to your
project or reference them directly.

| Script              | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `deploy.sh`         | Full deployment workflow (build → synth → deploy) |
| `rollback.sh`       | Rollback to a previous deployment                 |
| `smoke-test.sh`     | Run smoke tests against a deployed URL            |
| `synth-and-diff.sh` | Synthesize and diff CDK changes without deploying |

### Usage

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production (requires prior staging deploy)
./scripts/deploy.sh production

# Rollback production to previous version
./scripts/rollback.sh production

# Preview changes without deploying
./scripts/synth-and-diff.sh staging

# Run smoke tests
./scripts/smoke-test.sh https://staging.example.com
```

---

## Deployment Commands (Manual)

If not using the bundled scripts, here are the individual commands:

### Build Next.js

```bash
npm run build
# Verify .next/ directory was created
ls -la .next/
```

### Synthesize CDK

```bash
cd cdk
npx cdk synth -c stage=staging
```

### Diff (Preview Changes)

```bash
cd cdk
npx cdk diff -c stage=staging
```

### Deploy

```bash
cd cdk
npx cdk deploy -c stage=staging --require-approval never
```

> **Note:** `--require-approval never` is safe here because the approval gate is
> at the staging→production boundary, not at the CDK level.

### Destroy (Teardown)

```bash
cd cdk
npx cdk destroy -c stage=staging
```

---

## Rollback Procedures

### Strategy 1: CDK Rollback (Recommended)

Roll back by redeploying the last known-good commit:

```bash
# 1. Find the last successful deployment tag
git tag --list 'deploy-production-*' --sort=-creatordate | head -5

# 2. Check out that version
git checkout deploy-production-20240115-143022

# 3. Rebuild and redeploy
npm run build
cd cdk && npx cdk deploy -c stage=production --require-approval never
```

### Strategy 2: CloudFormation Rollback

If the CDK deploy itself failed mid-way:

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name my-nextjs-app-production \
  --query 'Stacks[0].StackStatus'

# If stuck in UPDATE_ROLLBACK_FAILED, continue rollback
aws cloudformation continue-update-rollback \
  --stack-name my-nextjs-app-production

# If stack is in a bad state, roll back manually
aws cloudformation rollback-stack \
  --stack-name my-nextjs-app-production
```

### Strategy 3: ECS Service Rollback (Fargate)

For quick rollback without full CDK redeploy:

```bash
# List recent task definitions
aws ecs list-task-definitions \
  --family-prefix my-nextjs-app-production \
  --sort DESC --max-items 5

# Update service to previous task definition
aws ecs update-service \
  --cluster my-nextjs-app-production \
  --service my-nextjs-app-production-service \
  --task-definition my-nextjs-app-production:PREVIOUS_REVISION \
  --force-new-deployment
```

### Strategy 4: CloudFront Rollback (Static Assets)

If the issue is with static assets:

```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id EXXXXXXXXX \
  --paths "/*"
```

### When to Use Each Strategy

| Scenario                  | Strategy                                   |
| ------------------------- | ------------------------------------------ |
| Bad application code      | Strategy 1 (CDK redeploy from good commit) |
| CDK deploy failed mid-way | Strategy 2 (CloudFormation rollback)       |
| Need instant rollback     | Strategy 3 (ECS task definition swap)      |
| Static asset issues       | Strategy 4 (CloudFront invalidation)       |

---

## Monitoring & Verification

### Post-Deploy Health Checks

```bash
# Check ECS service stability
aws ecs describe-services \
  --cluster my-nextjs-app-production \
  --services my-nextjs-app-production-service \
  --query 'services[0].{running: runningCount, desired: desiredCount, status: status}'

# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix my-nextjs-app-production \
  --state-value ALARM
```

### Key Metrics to Watch

- **5xx Error Rate**: Should be < 1% after deploy
- **P99 Latency**: Should not spike above threshold
- **Task Count**: Running count should match desired count
- **Memory/CPU Utilization**: Should be within normal range

---

## Troubleshooting

### Build Failures

| Error              | Fix                                          |
| ------------------ | -------------------------------------------- |
| `Module not found` | Run `npm install` before build               |
| `Out of memory`    | Set `NODE_OPTIONS=--max-old-space-size=4096` |
| `Type errors`      | Run `npx tsc --noEmit` to see all errors     |

### CDK Synth Failures

| Error                    | Fix                                       |
| ------------------------ | ----------------------------------------- |
| `Cannot find module`     | Run `npm install` in `cdk/` directory     |
| `Stack validation error` | Check config values match AWS constraints |
| `Context not found`      | Ensure `-c stage=<env>` is passed         |

### Deploy Failures

| Error                     | Fix                                            |
| ------------------------- | ---------------------------------------------- |
| `Resource already exists` | Import existing resource or rename             |
| `Rate exceeded`           | Wait and retry, or request limit increase      |
| `UPDATE_ROLLBACK_FAILED`  | Use `continue-update-rollback` command         |
| `Certificate not valid`   | Ensure ACM cert is in us-east-1 for CloudFront |

### Runtime Failures

| Error                          | Fix                                            |
| ------------------------------ | ---------------------------------------------- |
| `502 Bad Gateway`              | Check container health, verify port mapping    |
| `504 Gateway Timeout`          | Increase ALB/CloudFront timeout settings       |
| `Environment variable missing` | Check SSM parameter exists and IAM permissions |

---

## Checklist

Use this checklist for every deployment:

- [ ] Environment config file exists and is correct
- [ ] Next.js build succeeds locally
- [ ] CDK synth produces valid template
- [ ] CDK diff reviewed — no unexpected changes
- [ ] Staging deployed and smoke tests pass
- [ ] Manual approval obtained for production
- [ ] Production deployed and smoke tests pass
- [ ] CloudWatch alarms are not firing
- [ ] Deployment tagged in git
- [ ] Team notified of deployment

---
name: nextjs-cdk-deploy
description: Deploy Next.js applications to AWS using CDK with a staged pipeline (staging then production with manual approval gate), environment-specific configuration management, rollback procedures, and operational scripts. Use when deploying Next.js to AWS, setting up CDK infrastructure for Next.js, creating deployment pipelines with staging and production environments, configuring CloudFront and Lambda@Edge for Next.js SSR, or when the user mentions Next.js AWS deployment, CDK stacks, or staged rollouts with approval gates.
---

# Next.js CDK Deploy

## Overview

Deploy Next.js applications to AWS using CDK with a two-stage pipeline: staging
first, then production behind a manual approval gate. The skill produces CDK
stack code, environment configs, deployment scripts, and rollback procedures as
a cohesive system — not isolated snippets.

## When to use

- When deploying a Next.js application to AWS
- When setting up CDK infrastructure for Next.js (SSR, SSG, or ISR)
- When creating a staged deployment pipeline (staging → approval → production)
- When configuring environment-specific settings for Next.js on AWS
- When the user mentions CloudFront, Lambda@Edge, or S3 for Next.js hosting
- When implementing rollback procedures for Next.js deployments
- When the user says "deploy Next.js", "CDK pipeline", or "staged deployment"

**Do NOT use when:**

- Deploying to Vercel, Netlify, or other managed platforms (no CDK needed)
- Setting up a generic CDK pipeline without Next.js specifics
- Building the Next.js application itself (this skill handles deployment, not
  app development)
- Using Terraform or Pulumi instead of CDK

## Workflow

### 1. Assess the Next.js application

Before writing any CDK code, understand what you're deploying:

- **Rendering mode:** SSR (Server-Side Rendering), SSG (Static Site Generation),
  ISR (Incremental Static Regeneration), or hybrid. This determines the AWS
  architecture.
- **API routes:** Does the app have `/api/*` routes? These need Lambda
  functions.
- **Image optimization:** Does it use `next/image`? This needs a Lambda or
  CloudFront function for on-the-fly resizing.
- **Middleware:** Does it use Next.js middleware? This maps to CloudFront
  Functions or Lambda@Edge.
- **Environment variables:** What runtime env vars does the app need? Separate
  build-time (`NEXT_PUBLIC_*`) from server-side vars.

Output: A brief architecture summary stating the rendering mode, required AWS
services, and environment variable inventory.

### 2. Create environment configuration

Create environment-specific config files. Every deployment needs at minimum two
environments with distinct settings:

```typescript
// config/environments.ts
export interface EnvironmentConfig {
  envName: string;
  account: string;
  region: string;
  domainName: string;
  certificateArn: string;
  nextPublicVars: Record<string, string>;
  serverVars: Record<string, string>;
  scaling: {
    minCapacity: number;
    maxCapacity: number;
    targetUtilization: number;
  };
  alarmActions: string[]; // SNS topic ARNs
  requireApproval: boolean;
}

export const environments: Record<string, EnvironmentConfig> = {
  staging: {
    envName: "staging",
    account: process.env.CDK_STAGING_ACCOUNT!,
    region: "us-east-1",
    domainName: "staging.example.com",
    certificateArn: "arn:aws:acm:us-east-1:STAGING_ACCOUNT:certificate/xxx",
    nextPublicVars: {
      NEXT_PUBLIC_API_URL: "https://api-staging.example.com",
      NEXT_PUBLIC_ENV: "staging",
    },
    serverVars: {
      DATABASE_URL: "ssm:/staging/database-url",
      SESSION_SECRET: "ssm:/staging/session-secret",
    },
    scaling: {
      minCapacity: 1,
      maxCapacity: 5,
      targetUtilization: 70,
    },
    alarmActions: [],
    requireApproval: false,
  },
  production: {
    envName: "production",
    account: process.env.CDK_PRODUCTION_ACCOUNT!,
    region: "us-east-1",
    domainName: "www.example.com",
    certificateArn: "arn:aws:acm:us-east-1:PROD_ACCOUNT:certificate/yyy",
    nextPublicVars: {
      NEXT_PUBLIC_API_URL: "https://api.example.com",
      NEXT_PUBLIC_ENV: "production",
    },
    serverVars: {
      DATABASE_URL: "ssm:/production/database-url",
      SESSION_SECRET: "ssm:/production/session-secret",
    },
    scaling: {
      minCapacity: 2,
      maxCapacity: 20,
      targetUtilization: 60,
    },
    alarmActions: ["arn:aws:sns:us-east-1:PROD_ACCOUNT:ops-alerts"],
    requireApproval: true,
  },
};
```

**Critical rules for environment config:**

- Server-side secrets MUST reference SSM Parameter Store or Secrets Manager
  paths, never plaintext values
- `NEXT_PUBLIC_*` vars are baked into the build — you need separate builds per
  environment
- The `requireApproval` flag controls the manual gate between staging and
  production
- Account and region should come from environment variables or CDK context, not
  hardcoded

### 3. Write the CDK stack

The CDK stack architecture depends on the rendering mode identified in Step 1.
See [references/cdk-constructs.md](references/cdk-constructs.md) for detailed
construct patterns.

**Core architecture for SSR Next.js:**

| AWS Service         | Purpose                                    |
| ------------------- | ------------------------------------------ |
| S3 Bucket           | Static assets (`_next/static/`, `public/`) |
| CloudFront          | CDN with origin failover                   |
| Lambda (or Fargate) | SSR rendering for dynamic pages            |
| Lambda@Edge         | Next.js middleware (optional)              |
| API Gateway         | API routes (if using Lambda backend)       |
| Route 53            | DNS for custom domain                      |
| ACM                 | TLS certificate                            |
| SSM Parameter Store | Server-side environment variables          |

**Stack structure:**

```
NextjsCdkStack
├── StaticAssetsBucket (S3)
├── ServerFunction (Lambda or Fargate)
├── Distribution (CloudFront)
│   ├── S3 Origin (static assets)
│   ├── Lambda/ALB Origin (SSR)
│   └── Cache Policies
├── DNS Record (Route 53)
└── Alarms (CloudWatch)
```

Write the stack in `lib/nextjs-stack.ts`. Key implementation details:

- Use `BucketDeployment` to sync `out/_next/static` to S3
- Set `Cache-Control: public, max-age=31536000, immutable` on hashed static
  assets
- Set `Cache-Control: public, max-age=0, must-revalidate` on HTML pages
- Configure CloudFront cache behaviors: `/\_next/static/*` → S3 origin (long
  cache), `/*` → Lambda origin (short cache or no cache for SSR)
- Use `CloudFrontWebDistribution` or the newer `Distribution` construct
- Tag all resources with `environment`, `project`, and `managed-by: cdk`

### 4. Create the deployment pipeline

Build a two-stage pipeline with a manual approval gate:

```
Build → Deploy Staging → [Run Smoke Tests] → Manual Approval → Deploy Production
```

**Pipeline stages:**

1. **Source** — Pull from repository (CodeCommit, GitHub, etc.)
2. **Build** — `npm ci && npm run build` with environment-specific
   `NEXT_PUBLIC_*` vars injected
3. **Deploy Staging** — `cdk deploy --context env=staging`
4. **Smoke Tests** — Run health checks against staging URL
5. **Manual Approval** — SNS notification to approvers, blocks until approved
6. **Deploy Production** — `cdk deploy --context env=production`

The manual approval gate is the critical safety mechanism. It MUST:

- Send an SNS notification with the staging URL and changeset summary
- Block indefinitely until explicitly approved or rejected
- Include a link to the staging environment for manual verification
- Log who approved and when

See [references/pipeline-stages.md](references/pipeline-stages.md) for the full
CodePipeline CDK code.

### 5. Implement rollback procedures

Every deployment must have a clear rollback path. There are three rollback
strategies depending on what failed:

**Strategy 1: CloudFront rollback (fastest, < 5 minutes)**

Use when: The deployment succeeded but the new version has bugs.

```bash
# Point CloudFront back to previous Lambda version / S3 prefix
bun run scripts/rollback.ts --env production --strategy cloudfront
```

This updates the CloudFront distribution to point at the previous origin (Lambda
version alias or S3 versioned prefix). No CDK redeploy needed.

**Strategy 2: CDK rollback (5-15 minutes)**

Use when: The CDK stack itself has issues (bad config, missing resources).

```bash
# Redeploy the previous CDK stack version
bun run scripts/rollback.ts --env production --strategy cdk --version previous
```

This runs `cdk deploy` with the previous stack snapshot from version control.

**Strategy 3: Full rollback (15-30 minutes)**

Use when: Data or state corruption requires reverting everything.

```bash
# Full rollback including database and cache invalidation
bun run scripts/rollback.ts --env production --strategy full
```

This combines CDK rollback with CloudFront cache invalidation and any
application-level rollback steps (database migrations, feature flags).

**Rollback decision tree:**

```
Is the site completely down?
├── Yes → Strategy 1 (CloudFront) immediately, investigate after
└── No, but errors are elevated
    ├── Errors in application logic → Strategy 1 (CloudFront)
    ├── Errors in infrastructure → Strategy 2 (CDK rollback)
    └── Data corruption suspected → Strategy 3 (Full rollback)
```

### 6. Add operational alarms

Configure CloudWatch alarms that detect deployment problems early:

| Alarm                    | Metric                         | Threshold        | Action          |
| ------------------------ | ------------------------------ | ---------------- | --------------- |
| High 5xx rate            | CloudFront 5xx error rate      | > 1% for 5 min   | SNS → PagerDuty |
| High Lambda errors       | Lambda function error count    | > 5 in 5 min     | SNS → PagerDuty |
| High latency             | CloudFront origin latency P95  | > 3s for 5 min   | SNS → Slack     |
| Lambda throttling        | Lambda throttle count          | > 0 for 5 min    | SNS → Slack     |
| S3 4xx errors            | S3 4xx error rate              | > 5% for 10 min  | SNS → Slack     |
| Deployment canary failed | Synthetics canary success rate | < 100% for 5 min | SNS → PagerDuty |

**Post-deployment verification:** After every deployment, run the smoke test
script which checks:

- Homepage returns 200
- Key API routes return expected responses
- Static assets load correctly (check a hashed JS bundle URL)
- Response times are within acceptable range

```bash
bun run scripts/smoke-test.ts --url https://staging.example.com
```

## Checklist

- [ ] Next.js rendering mode identified (SSR/SSG/ISR/hybrid)
- [ ] Environment config created for staging and production
- [ ] Server-side secrets reference SSM/Secrets Manager, not plaintext
- [ ] Separate builds per environment for `NEXT_PUBLIC_*` vars
- [ ] CDK stack includes S3, CloudFront, Lambda/Fargate, Route 53
- [ ] Static assets have immutable cache headers; HTML has must-revalidate
- [ ] Pipeline has: build → staging → smoke test → approval → production
- [ ] Manual approval gate sends SNS notification with staging URL
- [ ] Rollback script supports cloudfront, cdk, and full strategies
- [ ] CloudWatch alarms configured for 5xx, errors, latency, throttling
- [ ] Smoke test script validates deployment health
- [ ] All resources tagged with environment, project, managed-by

## Example

**Input:** "Deploy our Next.js e-commerce app to AWS. It uses SSR for product
pages, has API routes for cart operations, and uses next/image. We need staging
and production environments with approval before prod deploys."

**Output files produced:**

| File                          | Contents                                       |
| ----------------------------- | ---------------------------------------------- |
| `config/environments.ts`      | Staging and production environment configs     |
| `lib/nextjs-stack.ts`         | CDK stack with S3, CloudFront, Lambda, Route53 |
| `lib/pipeline-stack.ts`       | CodePipeline with approval gate                |
| `scripts/deploy.ts`           | Deploy to a specific environment               |
| `scripts/rollback.ts`         | Rollback with strategy selection               |
| `scripts/smoke-test.ts`       | Post-deployment health verification            |
| `scripts/synth.ts`            | Synthesize CDK stack and diff                  |
| `scripts/invalidate-cache.ts` | Invalidate CloudFront distribution cache       |
| `buildspec.yml`               | CodeBuild spec for Next.js build               |
| `cdk.json`                    | CDK app configuration                          |

## Common mistakes

| Mistake                                      | Fix                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Using same build for staging and production  | `NEXT_PUBLIC_*` vars are baked at build time. Build separately per environment with different env vars. |
| Hardcoding secrets in CDK code or env config | Reference SSM Parameter Store paths or Secrets Manager ARNs. CDK resolves them at deploy time.          |
| No manual approval gate before production    | Always require explicit human approval. Automated staging → production promotes untested changes.       |
| Single S3 cache policy for all assets        | Hashed assets (`_next/static/*`) get immutable caching. HTML and data files get `must-revalidate`.      |
| No rollback plan documented                  | Every deployment needs a tested rollback procedure. "Just redeploy the old version" is not a plan.      |
| Deploying Lambda@Edge in non-us-east-1       | Lambda@Edge functions MUST be deployed in us-east-1 regardless of your primary region.                  |
| Not invalidating CloudFront after rollback   | CloudFront caches aggressively. After rollback, invalidate `/*` or stale content persists.              |
| Missing health checks after deployment       | Run smoke tests automatically after staging deploy. Don't rely on manual verification alone.            |
| Forgetting `standalone` output mode          | Next.js SSR on Lambda requires `output: 'standalone'` in `next.config.js` to minimize bundle size.      |
| No CloudWatch alarms on the deployment       | Without alarms, you discover failures from user reports. Add 5xx, latency, and error alarms.            |

## Quick reference

| Operation            | Command                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Synthesize stack     | `bun run scripts/synth.ts --env staging`                             |
| Deploy to staging    | `bun run scripts/deploy.ts --env staging`                            |
| Run smoke tests      | `bun run scripts/smoke-test.ts --url https://staging.example.com`    |
| Deploy to production | `bun run scripts/deploy.ts --env production`                         |
| Rollback (fast)      | `bun run scripts/rollback.ts --env production --strategy cloudfront` |
| Rollback (full)      | `bun run scripts/rollback.ts --env production --strategy full`       |
| Invalidate cache     | `bun run scripts/invalidate-cache.ts --distribution-id EXXXXX`       |
| Diff changes         | `bun run scripts/synth.ts --env production --diff`                   |

## Key principles

1. **Staging before production, always** — Never deploy directly to production.
   Every change goes through staging first with smoke tests. The manual approval
   gate exists because automated tests catch syntax errors, not business logic
   bugs. A human must verify staging before promoting.

2. **Environment parity with config isolation** — Staging and production should
   run identical infrastructure (same CDK stack) with different configuration.
   Environment differences should be limited to config values (domain, scaling,
   secrets), not architecture. If staging uses a different stack shape than
   production, you're not testing what you think you're testing.

3. **Rollback is a first-class operation** — Rollback procedures must be
   written, tested, and documented before the first deployment. A rollback you
   haven't tested is a rollback that won't work at 3 AM. The CloudFront strategy
   (pointing to previous origin) should resolve most issues in under 5 minutes.

4. **Secrets never in code** — Server-side environment variables must come from
   SSM Parameter Store or Secrets Manager. CDK code, environment configs, and
   buildspecs must reference paths, never values. `NEXT_PUBLIC_*` vars are
   acceptable in config because they're public by definition.

5. **Cache headers are deployment strategy** — Incorrect cache headers cause
   stale content after deployments and cache poisoning during rollbacks. Hashed
   assets are immutable forever. HTML and data routes must revalidate. Getting
   this wrong means users see broken pages after every deploy.

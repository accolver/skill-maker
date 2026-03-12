# CDK Stack Reference

## AWS Resources Created

### Per-Stage Resources

Each stage (staging, production) creates its own isolated set of resources:

| Resource                | Type                                 | Purpose                                |
| ----------------------- | ------------------------------------ | -------------------------------------- |
| S3 Bucket               | `aws-s3.Bucket`                      | Hosts static assets (`_next/static/*`) |
| Lambda Function         | `aws-lambda.Function`                | Runs Next.js standalone server (SSR)   |
| Lambda Function URL     | `aws-lambda.FunctionUrl`             | HTTP endpoint for the Lambda           |
| CloudFront Distribution | `aws-cloudfront.Distribution`        | CDN with S3 + Lambda origins           |
| ACM Certificate         | `aws-certificatemanager.Certificate` | TLS certificate for custom domain      |
| Route53 A Record        | `aws-route53.ARecord`                | DNS pointing to CloudFront             |
| S3 Bucket Deployment    | `aws-s3-deployment.BucketDeployment` | Uploads static assets to S3            |
| IAM Role (Lambda)       | `aws-iam.Role`                       | Execution role for Lambda function     |
| CloudFront OAC          | `aws-cloudfront.OriginAccessControl` | Secure S3 access from CloudFront       |

### Shared Resources (Optional)

| Resource             | Type                       | Purpose                               |
| -------------------- | -------------------------- | ------------------------------------- |
| Route53 Hosted Zone  | `aws-route53.HostedZone`   | DNS zone (usually pre-existing)       |
| WAF Web ACL          | `aws-wafv2.WebACL`         | Web application firewall (production) |
| CloudWatch Dashboard | `aws-cloudwatch.Dashboard` | Monitoring dashboard                  |

## CDK Stack Hierarchy

```
App
├── NextjsStaging (Stack)
│   ├── NextjsSite (Construct)
│   │   ├── StaticAssets (S3 Bucket)
│   │   ├── ServerFunction (Lambda)
│   │   ├── CDN (CloudFront Distribution)
│   │   └── DeployStatic (BucketDeployment)
│   └── DNS (Route53 Records)
│
└── NextjsProduction (Stack)
    ├── NextjsSite (Construct)
    │   ├── StaticAssets (S3 Bucket)
    │   ├── ServerFunction (Lambda)
    │   ├── CDN (CloudFront Distribution)
    │   └── DeployStatic (BucketDeployment)
    ├── DNS (Route53 Records)
    └── Monitoring (CloudWatch)
```

## Lambda Configuration

### Recommended Settings

| Setting                 | Staging          | Production       |
| ----------------------- | ---------------- | ---------------- |
| Memory                  | 1024 MB          | 1024-2048 MB     |
| Timeout                 | 30s              | 30s              |
| Runtime                 | Node.js 20.x     | Node.js 20.x     |
| Architecture            | arm64 (Graviton) | arm64 (Graviton) |
| Provisioned Concurrency | 0                | 5-10             |
| Reserved Concurrency    | None             | 100-500          |

### Environment Variables

Set these on the Lambda function:

| Variable       | Description                           | Example                                |
| -------------- | ------------------------------------- | -------------------------------------- |
| `NODE_ENV`     | Always "production" for deployed apps | `production`                           |
| `STAGE`        | Current deployment stage              | `staging` or `production`              |
| `DATABASE_URL` | Database connection string            | `postgresql://...`                     |
| `REDIS_URL`    | Redis connection (if used)            | `redis://...`                          |
| `LOG_LEVEL`    | Logging verbosity                     | `debug` (staging), `warn` (production) |

**Note:** `NEXT_PUBLIC_*` variables are baked into the JS bundle at build time.
They are NOT read from Lambda environment variables at runtime.

## CloudFront Behaviors

| Path Pattern     | Origin | Cache Policy                | Description             |
| ---------------- | ------ | --------------------------- | ----------------------- |
| `_next/static/*` | S3     | `CachingOptimized` (1 year) | Immutable static assets |
| `_next/image*`   | Lambda | Custom (1 day)              | Image optimization      |
| `_next/data/*`   | Lambda | Custom (varies)             | ISR/SSG data            |
| `api/*`          | Lambda | `CachingDisabled`           | API routes              |
| `*` (default)    | Lambda | `CachingDisabled`           | SSR pages               |

## Cost Estimation

### Staging (Low Traffic)

| Resource                    | Estimated Monthly Cost |
| --------------------------- | ---------------------- |
| Lambda (100K invocations)   | ~$0.20                 |
| S3 (1 GB storage)           | ~$0.02                 |
| CloudFront (10 GB transfer) | ~$0.85                 |
| Route53 (1 hosted zone)     | $0.50                  |
| **Total**                   | **~$1.57**             |

### Production (Moderate Traffic)

| Resource                              | Estimated Monthly Cost |
| ------------------------------------- | ---------------------- |
| Lambda (10M invocations, provisioned) | ~$50                   |
| S3 (5 GB storage)                     | ~$0.12                 |
| CloudFront (500 GB transfer)          | ~$42                   |
| Route53 (1 hosted zone + queries)     | ~$1.00                 |
| ACM Certificate                       | Free                   |
| **Total**                             | **~$93**               |

## Useful CDK Commands

```bash
# List all stacks
npx cdk list

# Synth a specific stack
npx cdk synth NextjsStaging

# Deploy with verbose output
npx cdk deploy --context stage=staging --verbose

# Destroy a stack (staging only!)
npx cdk destroy --context stage=staging

# Bootstrap CDK in a new account/region
npx cdk bootstrap aws://ACCOUNT_ID/REGION

# Show CloudFormation template
npx cdk synth --context stage=staging > template.yaml
```

## Troubleshooting

### Lambda Cold Starts

**Symptom:** First request after idle period takes 5-10 seconds.

**Fix:** Enable provisioned concurrency for production:

```typescript
const alias = serverFunction.addAlias("live");
const scaling = alias.addAutoScaling({ minCapacity: 5, maxCapacity: 50 });
scaling.scaleOnUtilization({ utilizationTarget: 0.7 });
```

### S3 Access Denied

**Symptom:** Static assets return 403 from CloudFront.

**Fix:** Ensure CloudFront OAC is configured correctly:

```typescript
// Use the new OAC pattern (not OAI)
origin: origins.S3BucketOrigin.withOriginAccessControl(staticBucket);
```

### CloudFront Cache Issues

**Symptom:** Old content served after deployment.

**Fix:** BucketDeployment should include distribution paths for invalidation:

```typescript
new s3deploy.BucketDeployment(this, "Deploy", {
  // ...
  distribution: this.distribution,
  distributionPaths: ["/_next/static/*"],
});
```

### Lambda Package Too Large

**Symptom:** CDK deploy fails with "Unzipped size must be smaller than X bytes."

**Fix:**

1. Ensure `output: "standalone"` is set (reduces bundle size significantly)
2. Add unused dependencies to `serverExternalPackages` in next.config
3. Use Lambda layers for large dependencies

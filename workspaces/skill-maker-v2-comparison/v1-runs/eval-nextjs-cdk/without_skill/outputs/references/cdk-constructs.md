# CDK Constructs Reference for Next.js Deployment

## Core AWS CDK Constructs Used

### S3 Bucket (Static Assets)

```typescript
import * as s3 from "aws-cdk-lib/aws-s3";

const bucket = new s3.Bucket(this, "SiteBucket", {
  bucketName: "my-nextjs-assets",
  removalPolicy: cdk.RemovalPolicy.RETAIN, // RETAIN for prod, DESTROY for staging
  autoDeleteObjects: false, // true only for non-production
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true, // Enable versioning for rollback capability
});
```

**Key properties:**

- `removalPolicy`: Use `RETAIN` for production to prevent accidental data loss
- `blockPublicAccess`: Always `BLOCK_ALL` — CloudFront uses OAI/OAC for access
- `versioned`: Enable for production to support S3-level rollback

### CloudFront Distribution

```typescript
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

const distribution = new cloudfront.Distribution(this, "Distribution", {
  defaultBehavior: {
    origin: new origins.FunctionUrlOrigin(ssrFunctionUrl),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // SSR pages
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    originRequestPolicy:
      cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
  },
  additionalBehaviors: {
    "_next/static/*": {
      origin: new origins.S3Origin(bucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED, // Long cache for hashed assets
    },
    "_next/image*": {
      origin: new origins.FunctionUrlOrigin(ssrFunctionUrl),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new cloudfront.CachePolicy(this, "ImageCachePolicy", {
        defaultTtl: cdk.Duration.days(30),
        maxTtl: cdk.Duration.days(365),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.allowList(
          "w",
          "q",
          "url",
        ),
      }),
    },
  },
  domainNames: [config.domainName],
  certificate: acm.Certificate.fromCertificateArn(
    this,
    "Cert",
    config.certificateArn,
  ),
  httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US/EU only for cost savings
});
```

**Cache policy guidance:**

- SSR routes: `CACHING_DISABLED` (dynamic content)
- `_next/static/*`: `CACHING_OPTIMIZED` (content-hashed, safe to cache forever)
- `_next/image*`: Custom policy with query string allowlist
- API routes: `CACHING_DISABLED` or short TTL

### Lambda Function (SSR)

```typescript
import * as lambda from "aws-cdk-lib/aws-lambda";

const ssrFunction = new lambda.Function(this, "SSRFunction", {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset(".next/standalone"),
  memorySize: 1024, // Adjust based on app complexity
  timeout: cdk.Duration.seconds(30),
  environment: {
    NODE_ENV: "production",
    ...config.envVars,
  },
  currentVersionOptions: {
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    description: `Deployed at ${new Date().toISOString()}`,
  },
});

// Create alias for traffic shifting
const alias = new lambda.Alias(this, "SSRAlias", {
  aliasName: "live",
  version: ssrFunction.currentVersion,
});

// Function URL for CloudFront origin
const functionUrl = ssrFunction.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ["*"],
    allowedMethods: [lambda.HttpMethod.ALL],
  },
});
```

**Memory sizing guide:**

- Simple pages: 512 MB
- Medium complexity: 1024 MB
- Heavy SSR with data fetching: 2048 MB
- Image-heavy with ISR: 2048-3072 MB

### S3 Bucket Deployment

```typescript
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

new s3deploy.BucketDeployment(this, "DeployStaticAssets", {
  sources: [s3deploy.Source.asset(".next/static")],
  destinationBucket: bucket,
  destinationKeyPrefix: "_next/static",
  distribution,
  distributionPaths: ["/_next/static/*"],
  cacheControl: [
    s3deploy.CacheControl.maxAge(cdk.Duration.days(365)),
    s3deploy.CacheControl.setPublic(),
    s3deploy.CacheControl.immutable(),
  ],
  prune: false, // Don't delete old versions immediately
});
```

## CDK Context Parameters

Pass environment-specific values via CDK context:

```json
// cdk.json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "context": {
    "staging": {
      "account": "111111111111",
      "region": "us-east-1",
      "domain": "staging.example.com"
    },
    "production": {
      "account": "222222222222",
      "region": "us-east-1",
      "domain": "example.com"
    }
  }
}
```

## Stack Outputs

Always export key values for use in scripts:

```typescript
new cdk.CfnOutput(this, "DistributionId", {
  value: distribution.distributionId,
  exportName: `${config.environment}-distribution-id`,
});

new cdk.CfnOutput(this, "DistributionDomainName", {
  value: distribution.distributionDomainName,
  exportName: `${config.environment}-distribution-domain`,
});

new cdk.CfnOutput(this, "BucketName", {
  value: bucket.bucketName,
  exportName: `${config.environment}-bucket-name`,
});

new cdk.CfnOutput(this, "FunctionName", {
  value: ssrFunction.functionName,
  exportName: `${config.environment}-function-name`,
});
```

## IAM Permissions

Minimum permissions needed for deployment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "cloudfront:*",
        "lambda:*",
        "iam:*",
        "acm:DescribeCertificate",
        "acm:ListCertificates",
        "logs:*",
        "ssm:GetParameter"
      ],
      "Resource": "*"
    }
  ]
}
```

> **Note:** This is a broad policy for development. For production, scope
> resources to specific ARNs and use least-privilege principles.

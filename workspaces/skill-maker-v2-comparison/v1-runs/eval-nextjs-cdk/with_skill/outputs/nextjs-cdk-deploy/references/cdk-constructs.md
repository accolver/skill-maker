# CDK Constructs Reference for Next.js Deployments

Quick reference for the AWS CDK constructs used in Next.js deployments.

## Core Constructs

### S3 Bucket (Static Assets)

Hosts the `_next/static/` directory and `public/` files.

```typescript
import * as s3 from "aws-cdk-lib/aws-s3";

const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
  bucketName: `${props.appName}-${props.environment}-assets`,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true,
});
```

**Key settings:**

- `blockPublicAccess: BLOCK_ALL` — CloudFront uses OAI/OAC, not public access
- `versioned: true` — enables rollback of static assets
- `removalPolicy: RETAIN` — prevents accidental deletion

### CloudFront Distribution

CDN layer that routes requests to S3 (static) or Lambda (SSR).

```typescript
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

const distribution = new cloudfront.Distribution(this, "Distribution", {
  defaultBehavior: {
    origin: new origins.HttpOrigin(lambdaUrl.url.replace("https://", "")),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
    originRequestPolicy:
      cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
  },
  additionalBehaviors: {
    "_next/static/*": {
      origin: new origins.S3Origin(assetsBucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    },
    "public/*": {
      origin: new origins.S3Origin(assetsBucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    },
  },
  domainNames: [props.domainName],
  certificate: props.certificate,
  httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
});
```

**Key settings:**

- Default behavior → Lambda (SSR, no caching)
- `_next/static/*` → S3 (immutable, aggressive caching)
- `public/*` → S3 (static files)
- Certificate must be in `us-east-1`

### Lambda Function (SSR Handler)

Runs the Next.js standalone server.

```typescript
import * as lambda from "aws-cdk-lib/aws-lambda";

const ssrFunction = new lambda.Function(this, "SSRFunction", {
  functionName: `${props.appName}-${props.environment}-ssr`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset(props.standalonePath),
  memorySize: props.config.lambdaMemory,
  timeout: cdk.Duration.seconds(props.config.lambdaTimeout),
  environment: {
    NODE_ENV: "production",
    ...props.config.runtimeEnvVars,
  },
  currentVersionOptions: {
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  },
});

// Publish version for rollback support
const version = ssrFunction.currentVersion;

// Create alias for traffic routing
const alias = new lambda.Alias(this, "SSRAlias", {
  aliasName: "live",
  version,
});
```

**Key settings:**

- `currentVersionOptions.removalPolicy: RETAIN` — keeps old versions for
  rollback
- Alias `live` points to current version — rollback changes the alias pointer
- `memorySize` should be at least 512MB for Next.js SSR (1024MB recommended for
  production)
- `timeout` of 10 seconds covers most SSR pages

### Lambda Function URL

Simpler alternative to API Gateway for Lambda invocation.

```typescript
const functionUrl = ssrFunction.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
});
```

**Note:** `RESPONSE_STREAM` enables streaming SSR responses, which improves Time
to First Byte (TTFB) for large pages.

### Lambda@Edge (Middleware)

For Next.js middleware (auth redirects, rewrites, etc.).

```typescript
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { EdgeFunction } from "aws-cdk-lib/aws-cloudfront/lib/experimental";

// EdgeFunction automatically creates the function in us-east-1
const middlewareFunction = new EdgeFunction(this, "MiddlewareFunction", {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: "middleware.handler",
  code: lambda.Code.fromAsset(props.middlewarePath),
  stackId: `${props.appName}-edge-${props.environment}`,
});
```

**Critical:** Lambda@Edge functions must be in `us-east-1`. CDK's `EdgeFunction`
construct handles cross-region deployment automatically.

### ACM Certificate

SSL certificate for the custom domain.

```typescript
import * as acm from "aws-cdk-lib/aws-certificatemanager";

// Certificate MUST be in us-east-1 for CloudFront
const certificate = new acm.Certificate(this, "Certificate", {
  domainName: props.domainName,
  validation: acm.CertificateValidation.fromDns(props.hostedZone),
});
```

**Critical:** CloudFront requires certificates in `us-east-1`. If your stack is
in another region, use a cross-region reference or create a separate stack in
`us-east-1` for the certificate.

### Route53 DNS Record

Points the domain to CloudFront.

```typescript
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

new route53.ARecord(this, "AliasRecord", {
  zone: props.hostedZone,
  recordName: props.domainName,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
```

## Construct Dependency Graph

```
Route53 Record
    └── CloudFront Distribution
            ├── S3 Bucket (static assets)
            │     └── BucketDeployment (upload _next/static/ and public/)
            ├── Lambda Function (SSR)
            │     ├── Lambda Alias ("live")
            │     └── Lambda Function URL
            ├── Lambda@Edge (middleware, optional)
            └── ACM Certificate (us-east-1)
```

## Environment-Specific Overrides

| Setting                | Staging         | Production      |
| ---------------------- | --------------- | --------------- |
| Lambda memory          | 512 MB          | 1024 MB         |
| Lambda timeout         | 10s             | 10s             |
| CloudFront price class | PRICE_CLASS_100 | PRICE_CLASS_ALL |
| WAF                    | Disabled        | Enabled         |
| Log retention          | 7 days          | 90 days         |
| S3 versioning          | Enabled         | Enabled         |
| Removal policy         | DESTROY         | RETAIN          |

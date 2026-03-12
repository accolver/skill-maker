# CDK Construct Patterns for Next.js

Reference for AWS CDK constructs used in Next.js deployments. Load this file
when implementing the CDK stack.

## Table of Contents

1. [S3 Static Assets Bucket](#s3-static-assets-bucket)
2. [CloudFront Distribution](#cloudfront-distribution)
3. [Lambda Function for SSR](#lambda-function-for-ssr)
4. [API Gateway for API Routes](#api-gateway-for-api-routes)
5. [Route 53 DNS](#route-53-dns)
6. [CloudWatch Alarms](#cloudwatch-alarms)
7. [Full Stack Example](#full-stack-example)

---

## S3 Static Assets Bucket

```typescript
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

// Static assets bucket
const assetsBucket = new s3.Bucket(this, "StaticAssets", {
  bucketName: `${config.envName}-nextjs-assets`,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  versioned: true, // Enables rollback to previous asset versions
});

// Deploy hashed static assets with immutable caching
new s3deploy.BucketDeployment(this, "DeployStaticAssets", {
  sources: [s3deploy.Source.asset("./.next/static")],
  destinationBucket: assetsBucket,
  destinationKeyPrefix: "_next/static",
  cacheControl: [
    s3deploy.CacheControl.fromString(
      "public, max-age=31536000, immutable",
    ),
  ],
  prune: false, // Keep old assets for in-flight requests
});

// Deploy public/ assets with short cache
new s3deploy.BucketDeployment(this, "DeployPublicAssets", {
  sources: [s3deploy.Source.asset("./public")],
  destinationBucket: assetsBucket,
  cacheControl: [
    s3deploy.CacheControl.fromString(
      "public, max-age=3600, must-revalidate",
    ),
  ],
});
```

**Key decisions:**

- `versioned: true` enables S3 object versioning for rollback
- `prune: false` keeps old hashed assets so in-flight requests don't break
- Separate deployments for `_next/static` (immutable) and `public/` (short
  cache)
- `BLOCK_ALL` public access — CloudFront uses OAI/OAC to access the bucket

---

## CloudFront Distribution

```typescript
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

// Import existing certificate
const certificate = acm.Certificate.fromCertificateArn(
  this,
  "Certificate",
  config.certificateArn,
);

// Origin Access Identity for S3
const oai = new cloudfront.OriginAccessIdentity(this, "OAI");
assetsBucket.grantRead(oai);

// S3 origin for static assets
const s3Origin = new origins.S3Origin(assetsBucket, {
  originAccessIdentity: oai,
});

// Lambda/ALB origin for SSR
const ssrOrigin = new origins.HttpOrigin(
  ssrFunctionUrl.url.replace("https://", "").replace("/", ""),
  {
    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
  },
);

// Cache policies
const staticCachePolicy = new cloudfront.CachePolicy(
  this,
  "StaticCachePolicy",
  {
    cachePolicyName: `${config.envName}-static-cache`,
    defaultTtl: cdk.Duration.days(365),
    maxTtl: cdk.Duration.days(365),
    minTtl: cdk.Duration.days(365),
    enableAcceptEncodingGzip: true,
    enableAcceptEncodingBrotli: true,
  },
);

const ssrCachePolicy = new cloudfront.CachePolicy(this, "SSRCachePolicy", {
  cachePolicyName: `${config.envName}-ssr-cache`,
  defaultTtl: cdk.Duration.seconds(0),
  maxTtl: cdk.Duration.days(1),
  minTtl: cdk.Duration.seconds(0),
  enableAcceptEncodingGzip: true,
  enableAcceptEncodingBrotli: true,
  headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
    "Accept",
    "Accept-Language",
    "RSC",
    "Next-Router-State-Tree",
    "Next-Router-Prefetch",
  ),
  cookieBehavior: cloudfront.CacheCookieBehavior.none(),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
});

// Distribution
const distribution = new cloudfront.Distribution(this, "Distribution", {
  domainNames: [config.domainName],
  certificate,
  defaultBehavior: {
    origin: ssrOrigin,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: ssrCachePolicy,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    originRequestPolicy:
      cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
  },
  additionalBehaviors: {
    "_next/static/*": {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: staticCachePolicy,
    },
    "favicon.ico": {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: staticCachePolicy,
    },
    "robots.txt": {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: new cloudfront.CachePolicy(this, "ShortCachePolicy", {
        defaultTtl: cdk.Duration.hours(1),
      }),
    },
  },
  errorResponses: [
    {
      httpStatus: 404,
      responseHttpStatus: 404,
      responsePagePath: "/404",
      ttl: cdk.Duration.minutes(5),
    },
  ],
  priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
});
```

**Key decisions:**

- SSR cache policy forwards Next.js-specific headers (`RSC`,
  `Next-Router-State-Tree`, `Next-Router-Prefetch`) for App Router support
- Static assets get 365-day cache with immutable semantics
- SSR default TTL is 0 — the Lambda controls caching via response headers
- `ALL_VIEWER_EXCEPT_HOST_HEADER` forwards all headers except Host to the Lambda
  origin
- Error responses route to Next.js custom error pages

---

## Lambda Function for SSR

```typescript
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";

// Resolve server-side secrets from SSM
const databaseUrl = ssm.StringParameter.valueForStringParameter(
  this,
  config.serverVars.DATABASE_URL.replace("ssm:", ""),
);

const sessionSecret = ssm.StringParameter.valueForStringParameter(
  this,
  config.serverVars.SESSION_SECRET.replace("ssm:", ""),
);

// SSR Lambda function
const ssrFunction = new lambda.Function(this, "SSRFunction", {
  functionName: `${config.envName}-nextjs-ssr`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset("./.next/standalone"),
  memorySize: 1024,
  timeout: cdk.Duration.seconds(30),
  environment: {
    NODE_ENV: "production",
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: sessionSecret,
    ...config.nextPublicVars, // Also available server-side
  },
  currentVersionOptions: {
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    description: `Deployed at ${new Date().toISOString()}`,
  },
  tracing: lambda.Tracing.ACTIVE,
});

// Create a version alias for rollback support
const liveAlias = new lambda.Alias(this, "LiveAlias", {
  aliasName: "live",
  version: ssrFunction.currentVersion,
});

// Auto-scaling
const scalableTarget = liveAlias.addAutoScaling({
  minCapacity: config.scaling.minCapacity,
  maxCapacity: config.scaling.maxCapacity,
});

scalableTarget.scaleOnUtilization({
  utilizationTarget: config.scaling.targetUtilization / 100,
});

// Function URL for CloudFront origin
const functionUrl = liveAlias.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
});
```

**Key decisions:**

- Uses `.next/standalone` output (requires `output: 'standalone'` in
  next.config.js)
- `currentVersionOptions` with RETAIN enables rollback to previous versions
- Lambda alias `live` is what CloudFront points to — rollback updates the alias
- Auto-scaling based on environment config
- X-Ray tracing enabled for debugging

---

## API Gateway for API Routes

If the Next.js app has API routes that need separate scaling or configuration:

```typescript
import * as apigateway from "aws-cdk-lib/aws-apigateway";

// Only needed if API routes require separate handling
const api = new apigateway.RestApi(this, "ApiGateway", {
  restApiName: `${config.envName}-nextjs-api`,
  deployOptions: {
    stageName: config.envName,
    throttlingRateLimit: 1000,
    throttlingBurstLimit: 500,
  },
});

const apiIntegration = new apigateway.LambdaIntegration(ssrFunction);
api.root.addProxy({
  defaultIntegration: apiIntegration,
  anyMethod: true,
});
```

**Note:** For most Next.js apps, API routes are handled by the same Lambda
function as SSR. A separate API Gateway is only needed if you require different
throttling, authentication, or scaling for API routes.

---

## Route 53 DNS

```typescript
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

// Import existing hosted zone
const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
  domainName: "example.com",
});

// A record pointing to CloudFront
new route53.ARecord(this, "AliasRecord", {
  zone: hostedZone,
  recordName: config.domainName,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});

// AAAA record for IPv6
new route53.AaaaRecord(this, "AaaaRecord", {
  zone: hostedZone,
  recordName: config.domainName,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
```

---

## CloudWatch Alarms

```typescript
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";

// SNS topic for alerts
const alertTopic = config.alarmActions.length > 0
  ? sns.Topic.fromTopicArn(this, "AlertTopic", config.alarmActions[0])
  : new sns.Topic(this, "AlertTopic", {
    topicName: `${config.envName}-nextjs-alerts`,
  });

// 5xx error rate alarm
new cloudwatch.Alarm(this, "High5xxRate", {
  alarmName: `${config.envName}-nextjs-high-5xx-rate`,
  metric: distribution.metricTotalErrorRate({
    period: cdk.Duration.minutes(5),
    statistic: "Average",
  }),
  threshold: 1, // 1% error rate
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  actionsEnabled: true,
}).addAlarmAction(new actions.SnsAction(alertTopic));

// Lambda error alarm
new cloudwatch.Alarm(this, "LambdaErrors", {
  alarmName: `${config.envName}-nextjs-lambda-errors`,
  metric: ssrFunction.metricErrors({
    period: cdk.Duration.minutes(5),
    statistic: "Sum",
  }),
  threshold: 5,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
}).addAlarmAction(new actions.SnsAction(alertTopic));

// High latency alarm
new cloudwatch.Alarm(this, "HighLatency", {
  alarmName: `${config.envName}-nextjs-high-latency`,
  metric: distribution.metric("OriginLatency", {
    period: cdk.Duration.minutes(5),
    statistic: "p95",
  }),
  threshold: 3000, // 3 seconds
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
}).addAlarmAction(new actions.SnsAction(alertTopic));

// Lambda throttling alarm
new cloudwatch.Alarm(this, "LambdaThrottles", {
  alarmName: `${config.envName}-nextjs-lambda-throttles`,
  metric: ssrFunction.metricThrottles({
    period: cdk.Duration.minutes(5),
    statistic: "Sum",
  }),
  threshold: 0,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
}).addAlarmAction(new actions.SnsAction(alertTopic));
```

---

## Full Stack Example

See the complete stack assembly in the SKILL.md workflow section. The constructs
above are composed in this order:

1. S3 bucket for static assets
2. Lambda function for SSR (with alias for rollback)
3. CloudFront distribution (S3 + Lambda origins)
4. Route 53 DNS records
5. CloudWatch alarms
6. Resource tagging

```typescript
// Tag all resources
cdk.Tags.of(this).add("environment", config.envName);
cdk.Tags.of(this).add("project", "nextjs-app");
cdk.Tags.of(this).add("managed-by", "cdk");
```

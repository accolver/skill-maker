# CDK Stack Patterns for Next.js

Reference patterns for common CDK constructs used in Next.js deployments.

## Table of Contents

1. [S3 + CloudFront Static Hosting](#s3--cloudfront-static-hosting)
2. [Lambda@Edge SSR](#lambdaedge-ssr)
3. [Environment Config Pattern](#environment-config-pattern)
4. [WAF Integration](#waf-integration)
5. [Custom Domain + ACM](#custom-domain--acm)

---

## S3 + CloudFront Static Hosting

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

const bucket = new s3.Bucket(this, "StaticAssets", {
  bucketName: `nextjs-assets-${props.environment}`,
  removalPolicy: props.environment === "production"
    ? cdk.RemovalPolicy.RETAIN
    : cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: props.environment !== "production",
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

const distribution = new cloudfront.Distribution(this, "CDN", {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
  },
  additionalBehaviors: {
    "/_next/static/*": {
      origin: new origins.S3Origin(bucket),
      cachePolicy: new cloudfront.CachePolicy(this, "StaticCache", {
        maxTtl: cdk.Duration.days(365),
        defaultTtl: cdk.Duration.days(30),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "Accept-Encoding",
        ),
      }),
    },
  },
});
```

## Lambda@Edge SSR

```typescript
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

const ssrFunction = new cloudfront.experimental.EdgeFunction(
  this,
  "SSRHandler",
  {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset("../.next/standalone"),
    memorySize: 512,
    timeout: cdk.Duration.seconds(10),
    description: `Next.js SSR - ${props.environment}`,
  },
);

// Add SSR as default behavior
distribution.addBehavior("/*", new origins.S3Origin(bucket), {
  edgeLambdas: [
    {
      functionVersion: ssrFunction.currentVersion,
      eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
    },
  ],
  cachePolicy: new cloudfront.CachePolicy(this, "SSRCache", {
    maxTtl: cdk.Duration.seconds(0),
    defaultTtl: cdk.Duration.seconds(0),
    headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
      "Accept",
      "Accept-Language",
      "Host",
    ),
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    cookieBehavior: cloudfront.CacheCookieBehavior.all(),
  }),
});
```

## Environment Config Pattern

```typescript
// cdk/config/types.ts
export interface EnvironmentConfig {
  env: { account: string; region: string };
  domainName: string;
  certificateArn: string;
  nextPublicApiUrl: string;
  logRetentionDays: number;
  enableWaf: boolean;
  minCapacity: number;
  maxCapacity: number;
}

// cdk/config/index.ts
import type { EnvironmentConfig } from "./types";

const configs: Record<string, EnvironmentConfig> = {
  staging: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT!,
      region: "us-east-1",
    },
    domainName: "staging.example.com",
    certificateArn: process.env.STAGING_CERT_ARN!,
    nextPublicApiUrl: "https://api-staging.example.com",
    logRetentionDays: 7,
    enableWaf: false,
    minCapacity: 1,
    maxCapacity: 5,
  },
  production: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT!,
      region: "us-east-1",
    },
    domainName: "example.com",
    certificateArn: process.env.PRODUCTION_CERT_ARN!,
    nextPublicApiUrl: "https://api.example.com",
    logRetentionDays: 90,
    enableWaf: true,
    minCapacity: 3,
    maxCapacity: 50,
  },
};

export function getConfig(envName: string): EnvironmentConfig {
  const config = configs[envName];
  if (!config) {
    throw new Error(
      `Unknown environment: ${envName}. Valid: ${
        Object.keys(configs).join(", ")
      }`,
    );
  }
  return config;
}
```

## WAF Integration

```typescript
import * as wafv2 from "aws-cdk-lib/aws-wafv2";

if (props.enableWaf) {
  const webAcl = new wafv2.CfnWebACL(this, "WebACL", {
    scope: "CLOUDFRONT",
    defaultAction: { allow: {} },
    rules: [
      {
        name: "RateLimit",
        priority: 1,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            limit: 2000,
            aggregateKeyType: "IP",
          },
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "RateLimitRule",
        },
      },
      {
        name: "AWSManagedRulesCommonRuleSet",
        priority: 2,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesCommonRuleSet",
          },
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: "CommonRuleSet",
        },
      },
    ],
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: "NextJsWebACL",
    },
  });

  // Associate with CloudFront distribution
  distribution.node.addDependency(webAcl);
}
```

## Custom Domain + ACM

```typescript
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

// Import existing certificate (must be in us-east-1 for CloudFront)
const certificate = acm.Certificate.fromCertificateArn(
  this,
  "Certificate",
  props.certificateArn,
);

// Add to CloudFront distribution
const distribution = new cloudfront.Distribution(this, "CDN", {
  domainNames: [props.domainName],
  certificate,
  // ... other config
});

// Route53 alias record
const zone = route53.HostedZone.fromLookup(this, "Zone", {
  domainName: props.domainName.split(".").slice(-2).join("."),
});

new route53.ARecord(this, "AliasRecord", {
  zone,
  recordName: props.domainName,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
```

# CDK Stack Reference Architecture for Next.js

## Stack Structure

A typical Next.js CDK deployment uses these AWS resources:

```
NextjsStack
├── S3 Bucket (static assets)
├── Lambda Function (Next.js server - standalone mode)
├── API Gateway or Function URL (HTTP endpoint)
├── CloudFront Distribution (CDN)
│   ├── Origin: Lambda Function URL (dynamic routes)
│   └── Origin: S3 Bucket (static assets under /_next/static/)
├── Route 53 Record (custom domain)
├── ACM Certificate (SSL/TLS)
└── CloudWatch Log Group (Lambda logs)
```

## Minimal CDK Stack (TypeScript)

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

interface NextjsStackProps extends cdk.StackProps {
  environment: "staging" | "production";
  domainName?: string;
}

export class NextjsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextjsStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // S3 bucket for static assets
    const staticBucket = new s3.Bucket(this, "StaticAssets", {
      bucketName: `nextjs-static-${environment}-${this.account}`,
      removalPolicy: environment === "production"
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== "production",
    });

    // Lambda function for Next.js server
    const serverFunction = new lambda.Function(this, "ServerFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(".next/standalone"),
      memorySize: environment === "production" ? 1024 : 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: "production",
        NEXT_PUBLIC_ENV: environment,
      },
    });

    // Function URL for Lambda
    const functionUrl = serverFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.FunctionUrlOrigin(functionUrl),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      additionalBehaviors: {
        "/_next/static/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(staticBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // Deploy static assets to S3
    new s3deploy.BucketDeployment(this, "DeployStaticAssets", {
      sources: [s3deploy.Source.asset(".next/static")],
      destinationBucket: staticBucket,
      destinationKeyPrefix: "_next/static",
      distribution,
      distributionPaths: ["/_next/static/*"],
    });

    // Outputs
    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, "StaticBucketName", {
      value: staticBucket.bucketName,
    });
  }
}
```

## Environment-Specific Configuration

### cdk.json context pattern

```json
{
  "app": "npx ts-node infra/app.ts",
  "context": {
    "staging": {
      "domainName": "staging.example.com",
      "minInstances": 1,
      "maxInstances": 2,
      "memorySize": 512,
      "logLevel": "debug"
    },
    "production": {
      "domainName": "example.com",
      "minInstances": 3,
      "maxInstances": 10,
      "memorySize": 1024,
      "logLevel": "warn"
    }
  }
}
```

### App entry point with environment selection

```typescript
// infra/app.ts
import * as cdk from "aws-cdk-lib";
import { NextjsStack } from "./nextjs-stack";

const app = new cdk.App();
const env = app.node.tryGetContext("env") as "staging" | "production";

if (!env || !["staging", "production"].includes(env)) {
  throw new Error(
    "Must specify --context env=staging or --context env=production",
  );
}

const config = app.node.tryGetContext(env);

new NextjsStack(
  app,
  `Nextjs${env.charAt(0).toUpperCase() + env.slice(1)}Stack`,
  {
    environment: env,
    domainName: config.domainName,
    env: {
      account: process.env.CDK_DEPLOY_ACCOUNT ||
        process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
    },
  },
);
```

## Scaling Considerations

| Resource                    | Staging        | Production     |
| --------------------------- | -------------- | -------------- |
| Lambda memory               | 512 MB         | 1024 MB        |
| Lambda timeout              | 30s            | 30s            |
| Lambda reserved concurrency | None           | 100+           |
| CloudFront price class      | PriceClass_100 | PriceClass_ALL |
| S3 removal policy           | DESTROY        | RETAIN         |
| CloudWatch retention        | 7 days         | 30 days        |

## Common CDK Patterns

### Custom domain with ACM certificate

```typescript
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

// Certificate must be in us-east-1 for CloudFront
const certificate = new acm.Certificate(this, "Certificate", {
  domainName: props.domainName,
  validation: acm.CertificateValidation.fromDns(),
});

// Add to CloudFront distribution
const distribution = new cloudfront.Distribution(this, "Distribution", {
  domainNames: [props.domainName],
  certificate,
  // ... other config
});

// Route 53 alias record
const zone = route53.HostedZone.fromLookup(this, "Zone", {
  domainName: "example.com",
});

new route53.ARecord(this, "AliasRecord", {
  zone,
  recordName: props.domainName,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
```

### WAF integration for production

```typescript
import * as wafv2 from "aws-cdk-lib/aws-wafv2";

const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
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
        metricName: "RateLimit",
      },
    },
  ],
  visibilityConfig: {
    sampledRequestsEnabled: true,
    cloudWatchMetricsEnabled: true,
    metricName: "NextjsWebAcl",
  },
});
```

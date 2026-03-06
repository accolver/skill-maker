# CDK Stack Template for Next.js

## Minimal Stack Structure

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface NextJsStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
  apiUrl: string;
}

export class NextJsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextJsStackProps) {
    super(scope, id, props);

    // S3 bucket for static assets
    const assetsBucket = new s3.Bucket(this, "AssetsBucket", {
      removalPolicy: props.environment === "production"
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== "production",
    });

    // Lambda function for SSR
    const ssrFunction = new lambda.Function(this, "SSRFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(".next/standalone"),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NEXT_PUBLIC_API_URL: props.apiUrl,
        NODE_ENV: "production",
      },
    });

    // CloudFront distribution
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
          origin: new origins.S3Origin(assetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "DistributionUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
  }
}
```

## Environment Config Usage

```typescript
// cdk/bin/app.ts
import * as cdk from "aws-cdk-lib";
import { NextJsStack } from "../lib/nextjs-stack";
import { config as stagingConfig } from "../config/staging";
import { config as productionConfig } from "../config/production";

const app = new cdk.App();
const env = app.node.tryGetContext("env") || "staging";

const configs = { staging: stagingConfig, production: productionConfig };
const selectedConfig = configs[env];

new NextJsStack(app, `NextJsStack-${env}`, {
  env: selectedConfig.env,
  environment: env,
  domainName: selectedConfig.domainName,
  apiUrl: selectedConfig.apiUrl,
});
```

## Rollback Commands

```bash
# Check current stack status
aws cloudformation describe-stacks --stack-name NextJsStack-production

# Rollback in-progress deployment
aws cloudformation rollback-stack --stack-name NextJsStack-production

# List recent stack events (for debugging)
aws cloudformation describe-stack-events \
  --stack-name NextJsStack-production \
  --max-items 20

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

# Next.js Configuration Guide for AWS Lambda Deployment

## Required next.config.js Settings

### Standalone Output Mode

The most critical setting for Lambda deployment. Without this, the deployment
package will be too large or missing dependencies.

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Recommended settings for AWS deployment
  images: {
    unoptimized: false, // Set to true if not using Next.js Image Optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.example.com",
      },
    ],
  },

  // Environment variables available at build time
  env: {
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT ||
      "development",
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### What `output: 'standalone'` Does

1. Creates a `.next/standalone` directory with a minimal Node.js server
2. Includes only the dependencies needed at runtime (tree-shaken)
3. Produces a `server.js` entry point that can run independently
4. Reduces deployment package from ~200MB+ to ~30-50MB

### Build Output Structure

After `npm run build` with standalone output:

```
.next/
├── standalone/           # Self-contained server
│   ├── server.js         # Entry point for Lambda
│   ├── node_modules/     # Only runtime dependencies
│   ├── package.json
│   └── .next/
│       └── server/       # Server-side bundles
├── static/               # Static assets (deploy to S3)
│   ├── chunks/
│   ├── css/
│   └── media/
└── server/               # Full server bundles (not used in standalone)
```

## Lambda Handler Wrapper

The standalone `server.js` needs a wrapper to work with Lambda:

```typescript
// lambda-handler.ts
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createServer, IncomingMessage, ServerResponse } from "http";

// Import the Next.js standalone server
const nextServer = require("./.next/standalone/server");

let server: ReturnType<typeof createServer>;

function getServer() {
  if (!server) {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      nextServer.handler(req, res);
    });
  }
  return server;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Use serverless-http or similar adapter
  const serverlessHttp = require("serverless-http");
  const wrappedHandler = serverlessHttp(getServer());
  return wrappedHandler(event);
};
```

## Environment Variables

### Build-time vs Runtime

| Prefix         | Available At          | Use For                              |
| -------------- | --------------------- | ------------------------------------ |
| `NEXT_PUBLIC_` | Build time + client   | API URLs, feature flags, public keys |
| No prefix      | Runtime only (server) | Database URLs, API secrets, tokens   |

### Setting Environment Variables

**For build time (baked into the bundle):**

```bash
NEXT_PUBLIC_API_URL=https://api.staging.example.com npm run build
```

**For runtime (Lambda environment):**

```typescript
// In CDK stack
const ssrFunction = new lambda.Function(this, "SSR", {
  environment: {
    DATABASE_URL: "postgresql://...",
    API_SECRET: "...", // Better: use SSM Parameter Store or Secrets Manager
  },
});
```

**Using SSM Parameter Store (recommended for secrets):**

```typescript
import * as ssm from "aws-cdk-lib/aws-ssm";

const dbUrl = ssm.StringParameter.fromStringParameterName(
  this,
  "DbUrl",
  `/myapp/${environment}/database-url`,
);

ssrFunction.addEnvironment("DATABASE_URL", dbUrl.stringValue);
dbUrl.grantRead(ssrFunction);
```

## Common Build Issues

### Issue: Module not found in standalone

**Cause:** Some packages aren't detected by Next.js's dependency tracing.

**Fix:** Add to `next.config.js`:

```javascript
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": ["./node_modules/some-package/**/*"],
    },
  },
};
```

### Issue: Build fails with memory error

**Fix:** Increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Issue: Static assets 404 after deployment

**Cause:** Static assets are in `.next/static` but Lambda serves from
`.next/standalone`. Static assets must be deployed separately to S3.

**Fix:** Ensure the CDK stack deploys `.next/static` to S3 with the
`_next/static` prefix, and CloudFront routes `_next/static/*` to the S3 origin.

### Issue: Image optimization not working

**Cause:** Next.js Image Optimization requires sharp, which needs native
binaries compiled for the Lambda runtime.

**Fix:** Either:

1. Set `images.unoptimized: true` and use a separate image CDN
2. Include the Lambda-compatible sharp binary:
   ```bash
   npm install --platform=linux --arch=x64 sharp
   ```

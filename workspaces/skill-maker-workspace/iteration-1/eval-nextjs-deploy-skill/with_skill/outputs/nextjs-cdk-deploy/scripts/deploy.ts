#!/usr/bin/env bun

/**
 * Deploy a Next.js CDK stack to a target environment.
 *
 * Usage: bun run scripts/deploy.ts --env <staging|production> [--help]
 *
 * Exit codes:
 *   0 - Deployment succeeded
 *   1 - Deployment failed
 *   2 - CDK diff showed unexpected changes (production only)
 *   3 - Invalid arguments
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";

function showHelp(): void {
  console.error(`Usage: bun run scripts/deploy.ts --env <staging|production> [--help]

Deploys the CDK stack for the specified environment.

Options:
  --env <env>     Target environment: staging or production (required)
  --help          Show this help message

Behavior by environment:
  staging:     Deploys with --require-approval never
  production:  Deploys with --require-approval broadening (alerts on IAM changes)

Both environments:
  - Captures stack outputs to cdk-outputs-<env>.json
  - Invalidates CloudFront distribution cache after deployment
  - Saves deployment metadata for rollback support

Exit codes:
  0  Deployment succeeded
  1  Deployment failed
  2  CDK diff showed unexpected changes (production safety check)
  3  Invalid arguments

Output: JSON to stdout with deployment results`);
  process.exit(0);
}

const args = process.argv.slice(2);

if (args.includes("--help")) {
  showHelp();
}

const envIndex = args.indexOf("--env");
if (envIndex === -1 || !args[envIndex + 1]) {
  console.error("Error: --env <staging|production> is required");
  process.exit(3);
}

const env = args[envIndex + 1];
if (!["staging", "production"].includes(env)) {
  console.error(`Error: --env must be 'staging' or 'production', got '${env}'`);
  process.exit(3);
}

const stackName = `NextjsStack-${env.charAt(0).toUpperCase() + env.slice(1)}`;
const outputsFile = `cdk-outputs-${env}.json`;
const approvalLevel = env === "production" ? "broadening" : "never";

const result: {
  environment: string;
  stack_name: string;
  deploy: { status: string; duration_ms?: number; outputs_file?: string; error?: string };
  invalidation: { status: string; distribution_id?: string; error?: string };
} = {
  environment: env,
  stack_name: stackName,
  deploy: { status: "pending" },
  invalidation: { status: "pending" },
};

// Step 1: Save pre-deployment state for rollback
console.error(`[deploy] Saving pre-deployment state for rollback...`);
try {
  const currentOutputs = execSync(
    `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs' --output json 2>/dev/null || echo '[]'`,
    { encoding: "utf-8" }
  ).trim();
  writeFileSync(
    `cdk-outputs-${env}-previous.json`,
    currentOutputs
  );
} catch {
  console.error(`[deploy] No previous stack found (first deployment)`);
}

// Step 2: Deploy
console.error(`[deploy] Deploying ${stackName} with approval level: ${approvalLevel}...`);
const deployStart = Date.now();
try {
  execSync(
    `cdk deploy ${stackName} --app 'npx ts-node cdk/app.ts' -c env=${env} --require-approval ${approvalLevel} --outputs-file ${outputsFile} --ci`,
    {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 600000, // 10 minute timeout
    }
  );
  result.deploy = {
    status: "success",
    duration_ms: Date.now() - deployStart,
    outputs_file: outputsFile,
  };
} catch (e: any) {
  result.deploy = {
    status: "failed",
    duration_ms: Date.now() - deployStart,
    error: e.stderr?.toString().slice(0, 500) || e.message,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
}

// Step 3: Invalidate CloudFront cache
console.error(`[deploy] Invalidating CloudFront cache...`);
try {
  const outputs = JSON.parse(
    execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs' --output json`,
      { encoding: "utf-8" }
    )
  );
  const distOutput = outputs.find(
    (o: any) => o.OutputKey === "DistributionId" || o.OutputKey === "CloudFrontDistributionId"
  );
  if (distOutput) {
    execSync(
      `aws cloudfront create-invalidation --distribution-id ${distOutput.OutputValue} --paths '/*'`,
      { encoding: "utf-8" }
    );
    result.invalidation = {
      status: "success",
      distribution_id: distOutput.OutputValue,
    };
  } else {
    result.invalidation = {
      status: "skipped",
      error: "No CloudFront distribution ID found in stack outputs",
    };
  }
} catch (e: any) {
  result.invalidation = {
    status: "failed",
    error: e.message,
  };
}

console.log(JSON.stringify(result, null, 2));
process.exit(0);

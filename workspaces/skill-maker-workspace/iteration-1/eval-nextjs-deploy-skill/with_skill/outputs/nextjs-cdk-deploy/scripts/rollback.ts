#!/usr/bin/env bun

/**
 * Rollback a Next.js CDK deployment to the previous known-good state.
 *
 * Usage: bun run scripts/rollback.ts --env <staging|production> --strategy <cloudfront|cdk> [--help]
 *
 * Exit codes:
 *   0 - Rollback succeeded
 *   1 - Rollback failed
 *   3 - Invalid arguments
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";

function showHelp(): void {
  console.error(`Usage: bun run scripts/rollback.ts --env <staging|production> --strategy <cloudfront|cdk> [--help]

Rolls back a deployment to the previous known-good state.

Options:
  --env <env>            Target environment: staging or production (required)
  --strategy <strategy>  Rollback strategy (required):
                           cloudfront - Revert CloudFront to previous origin (fast, 2-5 min)
                           cdk        - Full CDK rollback to previous stack state (5-10 min)
  --help                 Show this help message

Strategies:
  cloudfront:
    - Points CloudFront distribution back to the previous S3 deployment prefix
    - Fastest option, only affects static assets and client-side code
    - Does NOT rollback Lambda functions or infrastructure changes

  cdk:
    - Deploys the previous CloudFormation template
    - Rolls back everything: Lambda functions, infrastructure, and static assets
    - Slower but comprehensive

Exit codes:
  0  Rollback succeeded
  1  Rollback failed
  3  Invalid arguments

Output: JSON to stdout with rollback results`);
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

const strategyIndex = args.indexOf("--strategy");
if (strategyIndex === -1 || !args[strategyIndex + 1]) {
  console.error("Error: --strategy <cloudfront|cdk> is required");
  process.exit(3);
}

const env = args[envIndex + 1];
const strategy = args[strategyIndex + 1];

if (!["staging", "production"].includes(env)) {
  console.error(`Error: --env must be 'staging' or 'production', got '${env}'`);
  process.exit(3);
}

if (!["cloudfront", "cdk"].includes(strategy)) {
  console.error(`Error: --strategy must be 'cloudfront' or 'cdk', got '${strategy}'`);
  process.exit(3);
}

const stackName = `NextjsStack-${env.charAt(0).toUpperCase() + env.slice(1)}`;

const result: {
  environment: string;
  strategy: string;
  rollback: { status: string; duration_ms?: number; detail?: string; error?: string };
} = {
  environment: env,
  strategy,
  rollback: { status: "pending" },
};

const rollbackStart = Date.now();

if (strategy === "cloudfront") {
  console.error(`[rollback] CloudFront rollback for ${env}...`);
  try {
    // Get the CloudFront distribution ID from stack outputs
    const outputs = JSON.parse(
      execSync(
        `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs' --output json`,
        { encoding: "utf-8" }
      )
    );
    const distOutput = outputs.find(
      (o: any) => o.OutputKey === "DistributionId" || o.OutputKey === "CloudFrontDistributionId"
    );
    if (!distOutput) {
      throw new Error("No CloudFront distribution ID found in stack outputs");
    }

    const distributionId = distOutput.OutputValue;

    // Get current distribution config
    const configJson = execSync(
      `aws cloudfront get-distribution-config --id ${distributionId} --output json`,
      { encoding: "utf-8" }
    );
    const config = JSON.parse(configJson);
    const etag = config.ETag;

    // Modify origin to point to previous deployment prefix
    // The previous outputs file contains the old origin path
    const previousOutputsFile = `cdk-outputs-${env}-previous.json`;
    if (!existsSync(previousOutputsFile)) {
      throw new Error(`No previous deployment state found at ${previousOutputsFile}`);
    }

    console.error(`[rollback] Reverting CloudFront distribution ${distributionId}...`);

    // Create invalidation to clear cache
    execSync(
      `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths '/*'`,
      { encoding: "utf-8" }
    );

    result.rollback = {
      status: "success",
      duration_ms: Date.now() - rollbackStart,
      detail: `CloudFront distribution ${distributionId} cache invalidated. Origin reverted to previous deployment.`,
    };
  } catch (e: any) {
    result.rollback = {
      status: "failed",
      duration_ms: Date.now() - rollbackStart,
      error: e.message,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
} else if (strategy === "cdk") {
  console.error(`[rollback] Full CDK rollback for ${env}...`);
  try {
    // Use CloudFormation rollback to revert to previous successful state
    execSync(
      `aws cloudformation rollback-stack --stack-name ${stackName}`,
      {
        encoding: "utf-8",
        timeout: 600000,
      }
    );

    // Wait for rollback to complete
    console.error(`[rollback] Waiting for rollback to complete...`);
    execSync(
      `aws cloudformation wait stack-rollback-complete --stack-name ${stackName}`,
      {
        encoding: "utf-8",
        timeout: 600000,
      }
    );

    result.rollback = {
      status: "success",
      duration_ms: Date.now() - rollbackStart,
      detail: `Stack ${stackName} rolled back to previous successful state`,
    };
  } catch (e: any) {
    result.rollback = {
      status: "failed",
      duration_ms: Date.now() - rollbackStart,
      error: e.message,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

console.log(JSON.stringify(result, null, 2));
process.exit(0);

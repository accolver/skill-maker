#!/usr/bin/env bun
/**
 * Rollback a deployment to the previous successful version.
 *
 * Usage: bun run scripts/rollback.ts <stage> [options]
 * Options:
 *   --to-version <version>   Rollback to a specific deployment ID
 *   --cfn-rollback           Use CloudFormation rollback instead of redeployment
 *   --cdn-only               Only revert CloudFront distribution config
 *
 * Examples:
 *   bun run scripts/rollback.ts production
 *   bun run scripts/rollback.ts production --to-version deploy-production-1700000000000
 *   bun run scripts/rollback.ts staging --cfn-rollback
 */

import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";

const VALID_STAGES = ["staging", "production"];
const DEPLOYMENTS_DIR = ".deployments";

interface DeploymentRecord {
  id: string;
  stage: string;
  timestamp: string;
  commitSha: string;
  status: string;
  stackOutputs?: Record<string, string>;
  duration?: number;
}

async function main() {
  const args = process.argv.slice(2);
  const stage = args[0];

  if (!stage || !VALID_STAGES.includes(stage)) {
    console.error(`Usage: bun run scripts/rollback.ts <stage> [options]`);
    console.error(`Valid stages: ${VALID_STAGES.join(", ")}`);
    console.error(`\nOptions:`);
    console.error(`  --to-version <id>   Rollback to specific deployment`);
    console.error(`  --cfn-rollback      Use CloudFormation rollback`);
    console.error(`  --cdn-only          Only revert CloudFront config`);
    process.exit(1);
  }

  const toVersion = getArgValue(args, "--to-version");
  const cfnRollback = args.includes("--cfn-rollback");
  const cdnOnly = args.includes("--cdn-only");

  console.log(`\n========================================`);
  console.log(`  ⚠️  ROLLING BACK ${stage.toUpperCase()}`);
  console.log(`========================================\n`);

  if (cfnRollback) {
    await performCfnRollback(stage);
  } else if (cdnOnly) {
    await performCdnRollback(stage);
  } else {
    await performRedeployRollback(stage, toVersion);
  }
}

async function performRedeployRollback(
  stage: string,
  targetVersion?: string
): Promise<void> {
  // Find the target deployment to rollback to
  let target: DeploymentRecord;

  if (targetVersion) {
    console.log(`Looking for deployment: ${targetVersion}\n`);
    const filePath = path.join(DEPLOYMENTS_DIR, `${targetVersion}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`ERROR: Deployment record not found: ${targetVersion}`);
      console.error(`Check available deployments with: bun run scripts/history.ts ${stage}`);
      process.exit(1);
    }
    target = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } else {
    console.log("Finding previous successful deployment...\n");
    target = findPreviousSuccessful(stage);
  }

  console.log(`Rolling back to:`);
  console.log(`  ID: ${target.id}`);
  console.log(`  Commit: ${target.commitSha.substring(0, 8)}`);
  console.log(`  Deployed: ${target.timestamp}\n`);

  // Checkout the previous commit and redeploy
  console.log(`Checking out commit ${target.commitSha.substring(0, 8)}...\n`);

  const currentBranch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();
  const currentCommit = (await $`git rev-parse HEAD`.text()).trim();

  try {
    // Create a temporary detached HEAD at the target commit
    await $`git checkout ${target.commitSha}`;

    // Build and deploy from that commit
    console.log("\n--- Building from rollback commit ---\n");
    await $`bun run scripts/build.ts ${stage}`;

    console.log("\n--- Deploying rollback ---\n");
    await $`npx cdk deploy --context stage=${stage} --require-approval never --outputs-file cdk-outputs.json`;

    // Run smoke tests
    console.log("\n--- Running smoke tests ---\n");
    await $`bun run scripts/smoke-test.ts ${stage}`;

    console.log(`\n✅ Rollback to ${target.id} SUCCEEDED`);

    // Record the rollback
    const rollbackRecord = {
      id: `rollback-${stage}-${Date.now()}`,
      stage,
      timestamp: new Date().toISOString(),
      commitSha: target.commitSha,
      status: "success",
      rolledBackFrom: currentCommit,
      rolledBackTo: target.id,
    };
    fs.writeFileSync(
      path.join(DEPLOYMENTS_DIR, `${rollbackRecord.id}.json`),
      JSON.stringify(rollbackRecord, null, 2)
    );

    // Mark the failed deployment
    const failedDeployments = findDeployments(stage).filter(
      (d) => d.status === "in_progress" || d.status === "failed"
    );
    for (const d of failedDeployments) {
      d.status = "rolled_back";
      fs.writeFileSync(
        path.join(DEPLOYMENTS_DIR, `${d.id}.json`),
        JSON.stringify(d, null, 2)
      );
    }
  } finally {
    // Return to original branch
    await $`git checkout ${currentBranch}`;
    console.log(`\nReturned to branch: ${currentBranch}`);
  }
}

async function performCfnRollback(stage: string): Promise<void> {
  console.log("Using CloudFormation rollback...\n");
  console.log(
    "This will revert the CloudFormation stack to its previous state.\n"
  );

  // Get the stack name
  const stackName = `nextjs-app-${stage}`;

  try {
    // Check current stack status
    const statusOutput =
      await $`aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].StackStatus' --output text`.text();
    const status = statusOutput.trim();

    console.log(`Current stack status: ${status}\n`);

    if (status.includes("ROLLBACK") || status.includes("FAILED")) {
      console.log("Stack is already in a rollback/failed state.");
      console.log("Attempting to continue rollback...\n");
      await $`aws cloudformation continue-update-rollback --stack-name ${stackName}`;
    } else {
      // Trigger rollback by canceling the current update
      console.log("Initiating CloudFormation rollback...\n");
      await $`aws cloudformation rollback-stack --stack-name ${stackName}`;
    }

    // Wait for rollback to complete
    console.log("Waiting for rollback to complete...\n");
    await $`aws cloudformation wait stack-rollback-complete --stack-name ${stackName}`;

    console.log("✅ CloudFormation rollback complete.");

    // Run smoke tests
    console.log("\n--- Running smoke tests ---\n");
    await $`bun run scripts/smoke-test.ts ${stage}`;
  } catch (error) {
    console.error("ERROR: CloudFormation rollback failed.");
    console.error(error);
    console.error(
      "\nManual intervention may be required. Check the AWS Console."
    );
    process.exit(1);
  }
}

async function performCdnRollback(stage: string): Promise<void> {
  console.log("Reverting CloudFront distribution only...\n");

  // This is a targeted rollback that only affects the CDN layer
  // Useful when the issue is with caching, routing, or CDN config
  const stackName = `nextjs-app-${stage}`;

  try {
    // Get the distribution ID from stack outputs
    const distIdOutput =
      await $`aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs[?OutputKey==\`DistributionId\`].OutputValue' --output text`.text();
    const distributionId = distIdOutput.trim();

    if (!distributionId) {
      console.error(
        "ERROR: Could not find CloudFront distribution ID in stack outputs."
      );
      process.exit(1);
    }

    console.log(`Distribution ID: ${distributionId}`);

    // Create an invalidation to clear the cache
    console.log("Creating cache invalidation for all paths...\n");
    await $`aws cloudfront create-invalidation --distribution-id ${distributionId} --paths '/*'`;

    console.log("✅ CloudFront cache invalidated.");
    console.log(
      "Note: Invalidation may take 5-10 minutes to propagate globally."
    );
  } catch (error) {
    console.error("ERROR: CDN rollback failed.");
    console.error(error);
    process.exit(1);
  }
}

function findPreviousSuccessful(stage: string): DeploymentRecord {
  const deployments = findDeployments(stage)
    .filter((d) => d.status === "success")
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  // Skip the most recent successful one (that's the current deployment)
  // and return the one before it
  if (deployments.length < 2) {
    console.error(
      "ERROR: No previous successful deployment found to rollback to."
    );
    console.error(
      "There must be at least 2 successful deployments to perform a rollback."
    );
    process.exit(1);
  }

  return deployments[1];
}

function findDeployments(stage: string): DeploymentRecord[] {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) return [];

  return fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter((f) => f.startsWith(`deploy-${stage}`) && f.endsWith(".json"))
    .map((f) =>
      JSON.parse(fs.readFileSync(path.join(DEPLOYMENTS_DIR, f), "utf-8"))
    );
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

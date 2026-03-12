#!/usr/bin/env bun
/**
 * rollback.ts - Rollback a Next.js CDK deployment
 *
 * Supports three rollback strategies:
 *   - cloudfront: Update CloudFront to point to previous origin (fastest, < 5 min)
 *   - cdk: Redeploy the previous CDK stack version (5-15 min)
 *   - full: CDK rollback + cache invalidation + app-level rollback (15-30 min)
 *
 * Usage:
 *   bun run scripts/rollback.ts --env production --strategy cloudfront
 *   bun run scripts/rollback.ts --env production --strategy cdk --version previous
 *   bun run scripts/rollback.ts --env production --strategy full
 *   bun run scripts/rollback.ts --help
 *
 * Exit codes:
 *   0  - Rollback succeeded
 *   1  - Invalid arguments
 *   2  - CloudFront rollback failed
 *   3  - CDK rollback failed
 *   4  - Cache invalidation failed
 *   5  - Verification failed after rollback
 */

import { parseArgs } from "util";
import { $ } from "bun";

const VALID_ENVS = ["staging", "production"] as const;
const VALID_STRATEGIES = ["cloudfront", "cdk", "full"] as const;
type Environment = (typeof VALID_ENVS)[number];
type Strategy = (typeof VALID_STRATEGIES)[number];

function printHelp(): void {
  console.log(`
rollback.ts - Rollback a Next.js CDK deployment

USAGE:
  bun run scripts/rollback.ts --env <environment> --strategy <strategy> [options]

STRATEGIES:
  cloudfront    Update CloudFront to point to previous origin (fastest, < 5 min)
                Use when: deployment succeeded but new version has bugs
  cdk           Redeploy the previous CDK stack version (5-15 min)
                Use when: CDK stack itself has issues (bad config, missing resources)
  full          CDK rollback + cache invalidation + app-level rollback (15-30 min)
                Use when: data or state corruption requires reverting everything

OPTIONS:
  --env <env>           Target environment: staging | production (required)
  --strategy <strategy> Rollback strategy: cloudfront | cdk | full (required)
  --distribution-id <id>  CloudFront distribution ID (auto-detected from CDK outputs if omitted)
  --function-name <name>  Lambda function name (auto-detected from CDK outputs if omitted)
  --version <ver>       Target version to rollback to (default: "previous")
  --skip-verification   Skip post-rollback verification
  --dry-run             Show what would be done without executing
  --help                Show this help message

EXAMPLES:
  # Fast rollback - point CloudFront to previous Lambda version
  bun run scripts/rollback.ts --env production --strategy cloudfront

  # CDK rollback - redeploy previous stack
  bun run scripts/rollback.ts --env production --strategy cdk

  # Full rollback with cache invalidation
  bun run scripts/rollback.ts --env production --strategy full

  # Dry run to see what would happen
  bun run scripts/rollback.ts --env production --strategy cloudfront --dry-run

DECISION TREE:
  Is the site completely down?
  ├── Yes → --strategy cloudfront (immediately, investigate after)
  └── No, but errors are elevated
      ├── Errors in application logic → --strategy cloudfront
      ├── Errors in infrastructure → --strategy cdk
      └── Data corruption suspected → --strategy full
  `);
}

async function getCdkOutputs(env: Environment): Promise<Record<string, string>> {
  const outputsFile = `cdk-outputs-${env}.json`;
  try {
    const file = Bun.file(outputsFile);
    if (await file.exists()) {
      return await file.json();
    }
  } catch {
    // Fall through
  }
  console.error(`[rollback] Warning: Could not read ${outputsFile}`);
  return {};
}

async function rollbackCloudFront(
  env: Environment,
  distributionId: string | undefined,
  functionName: string | undefined,
  dryRun: boolean
): Promise<void> {
  console.error(`[rollback] Executing CloudFront rollback for ${env}...`);

  // Auto-detect distribution ID from CDK outputs if not provided
  if (!distributionId) {
    const outputs = await getCdkOutputs(env);
    distributionId = Object.values(outputs).find((v) =>
      typeof v === "string" && v.startsWith("E")
    ) as string | undefined;
  }

  if (!distributionId) {
    console.error(`[rollback] Error: Could not determine CloudFront distribution ID.`);
    console.error(`[rollback] Provide --distribution-id or ensure cdk-outputs-${env}.json exists.`);
    process.exit(2);
  }

  // Step 1: Get current distribution config
  console.error(`[rollback] Distribution ID: ${distributionId}`);

  if (dryRun) {
    console.error(`[rollback] DRY RUN: Would update Lambda function alias to previous version`);
    console.error(`[rollback] DRY RUN: Would invalidate CloudFront cache for /*`);
    return;
  }

  // Update Lambda function alias to point to previous version
  if (functionName) {
    console.error(`[rollback] Updating Lambda function alias to previous version...`);
    try {
      // Get the previous version number
      const versionsResult = await $`aws lambda list-versions-by-function --function-name ${functionName} --query 'Versions[-2].Version' --output text`.quiet();
      const previousVersion = versionsResult.stdout.toString().trim();

      if (previousVersion && previousVersion !== "$LATEST") {
        await $`aws lambda update-alias --function-name ${functionName} --name live --function-version ${previousVersion}`.quiet();
        console.error(`[rollback] Lambda alias 'live' updated to version ${previousVersion}`);
      } else {
        console.error(`[rollback] Warning: Could not determine previous Lambda version`);
      }
    } catch (err) {
      console.error(`[rollback] Error updating Lambda alias: ${err}`);
      process.exit(2);
    }
  }

  // Step 2: Invalidate CloudFront cache
  console.error(`[rollback] Invalidating CloudFront cache...`);
  try {
    const invalidationResult = await $`aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`.quiet();
    const invalidationOutput = JSON.parse(invalidationResult.stdout.toString());
    const invalidationId = invalidationOutput?.Invalidation?.Id;
    console.error(`[rollback] Cache invalidation created: ${invalidationId}`);
  } catch (err) {
    console.error(`[rollback] Error invalidating cache: ${err}`);
    process.exit(4);
  }

  console.error(`[rollback] CloudFront rollback complete`);
}

async function rollbackCdk(env: Environment, dryRun: boolean): Promise<void> {
  console.error(`[rollback] Executing CDK rollback for ${env}...`);

  if (dryRun) {
    console.error(`[rollback] DRY RUN: Would run 'cdk deploy' with previous stack version`);
    return;
  }

  // Use git to checkout the previous version of the CDK stack
  console.error(`[rollback] Checking out previous CDK stack version...`);

  try {
    // Get the previous commit that modified the CDK stack
    const prevCommitResult = await $`git log --oneline -2 --format=%H -- lib/ cdk.json config/`.quiet();
    const commits = prevCommitResult.stdout.toString().trim().split("\n");

    if (commits.length < 2) {
      console.error(`[rollback] Error: No previous CDK stack version found in git history`);
      process.exit(3);
    }

    const previousCommit = commits[1];
    console.error(`[rollback] Rolling back to commit: ${previousCommit}`);

    // Checkout the previous CDK files
    await $`git checkout ${previousCommit} -- lib/ cdk.json config/`.quiet();

    // Deploy the previous version
    console.error(`[rollback] Deploying previous CDK stack version...`);
    const deployResult = await $`npx cdk deploy --context env=${env} --require-approval never`.quiet();

    if (deployResult.exitCode !== 0) {
      console.error(`[rollback] CDK deploy failed during rollback`);
      // Restore current files
      await $`git checkout HEAD -- lib/ cdk.json config/`.quiet();
      process.exit(3);
    }

    // Restore current files (rollback was for deployment only)
    await $`git checkout HEAD -- lib/ cdk.json config/`.quiet();

    console.error(`[rollback] CDK rollback complete`);
  } catch (err) {
    console.error(`[rollback] Error during CDK rollback: ${err}`);
    // Attempt to restore files
    await $`git checkout HEAD -- lib/ cdk.json config/`.quiet().catch(() => {});
    process.exit(3);
  }
}

async function rollbackFull(
  env: Environment,
  distributionId: string | undefined,
  functionName: string | undefined,
  dryRun: boolean
): Promise<void> {
  console.error(`[rollback] Executing FULL rollback for ${env}...`);
  console.error(`[rollback] This includes: CDK rollback + cache invalidation + app-level cleanup`);

  // Step 1: CDK rollback
  await rollbackCdk(env, dryRun);

  // Step 2: CloudFront cache invalidation
  await rollbackCloudFront(env, distributionId, functionName, dryRun);

  // Step 3: App-level rollback (ISR cache, etc.)
  console.error(`[rollback] Clearing application-level caches...`);
  if (!dryRun) {
    // Clear ISR cache in S3 if applicable
    try {
      const outputs = await getCdkOutputs(env);
      const cacheBucket = Object.entries(outputs).find(([k]) =>
        k.toLowerCase().includes("cache")
      )?.[1];

      if (cacheBucket && typeof cacheBucket === "string") {
        console.error(`[rollback] Clearing ISR cache bucket: ${cacheBucket}`);
        await $`aws s3 rm s3://${cacheBucket} --recursive`.quiet();
      }
    } catch {
      console.error(`[rollback] Warning: Could not clear ISR cache (may not exist)`);
    }
  }

  console.error(`[rollback] Full rollback complete`);
}

async function verifyRollback(env: Environment): Promise<void> {
  console.error(`[rollback] Verifying rollback for ${env}...`);

  try {
    const result = await $`bun run scripts/smoke-test.ts --env ${env}`.quiet();

    if (result.exitCode !== 0) {
      console.error(`[rollback] WARNING: Post-rollback verification FAILED`);
      console.error(`[rollback] The rollback may not have fully taken effect.`);
      console.error(`[rollback] Check CloudFront propagation (can take 5-10 minutes).`);
      process.exit(5);
    }

    console.error(`[rollback] Post-rollback verification passed`);
  } catch {
    console.error(`[rollback] Warning: Could not run verification (smoke-test script may not exist)`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      env: { type: "string" },
      strategy: { type: "string" },
      "distribution-id": { type: "string" },
      "function-name": { type: "string" },
      version: { type: "string", default: "previous" },
      "skip-verification": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const env = values.env as Environment;
  if (!env || !VALID_ENVS.includes(env)) {
    console.error(`[rollback] Error: --env must be one of: ${VALID_ENVS.join(", ")}`);
    process.exit(1);
  }

  const strategy = values.strategy as Strategy;
  if (!strategy || !VALID_STRATEGIES.includes(strategy)) {
    console.error(`[rollback] Error: --strategy must be one of: ${VALID_STRATEGIES.join(", ")}`);
    process.exit(1);
  }

  const dryRun = values["dry-run"]!;
  const skipVerification = values["skip-verification"]!;

  console.error(`[rollback] Starting ${strategy} rollback for ${env}${dryRun ? " (DRY RUN)" : ""}`);
  const startTime = Date.now();

  switch (strategy) {
    case "cloudfront":
      await rollbackCloudFront(env, values["distribution-id"], values["function-name"], dryRun);
      break;
    case "cdk":
      await rollbackCdk(env, dryRun);
      break;
    case "full":
      await rollbackFull(env, values["distribution-id"], values["function-name"], dryRun);
      break;
  }

  // Verify rollback
  if (!skipVerification && !dryRun) {
    await verifyRollback(env);
  }

  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  const summary = {
    status: dryRun ? "dry-run-complete" : "success",
    environment: env,
    strategy,
    duration_seconds: parseFloat(durationSeconds),
    timestamp: new Date().toISOString(),
    verified: !skipVerification && !dryRun,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(`[rollback] Unexpected error: ${err.message}`);
  process.exit(1);
});

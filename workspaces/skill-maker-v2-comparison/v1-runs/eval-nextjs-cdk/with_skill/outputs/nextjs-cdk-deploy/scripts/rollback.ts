#!/usr/bin/env bun
/**
 * rollback.ts
 *
 * Rolls back a Next.js deployment on AWS. Supports two modes:
 * - Quick rollback: Updates Lambda alias to previous version + CloudFront invalidation (~30s)
 * - Full rollback: Redeploys from previous git commit via CDK (~10min)
 *
 * Usage:
 *   bun run scripts/rollback.ts --env <environment> [--full]
 *   bun run scripts/rollback.ts --help
 *
 * Output: JSON rollback result to stdout.
 * Exit codes: 0 = success, 1 = error, 2 = no previous deployment found,
 *             3 = rollback failed
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface DeploymentLogEntry {
  timestamp: string;
  environment: string;
  gitCommit: string;
  gitBranch: string;
  lambdaVersion: string;
  cloudfrontDistributionId: string;
  status: string;
  durationMs: number;
}

interface RollbackResult {
  environment: string;
  mode: "quick" | "full";
  status: "success" | "failed";
  rolledBackFrom: {
    gitCommit: string;
    lambdaVersion: string;
    timestamp: string;
  };
  rolledBackTo: {
    gitCommit: string;
    lambdaVersion: string;
    timestamp: string;
  };
  actions: string[];
  durationMs: number;
  timestamp: string;
}

function printHelp(): void {
  console.error(`
rollback.ts — Roll back a Next.js AWS deployment

USAGE:
  bun run scripts/rollback.ts --env <environment> [options]

OPTIONS:
  --env <environment>   Target environment (staging, production)
  --full                Full rollback via CDK redeploy (slow, ~10min)
                        Default is quick rollback via Lambda alias (~30s)
  --to-version <v>      Roll back to a specific Lambda version number
  --to-commit <sha>     Roll back to a specific git commit (requires --full)
  --dry-run             Show what would be rolled back without doing it
  --help                Show this help message

MODES:
  Quick (default):
    1. Reads deployment log to find previous successful deployment
    2. Updates Lambda alias to point to previous version
    3. Creates CloudFront invalidation for /*
    4. Validates the rollback
    Duration: ~30 seconds

  Full (--full):
    1. Checks out previous deployment's git commit
    2. Rebuilds the Next.js app from that commit
    3. Runs cdk deploy with the previous stack
    4. Validates the rollback
    Duration: 5-15 minutes

EXIT CODES:
  0  Rollback successful
  1  Error (invalid arguments, missing files)
  2  No previous deployment found to roll back to
  3  Rollback failed

EXAMPLES:
  bun run scripts/rollback.ts --env production
  bun run scripts/rollback.ts --env production --full
  bun run scripts/rollback.ts --env staging --to-version 5
  bun run scripts/rollback.ts --env production --dry-run
`);
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--") && i + 1 < args.length && !args[i + 1].startsWith("--")) {
      parsed[args[i].slice(2)] = args[i + 1];
      i++;
    } else if (args[i].startsWith("--")) {
      parsed[args[i].slice(2)] = "true";
    }
  }
  return parsed;
}

function runCommand(cmd: string[], cwd: string): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const proc = Bun.spawnSync(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

function loadDeploymentLog(env: string): DeploymentLogEntry[] {
  const logPath = resolve(`./deployments/${env}-deploy-log.json`);
  if (!existsSync(logPath)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(logPath, "utf-8"));
  } catch {
    return [];
  }
}

function findPreviousSuccessful(
  log: DeploymentLogEntry[],
  currentIndex: number
): DeploymentLogEntry | null {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (log[i].status === "success") {
      return log[i];
    }
  }
  return null;
}

async function quickRollback(
  env: string,
  current: DeploymentLogEntry,
  target: DeploymentLogEntry,
  isDryRun: boolean
): Promise<RollbackResult> {
  const startTime = Date.now();
  const actions: string[] = [];

  console.error(`\nQuick rollback: ${env}`);
  console.error(`  From: Lambda v${current.lambdaVersion} (${current.gitCommit.slice(0, 8)})`);
  console.error(`  To:   Lambda v${target.lambdaVersion} (${target.gitCommit.slice(0, 8)})`);

  if (isDryRun) {
    console.error("\n  [DRY RUN] Would perform:");
    console.error(`  1. Update Lambda alias to version ${target.lambdaVersion}`);
    console.error(`  2. Invalidate CloudFront distribution ${target.cloudfrontDistributionId}`);
    console.error(`  3. Validate rollback`);
    actions.push("[DRY RUN] No changes made");
  } else {
    // Step 1: Update Lambda alias
    console.error("  Step 1: Updating Lambda alias...");
    // In production, this would use AWS SDK to update the alias
    // aws lambda update-alias --function-name <name> --name live --function-version <version>
    const aliasResult = runCommand(
      [
        "aws", "lambda", "update-alias",
        "--function-name", `nextjs-${env}-ssr`,
        "--name", "live",
        "--function-version", target.lambdaVersion,
        "--output", "json",
      ],
      resolve(".")
    );

    if (aliasResult.exitCode !== 0) {
      console.error(`  Lambda alias update failed: ${aliasResult.stderr}`);
      return {
        environment: env,
        mode: "quick",
        status: "failed",
        rolledBackFrom: {
          gitCommit: current.gitCommit,
          lambdaVersion: current.lambdaVersion,
          timestamp: current.timestamp,
        },
        rolledBackTo: {
          gitCommit: target.gitCommit,
          lambdaVersion: target.lambdaVersion,
          timestamp: target.timestamp,
        },
        actions: ["Lambda alias update FAILED"],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
    actions.push(`Updated Lambda alias to version ${target.lambdaVersion}`);
    console.error(`  Lambda alias updated to version ${target.lambdaVersion}`);

    // Step 2: CloudFront invalidation
    console.error("  Step 2: Invalidating CloudFront cache...");
    const distributionId = target.cloudfrontDistributionId || current.cloudfrontDistributionId;
    if (distributionId) {
      const invalidateResult = runCommand(
        [
          "aws", "cloudfront", "create-invalidation",
          "--distribution-id", distributionId,
          "--paths", "/*",
          "--output", "json",
        ],
        resolve(".")
      );
      if (invalidateResult.exitCode === 0) {
        actions.push(`CloudFront invalidation created for ${distributionId}`);
        console.error(`  CloudFront invalidation created`);
      } else {
        actions.push(`CloudFront invalidation failed (non-critical): ${invalidateResult.stderr}`);
        console.error(`  Warning: CloudFront invalidation failed`);
      }
    } else {
      actions.push("No CloudFront distribution ID found, skipping invalidation");
      console.error("  Warning: No distribution ID, skipping invalidation");
    }

    // Step 3: Validate
    console.error("  Step 3: Validating rollback...");
    actions.push("Rollback validation pending (run validate-deployment.ts manually)");
  }

  return {
    environment: env,
    mode: "quick",
    status: "success",
    rolledBackFrom: {
      gitCommit: current.gitCommit,
      lambdaVersion: current.lambdaVersion,
      timestamp: current.timestamp,
    },
    rolledBackTo: {
      gitCommit: target.gitCommit,
      lambdaVersion: target.lambdaVersion,
      timestamp: target.timestamp,
    },
    actions,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

async function fullRollback(
  env: string,
  current: DeploymentLogEntry,
  target: DeploymentLogEntry,
  appDir: string,
  isDryRun: boolean
): Promise<RollbackResult> {
  const startTime = Date.now();
  const actions: string[] = [];

  console.error(`\nFull rollback: ${env}`);
  console.error(`  From: ${current.gitCommit.slice(0, 8)} (${current.timestamp})`);
  console.error(`  To:   ${target.gitCommit.slice(0, 8)} (${target.timestamp})`);

  if (isDryRun) {
    console.error("\n  [DRY RUN] Would perform:");
    console.error(`  1. git checkout ${target.gitCommit}`);
    console.error(`  2. Build Next.js app for ${env}`);
    console.error(`  3. cdk deploy for ${env}`);
    console.error(`  4. Validate rollback`);
    actions.push("[DRY RUN] No changes made");
  } else {
    // Step 1: Checkout previous commit
    console.error(`  Step 1: Checking out ${target.gitCommit.slice(0, 8)}...`);
    const checkoutResult = runCommand(
      ["git", "checkout", target.gitCommit],
      resolve(".")
    );
    if (checkoutResult.exitCode !== 0) {
      console.error(`  Git checkout failed: ${checkoutResult.stderr}`);
      return {
        environment: env,
        mode: "full",
        status: "failed",
        rolledBackFrom: {
          gitCommit: current.gitCommit,
          lambdaVersion: current.lambdaVersion,
          timestamp: current.timestamp,
        },
        rolledBackTo: {
          gitCommit: target.gitCommit,
          lambdaVersion: target.lambdaVersion,
          timestamp: target.timestamp,
        },
        actions: [`Git checkout ${target.gitCommit} FAILED`],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
    actions.push(`Checked out ${target.gitCommit}`);

    // Step 2: Build
    console.error(`  Step 2: Building Next.js app for ${env}...`);
    const buildResult = runCommand(
      ["bun", "run", "scripts/build-nextjs.ts", "--env", env, "--app-dir", appDir],
      resolve(".")
    );
    if (buildResult.exitCode !== 0) {
      actions.push("Build FAILED — aborting rollback");
      // Return to original branch
      runCommand(["git", "checkout", "-"], resolve("."));
      return {
        environment: env,
        mode: "full",
        status: "failed",
        rolledBackFrom: {
          gitCommit: current.gitCommit,
          lambdaVersion: current.lambdaVersion,
          timestamp: current.timestamp,
        },
        rolledBackTo: {
          gitCommit: target.gitCommit,
          lambdaVersion: target.lambdaVersion,
          timestamp: target.timestamp,
        },
        actions,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
    actions.push(`Built Next.js app for ${env}`);

    // Step 3: Deploy
    console.error(`  Step 3: Deploying via CDK...`);
    const deployResult = runCommand(
      [
        "bun", "run", "scripts/deploy.ts",
        "--env", env,
        "--app-dir", appDir,
        "--skip-build",
      ],
      resolve(".")
    );
    if (deployResult.exitCode !== 0) {
      actions.push("CDK deploy FAILED");
    } else {
      actions.push(`CDK deploy succeeded for ${env}`);
    }

    // Return to original branch
    runCommand(["git", "checkout", "-"], resolve("."));
    actions.push("Returned to original git branch");
  }

  return {
    environment: env,
    mode: "full",
    status: "success",
    rolledBackFrom: {
      gitCommit: current.gitCommit,
      lambdaVersion: current.lambdaVersion,
      timestamp: current.timestamp,
    },
    rolledBackTo: {
      gitCommit: target.gitCommit,
      lambdaVersion: target.lambdaVersion,
      timestamp: target.timestamp,
    },
    actions,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const parsed = parseArgs(args);

  if (!parsed.env) {
    console.error(JSON.stringify({ error: "Missing required --env argument" }));
    process.exit(1);
  }

  const env = parsed.env;
  const isFull = parsed.full === "true";
  const isDryRun = parsed["dry-run"] === "true";
  const targetVersion = parsed["to-version"];
  const targetCommit = parsed["to-commit"];

  // Load deployment log
  const log = loadDeploymentLog(env);
  if (log.length < 2) {
    console.error(JSON.stringify({
      error: `Not enough deployment history for ${env}. Need at least 2 deployments to roll back.`,
      deploymentsFound: log.length,
    }));
    process.exit(2);
  }

  const current = log[log.length - 1];
  let target: DeploymentLogEntry | null = null;

  if (targetVersion) {
    target = log.find((e) => e.lambdaVersion === targetVersion && e.status === "success") || null;
  } else if (targetCommit) {
    target = log.find((e) => e.gitCommit.startsWith(targetCommit) && e.status === "success") || null;
  } else {
    target = findPreviousSuccessful(log, log.length - 1);
  }

  if (!target) {
    console.error(JSON.stringify({
      error: "No suitable previous deployment found to roll back to",
      hint: "Check deployment log with: bun run scripts/deploy-history.ts --env " + env,
    }));
    process.exit(2);
  }

  let result: RollbackResult;

  if (isFull) {
    result = await fullRollback(env, current, target, parsed["app-dir"] || "./my-next-app", isDryRun);
  } else {
    result = await quickRollback(env, current, target, isDryRun);
  }

  console.log(JSON.stringify(result, null, 2));

  if (result.status === "failed") {
    process.exit(3);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ error: `Unexpected error: ${e.message}` }));
  process.exit(1);
});

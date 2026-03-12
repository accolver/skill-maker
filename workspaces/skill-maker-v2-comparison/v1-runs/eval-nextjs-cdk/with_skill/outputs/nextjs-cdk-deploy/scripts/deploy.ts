#!/usr/bin/env bun
/**
 * deploy.ts
 *
 * Deploys a Next.js application to AWS using CDK. Handles the full pipeline:
 * build, synth, diff, deploy, health check, and deployment logging.
 *
 * Usage:
 *   bun run scripts/deploy.ts --env <environment> --app-dir <path> [options]
 *   bun run scripts/deploy.ts --help
 *
 * Output: JSON deployment result to stdout.
 * Exit codes: 0 = success, 1 = error, 2 = build failed, 3 = deploy failed,
 *             4 = health check failed
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join, resolve } from "path";

interface DeployResult {
  environment: string;
  status: "success" | "failed" | "rolled_back";
  startTime: string;
  endTime: string;
  durationMs: number;
  gitCommit: string;
  gitBranch: string;
  stackOutputs: Record<string, string>;
  lambdaVersion: string;
  cloudfrontDistributionId: string;
  invalidationId: string;
  healthCheckPassed: boolean;
  deploymentLogEntry: string;
}

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

function printHelp(): void {
  console.error(`
deploy.ts — Deploy Next.js to AWS via CDK

USAGE:
  bun run scripts/deploy.ts --env <environment> --app-dir <path> [options]

OPTIONS:
  --env <environment>     Target environment (staging, production)
  --app-dir <path>        Path to the Next.js application root
  --cdk-dir <path>        Path to CDK directory (default: ./cdk)
  --skip-build            Skip the Next.js build step (use existing build)
  --skip-diff             Skip cdk diff (go straight to deploy)
  --require-approval <v>  CDK approval level: never, broadening, any-change
                          Default: never for staging, broadening for production
  --dry-run               Run synth and diff only, do not deploy
  --help                  Show this help message

PIPELINE:
  1. Build Next.js app for the target environment
  2. cdk synth to generate CloudFormation template
  3. cdk diff to show pending changes
  4. cdk deploy to apply changes
  5. Post-deployment health check
  6. CloudFront cache invalidation
  7. Record deployment in log

EXIT CODES:
  0  Success
  1  Error (invalid arguments, missing files)
  2  Next.js build failed
  3  CDK deploy failed
  4  Health check failed (deployment succeeded but app is unhealthy)

EXAMPLES:
  bun run scripts/deploy.ts --env staging --app-dir ./my-app
  bun run scripts/deploy.ts --env production --app-dir ./my-app
  bun run scripts/deploy.ts --env staging --app-dir ./my-app --dry-run
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

function getGitInfo(dir: string): { commit: string; branch: string } {
  try {
    const commit = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: dir })
      .stdout.toString().trim();
    const branch = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir })
      .stdout.toString().trim();
    return { commit: commit || "unknown", branch: branch || "unknown" };
  } catch {
    return { commit: "unknown", branch: "unknown" };
  }
}

function runCommand(cmd: string[], cwd: string, env?: Record<string, string>): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const proc = Bun.spawnSync(cmd, {
    cwd,
    env: { ...process.env as Record<string, string>, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

function appendDeploymentLog(logPath: string, entry: DeploymentLogEntry): void {
  const logDir = join(logPath, "..");
  mkdirSync(logDir, { recursive: true });

  let log: DeploymentLogEntry[] = [];
  if (existsSync(logPath)) {
    try {
      log = JSON.parse(readFileSync(logPath, "utf-8"));
    } catch {
      log = [];
    }
  }

  log.push(entry);
  writeFileSync(logPath, JSON.stringify(log, null, 2));
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

  if (!parsed["app-dir"]) {
    console.error(JSON.stringify({ error: "Missing required --app-dir argument" }));
    process.exit(1);
  }

  const env = parsed.env;
  const appDir = resolve(parsed["app-dir"]);
  const cdkDir = resolve(parsed["cdk-dir"] || "./cdk");
  const isDryRun = parsed["dry-run"] === "true";
  const skipBuild = parsed["skip-build"] === "true";
  const skipDiff = parsed["skip-diff"] === "true";
  const requireApproval = parsed["require-approval"] || (env === "production" ? "broadening" : "never");

  const startTime = new Date();
  const gitInfo = getGitInfo(appDir);

  console.error(`\n========================================`);
  console.error(`  Deploying to: ${env.toUpperCase()}`);
  console.error(`  App: ${appDir}`);
  console.error(`  CDK: ${cdkDir}`);
  console.error(`  Git: ${gitInfo.commit.slice(0, 8)} (${gitInfo.branch})`);
  console.error(`  Dry run: ${isDryRun}`);
  console.error(`========================================\n`);

  // Step 1: Build Next.js app
  if (!skipBuild) {
    console.error("Step 1/6: Building Next.js app...");
    const buildResult = runCommand(
      ["bun", "run", "scripts/build-nextjs.ts", "--env", env, "--app-dir", appDir],
      resolve(".")
    );
    if (buildResult.exitCode !== 0) {
      console.error("Build failed:");
      console.error(buildResult.stderr);
      process.exit(2);
    }
    console.error("  Build complete.");
  } else {
    console.error("Step 1/6: Skipping build (--skip-build)");
  }

  // Step 2: CDK synth
  console.error("Step 2/6: Synthesizing CDK stack...");
  const synthResult = runCommand(
    ["npx", "cdk", "synth", "-c", `env=${env}`, "--quiet"],
    cdkDir
  );
  if (synthResult.exitCode !== 0) {
    console.error("CDK synth failed:");
    console.error(synthResult.stderr);
    process.exit(3);
  }
  console.error("  Synth complete.");

  // Step 3: CDK diff
  if (!skipDiff) {
    console.error("Step 3/6: Running CDK diff...");
    const diffResult = runCommand(
      ["npx", "cdk", "diff", "-c", `env=${env}`],
      cdkDir
    );
    console.error(diffResult.stdout);
    if (diffResult.exitCode !== 0 && diffResult.exitCode !== 1) {
      // Exit code 1 from cdk diff means there are changes (expected)
      console.error("CDK diff failed unexpectedly:");
      console.error(diffResult.stderr);
      process.exit(3);
    }
  } else {
    console.error("Step 3/6: Skipping diff (--skip-diff)");
  }

  if (isDryRun) {
    console.error("\nDry run complete. No changes deployed.");
    console.log(JSON.stringify({
      environment: env,
      status: "dry_run",
      gitCommit: gitInfo.commit,
      gitBranch: gitInfo.branch,
    }, null, 2));
    process.exit(0);
  }

  // Step 4: CDK deploy
  console.error(`Step 4/6: Deploying to ${env}...`);
  const deployResult = runCommand(
    [
      "npx", "cdk", "deploy",
      "-c", `env=${env}`,
      "--require-approval", requireApproval,
      "--outputs-file", "cdk-outputs.json",
    ],
    cdkDir
  );
  if (deployResult.exitCode !== 0) {
    console.error("CDK deploy failed:");
    console.error(deployResult.stderr);

    const failedResult: DeployResult = {
      environment: env,
      status: "failed",
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - startTime.getTime(),
      gitCommit: gitInfo.commit,
      gitBranch: gitInfo.branch,
      stackOutputs: {},
      lambdaVersion: "",
      cloudfrontDistributionId: "",
      invalidationId: "",
      healthCheckPassed: false,
      deploymentLogEntry: "",
    };
    console.log(JSON.stringify(failedResult, null, 2));
    process.exit(3);
  }
  console.error("  Deploy complete.");

  // Parse stack outputs
  let stackOutputs: Record<string, string> = {};
  const outputsPath = join(cdkDir, "cdk-outputs.json");
  if (existsSync(outputsPath)) {
    try {
      const outputs = JSON.parse(readFileSync(outputsPath, "utf-8"));
      stackOutputs = Object.values(outputs).reduce((acc: Record<string, string>, stack: any) => {
        return { ...acc, ...stack };
      }, {} as Record<string, string>);
    } catch {
      console.error("  Warning: Could not parse CDK outputs");
    }
  }

  const distributionId = stackOutputs.CloudFrontDistributionId || stackOutputs.DistributionId || "";
  const lambdaVersion = stackOutputs.LambdaVersion || stackOutputs.FunctionVersion || "";

  // Step 5: Health check
  console.error("Step 5/6: Running health check...");
  const healthUrl = stackOutputs.SiteUrl || stackOutputs.CloudFrontUrl || "";
  let healthCheckPassed = false;

  if (healthUrl) {
    const healthResult = runCommand(
      ["bun", "run", "scripts/validate-deployment.ts", "--env", env, "--url", healthUrl],
      resolve(".")
    );
    healthCheckPassed = healthResult.exitCode === 0;
    if (!healthCheckPassed) {
      console.error(`  Health check FAILED for ${healthUrl}`);
    } else {
      console.error(`  Health check passed for ${healthUrl}`);
    }
  } else {
    console.error("  Warning: No URL found in stack outputs, skipping health check");
  }

  // Step 6: CloudFront invalidation
  console.error("Step 6/6: Invalidating CloudFront cache...");
  let invalidationId = "";
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
      try {
        const invalidation = JSON.parse(invalidateResult.stdout);
        invalidationId = invalidation.Invalidation?.Id || "";
        console.error(`  Invalidation created: ${invalidationId}`);
      } catch {
        console.error("  Warning: Could not parse invalidation response");
      }
    } else {
      console.error("  Warning: CloudFront invalidation failed");
    }
  } else {
    console.error("  Warning: No distribution ID found, skipping invalidation");
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  // Record deployment
  const logEntry: DeploymentLogEntry = {
    timestamp: endTime.toISOString(),
    environment: env,
    gitCommit: gitInfo.commit,
    gitBranch: gitInfo.branch,
    lambdaVersion,
    cloudfrontDistributionId: distributionId,
    status: healthCheckPassed ? "success" : "deployed_unhealthy",
    durationMs,
  };

  const logPath = resolve(`./deployments/${env}-deploy-log.json`);
  appendDeploymentLog(logPath, logEntry);

  const result: DeployResult = {
    environment: env,
    status: healthCheckPassed ? "success" : "failed",
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMs,
    gitCommit: gitInfo.commit,
    gitBranch: gitInfo.branch,
    stackOutputs,
    lambdaVersion,
    cloudfrontDistributionId: distributionId,
    invalidationId,
    healthCheckPassed,
    deploymentLogEntry: logPath,
  };

  console.log(JSON.stringify(result, null, 2));

  if (!healthCheckPassed && healthUrl) {
    console.error(`\n⚠️  Deployment succeeded but health check failed.`);
    console.error(`  Consider rolling back: bun run scripts/rollback.ts --env ${env}`);
    process.exit(4);
  }

  if (env === "staging") {
    console.error(`\n✅ Staging deployment validated successfully.`);
    console.error(`\nReady to deploy to production?`);
    console.error(`  Staging URL: ${healthUrl}`);
    console.error(`\nTo proceed: bun run scripts/deploy.ts --env production --app-dir ${appDir}`);
    console.error(`To abort:   No action needed.`);
  } else {
    console.error(`\n✅ Production deployment complete.`);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ error: `Unexpected error: ${e.message}` }));
  process.exit(1);
});

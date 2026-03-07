#!/usr/bin/env bun

/**
 * deploy.ts — Orchestrates the Next.js CDK deployment pipeline.
 *
 * Runs build, synth, and deploy stages for a target environment.
 * Outputs structured JSON to stdout for agent consumption.
 */

const HELP = `
deploy.ts — Deploy a Next.js application to AWS using CDK

USAGE:
  bun run scripts/deploy.ts --env <environment> [options]

OPTIONS:
  --env <name>        Target environment: staging | production (required)
  --stage <stage>     Run a specific stage only: build | synth | deploy | all (default: all)
  --config-dir <dir>  Path to config directory (default: ./config)
  --cdk-dir <dir>     Path to CDK app directory (default: ./infra)
  --app-dir <dir>     Path to Next.js app directory (default: .)
  --outputs-file <f>  Path to save CDK outputs JSON (default: cdk-outputs-<env>.json)
  --skip-diff         Skip the cdk diff step before deploying
  --dry-run           Show what would be executed without running commands
  --help              Show this help message

EXAMPLES:
  # Full deploy to staging
  bun run scripts/deploy.ts --env staging

  # Build only
  bun run scripts/deploy.ts --env staging --stage build

  # Deploy to production with custom config directory
  bun run scripts/deploy.ts --env production --config-dir ./deploy/config

  # Dry run to see what commands would execute
  bun run scripts/deploy.ts --env production --dry-run

OUTPUT (JSON to stdout):
  {
    "success": true,
    "environment": "staging",
    "stages": {
      "build": { "status": "passed", "duration_ms": 12340 },
      "synth": { "status": "passed", "duration_ms": 3210 },
      "deploy": { "status": "passed", "duration_ms": 45670 }
    },
    "outputs_file": "cdk-outputs-staging.json",
    "timestamp": "2025-01-15T10:30:00Z"
  }

EXIT CODES:
  0  All stages completed successfully
  1  Invalid arguments or missing configuration
  2  Build stage failed
  3  Synth stage failed
  4  Deploy stage failed
  5  CDK diff showed unexpected changes (when not using --skip-diff)
`;

import { $ } from "bun";
import { existsSync } from "fs";
import { resolve } from "path";

interface StageResult {
  status: "passed" | "failed" | "skipped";
  duration_ms: number;
  error?: string;
}

interface DeployResult {
  success: boolean;
  environment: string;
  stages: Record<string, StageResult>;
  outputs_file: string | null;
  timestamp: string;
  dry_run: boolean;
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--skip-diff") {
      parsed["skip-diff"] = true;
    } else if (arg === "--dry-run") {
      parsed["dry-run"] = true;
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      parsed[arg.slice(2)] = args[++i];
    }
  }
  return parsed;
}

async function runStage(
  name: string,
  command: string,
  dryRun: boolean
): Promise<StageResult> {
  const start = Date.now();

  if (dryRun) {
    console.error(`[dry-run] Would execute: ${command}`);
    return { status: "passed", duration_ms: 0 };
  }

  console.error(`[deploy] Running stage: ${name}`);
  console.error(`[deploy] Command: ${command}`);

  try {
    const result = await $`sh -c ${command}`.quiet();
    const duration_ms = Date.now() - start;

    if (result.exitCode !== 0) {
      return {
        status: "failed",
        duration_ms,
        error: result.stderr.toString().slice(0, 500),
      };
    }

    console.error(`[deploy] Stage ${name} completed in ${duration_ms}ms`);
    return { status: "passed", duration_ms };
  } catch (err: any) {
    return {
      status: "failed",
      duration_ms: Date.now() - start,
      error: err.message?.slice(0, 500) || "Unknown error",
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.error(HELP);
    process.exit(0);
  }

  const env = args.env as string;
  if (!env || !["staging", "production"].includes(env)) {
    console.error(
      "[deploy] Error: --env is required and must be 'staging' or 'production'"
    );
    console.error("Run with --help for usage information.");
    const result: DeployResult = {
      success: false,
      environment: env || "unknown",
      stages: {},
      outputs_file: null,
      timestamp: new Date().toISOString(),
      dry_run: false,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const stage = (args.stage as string) || "all";
  const configDir = resolve((args["config-dir"] as string) || "./config");
  const cdkDir = resolve((args["cdk-dir"] as string) || "./infra");
  const appDir = resolve((args["app-dir"] as string) || ".");
  const outputsFile =
    (args["outputs-file"] as string) || `cdk-outputs-${env}.json`;
  const skipDiff = !!args["skip-diff"];
  const dryRun = !!args["dry-run"];

  const stages: Record<string, StageResult> = {};
  const runAll = stage === "all";

  // Validate config exists
  const configFile = `${configDir}/${env}.ts`;
  if (!dryRun && !existsSync(configFile)) {
    // Also check for .js extension
    const configFileJs = `${configDir}/${env}.js`;
    if (!existsSync(configFileJs)) {
      console.error(
        `[deploy] Error: Config file not found: ${configFile} or ${configFileJs}`
      );
      const result: DeployResult = {
        success: false,
        environment: env,
        stages: {},
        outputs_file: null,
        timestamp: new Date().toISOString(),
        dry_run: dryRun,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  }

  // Stage: build
  if (runAll || stage === "build") {
    const buildCmd = `cd ${appDir} && rm -rf .next out && NODE_ENV=production npm run build`;
    stages.build = await runStage("build", buildCmd, dryRun);
    if (stages.build.status === "failed") {
      const result: DeployResult = {
        success: false,
        environment: env,
        stages,
        outputs_file: null,
        timestamp: new Date().toISOString(),
        dry_run: dryRun,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(2);
    }
  }

  // Stage: synth
  if (runAll || stage === "synth") {
    const synthCmd = `cd ${cdkDir} && cdk synth --context env=${env} --output cdk.out/${env}`;
    stages.synth = await runStage("synth", synthCmd, dryRun);
    if (stages.synth.status === "failed") {
      const result: DeployResult = {
        success: false,
        environment: env,
        stages,
        outputs_file: null,
        timestamp: new Date().toISOString(),
        dry_run: dryRun,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(3);
    }

    // Run diff unless skipped
    if (!skipDiff) {
      const diffCmd = `cd ${cdkDir} && cdk diff --context env=${env}`;
      const diffResult = await runStage("diff", diffCmd, dryRun);
      stages.diff = diffResult;
      // diff exit code 1 means there ARE differences (expected), only fail on error
      if (diffResult.status === "failed" && diffResult.error?.includes("Error")) {
        const result: DeployResult = {
          success: false,
          environment: env,
          stages,
          outputs_file: null,
          timestamp: new Date().toISOString(),
          dry_run: dryRun,
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(5);
      }
    }
  }

  // Stage: deploy
  if (runAll || stage === "deploy") {
    const deployCmd = `cd ${cdkDir} && cdk deploy --context env=${env} --require-approval never --outputs-file ${resolve(outputsFile)}`;
    stages.deploy = await runStage("deploy", deployCmd, dryRun);
    if (stages.deploy.status === "failed") {
      const result: DeployResult = {
        success: false,
        environment: env,
        stages,
        outputs_file: null,
        timestamp: new Date().toISOString(),
        dry_run: dryRun,
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(4);
    }
  }

  const result: DeployResult = {
    success: true,
    environment: env,
    stages,
    outputs_file: outputsFile,
    timestamp: new Date().toISOString(),
    dry_run: dryRun,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main();

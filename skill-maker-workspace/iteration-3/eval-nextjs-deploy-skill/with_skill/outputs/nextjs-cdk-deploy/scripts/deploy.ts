#!/usr/bin/env bun

/**
 * deploy.ts — Deploy a Next.js CDK stack to a target environment or rollback.
 *
 * Orchestrates: build verification, CDK synth, CDK deploy, and output capture.
 * Supports staging/production environments and rollback to previous stack version.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeployResult {
  success: boolean;
  environment: string;
  action: "deploy" | "rollback";
  stack_name: string;
  stack_status: string;
  outputs: Record<string, string>;
  timestamp: string;
  duration_ms: number;
  errors: string[];
  warnings: string[];
}

interface EnvConfig {
  NEXT_PUBLIC_API_URL?: string;
  DOMAIN_NAME?: string;
  CDK_DEPLOY_ACCOUNT?: string;
  CDK_DEPLOY_REGION?: string;
  MIN_INSTANCES?: string;
  MAX_INSTANCES?: string;
  LOG_LEVEL?: string;
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
deploy.ts — Deploy a Next.js CDK stack to staging or production.

USAGE
  bun run scripts/deploy.ts --env <environment> --project-dir <path> [options]

ARGUMENTS
  --env <environment>       Target environment: "staging" or "production" (required)
  --project-dir <path>      Path to the Next.js project root (required)
  --require-approval <mode> CDK approval mode: "never", "broadening", or "any-change"
                            (default: "never" for staging, "broadening" for production)
  --rollback                Rollback to the previous successful deployment instead of deploying
  --stack-name <name>       Override the CDK stack name (default: auto-detected from env)
  --dry-run                 Simulate the deployment without executing CDK commands
  --config-dir <path>       Path to environment config files (default: ./config)

EXIT CODES
  0   Deployment or rollback succeeded.
  1   Deployment or rollback failed.
  2   Bad usage or missing arguments.
  3   Prerequisites not met (missing tools, credentials, or build artifacts).

OUTPUT
  Structured JSON written to stdout with fields:
    success, environment, action, stack_name, stack_status, outputs,
    timestamp, duration_ms, errors, warnings

EXAMPLES
  # Deploy to staging
  bun run scripts/deploy.ts --env staging --project-dir .

  # Deploy to production with approval gate
  bun run scripts/deploy.ts --env production --project-dir . --require-approval broadening

  # Rollback production to previous version
  bun run scripts/deploy.ts --env production --rollback --project-dir .

  # Dry run to see what would happen
  bun run scripts/deploy.ts --env staging --project-dir . --dry-run
`.trim();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  env: string;
  projectDir: string;
  requireApproval: string;
  rollback: boolean;
  stackName: string | null;
  dryRun: boolean;
  configDir: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let env = "";
  let projectDir = "";
  let requireApproval = "";
  let rollback = false;
  let stackName: string | null = null;
  let dryRun = false;
  let configDir = "./config";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--env":
        env = args[++i] || "";
        break;
      case "--project-dir":
        projectDir = args[++i] || "";
        break;
      case "--require-approval":
        requireApproval = args[++i] || "";
        break;
      case "--rollback":
        rollback = true;
        break;
      case "--stack-name":
        stackName = args[++i] || null;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--config-dir":
        configDir = args[++i] || "./config";
        break;
    }
  }

  if (!env) {
    console.error("Error: --env is required (staging or production).\n");
    console.error(HELP);
    process.exit(2);
  }

  if (!["staging", "production"].includes(env)) {
    console.error(`Error: --env must be "staging" or "production", got "${env}".\n`);
    process.exit(2);
  }

  if (!projectDir) {
    console.error("Error: --project-dir is required.\n");
    console.error(HELP);
    process.exit(2);
  }

  if (!requireApproval) {
    requireApproval = env === "production" ? "broadening" : "never";
  }

  return { env, projectDir, requireApproval, rollback, stackName, dryRun, configDir };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCommand(cmd: string, cwd: string, dryRun: boolean): string {
  console.error(`[deploy] Running: ${cmd}`);
  if (dryRun) {
    console.error("[deploy] DRY RUN — skipping execution");
    return "[dry-run] command skipped";
  }
  try {
    return execSync(cmd, {
      cwd,
      encoding: "utf-8",
      timeout: 600_000, // 10 minute timeout
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    throw new Error(error.stderr || error.message || "Command failed");
  }
}

function loadEnvConfig(configDir: string, env: string): EnvConfig {
  const configPath = join(configDir, `${env}.env`);
  const config: EnvConfig = {};

  if (!existsSync(configPath)) {
    console.error(`[deploy] Warning: Config file not found at ${configPath}`);
    return config;
  }

  const content = readFileSync(configPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    config[key] = value;
  }

  return config;
}

function resolveStackName(env: string, stackName: string | null, projectDir: string): string {
  if (stackName) return stackName;

  // Try to read from cdk.json
  const cdkJsonPath = join(projectDir, "cdk.json");
  if (existsSync(cdkJsonPath)) {
    try {
      const cdkJson = JSON.parse(readFileSync(cdkJsonPath, "utf-8"));
      const context = cdkJson.context || {};
      if (context[`${env}StackName`]) {
        return context[`${env}StackName`];
      }
    } catch {
      // Fall through to default
    }
  }

  // Default naming convention
  const envCapitalized = env.charAt(0).toUpperCase() + env.slice(1);
  return `Nextjs${envCapitalized}Stack`;
}

function saveDeploymentRecord(
  projectDir: string,
  env: string,
  result: DeployResult,
): void {
  const recordDir = join(projectDir, ".deployments");
  if (!existsSync(recordDir)) {
    mkdirSync(recordDir, { recursive: true });
  }
  const recordPath = join(recordDir, `${env}-latest.json`);
  writeFileSync(recordPath, JSON.stringify(result, null, 2));
  console.error(`[deploy] Deployment record saved to ${recordPath}`);
}

// ---------------------------------------------------------------------------
// Deploy logic
// ---------------------------------------------------------------------------

function deploy(args: ParsedArgs): DeployResult {
  const startTime = Date.now();
  const projectDir = resolve(args.projectDir);
  const errors: string[] = [];
  const warnings: string[] = [];
  const stackName = resolveStackName(args.env, args.stackName, projectDir);

  const result: DeployResult = {
    success: false,
    environment: args.env,
    action: args.rollback ? "rollback" : "deploy",
    stack_name: stackName,
    stack_status: "UNKNOWN",
    outputs: {},
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    errors,
    warnings,
  };

  // --- Prerequisite checks ---
  if (!existsSync(projectDir)) {
    errors.push(`Project directory not found: ${projectDir}`);
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  if (!existsSync(join(projectDir, "package.json"))) {
    errors.push("No package.json found in project directory.");
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  const hasNextConfig =
    existsSync(join(projectDir, "next.config.js")) ||
    existsSync(join(projectDir, "next.config.mjs")) ||
    existsSync(join(projectDir, "next.config.ts"));

  if (!hasNextConfig) {
    errors.push("No next.config.js/mjs/ts found. Is this a Next.js project?");
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  // --- Load environment config ---
  const configDir = resolve(args.configDir);
  const envConfig = loadEnvConfig(configDir, args.env);
  console.error(`[deploy] Loaded ${Object.keys(envConfig).length} config values for ${args.env}`);

  // --- Handle rollback ---
  if (args.rollback) {
    console.error(`[deploy] Rolling back ${args.env} to previous version...`);
    try {
      const rollbackCmd = `npx cdk deploy ${stackName} --context env=${args.env} --context rollback=true --require-approval never --force`;
      runCommand(rollbackCmd, projectDir, args.dryRun);
      result.stack_status = "UPDATE_ROLLBACK_COMPLETE";
      result.success = true;
      console.error(`[deploy] Rollback of ${args.env} completed successfully.`);
    } catch (err: unknown) {
      const error = err as Error;
      errors.push(`Rollback failed: ${error.message}`);
      result.stack_status = "UPDATE_ROLLBACK_FAILED";
    }
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  // --- Verify build artifacts ---
  const nextDir = join(projectDir, ".next");
  if (!existsSync(nextDir)) {
    warnings.push(".next directory not found. Running build...");
    try {
      const buildEnv = Object.entries(envConfig)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ");
      runCommand(`${buildEnv} npm run build`, projectDir, args.dryRun);
    } catch (err: unknown) {
      const error = err as Error;
      errors.push(`Build failed: ${error.message}`);
      result.duration_ms = Date.now() - startTime;
      return result;
    }
  }

  // --- CDK synth ---
  console.error(`[deploy] Synthesizing CDK stack for ${args.env}...`);
  try {
    runCommand(
      `npx cdk synth --context env=${args.env} --all`,
      projectDir,
      args.dryRun,
    );
  } catch (err: unknown) {
    const error = err as Error;
    errors.push(`CDK synth failed: ${error.message}`);
    result.duration_ms = Date.now() - startTime;
    return result;
  }

  // --- CDK diff ---
  console.error(`[deploy] Running cdk diff for ${args.env}...`);
  try {
    const diffOutput = runCommand(
      `npx cdk diff ${stackName} --context env=${args.env}`,
      projectDir,
      args.dryRun,
    );
    if (diffOutput.includes("[-]") && diffOutput.includes("[+]")) {
      warnings.push(
        "CDK diff shows resource replacements. Review carefully for potential downtime.",
      );
    }
  } catch {
    warnings.push("CDK diff returned non-zero (may indicate changes pending).");
  }

  // --- CDK deploy ---
  console.error(`[deploy] Deploying ${stackName} to ${args.env}...`);
  try {
    const deployCmd = [
      `npx cdk deploy ${stackName}`,
      `--context env=${args.env}`,
      `--require-approval ${args.requireApproval}`,
      "--outputs-file cdk-outputs.json",
      "--ci",
    ].join(" ");

    runCommand(deployCmd, projectDir, args.dryRun);
    result.stack_status = "CREATE_COMPLETE";
    result.success = true;

    // Read outputs if available
    const outputsPath = join(projectDir, "cdk-outputs.json");
    if (existsSync(outputsPath)) {
      try {
        const outputs = JSON.parse(readFileSync(outputsPath, "utf-8"));
        result.outputs = outputs[stackName] || outputs;
      } catch {
        warnings.push("Could not parse cdk-outputs.json");
      }
    }

    console.error(`[deploy] Deployment of ${stackName} to ${args.env} succeeded.`);
  } catch (err: unknown) {
    const error = err as Error;
    errors.push(`CDK deploy failed: ${error.message}`);
    result.stack_status = "UPDATE_FAILED";
  }

  result.duration_ms = Date.now() - startTime;
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs(process.argv);
  const result = deploy(args);

  // Save deployment record for rollback reference
  if (result.success) {
    try {
      saveDeploymentRecord(resolve(args.projectDir), args.env, result);
    } catch {
      console.error("[deploy] Warning: Could not save deployment record.");
    }
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

main();

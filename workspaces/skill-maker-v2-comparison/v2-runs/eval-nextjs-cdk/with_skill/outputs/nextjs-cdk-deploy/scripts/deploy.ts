#!/usr/bin/env bun
/**
 * deploy.ts - Deploy Next.js CDK stack to a specific environment
 *
 * Builds the Next.js app with environment-specific NEXT_PUBLIC_* vars,
 * synthesizes the CDK stack, and deploys to the target environment.
 *
 * Usage:
 *   bun run scripts/deploy.ts --env staging
 *   bun run scripts/deploy.ts --env production
 *   bun run scripts/deploy.ts --env staging --skip-build
 *   bun run scripts/deploy.ts --help
 *
 * Exit codes:
 *   0  - Deployment succeeded
 *   1  - Invalid arguments or missing config
 *   2  - Build failed
 *   3  - CDK synth failed
 *   4  - CDK deploy failed
 *   5  - Smoke test failed (staging only)
 */

import { parseArgs } from "util";
import { $ } from "bun";

const VALID_ENVS = ["staging", "production"] as const;
type Environment = (typeof VALID_ENVS)[number];

function printHelp(): void {
  console.log(`
deploy.ts - Deploy Next.js CDK stack to a specific environment

USAGE:
  bun run scripts/deploy.ts --env <environment> [options]

OPTIONS:
  --env <env>       Target environment: staging | production (required)
  --skip-build      Skip the Next.js build step (use existing .next output)
  --skip-smoke      Skip post-deployment smoke tests
  --require-approval  Require CDK approval for changes (default: true for production)
  --verbose         Show detailed CDK output
  --help            Show this help message

EXAMPLES:
  # Deploy to staging (builds, deploys, runs smoke tests)
  bun run scripts/deploy.ts --env staging

  # Deploy to production (builds, deploys, skips smoke tests by default)
  bun run scripts/deploy.ts --env production

  # Redeploy without rebuilding
  bun run scripts/deploy.ts --env staging --skip-build

ENVIRONMENT VARIABLES:
  CDK_STAGING_ACCOUNT      AWS account ID for staging
  CDK_PRODUCTION_ACCOUNT   AWS account ID for production
  AWS_REGION               AWS region (default: us-east-1)
  `);
}

async function loadEnvironmentConfig(env: Environment): Promise<Record<string, string>> {
  // Load environment-specific NEXT_PUBLIC_* vars for the build
  const configPath = `${import.meta.dir}/../config/environments.ts`;
  try {
    const config = await import(configPath);
    return config.environments[env]?.nextPublicVars ?? {};
  } catch {
    console.error(`[deploy] Warning: Could not load config from ${configPath}, using defaults`);
    return {};
  }
}

async function buildNextApp(env: Environment, verbose: boolean): Promise<void> {
  console.error(`[deploy] Building Next.js app for ${env}...`);

  const envVars = await loadEnvironmentConfig(env);
  const envString = Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");

  const buildCmd = `${envString} npm run build`;
  console.error(`[deploy] Running: ${buildCmd}`);

  const result = await $`env ${Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join(" ")} npm run build`.quiet();

  if (result.exitCode !== 0) {
    console.error(`[deploy] Build failed with exit code ${result.exitCode}`);
    if (verbose) {
      console.error(result.stderr.toString());
    }
    process.exit(2);
  }

  console.error(`[deploy] Build succeeded for ${env}`);
}

async function synthStack(env: Environment, verbose: boolean): Promise<void> {
  console.error(`[deploy] Synthesizing CDK stack for ${env}...`);

  const result = await $`npx cdk synth --context env=${env}`.quiet();

  if (result.exitCode !== 0) {
    console.error(`[deploy] CDK synth failed with exit code ${result.exitCode}`);
    if (verbose) {
      console.error(result.stderr.toString());
    }
    process.exit(3);
  }

  console.error(`[deploy] CDK synth succeeded for ${env}`);
}

async function deployStack(env: Environment, requireApproval: boolean, verbose: boolean): Promise<void> {
  console.error(`[deploy] Deploying CDK stack to ${env}...`);

  const approvalFlag = requireApproval ? "--require-approval broadening" : "--require-approval never";
  const verboseFlag = verbose ? "--verbose" : "";

  const result = await $`npx cdk deploy --context env=${env} ${approvalFlag} ${verboseFlag} --outputs-file cdk-outputs-${env}.json`.quiet();

  if (result.exitCode !== 0) {
    console.error(`[deploy] CDK deploy failed with exit code ${result.exitCode}`);
    if (verbose) {
      console.error(result.stderr.toString());
    }
    process.exit(4);
  }

  console.error(`[deploy] CDK deploy succeeded for ${env}`);
}

async function runSmokeTests(env: Environment): Promise<void> {
  console.error(`[deploy] Running smoke tests for ${env}...`);

  try {
    const result = await $`bun run scripts/smoke-test.ts --env ${env}`.quiet();

    if (result.exitCode !== 0) {
      console.error(`[deploy] Smoke tests failed for ${env}`);
      process.exit(5);
    }

    console.error(`[deploy] Smoke tests passed for ${env}`);
  } catch {
    console.error(`[deploy] Warning: Could not run smoke tests (script may not exist yet)`);
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      env: { type: "string" },
      "skip-build": { type: "boolean", default: false },
      "skip-smoke": { type: "boolean", default: false },
      "require-approval": { type: "boolean" },
      verbose: { type: "boolean", default: false },
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
    console.error(`[deploy] Error: --env must be one of: ${VALID_ENVS.join(", ")}`);
    process.exit(1);
  }

  const requireApproval = values["require-approval"] ?? env === "production";
  const verbose = values.verbose!;
  const skipBuild = values["skip-build"]!;
  const skipSmoke = values["skip-smoke"]!;

  console.error(`[deploy] Starting deployment to ${env}`);
  console.error(`[deploy]   require-approval: ${requireApproval}`);
  console.error(`[deploy]   skip-build: ${skipBuild}`);
  console.error(`[deploy]   skip-smoke: ${skipSmoke}`);

  // Step 1: Build
  if (!skipBuild) {
    await buildNextApp(env, verbose);
  }

  // Step 2: Synth
  await synthStack(env, verbose);

  // Step 3: Deploy
  await deployStack(env, requireApproval, verbose);

  // Step 4: Smoke tests (staging by default)
  if (!skipSmoke && env === "staging") {
    await runSmokeTests(env);
  }

  // Output summary
  const summary = {
    status: "success",
    environment: env,
    timestamp: new Date().toISOString(),
    skippedBuild: skipBuild,
    skippedSmoke: skipSmoke || env === "production",
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(`[deploy] Unexpected error: ${err.message}`);
  process.exit(1);
});

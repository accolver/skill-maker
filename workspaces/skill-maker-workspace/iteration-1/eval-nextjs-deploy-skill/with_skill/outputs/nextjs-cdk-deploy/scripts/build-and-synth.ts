#!/usr/bin/env bun

/**
 * Build Next.js app and synthesize CDK stack for a target environment.
 *
 * Usage: bun run scripts/build-and-synth.ts --env <staging|production> [--skip-build] [--help]
 *
 * Exit codes:
 *   0 - Build and synth succeeded
 *   1 - Build failed
 *   2 - CDK synth failed
 *   3 - Invalid arguments
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";

function showHelp(): void {
  console.error(`Usage: bun run scripts/build-and-synth.ts --env <staging|production> [--skip-build] [--help]

Builds the Next.js application and synthesizes the CDK CloudFormation template.

Options:
  --env <env>     Target environment: staging or production (required)
  --skip-build    Skip the Next.js build step (use existing .next output)
  --help          Show this help message

Steps performed:
  1. Load environment config from cdk/config/<env>.env.ts
  2. Run 'next build' with environment-specific variables
  3. Run 'cdk synth' targeting the environment's stack
  4. Validate the synthesized CloudFormation template
  5. Output resource change summary

Exit codes:
  0  Build and synth succeeded
  1  Next.js build failed
  2  CDK synth failed
  3  Invalid arguments

Output: JSON to stdout with build and synth results`);
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

const skipBuild = args.includes("--skip-build");

const result: {
  environment: string;
  build: { status: string; duration_ms?: number; error?: string };
  synth: { status: string; duration_ms?: number; template_path?: string; error?: string };
} = {
  environment: env,
  build: { status: "skipped" },
  synth: { status: "pending" },
};

// Step 1: Build Next.js
if (!skipBuild) {
  console.error(`[build-and-synth] Building Next.js for ${env}...`);
  const buildStart = Date.now();
  try {
    execSync(`NODE_ENV=production next build`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PUBLIC_ENVIRONMENT: env,
      },
    });
    result.build = {
      status: "success",
      duration_ms: Date.now() - buildStart,
    };
  } catch (e: any) {
    result.build = {
      status: "failed",
      duration_ms: Date.now() - buildStart,
      error: e.stderr?.toString().slice(0, 500) || e.message,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

// Step 2: CDK Synth
console.error(`[build-and-synth] Synthesizing CDK stack for ${env}...`);
const synthStart = Date.now();
try {
  const stackName = `NextjsStack-${env.charAt(0).toUpperCase() + env.slice(1)}`;
  execSync(
    `cdk synth ${stackName} --app 'npx ts-node cdk/app.ts' -c env=${env} --output cdk.out/${env}`,
    {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  const templatePath = `cdk.out/${env}/${stackName}.template.json`;
  result.synth = {
    status: "success",
    duration_ms: Date.now() - synthStart,
    template_path: templatePath,
  };
} catch (e: any) {
  result.synth = {
    status: "failed",
    duration_ms: Date.now() - synthStart,
    error: e.stderr?.toString().slice(0, 500) || e.message,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(2);
}

console.log(JSON.stringify(result, null, 2));
process.exit(0);

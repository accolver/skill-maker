#!/usr/bin/env bun

/**
 * preflight-check.ts — Verify all prerequisites for Next.js CDK deployment.
 *
 * Checks: AWS CLI, CDK CLI, Node.js, AWS credentials, required env vars,
 * next.config.js settings, and CDK project structure.
 *
 * Usage: bun run scripts/preflight-check.ts [--env <environment>] [--help]
 * Output: JSON to stdout with check results.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
preflight-check — Verify all prerequisites for Next.js CDK deployment.

USAGE
  bun run scripts/preflight-check.ts [OPTIONS]

OPTIONS
  --env <name>    Target environment to check (staging, production). Default: staging.
  --project-dir   Path to the Next.js project root. Default: current directory.
  --help, -h      Show this help message.

EXIT CODES
  0   All checks passed.
  1   One or more checks failed.

OUTPUT
  Structured JSON to stdout with fields:
    passed: boolean
    checks: Array<{ name, passed, message, severity }>
    summary: { total, passed, failed, warnings }

EXAMPLES
  bun run scripts/preflight-check.ts
  bun run scripts/preflight-check.ts --env production
  bun run scripts/preflight-check.ts --env staging --project-dir /path/to/app
`.trim();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Check {
  name: string;
  passed: boolean;
  message: string;
  severity: "error" | "warning";
}

interface PreflightResult {
  passed: boolean;
  environment: string;
  checks: Check[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------

async function commandExists(cmd: string): Promise<{ exists: boolean; version: string }> {
  try {
    const proc = Bun.spawn(["sh", "-c", `${cmd} --version 2>&1 | head -1`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    return { exists: exitCode === 0, version: output.trim() };
  } catch {
    return { exists: false, version: "" };
  }
}

async function checkAwsCredentials(): Promise<{ valid: boolean; identity: string }> {
  try {
    const proc = Bun.spawn(["aws", "sts", "get-caller-identity", "--output", "json"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode === 0) {
      const identity = JSON.parse(output);
      return { valid: true, identity: identity.Arn || "unknown" };
    }
    return { valid: false, identity: "" };
  } catch {
    return { valid: false, identity: "" };
  }
}

function checkNextConfig(projectDir: string): { valid: boolean; hasStandalone: boolean; message: string } {
  const configPaths = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ];

  for (const configFile of configPaths) {
    const fullPath = resolve(projectDir, configFile);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      const hasStandalone = content.includes("standalone");
      return {
        valid: true,
        hasStandalone,
        message: hasStandalone
          ? `Found ${configFile} with standalone output`
          : `Found ${configFile} but missing output: 'standalone'`,
      };
    }
  }

  return { valid: false, hasStandalone: false, message: "No next.config.{js,mjs,ts} found" };
}

function checkCdkProject(projectDir: string): { valid: boolean; message: string } {
  const cdkJson = resolve(projectDir, "cdk", "cdk.json");
  if (!existsSync(cdkJson)) {
    const altCdkJson = resolve(projectDir, "cdk.json");
    if (existsSync(altCdkJson)) {
      return { valid: true, message: "Found cdk.json in project root" };
    }
    return { valid: false, message: "No cdk/cdk.json found. Run 'cdk init' in a cdk/ subdirectory." };
  }
  return { valid: true, message: "Found cdk/cdk.json" };
}

function checkEnvVars(env: string): { missing: string[]; present: string[] } {
  const required: Record<string, string[]> = {
    staging: ["CDK_DEFAULT_ACCOUNT", "CDK_DEFAULT_REGION"],
    production: ["CDK_DEFAULT_ACCOUNT", "CDK_DEFAULT_REGION"],
  };

  const optional: Record<string, string[]> = {
    staging: ["STAGING_CERT_ARN", "STAGING_DOMAIN"],
    production: ["PRODUCTION_CERT_ARN", "PRODUCTION_DOMAIN"],
  };

  const allVars = [...(required[env] || []), ...(optional[env] || [])];
  const missing: string[] = [];
  const present: string[] = [];

  for (const v of allVars) {
    if (process.env[v]) {
      present.push(v);
    } else {
      missing.push(v);
    }
  }

  return { missing, present };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let env = "staging";
  let projectDir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--env" && args[i + 1]) {
      env = args[i + 1];
      i++;
    } else if (args[i] === "--project-dir" && args[i + 1]) {
      projectDir = resolve(args[i + 1]);
      i++;
    }
  }

  const checks: Check[] = [];

  // 1. AWS CLI
  const awsCli = await commandExists("aws");
  checks.push({
    name: "aws-cli",
    passed: awsCli.exists,
    message: awsCli.exists ? `AWS CLI found: ${awsCli.version}` : "AWS CLI not found. Install: https://aws.amazon.com/cli/",
    severity: "error",
  });

  // 2. CDK CLI
  const cdkCli = await commandExists("npx cdk");
  checks.push({
    name: "cdk-cli",
    passed: cdkCli.exists,
    message: cdkCli.exists ? `CDK CLI found: ${cdkCli.version}` : "CDK CLI not found. Install: npm install -g aws-cdk",
    severity: "error",
  });

  // 3. Node.js
  const node = await commandExists("node");
  checks.push({
    name: "node",
    passed: node.exists,
    message: node.exists ? `Node.js found: ${node.version}` : "Node.js not found",
    severity: "error",
  });

  // 4. AWS credentials
  const creds = await checkAwsCredentials();
  checks.push({
    name: "aws-credentials",
    passed: creds.valid,
    message: creds.valid ? `AWS credentials valid: ${creds.identity}` : "AWS credentials not configured or expired. Run 'aws configure' or set AWS_PROFILE.",
    severity: "error",
  });

  // 5. Environment variables
  const envVars = checkEnvVars(env);
  checks.push({
    name: "env-vars",
    passed: envVars.missing.length === 0,
    message: envVars.missing.length === 0
      ? `All environment variables set: ${envVars.present.join(", ")}`
      : `Missing environment variables: ${envVars.missing.join(", ")}`,
    severity: envVars.missing.length > 2 ? "error" : "warning",
  });

  // 6. next.config.js
  const nextConfig = checkNextConfig(projectDir);
  checks.push({
    name: "next-config",
    passed: nextConfig.valid && nextConfig.hasStandalone,
    message: nextConfig.message,
    severity: nextConfig.valid ? (nextConfig.hasStandalone ? "warning" : "error") : "error",
  });

  // 7. CDK project structure
  const cdkProject = checkCdkProject(projectDir);
  checks.push({
    name: "cdk-project",
    passed: cdkProject.valid,
    message: cdkProject.message,
    severity: "error",
  });

  // Summarize
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed && c.severity === "error").length;
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning").length;

  const result: PreflightResult = {
    passed: failed === 0,
    environment: env,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
      warnings,
    },
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

main();

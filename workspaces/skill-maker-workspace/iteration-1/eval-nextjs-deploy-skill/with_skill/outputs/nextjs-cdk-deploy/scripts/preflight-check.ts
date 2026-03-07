#!/usr/bin/env bun

/**
 * Preflight check for Next.js CDK deployment.
 * Verifies all required tools and configurations are present.
 *
 * Usage: bun run scripts/preflight-check.ts [--help]
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

import { execSync } from "child_process";

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

function showHelp(): void {
  console.error(`Usage: bun run scripts/preflight-check.ts [--help]

Verifies deployment prerequisites:
  - Node.js 18+ is installed
  - AWS CDK CLI v2 is installed
  - AWS CLI is installed and configured with valid credentials
  - Next.js project has a valid package.json with build script

Exit codes:
  0  All checks passed
  1  One or more checks failed

Output: JSON to stdout with check results`);
  process.exit(0);
}

if (process.argv.includes("--help")) {
  showHelp();
}

function runCheck(name: string, fn: () => string): CheckResult {
  try {
    const detail = fn();
    return { name, passed: true, detail };
  } catch (e: any) {
    return { name, passed: false, detail: e.message || String(e) };
  }
}

function checkCommand(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", timeout: 10000 }).trim();
}

const results: CheckResult[] = [];

// Check Node.js version
results.push(
  runCheck("node-version", () => {
    const version = checkCommand("node --version");
    const major = parseInt(version.replace("v", "").split(".")[0], 10);
    if (major < 18) {
      throw new Error(`Node.js 18+ required, found ${version}`);
    }
    return `Node.js ${version}`;
  })
);

// Check AWS CDK CLI
results.push(
  runCheck("cdk-cli", () => {
    const version = checkCommand("cdk --version");
    if (!version.startsWith("2")) {
      throw new Error(`CDK v2 required, found ${version}`);
    }
    return `CDK ${version}`;
  })
);

// Check AWS CLI
results.push(
  runCheck("aws-cli", () => {
    const version = checkCommand("aws --version");
    return version.split(" ")[0];
  })
);

// Check AWS credentials
results.push(
  runCheck("aws-credentials", () => {
    const identity = checkCommand("aws sts get-caller-identity --output json");
    const parsed = JSON.parse(identity);
    return `Account: ${parsed.Account}, ARN: ${parsed.Arn}`;
  })
);

// Check package.json exists and has build script
results.push(
  runCheck("nextjs-project", () => {
    const fs = require("fs");
    if (!fs.existsSync("package.json")) {
      throw new Error("No package.json found in current directory");
    }
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    if (!pkg.scripts?.build) {
      throw new Error("No 'build' script found in package.json");
    }
    if (!pkg.dependencies?.next && !pkg.devDependencies?.next) {
      throw new Error("Next.js not found in dependencies");
    }
    return `Project: ${pkg.name || "unnamed"}, has build script`;
  })
);

const passed = results.every((r) => r.passed);
const summary = {
  passed,
  checks: results,
  total: results.length,
  passing: results.filter((r) => r.passed).length,
  failing: results.filter((r) => !r.passed).length,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(passed ? 0 : 1);

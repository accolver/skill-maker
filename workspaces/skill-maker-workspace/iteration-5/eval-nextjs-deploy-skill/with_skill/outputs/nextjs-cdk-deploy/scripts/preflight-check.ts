#!/usr/bin/env bun

/**
 * preflight-check — Verify prerequisites for Next.js CDK deployment.
 *
 * Checks for required tools, AWS credentials, and project configuration.
 * Can also run post-deployment smoke tests.
 */

const HELP = `
preflight-check — Verify deployment prerequisites and run smoke tests.

USAGE
  bun run scripts/preflight-check.ts
  bun run scripts/preflight-check.ts --post-deploy --env staging

ARGUMENTS
  --post-deploy     Run post-deployment smoke tests instead of preflight
  --env <name>      Environment name (staging, production)
  --url <url>       URL to check for post-deploy verification
  --help            Show this help message

OUTPUT
  JSON to stdout with fields:
    passed          - Boolean, true if all checks pass
    checks          - Array of individual check results
    summary         - Human-readable summary

EXIT CODES
  0   All checks passed
  1   One or more checks failed

EXAMPLES
  bun run scripts/preflight-check.ts
  bun run scripts/preflight-check.ts --post-deploy --env staging --url https://staging.example.com
`.trim();

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

// --- Types ---

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  required: boolean;
}

interface PreflightResult {
  passed: boolean;
  mode: "preflight" | "post-deploy";
  environment: string | null;
  checks: CheckResult[];
  summary: string;
}

// --- Check helpers ---

function checkCommand(name: string, command: string, required: boolean): CheckResult {
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return {
      name,
      passed: true,
      message: output.split("\n")[0] || "OK",
      required,
    };
  } catch {
    return {
      name,
      passed: false,
      message: `${name} not found or command failed`,
      required,
    };
  }
}

function checkFile(name: string, path: string, required: boolean): CheckResult {
  const exists = existsSync(path);
  return {
    name,
    passed: exists,
    message: exists ? `Found: ${path}` : `Not found: ${path}`,
    required,
  };
}

// --- Preflight checks ---

function runPreflightChecks(): CheckResult[] {
  const checks: CheckResult[] = [];

  // Node.js
  checks.push(checkCommand("Node.js", "node --version", true));

  // npm/pnpm/yarn
  checks.push(checkCommand("npm", "npm --version", true));

  // AWS CDK CLI
  checks.push(checkCommand("AWS CDK CLI", "npx cdk --version", true));

  // AWS credentials
  checks.push(
    checkCommand("AWS credentials", "aws sts get-caller-identity --output text --query Account", true)
  );

  // Next.js config
  const nextConfigs = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ];
  const hasNextConfig = nextConfigs.some((f) => existsSync(f));
  checks.push({
    name: "Next.js config",
    passed: hasNextConfig,
    message: hasNextConfig
      ? `Found: ${nextConfigs.find((f) => existsSync(f))}`
      : "No next.config.{js,mjs,ts} found",
    required: true,
  });

  // package.json
  checks.push(checkFile("package.json", "package.json", true));

  // CDK config directory
  checks.push(checkFile("CDK config dir", "cdk/config", false));

  // CDK app entry
  const cdkEntries = ["cdk/bin/app.ts", "cdk/app.ts", "bin/cdk.ts", "cdk.json"];
  const hasCdkEntry = cdkEntries.some((f) => existsSync(f));
  checks.push({
    name: "CDK app entry",
    passed: hasCdkEntry,
    message: hasCdkEntry
      ? `Found: ${cdkEntries.find((f) => existsSync(f))}`
      : "No CDK app entry found (cdk/bin/app.ts, cdk.json, etc.)",
    required: false,
  });

  return checks;
}

// --- Post-deploy checks ---

function runPostDeployChecks(env: string, url?: string): CheckResult[] {
  const checks: CheckResult[] = [];

  // Stack status
  const stackName = `NextJsStack-${env}`;
  checks.push(
    checkCommand(
      `Stack status (${stackName})`,
      `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].StackStatus' --output text`,
      true
    )
  );

  // URL check
  if (url) {
    try {
      const result = execSync(`curl -s -o /dev/null -w "%{http_code}" ${url}`, {
        encoding: "utf-8",
        timeout: 15000,
      }).trim();
      const statusCode = parseInt(result, 10);
      checks.push({
        name: `URL check (${url})`,
        passed: statusCode >= 200 && statusCode < 400,
        message: `HTTP ${statusCode}`,
        required: true,
      });
    } catch {
      checks.push({
        name: `URL check (${url})`,
        passed: false,
        message: "URL unreachable or timed out",
        required: true,
      });
    }
  }

  // CloudWatch recent errors
  checks.push(
    checkCommand(
      "Recent CloudWatch errors",
      `aws logs filter-log-events --log-group-name /aws/lambda/${stackName} --filter-pattern "ERROR" --limit 1 --query 'events[0].message' --output text 2>/dev/null || echo "No errors found"`,
      false
    )
  );

  return checks;
}

// --- Main ---

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  const isPostDeploy = args.includes("--post-deploy");
  const envIdx = args.indexOf("--env");
  const env = envIdx !== -1 ? args[envIdx + 1] : null;
  const urlIdx = args.indexOf("--url");
  const url = urlIdx !== -1 ? args[urlIdx + 1] : undefined;

  let checks: CheckResult[];

  if (isPostDeploy) {
    if (!env) {
      console.error("Error: --env is required with --post-deploy");
      process.exit(1);
    }
    checks = runPostDeployChecks(env, url);
  } else {
    checks = runPreflightChecks();
  }

  const requiredFailed = checks.filter((c) => c.required && !c.passed);
  const allPassed = requiredFailed.length === 0;

  const result: PreflightResult = {
    passed: allPassed,
    mode: isPostDeploy ? "post-deploy" : "preflight",
    environment: env,
    checks,
    summary: allPassed
      ? `All ${checks.filter((c) => c.required).length} required checks passed`
      : `${requiredFailed.length} required check(s) failed: ${requiredFailed.map((c) => c.name).join(", ")}`,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(allPassed ? 0 : 1);
}

main();

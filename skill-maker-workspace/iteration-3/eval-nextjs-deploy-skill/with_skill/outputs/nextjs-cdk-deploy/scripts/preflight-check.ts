#!/usr/bin/env bun

/**
 * preflight-check.ts — Validate prerequisites for Next.js CDK deployment.
 *
 * Checks: Node.js version, CDK CLI, AWS credentials, project structure,
 * Next.js config, and optionally verifies a live deployment.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

interface PreflightResult {
  success: boolean;
  mode: "preflight" | "verify-deployment";
  environment: string | null;
  checks: CheckResult[];
  errors: string[];
  warnings: string[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
preflight-check.ts — Validate prerequisites for Next.js CDK deployment.

USAGE
  bun run scripts/preflight-check.ts --project-dir <path> [options]

ARGUMENTS
  --project-dir <path>        Path to the Next.js project root (required)
  --verify-deployment         Verify a live deployment instead of checking prerequisites
  --env <environment>         Target environment for verification (staging or production)
  --skip-aws                  Skip AWS credential checks (useful for CI with assumed roles)

EXIT CODES
  0   All checks passed.
  1   One or more checks failed.
  2   Bad usage or missing arguments.

OUTPUT
  Structured JSON written to stdout with fields:
    success, mode, environment, checks, errors, warnings, timestamp

EXAMPLES
  # Check prerequisites before deployment
  bun run scripts/preflight-check.ts --project-dir .

  # Verify a live staging deployment
  bun run scripts/preflight-check.ts --project-dir . --verify-deployment --env staging

  # Skip AWS checks in CI
  bun run scripts/preflight-check.ts --project-dir . --skip-aws
`.trim();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  projectDir: string;
  verifyDeployment: boolean;
  env: string | null;
  skipAws: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let projectDir = "";
  let verifyDeployment = false;
  let env: string | null = null;
  let skipAws = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--project-dir":
        projectDir = args[++i] || "";
        break;
      case "--verify-deployment":
        verifyDeployment = true;
        break;
      case "--env":
        env = args[++i] || null;
        break;
      case "--skip-aws":
        skipAws = true;
        break;
    }
  }

  if (!projectDir) {
    console.error("Error: --project-dir is required.\n");
    console.error(HELP);
    process.exit(2);
  }

  if (verifyDeployment && !env) {
    console.error("Error: --env is required when using --verify-deployment.\n");
    process.exit(2);
  }

  return { projectDir, verifyDeployment, env, skipAws };
}

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------

function tryExec(cmd: string, cwd?: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 30_000,
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { ok: true, output };
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return { ok: false, output: error.stderr || error.message || "Command failed" };
  }
}

function checkNodeVersion(): CheckResult {
  const { ok, output } = tryExec("node --version");
  if (!ok) {
    return { name: "node-version", passed: false, message: "Node.js not found" };
  }
  const version = output.replace("v", "");
  const major = parseInt(version.split(".")[0], 10);
  if (major < 18) {
    return {
      name: "node-version",
      passed: false,
      message: `Node.js ${version} is below minimum (18+)`,
      details: `Found: ${output}`,
    };
  }
  return {
    name: "node-version",
    passed: true,
    message: `Node.js ${version} meets minimum requirement`,
    details: output,
  };
}

function checkCdkCli(): CheckResult {
  const { ok, output } = tryExec("npx cdk --version");
  if (!ok) {
    return {
      name: "cdk-cli",
      passed: false,
      message: "AWS CDK CLI not found. Install with: npm install -g aws-cdk",
    };
  }
  return {
    name: "cdk-cli",
    passed: true,
    message: `CDK CLI available: ${output}`,
    details: output,
  };
}

function checkAwsCredentials(): CheckResult {
  const { ok, output } = tryExec("aws sts get-caller-identity");
  if (!ok) {
    return {
      name: "aws-credentials",
      passed: false,
      message: "AWS credentials not configured or expired. Run: aws configure",
      details: output,
    };
  }
  try {
    const identity = JSON.parse(output);
    return {
      name: "aws-credentials",
      passed: true,
      message: `AWS credentials valid for account ${identity.Account}`,
      details: `ARN: ${identity.Arn}`,
    };
  } catch {
    return {
      name: "aws-credentials",
      passed: true,
      message: "AWS credentials appear valid",
      details: output,
    };
  }
}

function checkNextConfig(projectDir: string): CheckResult {
  const configs = ["next.config.js", "next.config.mjs", "next.config.ts"];
  for (const config of configs) {
    if (existsSync(join(projectDir, config))) {
      // Check for standalone output mode
      try {
        const content = readFileSync(join(projectDir, config), "utf-8");
        const hasStandalone = content.includes("standalone");
        if (!hasStandalone) {
          return {
            name: "next-config",
            passed: true,
            message: `Found ${config} but missing output: 'standalone'`,
            details: "Lambda deployments require output: 'standalone' in next.config",
          };
        }
        return {
          name: "next-config",
          passed: true,
          message: `Found ${config} with standalone output mode`,
        };
      } catch {
        return {
          name: "next-config",
          passed: true,
          message: `Found ${config}`,
        };
      }
    }
  }
  return {
    name: "next-config",
    passed: false,
    message: "No next.config.js/mjs/ts found in project root",
  };
}

function checkCdkProject(projectDir: string): CheckResult {
  if (existsSync(join(projectDir, "cdk.json"))) {
    return {
      name: "cdk-project",
      passed: true,
      message: "Found cdk.json in project root",
    };
  }
  if (existsSync(join(projectDir, "infra"))) {
    return {
      name: "cdk-project",
      passed: true,
      message: "Found infra/ directory for CDK stacks",
    };
  }
  return {
    name: "cdk-project",
    passed: false,
    message: "No cdk.json or infra/ directory found. CDK project needs to be initialized.",
  };
}

function checkPackageJson(projectDir: string): CheckResult {
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) {
    return {
      name: "package-json",
      passed: false,
      message: "No package.json found in project root",
    };
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const hasNext = pkg.dependencies?.next || pkg.devDependencies?.next;
    const hasCdk =
      pkg.dependencies?.["aws-cdk-lib"] || pkg.devDependencies?.["aws-cdk-lib"];
    const issues: string[] = [];
    if (!hasNext) issues.push("next not in dependencies");
    if (!hasCdk) issues.push("aws-cdk-lib not in dependencies");
    if (issues.length > 0) {
      return {
        name: "package-json",
        passed: false,
        message: `package.json issues: ${issues.join(", ")}`,
      };
    }
    return {
      name: "package-json",
      passed: true,
      message: `package.json has next@${hasNext} and aws-cdk-lib@${hasCdk}`,
    };
  } catch {
    return {
      name: "package-json",
      passed: false,
      message: "Could not parse package.json",
    };
  }
}

function checkBuildArtifacts(projectDir: string): CheckResult {
  const nextDir = join(projectDir, ".next");
  if (!existsSync(nextDir)) {
    return {
      name: "build-artifacts",
      passed: false,
      message: ".next directory not found. Run: npm run build",
    };
  }
  const hasServer = existsSync(join(nextDir, "server"));
  const hasStatic = existsSync(join(nextDir, "static"));
  if (!hasServer || !hasStatic) {
    return {
      name: "build-artifacts",
      passed: false,
      message: ".next directory exists but missing server/ or static/ subdirectories",
    };
  }
  return {
    name: "build-artifacts",
    passed: true,
    message: "Build artifacts present (.next/server and .next/static)",
  };
}

function checkEnvConfig(projectDir: string, env: string): CheckResult {
  const configPath = join(projectDir, "config", `${env}.env`);
  if (!existsSync(configPath)) {
    return {
      name: "env-config",
      passed: false,
      message: `Environment config not found at config/${env}.env`,
      details: "Create the config file with environment-specific variables",
    };
  }
  const content = readFileSync(configPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  return {
    name: "env-config",
    passed: true,
    message: `Found config/${env}.env with ${lines.length} variables`,
  };
}

// ---------------------------------------------------------------------------
// Deployment verification checks
// ---------------------------------------------------------------------------

function verifyDeploymentUrl(projectDir: string, env: string): CheckResult {
  // Try to read the deployment URL from the outputs file
  const outputsPath = join(projectDir, "cdk-outputs.json");
  if (!existsSync(outputsPath)) {
    return {
      name: "deployment-url",
      passed: false,
      message: "No cdk-outputs.json found. Deploy first to generate outputs.",
    };
  }

  try {
    const outputs = JSON.parse(readFileSync(outputsPath, "utf-8"));
    const envCapitalized = env.charAt(0).toUpperCase() + env.slice(1);
    const stackOutputs = outputs[`Nextjs${envCapitalized}Stack`] || {};
    const url =
      stackOutputs.SiteUrl ||
      stackOutputs.CloudFrontUrl ||
      stackOutputs.DistributionUrl;

    if (!url) {
      return {
        name: "deployment-url",
        passed: false,
        message: "No deployment URL found in stack outputs",
      };
    }

    // Try to fetch the URL
    const { ok, output } = tryExec(`curl -s -o /dev/null -w "%{http_code}" ${url}`);
    if (ok && output === "200") {
      return {
        name: "deployment-url",
        passed: true,
        message: `Deployment URL ${url} returns HTTP 200`,
      };
    }
    return {
      name: "deployment-url",
      passed: false,
      message: `Deployment URL ${url} returned HTTP ${output}`,
    };
  } catch {
    return {
      name: "deployment-url",
      passed: false,
      message: "Could not parse cdk-outputs.json",
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs(process.argv);
  const projectDir = resolve(args.projectDir);
  const checks: CheckResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (args.verifyDeployment) {
    // Deployment verification mode
    checks.push(verifyDeploymentUrl(projectDir, args.env!));
    checks.push(checkBuildArtifacts(projectDir));
  } else {
    // Preflight check mode
    checks.push(checkNodeVersion());
    checks.push(checkCdkCli());

    if (!args.skipAws) {
      checks.push(checkAwsCredentials());
    } else {
      warnings.push("AWS credential check skipped (--skip-aws)");
    }

    checks.push(checkPackageJson(projectDir));
    checks.push(checkNextConfig(projectDir));
    checks.push(checkCdkProject(projectDir));
    checks.push(checkBuildArtifacts(projectDir));

    if (args.env) {
      checks.push(checkEnvConfig(projectDir, args.env));
    }
  }

  // Collect errors from failed checks
  for (const check of checks) {
    if (!check.passed) {
      errors.push(`[${check.name}] ${check.message}`);
    }
  }

  const result: PreflightResult = {
    success: errors.length === 0,
    mode: args.verifyDeployment ? "verify-deployment" : "preflight",
    environment: args.env,
    checks,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

main();

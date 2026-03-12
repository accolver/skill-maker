#!/usr/bin/env bun
/**
 * deploy-history.ts
 *
 * Displays deployment history for an environment.
 *
 * Usage:
 *   bun run scripts/deploy-history.ts --env <environment>
 *   bun run scripts/deploy-history.ts --help
 *
 * Output: JSON deployment history to stdout.
 * Exit codes: 0 = success, 1 = error
 */

import { existsSync, readFileSync } from "fs";
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

interface HistoryOutput {
  environment: string;
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  currentDeployment: DeploymentLogEntry | null;
  previousSuccessful: DeploymentLogEntry | null;
  deployments: DeploymentLogEntry[];
}

function printHelp(): void {
  console.error(`
deploy-history.ts — View deployment history for an environment

USAGE:
  bun run scripts/deploy-history.ts --env <environment> [options]

OPTIONS:
  --env <environment>   Target environment (staging, production)
  --limit <n>           Number of entries to show (default: all)
  --format <fmt>        Output format: json (default), table
  --help                Show this help message

OUTPUT:
  JSON object with deployment history including:
    - Total, successful, and failed deployment counts
    - Current and previous successful deployments
    - Full deployment log

EXIT CODES:
  0  Success
  1  Error (invalid arguments, no log found)

EXAMPLES:
  bun run scripts/deploy-history.ts --env production
  bun run scripts/deploy-history.ts --env staging --limit 10
  bun run scripts/deploy-history.ts --env production --format table
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

function formatTable(deployments: DeploymentLogEntry[]): string {
  const header = "| # | Timestamp | Commit | Branch | Lambda Ver | Status | Duration |";
  const separator = "|---|-----------|--------|--------|------------|--------|----------|";
  const rows = deployments.map((d, i) => {
    const ts = new Date(d.timestamp).toLocaleString();
    const commit = d.gitCommit.slice(0, 8);
    const duration = `${(d.durationMs / 1000).toFixed(1)}s`;
    const status = d.status === "success" ? "✅" : "❌";
    return `| ${i + 1} | ${ts} | ${commit} | ${d.gitBranch} | v${d.lambdaVersion} | ${status} | ${duration} |`;
  });

  return [header, separator, ...rows].join("\n");
}

function main(): void {
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
  const limit = parsed.limit ? parseInt(parsed.limit, 10) : undefined;
  const format = parsed.format || "json";

  const logPath = resolve(`./deployments/${env}-deploy-log.json`);

  if (!existsSync(logPath)) {
    console.error(JSON.stringify({
      error: `No deployment log found for ${env}`,
      path: logPath,
      hint: "Deploy first with: bun run scripts/deploy.ts --env " + env,
    }));
    process.exit(1);
  }

  let deployments: DeploymentLogEntry[];
  try {
    deployments = JSON.parse(readFileSync(logPath, "utf-8"));
  } catch (e: any) {
    console.error(JSON.stringify({ error: `Failed to parse deployment log: ${e.message}` }));
    process.exit(1);
  }

  if (limit) {
    deployments = deployments.slice(-limit);
  }

  if (format === "table") {
    console.log(formatTable(deployments));
    return;
  }

  const successful = deployments.filter((d) => d.status === "success");
  const failed = deployments.filter((d) => d.status !== "success");

  const output: HistoryOutput = {
    environment: env,
    totalDeployments: deployments.length,
    successfulDeployments: successful.length,
    failedDeployments: failed.length,
    currentDeployment: deployments.length > 0 ? deployments[deployments.length - 1] : null,
    previousSuccessful: successful.length > 1 ? successful[successful.length - 2] : null,
    deployments,
  };

  console.log(JSON.stringify(output, null, 2));
}

main();

#!/usr/bin/env bun
/**
 * View deployment history for a stage.
 *
 * Usage: bun run scripts/history.ts <stage> [--limit <n>]
 * Example: bun run scripts/history.ts production --limit 10
 */

import * as fs from "fs";
import * as path from "path";

const VALID_STAGES = ["staging", "production"];
const DEPLOYMENTS_DIR = ".deployments";

interface DeploymentRecord {
  id: string;
  stage: string;
  timestamp: string;
  commitSha: string;
  status: string;
  duration?: number;
  approvalId?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const stage = args[0];

  if (!stage || !VALID_STAGES.includes(stage)) {
    console.error("Usage: bun run scripts/history.ts <stage> [--limit <n>]");
    console.error(`Valid stages: ${VALID_STAGES.join(", ")}`);
    process.exit(1);
  }

  const limitArg = args.indexOf("--limit");
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : 20;

  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    console.log(`No deployment history found for ${stage}.`);
    process.exit(0);
  }

  const deployments: DeploymentRecord[] = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("smoke-test"))
    .map((f) => {
      try {
        return JSON.parse(
          fs.readFileSync(path.join(DEPLOYMENTS_DIR, f), "utf-8")
        );
      } catch {
        return null;
      }
    })
    .filter(
      (d): d is DeploymentRecord =>
        d !== null && d.stage === stage
    )
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);

  if (deployments.length === 0) {
    console.log(`No deployments found for ${stage}.`);
    process.exit(0);
  }

  console.log(`\n=== Deployment History: ${stage} ===\n`);
  console.log(
    "ID".padEnd(45) +
      "Status".padEnd(14) +
      "Commit".padEnd(10) +
      "Duration".padEnd(12) +
      "Timestamp"
  );
  console.log("-".repeat(110));

  for (const d of deployments) {
    const statusIcon =
      d.status === "success"
        ? "✅"
        : d.status === "failed"
          ? "❌"
          : d.status === "rolled_back"
            ? "⏪"
            : "🔄";

    console.log(
      d.id.padEnd(45) +
        `${statusIcon} ${d.status}`.padEnd(14) +
        d.commitSha.substring(0, 8).padEnd(10) +
        (d.duration ? `${d.duration.toFixed(1)}s` : "—").padEnd(12) +
        d.timestamp
    );
  }

  console.log(`\nShowing ${deployments.length} of ${limit} max entries.`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

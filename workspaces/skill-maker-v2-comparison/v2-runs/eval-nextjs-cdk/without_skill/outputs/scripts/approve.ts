#!/usr/bin/env bun
/**
 * Approve a staging deployment for production promotion.
 *
 * Usage: bun run scripts/approve.ts <deployment-id>
 * Example: bun run scripts/approve.ts deploy-staging-1700000000000
 *
 * This script:
 * 1. Validates the staging deployment exists and succeeded
 * 2. Shows the deployment summary and production diff
 * 3. Requires explicit "APPROVE" confirmation
 * 4. Records the approval for the deploy script to verify
 */

import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const DEPLOYMENTS_DIR = ".deployments";
const APPROVALS_DIR = path.join(DEPLOYMENTS_DIR, "approvals");

interface DeploymentRecord {
  id: string;
  stage: string;
  timestamp: string;
  commitSha: string;
  status: string;
  smokeTestResults?: Array<{
    url: string;
    status: number;
    responseTimeMs: number;
    passed: boolean;
  }>;
}

async function main() {
  const deploymentId = process.argv[2];

  if (!deploymentId) {
    console.error("Usage: bun run scripts/approve.ts <deployment-id>");
    console.error("\nRecent staging deployments:");
    listRecentDeployments("staging");
    process.exit(1);
  }

  // Load the deployment record
  const recordPath = path.join(DEPLOYMENTS_DIR, `${deploymentId}.json`);
  if (!fs.existsSync(recordPath)) {
    console.error(`ERROR: Deployment record not found: ${deploymentId}`);
    console.error("\nRecent staging deployments:");
    listRecentDeployments("staging");
    process.exit(1);
  }

  const record: DeploymentRecord = JSON.parse(
    fs.readFileSync(recordPath, "utf-8")
  );

  // Validate the deployment
  if (record.stage !== "staging") {
    console.error(
      `ERROR: Can only approve staging deployments. This is a ${record.stage} deployment.`
    );
    process.exit(1);
  }

  if (record.status !== "success") {
    console.error(
      `ERROR: Can only approve successful deployments. Status: ${record.status}`
    );
    process.exit(1);
  }

  // Display deployment summary
  console.log("\n========================================");
  console.log("  PRODUCTION APPROVAL REQUEST");
  console.log("========================================\n");
  console.log(`Deployment ID: ${record.id}`);
  console.log(`Stage:         ${record.stage}`);
  console.log(`Commit:        ${record.commitSha.substring(0, 8)}`);
  console.log(`Deployed:      ${record.timestamp}`);
  console.log(`Status:        ${record.status}`);

  if (record.smokeTestResults) {
    console.log("\nSmoke Test Results:");
    for (const test of record.smokeTestResults) {
      const icon = test.passed ? "✅" : "❌";
      console.log(
        `  ${icon} ${test.url} — ${test.status} (${test.responseTimeMs}ms)`
      );
    }
  }

  // Show production diff
  console.log("\n--- Production CDK Diff ---\n");
  try {
    await $`npx cdk diff --context stage=production`;
  } catch (error: any) {
    // cdk diff exits 1 when there are differences
    if (error.stdout) {
      console.log(error.stdout);
    }
  }

  // Prompt for approval
  console.log("\n========================================");
  console.log("  Type APPROVE to approve for production");
  console.log("  Type anything else to cancel");
  console.log("========================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("Your decision: ", (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });

  if (answer !== "APPROVE") {
    console.log("\n❌ Approval cancelled.");
    process.exit(0);
  }

  // Record the approval
  if (!fs.existsSync(APPROVALS_DIR)) {
    fs.mkdirSync(APPROVALS_DIR, { recursive: true });
  }

  const approval = {
    id: `approval-${Date.now()}`,
    deploymentId: record.id,
    commitSha: record.commitSha,
    timestamp: new Date().toISOString(),
    approvedBy: await getGitUser(),
    expiresAt: new Date(
      Date.now() + 4 * 60 * 60 * 1000
    ).toISOString(),
  };

  fs.writeFileSync(
    path.join(APPROVALS_DIR, `${approval.id}.json`),
    JSON.stringify(approval, null, 2)
  );

  console.log("\n✅ APPROVED for production deployment.");
  console.log(`Approval ID: ${approval.id}`);
  console.log(`Expires: ${approval.expiresAt}`);
  console.log(
    `\nNext: bun run scripts/deploy.ts production`
  );
}

function listRecentDeployments(stage: string): void {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    console.log("  (no deployments found)");
    return;
  }

  const deployments = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter((f) => f.startsWith(`deploy-${stage}`) && f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 5);

  if (deployments.length === 0) {
    console.log("  (no deployments found)");
    return;
  }

  for (const f of deployments) {
    const d = JSON.parse(
      fs.readFileSync(path.join(DEPLOYMENTS_DIR, f), "utf-8")
    );
    console.log(
      `  ${d.id} — ${d.status} — ${d.timestamp}`
    );
  }
}

async function getGitUser(): Promise<string> {
  try {
    const name = (await $`git config user.name`.text()).trim();
    const email = (await $`git config user.email`.text()).trim();
    return `${name} <${email}>`;
  } catch {
    return "unknown";
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

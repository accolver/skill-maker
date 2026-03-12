#!/usr/bin/env bun
/**
 * Deploy a Next.js application to AWS via CDK for a specific stage.
 *
 * Usage: bun run scripts/deploy.ts <stage>
 * Example: bun run scripts/deploy.ts staging
 *
 * This script:
 * 1. Validates prerequisites and approval (for production)
 * 2. Builds the Next.js app
 * 3. Synthesizes and diffs the CDK stack
 * 4. Deploys via `cdk deploy`
 * 5. Runs smoke tests
 * 6. Records deployment metadata
 */

import { $ } from "bun";
import * as fs from "fs";
import * as path from "path";

const VALID_STAGES = ["staging", "production"];
const APPROVAL_MAX_AGE_HOURS = 4;
const DEPLOYMENTS_DIR = ".deployments";

interface DeploymentRecord {
  id: string;
  stage: string;
  timestamp: string;
  commitSha: string;
  status: "in_progress" | "success" | "failed" | "rolled_back";
  stackOutputs?: Record<string, string>;
  smokeTestResults?: SmokeTestResult[];
  duration?: number;
  approvalId?: string;
}

interface SmokeTestResult {
  url: string;
  status: number;
  responseTimeMs: number;
  passed: boolean;
  error?: string;
}

async function main() {
  const stage = process.argv[2];

  if (!stage || !VALID_STAGES.includes(stage)) {
    console.error(`Usage: bun run scripts/deploy.ts <stage>`);
    console.error(`Valid stages: ${VALID_STAGES.join(", ")}`);
    process.exit(1);
  }

  console.log(`\n========================================`);
  console.log(`  Deploying to ${stage.toUpperCase()}`);
  console.log(`========================================\n`);

  const deployStart = Date.now();
  const deploymentId = `deploy-${stage}-${Date.now()}`;

  // Ensure deployments directory exists
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    fs.mkdirSync(DEPLOYMENTS_DIR, { recursive: true });
  }

  // Create initial deployment record
  const record: DeploymentRecord = {
    id: deploymentId,
    stage,
    timestamp: new Date().toISOString(),
    commitSha: await getCommitSha(),
    status: "in_progress",
  };
  writeDeploymentRecord(record);

  try {
    // Step 0: For production, verify approval exists
    if (stage === "production") {
      console.log("Checking for production approval...\n");
      const approval = findRecentApproval();
      if (!approval) {
        console.error(
          "ERROR: No recent approval found for production deployment."
        );
        console.error(
          `Run: bun run scripts/approve.ts <deployment-id>`
        );
        console.error(
          `Approvals expire after ${APPROVAL_MAX_AGE_HOURS} hours.`
        );
        record.status = "failed";
        writeDeploymentRecord(record);
        process.exit(1);
      }
      record.approvalId = approval.id;
      console.log(`Approval found: ${approval.id} by ${approval.approvedBy}\n`);
    }

    // Step 1: Build
    console.log("--- Step 1: Building Next.js app ---\n");
    await $`bun run scripts/build.ts ${stage}`;
    console.log("\nBuild complete.\n");

    // Step 2: Synth & Diff
    console.log("--- Step 2: Synthesizing CDK stack ---\n");
    await $`bun run scripts/synth.ts ${stage}`;
    console.log("\nSynth complete.\n");

    // Step 3: Deploy
    console.log("--- Step 3: Deploying via CDK ---\n");
    const deployOutput =
      await $`npx cdk deploy --context stage=${stage} --require-approval never --outputs-file cdk-outputs.json`.text();
    console.log(deployOutput);

    // Parse stack outputs
    if (fs.existsSync("cdk-outputs.json")) {
      const outputs = JSON.parse(fs.readFileSync("cdk-outputs.json", "utf-8"));
      record.stackOutputs = outputs;
      console.log("\nStack outputs:", JSON.stringify(outputs, null, 2));
    }

    // Step 4: Smoke tests
    console.log("\n--- Step 4: Running smoke tests ---\n");
    const siteUrl = getSiteUrl(stage, record.stackOutputs);
    if (siteUrl) {
      record.smokeTestResults = await runSmokeTests(siteUrl);
      const allPassed = record.smokeTestResults.every((r) => r.passed);

      if (!allPassed) {
        console.error("\n❌ Smoke tests FAILED. Consider rolling back.");
        console.error(`Run: bun run scripts/rollback.ts ${stage}`);
        record.status = "failed";
        writeDeploymentRecord(record);
        process.exit(1);
      }
      console.log("\n✅ All smoke tests passed.");
    } else {
      console.warn(
        "WARNING: Could not determine site URL. Skipping smoke tests."
      );
    }

    // Success
    record.status = "success";
    record.duration = (Date.now() - deployStart) / 1000;
    writeDeploymentRecord(record);

    console.log(`\n========================================`);
    console.log(`  ✅ Deployment to ${stage.toUpperCase()} SUCCEEDED`);
    console.log(`  ID: ${deploymentId}`);
    console.log(`  Duration: ${record.duration.toFixed(1)}s`);
    console.log(`  Commit: ${record.commitSha.substring(0, 8)}`);
    console.log(`========================================\n`);

    if (stage === "staging") {
      console.log("Next steps:");
      console.log(`  1. Verify staging at: ${siteUrl || "(check stack outputs)"}`);
      console.log(`  2. Approve for production: bun run scripts/approve.ts ${deploymentId}`);
      console.log(`  3. Deploy to production: bun run scripts/deploy.ts production`);
    }
  } catch (error) {
    record.status = "failed";
    record.duration = (Date.now() - deployStart) / 1000;
    writeDeploymentRecord(record);

    console.error(`\n❌ Deployment to ${stage} FAILED`);
    console.error(error);
    console.error(`\nTo rollback: bun run scripts/rollback.ts ${stage}`);
    process.exit(1);
  }
}

async function runSmokeTests(baseUrl: string): Promise<SmokeTestResult[]> {
  const endpoints = [
    "/",
    "/api/health",
  ];

  const results: SmokeTestResult[] = [];

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    console.log(`Testing: ${url}`);

    const start = Date.now();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      const responseTime = Date.now() - start;
      const passed = response.status === 200 && responseTime < 3000;

      const result: SmokeTestResult = {
        url,
        status: response.status,
        responseTimeMs: responseTime,
        passed,
      };

      if (!passed) {
        result.error = `Status: ${response.status}, Time: ${responseTime}ms`;
      }

      console.log(
        `  ${passed ? "✅" : "❌"} ${response.status} (${responseTime}ms)`
      );
      results.push(result);
    } catch (error: any) {
      const responseTime = Date.now() - start;
      console.log(`  ❌ Error: ${error.message}`);
      results.push({
        url,
        status: 0,
        responseTimeMs: responseTime,
        passed: false,
        error: error.message,
      });
    }
  }

  return results;
}

function getSiteUrl(
  stage: string,
  stackOutputs?: Record<string, string>
): string | null {
  // Try to extract URL from stack outputs
  if (stackOutputs) {
    for (const [key, value] of Object.entries(stackOutputs)) {
      if (typeof value === "object") {
        for (const [k, v] of Object.entries(value as Record<string, string>)) {
          if (
            k.toLowerCase().includes("url") ||
            k.toLowerCase().includes("endpoint")
          ) {
            return v;
          }
        }
      }
    }
  }

  // Fallback to config-based URL
  const configPath = path.resolve(`config/${stage}.env`);
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf-8");
    const match = content.match(/DOMAIN_NAME=(.+)/);
    if (match) {
      return `https://${match[1].trim()}`;
    }
  }

  return null;
}

function findRecentApproval(): { id: string; approvedBy: string } | null {
  const approvalsDir = path.join(DEPLOYMENTS_DIR, "approvals");
  if (!fs.existsSync(approvalsDir)) return null;

  const files = fs
    .readdirSync(approvalsDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse();

  for (const file of files) {
    const approval = JSON.parse(
      fs.readFileSync(path.join(approvalsDir, file), "utf-8")
    );
    const age =
      (Date.now() - new Date(approval.timestamp).getTime()) / (1000 * 60 * 60);
    if (age < APPROVAL_MAX_AGE_HOURS) {
      return approval;
    }
  }

  return null;
}

function writeDeploymentRecord(record: DeploymentRecord): void {
  const filePath = path.join(DEPLOYMENTS_DIR, `${record.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
}

async function getCommitSha(): Promise<string> {
  try {
    const result = await $`git rev-parse HEAD`.text();
    return result.trim();
  } catch {
    return "unknown";
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

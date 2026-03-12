#!/usr/bin/env bun
/**
 * Run smoke tests against a deployed stage.
 *
 * Usage: bun run scripts/smoke-test.ts <stage>
 * Example: bun run scripts/smoke-test.ts staging
 *
 * This script:
 * 1. Resolves the site URL from config or stack outputs
 * 2. Tests critical endpoints for availability and performance
 * 3. Reports results with pass/fail status
 */

import * as fs from "fs";
import * as path from "path";

const VALID_STAGES = ["staging", "production"];

interface TestResult {
  name: string;
  url: string;
  status: number;
  responseTimeMs: number;
  passed: boolean;
  error?: string;
  checks: CheckResult[];
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const TESTS = [
  {
    name: "Homepage loads",
    path: "/",
    checks: {
      statusCode: 200,
      maxResponseTimeMs: 3000,
      bodyContains: ["</html>"],
    },
  },
  {
    name: "Health endpoint",
    path: "/api/health",
    checks: {
      statusCode: 200,
      maxResponseTimeMs: 2000,
    },
  },
  {
    name: "Static assets accessible",
    path: "/_next/static/",
    checks: {
      statusCode: [200, 403], // 403 is OK for directory listing disabled
      maxResponseTimeMs: 1000,
    },
  },
  {
    name: "404 handling",
    path: "/this-page-should-not-exist-" + Date.now(),
    checks: {
      statusCode: 404,
      maxResponseTimeMs: 3000,
    },
  },
];

async function main() {
  const stage = process.argv[2];

  if (!stage || !VALID_STAGES.includes(stage)) {
    console.error("Usage: bun run scripts/smoke-test.ts <stage>");
    console.error(`Valid stages: ${VALID_STAGES.join(", ")}`);
    process.exit(1);
  }

  const baseUrl = resolveBaseUrl(stage);
  if (!baseUrl) {
    console.error(`ERROR: Could not determine URL for ${stage}.`);
    console.error(`Ensure config/${stage}.env has DOMAIN_NAME set.`);
    process.exit(1);
  }

  console.log(`\n=== Smoke Tests for ${stage} ===`);
  console.log(`Base URL: ${baseUrl}\n`);

  const results: TestResult[] = [];
  let allPassed = true;

  for (const test of TESTS) {
    const url = `${baseUrl}${test.path}`;
    console.log(`Testing: ${test.name}`);
    console.log(`  URL: ${url}`);

    const start = Date.now();
    const checks: CheckResult[] = [];

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });
      const responseTime = Date.now() - start;
      const body = await response.text();

      // Check status code
      const expectedStatus = test.checks.statusCode;
      const statusOk = Array.isArray(expectedStatus)
        ? expectedStatus.includes(response.status)
        : response.status === expectedStatus;
      checks.push({
        name: "Status code",
        passed: statusOk,
        detail: `Expected ${expectedStatus}, got ${response.status}`,
      });

      // Check response time
      const timeOk = responseTime <= test.checks.maxResponseTimeMs;
      checks.push({
        name: "Response time",
        passed: timeOk,
        detail: `${responseTime}ms (max: ${test.checks.maxResponseTimeMs}ms)`,
      });

      // Check body contains
      if (test.checks.bodyContains) {
        for (const needle of test.checks.bodyContains) {
          const found = body.includes(needle);
          checks.push({
            name: `Body contains "${needle}"`,
            passed: found,
            detail: found ? "Found" : "Not found",
          });
        }
      }

      const testPassed = checks.every((c) => c.passed);
      if (!testPassed) allPassed = false;

      results.push({
        name: test.name,
        url,
        status: response.status,
        responseTimeMs: responseTime,
        passed: testPassed,
        checks,
      });

      // Print results
      for (const check of checks) {
        const icon = check.passed ? "  ✅" : "  ❌";
        console.log(`${icon} ${check.name}: ${check.detail}`);
      }
    } catch (error: any) {
      const responseTime = Date.now() - start;
      allPassed = false;

      checks.push({
        name: "Connection",
        passed: false,
        detail: error.message,
      });

      results.push({
        name: test.name,
        url,
        status: 0,
        responseTimeMs: responseTime,
        passed: false,
        error: error.message,
        checks,
      });

      console.log(`  ❌ Error: ${error.message}`);
    }

    console.log("");
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log("========================================");
  console.log(
    `  ${allPassed ? "✅" : "❌"} ${passed}/${total} tests passed`
  );
  console.log("========================================\n");

  // Write results to file
  const resultsPath = path.resolve(
    `.deployments/smoke-test-${stage}-${Date.now()}.json`
  );
  const deploymentsDir = path.dirname(resultsPath);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    resultsPath,
    JSON.stringify({ stage, baseUrl, timestamp: new Date().toISOString(), results }, null, 2)
  );
  console.log(`Results written to: ${resultsPath}`);

  if (!allPassed) {
    process.exit(1);
  }
}

function resolveBaseUrl(stage: string): string | null {
  // Try stack outputs first
  const outputsPath = path.resolve("cdk-outputs.json");
  if (fs.existsSync(outputsPath)) {
    const outputs = JSON.parse(fs.readFileSync(outputsPath, "utf-8"));
    for (const stackOutputs of Object.values(outputs)) {
      if (typeof stackOutputs === "object" && stackOutputs !== null) {
        for (const [key, value] of Object.entries(
          stackOutputs as Record<string, string>
        )) {
          if (
            (key.toLowerCase().includes("url") ||
              key.toLowerCase().includes("endpoint")) &&
            typeof value === "string"
          ) {
            return value.startsWith("http") ? value : `https://${value}`;
          }
        }
      }
    }
  }

  // Fall back to config
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

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

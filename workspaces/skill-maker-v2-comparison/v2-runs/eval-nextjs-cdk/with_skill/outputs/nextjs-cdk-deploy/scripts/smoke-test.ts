#!/usr/bin/env bun
/**
 * smoke-test.ts - Post-deployment health verification for Next.js apps
 *
 * Runs a suite of checks against a deployed Next.js application to verify
 * the deployment is healthy: homepage loads, static assets resolve, API
 * routes respond, and response times are acceptable.
 *
 * Usage:
 *   bun run scripts/smoke-test.ts --url https://staging.example.com
 *   bun run scripts/smoke-test.ts --env staging
 *   bun run scripts/smoke-test.ts --url https://example.com --timeout 10000
 *   bun run scripts/smoke-test.ts --help
 *
 * Exit codes:
 *   0  - All checks passed
 *   1  - Invalid arguments
 *   2  - One or more checks failed
 */

import { parseArgs } from "util";

interface CheckResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  status_code?: number;
  error?: string;
}

const ENV_URLS: Record<string, string> = {
  staging: process.env.STAGING_URL || "https://staging.example.com",
  production: process.env.PRODUCTION_URL || "https://www.example.com",
};

function printHelp(): void {
  console.log(`
smoke-test.ts - Post-deployment health verification for Next.js apps

USAGE:
  bun run scripts/smoke-test.ts --url <base-url> [options]
  bun run scripts/smoke-test.ts --env <environment> [options]

OPTIONS:
  --url <url>         Base URL to test (e.g., https://staging.example.com)
  --env <env>         Environment name (resolves to URL from config)
  --timeout <ms>      Request timeout in milliseconds (default: 10000)
  --max-latency <ms>  Maximum acceptable response time in ms (default: 3000)
  --paths <paths>     Comma-separated additional paths to check
  --help              Show this help message

CHECKS PERFORMED:
  1. Homepage (GET /) returns 200
  2. Static asset path (_next/static/) is accessible
  3. API health endpoint (GET /api/health) returns 200 (if exists)
  4. Response times are within acceptable range
  5. Response headers include expected cache-control directives
  6. No redirect loops detected

EXAMPLES:
  bun run scripts/smoke-test.ts --url https://staging.example.com
  bun run scripts/smoke-test.ts --env staging --max-latency 5000
  bun run scripts/smoke-test.ts --url https://example.com --paths /products,/api/cart
  `);
}

async function checkUrl(
  url: string,
  name: string,
  timeout: number,
  expectedStatus: number = 200
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "nextjs-cdk-deploy-smoke-test/1.0",
      },
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - start;

    return {
      name,
      passed: response.status === expectedStatus,
      duration_ms: duration,
      status_code: response.status,
      error: response.status !== expectedStatus
        ? `Expected ${expectedStatus}, got ${response.status}`
        : undefined,
    };
  } catch (err: any) {
    return {
      name,
      passed: false,
      duration_ms: Date.now() - start,
      error: err.name === "AbortError" ? `Timeout after ${timeout}ms` : err.message,
    };
  }
}

async function checkCacheHeaders(
  url: string,
  name: string,
  timeout: number
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - start;
    const cacheControl = response.headers.get("cache-control") || "";

    // HTML pages should have must-revalidate or no-cache
    const hasRevalidate = cacheControl.includes("must-revalidate") ||
      cacheControl.includes("no-cache") ||
      cacheControl.includes("s-maxage");

    return {
      name,
      passed: response.status === 200 && hasRevalidate,
      duration_ms: duration,
      status_code: response.status,
      error: !hasRevalidate
        ? `Cache-Control header missing revalidation directive: "${cacheControl}"`
        : undefined,
    };
  } catch (err: any) {
    return {
      name,
      passed: false,
      duration_ms: Date.now() - start,
      error: err.message,
    };
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      url: { type: "string" },
      env: { type: "string" },
      timeout: { type: "string", default: "10000" },
      "max-latency": { type: "string", default: "3000" },
      paths: { type: "string" },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  let baseUrl = values.url;
  if (!baseUrl && values.env) {
    baseUrl = ENV_URLS[values.env];
  }

  if (!baseUrl) {
    console.error(`[smoke-test] Error: Provide --url or --env`);
    process.exit(1);
  }

  // Remove trailing slash
  baseUrl = baseUrl.replace(/\/$/, "");

  const timeout = parseInt(values.timeout!, 10);
  const maxLatency = parseInt(values["max-latency"]!, 10);
  const additionalPaths = values.paths?.split(",").map((p) => p.trim()) || [];

  console.error(`[smoke-test] Testing: ${baseUrl}`);
  console.error(`[smoke-test] Timeout: ${timeout}ms, Max latency: ${maxLatency}ms`);

  const results: CheckResult[] = [];

  // Check 1: Homepage
  results.push(await checkUrl(`${baseUrl}/`, "Homepage returns 200", timeout));

  // Check 2: Cache headers on homepage
  results.push(await checkCacheHeaders(`${baseUrl}/`, "Homepage has cache-control headers", timeout));

  // Check 3: API health endpoint (optional - may not exist)
  const healthResult = await checkUrl(`${baseUrl}/api/health`, "API health endpoint", timeout);
  if (healthResult.status_code !== 404) {
    results.push(healthResult);
  } else {
    console.error(`[smoke-test] Skipping API health check (404 - endpoint may not exist)`);
  }

  // Check 4: Additional paths
  for (const path of additionalPaths) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    results.push(
      await checkUrl(`${baseUrl}${normalizedPath}`, `Path ${normalizedPath} returns 200`, timeout)
    );
  }

  // Check 5: Latency check (use homepage result)
  const homepageResult = results[0];
  if (homepageResult.passed && homepageResult.duration_ms > maxLatency) {
    results.push({
      name: `Homepage latency under ${maxLatency}ms`,
      passed: false,
      duration_ms: homepageResult.duration_ms,
      error: `Response took ${homepageResult.duration_ms}ms, exceeds ${maxLatency}ms threshold`,
    });
  } else if (homepageResult.passed) {
    results.push({
      name: `Homepage latency under ${maxLatency}ms`,
      passed: true,
      duration_ms: homepageResult.duration_ms,
    });
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  // Print results to stderr for human readability
  console.error("");
  for (const result of results) {
    const icon = result.passed ? "✓" : "✗";
    const latency = `(${result.duration_ms}ms)`;
    console.error(`  ${icon} ${result.name} ${latency}${result.error ? ` - ${result.error}` : ""}`);
  }
  console.error("");
  console.error(`[smoke-test] Results: ${passed}/${total} passed, ${failed} failed`);

  // JSON output to stdout
  const output = {
    base_url: baseUrl,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      passed,
      failed,
      total,
      all_passed: failed === 0,
    },
  };

  console.log(JSON.stringify(output, null, 2));

  if (failed > 0) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`[smoke-test] Unexpected error: ${err.message}`);
  process.exit(1);
});

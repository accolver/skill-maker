#!/usr/bin/env bun

/**
 * check-health.ts — Checks deployment health by hitting the app endpoint.
 *
 * Verifies HTTP status code and optional response body content.
 * Outputs structured JSON to stdout for agent consumption.
 */

const HELP = `
check-health.ts — Check deployment health for a Next.js application

USAGE:
  bun run scripts/check-health.ts --url <url> [options]

OPTIONS:
  --url <url>              URL to check (required)
  --expect-status <code>   Expected HTTP status code (default: 200)
  --expect-body <text>     Expected substring in response body (optional)
  --timeout <ms>           Request timeout in milliseconds (default: 10000)
  --retries <n>            Number of retry attempts (default: 3)
  --retry-delay <ms>       Delay between retries in milliseconds (default: 2000)
  --help                   Show this help message

EXAMPLES:
  # Basic health check
  bun run scripts/check-health.ts --url https://staging.example.com

  # Check with expected body content
  bun run scripts/check-health.ts --url https://example.com --expect-body "Welcome"

  # Check with retries for slow deployments
  bun run scripts/check-health.ts --url https://example.com --retries 5 --retry-delay 5000

OUTPUT (JSON to stdout):
  {
    "healthy": true,
    "url": "https://staging.example.com",
    "status_code": 200,
    "expected_status": 200,
    "body_match": true,
    "response_time_ms": 234,
    "attempts": 1,
    "timestamp": "2025-01-15T10:35:00Z"
  }

EXIT CODES:
  0  Health check passed
  1  Invalid arguments
  2  Health check failed (wrong status code or body mismatch)
  3  All retries exhausted (endpoint unreachable)
`;

interface HealthResult {
  healthy: boolean;
  url: string;
  status_code: number | null;
  expected_status: number;
  body_match: boolean | null;
  response_time_ms: number | null;
  attempts: number;
  error?: string;
  timestamp: string;
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      parsed[arg.slice(2)] = args[++i];
    }
  }
  return parsed;
}

async function checkEndpoint(
  url: string,
  timeoutMs: number
): Promise<{ status: number; body: string; responseTime: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    const body = await response.text();
    const responseTime = Date.now() - start;
    clearTimeout(timeoutId);
    return { status: response.status, body, responseTime };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.error(HELP);
    process.exit(0);
  }

  const url = args.url as string;
  if (!url) {
    console.error("[health] Error: --url is required");
    console.error("Run with --help for usage information.");
    const result: HealthResult = {
      healthy: false,
      url: "unknown",
      status_code: null,
      expected_status: 200,
      body_match: null,
      response_time_ms: null,
      attempts: 0,
      error: "Missing --url argument",
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const expectedStatus = parseInt((args["expect-status"] as string) || "200");
  const expectBody = args["expect-body"] as string | undefined;
  const timeout = parseInt((args.timeout as string) || "10000");
  const retries = parseInt((args.retries as string) || "3");
  const retryDelay = parseInt((args["retry-delay"] as string) || "2000");

  let lastError: string | undefined;
  let attempts = 0;

  for (let attempt = 1; attempt <= retries; attempt++) {
    attempts = attempt;
    console.error(
      `[health] Attempt ${attempt}/${retries}: checking ${url}`
    );

    try {
      const { status, body, responseTime } = await checkEndpoint(url, timeout);

      const statusMatch = status === expectedStatus;
      const bodyMatch = expectBody ? body.includes(expectBody) : true;

      if (statusMatch && bodyMatch) {
        const result: HealthResult = {
          healthy: true,
          url,
          status_code: status,
          expected_status: expectedStatus,
          body_match: expectBody ? true : null,
          response_time_ms: responseTime,
          attempts,
          timestamp: new Date().toISOString(),
        };
        console.error(
          `[health] Passed: status=${status}, response_time=${responseTime}ms`
        );
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }

      lastError = !statusMatch
        ? `Expected status ${expectedStatus}, got ${status}`
        : `Body does not contain expected text: "${expectBody}"`;

      console.error(`[health] Failed: ${lastError}`);

      // If status is wrong, don't retry (the app is responding but incorrectly)
      if (!statusMatch && status >= 400 && status < 500) {
        const result: HealthResult = {
          healthy: false,
          url,
          status_code: status,
          expected_status: expectedStatus,
          body_match: expectBody ? bodyMatch : null,
          response_time_ms: responseTime,
          attempts,
          error: lastError,
          timestamp: new Date().toISOString(),
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(2);
      }
    } catch (err: any) {
      lastError = err.name === "AbortError"
        ? `Request timed out after ${timeout}ms`
        : err.message || "Unknown error";
      console.error(`[health] Error: ${lastError}`);
    }

    if (attempt < retries) {
      console.error(`[health] Retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  // All retries exhausted
  const result: HealthResult = {
    healthy: false,
    url,
    status_code: null,
    expected_status: expectedStatus,
    body_match: null,
    response_time_ms: null,
    attempts,
    error: lastError || "All retries exhausted",
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(3);
}

main();

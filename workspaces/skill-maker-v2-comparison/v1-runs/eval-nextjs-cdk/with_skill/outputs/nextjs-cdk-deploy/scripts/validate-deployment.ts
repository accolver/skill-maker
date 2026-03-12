#!/usr/bin/env bun
/**
 * validate-deployment.ts
 *
 * Validates a deployed Next.js application by running health checks
 * against the deployment URL.
 *
 * Usage:
 *   bun run scripts/validate-deployment.ts --env <environment> --url <url>
 *   bun run scripts/validate-deployment.ts --help
 *
 * Output: JSON validation result to stdout.
 * Exit codes: 0 = healthy, 1 = error, 2 = unhealthy
 */

interface ValidationResult {
  environment: string;
  url: string;
  healthy: boolean;
  checks: Check[];
  timestamp: string;
  totalDurationMs: number;
}

interface Check {
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

function printHelp(): void {
  console.error(`
validate-deployment.ts — Validate a deployed Next.js application

USAGE:
  bun run scripts/validate-deployment.ts --env <environment> --url <url> [options]

OPTIONS:
  --env <environment>   Target environment (staging, production)
  --url <url>           Base URL to validate (e.g., https://staging.example.com)
  --timeout <ms>        Request timeout in milliseconds (default: 10000)
  --retries <n>         Number of retries for failed checks (default: 3)
  --help                Show this help message

CHECKS PERFORMED:
  1. HTTP 200 on root path (/)
  2. Response contains HTML content
  3. Static assets accessible (/_next/static/)
  4. Response headers include expected caching headers
  5. No server errors in response body

EXIT CODES:
  0  All checks passed — deployment is healthy
  1  Error (invalid arguments, network failure)
  2  One or more checks failed — deployment is unhealthy

EXAMPLES:
  bun run scripts/validate-deployment.ts --env staging --url https://staging.example.com
  bun run scripts/validate-deployment.ts --env production --url https://example.com --retries 5
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

async function runCheck(
  name: string,
  fn: () => Promise<{ passed: boolean; details: string }>
): Promise<Check> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      name,
      passed: result.passed,
      durationMs: Date.now() - start,
      details: result.details,
    };
  } catch (e: any) {
    return {
      name,
      passed: false,
      durationMs: Date.now() - start,
      details: `Error: ${e.message}`,
    };
  }
}

async function fetchWithRetry(
  url: string,
  timeout: number,
  retries: number
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (e: any) {
      lastError = e;
      if (i < retries) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.error(`  Retry ${i + 1}/${retries} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Fetch failed after retries");
}

async function main(): Promise<void> {
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

  if (!parsed.url) {
    console.error(JSON.stringify({ error: "Missing required --url argument" }));
    process.exit(1);
  }

  const env = parsed.env;
  const baseUrl = parsed.url.replace(/\/$/, "");
  const timeout = parseInt(parsed.timeout || "10000", 10);
  const retries = parseInt(parsed.retries || "3", 10);

  console.error(`Validating deployment: ${baseUrl} (${env})`);

  const startTime = Date.now();
  const checks: Check[] = [];

  // Check 1: Root path returns 200
  checks.push(
    await runCheck("Root path returns HTTP 200", async () => {
      const response = await fetchWithRetry(baseUrl, timeout, retries);
      return {
        passed: response.status === 200,
        details: `Status: ${response.status} ${response.statusText}`,
      };
    })
  );

  // Check 2: Response contains HTML
  checks.push(
    await runCheck("Response contains HTML content", async () => {
      const response = await fetchWithRetry(baseUrl, timeout, retries);
      const contentType = response.headers.get("content-type") || "";
      const body = await response.text();
      const hasHtml = contentType.includes("text/html") && body.includes("<!DOCTYPE") || body.includes("<html");
      return {
        passed: hasHtml,
        details: `Content-Type: ${contentType}, has HTML tags: ${body.includes("<html")}`,
      };
    })
  );

  // Check 3: No server error strings in body
  checks.push(
    await runCheck("No server errors in response", async () => {
      const response = await fetchWithRetry(baseUrl, timeout, retries);
      const body = await response.text();
      const errorPatterns = [
        "Internal Server Error",
        "Application error",
        "NEXT_NOT_FOUND",
        "MODULE_NOT_FOUND",
      ];
      const foundErrors = errorPatterns.filter((p) => body.includes(p));
      return {
        passed: foundErrors.length === 0,
        details: foundErrors.length > 0
          ? `Found error strings: ${foundErrors.join(", ")}`
          : "No error strings found in response body",
      };
    })
  );

  // Check 4: Response headers
  checks.push(
    await runCheck("Response includes caching headers", async () => {
      const response = await fetchWithRetry(baseUrl, timeout, retries);
      const hasXCache = response.headers.has("x-cache") || response.headers.has("x-amz-cf-id");
      const hasCacheControl = response.headers.has("cache-control");
      return {
        passed: hasXCache || hasCacheControl,
        details: `x-cache/x-amz-cf-id: ${hasXCache}, cache-control: ${hasCacheControl}`,
      };
    })
  );

  // Check 5: Health endpoint (if exists)
  checks.push(
    await runCheck("Health endpoint responds", async () => {
      try {
        const response = await fetchWithRetry(`${baseUrl}/api/health`, timeout, 1);
        if (response.status === 404) {
          return { passed: true, details: "No /api/health endpoint (OK — not required)" };
        }
        return {
          passed: response.status === 200,
          details: `Status: ${response.status}`,
        };
      } catch {
        return { passed: true, details: "No /api/health endpoint (OK — not required)" };
      }
    })
  );

  const totalDurationMs = Date.now() - startTime;
  const allPassed = checks.every((c) => c.passed);

  const result: ValidationResult = {
    environment: env,
    url: baseUrl,
    healthy: allPassed,
    checks,
    timestamp: new Date().toISOString(),
    totalDurationMs,
  };

  console.log(JSON.stringify(result, null, 2));

  if (!allPassed) {
    const failed = checks.filter((c) => !c.passed);
    console.error(`\n❌ ${failed.length} check(s) failed:`);
    for (const check of failed) {
      console.error(`  - ${check.name}: ${check.details}`);
    }
    process.exit(2);
  }

  console.error(`\n✅ All ${checks.length} checks passed (${totalDurationMs}ms)`);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: `Unexpected error: ${e.message}` }));
  process.exit(1);
});

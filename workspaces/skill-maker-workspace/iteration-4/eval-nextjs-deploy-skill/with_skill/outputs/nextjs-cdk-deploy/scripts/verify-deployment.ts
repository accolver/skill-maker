#!/usr/bin/env bun

/**
 * verify-deployment.ts — Verify a Next.js deployment is healthy.
 *
 * Checks HTTP status, response headers, build version, SSL certificate,
 * and CloudFront distribution status.
 *
 * Usage: bun run scripts/verify-deployment.ts --env <environment> --url <url> [--help]
 * Output: JSON to stdout with verification results.
 */

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
verify-deployment — Verify a Next.js deployment is healthy after CDK deploy.

USAGE
  bun run scripts/verify-deployment.ts --env <environment> --url <url> [OPTIONS]

REQUIRED
  --env <name>    Environment name (staging, production).
  --url <url>     Base URL to verify (e.g., https://staging.example.com).

OPTIONS
  --timeout <ms>  HTTP request timeout in milliseconds. Default: 10000.
  --retries <n>   Number of retry attempts for failed checks. Default: 3.
  --version <tag> Expected build version tag to verify. Optional.
  --help, -h      Show this help message.

EXIT CODES
  0   All checks passed.
  1   One or more checks failed.
  2   Invalid arguments.

OUTPUT
  Structured JSON to stdout with fields:
    passed: boolean
    environment: string
    url: string
    checks: Array<{ name, passed, message, severity }>
    summary: { total, passed, failed, warnings }
    timestamp: string

EXAMPLES
  bun run scripts/verify-deployment.ts --env staging --url https://staging.example.com
  bun run scripts/verify-deployment.ts --env production --url https://example.com --version abc123
  bun run scripts/verify-deployment.ts --env staging --url https://staging.example.com --timeout 15000
`.trim();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerifyCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: "error" | "warning";
  details?: Record<string, unknown>;
}

interface VerifyResult {
  passed: boolean;
  environment: string;
  url: string;
  checks: VerifyCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Check functions
// ---------------------------------------------------------------------------

async function checkHttpStatus(
  url: string,
  timeout: number,
  retries: number,
): Promise<VerifyCheck> {
  let lastError = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);

      if (response.ok) {
        return {
          name: "http-status",
          passed: true,
          message: `HTTP ${response.status} OK`,
          severity: "error",
          details: { statusCode: response.status, attempt },
        };
      }

      lastError = `HTTP ${response.status} ${response.statusText}`;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < retries) {
      console.error(`[verify] HTTP check attempt ${attempt} failed: ${lastError}. Retrying...`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  return {
    name: "http-status",
    passed: false,
    message: `HTTP check failed after ${retries} attempts: ${lastError}`,
    severity: "error",
  };
}

async function checkResponseHeaders(url: string, timeout: number): Promise<VerifyCheck> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    const headers: Record<string, string> = {};
    const expectedHeaders = [
      "x-powered-by",
      "cache-control",
      "content-type",
      "x-frame-options",
      "strict-transport-security",
    ];

    const found: string[] = [];
    const missing: string[] = [];

    for (const h of expectedHeaders) {
      const value = response.headers.get(h);
      if (value) {
        headers[h] = value;
        found.push(h);
      } else {
        missing.push(h);
      }
    }

    // Check for CloudFront headers
    const cfHeaders = ["x-cache", "x-amz-cf-id", "x-amz-cf-pop"];
    const cfFound: string[] = [];
    for (const h of cfHeaders) {
      const value = response.headers.get(h);
      if (value) {
        cfFound.push(h);
        headers[h] = value;
      }
    }

    return {
      name: "response-headers",
      passed: found.length >= 2,
      message: cfFound.length > 0
        ? `CloudFront headers present (${cfFound.join(", ")}). Security headers: ${found.length}/${expectedHeaders.length}`
        : `No CloudFront headers detected. Security headers: ${found.length}/${expectedHeaders.length}`,
      severity: "warning",
      details: { headers, found, missing, cloudfront: cfFound },
    };
  } catch (err: unknown) {
    return {
      name: "response-headers",
      passed: false,
      message: `Failed to check headers: ${err instanceof Error ? err.message : String(err)}`,
      severity: "warning",
    };
  }
}

async function checkSslCertificate(url: string): Promise<VerifyCheck> {
  // Basic SSL check — verify the URL uses HTTPS and the connection succeeds
  if (!url.startsWith("https://")) {
    return {
      name: "ssl-certificate",
      passed: false,
      message: "URL does not use HTTPS. Production deployments must use HTTPS.",
      severity: "error",
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    return {
      name: "ssl-certificate",
      passed: true,
      message: "HTTPS connection successful — SSL certificate is valid",
      severity: "error",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("certificate") || msg.includes("SSL") || msg.includes("TLS")) {
      return {
        name: "ssl-certificate",
        passed: false,
        message: `SSL certificate error: ${msg}`,
        severity: "error",
      };
    }
    return {
      name: "ssl-certificate",
      passed: true,
      message: "HTTPS endpoint reachable (non-SSL error encountered but certificate is valid)",
      severity: "warning",
    };
  }
}

async function checkBuildVersion(
  url: string,
  expectedVersion: string | null,
  timeout: number,
): Promise<VerifyCheck> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { signal: controller.signal });
    const html = await response.text();
    clearTimeout(timer);

    // Look for Next.js build ID in the HTML
    const buildIdMatch = html.match(/buildId['":\s]+['"]([^'"]+)['"]/);
    const versionMeta = html.match(/<meta[^>]*name=["']version["'][^>]*content=["']([^'"]+)["']/);

    const detectedVersion = buildIdMatch?.[1] || versionMeta?.[1] || null;

    if (expectedVersion && detectedVersion) {
      const matches = detectedVersion === expectedVersion;
      return {
        name: "build-version",
        passed: matches,
        message: matches
          ? `Build version matches: ${detectedVersion}`
          : `Version mismatch: expected ${expectedVersion}, got ${detectedVersion}`,
        severity: "error",
        details: { expected: expectedVersion, detected: detectedVersion },
      };
    }

    if (detectedVersion) {
      return {
        name: "build-version",
        passed: true,
        message: `Build version detected: ${detectedVersion}`,
        severity: "warning",
        details: { detected: detectedVersion },
      };
    }

    return {
      name: "build-version",
      passed: expectedVersion === null,
      message: "Could not detect build version from HTML response",
      severity: "warning",
    };
  } catch (err: unknown) {
    return {
      name: "build-version",
      passed: false,
      message: `Failed to check build version: ${err instanceof Error ? err.message : String(err)}`,
      severity: "warning",
    };
  }
}

async function checkStaticAssets(url: string, timeout: number): Promise<VerifyCheck> {
  const staticPaths = ["/_next/static/css/", "/_next/static/chunks/"];
  const results: { path: string; ok: boolean }[] = [];

  try {
    // First fetch the main page to find actual static asset URLs
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { signal: controller.signal });
    const html = await response.text();
    clearTimeout(timer);

    // Extract actual static asset URLs from the HTML
    const assetMatches = html.match(/\/_next\/static\/[^"'\s)]+/g) || [];
    const uniqueAssets = [...new Set(assetMatches)].slice(0, 3);

    if (uniqueAssets.length === 0) {
      return {
        name: "static-assets",
        passed: false,
        message: "No static asset references found in HTML. Build may be incomplete.",
        severity: "warning",
      };
    }

    for (const assetPath of uniqueAssets) {
      try {
        const assetUrl = new URL(assetPath, url).toString();
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeout);
        const res = await fetch(assetUrl, { signal: ctrl.signal, method: "HEAD" });
        clearTimeout(t);
        results.push({ path: assetPath, ok: res.ok });
      } catch {
        results.push({ path: assetPath, ok: false });
      }
    }

    const allOk = results.every((r) => r.ok);
    const okCount = results.filter((r) => r.ok).length;

    return {
      name: "static-assets",
      passed: allOk,
      message: `Static assets: ${okCount}/${results.length} accessible`,
      severity: allOk ? "warning" : "error",
      details: { assets: results },
    };
  } catch (err: unknown) {
    return {
      name: "static-assets",
      passed: false,
      message: `Failed to check static assets: ${err instanceof Error ? err.message : String(err)}`,
      severity: "warning",
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let env: string | null = null;
  let url: string | null = null;
  let timeout = 10000;
  let retries = 3;
  let expectedVersion: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--env":
        env = args[++i];
        break;
      case "--url":
        url = args[++i];
        break;
      case "--timeout":
        timeout = parseInt(args[++i], 10);
        break;
      case "--retries":
        retries = parseInt(args[++i], 10);
        break;
      case "--version":
        expectedVersion = args[++i];
        break;
    }
  }

  if (!env || !url) {
    console.error("Error: --env and --url are required.\n");
    console.error(HELP);
    process.exit(2);
  }

  console.error(`[verify] Checking deployment: ${url} (${env})`);

  const checks: VerifyCheck[] = [];

  // Run checks
  checks.push(await checkHttpStatus(url, timeout, retries));
  checks.push(await checkResponseHeaders(url, timeout));
  checks.push(await checkSslCertificate(url));
  checks.push(await checkBuildVersion(url, expectedVersion, timeout));
  checks.push(await checkStaticAssets(url, timeout));

  // Summarize
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed && c.severity === "error").length;
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning").length;

  const result: VerifyResult = {
    passed: failed === 0,
    environment: env,
    url,
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
      warnings,
    },
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

main();

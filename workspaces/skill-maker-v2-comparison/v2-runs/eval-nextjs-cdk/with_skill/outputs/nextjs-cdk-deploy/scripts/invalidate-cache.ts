#!/usr/bin/env bun
/**
 * invalidate-cache.ts - Invalidate CloudFront distribution cache
 *
 * Creates a CloudFront invalidation for specified paths or all content.
 * Useful after deployments, rollbacks, or content updates.
 *
 * Usage:
 *   bun run scripts/invalidate-cache.ts --distribution-id E1A2B3C4D5E6F7
 *   bun run scripts/invalidate-cache.ts --distribution-id E1A2B3C4D5E6F7 --paths "/*"
 *   bun run scripts/invalidate-cache.ts --distribution-id E1A2B3C4D5E6F7 --paths "/products/*,/api/*"
 *   bun run scripts/invalidate-cache.ts --env staging
 *   bun run scripts/invalidate-cache.ts --help
 *
 * Exit codes:
 *   0  - Invalidation created successfully
 *   1  - Invalid arguments
 *   2  - Invalidation creation failed
 *   3  - Wait for completion timed out
 */

import { parseArgs } from "util";
import { $ } from "bun";

function printHelp(): void {
  console.log(`
invalidate-cache.ts - Invalidate CloudFront distribution cache

USAGE:
  bun run scripts/invalidate-cache.ts --distribution-id <id> [options]
  bun run scripts/invalidate-cache.ts --env <environment> [options]

OPTIONS:
  --distribution-id <id>  CloudFront distribution ID (required unless --env is used)
  --env <env>             Environment name (auto-detects distribution ID from CDK outputs)
  --paths <paths>         Comma-separated paths to invalidate (default: "/*")
  --wait                  Wait for invalidation to complete
  --wait-timeout <sec>    Max seconds to wait for completion (default: 300)
  --help                  Show this help message

EXAMPLES:
  # Invalidate everything
  bun run scripts/invalidate-cache.ts --distribution-id E1A2B3C4D5E6F7

  # Invalidate specific paths
  bun run scripts/invalidate-cache.ts --distribution-id E1A2B3C4D5E6F7 --paths "/products/*,/index.html"

  # Invalidate and wait for completion
  bun run scripts/invalidate-cache.ts --distribution-id E1A2B3C4D5E6F7 --wait

  # Auto-detect distribution from environment
  bun run scripts/invalidate-cache.ts --env production --wait

NOTES:
  - Invalidating "/*" clears the entire cache. Use sparingly.
  - CloudFront allows 1,000 free invalidation paths per month.
  - Wildcard invalidations (e.g., "/products/*") count as one path.
  - Invalidation typically completes in 1-5 minutes.
  `);
}

async function getDistributionIdFromEnv(env: string): Promise<string | undefined> {
  const outputsFile = `cdk-outputs-${env}.json`;
  try {
    const file = Bun.file(outputsFile);
    if (await file.exists()) {
      const outputs = await file.json();
      // Look for a distribution ID in the outputs
      for (const [key, value] of Object.entries(outputs)) {
        if (typeof value === "string" && value.match(/^E[A-Z0-9]{13}$/)) {
          return value;
        }
        if (typeof value === "object" && value !== null) {
          for (const [, v] of Object.entries(value as Record<string, unknown>)) {
            if (typeof v === "string" && v.match(/^E[A-Z0-9]{13}$/)) {
              return v;
            }
          }
        }
      }
    }
  } catch {
    // Fall through
  }
  return undefined;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "distribution-id": { type: "string" },
      env: { type: "string" },
      paths: { type: "string", default: "/*" },
      wait: { type: "boolean", default: false },
      "wait-timeout": { type: "string", default: "300" },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  let distributionId = values["distribution-id"];

  if (!distributionId && values.env) {
    distributionId = await getDistributionIdFromEnv(values.env);
    if (distributionId) {
      console.error(`[invalidate] Auto-detected distribution ID: ${distributionId}`);
    }
  }

  if (!distributionId) {
    console.error(`[invalidate] Error: Provide --distribution-id or --env`);
    process.exit(1);
  }

  const paths = values.paths!.split(",").map((p) => p.trim());
  const shouldWait = values.wait!;
  const waitTimeout = parseInt(values["wait-timeout"]!, 10);

  console.error(`[invalidate] Distribution: ${distributionId}`);
  console.error(`[invalidate] Paths: ${paths.join(", ")}`);

  // Create invalidation
  const pathsJson = JSON.stringify({
    Paths: {
      Quantity: paths.length,
      Items: paths,
    },
    CallerReference: `invalidate-${Date.now()}`,
  });

  try {
    const result = await $`aws cloudfront create-invalidation --distribution-id ${distributionId} --invalidation-batch '${pathsJson}'`.quiet();

    if (result.exitCode !== 0) {
      console.error(`[invalidate] Failed to create invalidation`);
      console.error(result.stderr.toString());
      process.exit(2);
    }

    const output = JSON.parse(result.stdout.toString());
    const invalidationId = output?.Invalidation?.Id;
    const status = output?.Invalidation?.Status;

    console.error(`[invalidate] Invalidation created: ${invalidationId} (${status})`);

    // Wait for completion if requested
    if (shouldWait && invalidationId) {
      console.error(`[invalidate] Waiting for invalidation to complete (timeout: ${waitTimeout}s)...`);

      const waitResult = await $`aws cloudfront wait invalidation-completed --distribution-id ${distributionId} --id ${invalidationId}`.timeout(waitTimeout * 1000).nothrow().quiet();

      if (waitResult.exitCode !== 0) {
        console.error(`[invalidate] Warning: Wait timed out or failed. Invalidation may still be in progress.`);
        process.exit(3);
      }

      console.error(`[invalidate] Invalidation completed`);
    }

    // JSON output
    const summary = {
      status: "success",
      distribution_id: distributionId,
      invalidation_id: invalidationId,
      paths,
      waited: shouldWait,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(summary, null, 2));
  } catch (err: any) {
    console.error(`[invalidate] Error: ${err.message}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`[invalidate] Unexpected error: ${err.message}`);
  process.exit(1);
});

#!/usr/bin/env bun
/**
 * synth.ts - Synthesize CDK stack and optionally diff against deployed stack
 *
 * Runs `cdk synth` for a specific environment and optionally shows a diff
 * of what would change compared to the currently deployed stack.
 *
 * Usage:
 *   bun run scripts/synth.ts --env staging
 *   bun run scripts/synth.ts --env production --diff
 *   bun run scripts/synth.ts --help
 *
 * Exit codes:
 *   0  - Synth succeeded (and diff showed no/expected changes)
 *   1  - Invalid arguments
 *   2  - CDK synth failed
 *   3  - CDK diff failed
 */

import { parseArgs } from "util";
import { $ } from "bun";

const VALID_ENVS = ["staging", "production"] as const;
type Environment = (typeof VALID_ENVS)[number];

function printHelp(): void {
  console.log(`
synth.ts - Synthesize CDK stack and optionally diff against deployed stack

USAGE:
  bun run scripts/synth.ts --env <environment> [options]

OPTIONS:
  --env <env>     Target environment: staging | production (required)
  --diff          Also run 'cdk diff' to show changes vs deployed stack
  --output <dir>  Output directory for synthesized template (default: cdk.out)
  --verbose       Show detailed CDK output
  --help          Show this help message

EXAMPLES:
  # Synthesize staging stack
  bun run scripts/synth.ts --env staging

  # Synthesize and diff production stack
  bun run scripts/synth.ts --env production --diff

  # Synthesize to custom output directory
  bun run scripts/synth.ts --env staging --output ./my-templates
  `);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      env: { type: "string" },
      diff: { type: "boolean", default: false },
      output: { type: "string", default: "cdk.out" },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const env = values.env as Environment;
  if (!env || !VALID_ENVS.includes(env)) {
    console.error(`[synth] Error: --env must be one of: ${VALID_ENVS.join(", ")}`);
    process.exit(1);
  }

  const outputDir = values.output!;
  const verbose = values.verbose!;
  const showDiff = values.diff!;

  // Step 1: Synthesize
  console.error(`[synth] Synthesizing CDK stack for ${env}...`);

  const synthArgs = [
    "synth",
    "--context", `env=${env}`,
    "--output", outputDir,
  ];

  if (verbose) {
    synthArgs.push("--verbose");
  }

  const synthResult = await $`npx cdk ${synthArgs.join(" ")}`.quiet();

  if (synthResult.exitCode !== 0) {
    console.error(`[synth] CDK synth failed with exit code ${synthResult.exitCode}`);
    if (verbose) {
      console.error(synthResult.stderr.toString());
    }
    process.exit(2);
  }

  console.error(`[synth] CDK synth succeeded. Output: ${outputDir}/`);

  // Step 2: Diff (optional)
  if (showDiff) {
    console.error(`[synth] Running CDK diff for ${env}...`);

    const diffResult = await $`npx cdk diff --context env=${env}`.nothrow().quiet();

    // cdk diff exits with 1 if there are differences (not an error)
    if (diffResult.exitCode > 1) {
      console.error(`[synth] CDK diff failed with exit code ${diffResult.exitCode}`);
      process.exit(3);
    }

    const diffOutput = diffResult.stdout.toString();
    if (diffOutput.trim()) {
      console.error(`[synth] Changes detected:`);
      console.error(diffOutput);
    } else {
      console.error(`[synth] No changes detected vs deployed stack`);
    }
  }

  // Output summary
  const summary = {
    status: "success",
    environment: env,
    output_directory: outputDir,
    diff_shown: showDiff,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(`[synth] Unexpected error: ${err.message}`);
  process.exit(1);
});

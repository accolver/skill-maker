#!/usr/bin/env bun

/**
 * detect-plateau.ts
 *
 * Analyzes benchmark.json files across multiple iterations to detect
 * when pass_rate improvement has plateaued.
 *
 * Usage:
 *   bun run scripts/detect-plateau.ts <workspace-dir> [--threshold 0.02] [--window 3] [--max-iterations 20]
 *
 * Exit codes:
 *   0  - CONTINUE (keep iterating)
 *   10 - PLATEAU (improvement has plateaued, should stop)
 *   20 - MAX_REACHED (hit iteration limit)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// ── Types ──────────────────────────────────────────────────────────────

interface IterationResult {
  iteration: number;
  pass_rate: number;
  delta: number | null;
}

interface PlateauOutput {
  status: "PLATEAU" | "MAX_REACHED" | "CONTINUE";
  current_iteration: number;
  iterations: IterationResult[];
  recommendation: string;
}

interface BenchmarkJson {
  run_summary?: {
    with_skill?: {
      pass_rate?: {
        mean?: number;
      };
    };
  };
  // Also support flat format (with_skill at root)
  with_skill?: {
    pass_rate?: {
      mean?: number;
    };
  };
}

// ── CLI Parsing ────────────────────────────────────────────────────────

const HELP_TEXT = `
detect-plateau - Detect when skill pass_rate improvement has plateaued

USAGE
  bun run scripts/detect-plateau.ts <workspace-dir> [options]

ARGUMENTS
  <workspace-dir>    Path to workspace containing iteration-N/ directories

OPTIONS
  --threshold <n>       Minimum pass_rate improvement to consider meaningful
                        (default: 0.02 = 2%)
  --window <n>          Number of consecutive iterations below threshold to
                        declare plateau (default: 3)
  --max-iterations <n>  Hard stop iteration limit (default: 20)
  --help, -h            Show this help message

WORKSPACE STRUCTURE
  workspace/
  ├── iteration-1/
  │   └── benchmark.json
  ├── iteration-2/
  │   └── benchmark.json
  └── ...

EXIT CODES
  0   CONTINUE     - Keep iterating
  10  PLATEAU      - Improvement has plateaued, should stop
  20  MAX_REACHED  - Hit iteration limit

OUTPUT
  Structured JSON to stdout with status, iteration data, and recommendation.
`.trim();

function parseArgs(args: string[]): {
  workspaceDir: string;
  threshold: number;
  window: number;
  maxIterations: number;
} {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  let workspaceDir = "";
  let threshold = 0.02;
  let window = 3;
  let maxIterations = 20;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--threshold") {
      i++;
      const val = parseFloat(args[i]);
      if (isNaN(val) || val < 0 || val > 1) {
        console.error(
          `Error: --threshold must be a number between 0 and 1, got "${args[i]}"`
        );
        process.exit(1);
      }
      threshold = val;
    } else if (arg === "--window") {
      i++;
      const val = parseInt(args[i], 10);
      if (isNaN(val) || val < 1) {
        console.error(
          `Error: --window must be a positive integer, got "${args[i]}"`
        );
        process.exit(1);
      }
      window = val;
    } else if (arg === "--max-iterations") {
      i++;
      const val = parseInt(args[i], 10);
      if (isNaN(val) || val < 1) {
        console.error(
          `Error: --max-iterations must be a positive integer, got "${args[i]}"`
        );
        process.exit(1);
      }
      maxIterations = val;
    } else if (arg.startsWith("--")) {
      console.error(`Error: Unknown option "${arg}". Use --help for usage.`);
      process.exit(1);
    } else {
      if (workspaceDir) {
        console.error(
          `Error: Unexpected positional argument "${arg}". Only one workspace directory is accepted.`
        );
        process.exit(1);
      }
      workspaceDir = arg;
    }

    i++;
  }

  if (!workspaceDir) {
    console.error(
      "Error: <workspace-dir> is required. Use --help for usage."
    );
    process.exit(1);
  }

  return { workspaceDir: resolve(workspaceDir), threshold, window, maxIterations };
}

// ── Core Logic ─────────────────────────────────────────────────────────

function discoverIterations(workspaceDir: string): number[] {
  if (!existsSync(workspaceDir)) {
    console.error(`Error: Workspace directory does not exist: ${workspaceDir}`);
    process.exit(1);
  }

  let entries: string[];
  try {
    entries = readdirSync(workspaceDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch (err) {
    console.error(
      `Error: Could not read workspace directory: ${(err as Error).message}`
    );
    process.exit(1);
  }

  const iterationPattern = /^iteration-(\d+)$/;
  const iterations: number[] = [];

  for (const entry of entries) {
    const match = entry.match(iterationPattern);
    if (match) {
      iterations.push(parseInt(match[1], 10));
    }
  }

  return iterations.sort((a, b) => a - b);
}

function readPassRate(
  workspaceDir: string,
  iteration: number
): number | null {
  const benchmarkPath = join(
    workspaceDir,
    `iteration-${iteration}`,
    "benchmark.json"
  );

  if (!existsSync(benchmarkPath)) {
    console.warn(
      `Warning: benchmark.json not found for iteration ${iteration}, skipping (${benchmarkPath})`
    );
    return null;
  }

  let raw: string;
  try {
    raw = readFileSync(benchmarkPath, "utf-8");
  } catch (err) {
    console.warn(
      `Warning: Could not read benchmark.json for iteration ${iteration}: ${(err as Error).message}`
    );
    return null;
  }

  let data: BenchmarkJson;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn(
      `Warning: Invalid JSON in benchmark.json for iteration ${iteration}: ${(err as Error).message}`
    );
    return null;
  }

  // Support both nested (run_summary.with_skill) and flat (with_skill) formats
  const passRate = data?.run_summary?.with_skill?.pass_rate?.mean ?? data?.with_skill?.pass_rate?.mean;

  if (passRate === undefined || passRate === null || typeof passRate !== "number") {
    console.warn(
      `Warning: with_skill.pass_rate.mean not found or not a number in iteration ${iteration}, skipping`
    );
    return null;
  }

  return passRate;
}

function buildIterationResults(
  workspaceDir: string,
  iterationNumbers: number[]
): IterationResult[] {
  const results: IterationResult[] = [];

  for (const n of iterationNumbers) {
    const passRate = readPassRate(workspaceDir, n);
    if (passRate === null) {
      continue;
    }

    const prev = results.length > 0 ? results[results.length - 1] : null;
    const delta = prev !== null ? passRate - prev.pass_rate : null;

    results.push({
      iteration: n,
      pass_rate: parseFloat(passRate.toFixed(4)),
      delta: delta !== null ? parseFloat(delta.toFixed(4)) : null,
    });
  }

  return results;
}

function detectStatus(
  results: IterationResult[],
  threshold: number,
  window: number,
  maxIterations: number
): "PLATEAU" | "MAX_REACHED" | "CONTINUE" {
  // Not enough data to determine plateau
  if (results.length <= 1) {
    return "CONTINUE";
  }

  const currentIteration = results[results.length - 1].iteration;

  // Check max iterations first
  if (currentIteration >= maxIterations) {
    return "MAX_REACHED";
  }

  // Need at least `window` deltas to check for plateau
  // Deltas start from the second result, so we need at least window + 1 results
  if (results.length < window + 1) {
    return "CONTINUE";
  }

  // Check if the last `window` deltas are all below threshold
  const lastResults = results.slice(-window);
  const allBelowThreshold = lastResults.every(
    (r) => r.delta !== null && r.delta < threshold
  );

  if (allBelowThreshold) {
    return "PLATEAU";
  }

  return "CONTINUE";
}

function buildRecommendation(
  status: "PLATEAU" | "MAX_REACHED" | "CONTINUE",
  results: IterationResult[],
  threshold: number,
  window: number,
  maxIterations: number
): string {
  if (results.length === 0) {
    return "No iteration data found. Ensure benchmark.json files exist in iteration-N/ directories.";
  }

  const best = Math.max(...results.map((r) => r.pass_rate));
  const thresholdPct = (threshold * 100).toFixed(1);

  switch (status) {
    case "PLATEAU":
      return (
        `Pass rate has plateaued (delta < ${thresholdPct}% for ${window} consecutive iterations). ` +
        `Current best: ${best.toFixed(2)}. ` +
        `Consider stopping iteration or fundamentally rethinking the skill approach.`
      );

    case "MAX_REACHED":
      return (
        `Maximum iteration limit reached (${maxIterations}). ` +
        `Current best: ${best.toFixed(2)}. ` +
        `Review results and decide whether to increase the limit or accept current performance.`
      );

    case "CONTINUE":
      if (results.length <= 1) {
        return "Not enough iterations to detect a trend. Continue iterating.";
      }
      return (
        `Pass rate is still improving. Current best: ${best.toFixed(2)}. ` +
        `Continue iterating.`
      );
  }
}

// ── Main ───────────────────────────────────────────────────────────────

function main(): void {
  const { workspaceDir, threshold, window, maxIterations } = parseArgs(
    process.argv.slice(2)
  );

  const iterationNumbers = discoverIterations(workspaceDir);
  const results = buildIterationResults(workspaceDir, iterationNumbers);
  const status = detectStatus(results, threshold, window, maxIterations);
  const currentIteration =
    results.length > 0 ? results[results.length - 1].iteration : 0;

  const output: PlateauOutput = {
    status,
    current_iteration: currentIteration,
    iterations: results,
    recommendation: buildRecommendation(
      status,
      results,
      threshold,
      window,
      maxIterations
    ),
  };

  console.log(JSON.stringify(output, null, 2));

  switch (status) {
    case "CONTINUE":
      process.exit(0);
    case "PLATEAU":
      process.exit(10);
    case "MAX_REACHED":
      process.exit(20);
  }
}

main();

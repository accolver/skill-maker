#!/usr/bin/env bun

/**
 * update-history.ts
 *
 * Tracks version progression across eval iterations by maintaining a
 * history.json file in the workspace root. Each call appends one iteration
 * entry with pass_rate, baseline comparison, and result classification.
 *
 * Usage:
 *   bun run scripts/update-history.ts <workspace-dir> --iteration <N>
 *
 * Exit codes:
 *   0  Success
 *   1  Error
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// ── Types ──────────────────────────────────────────────────────────────

interface BenchmarkJson {
  skill_name?: string;
  run_summary?: {
    with_skill?: {
      pass_rate?: {
        mean?: number;
      };
    };
    without_skill?: {
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
  without_skill?: {
    pass_rate?: {
      mean?: number;
    };
  };
}

type IterationResult = "baseline" | "improved" | "regressed" | "unchanged";

interface HistoryIteration {
  iteration: number;
  pass_rate: number;
  baseline_pass_rate: number;
  delta: number;
  result: IterationResult;
}

interface HistoryJson {
  started_at: string;
  skill_name: string;
  current_best: number;
  iterations: HistoryIteration[];
}

// ── CLI Parsing ────────────────────────────────────────────────────────

const HELP_TEXT = `
update-history - Track version progression across eval iterations

USAGE
  bun run scripts/update-history.ts <workspace-dir> --iteration <N>

ARGUMENTS
  <workspace-dir>    Path to workspace directory containing iteration-N/ dirs

OPTIONS
  --iteration <N>    Iteration number to add to history (required)
  --help, -h         Show this help message

READS
  <workspace>/iteration-<N>/benchmark.json

WRITES
  <workspace>/history.json (creates or updates)

OUTPUT
  Prints updated history.json to stdout.
  Logs progress messages to stderr.

EXIT CODES
  0  Success
  1  Error

BEHAVIOR
  1. Reads benchmark.json from the specified iteration directory
  2. Extracts with_skill pass_rate mean and without_skill (baseline) pass_rate mean
  3. Reads existing history.json from workspace root if it exists
  4. Appends a new iteration entry with result classification:
     - "baseline"   — first iteration (iteration 1)
     - "improved"   — pass_rate > previous best pass_rate
     - "regressed"  — pass_rate < previous best pass_rate
     - "unchanged"  — pass_rate == previous best pass_rate
  5. Updates current_best to the iteration with highest pass_rate
  6. Writes updated history.json to workspace root

EXAMPLE
  bun run scripts/update-history.ts ./workspaces/my-skill-workspace --iteration 3

  Output:
  {
    "started_at": "2026-03-05T12:00:00.000Z",
    "skill_name": "my-skill",
    "current_best": 3,
    "iterations": [
      { "iteration": 1, "pass_rate": 0.65, "baseline_pass_rate": 0.30, "delta": 0.35, "result": "baseline" },
      { "iteration": 2, "pass_rate": 0.85, "baseline_pass_rate": 0.30, "delta": 0.55, "result": "improved" },
      { "iteration": 3, "pass_rate": 1.00, "baseline_pass_rate": 0.30, "delta": 0.70, "result": "improved" }
    ]
  }
`.trim();

function parseArgs(args: string[]): {
  workspaceDir: string;
  iteration: number;
} {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  let workspaceDir = "";
  let iteration: number | null = null;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--iteration") {
      i++;
      if (i >= args.length) {
        console.error("Error: --iteration requires a value. Use --help for usage.");
        process.exit(1);
      }
      const val = parseInt(args[i], 10);
      if (isNaN(val) || val < 1) {
        console.error(
          `Error: --iteration must be a positive integer, got "${args[i]}"`
        );
        process.exit(1);
      }
      iteration = val;
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

  if (iteration === null) {
    console.error(
      "Error: --iteration <N> is required. Use --help for usage."
    );
    process.exit(1);
  }

  return { workspaceDir: resolve(workspaceDir), iteration };
}

// ── Core Logic ─────────────────────────────────────────────────────────

function readBenchmark(workspaceDir: string, iteration: number): BenchmarkJson {
  const benchmarkPath = join(
    workspaceDir,
    `iteration-${iteration}`,
    "benchmark.json"
  );

  if (!existsSync(benchmarkPath)) {
    console.error(
      `Error: benchmark.json not found at ${benchmarkPath}`
    );
    process.exit(1);
  }

  let raw: string;
  try {
    raw = readFileSync(benchmarkPath, "utf-8");
  } catch (err) {
    console.error(
      `Error: Could not read benchmark.json: ${(err as Error).message}`
    );
    process.exit(1);
  }

  let data: BenchmarkJson;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(
      `Error: Invalid JSON in benchmark.json: ${(err as Error).message}`
    );
    process.exit(1);
  }

  return data;
}

function extractPassRate(
  data: BenchmarkJson,
  variant: "with_skill" | "without_skill"
): number {
  // Support both nested (run_summary.with_skill) and flat (with_skill) formats
  const rate =
    data?.run_summary?.[variant]?.pass_rate?.mean ??
    data?.[variant]?.pass_rate?.mean;

  if (rate === undefined || rate === null || typeof rate !== "number") {
    console.error(
      `Error: ${variant}.pass_rate.mean not found or not a number in benchmark.json`
    );
    process.exit(1);
  }

  return rate;
}

function extractSkillName(data: BenchmarkJson): string {
  if (data.skill_name && typeof data.skill_name === "string") {
    return data.skill_name;
  }
  return "unknown";
}

function readExistingHistory(workspaceDir: string): HistoryJson | null {
  const historyPath = join(workspaceDir, "history.json");

  if (!existsSync(historyPath)) {
    return null;
  }

  let raw: string;
  try {
    raw = readFileSync(historyPath, "utf-8");
  } catch (err) {
    console.error(
      `Warning: Could not read existing history.json: ${(err as Error).message}`
    );
    return null;
  }

  try {
    return JSON.parse(raw) as HistoryJson;
  } catch (err) {
    console.error(
      `Warning: Invalid JSON in existing history.json, starting fresh: ${(err as Error).message}`
    );
    return null;
  }
}

function determineResult(
  iteration: number,
  passRate: number,
  existingIterations: HistoryIteration[]
): IterationResult {
  if (iteration === 1 || existingIterations.length === 0) {
    return "baseline";
  }

  const previousBest = Math.max(
    ...existingIterations.map((it) => it.pass_rate)
  );

  if (passRate > previousBest) {
    return "improved";
  } else if (passRate < previousBest) {
    return "regressed";
  } else {
    return "unchanged";
  }
}

function findCurrentBest(iterations: HistoryIteration[]): number {
  if (iterations.length === 0) {
    return 0;
  }

  let bestRate = -1;
  let bestIteration = 0;

  for (const it of iterations) {
    if (it.pass_rate > bestRate) {
      bestRate = it.pass_rate;
      bestIteration = it.iteration;
    }
  }

  return bestIteration;
}

function roundTo4(n: number): number {
  return parseFloat(n.toFixed(4));
}

// ── Main ───────────────────────────────────────────────────────────────

function main(): void {
  const { workspaceDir, iteration } = parseArgs(process.argv.slice(2));

  // Validate workspace directory exists
  if (!existsSync(workspaceDir)) {
    console.error(`Error: Workspace directory does not exist: ${workspaceDir}`);
    process.exit(1);
  }

  console.error(`Reading benchmark.json for iteration ${iteration}...`);

  // Read benchmark data
  const benchmark = readBenchmark(workspaceDir, iteration);
  const passRate = extractPassRate(benchmark, "with_skill");
  const baselinePassRate = extractPassRate(benchmark, "without_skill");
  const skillName = extractSkillName(benchmark);
  const delta = roundTo4(passRate - baselinePassRate);

  console.error(
    `  with_skill pass_rate: ${passRate}, without_skill pass_rate: ${baselinePassRate}, delta: ${delta}`
  );

  // Read or initialize history
  const existing = readExistingHistory(workspaceDir);
  const existingIterations = existing?.iterations ?? [];

  // Check for duplicate iteration
  const alreadyExists = existingIterations.some(
    (it) => it.iteration === iteration
  );
  if (alreadyExists) {
    console.error(
      `Warning: Iteration ${iteration} already exists in history.json, replacing it.`
    );
  }

  // Filter out any existing entry for this iteration (for replacement)
  const filteredIterations = existingIterations.filter(
    (it) => it.iteration !== iteration
  );

  // Determine result classification
  const result = determineResult(iteration, passRate, filteredIterations);

  // Build new iteration entry
  const newEntry: HistoryIteration = {
    iteration,
    pass_rate: roundTo4(passRate),
    baseline_pass_rate: roundTo4(baselinePassRate),
    delta,
    result,
  };

  // Append and sort by iteration number
  const allIterations = [...filteredIterations, newEntry].sort(
    (a, b) => a.iteration - b.iteration
  );

  // Build history object
  const history: HistoryJson = {
    started_at: existing?.started_at ?? new Date().toISOString(),
    skill_name: existing?.skill_name ?? skillName,
    current_best: findCurrentBest(allIterations),
    iterations: allIterations,
  };

  // Write history.json
  const historyPath = join(workspaceDir, "history.json");
  try {
    writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.error(
      `Error: Could not write history.json: ${(err as Error).message}`
    );
    process.exit(1);
  }

  console.error(
    `Updated history.json: iteration ${iteration} → ${result} (current_best: ${history.current_best})`
  );

  // Print to stdout
  console.log(JSON.stringify(history, null, 2));
}

main();

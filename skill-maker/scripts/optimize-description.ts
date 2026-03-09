#!/usr/bin/env bun

/**
 * optimize-description.ts — Optimize a skill description for trigger accuracy
 *
 * Part of the Agent Skills description optimization system. Iteratively
 * improves a skill's description by evaluating it against a set of trigger
 * queries and refining based on failures.
 *
 * Harness-agnostic: works with any CLI that accepts a prompt on stdin and
 * returns a response on stdout, or falls back to interactive mode where the
 * calling agent provides improvements.
 *
 * Usage:
 *   bun run scripts/optimize-description.ts \
 *     --eval-set <path-to-trigger-eval.json> \
 *     --skill-path <path-to-skill> \
 *     --max-iterations 5 \
 *     [--cli <command>]
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvalItem {
  query: string;
  should_trigger: boolean;
}

interface EvalResult {
  query: string;
  should_trigger: boolean;
  actual_triggered: boolean;
  correct: boolean;
}

interface IterationRecord {
  iteration: number;
  description: string;
  train_score: number;
  test_score: number;
  train_results?: EvalResult[];
}

interface OptimizationOutput {
  best_description: string;
  original_description: string;
  train_score: number;
  test_score: number;
  iterations: IterationRecord[];
}

interface TriggerOutput {
  query: string;
  description: string;
  triggered: boolean;
  runs: number;
  yes_count: number;
  mode: "cli" | "subagent";
  prompt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
optimize-description — Optimize a skill description for trigger accuracy

USAGE
  bun run scripts/optimize-description.ts \\
    --eval-set <path> --skill-path <path> [options]

REQUIRED
  --eval-set <path>        Path to trigger eval JSON file. Must be an array of
                           objects with "query" (string) and "should_trigger"
                           (boolean) fields.
  --skill-path <path>      Path to skill directory containing SKILL.md.

OPTIONS
  --max-iterations <n>     Maximum optimization iterations (default: 5).
  --cli <command>          CLI command for LLM calls. Same format as
                           eval-trigger.ts: accepts prompt on stdin, returns
                           response on stdout.
                           Examples:
                             --cli "claude -p"
                             --cli "opencode run"
  --runs <n>               Number of runs per trigger eval (default: 3).
                           Passed through to eval-trigger.ts.
  --help, -h               Show this help message.

MODES
  CLI mode (--cli provided):
    Uses the CLI to both evaluate triggers and generate improved descriptions.
    Fully automated optimization loop.

  Interactive mode (no --cli):
    Evaluates triggers using eval-trigger.ts in subagent mode (outputs prompts
    for the calling agent). Outputs improvement prompts to stderr for the
    calling agent to process, then reads the improved description from stdin.

EVAL SET FORMAT
  [
    { "query": "realistic user prompt that should trigger", "should_trigger": true },
    { "query": "near-miss that should NOT trigger", "should_trigger": false }
  ]

TRAIN/TEST SPLIT
  The eval set is split deterministically by array order:
    - First 60% → training set (used for optimization feedback)
    - Last 40% → test set (used for final scoring, prevents overfitting)

OUTPUT (JSON to stdout)
  {
    "best_description": "...",
    "original_description": "...",
    "train_score": 0.95,
    "test_score": 0.90,
    "iterations": [
      {
        "iteration": 1,
        "description": "...",
        "train_score": 0.85,
        "test_score": 0.80
      }
    ]
  }

EXIT CODES
  0   Success
  1   Error

EXAMPLES
  # Fully automated with CLI
  bun run scripts/optimize-description.ts \\
    --eval-set ./my-skill/evals/trigger-eval.json \\
    --skill-path ./my-skill \\
    --cli "claude -p" \\
    --max-iterations 5

  # Interactive mode (agent provides improvements)
  bun run scripts/optimize-description.ts \\
    --eval-set ./my-skill/evals/trigger-eval.json \\
    --skill-path ./my-skill
`.trim();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(message: string, hint?: string): never {
  console.error(`\n  ✗ Error: ${message}`);
  if (hint) console.error(`    → ${hint}`);
  console.error();
  process.exit(1);
}

/**
 * Extract the description from SKILL.md YAML frontmatter.
 */
function extractDescription(skillPath: string): string {
  const skillMdPath = join(skillPath, "SKILL.md");

  if (!existsSync(skillMdPath)) {
    die(`SKILL.md not found at ${skillMdPath}`);
  }

  const content = readFileSync(skillMdPath, "utf-8");
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!fmMatch) {
    die("SKILL.md is missing YAML frontmatter (--- delimiters)");
  }

  const frontmatter = fmMatch[1];

  // Parse description from frontmatter
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  if (!descMatch) {
    die("SKILL.md frontmatter is missing 'description' field");
  }

  // Strip surrounding quotes if present
  return descMatch[1].trim().replace(/^["']|["']$/g, "");
}

/**
 * Read and validate the eval set JSON file.
 */
function readEvalSet(evalSetPath: string): EvalItem[] {
  if (!existsSync(evalSetPath)) {
    die(`Eval set file not found: ${evalSetPath}`);
  }

  let raw: string;
  try {
    raw = readFileSync(evalSetPath, "utf-8");
  } catch (err) {
    die(`Could not read eval set: ${err instanceof Error ? err.message : String(err)}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    die(`Invalid JSON in eval set: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!Array.isArray(data)) {
    die("Eval set must be a JSON array");
  }

  if (data.length === 0) {
    die("Eval set is empty");
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (typeof item !== "object" || item === null) {
      die(`Eval set item ${i} is not an object`);
    }
    if (typeof (item as Record<string, unknown>).query !== "string") {
      die(`Eval set item ${i} is missing "query" string field`);
    }
    if (typeof (item as Record<string, unknown>).should_trigger !== "boolean") {
      die(`Eval set item ${i} is missing "should_trigger" boolean field`);
    }
  }

  return data as EvalItem[];
}

/**
 * Split eval set into train (60%) and test (40%) by array order.
 */
function splitEvalSet(items: EvalItem[]): { train: EvalItem[]; test: EvalItem[] } {
  const splitIndex = Math.ceil(items.length * 0.6);
  return {
    train: items.slice(0, splitIndex),
    test: items.slice(splitIndex),
  };
}

/**
 * Resolve the path to eval-trigger.ts relative to this script.
 */
function getEvalTriggerPath(): string {
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  const evalTriggerPath = join(scriptDir, "eval-trigger.ts");

  if (!existsSync(evalTriggerPath)) {
    die(`eval-trigger.ts not found at ${evalTriggerPath}`);
  }

  return evalTriggerPath;
}

/**
 * Evaluate a description against a set of queries using eval-trigger.ts.
 */
async function evaluateDescription(
  description: string,
  evalItems: EvalItem[],
  cli: string | null,
  runs: number,
  evalTriggerPath: string,
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (const item of evalItems) {
    const args = [
      "run", evalTriggerPath,
      "--description", description,
      "--query", item.query,
      "--runs", String(runs),
    ];

    if (cli) {
      args.push("--cli", cli);
    }

    try {
      const proc = Bun.spawn(["bun", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();

      let triggerOutput: TriggerOutput;
      try {
        triggerOutput = JSON.parse(stdout.trim());
      } catch {
        console.error(`  ⚠ Could not parse eval-trigger output for query: "${item.query.slice(0, 60)}"`);
        results.push({
          query: item.query,
          should_trigger: item.should_trigger,
          actual_triggered: false,
          correct: !item.should_trigger,
        });
        continue;
      }

      const actual = triggerOutput.triggered;
      results.push({
        query: item.query,
        should_trigger: item.should_trigger,
        actual_triggered: actual,
        correct: actual === item.should_trigger,
      });
    } catch (err) {
      console.error(`  ⚠ eval-trigger failed for query: "${item.query.slice(0, 60)}": ${err instanceof Error ? err.message : String(err)}`);
      results.push({
        query: item.query,
        should_trigger: item.should_trigger,
        actual_triggered: false,
        correct: !item.should_trigger,
      });
    }
  }

  return results;
}

/**
 * Calculate score as percentage of correct results.
 */
function calculateScore(results: EvalResult[]): number {
  if (results.length === 0) return 0;
  const correct = results.filter((r) => r.correct).length;
  return Math.round((correct / results.length) * 1000) / 1000;
}

/**
 * Build an improvement prompt based on failures.
 */
function buildImprovementPrompt(
  currentDescription: string,
  failures: EvalResult[],
  trainScore: number,
): string {
  const falsePositives = failures.filter((f) => f.actual_triggered && !f.should_trigger);
  const falseNegatives = failures.filter((f) => !f.actual_triggered && f.should_trigger);

  const lines: string[] = [
    "You are optimizing a skill description for an AI coding agent skill system.",
    "The description determines when the skill is invoked. It must be specific",
    "enough to trigger for relevant queries and NOT trigger for irrelevant ones.",
    "",
    `Current description: "${currentDescription}"`,
    `Current accuracy: ${(trainScore * 100).toFixed(1)}%`,
    "",
  ];

  if (falseNegatives.length > 0) {
    lines.push("MISSED TRIGGERS (should have triggered but didn't):");
    for (const f of falseNegatives) {
      lines.push(`  - "${f.query}"`);
    }
    lines.push("");
  }

  if (falsePositives.length > 0) {
    lines.push("FALSE TRIGGERS (triggered but shouldn't have):");
    for (const f of falsePositives) {
      lines.push(`  - "${f.query}"`);
    }
    lines.push("");
  }

  lines.push(
    "Write an improved description that fixes these failures.",
    "The description must be a single line, under 1024 characters.",
    "It should clearly state what the skill does and when to use it.",
    "Output ONLY the new description text, nothing else.",
  );

  return lines.join("\n");
}

/**
 * Get an improved description via CLI.
 */
async function getImprovedDescriptionCli(
  cli: string,
  prompt: string,
  timeoutMs: number = 60000,
): Promise<string | null> {
  const parts = cli.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 0) return null;

  const cmd = parts[0];
  const args = parts.slice(1);

  try {
    const proc = Bun.spawn([cmd, ...args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`CLI timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    await Promise.race([proc.exited, timeoutPromise]);

    const stdout = await new Response(proc.stdout).text();
    const result = stdout.trim();

    if (!result || result.length === 0) {
      console.error("  ⚠ CLI returned empty response for improvement prompt");
      return null;
    }

    // Clean up: remove surrounding quotes if the LLM wrapped them
    const cleaned = result.replace(/^["']|["']$/g, "").trim();

    // Validate length
    if (cleaned.length > 1024) {
      console.error(`  ⚠ Improved description exceeds 1024 chars (${cleaned.length}), truncating`);
      return cleaned.slice(0, 1024);
    }

    return cleaned;
  } catch (err) {
    console.error(`  ⚠ CLI improvement failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Get an improved description via stdin (interactive mode).
 */
async function getImprovedDescriptionInteractive(prompt: string): Promise<string | null> {
  console.error("\n" + "─".repeat(60));
  console.error("IMPROVEMENT PROMPT (provide improved description on stdin):");
  console.error("─".repeat(60));
  console.error(prompt);
  console.error("─".repeat(60));
  console.error("Enter the improved description (single line, then EOF/Ctrl-D):\n");

  try {
    const reader = Bun.stdin.stream().getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    const input = chunks.map((c) => decoder.decode(c, { stream: true })).join("") + decoder.decode();
    const result = input.trim();

    if (!result || result.length === 0) {
      return null;
    }

    // Take only the first line
    const firstLine = result.split("\n")[0].trim().replace(/^["']|["']$/g, "");

    if (firstLine.length > 1024) {
      console.error(`  ⚠ Description exceeds 1024 chars (${firstLine.length}), truncating`);
      return firstLine.slice(0, 1024);
    }

    return firstLine;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  evalSetPath: string;
  skillPath: string;
  maxIterations: number;
  cli: string | null;
  runs: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let evalSetPath: string | null = null;
  let skillPath: string | null = null;
  let maxIterations = 5;
  let cli: string | null = null;
  let runs = 3;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--eval-set") {
      i++;
      if (i >= args.length) die("--eval-set requires a value");
      evalSetPath = args[i];
    } else if (arg === "--skill-path") {
      i++;
      if (i >= args.length) die("--skill-path requires a value");
      skillPath = args[i];
    } else if (arg === "--max-iterations") {
      i++;
      const val = parseInt(args[i], 10);
      if (isNaN(val) || val < 1) {
        die(`--max-iterations must be a positive integer, got "${args[i]}"`);
      }
      maxIterations = val;
    } else if (arg === "--cli") {
      i++;
      if (i >= args.length) die("--cli requires a value");
      cli = args[i];
    } else if (arg === "--runs") {
      i++;
      const val = parseInt(args[i], 10);
      if (isNaN(val) || val < 1) {
        die(`--runs must be a positive integer, got "${args[i]}"`);
      }
      runs = val;
    } else if (arg.startsWith("--")) {
      die(`Unknown option "${arg}"`, "Run with --help for usage.");
    } else {
      die(`Unexpected positional argument "${arg}"`, "Run with --help for usage.");
    }

    i++;
  }

  if (!evalSetPath) {
    die("Missing required option --eval-set", "Run with --help for usage.");
  }

  if (!skillPath) {
    die("Missing required option --skill-path", "Run with --help for usage.");
  }

  return {
    evalSetPath: resolve(evalSetPath!),
    skillPath: resolve(skillPath!),
    maxIterations,
    cli,
    runs,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { evalSetPath, skillPath, maxIterations, cli, runs } = parseArgs(process.argv);

  // Read inputs
  const evalSet = readEvalSet(evalSetPath);
  const originalDescription = extractDescription(skillPath);
  const evalTriggerPath = getEvalTriggerPath();

  console.error(`\n  Skill path: ${skillPath}`);
  console.error(`  Original description: "${originalDescription}"`);
  console.error(`  Eval set: ${evalSet.length} queries`);
  console.error(`  Mode: ${cli ? "CLI" : "interactive"}`);
  console.error(`  Max iterations: ${maxIterations}`);

  // Split eval set
  const { train, test } = splitEvalSet(evalSet);
  console.error(`  Train set: ${train.length} queries`);
  console.error(`  Test set: ${test.length} queries`);
  console.error();

  let currentDescription = originalDescription;
  let bestDescription = originalDescription;
  let bestTestScore = 0;
  const iterations: IterationRecord[] = [];

  for (let iter = 1; iter <= maxIterations; iter++) {
    console.error(`─── Iteration ${iter}/${maxIterations} ───`);
    console.error(`  Description: "${currentDescription.slice(0, 80)}${currentDescription.length > 80 ? "..." : ""}"`);

    // Evaluate against train set
    console.error(`  Evaluating against train set (${train.length} queries)...`);
    const trainResults = await evaluateDescription(
      currentDescription, train, cli, runs, evalTriggerPath,
    );
    const trainScore = calculateScore(trainResults);

    // Evaluate against test set
    console.error(`  Evaluating against test set (${test.length} queries)...`);
    const testResults = await evaluateDescription(
      currentDescription, test, cli, runs, evalTriggerPath,
    );
    const testScore = calculateScore(testResults);

    console.error(`  Train score: ${(trainScore * 100).toFixed(1)}%`);
    console.error(`  Test score: ${(testScore * 100).toFixed(1)}%`);

    const iterRecord: IterationRecord = {
      iteration: iter,
      description: currentDescription,
      train_score: trainScore,
      test_score: testScore,
    };
    iterations.push(iterRecord);

    // Track best by test score
    if (testScore > bestTestScore) {
      bestTestScore = testScore;
      bestDescription = currentDescription;
      console.error(`  ★ New best test score: ${(bestTestScore * 100).toFixed(1)}%`);
    }

    // Perfect score — stop early
    if (trainScore >= 1.0 && testScore >= 1.0) {
      console.error(`  ✓ Perfect score on both train and test — stopping.`);
      break;
    }

    // Last iteration — don't generate improvement
    if (iter >= maxIterations) {
      console.error(`  Reached max iterations.`);
      break;
    }

    // Generate improvement
    const failures = trainResults.filter((r) => !r.correct);
    if (failures.length === 0) {
      console.error(`  ✓ Perfect train score — evaluating if test can improve...`);
      // If train is perfect but test isn't, we still try to improve
      const testFailures = testResults.filter((r) => !r.correct);
      if (testFailures.length === 0) {
        console.error(`  ✓ Perfect on both sets — stopping.`);
        break;
      }
    }

    const improvementPrompt = buildImprovementPrompt(
      currentDescription,
      trainResults.filter((r) => !r.correct),
      trainScore,
    );

    let improved: string | null = null;
    if (cli) {
      console.error(`  Generating improved description via CLI...`);
      improved = await getImprovedDescriptionCli(cli, improvementPrompt);
    } else {
      improved = await getImprovedDescriptionInteractive(improvementPrompt);
    }

    if (!improved) {
      console.error(`  ⚠ Could not get improved description — stopping.`);
      break;
    }

    console.error(`  New description: "${improved.slice(0, 80)}${improved.length > 80 ? "..." : ""}"`);
    currentDescription = improved;
    console.error();
  }

  // Find best iteration by test score
  const bestIter = iterations.reduce((best, iter) =>
    iter.test_score > best.test_score ? iter : best,
  );

  const output: OptimizationOutput = {
    best_description: bestDescription,
    original_description: originalDescription,
    train_score: bestIter.train_score,
    test_score: bestIter.test_score,
    iterations,
  };

  console.log(JSON.stringify(output, null, 2));

  console.error(`\n  ✓ Optimization complete.`);
  console.error(`  Best description: "${bestDescription.slice(0, 80)}${bestDescription.length > 80 ? "..." : ""}"`);
  console.error(`  Best test score: ${(bestTestScore * 100).toFixed(1)}%`);
  console.error();
}

main().catch((err) => {
  console.error(`\n  ✗ Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

#!/usr/bin/env bun

/**
 * eval-trigger.ts — Test whether a skill description triggers for a given query
 *
 * Part of the Agent Skills description optimization system. Evaluates whether
 * an AI coding agent would invoke a skill based on its description when
 * presented with a user query.
 *
 * Harness-agnostic: works with any CLI that accepts a prompt on stdin and
 * returns a response on stdout, or falls back to subagent mode where the
 * calling agent handles execution.
 *
 * Usage:
 *   bun run scripts/eval-trigger.ts --description <desc> --query <query> [--cli <command>] [--runs 3]
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriggerResult {
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
eval-trigger — Test whether a skill description would trigger for a given query

USAGE
  bun run scripts/eval-trigger.ts --description <desc> --query <query> [options]

REQUIRED
  --description <desc>   The skill description to test. This is the text an
                         agent sees when deciding whether to invoke the skill.
  --query <query>        The user query to test against. This simulates what
                         a user would type to an AI coding agent.

OPTIONS
  --cli <command>        CLI command that accepts a prompt on stdin and returns
                         a response on stdout. The command is split on spaces
                         and executed as a subprocess.
                         Examples:
                           --cli "claude -p"
                           --cli "opencode run"
                           --cli "cat"  (for testing — always echoes input)
  --runs <n>             Number of runs for reliability (default: 3).
                         Majority vote determines the final triggered value.
                         Only used in CLI mode.
  --timeout <ms>         Timeout per CLI run in milliseconds (default: 30000).
  --help, -h             Show this help message.

MODES
  CLI mode (--cli provided):
    Spawns the CLI command for each run, pipes in a trigger-evaluation prompt,
    parses the response for YES/NO, and uses majority vote to determine the
    final result.

  Subagent mode (no --cli):
    Outputs a JSON object with mode "subagent" and includes the full prompt
    text. The calling agent can use its own subagent system to evaluate the
    prompt and determine the result.

OUTPUT (JSON to stdout)
  {
    "query": "...",
    "description": "...",
    "triggered": true,
    "runs": 3,
    "yes_count": 2,
    "mode": "cli"
  }

  In subagent mode, the output also includes a "prompt" field with the full
  evaluation prompt text.

EXIT CODES
  0   Success
  1   Error (missing arguments, CLI failure, etc.)

EXAMPLES
  # CLI mode with claude
  bun run scripts/eval-trigger.ts \\
    --description "Generate API documentation from code" \\
    --query "Document this Express router" \\
    --cli "claude -p"

  # CLI mode with multiple runs
  bun run scripts/eval-trigger.ts \\
    --description "Fix database migration issues" \\
    --query "My migration is failing" \\
    --cli "opencode run" \\
    --runs 5

  # Subagent mode (no --cli)
  bun run scripts/eval-trigger.ts \\
    --description "Generate API documentation from code" \\
    --query "Document this Express router"
`.trim();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(message: string, hint?: string): never {
  const error: TriggerResult = {
    query: "",
    description: "",
    triggered: false,
    runs: 0,
    yes_count: 0,
    mode: "cli",
    error: message,
  };
  console.error(`\n  ✗ Error: ${message}`);
  if (hint) console.error(`    → ${hint}`);
  console.error();
  process.exit(1);
}

/**
 * Build the prompt used to evaluate whether a skill should trigger.
 */
function buildPrompt(description: string, query: string): string {
  return [
    "You are evaluating whether an AI coding agent skill should be invoked.",
    "",
    `Skill description: "${description}"`,
    "",
    `User message: "${query}"`,
    "",
    "Would you invoke this skill for this user message?",
    "Consider whether the user's intent matches what the skill provides.",
    "Answer only YES or NO.",
  ].join("\n");
}

/**
 * Parse a CLI response for YES or NO.
 * Returns true for YES, false for NO, null if unparseable.
 */
function parseResponse(response: string): boolean | null {
  const cleaned = response.trim().toUpperCase();

  // Check for exact match first
  if (cleaned === "YES") return true;
  if (cleaned === "NO") return false;

  // Check if response starts with YES or NO
  if (cleaned.startsWith("YES")) return true;
  if (cleaned.startsWith("NO")) return false;

  // Check if response contains YES or NO (prefer the first occurrence)
  const yesIndex = cleaned.indexOf("YES");
  const noIndex = cleaned.indexOf("NO");

  if (yesIndex !== -1 && (noIndex === -1 || yesIndex < noIndex)) return true;
  if (noIndex !== -1 && (yesIndex === -1 || noIndex < yesIndex)) return false;

  return null;
}

/**
 * Run a single CLI evaluation.
 */
async function runCliEval(
  cliCommand: string,
  prompt: string,
  timeoutMs: number,
): Promise<{ response: string; parsed: boolean | null; error?: string }> {
  const parts = cliCommand.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 0) {
    return { response: "", parsed: null, error: "Empty CLI command" };
  }

  const cmd = parts[0];
  const args = parts.slice(1);

  try {
    const proc = Bun.spawn([cmd, ...args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    // Write prompt to stdin and close
    proc.stdin.write(prompt);
    proc.stdin.end();

    // Race between process completion and timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        proc.kill();
        reject(new Error(`CLI timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const exitCode = await Promise.race([proc.exited, timeoutPromise]);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      return {
        response: stdout,
        parsed: null,
        error: `CLI exited with code ${exitCode}${stderr ? `: ${stderr.trim().slice(0, 200)}` : ""}`,
      };
    }

    const parsed = parseResponse(stdout);
    return { response: stdout.trim(), parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { response: "", parsed: null, error: message };
  }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  description: string;
  query: string;
  cli: string | null;
  runs: number;
  timeout: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let description: string | null = null;
  let query: string | null = null;
  let cli: string | null = null;
  let runs = 3;
  let timeout = 30000;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--description") {
      i++;
      if (i >= args.length) die("--description requires a value");
      description = args[i];
    } else if (arg === "--query") {
      i++;
      if (i >= args.length) die("--query requires a value");
      query = args[i];
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
    } else if (arg === "--timeout") {
      i++;
      const val = parseInt(args[i], 10);
      if (isNaN(val) || val < 1000) {
        die(`--timeout must be at least 1000ms, got "${args[i]}"`);
      }
      timeout = val;
    } else if (arg.startsWith("--")) {
      die(`Unknown option "${arg}"`, "Run with --help for usage.");
    } else {
      die(`Unexpected positional argument "${arg}"`, "Run with --help for usage.");
    }

    i++;
  }

  if (!description) {
    die("Missing required option --description", "Run with --help for usage.");
  }

  if (!query) {
    die("Missing required option --query", "Run with --help for usage.");
  }

  return { description: description!, query: query!, cli, runs, timeout };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { description, query, cli, runs, timeout } = parseArgs(process.argv);
  const prompt = buildPrompt(description, query);

  // ── Subagent mode ──────────────────────────────────────────────────
  if (!cli) {
    const result: TriggerResult = {
      query,
      description,
      triggered: false,
      runs: 0,
      yes_count: 0,
      mode: "subagent",
      prompt,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // ── CLI mode ───────────────────────────────────────────────────────
  let yesCount = 0;
  let completedRuns = 0;
  const errors: string[] = [];

  for (let run = 0; run < runs; run++) {
    const result = await runCliEval(cli, prompt, timeout);

    if (result.error) {
      errors.push(`Run ${run + 1}: ${result.error}`);
      console.error(`  ⚠ Run ${run + 1}/${runs}: ${result.error}`);
      continue;
    }

    if (result.parsed === null) {
      errors.push(`Run ${run + 1}: Could not parse response as YES/NO: "${result.response.slice(0, 100)}"`);
      console.error(`  ⚠ Run ${run + 1}/${runs}: Unparseable response: "${result.response.slice(0, 100)}"`);
      continue;
    }

    completedRuns++;
    if (result.parsed) yesCount++;
    console.error(`  ✓ Run ${run + 1}/${runs}: ${result.parsed ? "YES" : "NO"}`);
  }

  if (completedRuns === 0) {
    const output: TriggerResult = {
      query,
      description,
      triggered: false,
      runs,
      yes_count: 0,
      mode: "cli",
      error: `All ${runs} runs failed: ${errors.join("; ")}`,
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  // Majority vote
  const triggered = yesCount > completedRuns / 2;

  const output: TriggerResult = {
    query,
    description,
    triggered,
    runs: completedRuns,
    yes_count: yesCount,
    mode: "cli",
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(`\n  ✗ Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

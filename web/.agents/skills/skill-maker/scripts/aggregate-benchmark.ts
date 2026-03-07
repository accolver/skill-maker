#!/usr/bin/env bun

import * as fs from "node:fs";
import * as path from "node:path";

// ── Types ──────────────────────────────────────────────────────────────────

interface TimingData {
  total_tokens: number;
  duration_ms: number;
}

interface GradingSummary {
  passed: number;
  failed: number;
  total: number;
  pass_rate: number;
}

interface GradingData {
  assertion_results: unknown[];
  summary: GradingSummary;
}

interface RunMetrics {
  pass_rate: number;
  time_seconds: number;
  tokens: number;
}

interface StatPair {
  mean: number;
  stddev: number;
}

interface RunSummary {
  with_skill: {
    pass_rate: StatPair;
    time_seconds: StatPair;
    tokens: StatPair;
  };
  without_skill: {
    pass_rate: StatPair;
    time_seconds: StatPair;
    tokens: StatPair;
  };
  delta: {
    pass_rate: number;
    time_seconds: number;
    tokens: number;
  };
}

interface PerEvalEntry {
  eval_name: string;
  with_skill: RunMetrics;
  without_skill: RunMetrics;
}

interface Benchmark {
  skill_name: string;
  iteration: number;
  timestamp: string;
  run_summary: RunSummary;
  per_eval: PerEvalEntry[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const squaredDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

function round(value: number, decimals: number = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function computeStats(values: number[]): StatPair {
  return {
    mean: round(mean(values)),
    stddev: round(stddev(values)),
  };
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function parseIterationNumber(dirName: string): number {
  const match = dirName.match(/iteration[_-]?(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function findBaselineDir(evalDir: string): string | null {
  const withoutSkill = path.join(evalDir, "without_skill");
  if (fs.existsSync(withoutSkill)) return withoutSkill;

  const oldSkill = path.join(evalDir, "old_skill");
  if (fs.existsSync(oldSkill)) return oldSkill;

  return null;
}

function extractEvalName(dirName: string): string {
  // Strip "eval-" prefix if present
  return dirName.replace(/^eval-/, "");
}

// ── CLI ────────────────────────────────────────────────────────────────────

const HELP = `
aggregate-benchmark — Aggregate grading results into a benchmark summary

USAGE
  bun run scripts/aggregate-benchmark.ts <iteration-dir> --skill-name <name>

ARGUMENTS
  <iteration-dir>       Path to an iteration directory (e.g. workspace/iteration-1/)

OPTIONS
  --skill-name <name>   Name of the skill being benchmarked (required)
  --help, -h            Show this help message

DESCRIPTION
  Reads grading.json and timing.json from each eval's with_skill/ and
  without_skill/ (or old_skill/) subdirectories, then produces:

    benchmark.json   — structured summary with per-eval and aggregate stats
    benchmark.md     — human-readable markdown table

  Both files are written to the iteration directory.

EXAMPLES
  bun run scripts/aggregate-benchmark.ts workspace/iteration-1/ --skill-name csv-analyzer
`.trim();

function parseArgs(argv: string[]): { iterationDir: string; skillName: string } {
  // argv in Bun: [bun, script, ...args]
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let iterationDir: string | null = null;
  let skillName: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skill-name") {
      skillName = args[++i] ?? null;
    } else if (!args[i].startsWith("-")) {
      iterationDir = args[i];
    }
  }

  if (!iterationDir) {
    console.error("Error: <iteration-dir> argument is required.\n");
    console.error("Run with --help for usage information.");
    process.exit(1);
  }

  if (!skillName) {
    console.error("Error: --skill-name <name> is required.\n");
    console.error("Run with --help for usage information.");
    process.exit(1);
  }

  return { iterationDir, skillName };
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const { iterationDir, skillName } = parseArgs(process.argv);

  const resolvedDir = path.resolve(iterationDir);

  if (!fs.existsSync(resolvedDir)) {
    console.error(`Error: Iteration directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  if (!fs.statSync(resolvedDir).isDirectory()) {
    console.error(`Error: Not a directory: ${resolvedDir}`);
    process.exit(1);
  }

  // Discover eval directories (directories starting with "eval-")
  const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
  const evalDirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith("eval-"))
    .map((e) => e.name)
    .sort();

  if (evalDirs.length === 0) {
    console.error(`Error: No eval directories (eval-*) found in ${resolvedDir}`);
    process.exit(1);
  }

  const iterationNum = parseIterationNumber(path.basename(resolvedDir));

  const withSkillPassRates: number[] = [];
  const withSkillTimes: number[] = [];
  const withSkillTokens: number[] = [];

  const withoutSkillPassRates: number[] = [];
  const withoutSkillTimes: number[] = [];
  const withoutSkillTokens: number[] = [];

  const perEval: PerEvalEntry[] = [];
  let warnings = 0;

  for (const evalDirName of evalDirs) {
    const evalPath = path.join(resolvedDir, evalDirName);
    const evalName = extractEvalName(evalDirName);

    const withSkillDir = path.join(evalPath, "with_skill");
    const baselineDir = findBaselineDir(evalPath);

    if (!fs.existsSync(withSkillDir)) {
      console.warn(`⚠ Skipping ${evalDirName}: missing with_skill/ directory`);
      warnings++;
      continue;
    }

    if (!baselineDir) {
      console.warn(`⚠ Skipping ${evalDirName}: missing without_skill/ or old_skill/ directory`);
      warnings++;
      continue;
    }

    // Read with_skill data
    const wsGrading = readJsonFile<GradingData>(path.join(withSkillDir, "grading.json"));
    const wsTiming = readJsonFile<TimingData>(path.join(withSkillDir, "timing.json"));

    if (!wsGrading) {
      console.warn(`⚠ ${evalDirName}/with_skill: missing or invalid grading.json`);
      warnings++;
    }
    if (!wsTiming) {
      console.warn(`⚠ ${evalDirName}/with_skill: missing or invalid timing.json`);
      warnings++;
    }

    // Read baseline data
    const baselineName = path.basename(baselineDir);
    const blGrading = readJsonFile<GradingData>(path.join(baselineDir, "grading.json"));
    const blTiming = readJsonFile<TimingData>(path.join(baselineDir, "timing.json"));

    if (!blGrading) {
      console.warn(`⚠ ${evalDirName}/${baselineName}: missing or invalid grading.json`);
      warnings++;
    }
    if (!blTiming) {
      console.warn(`⚠ ${evalDirName}/${baselineName}: missing or invalid timing.json`);
      warnings++;
    }

    // We need at least grading data from both sides to include this eval
    if (!wsGrading || !blGrading) {
      console.warn(`⚠ Skipping ${evalDirName}: insufficient grading data`);
      warnings++;
      continue;
    }

    const wsMetrics: RunMetrics = {
      pass_rate: round(wsGrading.summary.pass_rate),
      time_seconds: round(wsTiming ? wsTiming.duration_ms / 1000 : 0, 1),
      tokens: wsTiming ? wsTiming.total_tokens : 0,
    };

    const blMetrics: RunMetrics = {
      pass_rate: round(blGrading.summary.pass_rate),
      time_seconds: round(blTiming ? blTiming.duration_ms / 1000 : 0, 1),
      tokens: blTiming ? blTiming.total_tokens : 0,
    };

    withSkillPassRates.push(wsMetrics.pass_rate);
    withSkillTimes.push(wsMetrics.time_seconds);
    withSkillTokens.push(wsMetrics.tokens);

    withoutSkillPassRates.push(blMetrics.pass_rate);
    withoutSkillTimes.push(blMetrics.time_seconds);
    withoutSkillTokens.push(blMetrics.tokens);

    perEval.push({
      eval_name: evalName,
      with_skill: wsMetrics,
      without_skill: blMetrics,
    });
  }

  if (perEval.length === 0) {
    console.error("Error: No eval directories had sufficient data to aggregate.");
    process.exit(1);
  }

  // Compute aggregate stats
  const wsPassRateStats = computeStats(withSkillPassRates);
  const wsTimeStats = computeStats(withSkillTimes);
  const wsTokenStats = computeStats(withSkillTokens);

  const blPassRateStats = computeStats(withoutSkillPassRates);
  const blTimeStats = computeStats(withoutSkillTimes);
  const blTokenStats = computeStats(withoutSkillTokens);

  const benchmark: Benchmark = {
    skill_name: skillName,
    iteration: iterationNum,
    timestamp: new Date().toISOString(),
    run_summary: {
      with_skill: {
        pass_rate: wsPassRateStats,
        time_seconds: wsTimeStats,
        tokens: wsTokenStats,
      },
      without_skill: {
        pass_rate: blPassRateStats,
        time_seconds: blTimeStats,
        tokens: blTokenStats,
      },
      delta: {
        pass_rate: round(wsPassRateStats.mean - blPassRateStats.mean),
        time_seconds: round(wsTimeStats.mean - blTimeStats.mean, 1),
        tokens: round(wsTokenStats.mean - blTokenStats.mean, 0),
      },
    },
    per_eval: perEval,
  };

  // Write benchmark.json
  const jsonPath = path.join(resolvedDir, "benchmark.json");
  fs.writeFileSync(jsonPath, JSON.stringify(benchmark, null, 2) + "\n", "utf-8");

  // Write benchmark.md
  const mdPath = path.join(resolvedDir, "benchmark.md");
  fs.writeFileSync(mdPath, generateMarkdown(benchmark, warnings), "utf-8");

  // Print summary to stdout
  printSummary(benchmark, warnings);

  console.log(`\n✅ Written: ${jsonPath}`);
  console.log(`✅ Written: ${mdPath}`);
}

// ── Markdown Generation ────────────────────────────────────────────────────

function generateMarkdown(b: Benchmark, warnings: number): string {
  const d = b.run_summary.delta;
  const passEmoji = d.pass_rate > 0 ? "✅" : d.pass_rate < 0 ? "❌" : "➖";

  const lines: string[] = [
    `# Benchmark: ${b.skill_name} (Iteration ${b.iteration})`,
    "",
    `> Generated: ${b.timestamp}`,
    "",
    "## Aggregate Summary",
    "",
    "| Metric | With Skill | Without Skill | Delta |",
    "|--------|-----------|---------------|-------|",
    `| Pass Rate | ${fmt(b.run_summary.with_skill.pass_rate.mean, "%")} ± ${fmt(b.run_summary.with_skill.pass_rate.stddev, "%")} | ${fmt(b.run_summary.without_skill.pass_rate.mean, "%")} ± ${fmt(b.run_summary.without_skill.pass_rate.stddev, "%")} | ${passEmoji} ${fmtDelta(d.pass_rate, "%")} |`,
    `| Time (s) | ${b.run_summary.with_skill.time_seconds.mean} ± ${b.run_summary.with_skill.time_seconds.stddev} | ${b.run_summary.without_skill.time_seconds.mean} ± ${b.run_summary.without_skill.time_seconds.stddev} | ${fmtDelta(d.time_seconds, "s")} |`,
    `| Tokens | ${Math.round(b.run_summary.with_skill.tokens.mean)} ± ${Math.round(b.run_summary.with_skill.tokens.stddev)} | ${Math.round(b.run_summary.without_skill.tokens.mean)} ± ${Math.round(b.run_summary.without_skill.tokens.stddev)} | ${fmtDelta(d.tokens, "")} |`,
    "",
    "## Per-Eval Results",
    "",
    "| Eval | With Skill Pass Rate | Without Skill Pass Rate | Δ Pass Rate | With Skill Tokens | Without Skill Tokens |",
    "|------|---------------------|------------------------|-------------|-------------------|---------------------|",
  ];

  for (const e of b.per_eval) {
    const delta = round(e.with_skill.pass_rate - e.without_skill.pass_rate);
    const emoji = delta > 0 ? "✅" : delta < 0 ? "❌" : "➖";
    lines.push(
      `| ${e.eval_name} | ${fmt(e.with_skill.pass_rate, "%")} | ${fmt(e.without_skill.pass_rate, "%")} | ${emoji} ${fmtDelta(delta, "%")} | ${e.with_skill.tokens} | ${e.without_skill.tokens} |`
    );
  }

  lines.push("");
  lines.push(`---`);
  lines.push(`*${b.per_eval.length} evals aggregated${warnings > 0 ? `, ${warnings} warning(s)` : ""}*`);
  lines.push("");

  return lines.join("\n");
}

function fmt(value: number, suffix: string): string {
  if (suffix === "%") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return `${value}${suffix}`;
}

function fmtDelta(value: number, suffix: string): string {
  const sign = value > 0 ? "+" : "";
  if (suffix === "%") {
    return `${sign}${(value * 100).toFixed(1)}%`;
  }
  return `${sign}${value}${suffix}`;
}

// ── Console Output ─────────────────────────────────────────────────────────

function printSummary(b: Benchmark, warnings: number): void {
  const d = b.run_summary.delta;
  const hr = "─".repeat(60);

  console.log(hr);
  console.log(`  Benchmark: ${b.skill_name} — Iteration ${b.iteration}`);
  console.log(hr);
  console.log(`  Evals aggregated: ${b.per_eval.length}`);
  if (warnings > 0) {
    console.log(`  Warnings: ${warnings}`);
  }
  console.log("");

  console.log("  ┌─────────────┬──────────────────┬──────────────────┬────────────┐");
  console.log("  │ Metric      │ With Skill       │ Without Skill    │ Delta      │");
  console.log("  ├─────────────┼──────────────────┼──────────────────┼────────────┤");

  const wspr = b.run_summary.with_skill.pass_rate;
  const blpr = b.run_summary.without_skill.pass_rate;
  console.log(
    `  │ Pass Rate   │ ${pad(fmt(wspr.mean, "%"), 16)} │ ${pad(fmt(blpr.mean, "%"), 16)} │ ${pad(fmtDelta(d.pass_rate, "%"), 10)} │`
  );

  const wst = b.run_summary.with_skill.time_seconds;
  const blt = b.run_summary.without_skill.time_seconds;
  console.log(
    `  │ Time (s)    │ ${pad(String(wst.mean), 16)} │ ${pad(String(blt.mean), 16)} │ ${pad(fmtDelta(d.time_seconds, "s"), 10)} │`
  );

  const wstk = b.run_summary.with_skill.tokens;
  const bltk = b.run_summary.without_skill.tokens;
  console.log(
    `  │ Tokens      │ ${pad(String(Math.round(wstk.mean)), 16)} │ ${pad(String(Math.round(bltk.mean)), 16)} │ ${pad(fmtDelta(d.tokens, ""), 10)} │`
  );

  console.log("  └─────────────┴──────────────────┴──────────────────┴────────────┘");

  if (d.pass_rate > 0) {
    console.log(`\n  📈 Skill improves pass rate by ${fmtDelta(d.pass_rate, "%")}`);
  } else if (d.pass_rate < 0) {
    console.log(`\n  📉 Skill decreases pass rate by ${fmt(Math.abs(d.pass_rate), "%")}`);
  } else {
    console.log(`\n  ➖ No change in pass rate`);
  }
}

function pad(str: string, width: number): string {
  return str.padEnd(width);
}

// ── Run ────────────────────────────────────────────────────────────────────

try {
  main();
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
}

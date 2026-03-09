#!/usr/bin/env bun

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageResult {
  path: string;
  size_bytes: number;
  skill_name: string;
  files_included: number;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
package-skill — Package a skill directory into a distributable .skill archive.

USAGE
  bun run scripts/package-skill.ts <skill-dir> [--output <path>]

ARGUMENTS
  <skill-dir>   Path to a skill directory containing SKILL.md.

OPTIONS
  --output <path>   Output file path for the archive.
                    Defaults to <skill-name>.skill in the current directory.
  --help, -h        Show this help message.

DESCRIPTION
  Validates the skill directory, then creates a .tar.gz archive containing
  all skill files. The archive excludes eval test cases, node_modules, git
  metadata, and Python cache files.

  Validation is run first — if the skill has errors, packaging is aborted
  and the validation errors are printed.

EXCLUDED PATTERNS
  evals/          Eval test cases (not needed for distribution)
  node_modules/   Package dependencies
  .git/           Git metadata
  __pycache__/    Python bytecode cache
  *.pyc           Compiled Python files

EXIT CODES
  0   Success — archive created.
  1   Error — validation failure, missing files, or packaging error.

OUTPUT
  Diagnostic messages are written to stderr.
  On success, structured JSON is written to stdout:
    { "path": "...", "size_bytes": N, "skill_name": "...", "files_included": N }

EXAMPLES
  bun run scripts/package-skill.ts ./my-skill
  bun run scripts/package-skill.ts ./my-skill --output /tmp/my-skill.skill
  bun run scripts/package-skill.ts /absolute/path/to/skill
`.trim();

// ---------------------------------------------------------------------------
// Minimal frontmatter parser (extract name only)
// ---------------------------------------------------------------------------

function extractSkillName(skillMdPath: string): string | null {
  const raw = readFileSync(skillMdPath, "utf-8");
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const fmMatch = raw.match(fmRegex);

  if (!fmMatch) return null;

  const frontmatter = fmMatch[1];
  for (const line of frontmatter.split("\n")) {
    const kvMatch = line.match(/^name:\s*(.+)$/);
    if (kvMatch) {
      return kvMatch[1].trim().replace(/^["']|["']$/g, "");
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// File counting (respects exclusion patterns)
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set(["evals", "node_modules", ".git", "__pycache__"]);

function countFiles(dir: string): number {
  let count = 0;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      count += countFiles(fullPath);
    } else {
      if (entry.endsWith(".pyc")) continue;
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  skillDir: string;
  output: string | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let skillDir: string | null = null;
  let output: string | null = null;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--output" || arg === "-o") {
      i++;
      if (i >= args.length) {
        console.error("Error: --output requires a path argument.\n");
        console.error(HELP);
        process.exit(1);
      }
      output = args[i];
    } else if (arg.startsWith("-")) {
      console.error(`Error: Unknown option '${arg}'.\n`);
      console.error(HELP);
      process.exit(1);
    } else {
      if (skillDir !== null) {
        console.error(
          `Error: Unexpected argument '${arg}'. Only one <skill-dir> is allowed.\n`,
        );
        console.error(HELP);
        process.exit(1);
      }
      skillDir = arg;
    }

    i++;
  }

  if (skillDir === null) {
    console.error("Error: Missing required argument <skill-dir>.\n");
    console.error(HELP);
    process.exit(1);
  }

  return { skillDir, output };
}

// ---------------------------------------------------------------------------
// Validation (via subprocess)
// ---------------------------------------------------------------------------

async function runValidation(skillDir: string): Promise<boolean> {
  const scriptDir = dirname(new URL(import.meta.url).pathname);
  const validateScript = join(scriptDir, "validate-skill.ts");

  if (!existsSync(validateScript)) {
    console.error(`Error: Validation script not found at ${validateScript}`);
    process.exit(1);
  }

  const proc = Bun.spawn(["bun", "run", validateScript, skillDir], {
    stdout: "pipe",
    stderr: "inherit",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error("Validation failed. Fix the following errors before packaging:\n");

    try {
      const result = JSON.parse(output);
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          console.error(`  ✗ ${err}`);
        }
      }
      if (result.warnings && result.warnings.length > 0) {
        console.error("");
        for (const warn of result.warnings) {
          console.error(`  ⚠ ${warn}`);
        }
      }
    } catch {
      // If output isn't valid JSON, print it raw
      if (output.trim()) {
        console.error(output.trim());
      }
    }

    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Archive creation
// ---------------------------------------------------------------------------

async function createArchive(
  skillDir: string,
  outputPath: string,
): Promise<boolean> {
  const parentDir = dirname(skillDir);
  const dirName = basename(skillDir);

  const proc = Bun.spawn(
    [
      "tar",
      "--exclude=evals",
      "--exclude=node_modules",
      "--exclude=.git",
      "--exclude=__pycache__",
      "--exclude=*.pyc",
      "-czf",
      outputPath,
      "-C",
      parentDir,
      dirName,
    ],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error(`Error: tar command failed (exit code ${exitCode}).`);
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { skillDir, output } = parseArgs(process.argv);

  const resolvedDir = resolve(skillDir);

  // --- Verify directory exists ---
  if (!existsSync(resolvedDir)) {
    console.error(`Error: Directory does not exist: ${resolvedDir}`);
    process.exit(1);
  }

  if (!statSync(resolvedDir).isDirectory()) {
    console.error(`Error: Path is not a directory: ${resolvedDir}`);
    process.exit(1);
  }

  const skillMdPath = join(resolvedDir, "SKILL.md");
  if (!existsSync(skillMdPath)) {
    console.error(`Error: SKILL.md not found in ${resolvedDir}`);
    process.exit(1);
  }

  // --- Run validation ---
  console.error("Validating skill...");
  const valid = await runValidation(resolvedDir);
  if (!valid) {
    process.exit(1);
  }
  console.error("Validation passed.");

  // --- Extract skill name ---
  const skillName = extractSkillName(skillMdPath);
  if (!skillName) {
    console.error(
      "Error: Could not extract skill name from SKILL.md frontmatter.",
    );
    process.exit(1);
  }

  // --- Determine output path ---
  const outputPath = resolve(output ?? `${skillName}.skill`);

  // --- Count files to be included ---
  const filesIncluded = countFiles(resolvedDir);

  // --- Create archive ---
  console.error(`Packaging ${filesIncluded} files...`);
  const success = await createArchive(resolvedDir, outputPath);
  if (!success) {
    process.exit(1);
  }

  // --- Get archive size ---
  const archiveStat = statSync(outputPath);
  const sizeBytes = archiveStat.size;

  // --- Report to stderr ---
  const sizeKb = (sizeBytes / 1024).toFixed(1);
  console.error(`Created: ${outputPath} (${sizeKb} KB)`);

  // --- Structured output to stdout ---
  const result: PackageResult = {
    path: outputPath,
    size_bytes: sizeBytes,
    skill_name: skillName,
    files_included: filesIncluded,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main();

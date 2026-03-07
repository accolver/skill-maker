#!/usr/bin/env bun

/**
 * parse-diff.ts — Parse staged git changes and suggest commit metadata.
 *
 * Analyzes `git diff --cached` to extract:
 * - Files changed (with status: added, modified, deleted)
 * - Suggested conventional commit type
 * - Suggested monorepo scope (if detected)
 * - Diff statistics
 *
 * Output: JSON to stdout. Diagnostics to stderr.
 * Exit codes: 0 = success, 1 = error, 2 = nothing staged
 */

const HELP = `
parse-diff.ts — Analyze staged git changes for conventional commit messages

USAGE:
  bun run scripts/parse-diff.ts [OPTIONS]

OPTIONS:
  --help              Show this help message
  --git-dir <path>    Path to git repository (default: current directory)
  --json              Force JSON output (default)
  --pretty            Human-readable output instead of JSON

OUTPUT (JSON):
  {
    "files": [
      { "path": "src/auth.ts", "status": "modified", "additions": 12, "deletions": 3 }
    ],
    "stats": { "files_changed": 2, "insertions": 15, "deletions": 5 },
    "suggested_type": "feat",
    "suggested_scope": "auth",
    "type_reasoning": "New exports detected in src/auth.ts",
    "is_monorepo": true,
    "diff_summary": "Modified auth handler, added new token refresh logic"
  }

EXIT CODES:
  0  Success
  1  Error (git not found, not a repo, etc.)
  2  Nothing staged

EXAMPLES:
  bun run scripts/parse-diff.ts
  bun run scripts/parse-diff.ts --git-dir /path/to/repo
  bun run scripts/parse-diff.ts --pretty
`.trim();

// --- Argument parsing ---

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(HELP);
  process.exit(0);
}

let gitDir = ".";
let pretty = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--git-dir" && args[i + 1]) {
    gitDir = args[i + 1];
    i++;
  } else if (args[i] === "--pretty") {
    pretty = true;
  } else if (args[i] === "--json") {
    // default, no-op
  }
}

// --- Types ---

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
}

interface DiffResult {
  files: FileChange[];
  stats: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
  suggested_type: string;
  suggested_scope: string | null;
  type_reasoning: string;
  is_monorepo: boolean;
  diff_summary: string;
}

// --- Helpers ---

async function runGit(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(["git", "-C", gitDir, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

function detectMonorepoScope(files: FileChange[]): { scope: string | null; isMonorepo: boolean } {
  const monorepoRoots = ["packages/", "apps/", "libs/", "services/", "modules/"];

  const scopes: string[] = [];
  let isMonorepo = false;

  for (const file of files) {
    for (const root of monorepoRoots) {
      if (file.path.startsWith(root)) {
        isMonorepo = true;
        const parts = file.path.slice(root.length).split("/");
        if (parts.length > 0 && parts[0]) {
          scopes.push(parts[0]);
        }
      }
    }
  }

  if (!isMonorepo) return { scope: null, isMonorepo: false };

  // Find the most common scope
  const counts = new Map<string, number>();
  for (const s of scopes) {
    counts.set(s, (counts.get(s) || 0) + 1);
  }

  let bestScope: string | null = null;
  let bestCount = 0;
  for (const [scope, count] of counts) {
    if (count > bestCount) {
      bestScope = scope;
      bestCount = count;
    }
  }

  // If all files are in the same scope, use it; otherwise null (too ambiguous)
  const uniqueScopes = new Set(scopes);
  if (uniqueScopes.size === 1) return { scope: bestScope, isMonorepo: true };
  if (uniqueScopes.size <= 2) return { scope: bestScope, isMonorepo: true };
  return { scope: null, isMonorepo: true };
}

function detectCommitType(
  files: FileChange[],
  diffContent: string
): { type: string; reasoning: string } {
  const paths = files.map((f) => f.path);
  const allPaths = paths.join("\n");

  // docs: only documentation files
  const docExtensions = [".md", ".mdx", ".rst", ".txt"];
  const allDocs = files.every(
    (f) =>
      docExtensions.some((ext) => f.path.endsWith(ext)) ||
      f.path.toLowerCase().includes("readme") ||
      f.path.toLowerCase().includes("changelog") ||
      f.path.toLowerCase().includes("license")
  );
  if (allDocs && files.length > 0) {
    return { type: "docs", reasoning: "All changed files are documentation" };
  }

  // test: only test files
  const testPatterns = [".test.", ".spec.", "__tests__/", "test/", "tests/"];
  const allTests = files.every((f) =>
    testPatterns.some((p) => f.path.includes(p))
  );
  if (allTests && files.length > 0) {
    return { type: "test", reasoning: "All changed files are test files" };
  }

  // ci: CI config files
  const ciPatterns = [
    ".github/workflows/",
    ".gitlab-ci",
    "Jenkinsfile",
    ".circleci/",
    ".travis.yml",
    "azure-pipelines",
    ".buildkite/",
  ];
  const allCi = files.every((f) =>
    ciPatterns.some((p) => f.path.includes(p))
  );
  if (allCi && files.length > 0) {
    return { type: "ci", reasoning: "All changed files are CI configuration" };
  }

  // build: build system files
  const buildPatterns = [
    "Dockerfile",
    "docker-compose",
    "Makefile",
    "webpack.",
    "vite.config",
    "rollup.config",
    "tsconfig",
    "esbuild",
    ".babelrc",
    "babel.config",
  ];
  const buildDeps =
    files.some(
      (f) =>
        (f.path === "package.json" || f.path.endsWith("/package.json")) &&
        diffContent.includes('"dependencies"')
    ) ||
    files.some((f) => f.path === "package-lock.json" || f.path === "bun.lockb" || f.path === "yarn.lock");
  const allBuild = files.every(
    (f) => buildPatterns.some((p) => f.path.includes(p)) || buildDeps
  );
  if ((allBuild || buildDeps) && files.length > 0 && files.length <= 3) {
    return { type: "build", reasoning: "Changes are to build system or dependency files" };
  }

  // style: formatting only (heuristic — small changes, no logic keywords)
  const styleHeuristic =
    files.every((f) => f.additions + f.deletions < 10) &&
    !diffContent.includes("function ") &&
    !diffContent.includes("class ") &&
    !diffContent.includes("if (") &&
    !diffContent.includes("return ") &&
    files.length > 0;
  if (styleHeuristic) {
    return { type: "style", reasoning: "Small changes with no logic modifications detected" };
  }

  // feat: new files with substantive content
  const newFiles = files.filter((f) => f.status === "added");
  const hasSubstantiveNew = newFiles.some((f) => f.additions > 10);
  if (hasSubstantiveNew) {
    return {
      type: "feat",
      reasoning: `New file(s) with substantive content: ${newFiles.map((f) => f.path).join(", ")}`,
    };
  }

  // fix: bug-related signals in diff
  const fixSignals = [
    "fix",
    "bug",
    "error",
    "null check",
    "undefined",
    "catch",
    "throw",
    "handle",
    "crash",
    "issue",
    "patch",
  ];
  const diffLower = diffContent.toLowerCase();
  const hasFixSignal = fixSignals.some((s) => diffLower.includes(s));
  if (hasFixSignal && !hasSubstantiveNew) {
    return { type: "fix", reasoning: "Diff contains bug-fix related patterns" };
  }

  // refactor: modifications only, no new files, no deletions-only
  const allModified = files.every((f) => f.status === "modified");
  if (allModified && files.length > 0) {
    return { type: "refactor", reasoning: "All files modified with no additions or deletions of files" };
  }

  // chore: fallback
  return { type: "chore", reasoning: "Changes do not match a more specific type" };
}

function summarizeDiff(files: FileChange[], diffContent: string): string {
  if (files.length === 0) return "No staged changes";
  if (files.length === 1) {
    const f = files[0];
    return `${f.status.charAt(0).toUpperCase() + f.status.slice(1)} ${f.path} (+${f.additions} -${f.deletions})`;
  }
  const statuses = new Map<string, number>();
  for (const f of files) {
    statuses.set(f.status, (statuses.get(f.status) || 0) + 1);
  }
  const parts: string[] = [];
  for (const [status, count] of statuses) {
    parts.push(`${count} ${status}`);
  }
  return `${files.length} files changed (${parts.join(", ")})`;
}

// --- Main ---

async function main() {
  // Verify git is available
  const gitCheck = await runGit(["rev-parse", "--is-inside-work-tree"]);
  if (gitCheck.exitCode !== 0) {
    console.error(`Error: Not a git repository or git not found at '${gitDir}'`);
    process.exit(1);
  }

  // Get staged diff stat
  const statResult = await runGit(["diff", "--cached", "--numstat"]);
  if (!statResult.stdout) {
    console.error("Nothing staged. Use 'git add' to stage changes first.");
    const emptyResult: DiffResult = {
      files: [],
      stats: { files_changed: 0, insertions: 0, deletions: 0 },
      suggested_type: "chore",
      suggested_scope: null,
      type_reasoning: "Nothing staged",
      is_monorepo: false,
      diff_summary: "No staged changes",
    };
    console.log(JSON.stringify(emptyResult, null, 2));
    process.exit(2);
  }

  // Parse numstat
  const files: FileChange[] = [];
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const line of statResult.stdout.split("\n")) {
    if (!line.trim()) continue;
    const [addStr, delStr, ...pathParts] = line.split("\t");
    const filePath = pathParts.join("\t"); // handle paths with tabs (rare)
    const additions = addStr === "-" ? 0 : parseInt(addStr, 10);
    const deletions = delStr === "-" ? 0 : parseInt(delStr, 10);
    totalInsertions += additions;
    totalDeletions += deletions;

    // Determine status
    const nameStatusResult = await runGit(["diff", "--cached", "--name-status", "--", filePath]);
    let status: FileChange["status"] = "modified";
    if (nameStatusResult.stdout.startsWith("A")) status = "added";
    else if (nameStatusResult.stdout.startsWith("D")) status = "deleted";
    else if (nameStatusResult.stdout.startsWith("R")) status = "renamed";

    files.push({ path: filePath, status, additions, deletions });
  }

  // Get full diff content for type detection
  const diffResult = await runGit(["diff", "--cached"]);
  const diffContent = diffResult.stdout;

  // Detect scope and type
  const { scope, isMonorepo } = detectMonorepoScope(files);
  const { type, reasoning } = detectCommitType(files, diffContent);
  const summary = summarizeDiff(files, diffContent);

  const result: DiffResult = {
    files,
    stats: {
      files_changed: files.length,
      insertions: totalInsertions,
      deletions: totalDeletions,
    },
    suggested_type: type,
    suggested_scope: scope,
    type_reasoning: reasoning,
    is_monorepo: isMonorepo,
    diff_summary: summary,
  };

  if (pretty) {
    console.log(`Files changed: ${result.stats.files_changed}`);
    console.log(`Insertions: +${result.stats.insertions}`);
    console.log(`Deletions: -${result.stats.deletions}`);
    console.log(`Suggested type: ${result.suggested_type}`);
    console.log(`Reasoning: ${result.type_reasoning}`);
    if (result.suggested_scope) {
      console.log(`Suggested scope: ${result.suggested_scope}`);
    }
    console.log(`Monorepo: ${result.is_monorepo}`);
    console.log(`\nFiles:`);
    for (const f of result.files) {
      console.log(`  ${f.status.padEnd(10)} ${f.path} (+${f.additions} -${f.deletions})`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});

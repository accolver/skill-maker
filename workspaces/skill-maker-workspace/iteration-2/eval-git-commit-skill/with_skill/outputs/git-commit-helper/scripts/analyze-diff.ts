#!/usr/bin/env bun

/**
 * analyze-diff.ts — Parse staged git changes and suggest a conventional commit message.
 *
 * Outputs JSON to stdout with change analysis, suggested type, scope, and subject.
 * Diagnostics go to stderr.
 *
 * Usage:
 *   bun run analyze-diff.ts              # Analyze current staged changes
 *   bun run analyze-diff.ts --diff-file <path>  # Analyze a diff file/patch
 *   bun run analyze-diff.ts --help       # Show this help
 *
 * Exit codes:
 *   0 — Success
 *   1 — No staged changes or empty diff
 *   2 — Git not available or not in a git repo
 */

import { $ } from "bun";

// ── Types ──────────────────────────────────────────────────────────────────

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  insertions: number;
  deletions: number;
}

interface DiffAnalysis {
  type: string;
  scope: string | null;
  subject: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  files: FileChange[];
  is_monorepo: boolean;
  detected_scopes: string[];
  breaking: boolean;
}

// ── Help ───────────────────────────────────────────────────────────────────

const HELP = `
analyze-diff.ts — Parse staged git changes and suggest a conventional commit message.

USAGE:
  bun run analyze-diff.ts                      Analyze current staged changes
  bun run analyze-diff.ts --diff-file <path>   Analyze a diff file or patch
  bun run analyze-diff.ts --help               Show this help message

OUTPUT (JSON to stdout):
  {
    "type":            "feat|fix|refactor|docs|test|chore|style|perf|ci|build",
    "scope":           "package-name or null",
    "subject":         "imperative lowercase subject line",
    "files_changed":   3,
    "insertions":      45,
    "deletions":       2,
    "files":           [{ "path": "...", "status": "added|modified|deleted|renamed", "insertions": N, "deletions": N }],
    "is_monorepo":     true,
    "detected_scopes": ["api", "web"],
    "breaking":        false
  }

EXIT CODES:
  0  Success
  1  No staged changes or empty diff
  2  Git not available or not in a git repo

EXAMPLES:
  bun run analyze-diff.ts
  bun run analyze-diff.ts --diff-file changes.patch
`.trim();

// ── Argument parsing ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}

let diffSource: "staged" | "file" = "staged";
let diffFilePath: string | null = null;

const diffFileIdx = args.indexOf("--diff-file");
if (diffFileIdx !== -1) {
  diffFilePath = args[diffFileIdx + 1];
  if (!diffFilePath) {
    console.error("Error: --diff-file requires a path argument");
    process.exit(1);
  }
  diffSource = "file";
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getDiffContent(): Promise<string> {
  if (diffSource === "file") {
    try {
      const file = Bun.file(diffFilePath!);
      return await file.text();
    } catch {
      console.error(`Error: Cannot read diff file: ${diffFilePath}`);
      process.exit(1);
    }
  }

  // Check git is available
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
  } catch {
    console.error("Error: Not inside a git repository or git is not available");
    process.exit(2);
  }

  const diff = await $`git diff --cached`.text();
  if (!diff.trim()) {
    console.error("Error: No staged changes found. Stage changes with 'git add' first.");
    process.exit(1);
  }
  return diff;
}

async function getStagedFileStats(): Promise<FileChange[]> {
  if (diffSource === "file") {
    return parseFilesFromDiff(await Bun.file(diffFilePath!).text());
  }

  const numstat = await $`git diff --cached --numstat`.text();
  const nameStatus = await $`git diff --cached --name-status`.text();

  const statusMap = new Map<string, string>();
  for (const line of nameStatus.trim().split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const status = parts[0];
    const filePath = parts.length > 2 ? parts[2] : parts[1]; // renamed files have old\tnew
    if (filePath) {
      statusMap.set(filePath, status);
    }
    // Also map old name for renames
    if (parts.length > 2 && parts[1]) {
      statusMap.set(parts[1], status);
    }
  }

  const files: FileChange[] = [];
  for (const line of numstat.trim().split("\n")) {
    if (!line.trim()) continue;
    const [ins, del, path] = line.split("\t");
    const rawStatus = statusMap.get(path) || "M";
    files.push({
      path,
      status: parseStatus(rawStatus),
      insertions: ins === "-" ? 0 : parseInt(ins, 10),
      deletions: del === "-" ? 0 : parseInt(del, 10),
    });
  }
  return files;
}

function parseStatus(s: string): FileChange["status"] {
  if (s.startsWith("A")) return "added";
  if (s.startsWith("D")) return "deleted";
  if (s.startsWith("R")) return "renamed";
  return "modified";
}

function parseFilesFromDiff(diff: string): FileChange[] {
  const files: FileChange[] = [];
  const fileBlocks = diff.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const pathMatch = block.match(/^a\/(.+?) b\/(.+)/m);
    if (!pathMatch) continue;

    const filePath = pathMatch[2];
    let status: FileChange["status"] = "modified";
    if (block.includes("new file mode")) status = "added";
    else if (block.includes("deleted file mode")) status = "deleted";
    else if (block.includes("rename from")) status = "renamed";

    let insertions = 0;
    let deletions = 0;
    for (const line of block.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) insertions++;
      if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }

    files.push({ path: filePath, status, insertions, deletions });
  }
  return files;
}

// ── Type detection ─────────────────────────────────────────────────────────

const TYPE_PATTERNS: Array<{ type: string; test: (files: FileChange[], diff: string) => boolean }> = [
  {
    type: "docs",
    test: (files) =>
      files.every(
        (f) =>
          /\.(md|mdx|txt|rst|adoc)$/i.test(f.path) ||
          /readme|changelog|license|contributing|docs\//i.test(f.path) ||
          /jsdoc|typedoc/i.test(f.path)
      ),
  },
  {
    type: "test",
    test: (files) =>
      files.every(
        (f) =>
          /\.(test|spec|e2e)\.[jt]sx?$/.test(f.path) ||
          /__(tests|mocks|snapshots)__/.test(f.path) ||
          /test\/|tests\/|\.test\./.test(f.path)
      ),
  },
  {
    type: "ci",
    test: (files) =>
      files.every(
        (f) =>
          /\.github\/workflows\//.test(f.path) ||
          /\.gitlab-ci/.test(f.path) ||
          /Jenkinsfile|\.circleci|\.travis/.test(f.path) ||
          /buildkite|\.azure-pipelines/.test(f.path)
      ),
  },
  {
    type: "style",
    test: (files, diff) => {
      const meaningfulChanges = diff
        .split("\n")
        .filter((l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---"));
      return meaningfulChanges.every((l) => {
        const content = l.slice(1).trim();
        return content === "" || content === ";" || content === "," || /^\/[/*]/.test(content);
      });
    },
  },
  {
    type: "build",
    test: (files) =>
      files.every(
        (f) =>
          /webpack|rollup|vite|esbuild|tsconfig|babel|\.config\.[jt]s$/.test(f.path) ||
          /Makefile|CMakeLists|Dockerfile|docker-compose/.test(f.path)
      ),
  },
  {
    type: "chore",
    test: (files) =>
      files.every(
        (f) =>
          /package\.json$/.test(f.path) ||
          /\.lock$|lock\.json$/.test(f.path) ||
          /\.eslintrc|\.prettierrc|\.editorconfig|\.gitignore/.test(f.path) ||
          /\.nvmrc|\.node-version|\.tool-versions/.test(f.path)
      ),
  },
];

function detectType(files: FileChange[], diff: string): string {
  // Check for breaking changes
  const hasBreaking =
    /BREAKING[ -]CHANGE/i.test(diff) || /^[-+].*!:/.test(diff);

  // Check pattern-based types first
  for (const { type, test } of TYPE_PATTERNS) {
    if (test(files, diff)) return type;
  }

  // Heuristic: if mostly deletions with few additions, likely refactor
  const totalIns = files.reduce((s, f) => s + f.insertions, 0);
  const totalDel = files.reduce((s, f) => s + f.deletions, 0);

  // Check diff content for fix indicators
  const diffLower = diff.toLowerCase();
  if (
    /fix(es|ed)?[\s:]/i.test(diffLower) ||
    /bug|issue|error|crash|broken|regression/i.test(diffLower)
  ) {
    return "fix";
  }

  // If new files dominate, likely a feature
  const newFiles = files.filter((f) => f.status === "added");
  if (newFiles.length > files.length / 2 && totalIns > totalDel * 3) {
    return "feat";
  }

  // If mostly restructuring (similar ins/del ratio), refactor
  if (totalDel > 0 && totalIns / totalDel > 0.5 && totalIns / totalDel < 2 && files.length > 1) {
    return "refactor";
  }

  // Default to feat for net-new code, chore for everything else
  return totalIns > totalDel * 2 ? "feat" : "chore";
}

// ── Scope detection ────────────────────────────────────────────────────────

async function detectMonorepo(): Promise<boolean> {
  if (diffSource === "file") return false;

  try {
    // Check for common monorepo indicators
    const checks = await Promise.allSettled([
      Bun.file("pnpm-workspace.yaml").exists(),
      Bun.file("lerna.json").exists(),
      (async () => {
        try {
          const pkg = await Bun.file("package.json").json();
          return Array.isArray(pkg.workspaces) || typeof pkg.workspaces === "object";
        } catch {
          return false;
        }
      })(),
    ]);

    return checks.some((r) => r.status === "fulfilled" && r.value === true);
  } catch {
    return false;
  }
}

function detectScopes(files: FileChange[]): string[] {
  const scopes = new Set<string>();

  for (const file of files) {
    // Match packages/<name>/, apps/<name>/, libs/<name>/, modules/<name>/
    const monoMatch = file.path.match(/^(packages|apps|libs|modules|services)\/([^/]+)\//);
    if (monoMatch) {
      scopes.add(monoMatch[2]);
    }
  }

  return Array.from(scopes).sort();
}

function pickScope(scopes: string[]): string | null {
  if (scopes.length === 1) return scopes[0];
  if (scopes.length === 0) return null;
  // Multiple scopes — don't force a single one
  return null;
}

// ── Subject generation ─────────────────────────────────────────────────────

function generateSubject(files: FileChange[], type: string, diff: string): string {
  // Try to extract meaningful subject from the changes
  const addedFiles = files.filter((f) => f.status === "added");
  const deletedFiles = files.filter((f) => f.status === "deleted");
  const modifiedFiles = files.filter((f) => f.status === "modified");

  if (type === "docs") {
    if (addedFiles.length > 0) return `add ${simplifyPath(addedFiles[0].path)} documentation`;
    return `update ${simplifyPath(files[0].path)}`;
  }

  if (type === "test") {
    if (addedFiles.length > 0) return `add tests for ${extractModule(addedFiles[0].path)}`;
    return `update tests for ${extractModule(files[0].path)}`;
  }

  if (type === "ci") {
    return `update ${simplifyPath(files[0].path)}`;
  }

  if (deletedFiles.length === files.length) {
    return `remove ${simplifyPath(deletedFiles[0].path)}${deletedFiles.length > 1 ? ` and ${deletedFiles.length - 1} more` : ""}`;
  }

  if (addedFiles.length > 0 && addedFiles.length >= files.length / 2) {
    const module = extractModule(addedFiles[0].path);
    return `add ${module}`;
  }

  // Generic fallback
  const module = extractModule(files[0].path);
  return `update ${module}`;
}

function simplifyPath(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1];
}

function extractModule(p: string): string {
  const parts = p.split("/");
  // Remove file extension and common prefixes
  const filename = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  // If in a recognizable directory, use parent
  if (parts.length > 1) {
    const parent = parts[parts.length - 2];
    if (["src", "lib", "utils", "helpers", "components", "routes", "services"].includes(parent)) {
      return filename;
    }
  }
  return filename;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.error("Analyzing staged changes...");

  const diff = await getDiffContent();
  const files = await getStagedFileStats();

  if (files.length === 0) {
    console.error("Error: No file changes detected in diff");
    process.exit(1);
  }

  const isMonorepo = await detectMonorepo();
  const scopes = detectScopes(files);
  const type = detectType(files, diff);
  const scope = pickScope(scopes);
  const subject = generateSubject(files, type, diff);

  const totalInsertions = files.reduce((s, f) => s + f.insertions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);
  const breaking = /BREAKING[ -]CHANGE/i.test(diff);

  const result: DiffAnalysis = {
    type,
    scope,
    subject,
    files_changed: files.length,
    insertions: totalInsertions,
    deletions: totalDeletions,
    files,
    is_monorepo: isMonorepo,
    detected_scopes: scopes,
    breaking,
  };

  // JSON to stdout
  console.log(JSON.stringify(result, null, 2));
  console.error(`Done. Suggested: ${type}${scope ? `(${scope})` : ""}: ${subject}`);
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(2);
});

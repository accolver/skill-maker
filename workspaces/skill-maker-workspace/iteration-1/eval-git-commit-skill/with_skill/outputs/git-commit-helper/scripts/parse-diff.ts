#!/usr/bin/env bun

/**
 * parse-diff.ts — Parse staged git changes into structured JSON
 *
 * Analyzes `git diff --cached` output and produces a JSON summary of:
 * - Files changed (added, modified, deleted, renamed)
 * - Directories and packages affected
 * - Line counts (insertions, deletions)
 * - Suggested commit type and scope
 *
 * Usage:
 *   bun run parse-diff.ts [options]
 *
 * Options:
 *   --help          Show this help message
 *   --diff <file>   Read diff from file instead of git (for testing)
 *   --json          Output JSON (default)
 *
 * Exit codes:
 *   0  Success
 *   1  Error (no git repo, git not found, etc.)
 *   2  No staged changes found
 */

import { $ } from "bun";

// --- Types ---

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  insertions: number;
  deletions: number;
  oldPath?: string;
}

interface DiffSummary {
  files: FileChange[];
  totalInsertions: number;
  totalDeletions: number;
  directories: string[];
  packages: string[];
  suggestedType: string;
  suggestedScope: string | null;
  typeReasoning: string;
}

// --- Help ---

function showHelp(): void {
  console.log(`parse-diff.ts — Parse staged git changes into structured JSON

Usage:
  bun run parse-diff.ts [options]

Options:
  --help          Show this help message
  --diff <file>   Read diff from file instead of git (for testing)
  --json          Output JSON (default)

Exit codes:
  0  Success
  1  Error (no git repo, git not found, etc.)
  2  No staged changes found

Output (JSON):
  {
    "files": [{ "path": "...", "status": "modified", "insertions": 5, "deletions": 2 }],
    "totalInsertions": 10,
    "totalDeletions": 3,
    "directories": ["src/auth"],
    "packages": ["api"],
    "suggestedType": "feat",
    "suggestedScope": "api",
    "typeReasoning": "New files added with production code"
  }`);
}

// --- Parsing ---

function parseNameStatus(output: string): Pick<FileChange, "path" | "status" | "oldPath">[] {
  const lines = output.trim().split("\n").filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("\t");
    const statusCode = parts[0].charAt(0);
    const statusMap: Record<string, FileChange["status"]> = {
      A: "added",
      M: "modified",
      D: "deleted",
      R: "renamed",
    };
    const status = statusMap[statusCode] || "modified";

    if (status === "renamed") {
      return { path: parts[2] || parts[1], status, oldPath: parts[1] };
    }
    return { path: parts[1], status };
  });
}

function parseNumstat(output: string): Map<string, { insertions: number; deletions: number }> {
  const map = new Map<string, { insertions: number; deletions: number }>();
  const lines = output.trim().split("\n").filter(Boolean);
  for (const line of lines) {
    const parts = line.split("\t");
    const insertions = parts[0] === "-" ? 0 : parseInt(parts[0], 10);
    const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10);
    // For renames, numstat shows the new path (or {old => new} format)
    const filePath = parts[2] || "";
    // Handle rename format: some/path/{old.ts => new.ts}
    const cleanPath = filePath.replace(/\{.*? => (.*?)\}/, "$1");
    map.set(cleanPath, { insertions, deletions });
  }
  return map;
}

function extractDirectories(files: FileChange[]): string[] {
  const dirs = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    if (parts.length > 1) {
      // Add the first meaningful directory
      dirs.add(parts.slice(0, -1).join("/"));
    }
  }
  return [...dirs].sort();
}

function extractPackages(files: FileChange[]): string[] {
  const packages = new Set<string>();
  for (const file of files) {
    // Match packages/<name>/ or apps/<name>/ patterns
    const match = file.path.match(/^(?:packages|apps|libs|modules)\/([^/]+)\//);
    if (match) {
      packages.add(match[1]);
    }
  }
  return [...packages].sort();
}

function suggestType(files: FileChange[]): { type: string; reasoning: string } {
  const allPaths = files.map((f) => f.path);
  const hasAdded = files.some((f) => f.status === "added");
  const hasDeleted = files.some((f) => f.status === "deleted");
  const allDeleted = files.every((f) => f.status === "deleted");

  // Check for documentation-only changes
  const docPatterns = /\.(md|mdx|txt|rst|adoc)$|^docs?\//i;
  const allDocs = allPaths.every((p) => docPatterns.test(p));
  if (allDocs) {
    return { type: "docs", reasoning: "All changed files are documentation" };
  }

  // Check for test-only changes
  const testPatterns = /\.(test|spec)\.[jt]sx?$|__tests__\/|\.test\./;
  const allTests = allPaths.every((p) => testPatterns.test(p));
  if (allTests) {
    return { type: "test", reasoning: "All changed files are test files" };
  }

  // Check for CI-only changes
  const ciPatterns = /^\.github\/|^\.gitlab-ci|^Jenkinsfile|^\.circleci\//;
  const allCI = allPaths.every((p) => ciPatterns.test(p));
  if (allCI) {
    return { type: "ci", reasoning: "All changed files are CI/CD configuration" };
  }

  // Check for config/chore changes
  const configPatterns =
    /^(package\.json|tsconfig.*\.json|\.eslintrc|eslint\.config|\.prettierrc|\.editorconfig|\.gitignore|\.nvmrc|\.node-version|yarn\.lock|pnpm-lock|package-lock)/;
  const allConfig = allPaths.every((p) => configPatterns.test(p));
  if (allConfig) {
    return { type: "chore", reasoning: "All changed files are configuration or dependency files" };
  }

  // Check for style-only changes (formatting)
  const totalChanges = files.reduce((sum, f) => sum + f.insertions + f.deletions, 0);
  const netChange = files.reduce((sum, f) => sum + f.insertions - f.deletions, 0);
  if (totalChanges > 0 && Math.abs(netChange) === 0 && !hasAdded && !hasDeleted) {
    return {
      type: "style",
      reasoning: "Equal insertions and deletions with no new/deleted files suggests formatting changes",
    };
  }

  // If all files deleted, likely a refactor or chore
  if (allDeleted) {
    return { type: "refactor", reasoning: "All files were deleted, suggesting code removal/cleanup" };
  }

  // If new files added with source code, likely a feature
  const srcPatterns = /\.(ts|tsx|js|jsx|py|rb|go|rs|java|kt|swift|dart|vue|svelte)$/;
  const hasNewSrcFiles = files.some((f) => f.status === "added" && srcPatterns.test(f.path));
  if (hasNewSrcFiles) {
    return { type: "feat", reasoning: "New source code files added, suggesting a new feature" };
  }

  // Default: if mostly modifications, could be fix or refactor
  // Lean toward fix as it's more common
  if (files.every((f) => f.status === "modified")) {
    return {
      type: "fix",
      reasoning: "Only modifications to existing files — could be fix or refactor, defaulting to fix",
    };
  }

  return { type: "chore", reasoning: "Mixed changes without a clear primary pattern" };
}

function suggestScope(files: FileChange[]): string | null {
  // Try monorepo packages first
  const packages = extractPackages(files);
  if (packages.length === 1) {
    return packages[0];
  }

  // Try common top-level directory
  const topDirs = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    if (parts.length > 1) {
      // Skip generic top-level dirs like 'src'
      if (parts[0] === "src" && parts.length > 2) {
        topDirs.add(parts[1]);
      } else if (parts[0] !== "src") {
        topDirs.add(parts[0]);
      }
    }
  }

  if (topDirs.size === 1) {
    return [...topDirs][0];
  }

  return null;
}

// --- Main ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    showHelp();
    process.exit(0);
  }

  let nameStatusOutput: string;
  let numstatOutput: string;

  const diffFileIndex = args.indexOf("--diff");
  if (diffFileIndex !== -1 && args[diffFileIndex + 1]) {
    // Read from file for testing
    const diffFile = args[diffFileIndex + 1];
    const content = await Bun.file(diffFile).text();
    // When reading from file, we expect the file to contain the raw diff
    // For testing, we'll parse it differently
    console.error("Note: --diff mode uses raw diff input, type/scope suggestions may be limited");
    nameStatusOutput = content;
    numstatOutput = "";
  } else {
    // Run git commands
    try {
      nameStatusOutput = (await $`git diff --cached --name-status`.text()).trim();
      numstatOutput = (await $`git diff --cached --numstat`.text()).trim();
    } catch (error) {
      console.error("Error: Failed to run git commands. Are you in a git repository?");
      process.exit(1);
    }
  }

  if (!nameStatusOutput) {
    console.error("No staged changes found. Stage changes with `git add` first.");
    process.exit(2);
  }

  // Parse outputs
  const fileEntries = parseNameStatus(nameStatusOutput);
  const numstatMap = parseNumstat(numstatOutput);

  // Merge into FileChange objects
  const files: FileChange[] = fileEntries.map((entry) => {
    const stats = numstatMap.get(entry.path) || { insertions: 0, deletions: 0 };
    return {
      ...entry,
      insertions: stats.insertions,
      deletions: stats.deletions,
    };
  });

  // Build summary
  const { type, reasoning } = suggestType(files);
  const scope = suggestScope(files);

  const summary: DiffSummary = {
    files,
    totalInsertions: files.reduce((sum, f) => sum + f.insertions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
    directories: extractDirectories(files),
    packages: extractPackages(files),
    suggestedType: type,
    suggestedScope: scope,
    typeReasoning: reasoning,
  };

  // Output JSON to stdout
  console.log(JSON.stringify(summary, null, 2));
}

main();

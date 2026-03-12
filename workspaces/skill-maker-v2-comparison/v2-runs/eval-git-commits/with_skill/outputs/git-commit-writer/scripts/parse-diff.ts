#!/usr/bin/env bun
/**
 * parse-diff.ts — Parse git diff --cached output into structured JSON metadata.
 *
 * Usage:
 *   bun run scripts/parse-diff.ts [--help] [--diff-input <file>]
 *
 * Options:
 *   --help              Show this help message
 *   --diff-input <file> Read diff from a file instead of running git diff --cached
 *
 * Output (JSON to stdout):
 *   {
 *     "files": [...],
 *     "summary": { "total_files", "total_additions", "total_deletions" },
 *     "scope_candidates": [...],
 *     "monorepo_detected": boolean,
 *     "monorepo_type": string | null,
 *     "type_signals": { ... }
 *   }
 *
 * Exit codes:
 *   0 - Success
 *   1 - No staged changes
 *   2 - Git not available or not in a repo
 *   3 - Invalid arguments
 */

import { $ } from "bun";

// --- Types ---

interface FileChange {
  path: string;
  old_path?: string;
  status: "modified" | "added" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  is_new: boolean;
  is_deleted: boolean;
  is_renamed: boolean;
}

interface DiffSummary {
  total_files: number;
  total_additions: number;
  total_deletions: number;
}

interface TypeSignals {
  has_test_files: boolean;
  has_doc_files: boolean;
  has_ci_files: boolean;
  has_build_files: boolean;
  has_new_exports: boolean;
  has_deleted_exports: boolean;
  primary_language: string | null;
}

interface ParsedDiff {
  files: FileChange[];
  summary: DiffSummary;
  scope_candidates: string[];
  monorepo_detected: boolean;
  monorepo_type: string | null;
  type_signals: TypeSignals;
}

// --- Helpers ---

const HELP_TEXT = `parse-diff.ts — Parse git diff --cached into structured JSON

Usage:
  bun run scripts/parse-diff.ts [--help] [--diff-input <file>]

Options:
  --help              Show this help message
  --diff-input <file> Read diff from a file instead of running git diff --cached

Examples:
  bun run scripts/parse-diff.ts
  bun run scripts/parse-diff.ts --diff-input my-diff.patch
  bun run scripts/parse-diff.ts | jq '.scope_candidates'
`;

const MONOREPO_DIRS = ["packages", "apps", "services", "libs", "modules", "plugins"];

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /tests?\//,
  /\.test\.py$/,
  /_test\.go$/,
  /Test\.java$/,
  /\.test\.rs$/,
];

const DOC_PATTERNS = [
  /\.md$/i,
  /\.mdx$/i,
  /\.rst$/i,
  /\.txt$/i,
  /^docs?\//i,
  /^documentation\//i,
  /CHANGELOG/i,
  /README/i,
  /LICENSE/i,
  /CONTRIBUTING/i,
];

const CI_PATTERNS = [
  /\.github\/workflows\//,
  /\.gitlab-ci/,
  /Jenkinsfile/,
  /\.circleci\//,
  /\.travis\.yml/,
  /azure-pipelines/,
  /bitbucket-pipelines/,
  /\.buildkite\//,
];

const BUILD_PATTERNS = [
  /^package\.json$/,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^bun\.lockb$/,
  /^Dockerfile/,
  /^docker-compose/,
  /^Makefile$/,
  /^CMakeLists\.txt$/,
  /^Cargo\.toml$/,
  /^Cargo\.lock$/,
  /^go\.mod$/,
  /^go\.sum$/,
  /^build\.gradle/,
  /^pom\.xml$/,
  /^requirements\.txt$/,
  /^pyproject\.toml$/,
  /^setup\.py$/,
  /^Gemfile/,
  /^tsconfig/,
  /^webpack/,
  /^vite\.config/,
  /^rollup\.config/,
  /^esbuild/,
  /^turbo\.json$/,
  /^nx\.json$/,
  /^lerna\.json$/,
];

const LANG_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".rb": "ruby",
  ".swift": "swift",
  ".kt": "kotlin",
  ".cs": "csharp",
  ".cpp": "cpp",
  ".c": "c",
  ".dart": "dart",
  ".vue": "vue",
  ".svelte": "svelte",
};

function matchesAny(path: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(path));
}

function getExtension(path: string): string {
  const match = path.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

function detectMonorepo(files: FileChange[]): { detected: boolean; type: string | null } {
  for (const file of files) {
    const parts = file.path.split("/");
    if (parts.length >= 2 && MONOREPO_DIRS.includes(parts[0])) {
      return { detected: true, type: parts[0] };
    }
  }
  return { detected: false, type: null };
}

function detectScopeCandidates(files: FileChange[], monorepoDetected: boolean): string[] {
  if (files.length === 0) return [];

  // For monorepos, extract package names
  if (monorepoDetected) {
    const packageNames = new Set<string>();
    for (const file of files) {
      const parts = file.path.split("/");
      if (parts.length >= 2 && MONOREPO_DIRS.includes(parts[0])) {
        packageNames.add(parts[1]);
      }
    }
    return Array.from(packageNames);
  }

  // For non-monorepos, use top-level directory or common prefix
  const topDirs = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    if (parts.length >= 2) {
      // Skip src/ as it's too generic — go one level deeper
      if (parts[0] === "src" && parts.length >= 3) {
        topDirs.add(parts[1]);
      } else if (parts[0] !== "src") {
        topDirs.add(parts[0]);
      }
    }
  }

  return Array.from(topDirs);
}

function detectLanguage(files: FileChange[]): string | null {
  const langCounts: Record<string, number> = {};
  for (const file of files) {
    const ext = getExtension(file.path);
    const lang = LANG_EXTENSIONS[ext];
    if (lang) {
      langCounts[lang] = (langCounts[lang] || 0) + file.additions + file.deletions;
    }
  }

  let maxLang: string | null = null;
  let maxCount = 0;
  for (const [lang, count] of Object.entries(langCounts)) {
    if (count > maxCount) {
      maxLang = lang;
      maxCount = count;
    }
  }
  return maxLang;
}

// --- Diff Parsing ---

function parseDiffNumstat(numstatOutput: string): FileChange[] {
  const files: FileChange[] = [];
  const lines = numstatOutput.trim().split("\n").filter(Boolean);

  for (const line of lines) {
    // Format: additions\tdeletions\tpath
    // Or for renames: additions\tdeletions\told_path => new_path
    // Binary files show as: -\t-\tpath
    const parts = line.split("\t");
    if (parts.length < 3) continue;

    const additions = parts[0] === "-" ? 0 : parseInt(parts[0], 10);
    const deletions = parts[1] === "-" ? 0 : parseInt(parts[1], 10);
    const pathPart = parts.slice(2).join("\t");

    // Check for rename
    const renameMatch = pathPart.match(/^(.+?)\s*=>\s*(.+?)$/);
    // Also handle the {old => new} format within a path
    const braceRenameMatch = pathPart.match(/^(.*?)\{(.+?)\s*=>\s*(.+?)\}(.*)$/);

    let filePath: string;
    let oldPath: string | undefined;
    let isRenamed = false;

    if (braceRenameMatch) {
      const prefix = braceRenameMatch[1];
      const oldPart = braceRenameMatch[2];
      const newPart = braceRenameMatch[3];
      const suffix = braceRenameMatch[4];
      filePath = `${prefix}${newPart}${suffix}`.replace(/\/\//g, "/");
      oldPath = `${prefix}${oldPart}${suffix}`.replace(/\/\//g, "/");
      isRenamed = true;
    } else if (renameMatch) {
      oldPath = renameMatch[1].trim();
      filePath = renameMatch[2].trim();
      isRenamed = true;
    } else {
      filePath = pathPart;
    }

    let status: FileChange["status"] = "modified";
    if (isRenamed) {
      status = "renamed";
    } else if (additions > 0 && deletions === 0) {
      // Could be new file — we'll refine with --diff-filter later
      status = "modified";
    }

    files.push({
      path: filePath,
      ...(oldPath ? { old_path: oldPath } : {}),
      status,
      additions,
      deletions,
      is_new: false,
      is_deleted: false,
      is_renamed: isRenamed,
    });
  }

  return files;
}

function refineFileStatuses(files: FileChange[], diffFilterOutput: string): void {
  // Parse --diff-filter output to detect new/deleted files
  const newFiles = new Set<string>();
  const deletedFiles = new Set<string>();

  const lines = diffFilterOutput.trim().split("\n").filter(Boolean);
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 2) continue;
    const filterStatus = parts[0].trim();
    const path = parts[1].trim();

    if (filterStatus === "A") newFiles.add(path);
    if (filterStatus === "D") deletedFiles.add(path);
  }

  for (const file of files) {
    if (newFiles.has(file.path)) {
      file.status = "added";
      file.is_new = true;
    }
    if (deletedFiles.has(file.path)) {
      file.status = "deleted";
      file.is_deleted = true;
    }
  }
}

function detectExportChanges(diffContent: string): { hasNew: boolean; hasDeleted: boolean } {
  let hasNew = false;
  let hasDeleted = false;

  const lines = diffContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (/export\s+(function|class|const|let|var|default|type|interface|enum)/.test(line)) {
        hasNew = true;
      }
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      if (/export\s+(function|class|const|let|var|default|type|interface|enum)/.test(line)) {
        hasDeleted = true;
      }
    }
  }

  return { hasNew, hasDeleted };
}

// --- Main ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  let diffContent: string;
  let numstatOutput: string;
  let diffFilterOutput: string;

  const diffInputIdx = args.indexOf("--diff-input");
  if (diffInputIdx !== -1) {
    const filePath = args[diffInputIdx + 1];
    if (!filePath) {
      console.error("Error: --diff-input requires a file path argument");
      process.exit(3);
    }
    try {
      diffContent = await Bun.file(filePath).text();
      // When reading from file, we can't get numstat/filter separately
      // Parse what we can from the unified diff
      numstatOutput = "";
      diffFilterOutput = "";
    } catch (e) {
      console.error(`Error: Could not read file: ${filePath}`);
      process.exit(3);
    }
  } else {
    // Run git commands
    try {
      const diffResult = await $`git diff --cached`.text();
      diffContent = diffResult;

      if (!diffContent.trim()) {
        console.error("No staged changes found. Stage changes with `git add` first.");
        process.exit(1);
      }

      numstatOutput = await $`git diff --cached --numstat`.text();
      diffFilterOutput = await $`git diff --cached --name-status`.text();
    } catch (e) {
      console.error("Error: Could not run git commands. Are you in a git repository?");
      process.exit(2);
    }
  }

  // Parse files from numstat
  let files: FileChange[];
  if (numstatOutput) {
    files = parseDiffNumstat(numstatOutput);
    refineFileStatuses(files, diffFilterOutput);
  } else {
    // Fallback: parse file paths from unified diff headers
    files = [];
    const diffLines = diffContent.split("\n");
    for (const line of diffLines) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match) {
        const oldPath = match[1];
        const newPath = match[2];
        const isRenamed = oldPath !== newPath;
        files.push({
          path: newPath,
          ...(isRenamed ? { old_path: oldPath } : {}),
          status: isRenamed ? "renamed" : "modified",
          additions: 0,
          deletions: 0,
          is_new: false,
          is_deleted: false,
          is_renamed: isRenamed,
        });
      }
    }
  }

  // Compute summary
  const summary: DiffSummary = {
    total_files: files.length,
    total_additions: files.reduce((sum, f) => sum + f.additions, 0),
    total_deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };

  // Detect monorepo
  const { detected: monorepoDetected, type: monorepoType } = detectMonorepo(files);

  // Detect scope candidates
  const scopeCandidates = detectScopeCandidates(files, monorepoDetected);

  // Detect type signals
  const exportChanges = detectExportChanges(diffContent);
  const typeSignals: TypeSignals = {
    has_test_files: files.some((f) => matchesAny(f.path, TEST_PATTERNS)),
    has_doc_files: files.some((f) => matchesAny(f.path, DOC_PATTERNS)),
    has_ci_files: files.some((f) => matchesAny(f.path, CI_PATTERNS)),
    has_build_files: files.some((f) => matchesAny(f.path, BUILD_PATTERNS)),
    has_new_exports: exportChanges.hasNew,
    has_deleted_exports: exportChanges.hasDeleted,
    primary_language: detectLanguage(files),
  };

  const result: ParsedDiff = {
    files,
    summary,
    scope_candidates: scopeCandidates,
    monorepo_detected: monorepoDetected,
    monorepo_type: monorepoType,
    type_signals: typeSignals,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(2);
});

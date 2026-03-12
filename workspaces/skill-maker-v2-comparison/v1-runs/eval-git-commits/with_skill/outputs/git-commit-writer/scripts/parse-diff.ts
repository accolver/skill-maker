#!/usr/bin/env bun

/**
 * parse-diff.ts — Parse git diff output into structured JSON for commit message generation.
 *
 * Usage:
 *   git diff --cached | bun run scripts/parse-diff.ts
 *   bun run scripts/parse-diff.ts --file <path-to-diff-file>
 *   bun run scripts/parse-diff.ts --help
 *
 * Output (JSON to stdout):
 *   {
 *     "files": [...],
 *     "stats": { "total_files", "additions", "deletions" },
 *     "monorepo": { "detected", "type", "packages" },
 *     "suggested_type": "feat" | "fix" | ...,
 *     "suggested_scope": "package-name" | null,
 *     "has_breaking_changes": false,
 *     "breaking_signals": []
 *   }
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error (invalid input, file not found)
 *   2 — No diff content (empty stdin and no --file)
 */

import { readFileSync } from "fs";

// --- Types ---

interface DiffFile {
  path: string;
  old_path: string | null;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  is_test: boolean;
  is_doc: boolean;
  is_config: boolean;
  is_ci: boolean;
  is_style_only: boolean;
  category: string;
}

interface MonorepoInfo {
  detected: boolean;
  type: string | null;
  packages: string[];
}

interface ParseResult {
  files: DiffFile[];
  stats: {
    total_files: number;
    additions: number;
    deletions: number;
  };
  monorepo: MonorepoInfo;
  suggested_type: string;
  suggested_scope: string | null;
  has_breaking_changes: boolean;
  breaking_signals: string[];
}

// --- Help ---

function printHelp(): void {
  console.error(`parse-diff.ts — Parse git diff output into structured JSON

Usage:
  git diff --cached | bun run scripts/parse-diff.ts
  bun run scripts/parse-diff.ts --file <path>
  bun run scripts/parse-diff.ts --help

Options:
  --file <path>   Read diff from a file instead of stdin
  --help          Show this help message

Output:
  JSON object to stdout with file classifications, monorepo detection,
  suggested commit type, and suggested scope.

Exit codes:
  0  Success
  1  Error
  2  No diff content`);
}

// --- File classification ---

const TEST_PATTERNS = [
  /\.(test|spec)\.[jt]sx?$/,
  /\/__tests__\//,
  /\/test\//,
  /\.test\./,
  /\.spec\./,
  /_test\.go$/,
  /_test\.py$/,
  /test_.*\.py$/,
];

const DOC_PATTERNS = [
  /\.md$/i,
  /\.mdx$/i,
  /\.rst$/i,
  /\.txt$/i,
  /^docs\//,
  /^documentation\//,
  /LICENSE/i,
  /CHANGELOG/i,
  /CONTRIBUTING/i,
];

const CONFIG_PATTERNS = [
  /package\.json$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  /tsconfig.*\.json$/,
  /\.eslintrc/,
  /\.prettierrc/,
  /Dockerfile/,
  /docker-compose/,
  /Makefile$/,
  /\.env/,
  /\.gitignore$/,
  /\.editorconfig$/,
  /Cargo\.toml$/,
  /Cargo\.lock$/,
  /go\.mod$/,
  /go\.sum$/,
  /requirements.*\.txt$/,
  /pyproject\.toml$/,
  /Gemfile/,
  /\.gemspec$/,
];

const CI_PATTERNS = [
  /\.github\/workflows\//,
  /\.github\/actions\//,
  /\.circleci\//,
  /\.gitlab-ci/,
  /Jenkinsfile/,
  /\.travis\.yml$/,
  /\.buildkite\//,
  /bitbucket-pipelines/,
];

const MONOREPO_PATTERNS: { pattern: RegExp; type: string }[] = [
  { pattern: /^packages\/([^/]+)\//, type: "packages" },
  { pattern: /^apps\/([^/]+)\//, type: "apps" },
  { pattern: /^libs\/([^/]+)\//, type: "libs" },
  { pattern: /^modules\/([^/]+)\//, type: "modules" },
  { pattern: /^services\/([^/]+)\//, type: "services" },
  { pattern: /^plugins\/([^/]+)\//, type: "plugins" },
  { pattern: /^components\/([^/]+)\//, type: "components" },
];

function classifyFile(path: string): Omit<DiffFile, "additions" | "deletions" | "old_path" | "status"> {
  const isTest = TEST_PATTERNS.some((p) => p.test(path));
  const isDoc = DOC_PATTERNS.some((p) => p.test(path));
  const isConfig = CONFIG_PATTERNS.some((p) => p.test(path));
  const isCi = CI_PATTERNS.some((p) => p.test(path));

  let category = "source";
  if (isTest) category = "test";
  else if (isDoc) category = "doc";
  else if (isCi) category = "ci";
  else if (isConfig) category = "config";

  return {
    path,
    is_test: isTest,
    is_doc: isDoc,
    is_config: isConfig,
    is_ci: isCi,
    is_style_only: false,
    category,
  };
}

function detectMonorepo(files: DiffFile[]): MonorepoInfo {
  const packages = new Set<string>();
  let detectedType: string | null = null;

  for (const file of files) {
    for (const { pattern, type } of MONOREPO_PATTERNS) {
      const match = file.path.match(pattern);
      if (match) {
        packages.add(match[1]);
        detectedType = type;
      }
    }
  }

  return {
    detected: packages.size > 0,
    type: detectedType,
    packages: Array.from(packages).sort(),
  };
}

// --- Diff parsing ---

function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const fileBlocks = diffText.split(/^diff --git /m).filter(Boolean);

  for (const block of fileBlocks) {
    const lines = block.split("\n");

    // Extract file paths
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const oldPath = headerMatch[1];
    const newPath = headerMatch[2];

    // Determine status
    let status: DiffFile["status"] = "modified";
    let renamedFrom: string | null = null;

    if (block.includes("new file mode")) {
      status = "added";
    } else if (block.includes("deleted file mode")) {
      status = "deleted";
    } else if (block.includes("rename from") || block.includes("similarity index")) {
      status = "renamed";
      const renameMatch = block.match(/rename from (.+)/);
      renamedFrom = renameMatch ? renameMatch[1] : oldPath;
    }

    // Count additions and deletions
    let additions = 0;
    let deletions = 0;
    let hasLogicChange = false;

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
        const trimmed = line.slice(1).trim();
        // Check if this is more than just whitespace/formatting
        if (trimmed && !isStyleOnlyLine(trimmed)) {
          hasLogicChange = true;
        }
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
        const trimmed = line.slice(1).trim();
        if (trimmed && !isStyleOnlyLine(trimmed)) {
          hasLogicChange = true;
        }
      }
    }

    const classification = classifyFile(newPath);

    files.push({
      ...classification,
      path: newPath,
      old_path: renamedFrom,
      status,
      additions,
      deletions,
      is_style_only: !hasLogicChange && additions + deletions > 0,
    });
  }

  return files;
}

function isStyleOnlyLine(line: string): boolean {
  // Empty or whitespace-only
  if (!line.trim()) return true;
  // Just a brace, bracket, or paren
  if (/^[{}()\[\];,]+$/.test(line.trim())) return true;
  // Just a comment
  if (/^(\/\/|\/\*|\*\/|\*|#|--|<!--)/.test(line.trim())) return true;
  return false;
}

// --- Type suggestion ---

function suggestType(files: DiffFile[]): string {
  if (files.length === 0) return "chore";

  const categories = files.map((f) => f.category);
  const statuses = files.map((f) => f.status);

  // All docs → docs
  if (categories.every((c) => c === "doc")) return "docs";

  // All tests → test
  if (categories.every((c) => c === "test")) return "test";

  // All CI → ci
  if (categories.every((c) => c === "ci")) return "ci";

  // All config/build files → build
  if (categories.every((c) => c === "config")) return "build";

  // All style-only changes → style
  if (files.every((f) => f.is_style_only)) return "style";

  // All new files with source code → feat
  if (statuses.every((s) => s === "added") && categories.some((c) => c === "source")) {
    return "feat";
  }

  // Mix of new source files → feat
  if (statuses.some((s) => s === "added") && categories.some((c) => c === "source")) {
    return "feat";
  }

  // All renames → refactor
  if (statuses.every((s) => s === "renamed")) return "refactor";

  // Default for modifications to source → could be feat, fix, or refactor
  // We can't determine fix vs feat from diff alone, so return a neutral default
  return "feat";
}

// --- Scope suggestion ---

function suggestScope(files: DiffFile[], monorepo: MonorepoInfo): string | null {
  // Monorepo: single package → use package name
  if (monorepo.detected && monorepo.packages.length === 1) {
    return monorepo.packages[0];
  }

  // Monorepo: multiple packages → null (too broad)
  if (monorepo.detected && monorepo.packages.length > 1) {
    return null;
  }

  // Single-repo: find common directory
  const paths = files.map((f) => f.path);
  if (paths.length === 0) return null;

  // If all files share a common first directory segment
  const firstSegments = paths.map((p) => {
    const parts = p.split("/");
    // Skip src/ as it's too generic
    if (parts[0] === "src" && parts.length > 1) return parts[1];
    return parts[0];
  });

  const uniqueSegments = [...new Set(firstSegments)];
  if (uniqueSegments.length === 1) {
    return uniqueSegments[0].replace(/\.[^.]+$/, ""); // strip extension
  }

  return null;
}

// --- Breaking change detection ---

function detectBreakingChanges(files: DiffFile[], diffText: string): {
  has_breaking: boolean;
  signals: string[];
} {
  const signals: string[] = [];

  // Check for return type changes (e.g., removing null from union)
  if (/[-]\s*.*\|\s*null/.test(diffText) && /[+]\s*.*[^|]/.test(diffText)) {
    signals.push("Possible return type narrowing (null removed from union type)");
  }

  // Check for function signature changes
  const removedFunctions = diffText.match(/^-\s*export\s+(async\s+)?function\s+(\w+)/gm);
  const addedFunctions = diffText.match(/^\+\s*export\s+(async\s+)?function\s+(\w+)/gm);
  if (removedFunctions && addedFunctions) {
    const removed = removedFunctions.map((f) => f.match(/function\s+(\w+)/)?.[1]).filter(Boolean);
    const added = addedFunctions.map((f) => f.match(/function\s+(\w+)/)?.[1]).filter(Boolean);
    const renamedOrRemoved = removed.filter((r) => !added.includes(r));
    if (renamedOrRemoved.length > 0) {
      signals.push(`Exported function(s) removed or renamed: ${renamedOrRemoved.join(", ")}`);
    }
  }

  // Check for removed exports
  if (/^-\s*export\s+/m.test(diffText) && !/^\+\s*export\s+/m.test(diffText)) {
    signals.push("Export statement removed without replacement");
  }

  // Check for interface/type changes
  if (/^-\s*(export\s+)?(interface|type)\s+/m.test(diffText)) {
    signals.push("Public interface or type definition modified");
  }

  return {
    has_breaking: signals.length > 0,
    signals,
  };
}

// --- Main ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  let diffText = "";

  const fileIndex = args.indexOf("--file");
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    try {
      diffText = readFileSync(args[fileIndex + 1], "utf-8");
    } catch (err) {
      console.error(`Error reading file: ${args[fileIndex + 1]}`);
      process.exit(1);
    }
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    const stdin = process.stdin;

    if (stdin.isTTY) {
      console.error("No input. Pipe a git diff or use --file <path>.");
      console.error("Usage: git diff --cached | bun run scripts/parse-diff.ts");
      process.exit(2);
    }

    for await (const chunk of stdin) {
      chunks.push(Buffer.from(chunk));
    }
    diffText = Buffer.concat(chunks).toString("utf-8");
  }

  if (!diffText.trim()) {
    console.error("No diff content provided.");
    process.exit(2);
  }

  const files = parseDiff(diffText);
  const monorepo = detectMonorepo(files);
  const suggestedType = suggestType(files);
  const suggestedScope = suggestScope(files, monorepo);
  const breaking = detectBreakingChanges(files, diffText);

  const result: ParseResult = {
    files,
    stats: {
      total_files: files.length,
      additions: files.reduce((sum, f) => sum + f.additions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    },
    monorepo,
    suggested_type: suggestedType,
    suggested_scope: suggestedScope,
    has_breaking_changes: breaking.has_breaking,
    breaking_signals: breaking.signals,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});

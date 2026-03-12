#!/usr/bin/env bun

/**
 * parse-diff.ts — Parse git diffs into structured JSON for commit message generation
 *
 * Reads a unified diff from stdin (piped from `git diff --cached`) and extracts
 * structured metadata: files changed, change types, suggested commit type,
 * suggested scope, breaking change indicators, and line counts.
 *
 * Usage:
 *   git diff --cached | bun run scripts/parse-diff.ts
 *   git diff --cached | bun run scripts/parse-diff.ts --format pretty
 *   cat some.patch | bun run scripts/parse-diff.ts
 *
 * Output (JSON to stdout):
 *   {
 *     "files": [...],
 *     "summary": { "total_additions": N, "total_deletions": N, "files_changed": N },
 *     "suggested_type": "feat",
 *     "suggested_scope": "auth",
 *     "is_breaking_change": false,
 *     "monorepo": { "detected": true, "packages": ["auth", "core"] }
 *   }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileChange {
  path: string;
  old_path: string | null;
  change_type: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  is_test: boolean;
  is_doc: boolean;
  is_config: boolean;
  is_ci: boolean;
  is_style_only: boolean;
  language: string | null;
}

interface MonorepoInfo {
  detected: boolean;
  pattern: string | null;
  packages: string[];
}

interface DiffSummary {
  total_additions: number;
  total_deletions: number;
  files_changed: number;
}

interface BreakingChangeIndicator {
  file: string;
  reason: string;
  line: string;
}

interface ParseResult {
  files: FileChange[];
  summary: DiffSummary;
  suggested_type: string;
  suggested_scope: string | null;
  is_breaking_change: boolean;
  breaking_indicators: BreakingChangeIndicator[];
  monorepo: MonorepoInfo;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
parse-diff.ts — Parse git diffs into structured JSON

USAGE
  git diff --cached | bun run scripts/parse-diff.ts [options]

OPTIONS
  --format <json|pretty>   Output format (default: json)
  --help                   Show this help message

OUTPUT
  JSON object with:
    files[]              - Per-file change details
    summary              - Aggregate line counts
    suggested_type       - Heuristic commit type suggestion
    suggested_scope      - Heuristic scope suggestion
    is_breaking_change   - Whether breaking changes were detected
    breaking_indicators  - Evidence for breaking change detection
    monorepo             - Monorepo detection results

EXAMPLES
  git diff --cached | bun run scripts/parse-diff.ts
  git diff --cached | bun run scripts/parse-diff.ts --format pretty
  cat feature.patch | bun run scripts/parse-diff.ts
`.trim();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
  help: boolean;
  format: "json" | "pretty";
}

function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = { help: false, format: "json" };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--format" && i + 1 < args.length) {
      const fmt = args[++i];
      if (fmt === "json" || fmt === "pretty") {
        result.format = fmt;
      } else {
        console.error(`Unknown format: ${fmt}. Use 'json' or 'pretty'.`);
        process.exit(1);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// File classification helpers
// ---------------------------------------------------------------------------

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test\//,
  /tests\//,
  /\.test\.py$/,
  /test_.*\.py$/,
  /_test\.go$/,
  /\.test\.rs$/,
];

const DOC_PATTERNS = [
  /\.md$/i,
  /\.mdx$/i,
  /\.rst$/i,
  /\.txt$/i,
  /^docs\//,
  /^documentation\//,
  /README/i,
  /CHANGELOG/i,
  /LICENSE/i,
  /CONTRIBUTING/i,
];

const CONFIG_PATTERNS = [
  /package\.json$/,
  /tsconfig.*\.json$/,
  /\.eslintrc/,
  /\.prettierrc/,
  /Dockerfile/,
  /docker-compose/,
  /Makefile$/,
  /\.toml$/,
  /\.yaml$/,
  /\.yml$/,
  /\.lock$/,
  /bun\.lock$/,
  /yarn\.lock$/,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /\.gitignore$/,
  /\.editorconfig$/,
  /\.nvmrc$/,
  /\.node-version$/,
];

const CI_PATTERNS = [
  /\.github\/workflows\//,
  /\.github\/actions\//,
  /\.circleci\//,
  /Jenkinsfile/,
  /\.gitlab-ci/,
  /\.travis\.yml$/,
  /azure-pipelines/,
  /bitbucket-pipelines/,
];

const MONOREPO_PATTERNS = [
  { regex: /^packages\/([^/]+)\//, name: "packages/" },
  { regex: /^apps\/([^/]+)\//, name: "apps/" },
  { regex: /^libs\/([^/]+)\//, name: "libs/" },
  { regex: /^services\/([^/]+)\//, name: "services/" },
  { regex: /^modules\/([^/]+)\//, name: "modules/" },
  { regex: /^components\/([^/]+)\//, name: "components/" },
];

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp",
  ".swift": "swift",
  ".dart": "dart",
  ".vue": "vue",
  ".svelte": "svelte",
  ".css": "css",
  ".scss": "scss",
  ".html": "html",
  ".sql": "sql",
  ".sh": "shell",
  ".bash": "shell",
};

function matchesAny(path: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(path));
}

function detectLanguage(path: string): string | null {
  const ext = path.match(/\.[^.]+$/)?.[0];
  return ext ? LANGUAGE_MAP[ext] ?? null : null;
}

function isStyleOnlyChange(additions: string[], deletions: string[]): boolean {
  // Check if all changes are whitespace/formatting only
  const normalize = (line: string) =>
    line.replace(/\s+/g, "").replace(/[;,]/g, "");

  if (additions.length !== deletions.length) return false;
  if (additions.length === 0) return false;

  const sortedAdds = additions.map(normalize).sort();
  const sortedDels = deletions.map(normalize).sort();

  return sortedAdds.every((a, i) => a === sortedDels[i]);
}

// ---------------------------------------------------------------------------
// Breaking change detection
// ---------------------------------------------------------------------------

const BREAKING_PATTERNS = [
  {
    regex: /^-export\s+(async\s+)?function\s+(\w+)/,
    reason: "Exported function removed",
  },
  {
    regex: /^-export\s+(const|let|var)\s+(\w+)/,
    reason: "Exported variable removed",
  },
  {
    regex: /^-export\s+(class|interface|type|enum)\s+(\w+)/,
    reason: "Exported type/class removed",
  },
  {
    regex:
      /^-.*:\s*(Promise<[^>]+\s*\|\s*null>|[A-Z]\w+\s*\|\s*null)\s*[{;]/,
    reason: "Nullable return type changed",
  },
  {
    regex: /^-.*\bpublic\s+\w+\s*\(/,
    reason: "Public method signature changed",
  },
];

function detectBreakingChanges(
  path: string,
  lines: string[]
): BreakingChangeIndicator[] {
  const indicators: BreakingChangeIndicator[] = [];

  for (const line of lines) {
    for (const pattern of BREAKING_PATTERNS) {
      if (pattern.regex.test(line)) {
        indicators.push({
          file: path,
          reason: pattern.reason,
          line: line.substring(0, 120),
        });
      }
    }
  }

  return indicators;
}

// ---------------------------------------------------------------------------
// Diff parsing
// ---------------------------------------------------------------------------

interface RawFileDiff {
  path: string;
  old_path: string | null;
  is_new: boolean;
  is_deleted: boolean;
  is_renamed: boolean;
  added_lines: string[];
  deleted_lines: string[];
  all_lines: string[];
}

function parseDiff(input: string): RawFileDiff[] {
  const files: RawFileDiff[] = [];
  const diffSections = input.split(/^diff --git /m).filter(Boolean);

  for (const section of diffSections) {
    const lines = section.split("\n");
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const oldPath = headerMatch[1];
    const newPath = headerMatch[2];

    const isNew = section.includes("new file mode");
    const isDeleted = section.includes("deleted file mode");
    const isRenamed =
      section.includes("rename from") || section.includes("similarity index");

    const addedLines: string[] = [];
    const deletedLines: string[] = [];
    const allLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        addedLines.push(line);
        allLines.push(line);
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletedLines.push(line);
        allLines.push(line);
      }
    }

    files.push({
      path: newPath,
      old_path: isRenamed && oldPath !== newPath ? oldPath : null,
      is_new: isNew,
      is_deleted: isDeleted,
      is_renamed: isRenamed && oldPath !== newPath,
      added_lines: addedLines,
      deleted_lines: deletedLines,
      all_lines: allLines,
    });
  }

  return files;
}

// ---------------------------------------------------------------------------
// Type suggestion heuristics
// ---------------------------------------------------------------------------

function suggestType(files: FileChange[]): string {
  if (files.length === 0) return "chore";

  const allDocs = files.every((f) => f.is_doc);
  if (allDocs) return "docs";

  const allTests = files.every((f) => f.is_test);
  if (allTests) return "test";

  const allCI = files.every((f) => f.is_ci);
  if (allCI) return "ci";

  const allConfig = files.every((f) => f.is_config);
  if (allConfig) return "build";

  const allStyle = files.every((f) => f.is_style_only);
  if (allStyle) return "style";

  const hasNewFiles = files.some((f) => f.change_type === "added");
  const hasOnlyNewAndModified = files.every(
    (f) => f.change_type === "added" || f.change_type === "modified"
  );

  // If there are new non-test, non-doc, non-config files, likely a feature
  const newSourceFiles = files.filter(
    (f) =>
      f.change_type === "added" && !f.is_test && !f.is_doc && !f.is_config
  );
  if (newSourceFiles.length > 0) return "feat";

  // If mostly renames or restructuring
  const renames = files.filter((f) => f.change_type === "renamed");
  if (renames.length > files.length / 2) return "refactor";

  // If only deletions with no additions in source files
  const onlyDeletions = files.every(
    (f) => f.additions === 0 && f.deletions > 0
  );
  if (onlyDeletions) return "refactor";

  // Default to feat for new files, refactor for modifications
  if (hasNewFiles && hasOnlyNewAndModified) return "feat";

  return "chore";
}

// ---------------------------------------------------------------------------
// Scope suggestion heuristics
// ---------------------------------------------------------------------------

function suggestScope(
  files: FileChange[],
  monorepo: MonorepoInfo
): string | null {
  if (files.length === 0) return null;

  // In monorepos, prefer package name
  if (monorepo.detected && monorepo.packages.length === 1) {
    return monorepo.packages[0];
  }

  // Find common directory prefix
  const paths = files.map((f) => f.path);
  const segments = paths.map((p) => p.split("/"));

  if (segments.length === 1) {
    // Single file — use parent directory or filename stem
    const parts = segments[0];
    if (parts.length >= 2) {
      // Use the most specific non-root directory
      return parts[parts.length - 2].toLowerCase();
    }
    return null;
  }

  // Find common prefix
  let commonDepth = 0;
  const minLen = Math.min(...segments.map((s) => s.length));

  for (let i = 0; i < minLen; i++) {
    const seg = segments[0][i];
    if (segments.every((s) => s[i] === seg)) {
      commonDepth = i + 1;
    } else {
      break;
    }
  }

  if (commonDepth > 0) {
    const commonPath = segments[0].slice(0, commonDepth);
    // Skip generic top-level dirs like "src", "lib"
    const genericDirs = new Set(["src", "lib", "source", "app"]);
    const meaningful = commonPath.filter((p) => !genericDirs.has(p));
    if (meaningful.length > 0) {
      return meaningful[meaningful.length - 1].toLowerCase();
    }
    // If all common dirs are generic, use the deepest one
    return commonPath[commonPath.length - 1].toLowerCase();
  }

  return null;
}

// ---------------------------------------------------------------------------
// Monorepo detection
// ---------------------------------------------------------------------------

function detectMonorepo(files: RawFileDiff[]): MonorepoInfo {
  const packages = new Set<string>();
  let detectedPattern: string | null = null;

  for (const file of files) {
    for (const pattern of MONOREPO_PATTERNS) {
      const match = file.path.match(pattern.regex);
      if (match) {
        packages.add(match[1]);
        detectedPattern = pattern.name;
      }
    }
  }

  return {
    detected: packages.size > 0,
    pattern: detectedPattern,
    packages: Array.from(packages).sort(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  // Read from stdin
  const input = await Bun.stdin.text();

  if (!input.trim()) {
    console.error("No diff input received. Pipe a diff to stdin:");
    console.error("  git diff --cached | bun run scripts/parse-diff.ts");
    process.exit(1);
  }

  // Parse the raw diff
  const rawFiles = parseDiff(input);

  if (rawFiles.length === 0) {
    console.error("No file changes found in the diff.");
    process.exit(1);
  }

  // Detect monorepo
  const monorepo = detectMonorepo(rawFiles);

  // Build structured file changes
  const files: FileChange[] = rawFiles.map((raw) => {
    const changeType = raw.is_new
      ? "added"
      : raw.is_deleted
        ? "deleted"
        : raw.is_renamed
          ? "renamed"
          : "modified";

    return {
      path: raw.path,
      old_path: raw.old_path,
      change_type: changeType as FileChange["change_type"],
      additions: raw.added_lines.length,
      deletions: raw.deleted_lines.length,
      is_test: matchesAny(raw.path, TEST_PATTERNS),
      is_doc: matchesAny(raw.path, DOC_PATTERNS),
      is_config: matchesAny(raw.path, CONFIG_PATTERNS),
      is_ci: matchesAny(raw.path, CI_PATTERNS),
      is_style_only: isStyleOnlyChange(raw.added_lines, raw.deleted_lines),
      language: detectLanguage(raw.path),
    };
  });

  // Detect breaking changes
  const breakingIndicators: BreakingChangeIndicator[] = [];
  for (const raw of rawFiles) {
    breakingIndicators.push(...detectBreakingChanges(raw.path, raw.all_lines));
  }

  // Build result
  const result: ParseResult = {
    files,
    summary: {
      total_additions: files.reduce((sum, f) => sum + f.additions, 0),
      total_deletions: files.reduce((sum, f) => sum + f.deletions, 0),
      files_changed: files.length,
    },
    suggested_type: suggestType(files),
    suggested_scope: suggestScope(files, monorepo),
    is_breaking_change: breakingIndicators.length > 0,
    breaking_indicators: breakingIndicators,
    monorepo,
  };

  // Output
  if (args.format === "pretty") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(JSON.stringify(result));
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

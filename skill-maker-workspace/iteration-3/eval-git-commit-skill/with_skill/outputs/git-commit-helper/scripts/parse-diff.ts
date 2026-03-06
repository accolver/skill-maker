#!/usr/bin/env bun

/**
 * parse-diff.ts — Parse git diffs and extract structured information for
 * generating conventional commit messages.
 *
 * Analyzes file changes, detects monorepo scopes, and suggests commit types.
 *
 * Output: JSON to stdout. Diagnostics to stderr.
 * Exit codes: 0 = success, 1 = error, 2 = no changes detected
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  isBinary: boolean;
}

interface ScopeDetection {
  detected: boolean;
  scope: string | null;
  packages: string[];
  reason: string;
}

interface CommitTypeSuggestion {
  type: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface ParseResult {
  files: FileChange[];
  total_additions: number;
  total_deletions: number;
  total_files: number;
  scope: ScopeDetection;
  suggested_type: CommitTypeSuggestion;
  is_breaking: boolean;
  breaking_signals: string[];
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
parse-diff — Parse git diffs for conventional commit message generation.

USAGE
  bun run scripts/parse-diff.ts --diff <diff-text>
  bun run scripts/parse-diff.ts --diff <diff-text> --detect-scope
  bun run scripts/parse-diff.ts --file <path-to-diff-file>
  echo "<diff>" | bun run scripts/parse-diff.ts --stdin

ARGUMENTS
  --diff <text>       Git diff content as a string argument
  --file <path>       Path to a file containing git diff output
  --stdin             Read diff from stdin
  --detect-scope      Include monorepo scope detection (default: true)
  --no-detect-scope   Skip scope detection
  --help, -h          Show this help message

OUTPUT
  Structured JSON to stdout with fields:
    files             Array of changed files with path, status, additions, deletions
    total_additions   Total lines added
    total_deletions   Total lines removed
    total_files       Number of files changed
    scope             Monorepo scope detection result
    suggested_type    Suggested conventional commit type with confidence
    is_breaking       Whether breaking change signals were detected
    breaking_signals  List of breaking change indicators found

EXIT CODES
  0   Success — parsed diff and produced JSON output
  1   Error — invalid arguments or parse failure
  2   No changes — diff was empty or contained no file changes

EXAMPLES
  # Parse staged changes
  bun run scripts/parse-diff.ts --diff "$(git diff --cached)"

  # Parse from a saved diff file
  bun run scripts/parse-diff.ts --file changes.diff

  # Pipe diff through stdin
  git diff --cached | bun run scripts/parse-diff.ts --stdin

  # Detect monorepo scope
  bun run scripts/parse-diff.ts --diff "$(git diff --cached)" --detect-scope
`.trim();

// ---------------------------------------------------------------------------
// Diff parser
// ---------------------------------------------------------------------------

function parseDiff(diffText: string): FileChange[] {
  const files: FileChange[] = [];
  if (!diffText || diffText.trim() === "") return files;

  // Split into per-file sections
  const fileSections = diffText.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const lines = section.split("\n");

    // Extract file path from the first line: "a/path b/path"
    const headerMatch = lines[0]?.match(/a\/(.+?)\s+b\/(.+)/);
    if (!headerMatch) continue;

    const pathA = headerMatch[1];
    const pathB = headerMatch[2];

    // Determine status
    let status: FileChange["status"] = "modified";
    let isBinary = false;

    if (section.includes("new file mode")) {
      status = "added";
    } else if (section.includes("deleted file mode")) {
      status = "deleted";
    } else if (section.includes("rename from") || pathA !== pathB) {
      status = "renamed";
    }

    if (section.includes("Binary files")) {
      isBinary = true;
    }

    // Count additions and deletions from hunk lines
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    files.push({
      path: status === "deleted" ? pathA : pathB,
      status,
      additions,
      deletions,
      isBinary,
    });
  }

  return files;
}

// ---------------------------------------------------------------------------
// Scope detection
// ---------------------------------------------------------------------------

const PACKAGE_PATTERNS = [
  /^packages\/([^/]+)\//,
  /^apps\/([^/]+)\//,
  /^services\/([^/]+)\//,
  /^libs\/([^/]+)\//,
  /^modules\/([^/]+)\//,
  /^crates\/([^/]+)\//,
  /^internal\/([^/]+)\//,
  /^plugins\/([^/]+)\//,
];

function detectScope(files: FileChange[]): ScopeDetection {
  if (files.length === 0) {
    return {
      detected: false,
      scope: null,
      packages: [],
      reason: "No files to analyze",
    };
  }

  const packageSet = new Set<string>();

  for (const file of files) {
    for (const pattern of PACKAGE_PATTERNS) {
      const match = file.path.match(pattern);
      if (match) {
        packageSet.add(match[1]);
        break;
      }
    }
  }

  const packages = [...packageSet].sort();

  if (packages.length === 0) {
    return {
      detected: false,
      scope: null,
      packages: [],
      reason: "No monorepo package patterns found in file paths",
    };
  }

  if (packages.length === 1) {
    return {
      detected: true,
      scope: packages[0],
      packages,
      reason: `All changes are within the '${packages[0]}' package`,
    };
  }

  return {
    detected: false,
    scope: null,
    packages,
    reason: `Changes span multiple packages (${packages.join(", ")}); omit scope or use a shared parent`,
  };
}

// ---------------------------------------------------------------------------
// Commit type suggestion
// ---------------------------------------------------------------------------

function suggestCommitType(files: FileChange[]): CommitTypeSuggestion {
  if (files.length === 0) {
    return { type: "chore", confidence: "low", reason: "No files changed" };
  }

  const paths = files.map((f) => f.path.toLowerCase());
  const allPaths = paths.join("\n");

  // Check for test-only changes
  const testPatterns = [
    /\btest[s]?\b/,
    /\bspec[s]?\b/,
    /\b__tests__\b/,
    /\.test\./,
    /\.spec\./,
  ];
  const allTests = paths.every((p) =>
    testPatterns.some((pattern) => pattern.test(p)),
  );
  if (allTests) {
    return {
      type: "test",
      confidence: "high",
      reason: "All changed files are test files",
    };
  }

  // Check for docs-only changes
  const docPatterns = [
    /\.md$/,
    /\.mdx$/,
    /\.txt$/,
    /\.rst$/,
    /\bdocs?\b/,
    /readme/i,
    /changelog/i,
    /license/i,
  ];
  const allDocs = paths.every((p) =>
    docPatterns.some((pattern) => pattern.test(p)),
  );
  if (allDocs) {
    return {
      type: "docs",
      confidence: "high",
      reason: "All changed files are documentation",
    };
  }

  // Check for CI-only changes
  const ciPatterns = [
    /\.github\/workflows\//,
    /\.gitlab-ci/,
    /jenkinsfile/i,
    /\.circleci/,
    /\.travis/,
    /bitbucket-pipelines/,
  ];
  const allCI = paths.every((p) =>
    ciPatterns.some((pattern) => pattern.test(p)),
  );
  if (allCI) {
    return {
      type: "ci",
      confidence: "high",
      reason: "All changed files are CI/CD configuration",
    };
  }

  // Check for config/chore changes
  const chorePatterns = [
    /\.eslintrc/,
    /\.prettierrc/,
    /tsconfig/,
    /\.editorconfig/,
    /\.gitignore/,
    /\.nvmrc/,
    /\.node-version/,
    /\.tool-versions/,
  ];
  const allChore = paths.every((p) =>
    chorePatterns.some((pattern) => pattern.test(p)),
  );
  if (allChore) {
    return {
      type: "chore",
      confidence: "high",
      reason: "All changed files are configuration/tooling",
    };
  }

  // Check for build system changes
  const buildPatterns = [
    /dockerfile/i,
    /docker-compose/i,
    /webpack/,
    /vite\.config/,
    /rollup/,
    /esbuild/,
    /makefile/i,
    /cmake/i,
  ];
  const allBuild = paths.every((p) =>
    buildPatterns.some((pattern) => pattern.test(p)),
  );
  if (allBuild) {
    return {
      type: "build",
      confidence: "high",
      reason: "All changed files are build system configuration",
    };
  }

  // Check for style-only changes (formatting)
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
  if (
    totalAdditions > 0 &&
    totalDeletions > 0 &&
    Math.abs(totalAdditions - totalDeletions) <= 2 &&
    files.every((f) => f.status === "modified")
  ) {
    return {
      type: "style",
      confidence: "low",
      reason:
        "Nearly equal additions and deletions with only modifications suggests formatting changes (verify manually)",
    };
  }

  // Check for new files (likely feat)
  const hasNewFiles = files.some((f) => f.status === "added");
  if (hasNewFiles) {
    const newSourceFiles = files.filter(
      (f) =>
        f.status === "added" &&
        !testPatterns.some((p) => p.test(f.path.toLowerCase())) &&
        !docPatterns.some((p) => p.test(f.path.toLowerCase())),
    );
    if (newSourceFiles.length > 0) {
      return {
        type: "feat",
        confidence: "medium",
        reason: `New source files added: ${newSourceFiles.map((f) => f.path).join(", ")}`,
      };
    }
  }

  // Default: modifications to existing source files
  return {
    type: "fix",
    confidence: "low",
    reason:
      "Modifications to existing source files — could be fix, refactor, or perf (review diff content to determine)",
  };
}

// ---------------------------------------------------------------------------
// Breaking change detection
// ---------------------------------------------------------------------------

function detectBreakingChanges(
  diffText: string,
  files: FileChange[],
): { isBreaking: boolean; signals: string[] } {
  const signals: string[] = [];

  // Check for deleted public API files
  const deletedFiles = files.filter((f) => f.status === "deleted");
  for (const f of deletedFiles) {
    if (
      f.path.includes("src/") ||
      f.path.includes("lib/") ||
      f.path.includes("api/")
    ) {
      signals.push(`Deleted source file: ${f.path}`);
    }
  }

  // Check for renamed exports or function signatures in diff
  const breakingPatterns = [
    /^-\s*export\s+(default\s+)?(function|class|const|let|var|interface|type)\s+/m,
    /^-\s*module\.exports/m,
    /BREAKING[\s_-]?CHANGE/i,
  ];

  for (const pattern of breakingPatterns) {
    if (pattern.test(diffText)) {
      signals.push(`Pattern match: ${pattern.source}`);
    }
  }

  return {
    isBreaking: signals.length > 0,
    signals,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let diffText = "";
  let detectScopeFlag = true;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--diff":
        diffText = args[++i] || "";
        break;
      case "--file": {
        const filePath = args[++i];
        if (!filePath) {
          console.error("Error: --file requires a path argument");
          process.exit(1);
        }
        try {
          const file = Bun.file(filePath);
          diffText = await file.text();
        } catch (err) {
          console.error(`Error reading file: ${filePath}`);
          process.exit(1);
        }
        break;
      }
      case "--stdin": {
        // Read from stdin
        const chunks: string[] = [];
        const reader = Bun.stdin.stream().getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(decoder.decode(value, { stream: true }));
        }
        diffText = chunks.join("");
        break;
      }
      case "--detect-scope":
        detectScopeFlag = true;
        break;
      case "--no-detect-scope":
        detectScopeFlag = false;
        break;
      default:
        if (args[i]?.startsWith("--")) {
          console.error(`Unknown flag: ${args[i]}`);
          process.exit(1);
        }
    }
  }

  if (!diffText || diffText.trim() === "") {
    console.error("No diff content provided. Use --diff, --file, or --stdin.");
    const emptyResult: ParseResult = {
      files: [],
      total_additions: 0,
      total_deletions: 0,
      total_files: 0,
      scope: {
        detected: false,
        scope: null,
        packages: [],
        reason: "No diff content provided",
      },
      suggested_type: { type: "chore", confidence: "low", reason: "No changes" },
      is_breaking: false,
      breaking_signals: [],
    };
    console.log(JSON.stringify(emptyResult, null, 2));
    process.exit(2);
  }

  // Parse
  const files = parseDiff(diffText);

  if (files.length === 0) {
    console.error("Diff parsed but no file changes detected.");
    const emptyResult: ParseResult = {
      files: [],
      total_additions: 0,
      total_deletions: 0,
      total_files: 0,
      scope: {
        detected: false,
        scope: null,
        packages: [],
        reason: "No file changes in diff",
      },
      suggested_type: {
        type: "chore",
        confidence: "low",
        reason: "No file changes detected",
      },
      is_breaking: false,
      breaking_signals: [],
    };
    console.log(JSON.stringify(emptyResult, null, 2));
    process.exit(2);
  }

  // Analyze
  const scope = detectScopeFlag
    ? detectScope(files)
    : {
        detected: false,
        scope: null,
        packages: [] as string[],
        reason: "Scope detection disabled",
      };

  const suggestedType = suggestCommitType(files);
  const breaking = detectBreakingChanges(diffText, files);

  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  const result: ParseResult = {
    files,
    total_additions: totalAdditions,
    total_deletions: totalDeletions,
    total_files: files.length,
    scope,
    suggested_type: suggestedType,
    is_breaking: breaking.isBreaking,
    breaking_signals: breaking.signals,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main();

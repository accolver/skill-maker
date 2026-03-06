#!/usr/bin/env bun

/**
 * parse-diff — Parse a git diff and extract structured information for
 * generating conventional commit messages.
 *
 * Analyzes file changes, detects the most likely commit type, and suggests
 * a monorepo scope based on file paths.
 */

const HELP = `
parse-diff — Parse git diff output into structured commit metadata.

USAGE
  bun run scripts/parse-diff.ts --diff "<git diff output>"
  bun run scripts/parse-diff.ts --file <diff-file>
  git diff --staged | bun run scripts/parse-diff.ts --stdin

ARGUMENTS
  --diff <string>   Raw diff content as a string argument
  --file <path>     Path to a file containing diff output
  --stdin           Read diff from stdin
  --help            Show this help message

OUTPUT
  JSON to stdout with fields:
    files         - Array of changed files with stats
    type          - Suggested conventional commit type
    scope         - Suggested monorepo scope (or null)
    breaking      - Whether breaking changes were detected
    summary       - One-line summary of changes

EXIT CODES
  0   Success
  1   Error (no input, parse failure)

EXAMPLES
  bun run scripts/parse-diff.ts --diff "$(git diff --staged)"
  git diff --staged | bun run scripts/parse-diff.ts --stdin
  bun run scripts/parse-diff.ts --file changes.diff
`.trim();

// --- Types ---

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  directory: string;
}

interface ParseResult {
  files: FileChange[];
  type: string;
  scope: string | null;
  breaking: boolean;
  summary: string;
  file_count: number;
  total_additions: number;
  total_deletions: number;
}

// --- Commit type detection ---

const TYPE_PATTERNS: Array<{ type: string; patterns: RegExp[] }> = [
  {
    type: "test",
    patterns: [
      /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      /__(tests|mocks)__\//,
      /\.test\./,
      /test\//i,
    ],
  },
  {
    type: "docs",
    patterns: [
      /\.(md|mdx|txt|rst)$/,
      /docs?\//i,
      /README/i,
      /CHANGELOG/i,
      /LICENSE/i,
    ],
  },
  {
    type: "ci",
    patterns: [
      /\.github\/workflows\//,
      /\.gitlab-ci/,
      /Jenkinsfile/,
      /\.circleci\//,
      /\.travis/,
      /bitbucket-pipelines/,
    ],
  },
  {
    type: "build",
    patterns: [
      /webpack\./,
      /rollup\./,
      /vite\.config/,
      /tsconfig/,
      /babel\./,
      /esbuild/,
      /Makefile/,
      /Dockerfile/,
      /docker-compose/,
    ],
  },
  {
    type: "style",
    patterns: [
      /\.css$/,
      /\.scss$/,
      /\.less$/,
      /\.prettierrc/,
      /\.eslintrc/,
      /\.editorconfig/,
    ],
  },
  {
    type: "chore",
    patterns: [
      /package\.json$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
      /\.gitignore$/,
      /\.env\.example$/,
      /\.nvmrc$/,
    ],
  },
];

function detectType(files: FileChange[]): string {
  if (files.length === 0) return "chore";

  const typeCounts: Record<string, number> = {};

  for (const file of files) {
    let matched = false;
    for (const { type, patterns } of TYPE_PATTERNS) {
      if (patterns.some((p) => p.test(file.path))) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Default: if file is new, likely feat; if modified, could be fix or refactor
      if (file.status === "added") {
        typeCounts["feat"] = (typeCounts["feat"] || 0) + 1;
      } else if (file.status === "deleted") {
        typeCounts["refactor"] = (typeCounts["refactor"] || 0) + 1;
      } else {
        typeCounts["fix"] = (typeCounts["fix"] || 0) + 1;
      }
    }
  }

  // Return the most common type, with feat taking priority on ties
  const sorted = Object.entries(typeCounts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[0] === "feat") return -1;
    if (b[0] === "feat") return 1;
    return 0;
  });

  return sorted[0]?.[0] || "chore";
}

// --- Scope detection ---

function detectScope(files: FileChange[]): string | null {
  if (files.length === 0) return null;

  const monorepoPatterns = [
    /^packages\/([^/]+)\//,
    /^apps\/([^/]+)\//,
    /^libs\/([^/]+)\//,
    /^modules\/([^/]+)\//,
    /^services\/([^/]+)\//,
  ];

  const scopes = new Set<string>();

  for (const file of files) {
    for (const pattern of monorepoPatterns) {
      const match = file.path.match(pattern);
      if (match) {
        scopes.add(match[1]);
        break;
      }
    }
  }

  // Only return scope if all files are in the same package
  if (scopes.size === 1) {
    return [...scopes][0];
  }

  return null;
}

// --- Diff parsing ---

function parseDiff(diffText: string): FileChange[] {
  const files: FileChange[] = [];
  const diffSections = diffText.split(/^diff --git /m).filter(Boolean);

  for (const section of diffSections) {
    const lines = section.split("\n");

    // Extract file path from the diff header
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const pathA = headerMatch[1];
    const pathB = headerMatch[2];

    // Determine status
    let status: FileChange["status"] = "modified";
    if (section.includes("new file mode")) {
      status = "added";
    } else if (section.includes("deleted file mode")) {
      status = "deleted";
    } else if (pathA !== pathB) {
      status = "renamed";
    }

    // Count additions and deletions
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    const path = status === "deleted" ? pathA : pathB;
    const directory = path.includes("/")
      ? path.substring(0, path.lastIndexOf("/"))
      : ".";

    files.push({ path, status, additions, deletions, directory });
  }

  return files;
}

function detectBreaking(diffText: string): boolean {
  const breakingPatterns = [
    /BREAKING[\s_-]?CHANGE/i,
    /\bremoved?\b.*\b(api|endpoint|function|method|class|interface)\b/i,
    /\bdeleted?\b.*\b(api|endpoint|function|method|class|interface)\b/i,
  ];

  return breakingPatterns.some((p) => p.test(diffText));
}

function generateSummary(files: FileChange[], type: string): string {
  if (files.length === 0) return "no changes detected";
  if (files.length === 1) {
    const f = files[0];
    return `${f.status} ${f.path}`;
  }

  const statusCounts: Record<string, number> = {};
  for (const f of files) {
    statusCounts[f.status] = (statusCounts[f.status] || 0) + 1;
  }

  const parts = Object.entries(statusCounts).map(
    ([status, count]) => `${count} ${status}`
  );
  return `${parts.join(", ")} across ${files.length} files`;
}

// --- Main ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let diffText = "";

  const diffIdx = args.indexOf("--diff");
  const fileIdx = args.indexOf("--file");

  if (args.includes("--stdin")) {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    diffText = Buffer.concat(chunks).toString("utf-8");
  } else if (diffIdx !== -1 && args[diffIdx + 1]) {
    diffText = args[diffIdx + 1];
  } else if (fileIdx !== -1 && args[fileIdx + 1]) {
    const { readFileSync } = await import("node:fs");
    diffText = readFileSync(args[fileIdx + 1], "utf-8");
  } else {
    console.error("Error: No diff input provided. Use --diff, --file, or --stdin.");
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  if (!diffText.trim()) {
    console.error("Error: Diff input is empty.");
    process.exit(1);
  }

  const files = parseDiff(diffText);
  const type = detectType(files);
  const scope = detectScope(files);
  const breaking = detectBreaking(diffText);
  const summary = generateSummary(files, type);

  const result: ParseResult = {
    files,
    type,
    scope,
    breaking,
    summary,
    file_count: files.length,
    total_additions: files.reduce((sum, f) => sum + f.additions, 0),
    total_deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();

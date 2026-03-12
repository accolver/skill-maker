#!/usr/bin/env bun
/**
 * parse-diff.ts — Parse a unified git diff into structured JSON.
 *
 * Reads a git diff from stdin and outputs structured metadata about each
 * changed file, including suggested commit type, scope, monorepo package
 * detection, and splitting recommendations.
 *
 * Usage:
 *   git diff --cached | bun run scripts/parse-diff.ts
 *   git diff --cached | bun run scripts/parse-diff.ts --monorepo-dirs packages,apps,libs
 *   cat diff.patch | bun run scripts/parse-diff.ts
 *
 * Options:
 *   --help                Show this help message
 *   --monorepo-dirs       Comma-separated list of monorepo root directories
 *                         (default: packages,apps,libs,modules,services)
 *   --split-threshold     Number of unrelated files before recommending split
 *                         (default: 5)
 *
 * Output (JSON to stdout):
 *   {
 *     "files": [...],      // Per-file metadata
 *     "summary": {...}     // Aggregate analysis
 *   }
 *
 * Exit codes:
 *   0 — Success
 *   1 — No input provided
 *   2 — Parse error
 */

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.error(`parse-diff.ts — Parse a unified git diff into structured JSON.

Usage:
  git diff --cached | bun run scripts/parse-diff.ts
  git diff --cached | bun run scripts/parse-diff.ts --monorepo-dirs packages,apps,libs

Options:
  --help                Show this help message
  --monorepo-dirs       Comma-separated monorepo root dirs (default: packages,apps,libs,modules,services)
  --split-threshold     Unrelated file count before recommending split (default: 5)

Output: JSON to stdout with per-file metadata and aggregate summary.

Exit codes:
  0 — Success
  1 — No input provided
  2 — Parse error`);
  process.exit(0);
}

// Parse CLI args
const monorepoDirsIdx = args.indexOf("--monorepo-dirs");
const monorepoDirs = monorepoDirsIdx !== -1 && args[monorepoDirsIdx + 1]
  ? args[monorepoDirsIdx + 1].split(",")
  : ["packages", "apps", "libs", "modules", "services"];

const splitThresholdIdx = args.indexOf("--split-threshold");
const splitThreshold = splitThresholdIdx !== -1 && args[splitThresholdIdx + 1]
  ? parseInt(args[splitThresholdIdx + 1], 10)
  : 5;

// --- Types ---

interface FileChange {
  path: string;
  oldPath: string | null;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  package: string | null;
  directory: string;
  suggestedType: string;
  hasNewExports: boolean;
  hasBreakingChange: boolean;
  isTestFile: boolean;
  isDocFile: boolean;
  isCIFile: boolean;
  isBuildFile: boolean;
}

interface DiffSummary {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  packages: string[];
  suggestedType: string;
  suggestedScope: string | null;
  isMonorepo: boolean;
  shouldSplit: boolean;
  splitReason: string | null;
}

interface ParseResult {
  files: FileChange[];
  summary: DiffSummary;
}

// --- Helpers ---

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /__tests__\//,
  /test\//,
  /tests\//,
  /\.test\.py$/,
  /test_.*\.py$/,
  /_test\.go$/,
];

const DOC_PATTERNS = [
  /\.md$/i,
  /\.mdx$/i,
  /\.rst$/i,
  /\.txt$/i,
  /^docs\//,
  /^documentation\//,
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
  /^Dockerfile/,
  /^docker-compose/,
  /^Makefile/,
  /^CMakeLists/,
  /\.dockerfile$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /^package-lock\.json$/,
  /^bun\.lockb$/,
  /^go\.mod$/,
  /^go\.sum$/,
  /^Cargo\.toml$/,
  /^Cargo\.lock$/,
  /^requirements\.txt$/,
  /^pyproject\.toml$/,
  /^Gemfile/,
  /^build\.gradle/,
  /^pom\.xml$/,
  /^tsconfig.*\.json$/,
  /^webpack\./,
  /^vite\.config/,
  /^rollup\.config/,
  /^esbuild/,
];

const STYLE_PATTERNS = [
  /\.prettierrc/,
  /\.eslintrc/,
  /\.editorconfig/,
  /\.stylelintrc/,
  /biome\.json/,
];

function matchesAny(path: string, patterns: RegExp[]): boolean {
  const basename = path.split("/").pop() || path;
  return patterns.some((p) => p.test(path) || p.test(basename));
}

function detectPackage(filePath: string, dirs: string[]): string | null {
  for (const dir of dirs) {
    const prefix = `${dir}/`;
    if (filePath.startsWith(prefix)) {
      const rest = filePath.slice(prefix.length);
      const packageName = rest.split("/")[0];
      if (packageName) return packageName;
    }
  }
  return null;
}

function getDirectory(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 1) return ".";
  return parts.slice(0, -1).join("/");
}

function classifyFile(file: FileChange): string {
  if (file.isTestFile) return "test";
  if (file.isDocFile) return "docs";
  if (file.isCIFile) return "ci";
  if (file.isBuildFile) return "build";
  if (file.status === "added" && file.hasNewExports) return "feat";
  if (file.status === "added") return "feat";
  if (file.status === "deleted") return "refactor";
  if (file.status === "renamed") return "refactor";
  if (file.hasBreakingChange) return "fix";
  if (file.hasNewExports) return "feat";
  return "fix";
}

function detectNewExports(hunkContent: string): boolean {
  const addedLines = hunkContent
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  return addedLines.some(
    (l) =>
      /export\s+(function|class|const|let|var|type|interface|enum|default)/.test(l) ||
      /module\.exports/.test(l) ||
      /^exports\./.test(l)
  );
}

function detectBreakingChange(hunkContent: string): boolean {
  const removedLines = hunkContent
    .split("\n")
    .filter((l) => l.startsWith("-") && !l.startsWith("---"));
  return removedLines.some(
    (l) =>
      /export\s+(function|class|const|let|var|type|interface|enum|default)/.test(l) ||
      /module\.exports/.test(l)
  );
}

// --- Parser ---

function parseDiff(input: string): ParseResult {
  const files: FileChange[] = [];

  // Split into per-file diffs
  const fileDiffs = input.split(/^diff --git /m).filter((s) => s.trim());

  for (const fileDiff of fileDiffs) {
    const lines = fileDiff.split("\n");

    // Extract file paths
    const headerMatch = lines[0]?.match(/a\/(.+?)\s+b\/(.+)/);
    if (!headerMatch) continue;

    const oldPath = headerMatch[1];
    const newPath = headerMatch[2];

    // Detect status
    let status: FileChange["status"] = "modified";
    let finalPath = newPath;
    let finalOldPath: string | null = null;

    if (fileDiff.includes("new file mode")) {
      status = "added";
    } else if (fileDiff.includes("deleted file mode")) {
      status = "deleted";
      finalPath = oldPath;
    } else if (fileDiff.includes("rename from") || fileDiff.includes("similarity index")) {
      status = "renamed";
      finalOldPath = oldPath;
    }

    // Count additions and deletions
    let additions = 0;
    let deletions = 0;
    const hunkLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
        hunkLines.push(line);
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
        hunkLines.push(line);
      }
    }

    const hunkContent = hunkLines.join("\n");
    const pkg = detectPackage(finalPath, monorepoDirs);

    const file: FileChange = {
      path: finalPath,
      oldPath: finalOldPath,
      status,
      additions,
      deletions,
      package: pkg,
      directory: getDirectory(finalPath),
      suggestedType: "",
      hasNewExports: detectNewExports(hunkContent),
      hasBreakingChange: detectBreakingChange(hunkContent),
      isTestFile: matchesAny(finalPath, TEST_PATTERNS),
      isDocFile: matchesAny(finalPath, DOC_PATTERNS),
      isCIFile: matchesAny(finalPath, CI_PATTERNS),
      isBuildFile: matchesAny(finalPath, BUILD_PATTERNS),
    };

    file.suggestedType = classifyFile(file);
    files.push(file);
  }

  // --- Summary ---

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);
  const packages = [...new Set(files.map((f) => f.package).filter(Boolean))] as string[];
  const isMonorepo = packages.length > 0;

  // Determine aggregate suggested type
  const typeCounts: Record<string, number> = {};
  for (const f of files) {
    typeCounts[f.suggestedType] = (typeCounts[f.suggestedType] || 0) + 1;
  }

  // Priority: feat > fix > refactor > others
  const typePriority = ["feat", "fix", "refactor", "perf", "docs", "test", "build", "ci", "style", "chore"];
  let suggestedType = "chore";
  for (const t of typePriority) {
    if (typeCounts[t]) {
      suggestedType = t;
      break;
    }
  }

  // If ALL files are one type, use that
  const uniqueTypes = [...new Set(files.map((f) => f.suggestedType))];
  if (uniqueTypes.length === 1) {
    suggestedType = uniqueTypes[0];
  }

  // Determine scope
  let suggestedScope: string | null = null;
  if (packages.length === 1) {
    suggestedScope = packages[0];
  } else if (packages.length === 0) {
    // Non-monorepo: use common directory
    const dirs = [...new Set(files.map((f) => f.directory.split("/")[0]))];
    if (dirs.length === 1 && dirs[0] !== ".") {
      suggestedScope = dirs[0];
    } else {
      // Try second-level directory
      const secondLevel = [...new Set(files.map((f) => {
        const parts = f.directory.split("/");
        return parts.length > 1 ? parts[1] : parts[0];
      }))];
      if (secondLevel.length === 1 && secondLevel[0] !== ".") {
        suggestedScope = secondLevel[0];
      }
    }
  } else {
    // Multiple packages — pick the one with most changes
    const pkgChanges: Record<string, number> = {};
    for (const f of files) {
      if (f.package) {
        pkgChanges[f.package] = (pkgChanges[f.package] || 0) + f.additions + f.deletions;
      }
    }
    const sorted = Object.entries(pkgChanges).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      suggestedScope = sorted[0][0];
    }
  }

  // Should split?
  let shouldSplit = false;
  let splitReason: string | null = null;

  // Check for unrelated type mixes
  const hasFeature = typeCounts["feat"] > 0;
  const hasFix = typeCounts["fix"] > 0;
  const hasStyle = typeCounts["style"] > 0;
  const hasLogicChange = hasFeature || hasFix || typeCounts["refactor"] > 0;

  if (hasFeature && hasFix) {
    shouldSplit = true;
    splitReason = "Mix of feature additions and bug fixes — these should be separate commits";
  } else if (hasStyle && hasLogicChange) {
    shouldSplit = true;
    splitReason = "Formatting changes mixed with logic changes — commit separately";
  } else if (files.length >= splitThreshold && uniqueTypes.length > 2) {
    shouldSplit = true;
    splitReason = `${files.length} files with ${uniqueTypes.length} different change types — consider splitting`;
  }

  const summary: DiffSummary = {
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
    packages,
    suggestedType,
    suggestedScope,
    isMonorepo,
    shouldSplit,
    splitReason,
  };

  return { files, summary };
}

// --- Main ---

async function main() {
  // Read from stdin
  const chunks: Buffer[] = [];
  const reader = Bun.stdin.stream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }

  const input = Buffer.concat(chunks).toString("utf-8");

  if (!input.trim()) {
    console.error("Error: No input provided. Pipe a git diff to stdin.");
    console.error("Usage: git diff --cached | bun run scripts/parse-diff.ts");
    process.exit(1);
  }

  try {
    const result = parseDiff(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error parsing diff: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

main();

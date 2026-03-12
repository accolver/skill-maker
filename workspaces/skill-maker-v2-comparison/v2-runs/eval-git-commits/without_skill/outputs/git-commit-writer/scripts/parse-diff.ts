#!/usr/bin/env bun
/**
 * parse-diff.ts — Parse staged git diff into structured JSON for commit message generation.
 *
 * Reads `git diff --cached` output and produces a JSON summary with:
 * - Files changed (added, modified, deleted, renamed)
 * - Detected monorepo package scope
 * - Change classification hints based on file paths and content patterns
 * - Line counts (additions, deletions) per file
 *
 * Usage:
 *   bun run scripts/parse-diff.ts [--help] [--diff-file <path>]
 *
 * Options:
 *   --help          Show this help message
 *   --diff-file     Read diff from a file instead of running git diff --cached
 *
 * Output (JSON to stdout):
 *   {
 *     "files": [...],
 *     "summary": { "total_additions": N, "total_deletions": N, "total_files": N },
 *     "monorepo": { "detected": bool, "tool": "pnpm"|"npm"|..., "packages": [...] },
 *     "suggested_type": "feat"|"fix"|...,
 *     "suggested_scope": "auth"|null
 *   }
 */

import { $ } from "bun";

// --- Types ---

interface FileChange {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  isBinary: boolean;
  classificationHints: string[];
}

interface MonorepoInfo {
  detected: boolean;
  tool: string | null;
  packages: string[];
  configFile: string | null;
}

interface DiffSummary {
  total_additions: number;
  total_deletions: number;
  total_files: number;
}

interface ParseResult {
  files: FileChange[];
  summary: DiffSummary;
  monorepo: MonorepoInfo;
  suggested_type: string | null;
  suggested_scope: string | null;
}

// --- Argument parsing ---

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`parse-diff.ts — Parse staged git diff into structured JSON

Usage:
  bun run scripts/parse-diff.ts [--help] [--diff-file <path>]

Options:
  --help          Show this help message
  --diff-file     Read diff from a file instead of running git diff --cached

Output: JSON to stdout with file changes, monorepo detection, and suggestions.`);
  process.exit(0);
}

const diffFileIdx = args.indexOf("--diff-file");
let diffInput: string;

if (diffFileIdx !== -1 && args[diffFileIdx + 1]) {
  const filePath = args[diffFileIdx + 1];
  try {
    diffInput = await Bun.file(filePath).text();
  } catch (e) {
    console.error(JSON.stringify({ error: `Failed to read diff file: ${filePath}` }));
    process.exit(1);
  }
} else {
  try {
    const result = await $`git diff --cached`.text();
    diffInput = result;
  } catch (e) {
    console.error(JSON.stringify({ error: "Failed to run git diff --cached. Are you in a git repository?" }));
    process.exit(1);
  }
}

if (!diffInput.trim()) {
  console.log(JSON.stringify({
    files: [],
    summary: { total_additions: 0, total_deletions: 0, total_files: 0 },
    monorepo: { detected: false, tool: null, packages: [], configFile: null },
    suggested_type: null,
    suggested_scope: null,
    message: "No staged changes found. Stage files with git add first."
  }, null, 2));
  process.exit(0);
}

// --- Diff parsing ---

function parseDiff(raw: string): FileChange[] {
  const files: FileChange[] = [];
  const diffBlocks = raw.split(/^diff --git /m).filter(Boolean);

  for (const block of diffBlocks) {
    const lines = block.split("\n");
    const headerLine = lines[0] || "";

    // Extract file paths from "a/path b/path"
    const pathMatch = headerLine.match(/^a\/(.+?) b\/(.+)$/);
    if (!pathMatch) continue;

    const oldPath = pathMatch[1];
    const newPath = pathMatch[2];

    const isBinary = block.includes("Binary files");
    const isRenamed = block.includes("rename from") || oldPath !== newPath;
    const isNew = block.includes("new file mode");
    const isDeleted = block.includes("deleted file mode");

    let additions = 0;
    let deletions = 0;

    if (!isBinary) {
      for (const line of lines) {
        if (line.startsWith("+") && !line.startsWith("+++")) additions++;
        if (line.startsWith("-") && !line.startsWith("---")) deletions++;
      }
    }

    let status: FileChange["status"];
    if (isNew) status = "added";
    else if (isDeleted) status = "deleted";
    else if (isRenamed) status = "renamed";
    else status = "modified";

    const hints = classifyFile(newPath, additions, deletions, block);

    files.push({
      path: newPath,
      ...(isRenamed && oldPath !== newPath ? { oldPath } : {}),
      status,
      additions,
      deletions,
      isBinary,
      classificationHints: hints,
    });
  }

  return files;
}

// --- File classification ---

function classifyFile(path: string, additions: number, deletions: number, content: string): string[] {
  const hints: string[] = [];
  const lower = path.toLowerCase();

  // Documentation
  if (/\.(md|mdx|txt|rst|adoc)$/i.test(path) || lower.includes("readme") || lower.includes("changelog") || lower.includes("license")) {
    hints.push("docs");
  }

  // Tests
  if (/\.(test|spec|e2e)\.[jt]sx?$/i.test(path) || lower.includes("__tests__") || lower.includes("test/") || lower.includes("tests/") || lower.includes("spec/")) {
    hints.push("test");
  }

  // CI/CD
  if (lower.includes(".github/workflows") || lower.includes("jenkinsfile") || lower.includes(".circleci") || lower.includes(".gitlab-ci") || lower.includes(".travis")) {
    hints.push("ci");
  }

  // Build system
  if (/^(package\.json|tsconfig.*\.json|webpack\.config|rollup\.config|vite\.config|dockerfile|makefile|cargo\.toml|go\.mod|build\.gradle)$/i.test(path.split("/").pop() || "")) {
    hints.push("build");
  }

  // Lock files
  if (/\.(lock|lockb)$/.test(path) || lower === "package-lock.json" || lower === "yarn.lock" || lower === "pnpm-lock.yaml") {
    hints.push("chore");
  }

  // Style/formatting
  if (/\.(css|scss|sass|less|styl)$/i.test(path)) {
    hints.push("style-file");
  }

  // Config files
  if (/^\.(eslintrc|prettierrc|editorconfig|gitignore|gitattributes|nvmrc|node-version|tool-versions)/i.test(path.split("/").pop() || "")) {
    hints.push("chore");
  }

  // Content-based hints
  if (content.includes("throw new") || content.includes("catch (") || content.includes("catch(")) {
    hints.push("error-handling");
  }

  if (content.includes("performance") || content.includes("optimize") || content.includes("cache") || content.includes("memoize")) {
    hints.push("perf-related");
  }

  return [...new Set(hints)];
}

// --- Monorepo detection ---

async function detectMonorepo(): Promise<MonorepoInfo> {
  const checks: { file: string; tool: string }[] = [
    { file: "pnpm-workspace.yaml", tool: "pnpm" },
    { file: "lerna.json", tool: "lerna" },
    { file: "nx.json", tool: "nx" },
    { file: "turbo.json", tool: "turborepo" },
  ];

  for (const check of checks) {
    try {
      const exists = await Bun.file(check.file).exists();
      if (exists) {
        const packages = await detectPackages(check.tool);
        return { detected: true, tool: check.tool, packages, configFile: check.file };
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  // Check package.json for workspaces field
  try {
    const pkgFile = Bun.file("package.json");
    if (await pkgFile.exists()) {
      const pkg = await pkgFile.json();
      if (pkg.workspaces) {
        const packages = await detectPackages("npm");
        return { detected: true, tool: "npm", packages, configFile: "package.json" };
      }
    }
  } catch {
    // Not a valid package.json or no workspaces
  }

  return { detected: false, tool: null, packages: [], configFile: null };
}

async function detectPackages(tool: string): Promise<string[]> {
  const packages: string[] = [];

  try {
    if (tool === "pnpm") {
      const content = await Bun.file("pnpm-workspace.yaml").text();
      const packagePatterns = content.match(/- ['"]?([^'"]+)['"]?/g);
      if (packagePatterns) {
        for (const pattern of packagePatterns) {
          const dir = pattern.replace(/^- ['"]?/, "").replace(/['"]?$/, "").replace("/*", "");
          packages.push(dir);
        }
      }
    } else if (tool === "npm") {
      const pkg = await Bun.file("package.json").json();
      if (Array.isArray(pkg.workspaces)) {
        for (const ws of pkg.workspaces) {
          packages.push(ws.replace("/*", ""));
        }
      } else if (pkg.workspaces?.packages) {
        for (const ws of pkg.workspaces.packages) {
          packages.push(ws.replace("/*", ""));
        }
      }
    }
  } catch {
    // Best effort
  }

  return packages;
}

// --- Scope suggestion ---

function suggestScope(files: FileChange[], monorepo: MonorepoInfo): string | null {
  if (files.length === 0) return null;

  // In monorepos, detect package from file paths
  if (monorepo.detected && monorepo.packages.length > 0) {
    const packageHits = new Map<string, number>();

    for (const file of files) {
      for (const pkgDir of monorepo.packages) {
        if (file.path.startsWith(pkgDir + "/")) {
          // Extract the package name (directory after the workspace root)
          const parts = file.path.replace(pkgDir + "/", "").split("/");
          const pkgName = parts[0];
          packageHits.set(pkgName, (packageHits.get(pkgName) || 0) + 1);
        }
      }
    }

    if (packageHits.size === 1) {
      return [...packageHits.keys()][0];
    }
    if (packageHits.size > 1 && packageHits.size <= 3) {
      return [...packageHits.keys()].join(",");
    }
  }

  // Standard repo: find common directory
  const dirs = files.map(f => {
    const parts = f.path.split("/");
    // Skip src/ as it's too generic
    if (parts[0] === "src" && parts.length > 1) return parts[1];
    return parts[0];
  });

  const uniqueDirs = [...new Set(dirs)];
  if (uniqueDirs.length === 1) return uniqueDirs[0];

  return null;
}

// --- Type suggestion ---

function suggestType(files: FileChange[]): string | null {
  if (files.length === 0) return null;

  const allHints = files.flatMap(f => f.classificationHints);
  const hintCounts = new Map<string, number>();
  for (const hint of allHints) {
    hintCounts.set(hint, (hintCounts.get(hint) || 0) + 1);
  }

  // If ALL files are docs → docs
  if (files.every(f => f.classificationHints.includes("docs"))) return "docs";

  // If ALL files are tests → test
  if (files.every(f => f.classificationHints.includes("test"))) return "test";

  // If ALL files are CI → ci
  if (files.every(f => f.classificationHints.includes("ci"))) return "ci";

  // If ALL files are chore (lock files, config) → chore
  if (files.every(f => f.classificationHints.includes("chore"))) return "chore";

  // If ALL files are build → build
  if (files.every(f => f.classificationHints.includes("build"))) return "build";

  // If there are new files with code → likely feat
  const newCodeFiles = files.filter(f =>
    f.status === "added" &&
    !f.classificationHints.includes("test") &&
    !f.classificationHints.includes("docs") &&
    !f.classificationHints.includes("chore")
  );
  if (newCodeFiles.length > 0) return "feat";

  // Default: can't determine from file paths alone
  return null;
}

// --- Main ---

const files = parseDiff(diffInput);
const monorepo = await detectMonorepo();
const suggestedScope = suggestScope(files, monorepo);
const suggestedType = suggestType(files);

const summary: DiffSummary = {
  total_additions: files.reduce((sum, f) => sum + f.additions, 0),
  total_deletions: files.reduce((sum, f) => sum + f.deletions, 0),
  total_files: files.length,
};

const result: ParseResult = {
  files,
  summary,
  monorepo,
  suggested_type: suggestedType,
  suggested_scope: suggestedScope,
};

console.log(JSON.stringify(result, null, 2));

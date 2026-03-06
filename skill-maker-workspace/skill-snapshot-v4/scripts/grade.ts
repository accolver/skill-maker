#!/usr/bin/env bun

/**
 * grade.ts — Grade assertions against eval outputs
 *
 * Part of the Agent Skills evaluation system. Reads outputs produced by an
 * eval run and checks each assertion from eval_metadata.json, producing a
 * grading.json with PASS/FAIL results and supporting evidence.
 *
 * Usage:
 *   bun run scripts/grade.ts <eval-run-dir>
 *   bun run scripts/grade.ts workspace/iteration-1/eval-0/with_skill/
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, dirname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EvalMetadata {
  eval_id: number;
  eval_name: string;
  prompt: string;
  assertions: string[];
}

interface AssertionResult {
  text: string;
  passed: boolean;
  evidence: string;
}

interface GradingSummary {
  passed: number;
  failed: number;
  total: number;
  pass_rate: number;
}

interface GradingOutput {
  assertion_results: AssertionResult[];
  summary: GradingSummary;
}

interface OutputFile {
  name: string;
  path: string;
  size: number;
  extension: string;
  content: string;
  /** null when content is not valid JSON */
  parsedJson: unknown | null;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
grade.ts — Grade assertions against eval outputs

USAGE
  bun run scripts/grade.ts <eval-run-dir>

ARGUMENTS
  eval-run-dir   Path to an eval run directory that contains an outputs/
                 sub-directory. The parent directory must contain
                 eval_metadata.json.

EXAMPLES
  bun run scripts/grade.ts workspace/iteration-1/eval-0/with_skill/
  bun run scripts/grade.ts ./workspace/iteration-1/eval-0/without_skill/

EXPECTED DIRECTORY LAYOUT
  workspace/iteration-1/eval-0/
  ├── eval_metadata.json          # assertions live here
  ├── with_skill/
  │   ├── outputs/                # files produced by the eval run
  │   │   ├── output.json
  │   │   └── report.md
  │   └── grading.json            # ← written by this script
  └── without_skill/
      ├── outputs/
      └── grading.json

OUTPUT
  Writes grading.json into <eval-run-dir> and prints it to stdout.
  Exit code 0 on success, 1 on any error.
`.trim();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(message: string, hint?: string): never {
  console.error(`\n  ✗ Error: ${message}`);
  if (hint) console.error(`    → ${hint}`);
  console.error();
  process.exit(1);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Read every file in a directory (non-recursive) and return structured info. */
function loadOutputFiles(outputsDir: string): OutputFile[] {
  const entries = readdirSync(outputsDir);
  const files: OutputFile[] = [];

  for (const entry of entries) {
    const fullPath = join(outputsDir, entry);
    const stat = statSync(fullPath);
    if (!stat.isFile()) continue;

    let content = "";
    try {
      content = readFileSync(fullPath, "utf-8");
    } catch {
      // binary or unreadable — leave content empty
    }

    let parsedJson: unknown | null = null;
    const ext = extname(entry).toLowerCase();
    if (ext === ".json" || content.trimStart().startsWith("{") || content.trimStart().startsWith("[")) {
      try {
        parsedJson = JSON.parse(content);
      } catch {
        parsedJson = null;
      }
    }

    files.push({
      name: entry,
      path: fullPath,
      size: stat.size,
      extension: ext,
      content,
      parsedJson,
    });
  }

  return files;
}

// ---------------------------------------------------------------------------
// Assertion grading engine
// ---------------------------------------------------------------------------

/**
 * Normalise an assertion string for pattern matching.
 * Lowercases and collapses whitespace.
 */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Try to extract a minimum count from assertions like
 * "at least 3 recommendations" or "contains 5 items".
 * Returns { count, noun } or null.
 */
function extractCountRequirement(text: string): { count: number; noun: string } | null {
  const n = norm(text);

  // "at least N <noun>"
  let m = n.match(/at least (\d+)\s+(.+)/);
  if (m) return { count: parseInt(m[1], 10), noun: m[2] };

  // "contains/includes N <noun>"
  m = n.match(/(?:contains?|includes?|has|have)\s+(\d+)\s+(.+)/);
  if (m) return { count: parseInt(m[1], 10), noun: m[2] };

  // "more than N <noun>"
  m = n.match(/more than (\d+)\s+(.+)/);
  if (m) return { count: parseInt(m[1], 10) + 1, noun: m[2] };

  return null;
}

/**
 * Detect whether the assertion is a negation ("no errors", "does not contain",
 * "should not include", "must not have", "without errors", etc.)
 */
function isNegationAssertion(text: string): { negated: true; subject: string } | null {
  const n = norm(text);

  // "no <subject>"
  let m = n.match(/^no\s+(.+)/);
  if (m) return { negated: true, subject: m[1] };

  // "does not / should not / must not contain/include/have <subject>"
  m = n.match(/(?:does|should|must|shall|will)\s+not\s+(?:contain|include|have|report|produce|generate|show|output)\s+(.+)/);
  if (m) return { negated: true, subject: m[1] };

  // "without <subject>"
  m = n.match(/without\s+(.+)/);
  if (m) return { negated: true, subject: m[1] };

  // "free of / free from <subject>"
  m = n.match(/free\s+(?:of|from)\s+(.+)/);
  if (m) return { negated: true, subject: m[1] };

  return null;
}

/**
 * Detect file-existence assertions like "includes a JSON file",
 * "produces a .csv file", "output contains a markdown file".
 * Returns the expected extension or null.
 */
function extractFileExistenceCheck(text: string): { extension: string; label: string } | null {
  const n = norm(text);

  const extMap: Record<string, string> = {
    json: ".json",
    csv: ".csv",
    markdown: ".md",
    md: ".md",
    yaml: ".yaml",
    yml: ".yml",
    xml: ".xml",
    html: ".html",
    txt: ".txt",
    text: ".txt",
    typescript: ".ts",
    ts: ".ts",
    javascript: ".js",
    js: ".js",
    python: ".py",
    py: ".py",
    toml: ".toml",
    sql: ".sql",
    css: ".css",
    svg: ".svg",
    png: ".png",
    jpg: ".jpg",
    jpeg: ".jpeg",
    gif: ".gif",
    pdf: ".pdf",
  };

  // "includes/contains/produces a <type> file"
  let m = n.match(/(?:include|contain|produce|generate|create|output|have|has|write|emit)s?\s+(?:a\s+)?(?:valid\s+)?(\w+)\s+file/);
  if (m) {
    const key = m[1];
    if (extMap[key]) return { extension: extMap[key], label: key.toUpperCase() };
    // Maybe the assertion says ".json file" directly
    if (key.startsWith(".") && Object.values(extMap).includes(key)) return { extension: key, label: key };
  }

  // "includes/contains a file with extension .json"
  m = n.match(/file\s+with\s+extension\s+(\.\w+)/);
  if (m) return { extension: m[1], label: m[1] };

  // "a .json file exists"
  m = n.match(/(\.\w+)\s+file/);
  if (m && Object.values(extMap).includes(m[1])) return { extension: m[1], label: m[1] };

  return null;
}

/**
 * Detect format-validity assertions like "valid JSON", "valid YAML",
 * "well-formed XML", "parseable JSON".
 */
function extractFormatValidation(text: string): { format: string } | null {
  const n = norm(text);

  const m = n.match(/(?:valid|well[- ]?formed|parseable|parsable|properly[- ]?formatted)\s+(json|yaml|yml|xml|html|csv|toml|markdown|md)/);
  if (m) return { format: m[1] };

  return null;
}

/**
 * Search all file contents for a term, returning matches with context.
 */
function searchContents(files: OutputFile[], term: string, maxMatches = 10): { file: string; line: number; snippet: string }[] {
  const results: { file: string; line: number; snippet: string }[] = [];
  const termLower = term.toLowerCase();

  for (const f of files) {
    const lines = f.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(termLower)) {
        const snippet = lines[i].trim().slice(0, 120);
        results.push({ file: f.name, line: i + 1, snippet });
        if (results.length >= maxMatches) return results;
      }
    }
  }

  return results;
}

/**
 * Count occurrences of a pattern across all files.
 */
function countOccurrences(files: OutputFile[], pattern: string): { total: number; details: { file: string; count: number }[] } {
  const patternLower = pattern.toLowerCase();
  const details: { file: string; count: number }[] = [];
  let total = 0;

  for (const f of files) {
    const contentLower = f.content.toLowerCase();
    let count = 0;
    let idx = 0;
    while ((idx = contentLower.indexOf(patternLower, idx)) !== -1) {
      count++;
      idx += patternLower.length;
    }
    if (count > 0) {
      details.push({ file: f.name, count });
      total += count;
    }
  }

  return { total, details };
}

/**
 * Grade a single assertion against the loaded output files.
 */
function gradeAssertion(assertion: string, files: OutputFile[]): AssertionResult {
  const n = norm(assertion);

  // -----------------------------------------------------------------------
  // 1. File-existence check
  // -----------------------------------------------------------------------
  const fileCheck = extractFileExistenceCheck(assertion);
  if (fileCheck) {
    const matching = files.filter((f) => f.extension === fileCheck.extension);
    if (matching.length > 0) {
      const names = matching.map((f) => `${f.name} (${formatBytes(f.size)})`).join(", ");

      // If the assertion also asks for validity, check that too
      const formatCheck = extractFormatValidation(assertion);
      if (formatCheck && formatCheck.format === "json") {
        const validJsonFiles = matching.filter((f) => f.parsedJson !== null);
        if (validJsonFiles.length > 0) {
          return {
            text: assertion,
            passed: true,
            evidence: `Found ${validJsonFiles.map((f) => `${f.name} (${formatBytes(f.size)})`).join(", ")}, parsed successfully as valid JSON`,
          };
        } else {
          return {
            text: assertion,
            passed: false,
            evidence: `Found ${fileCheck.extension} file(s) (${names}) but none parsed as valid JSON`,
          };
        }
      }

      return {
        text: assertion,
        passed: true,
        evidence: `Found ${fileCheck.extension} file(s): ${names}`,
      };
    }

    return {
      text: assertion,
      passed: false,
      evidence: `No ${fileCheck.extension} files found in outputs. Files present: ${files.map((f) => f.name).join(", ") || "(none)"}`,
    };
  }

  // -----------------------------------------------------------------------
  // 2. Format-validity check (standalone, not combined with file-existence)
  // -----------------------------------------------------------------------
  const formatCheck = extractFormatValidation(assertion);
  if (formatCheck) {
    const format = formatCheck.format;

    if (format === "json") {
      const jsonFiles = files.filter((f) => f.extension === ".json" || f.parsedJson !== null);
      const validJsonFiles = jsonFiles.filter((f) => f.parsedJson !== null);

      if (jsonFiles.length === 0) {
        // Check if any file content looks like JSON
        const jsonLike = files.filter((f) => {
          const trimmed = f.content.trim();
          return trimmed.startsWith("{") || trimmed.startsWith("[");
        });
        if (jsonLike.length > 0) {
          const valid = jsonLike.filter((f) => {
            try { JSON.parse(f.content); return true; } catch { return false; }
          });
          if (valid.length > 0) {
            return {
              text: assertion,
              passed: true,
              evidence: `Found valid JSON content in: ${valid.map((f) => f.name).join(", ")}`,
            };
          }
          return {
            text: assertion,
            passed: false,
            evidence: `Found JSON-like content in ${jsonLike.map((f) => f.name).join(", ")} but it failed to parse`,
          };
        }
        return {
          text: assertion,
          passed: false,
          evidence: `No JSON files or JSON-like content found in outputs`,
        };
      }

      if (validJsonFiles.length === jsonFiles.length) {
        return {
          text: assertion,
          passed: true,
          evidence: `All JSON files parsed successfully: ${validJsonFiles.map((f) => `${f.name} (${formatBytes(f.size)})`).join(", ")}`,
        };
      }

      const invalid = jsonFiles.filter((f) => f.parsedJson === null);
      return {
        text: assertion,
        passed: false,
        evidence: `Invalid JSON in: ${invalid.map((f) => f.name).join(", ")}`,
      };
    }

    // For other formats, do a best-effort check
    const extMap: Record<string, string> = {
      yaml: ".yaml", yml: ".yml", xml: ".xml",
      html: ".html", csv: ".csv", toml: ".toml",
      markdown: ".md", md: ".md",
    };
    const ext = extMap[format];
    if (ext) {
      const matching = files.filter((f) => f.extension === ext);
      if (matching.length > 0) {
        return {
          text: assertion,
          passed: true,
          evidence: `Found ${ext} file(s): ${matching.map((f) => `${f.name} (${formatBytes(f.size)})`).join(", ")}`,
        };
      }
      return {
        text: assertion,
        passed: false,
        evidence: `No ${ext} files found. Files present: ${files.map((f) => f.name).join(", ") || "(none)"}`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // 3. Negation assertions ("no errors", "does not contain X")
  // -----------------------------------------------------------------------
  const negation = isNegationAssertion(assertion);
  if (negation) {
    const subject = negation.subject.replace(/\s+(?:in\s+\w+|were|was|are|is).*$/, "").trim();
    const matches = searchContents(files, subject);

    if (matches.length === 0) {
      return {
        text: assertion,
        passed: true,
        evidence: `No occurrences of "${subject}" found across ${files.length} output file(s)`,
      };
    }

    const examples = matches.slice(0, 3).map((m) => `  ${m.file}:${m.line}: ${m.snippet}`).join("\n");
    return {
      text: assertion,
      passed: false,
      evidence: `Found ${matches.length} occurrence(s) of "${subject}":\n${examples}`,
    };
  }

  // -----------------------------------------------------------------------
  // 4. Count assertions ("at least 3 recommendations")
  // -----------------------------------------------------------------------
  const countReq = extractCountRequirement(assertion);
  if (countReq) {
    // Clean up the noun for searching (remove trailing punctuation, articles)
    const noun = countReq.noun.replace(/[.!?]+$/, "").replace(/\s+(?:in\s+.+)$/, "").trim();
    const nounSingular = noun.replace(/s$/, "");

    // Search for the noun across all files
    const { total, details } = countOccurrences(files, nounSingular);

    // Also try searching line-by-line for more structured counting
    const lineMatches = searchContents(files, nounSingular);

    const effectiveCount = Math.max(total, lineMatches.length);

    if (effectiveCount >= countReq.count) {
      const examples = lineMatches.slice(0, 3).map((m) => `'${m.snippet.slice(0, 80)}'`).join(", ");
      return {
        text: assertion,
        passed: true,
        evidence: `Found ${effectiveCount} occurrence(s) of "${nounSingular}" (required: ${countReq.count}). Examples: ${examples}`,
      };
    }

    const examples = lineMatches.slice(0, 3).map((m) => `'${m.snippet.slice(0, 80)}'`).join(", ");
    return {
      text: assertion,
      passed: false,
      evidence: `Found ${effectiveCount} occurrence(s) of "${nounSingular}" (required: ${countReq.count})${examples ? `. Found: ${examples}` : ""}`,
    };
  }

  // -----------------------------------------------------------------------
  // 5. Content assertions (generic "contains X", "includes X", "mentions X")
  // -----------------------------------------------------------------------
  {
    // Extract the subject of the content assertion
    const contentMatch = n.match(
      /(?:contains?|includes?|mentions?|references?|has|have|shows?|displays?|outputs?|provides?|lists?)\s+(.+)/
    );

    if (contentMatch) {
      const subject = contentMatch[1]
        .replace(/^(?:a|an|the|at least \d+)\s+/, "")
        .replace(/[.!?]+$/, "")
        .trim();

      const matches = searchContents(files, subject);

      if (matches.length > 0) {
        const examples = matches.slice(0, 3).map((m) => `  ${m.file}:${m.line}: ${m.snippet}`).join("\n");
        return {
          text: assertion,
          passed: true,
          evidence: `Found ${matches.length} match(es) for "${subject}":\n${examples}`,
        };
      }

      return {
        text: assertion,
        passed: false,
        evidence: `No matches for "${subject}" found across ${files.length} output file(s)`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // 6. Fallback: keyword search using significant words from the assertion
  // -----------------------------------------------------------------------
  {
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "shall",
      "should", "may", "might", "must", "can", "could", "of", "in", "to",
      "for", "with", "on", "at", "from", "by", "about", "as", "into",
      "through", "during", "before", "after", "above", "below", "between",
      "out", "off", "over", "under", "again", "further", "then", "once",
      "that", "this", "these", "those", "it", "its", "and", "but", "or",
      "nor", "not", "no", "so", "if", "each", "every", "all", "any",
      "both", "few", "more", "most", "other", "some", "such", "only",
      "own", "same", "than", "too", "very", "just", "also", "output",
      "response", "result", "file", "files",
    ]);

    const keywords = n
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    let bestKeyword = "";
    let bestMatches: { file: string; line: number; snippet: string }[] = [];

    for (const kw of keywords) {
      const matches = searchContents(files, kw);
      if (matches.length > bestMatches.length) {
        bestKeyword = kw;
        bestMatches = matches;
      }
    }

    if (bestMatches.length > 0) {
      const examples = bestMatches.slice(0, 3).map((m) => `  ${m.file}:${m.line}: ${m.snippet}`).join("\n");
      return {
        text: assertion,
        passed: true,
        evidence: `Found ${bestMatches.length} match(es) for keyword "${bestKeyword}" (heuristic match):\n${examples}`,
      };
    }

    // Nothing found at all
    const allContent = files.map((f) => f.content).join(" ");
    const contentPreview = allContent.trim().slice(0, 200);

    return {
      text: assertion,
      passed: false,
      evidence: `Could not verify assertion against ${files.length} output file(s). ` +
        (contentPreview
          ? `Content preview: "${contentPreview}..."`
          : "Output files are empty or contain no readable text."),
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = process.argv.slice(2);

  // --help
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // Validate arguments
  if (args.length === 0) {
    die(
      "Missing required argument: <eval-run-dir>",
      "Usage: bun run scripts/grade.ts <eval-run-dir>\n    Run with --help for more information."
    );
  }

  const evalRunDir = resolve(args[0]);

  // Validate eval-run-dir exists
  if (!existsSync(evalRunDir)) {
    die(
      `Directory not found: ${evalRunDir}`,
      "Make sure the eval run directory exists. Example:\n    bun run scripts/grade.ts workspace/iteration-1/eval-0/with_skill/"
    );
  }

  const stat = statSync(evalRunDir);
  if (!stat.isDirectory()) {
    die(
      `Not a directory: ${evalRunDir}`,
      "The argument must be a directory, not a file."
    );
  }

  // Validate outputs/ directory
  const outputsDir = join(evalRunDir, "outputs");
  if (!existsSync(outputsDir)) {
    die(
      `Missing outputs/ directory in ${evalRunDir}`,
      "The eval run directory must contain an outputs/ sub-directory with the files produced by the eval run."
    );
  }

  // Locate eval_metadata.json in parent directory
  const parentDir = dirname(evalRunDir);
  const metadataPath = join(parentDir, "eval_metadata.json");

  if (!existsSync(metadataPath)) {
    die(
      `Missing eval_metadata.json at ${metadataPath}`,
      `Expected eval_metadata.json in the parent eval directory: ${parentDir}\n` +
      "    The directory structure should be:\n" +
      "      eval-0/\n" +
      "        eval_metadata.json\n" +
      "        with_skill/\n" +
      "          outputs/"
    );
  }

  // Parse eval_metadata.json
  let metadata: EvalMetadata;
  try {
    const raw = readFileSync(metadataPath, "utf-8");
    metadata = JSON.parse(raw) as EvalMetadata;
  } catch (err) {
    die(
      `Failed to parse ${metadataPath}: ${err instanceof Error ? err.message : String(err)}`,
      "Ensure eval_metadata.json is valid JSON with the expected structure."
    );
  }

  // Validate metadata structure
  if (!metadata.assertions || !Array.isArray(metadata.assertions)) {
    die(
      `Invalid eval_metadata.json: missing or invalid "assertions" array`,
      'Expected format: { "assertions": ["assertion 1", "assertion 2", ...] }'
    );
  }

  if (metadata.assertions.length === 0) {
    // No assertions — write an empty grading result
    const grading: GradingOutput = {
      assertion_results: [],
      summary: { passed: 0, failed: 0, total: 0, pass_rate: 1.0 },
    };

    const outputPath = join(evalRunDir, "grading.json");
    const json = JSON.stringify(grading, null, 2);
    writeFileSync(outputPath, json + "\n", "utf-8");
    console.log(json);
    console.error(`\n  ⚠ No assertions to grade. Wrote empty grading.json to ${outputPath}\n`);
    process.exit(0);
  }

  // Load output files
  const files = loadOutputFiles(outputsDir);

  if (files.length === 0) {
    console.error(`  ⚠ Warning: outputs/ directory is empty — all assertions will likely fail.\n`);
  }

  // Grade each assertion
  const results: AssertionResult[] = metadata.assertions.map((assertion) =>
    gradeAssertion(assertion, files)
  );

  // Build summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  const grading: GradingOutput = {
    assertion_results: results,
    summary: {
      passed,
      failed,
      total,
      pass_rate: total > 0 ? Math.round((passed / total) * 1000) / 1000 : 0,
    },
  };

  // Write grading.json
  const outputPath = join(evalRunDir, "grading.json");
  const json = JSON.stringify(grading, null, 2);
  writeFileSync(outputPath, json + "\n", "utf-8");

  // Print to stdout
  console.log(json);

  // Print human-readable summary to stderr
  console.error(`\n  Grading complete: ${passed}/${total} passed (${(grading.summary.pass_rate * 100).toFixed(1)}%)`);
  console.error(`  Results written to ${outputPath}\n`);
}

main();

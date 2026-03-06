#!/usr/bin/env bun

/**
 * extract-text.ts — Extract text from PDF files
 *
 * Uses the `unpdf` library to extract text content from one or more PDF files.
 * Supports page selection, multiple output formats (plain text, JSON), and
 * per-page separation.
 *
 * Usage:
 *   bun run scripts/extract-text.ts document.pdf
 *   bun run scripts/extract-text.ts --pages 1,3,5-7 --format json report.pdf
 *   bun run scripts/extract-text.ts --per-page --output out.txt *.pdf
 */

import { extractText } from "unpdf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageResult {
  page: number;
  text: string;
}

interface JsonOutput {
  file: string;
  total_pages: number;
  extracted_pages: number[];
  pages: PageResult[];
  full_text: string;
}

interface ParsedArgs {
  help: boolean;
  files: string[];
  pages: number[] | null;
  output: string | null;
  format: "text" | "json";
  perPage: boolean;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
extract-text.ts — Extract text from PDF files

USAGE
  bun run scripts/extract-text.ts [options] <file> [file...]

ARGUMENTS
  file           One or more PDF file paths to extract text from.

OPTIONS
  --help         Show this help message and exit.
  --pages <spec> Extract specific pages. Supports comma-separated page numbers
                 and ranges. Pages are 1-indexed.
                 Examples: --pages 1,3,5-7  (extracts pages 1, 3, 5, 6, 7)
                           --pages 2-4      (extracts pages 2, 3, 4)
                           --pages 1        (extracts page 1 only)
  --output <f>   Write output to a file instead of stdout.
  --format <fmt> Output format: "text" (default) or "json" (structured with
                 page numbers and metadata).
  --per-page     Separate output by page with page headers (text format) or
                 individual page entries (json format).

EXAMPLES
  # Extract all text from a PDF to stdout
  bun run scripts/extract-text.ts document.pdf

  # Extract pages 1, 3, and 5-7 as JSON
  bun run scripts/extract-text.ts --pages 1,3,5-7 --format json report.pdf

  # Extract per-page text and write to a file
  bun run scripts/extract-text.ts --per-page --output out.txt slides.pdf

  # Process multiple PDFs
  bun run scripts/extract-text.ts chapter1.pdf chapter2.pdf chapter3.pdf

OUTPUT FORMATS
  text (default)
    Plain text output. With --per-page, pages are separated by headers:
      --- Page 1 ---
      <text>
      --- Page 2 ---
      <text>

  json
    Structured JSON output per file:
      {
        "file": "input.pdf",
        "total_pages": 5,
        "extracted_pages": [1, 2, 3, 4, 5],
        "pages": [
          { "page": 1, "text": "..." },
          { "page": 2, "text": "..." }
        ],
        "full_text": "all text concatenated"
      }
    When processing multiple files, outputs a JSON array.

EXIT CODES
  0  Success
  1  Error (missing files, invalid arguments, extraction failure)
`.trim();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/**
 * Parse a page specification string like "1,3,5-7" into a sorted, deduplicated
 * array of 1-indexed page numbers: [1, 3, 5, 6, 7].
 */
function parsePageSpec(spec: string): number[] {
  const pages = new Set<number>();

  const parts = spec.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-", 2);
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        die(`Invalid page range: "${part}"`, "Ranges must be numeric, e.g. 5-7");
      }
      if (start < 1 || end < 1) {
        die(`Invalid page range: "${part}"`, "Page numbers must be >= 1 (1-indexed)");
      }
      if (start > end) {
        die(`Invalid page range: "${part}"`, `Start (${start}) must be <= end (${end})`);
      }

      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page)) {
        die(`Invalid page number: "${part}"`, "Page numbers must be numeric");
      }
      if (page < 1) {
        die(`Invalid page number: "${part}"`, "Page numbers must be >= 1 (1-indexed)");
      }
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    files: [],
    pages: null,
    output: null,
    format: "text",
    perPage: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      return result;
    }

    if (arg === "--pages") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --pages", "Usage: --pages 1,3,5-7");
      }
      result.pages = parsePageSpec(argv[i]);
      i++;
      continue;
    }

    if (arg === "--output" || arg === "-o") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --output", "Usage: --output output.txt");
      }
      result.output = argv[i];
      i++;
      continue;
    }

    if (arg === "--format" || arg === "-f") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --format", 'Usage: --format text|json');
      }
      const fmt = argv[i].toLowerCase();
      if (fmt !== "text" && fmt !== "json") {
        die(`Unknown format: "${argv[i]}"`, 'Supported formats: text, json');
      }
      result.format = fmt;
      i++;
      continue;
    }

    if (arg === "--per-page") {
      result.perPage = true;
      i++;
      continue;
    }

    if (arg.startsWith("-")) {
      die(`Unknown option: "${arg}"`, "Run with --help for usage information");
    }

    // Positional argument — treat as a file path
    result.files.push(arg);
    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(message: string, hint?: string): never {
  console.error(`\n  \u2717 Error: ${message}`);
  if (hint) console.error(`    \u2192 ${hint}`);
  console.error();
  process.exit(1);
}

function log(message: string): void {
  console.error(message);
}

// ---------------------------------------------------------------------------
// PDF extraction
// ---------------------------------------------------------------------------

/**
 * Extract text from a single PDF file. Returns structured page-level results.
 *
 * @param filePath  Absolute or relative path to the PDF file.
 * @param pages     Optional array of 1-indexed page numbers to extract.
 *                  If null, all pages are extracted.
 */
async function extractFromPdf(
  filePath: string,
  pages: number[] | null,
): Promise<JsonOutput> {
  // Read the file into an ArrayBuffer
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    die(`File not found: ${filePath}`);
  }

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  log(`  Processing: ${filePath}`);

  // Extract all page texts in a single call. mergePages: false returns an
  // array of strings (one per page, 0-indexed) and a totalPages count.
  const { text: allPageTexts, totalPages } = await extractText(data, {
    mergePages: false,
  });

  const textArray: string[] = Array.isArray(allPageTexts)
    ? allPageTexts
    : [String(allPageTexts)];

  log(`  Total pages: ${totalPages}`);

  // Determine which pages to extract
  let targetPages: number[];
  if (pages !== null) {
    // Validate requested pages against actual page count
    const outOfRange = pages.filter((p) => p > totalPages);
    if (outOfRange.length > 0) {
      die(
        `Page(s) out of range: ${outOfRange.join(", ")}`,
        `Document has ${totalPages} page(s). Valid range: 1-${totalPages}`,
      );
    }
    targetPages = pages;
  } else {
    targetPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  log(`  Extracting pages: ${formatPageList(targetPages)}`);

  // Build results for the requested pages
  const pageResults: PageResult[] = [];

  for (const pageNum of targetPages) {
    const pageText = textArray[pageNum - 1] ?? "";
    pageResults.push({ page: pageNum, text: pageText.trim() });
  }

  // Build full concatenated text
  const fullText = pageResults.map((p) => p.text).join("\n\n");

  return {
    file: filePath,
    total_pages: totalPages,
    extracted_pages: targetPages,
    pages: pageResults,
    full_text: fullText,
  };
}

/**
 * Format a list of page numbers for display, collapsing consecutive runs
 * into ranges. E.g. [1, 2, 3, 5, 7, 8] -> "1-3, 5, 7-8"
 */
function formatPageList(pages: number[]): string {
  if (pages.length === 0) return "(none)";

  const ranges: string[] = [];
  let rangeStart = pages[0];
  let rangeEnd = pages[0];

  for (let i = 1; i < pages.length; i++) {
    if (pages[i] === rangeEnd + 1) {
      rangeEnd = pages[i];
    } else {
      ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
      rangeStart = pages[i];
      rangeEnd = pages[i];
    }
  }
  ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);

  return ranges.join(", ");
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatAsText(results: JsonOutput[], perPage: boolean): string {
  const parts: string[] = [];

  for (const result of results) {
    if (results.length > 1) {
      parts.push(`=== ${result.file} (${result.total_pages} pages) ===\n`);
    }

    if (perPage) {
      for (const page of result.pages) {
        parts.push(`--- Page ${page.page} ---`);
        parts.push(page.text);
        parts.push(""); // blank line between pages
      }
    } else {
      parts.push(result.full_text);
    }

    if (results.length > 1) {
      parts.push(""); // blank line between files
    }
  }

  return parts.join("\n").trimEnd() + "\n";
}

function formatAsJson(results: JsonOutput[]): string {
  if (results.length === 1) {
    return JSON.stringify(results[0], null, 2) + "\n";
  }
  return JSON.stringify(results, null, 2) + "\n";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // --help
  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  // Validate we have at least one file
  if (args.files.length === 0) {
    die(
      "No input files specified",
      "Usage: bun run scripts/extract-text.ts [options] <file> [file...]\n    Run with --help for more information.",
    );
  }

  log(`\n  extract-text.ts`);
  log(`  Files: ${args.files.length}`);
  log(`  Format: ${args.format}`);
  if (args.pages) log(`  Pages: ${formatPageList(args.pages)}`);
  if (args.perPage) log(`  Per-page: enabled`);
  if (args.output) log(`  Output: ${args.output}`);
  log("");

  // Process each file
  const results: JsonOutput[] = [];

  for (const filePath of args.files) {
    try {
      const result = await extractFromPdf(filePath, args.pages);
      results.push(result);
      log(`  Done: ${filePath} (${result.extracted_pages.length} pages extracted)\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // If the error was thrown by die(), it already exited. Otherwise, report
      // and continue to the next file if there are multiple, or exit if single.
      if (args.files.length === 1) {
        die(`Failed to extract text from ${filePath}: ${message}`);
      }
      log(`  \u2717 Failed: ${filePath}: ${message}\n`);
    }
  }

  if (results.length === 0) {
    die("No files were successfully processed");
  }

  // Format output
  let output: string;
  if (args.format === "json") {
    output = formatAsJson(results);
  } else {
    output = formatAsText(results, args.perPage);
  }

  // Write output
  if (args.output) {
    await Bun.write(args.output, output);
    log(`  Output written to: ${args.output}`);
  } else {
    process.stdout.write(output);
  }

  log(`\n  Extraction complete.`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  \u2717 Unexpected error: ${message}\n`);
  process.exit(1);
});

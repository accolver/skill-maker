#!/usr/bin/env bun

/**
 * extract-tables.ts — Extract table data from PDF files
 *
 * Uses `unpdf` to extract per-page text, then applies heuristics to detect
 * and reconstruct table structures from delimiter patterns (tabs, pipes,
 * multi-space separation).
 *
 * Usage:
 *   bun run scripts/extract-tables.ts <pdf-file>
 *   bun run scripts/extract-tables.ts report.pdf --pages 1,3 --format csv
 *   bun run scripts/extract-tables.ts data.pdf --output tables.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TableResult {
  page: number;
  table_index: number;
  headers: string[];
  rows: string[][];
  row_count: number;
  column_count: number;
}

interface ExtractionOutput {
  file: string;
  tables: TableResult[];
  table_count: number;
}

type OutputFormat = "json" | "csv" | "tsv";

type DelimiterKind = "tab" | "pipe" | "multispace";

interface DetectedRow {
  cells: string[];
  delimiter: DelimiterKind;
  line_number: number;
}

interface RawTable {
  rows: DetectedRow[];
  delimiter: DelimiterKind;
}

interface ParsedArgs {
  pdfPath: string;
  pages: number[] | null;
  output: string | null;
  format: OutputFormat;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
extract-tables — Extract table data from PDF files

USAGE
  bun run scripts/extract-tables.ts <pdf-file> [options]

ARGUMENTS
  <pdf-file>   Path to a PDF file to extract tables from.

OPTIONS
  --pages <list>     Comma-separated page numbers to extract from (1-indexed).
                     Example: --pages 1,3,5
                     Default: all pages.
  --output <file>    Write output to a file instead of stdout.
  --format <fmt>     Output format: json (default), csv, tsv.
  --help, -h         Show this help message.

OUTPUT FORMATS
  json   Structured JSON with table metadata, headers, and rows.
  csv    Comma-separated values (one table per section, separated by blank lines).
  tsv    Tab-separated values (one table per section, separated by blank lines).

EXAMPLES
  # Extract all tables as JSON to stdout
  bun run scripts/extract-tables.ts report.pdf

  # Extract tables from pages 1 and 3 as CSV
  bun run scripts/extract-tables.ts report.pdf --pages 1,3 --format csv

  # Write JSON output to a file
  bun run scripts/extract-tables.ts data.pdf --output tables.json

  # Pipe JSON output for further processing
  bun run scripts/extract-tables.ts invoice.pdf | jq '.tables[0].rows'

TABLE DETECTION
  The script detects tables by looking for lines with consistent delimiters:
    - Tab characters (\\t)
    - Pipe characters (|)
    - Multiple consecutive spaces (2+) between values

  Consecutive lines sharing the same delimiter pattern and similar column
  counts are grouped into tables. The first row of each group is treated
  as the header row.

EXIT CODES
  0   Success
  1   Error (missing file, invalid arguments, extraction failure)
`.trim();

// ---------------------------------------------------------------------------
// CLI Parsing
// ---------------------------------------------------------------------------

function die(message: string, hint?: string): never {
  console.error(`\n  \u2717 Error: ${message}`);
  if (hint) console.error(`    \u2192 ${hint}`);
  console.error();
  process.exit(1);
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let pdfPath = "";
  let pages: number[] | null = null;
  let output: string | null = null;
  let format: OutputFormat = "json";

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--pages") {
      i++;
      if (i >= argv.length) {
        die("--pages requires a value", "Example: --pages 1,3,5");
      }
      const raw = argv[i];
      const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
      const parsed: number[] = [];
      for (const part of parts) {
        const n = parseInt(part, 10);
        if (isNaN(n) || n < 1) {
          die(
            `Invalid page number: "${part}"`,
            "Page numbers must be positive integers (1-indexed).",
          );
        }
        parsed.push(n);
      }
      if (parsed.length === 0) {
        die("--pages value is empty", "Example: --pages 1,3,5");
      }
      pages = [...new Set(parsed)].sort((a, b) => a - b);
    } else if (arg === "--output") {
      i++;
      if (i >= argv.length) {
        die("--output requires a file path", "Example: --output tables.json");
      }
      output = argv[i];
    } else if (arg === "--format") {
      i++;
      if (i >= argv.length) {
        die("--format requires a value", "Options: json, csv, tsv");
      }
      const val = argv[i].toLowerCase();
      if (val !== "json" && val !== "csv" && val !== "tsv") {
        die(
          `Unknown format: "${argv[i]}"`,
          "Supported formats: json, csv, tsv",
        );
      }
      format = val as OutputFormat;
    } else if (arg.startsWith("--")) {
      die(`Unknown option: "${arg}"`, "Run with --help for usage.");
    } else {
      if (pdfPath) {
        die(
          `Unexpected argument: "${arg}"`,
          "Only one PDF file path is accepted.",
        );
      }
      pdfPath = arg;
    }

    i++;
  }

  if (!pdfPath) {
    die(
      "Missing required argument: <pdf-file>",
      "Usage: bun run scripts/extract-tables.ts <pdf-file>",
    );
  }

  return { pdfPath: resolve(pdfPath), pages, output, format };
}

// ---------------------------------------------------------------------------
// Delimiter Detection
// ---------------------------------------------------------------------------

/**
 * Attempt to split a line by tab characters.
 * Returns cells if the line contains at least one tab producing 2+ columns.
 */
function splitByTab(line: string): string[] | null {
  if (!line.includes("\t")) return null;
  const cells = line.split("\t").map((c) => c.trim());
  if (cells.length < 2) return null;
  return cells;
}

/**
 * Attempt to split a line by pipe delimiters.
 * Handles leading/trailing pipes (common in markdown tables).
 * Returns cells if the line contains at least one pipe producing 2+ columns.
 */
function splitByPipe(line: string): string[] | null {
  if (!line.includes("|")) return null;

  // Strip leading/trailing pipes and whitespace
  let stripped = line.trim();
  if (stripped.startsWith("|")) stripped = stripped.slice(1);
  if (stripped.endsWith("|")) stripped = stripped.slice(0, -1);

  const cells = stripped.split("|").map((c) => c.trim());
  if (cells.length < 2) return null;
  return cells;
}

/**
 * Attempt to split a line by multiple consecutive spaces (2+).
 * Returns cells if the line has 2+ segments separated by multi-space gaps.
 */
function splitByMultiSpace(line: string): string[] | null {
  // Must contain at least two consecutive spaces
  if (!/\s{2,}/.test(line)) return null;

  // Split on runs of 2+ whitespace characters
  const cells = line.trim().split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (cells.length < 2) return null;
  return cells;
}

/**
 * Detect the delimiter and split a single line into cells.
 * Returns null if the line doesn't look like a table row.
 *
 * Priority: tab > pipe > multi-space
 */
function detectAndSplit(line: string): { cells: string[]; delimiter: DelimiterKind } | null {
  // Skip blank lines
  if (line.trim().length === 0) return null;

  // Skip lines that are purely separator rows (e.g., "---+---+---" or "| --- | --- |")
  const stripped = line.trim();
  if (/^[-=+|:\s]+$/.test(stripped) && stripped.length > 1) return null;

  // Try each delimiter in priority order
  const tabCells = splitByTab(line);
  if (tabCells) return { cells: tabCells, delimiter: "tab" };

  const pipeCells = splitByPipe(line);
  if (pipeCells) return { cells: pipeCells, delimiter: "pipe" };

  const spaceCells = splitByMultiSpace(line);
  if (spaceCells) return { cells: spaceCells, delimiter: "multispace" };

  return null;
}

// ---------------------------------------------------------------------------
// Table Grouping
// ---------------------------------------------------------------------------

/**
 * Group consecutive table-like lines into raw table structures.
 *
 * Lines are grouped when they share the same delimiter kind and have
 * a compatible column count (within ±1 of the group's mode column count).
 * A non-table line or a delimiter mismatch breaks the current group.
 *
 * Groups with fewer than 2 rows (header + at least 1 data row) are discarded.
 * Groups where all rows have only 1 column are also discarded.
 */
function groupIntoTables(lines: string[]): RawTable[] {
  const tables: RawTable[] = [];
  let currentRows: DetectedRow[] = [];
  let currentDelimiter: DelimiterKind | null = null;

  function flushGroup(): void {
    if (currentRows.length >= 2) {
      tables.push({
        rows: [...currentRows],
        delimiter: currentDelimiter!,
      });
    }
    currentRows = [];
    currentDelimiter = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const result = detectAndSplit(lines[i]);

    if (!result) {
      // Non-table line — flush current group
      flushGroup();
      continue;
    }

    const { cells, delimiter } = result;

    if (currentDelimiter === null) {
      // Start a new group
      currentDelimiter = delimiter;
      currentRows.push({ cells, delimiter, line_number: i });
    } else if (delimiter === currentDelimiter) {
      // Same delimiter — check column count compatibility
      const modeColCount = getColumnCountMode(currentRows);
      const colDiff = Math.abs(cells.length - modeColCount);

      if (colDiff <= 1) {
        currentRows.push({ cells, delimiter, line_number: i });
      } else {
        // Column count too different — flush and start new group
        flushGroup();
        currentDelimiter = delimiter;
        currentRows.push({ cells, delimiter, line_number: i });
      }
    } else {
      // Different delimiter — flush and start new group
      flushGroup();
      currentDelimiter = delimiter;
      currentRows.push({ cells, delimiter, line_number: i });
    }
  }

  // Flush any remaining group
  flushGroup();

  return tables;
}

/**
 * Get the most common column count (mode) from a set of detected rows.
 */
function getColumnCountMode(rows: DetectedRow[]): number {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const c = row.cells.length;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  let modeCount = 0;
  let modeValue = 0;
  for (const [value, count] of counts) {
    if (count > modeCount) {
      modeCount = count;
      modeValue = value;
    }
  }

  return modeValue;
}

// ---------------------------------------------------------------------------
// Table Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw table into a consistent structure:
 * - Determine the canonical column count (mode across all rows)
 * - Pad short rows with empty strings, truncate long rows
 * - First row becomes headers
 * - Remaining rows become data
 */
function normalizeTable(
  raw: RawTable,
  page: number,
  tableIndex: number,
): TableResult {
  const colCount = getColumnCountMode(raw.rows);

  function padRow(cells: string[]): string[] {
    if (cells.length === colCount) return cells;
    if (cells.length < colCount) {
      return [...cells, ...Array(colCount - cells.length).fill("")];
    }
    // More columns than expected — truncate
    return cells.slice(0, colCount);
  }

  const normalizedRows = raw.rows.map((r) => padRow(r.cells));

  const headers = normalizedRows[0] ?? [];
  const dataRows = normalizedRows.slice(1);

  return {
    page,
    table_index: tableIndex,
    headers,
    rows: dataRows,
    row_count: dataRows.length,
    column_count: colCount,
  };
}

// ---------------------------------------------------------------------------
// Output Formatting
// ---------------------------------------------------------------------------

/**
 * Escape a value for CSV output. Wraps in quotes if the value contains
 * commas, quotes, or newlines.
 */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format tables as CSV text.
 * Each table is separated by a blank line, preceded by a comment header.
 */
function formatCsv(result: ExtractionOutput): string {
  const sections: string[] = [];

  for (const table of result.tables) {
    const lines: string[] = [];
    lines.push(table.headers.map(csvEscape).join(","));
    for (const row of table.rows) {
      lines.push(row.map(csvEscape).join(","));
    }
    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

/**
 * Format tables as TSV text.
 * Each table is separated by a blank line.
 */
function formatTsv(result: ExtractionOutput): string {
  const sections: string[] = [];

  for (const table of result.tables) {
    const lines: string[] = [];
    lines.push(table.headers.join("\t"));
    for (const row of table.rows) {
      lines.push(row.join("\t"));
    }
    sections.push(lines.join("\n"));
  }

  return sections.join("\n\n");
}

/**
 * Format the extraction result in the requested output format.
 */
function formatOutput(result: ExtractionOutput, format: OutputFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(result, null, 2);
    case "csv":
      return formatCsv(result);
    case "tsv":
      return formatTsv(result);
  }
}

// ---------------------------------------------------------------------------
// PDF Extraction
// ---------------------------------------------------------------------------

/**
 * Extract per-page text from a PDF file using unpdf.
 * Returns an array of { page, text } objects for the requested pages.
 */
async function extractPdfText(
  pdfPath: string,
  requestedPages: number[] | null,
): Promise<{ page: number; text: string }[]> {
  const buffer = readFileSync(pdfPath);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));

  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const textArray = text as string[];

  const results: { page: number; text: string }[] = [];

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;

    // Skip pages not in the requested set
    if (requestedPages && !requestedPages.includes(pageNum)) {
      continue;
    }

    if (requestedPages && pageNum > totalPages) {
      console.error(
        `  \u26a0 Warning: Page ${pageNum} requested but PDF only has ${totalPages} pages.`,
      );
      continue;
    }

    results.push({
      page: pageNum,
      text: textArray[i] ?? "",
    });
  }

  // Warn about out-of-range pages
  if (requestedPages) {
    for (const p of requestedPages) {
      if (p > totalPages) {
        console.error(
          `  \u26a0 Warning: Page ${p} requested but PDF only has ${totalPages} pages.`,
        );
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Core Pipeline
// ---------------------------------------------------------------------------

/**
 * Extract tables from a single page's text content.
 */
function extractTablesFromPageText(
  pageText: string,
  pageNum: number,
): TableResult[] {
  const lines = pageText.split("\n");
  const rawTables = groupIntoTables(lines);

  return rawTables.map((raw, idx) => normalizeTable(raw, pageNum, idx));
}

/**
 * Run the full extraction pipeline.
 */
async function extractTables(
  pdfPath: string,
  requestedPages: number[] | null,
): Promise<ExtractionOutput> {
  console.error(`  Extracting text from: ${pdfPath}`);

  const pageTexts = await extractPdfText(pdfPath, requestedPages);

  console.error(`  Processing ${pageTexts.length} page(s)...`);

  const allTables: TableResult[] = [];

  for (const { page, text } of pageTexts) {
    const tables = extractTablesFromPageText(text, page);
    if (tables.length > 0) {
      console.error(`  Page ${page}: found ${tables.length} table(s)`);
    }
    allTables.push(...tables);
  }

  // Re-index tables globally across all pages
  for (let i = 0; i < allTables.length; i++) {
    allTables[i].table_index = i;
  }

  console.error(
    `  Total: ${allTables.length} table(s) extracted from ${pageTexts.length} page(s)`,
  );

  return {
    file: basename(pdfPath),
    tables: allTables,
    table_count: allTables.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Validate the PDF file exists
  if (!existsSync(args.pdfPath)) {
    die(
      `File not found: ${args.pdfPath}`,
      "Provide a valid path to a PDF file.",
    );
  }

  const stat = statSync(args.pdfPath);
  if (!stat.isFile()) {
    die(
      `Not a file: ${args.pdfPath}`,
      "The argument must be a file, not a directory.",
    );
  }

  if (!args.pdfPath.toLowerCase().endsWith(".pdf")) {
    console.error(
      `  \u26a0 Warning: File does not have a .pdf extension: ${basename(args.pdfPath)}`,
    );
  }

  try {
    const result = await extractTables(args.pdfPath, args.pages);
    const output = formatOutput(result, args.format);

    if (args.output) {
      writeFileSync(args.output, output + "\n", "utf-8");
      console.error(`  Output written to: ${args.output}`);
    } else {
      console.log(output);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    die(`Failed to extract tables: ${message}`);
  }
}

main();

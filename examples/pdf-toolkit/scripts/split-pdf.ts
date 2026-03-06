#!/usr/bin/env bun

/**
 * split-pdf.ts — Split a PDF file into separate files
 *
 * Splits a source PDF into multiple output PDFs using one of three modes:
 *   - pages:  one output file per page
 *   - ranges: user-defined page ranges (semicolon-separated)
 *   - chunks: fixed-size page chunks
 *
 * Uses pdf-lib for zero-dependency PDF manipulation.
 *
 * Usage:
 *   bun run scripts/split-pdf.ts <input.pdf> [options]
 *   bun run scripts/split-pdf.ts report.pdf --mode chunks --chunk-size 5
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { PDFDocument } from "pdf-lib";

// ── Types ──────────────────────────────────────────────────────────────

interface OutputEntry {
  file: string;
  pages: number[];
  size_bytes: number;
}

interface SplitSummary {
  source: string;
  source_pages: number;
  mode: SplitMode;
  chunk_size?: number;
  ranges?: string[];
  outputs: OutputEntry[];
  output_count: number;
  output_dir: string;
}

type SplitMode = "pages" | "ranges" | "chunks";

interface ParsedArgs {
  inputPath: string;
  outputDir: string;
  mode: SplitMode;
  ranges: number[][];
  chunkSize: number;
  prefix: string;
}

// ── Help ───────────────────────────────────────────────────────────────

const HELP = `
split-pdf.ts — Split a PDF file into separate files

USAGE
  bun run scripts/split-pdf.ts <input.pdf> [options]

ARGUMENTS
  <input.pdf>    Path to the source PDF file to split

OPTIONS
  --output-dir <dir>    Directory for output files (default: current directory)
  --mode <mode>         Split mode: pages, ranges, or chunks (default: pages)
  --ranges <spec>       Semicolon-separated page ranges for "ranges" mode
                        (e.g., "1-3;4-6;7-10"). 1-indexed, inclusive.
  --chunk-size <n>      Pages per chunk for "chunks" mode (e.g., 5)
  --prefix <name>       Filename prefix for output files
                        (default: input filename without extension)
  --help, -h            Show this help message

MODES
  pages    One output PDF per page.
           Output: {prefix}-page-1.pdf, {prefix}-page-2.pdf, ...

  ranges   Split by user-defined page ranges.
           Requires --ranges. Each range becomes one output file.
           Output: {prefix}-pages-1-3.pdf, {prefix}-pages-4-6.pdf, ...

  chunks   Split into fixed-size chunks of N pages.
           Requires --chunk-size. The last chunk may be smaller.
           Output: {prefix}-chunk-1.pdf, {prefix}-chunk-2.pdf, ...

EXAMPLES
  # Split every page into its own file
  bun run scripts/split-pdf.ts report.pdf

  # Split into 5-page chunks, output to a specific directory
  bun run scripts/split-pdf.ts report.pdf --mode chunks --chunk-size 5 --output-dir ./split-output

  # Split by custom page ranges
  bun run scripts/split-pdf.ts report.pdf --mode ranges --ranges "1-3;4-6;7-10"

  # Custom prefix
  bun run scripts/split-pdf.ts report.pdf --prefix my-doc

OUTPUT
  JSON summary to stdout. Diagnostics and progress to stderr.
  Exit code 0 on success, 1 on error.
`.trim();

// ── Helpers ────────────────────────────────────────────────────────────

function die(message: string, hint?: string): never {
  console.error(`\n  Error: ${message}`);
  if (hint) console.error(`  Hint:  ${hint}`);
  console.error();
  process.exit(1);
}

function log(message: string): void {
  console.error(message);
}

// ── Argument Parsing ───────────────────────────────────────────────────

function parseRanges(spec: string, totalPages: number): number[][] {
  const ranges: number[][] = [];
  const parts = spec.split(";").map((s) => s.trim()).filter(Boolean);

  if (parts.length === 0) {
    die(
      "Empty --ranges specification",
      'Provide semicolon-separated ranges, e.g., "1-3;4-6;7-10"'
    );
  }

  for (const part of parts) {
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) {
      die(
        `Invalid range format: "${part}"`,
        'Each range must be "start-end" (e.g., "1-3"). Pages are 1-indexed.'
      );
    }

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    if (start < 1) {
      die(
        `Invalid range "${part}": start page must be >= 1`,
        "Pages are 1-indexed."
      );
    }

    if (end < start) {
      die(
        `Invalid range "${part}": end page (${end}) is less than start page (${start})`,
        "Ranges must be ascending, e.g., 1-3 not 3-1."
      );
    }

    if (end > totalPages) {
      die(
        `Invalid range "${part}": end page (${end}) exceeds total pages (${totalPages})`,
        `The source PDF has ${totalPages} page(s).`
      );
    }

    // Build array of 1-indexed page numbers
    const pages: number[] = [];
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    ranges.push(pages);
  }

  return ranges;
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  let inputPath = "";
  let outputDir = ".";
  let mode: SplitMode = "pages";
  let rangesSpec = "";
  let chunkSize = 0;
  let prefix = "";

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--output-dir") {
      i++;
      if (i >= argv.length) die("--output-dir requires a value");
      outputDir = argv[i];
    } else if (arg === "--mode") {
      i++;
      if (i >= argv.length) die("--mode requires a value");
      const val = argv[i];
      if (val !== "pages" && val !== "ranges" && val !== "chunks") {
        die(
          `Invalid mode: "${val}"`,
          'Must be one of: pages, ranges, chunks'
        );
      }
      mode = val;
    } else if (arg === "--ranges") {
      i++;
      if (i >= argv.length) die("--ranges requires a value");
      rangesSpec = argv[i];
    } else if (arg === "--chunk-size") {
      i++;
      if (i >= argv.length) die("--chunk-size requires a value");
      const val = parseInt(argv[i], 10);
      if (isNaN(val) || val < 1) {
        die(
          `Invalid chunk size: "${argv[i]}"`,
          "Must be a positive integer."
        );
      }
      chunkSize = val;
    } else if (arg === "--prefix") {
      i++;
      if (i >= argv.length) die("--prefix requires a value");
      prefix = argv[i];
    } else if (arg.startsWith("--")) {
      die(`Unknown option: "${arg}"`, "Run with --help for usage.");
    } else {
      if (inputPath) {
        die(
          `Unexpected positional argument: "${arg}"`,
          "Only one input PDF path is accepted."
        );
      }
      inputPath = arg;
    }

    i++;
  }

  if (!inputPath) {
    die(
      "Missing required argument: <input.pdf>",
      "Usage: bun run scripts/split-pdf.ts <input.pdf> [options]"
    );
  }

  // Validate mode-specific requirements
  if (mode === "ranges" && !rangesSpec) {
    die(
      '--ranges is required when --mode is "ranges"',
      'Example: --ranges "1-3;4-6;7-10"'
    );
  }

  if (mode === "chunks" && chunkSize < 1) {
    die(
      '--chunk-size is required when --mode is "chunks"',
      "Example: --chunk-size 5"
    );
  }

  // Warn about unused flags
  if (mode !== "ranges" && rangesSpec) {
    log(`  Warning: --ranges is ignored in "${mode}" mode`);
  }

  if (mode !== "chunks" && chunkSize > 0) {
    log(`  Warning: --chunk-size is ignored in "${mode}" mode`);
  }

  // Derive prefix from input filename if not specified
  if (!prefix) {
    const base = basename(inputPath);
    const ext = extname(base);
    prefix = ext ? base.slice(0, -ext.length) : base;
  }

  return {
    inputPath: resolve(inputPath),
    outputDir: resolve(outputDir),
    mode,
    ranges: [], // populated later after we know total pages
    chunkSize,
    prefix,
  };
}

// ── Page Group Builders ────────────────────────────────────────────────

/** Build page groups for "pages" mode: one group per page. */
function buildPageGroups(totalPages: number): number[][] {
  const groups: number[][] = [];
  for (let p = 1; p <= totalPages; p++) {
    groups.push([p]);
  }
  return groups;
}

/** Build page groups for "chunks" mode: fixed-size chunks. */
function buildChunkGroups(totalPages: number, chunkSize: number): number[][] {
  const groups: number[][] = [];
  for (let start = 1; start <= totalPages; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, totalPages);
    const chunk: number[] = [];
    for (let p = start; p <= end; p++) {
      chunk.push(p);
    }
    groups.push(chunk);
  }
  return groups;
}

/** Generate the output filename for a page group. */
function buildOutputFilename(
  prefix: string,
  mode: SplitMode,
  groupIndex: number,
  pages: number[]
): string {
  switch (mode) {
    case "pages":
      return `${prefix}-page-${pages[0]}.pdf`;
    case "ranges":
      return `${prefix}-pages-${pages[0]}-${pages[pages.length - 1]}.pdf`;
    case "chunks":
      return `${prefix}-chunk-${groupIndex + 1}.pdf`;
  }
}

// ── Core Split Logic ───────────────────────────────────────────────────

async function splitPdf(
  sourceBytes: Uint8Array,
  pageGroups: number[][],
  outputDir: string,
  prefix: string,
  mode: SplitMode
): Promise<OutputEntry[]> {
  const outputs: OutputEntry[] = [];

  for (let gi = 0; gi < pageGroups.length; gi++) {
    const pages = pageGroups[gi];
    const filename = buildOutputFilename(prefix, mode, gi, pages);
    const outputPath = join(outputDir, filename);

    // Convert 1-indexed pages to 0-indexed for pdf-lib
    const pageIndices = pages.map((p) => p - 1);

    // Load source fresh for each split to avoid mutation issues
    const sourceDoc = await PDFDocument.load(sourceBytes);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(sourceDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const outputBytes = await newDoc.save();
    writeFileSync(outputPath, outputBytes);

    outputs.push({
      file: filename,
      pages,
      size_bytes: outputBytes.length,
    });

    log(`  Created ${filename} (${pages.length} page(s), ${outputBytes.length} bytes)`);
  }

  return outputs;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Validate input file
  if (!existsSync(args.inputPath)) {
    die(
      `Input file not found: ${args.inputPath}`,
      "Check the file path and try again."
    );
  }

  const inputStat = statSync(args.inputPath);
  if (!inputStat.isFile()) {
    die(
      `Not a file: ${args.inputPath}`,
      "The input must be a PDF file, not a directory."
    );
  }

  // Read source PDF
  let sourceBytes: Uint8Array;
  try {
    const buffer = readFileSync(args.inputPath);
    sourceBytes = new Uint8Array(buffer);
  } catch (err) {
    die(
      `Failed to read input file: ${(err as Error).message}`,
      "Check file permissions and try again."
    );
  }

  // Load PDF to get page count
  let totalPages: number;
  try {
    const sourceDoc = await PDFDocument.load(sourceBytes);
    totalPages = sourceDoc.getPageCount();
  } catch (err) {
    die(
      `Failed to parse PDF: ${(err as Error).message}`,
      "Ensure the file is a valid PDF document."
    );
  }

  if (totalPages === 0) {
    die("Source PDF has no pages", "The PDF file appears to be empty.");
  }

  log(`  Source: ${basename(args.inputPath)} (${totalPages} page(s), ${sourceBytes.length} bytes)`);

  // Build page groups based on mode
  let pageGroups: number[][];

  switch (args.mode) {
    case "pages":
      pageGroups = buildPageGroups(totalPages);
      break;

    case "ranges":
      // Re-parse ranges now that we know total pages (for validation)
      // The rangesSpec was already validated syntactically in parseArgs;
      // we need to recover it from argv since parseArgs doesn't store it.
      {
        const rangesIdx = process.argv.indexOf("--ranges");
        const rangesSpec = rangesIdx !== -1 ? process.argv[rangesIdx + 1] : "";
        pageGroups = parseRanges(rangesSpec, totalPages);
      }
      break;

    case "chunks":
      if (args.chunkSize < 1) {
        die("--chunk-size must be at least 1");
      }
      pageGroups = buildChunkGroups(totalPages, args.chunkSize);
      break;
  }

  log(`  Mode: ${args.mode} -> ${pageGroups.length} output file(s)`);

  // Ensure output directory exists
  if (!existsSync(args.outputDir)) {
    try {
      mkdirSync(args.outputDir, { recursive: true });
      log(`  Created output directory: ${args.outputDir}`);
    } catch (err) {
      die(
        `Failed to create output directory: ${(err as Error).message}`,
        `Tried to create: ${args.outputDir}`
      );
    }
  }

  // Perform the split
  const outputs = await splitPdf(
    sourceBytes,
    pageGroups,
    args.outputDir,
    args.prefix,
    args.mode
  );

  // Build JSON summary
  const summary: SplitSummary = {
    source: basename(args.inputPath),
    source_pages: totalPages,
    mode: args.mode,
    outputs,
    output_count: outputs.length,
    output_dir: args.outputDir,
  };

  // Add mode-specific fields
  if (args.mode === "chunks") {
    summary.chunk_size = args.chunkSize;
  }

  if (args.mode === "ranges") {
    summary.ranges = pageGroups.map(
      (group) => `${group[0]}-${group[group.length - 1]}`
    );
  }

  // Output JSON summary to stdout
  console.log(JSON.stringify(summary, null, 2));

  log(`\n  Split complete: ${outputs.length} file(s) written to ${args.outputDir}`);
}

main().catch((err) => {
  console.error(`\n  Fatal error: ${(err as Error).message}`);
  process.exit(1);
});

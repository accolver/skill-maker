#!/usr/bin/env bun

/**
 * merge-pdf.ts — Merge multiple PDF files into a single PDF
 *
 * Uses pdf-lib to copy pages from multiple input PDFs into a single output
 * document, with optional per-input page range selection and metadata
 * bookmarking.
 *
 * Usage:
 *   bun run scripts/merge-pdf.ts --output merged.pdf a.pdf b.pdf c.pdf
 *   bun run scripts/merge-pdf.ts --output out.pdf --page-ranges "1-3;all;2-5" a.pdf b.pdf c.pdf
 *   bun run scripts/merge-pdf.ts --output out.pdf --bookmark a.pdf b.pdf
 */

import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { PDFDocument } from "pdf-lib";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InputSummary {
  file: string;
  pages_included: number;
  total_pages: number;
}

interface MergeSummary {
  output: string;
  inputs: InputSummary[];
  total_pages: number;
  size_bytes: number;
}

interface ParsedArgs {
  outputPath: string;
  inputPaths: string[];
  pageRanges: string[];
  bookmark: boolean;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
merge-pdf.ts — Merge multiple PDF files into a single PDF

USAGE
  bun run scripts/merge-pdf.ts --output <output.pdf> [OPTIONS] <input1.pdf> <input2.pdf> ...

ARGUMENTS
  <input.pdf>   Two or more PDF file paths to merge (in order).

OPTIONS
  --output, -o <path>       (Required) Output PDF file path.
  --page-ranges <ranges>    Semicolon-separated page selections, one per input.
                            Each entry can be:
                              all       — include all pages (default)
                              N         — single page (1-indexed)
                              N-M       — page range (inclusive, 1-indexed)
                            Multiple selections within an entry are comma-separated.
                            Example: "1-3,5;all;2-5"
  --bookmark                Add source filenames to document metadata keywords.
  --help, -h                Show this help message.

EXAMPLES
  # Merge two PDFs entirely
  bun run scripts/merge-pdf.ts --output merged.pdf report.pdf appendix.pdf

  # Merge with page selections: pages 1-3 from first, all from second, pages 2-5 from third
  bun run scripts/merge-pdf.ts --output out.pdf --page-ranges "1-3;all;2-5" a.pdf b.pdf c.pdf

  # Merge with bookmarking metadata
  bun run scripts/merge-pdf.ts --output combined.pdf --bookmark ch1.pdf ch2.pdf ch3.pdf

  # Cherry-pick specific pages
  bun run scripts/merge-pdf.ts --output extract.pdf --page-ranges "1,3,5;2-4" doc1.pdf doc2.pdf

OUTPUT
  JSON summary to stdout. Diagnostics and progress to stderr.
  Exit code 0 on success, 1 on error.
`.trim();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(message: string, hint?: string): never {
  const error: Record<string, string> = { error: message };
  if (hint) error.hint = hint;
  console.error(`\n  \u2717 Error: ${message}`);
  if (hint) console.error(`    \u2192 ${hint}`);
  console.error();
  process.exit(1);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): ParsedArgs {
  let outputPath = "";
  let pageRangesRaw = "";
  let bookmark = false;
  const inputPaths: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      console.log(HELP);
      process.exit(0);
    }

    if (arg === "--output" || arg === "-o") {
      i++;
      if (i >= argv.length) {
        die("--output requires a value", "Usage: --output <path>");
      }
      outputPath = argv[i];
      i++;
      continue;
    }

    // Handle --output=value form
    if (arg.startsWith("--output=")) {
      outputPath = arg.slice("--output=".length);
      if (!outputPath) {
        die("--output requires a non-empty value", "Usage: --output <path>");
      }
      i++;
      continue;
    }

    if (arg === "--page-ranges") {
      i++;
      if (i >= argv.length) {
        die("--page-ranges requires a value", 'Usage: --page-ranges "1-3;all;2-5"');
      }
      pageRangesRaw = argv[i];
      i++;
      continue;
    }

    if (arg.startsWith("--page-ranges=")) {
      pageRangesRaw = arg.slice("--page-ranges=".length);
      i++;
      continue;
    }

    if (arg === "--bookmark") {
      bookmark = true;
      i++;
      continue;
    }

    if (arg.startsWith("-") && arg !== "-") {
      die(`Unknown option: ${arg}`, "Run with --help for usage information.");
    }

    // Positional argument — treat as input PDF path
    inputPaths.push(arg);
    i++;
  }

  // Validate required arguments
  if (!outputPath) {
    die(
      "Missing required --output flag",
      "Usage: bun run scripts/merge-pdf.ts --output <output.pdf> <input1.pdf> <input2.pdf> ...",
    );
  }

  if (inputPaths.length < 2) {
    die(
      `Expected at least 2 input PDF files, got ${inputPaths.length}`,
      "Provide two or more PDF file paths as positional arguments.",
    );
  }

  // Parse page ranges
  let pageRanges: string[];
  if (pageRangesRaw) {
    pageRanges = pageRangesRaw.split(";").map((s) => s.trim());
    if (pageRanges.length !== inputPaths.length) {
      die(
        `Page ranges count (${pageRanges.length}) does not match input file count (${inputPaths.length})`,
        "Provide exactly one semicolon-separated range entry per input file, or omit --page-ranges for all pages.",
      );
    }
  } else {
    pageRanges = inputPaths.map(() => "all");
  }

  return { outputPath, inputPaths, pageRanges, bookmark };
}

// ---------------------------------------------------------------------------
// Page range parsing
// ---------------------------------------------------------------------------

/**
 * Parse a single page range entry (e.g., "1-3,5,7-9" or "all") into
 * 0-indexed page indices, validated against the total page count.
 *
 * @param rangeStr  The user-provided range string (1-indexed)
 * @param totalPages  Total number of pages in the source PDF
 * @param fileName  Source filename (for error messages)
 * @returns Array of 0-indexed page indices
 */
function parsePageRange(rangeStr: string, totalPages: number, fileName: string): number[] {
  const trimmed = rangeStr.trim().toLowerCase();

  if (trimmed === "all" || trimmed === "") {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const indices: number[] = [];
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    // Range: N-M
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);

      if (start < 1) {
        die(
          `Invalid page range "${part}" for ${fileName}: page numbers start at 1`,
          `Valid range: 1-${totalPages}`,
        );
      }
      if (end > totalPages) {
        die(
          `Page range "${part}" exceeds page count for ${fileName} (${totalPages} pages)`,
          `Valid range: 1-${totalPages}`,
        );
      }
      if (start > end) {
        die(
          `Invalid page range "${part}" for ${fileName}: start (${start}) is greater than end (${end})`,
          "Use ascending ranges like 1-5, not 5-1.",
        );
      }

      for (let p = start; p <= end; p++) {
        indices.push(p - 1); // Convert to 0-indexed
      }
      continue;
    }

    // Single page: N
    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      const page = parseInt(singleMatch[1], 10);

      if (page < 1) {
        die(
          `Invalid page number "${part}" for ${fileName}: page numbers start at 1`,
          `Valid range: 1-${totalPages}`,
        );
      }
      if (page > totalPages) {
        die(
          `Page ${page} exceeds page count for ${fileName} (${totalPages} pages)`,
          `Valid range: 1-${totalPages}`,
        );
      }

      indices.push(page - 1); // Convert to 0-indexed
      continue;
    }

    // Unrecognised token
    die(
      `Invalid page range token "${part}" for ${fileName}`,
      'Expected "all", a page number (e.g., "3"), or a range (e.g., "1-5").',
    );
  }

  if (indices.length === 0) {
    die(
      `Page range "${rangeStr}" for ${fileName} resolved to zero pages`,
      'Use "all" to include all pages.',
    );
  }

  return indices;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Fast-path: no args or help
  if (args.length === 0) {
    die(
      "No arguments provided",
      "Usage: bun run scripts/merge-pdf.ts --output <output.pdf> <input1.pdf> <input2.pdf> ...\n    Run with --help for more information.",
    );
  }

  const { outputPath, inputPaths, pageRanges, bookmark } = parseArgs(args);

  // Resolve and validate all input paths
  const resolvedInputs = inputPaths.map((p) => resolve(p));
  for (const inputPath of resolvedInputs) {
    if (!existsSync(inputPath)) {
      die(`Input file not found: ${inputPath}`);
    }
    const stat = statSync(inputPath);
    if (!stat.isFile()) {
      die(`Input path is not a file: ${inputPath}`);
    }
    if (stat.size === 0) {
      die(`Input file is empty: ${inputPath}`);
    }
  }

  const resolvedOutput = resolve(outputPath);

  console.error(`  Merging ${resolvedInputs.length} PDF files...`);

  // Create the merged document
  const merged = await PDFDocument.create();
  const inputSummaries: InputSummary[] = [];
  const sourceNames: string[] = [];

  for (let i = 0; i < resolvedInputs.length; i++) {
    const inputPath = resolvedInputs[i];
    const fileName = basename(inputPath);
    const rangeStr = pageRanges[i];

    console.error(`  [${i + 1}/${resolvedInputs.length}] Loading ${fileName}...`);

    let inputDoc: Awaited<ReturnType<typeof PDFDocument.load>>;
    try {
      const inputBytes = await Bun.file(inputPath).arrayBuffer();
      inputDoc = await PDFDocument.load(inputBytes, {
        ignoreEncryption: true,
      });
    } catch (err) {
      die(
        `Failed to load PDF: ${fileName}`,
        err instanceof Error ? err.message : String(err),
      );
    }

    const totalPages = inputDoc.getPageCount();
    if (totalPages === 0) {
      die(`PDF has no pages: ${fileName}`);
    }

    // Parse page range for this input
    const pageIndices = parsePageRange(rangeStr, totalPages, fileName);

    console.error(
      `    Pages: ${rangeStr === "all" ? `all (${totalPages})` : `${pageIndices.length} of ${totalPages}`}`,
    );

    // Copy selected pages into the merged document
    let copiedPages: Awaited<ReturnType<typeof merged.copyPages>>;
    try {
      copiedPages = await merged.copyPages(inputDoc, pageIndices);
    } catch (err) {
      die(
        `Failed to copy pages from ${fileName}`,
        err instanceof Error ? err.message : String(err),
      );
    }

    for (const page of copiedPages) {
      merged.addPage(page);
    }

    inputSummaries.push({
      file: fileName,
      pages_included: pageIndices.length,
      total_pages: totalPages,
    });

    sourceNames.push(fileName);
  }

  // Add bookmark metadata if requested
  if (bookmark) {
    merged.setKeywords(sourceNames);
    merged.setSubject(`Merged from: ${sourceNames.join(", ")}`);
    console.error(`  Bookmark metadata added for ${sourceNames.length} source(s).`);
  }

  // Set basic metadata
  merged.setProducer("merge-pdf.ts (pdf-lib)");
  merged.setCreationDate(new Date());

  // Save the merged PDF
  console.error(`  Writing output to ${resolvedOutput}...`);

  let mergedBytes: Uint8Array;
  try {
    mergedBytes = await merged.save();
  } catch (err) {
    die(
      "Failed to save merged PDF",
      err instanceof Error ? err.message : String(err),
    );
  }

  try {
    await Bun.write(resolvedOutput, mergedBytes);
  } catch (err) {
    die(
      `Failed to write output file: ${resolvedOutput}`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // Build and emit JSON summary
  const totalPages = inputSummaries.reduce((sum, s) => sum + s.pages_included, 0);
  const sizeBytes = mergedBytes.length;

  const summary: MergeSummary = {
    output: outputPath,
    inputs: inputSummaries,
    total_pages: totalPages,
    size_bytes: sizeBytes,
  };

  console.log(JSON.stringify(summary, null, 2));

  console.error(`\n  \u2713 Merged ${totalPages} pages from ${inputSummaries.length} files into ${outputPath} (${formatBytes(sizeBytes)})\n`);
}

main().catch((err) => {
  console.error(`\n  \u2717 Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

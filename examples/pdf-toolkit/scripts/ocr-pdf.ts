#!/usr/bin/env bun

/**
 * ocr-pdf.ts — OCR scanned PDF files using tesseract.js and mupdf
 *
 * Renders PDF pages to images using mupdf, then runs tesseract.js OCR on each
 * image to extract text. Supports page selection, configurable DPI, language
 * selection, confidence filtering, and structured JSON output.
 *
 * Usage:
 *   bun run scripts/ocr-pdf.ts scanned-doc.pdf
 *   bun run scripts/ocr-pdf.ts --pages 1,3,5-7 --format json report.pdf
 *   bun run scripts/ocr-pdf.ts --lang deu --dpi 600 --output out.txt scan.pdf
 */

import * as mupdf from "mupdf";
import Tesseract from "tesseract.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LowConfidenceWord {
  text: string;
  confidence: number;
}

interface OcrPageResult {
  page: number;
  text: string;
  confidence: number;
  word_count: number;
  low_confidence_words: LowConfidenceWord[];
}

interface JsonOutput {
  file: string;
  total_pages: number;
  ocr_pages: number[];
  language: string;
  dpi: number;
  pages: OcrPageResult[];
  full_text: string;
  average_confidence: number;
}

interface ParsedArgs {
  help: boolean;
  file: string | null;
  pages: number[] | null;
  output: string | null;
  format: "text" | "json";
  lang: string;
  dpi: number;
  confidenceThreshold: number;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
ocr-pdf.ts — OCR scanned PDF files using tesseract.js and mupdf

USAGE
  bun run scripts/ocr-pdf.ts [options] <file>

ARGUMENTS
  file                       Path to a scanned PDF file to OCR.

OPTIONS
  --help                     Show this help message and exit.
  --pages <spec>             OCR specific pages only. Supports comma-separated
                             page numbers and ranges (1-indexed).
                             Examples: --pages 1,3,5-7  (pages 1, 3, 5, 6, 7)
                                       --pages 2-4      (pages 2, 3, 4)
                                       --pages 1        (page 1 only)
  --output <file>            Write output to a file instead of stdout.
  --format <fmt>             Output format: "text" (default) or "json"
                             (structured with confidence scores).
  --lang <code>              OCR language (default: eng). Common values:
                             eng, fra, deu, spa, jpn, chi_sim.
                             See tesseract.js docs for full list.
  --dpi <number>             Rendering DPI for page images (default: 300).
                             Higher values improve OCR accuracy but are slower.
                             Recommended: 150 (fast), 300 (balanced), 600 (best).
  --confidence-threshold <n> Minimum confidence (0-100) for a word to be
                             included in output (default: 30). Words below this
                             threshold are excluded from text but reported in
                             JSON output under low_confidence_words.

EXAMPLES
  # OCR all pages of a scanned PDF to stdout
  bun run scripts/ocr-pdf.ts scanned-doc.pdf

  # OCR pages 1-3 with JSON output
  bun run scripts/ocr-pdf.ts --pages 1-3 --format json report.pdf

  # OCR a German document at high resolution
  bun run scripts/ocr-pdf.ts --lang deu --dpi 600 german-scan.pdf

  # OCR with strict confidence filtering, save to file
  bun run scripts/ocr-pdf.ts --confidence-threshold 70 --output clean.txt scan.pdf

  # OCR specific pages as JSON to a file
  bun run scripts/ocr-pdf.ts --pages 1,5,10-12 --format json --output result.json doc.pdf

OUTPUT FORMATS
  text (default)
    Plain text output with all recognized text concatenated. Pages are
    separated by blank lines.

  json
    Structured JSON output with per-page confidence scores:
      {
        "file": "scanned-doc.pdf",
        "total_pages": 5,
        "ocr_pages": [1, 2, 3],
        "language": "eng",
        "dpi": 300,
        "pages": [
          {
            "page": 1,
            "text": "Extracted text from page 1...",
            "confidence": 94.2,
            "word_count": 156,
            "low_confidence_words": [
              { "text": "ambiguous", "confidence": 42.1 }
            ]
          }
        ],
        "full_text": "All pages concatenated...",
        "average_confidence": 92.8
      }

EXIT CODES
  0  Success
  1  Error (missing file, invalid arguments, OCR failure)
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

function log(message: string): void {
  console.error(message);
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
// Page spec parsing (matches extract-text.ts / extract-images.ts format)
// ---------------------------------------------------------------------------

/**
 * Parse a page specification string like "1,3,5-7" into a sorted, deduplicated
 * array of 1-indexed page numbers: [1, 3, 5, 6, 7].
 */
function parsePageSpec(spec: string): number[] {
  const pages = new Set<number>();

  const parts = spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

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

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    file: null,
    pages: null,
    output: null,
    format: "text",
    lang: "eng",
    dpi: 300,
    confidenceThreshold: 30,
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
        die("Missing value for --format", "Usage: --format text|json");
      }
      const fmt = argv[i].toLowerCase();
      if (fmt !== "text" && fmt !== "json") {
        die(`Unknown format: "${argv[i]}"`, "Supported formats: text, json");
      }
      result.format = fmt;
      i++;
      continue;
    }

    if (arg === "--lang") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --lang", "Usage: --lang eng");
      }
      result.lang = argv[i];
      i++;
      continue;
    }

    if (arg === "--dpi") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --dpi", "Usage: --dpi 300");
      }
      const val = parseInt(argv[i], 10);
      if (isNaN(val) || val < 1) {
        die(`Invalid --dpi value: "${argv[i]}"`, "Must be a positive integer (e.g. 150, 300, 600)");
      }
      if (val > 1200) {
        log(`  Warning: DPI ${val} is very high and may be slow. Consider 300-600 for most documents.`);
      }
      result.dpi = val;
      i++;
      continue;
    }

    if (arg === "--confidence-threshold") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --confidence-threshold", "Usage: --confidence-threshold 30");
      }
      const val = parseFloat(argv[i]);
      if (isNaN(val) || val < 0 || val > 100) {
        die(
          `Invalid --confidence-threshold value: "${argv[i]}"`,
          "Must be a number between 0 and 100",
        );
      }
      result.confidenceThreshold = val;
      i++;
      continue;
    }

    if (arg.startsWith("-")) {
      die(`Unknown option: "${arg}"`, "Run with --help for usage information");
    }

    // Positional argument — treat as the file path
    if (result.file !== null) {
      die(
        "Only one PDF file can be specified",
        `Already have "${result.file}", got "${arg}". Process one file at a time.`,
      );
    }
    result.file = arg;
    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// PDF page rendering via mupdf
// ---------------------------------------------------------------------------

/**
 * Render a single PDF page to a PNG buffer using mupdf.
 *
 * @param doc       The opened mupdf document.
 * @param pageIndex 0-indexed page number.
 * @param dpi       Rendering resolution in dots per inch.
 * @returns         PNG image data as a Buffer.
 */
function renderPageToPng(
  doc: ReturnType<typeof mupdf.Document.openDocument>,
  pageIndex: number,
  dpi: number,
): Buffer {
  const page = doc.loadPage(pageIndex);
  const scale = dpi / 72;
  const matrix = mupdf.Matrix.scale(scale, scale);
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
  const pngData = pixmap.asPNG();
  return Buffer.from(pngData);
}

// ---------------------------------------------------------------------------
// OCR processing
// ---------------------------------------------------------------------------

/**
 * Run OCR on a single page image using a pre-initialized tesseract worker.
 *
 * @param worker              The tesseract.js worker instance.
 * @param pngBuffer           PNG image data for the page.
 * @param confidenceThreshold Minimum word confidence to include in text output.
 * @returns                   OCR result with text, confidence, and word details.
 */
async function ocrPage(
  worker: Tesseract.Worker,
  pngBuffer: Buffer,
  confidenceThreshold: number,
): Promise<{
  text: string;
  filteredText: string;
  confidence: number;
  wordCount: number;
  lowConfidenceWords: LowConfidenceWord[];
}> {
  const { data } = await worker.recognize(pngBuffer);

  // Separate words by confidence threshold
  const lowConfidenceWords: LowConfidenceWord[] = [];
  const acceptedWords: string[] = [];

  if (data.words && data.words.length > 0) {
    for (const word of data.words) {
      if (word.confidence < confidenceThreshold) {
        lowConfidenceWords.push({
          text: word.text,
          confidence: Math.round(word.confidence * 10) / 10,
        });
      } else {
        acceptedWords.push(word.text);
      }
    }
  }

  // Use the full text from tesseract (preserves layout/line breaks) for the
  // unfiltered version. Build a filtered version by reconstructing from
  // accepted words only when the threshold is meaningfully filtering.
  const fullText = (data.text ?? "").trim();

  // For filtered text: if we're filtering out words, reconstruct from the
  // line-level data to preserve line structure while omitting low-confidence
  // words. If no words were filtered, just use the full text.
  let filteredText: string;
  if (lowConfidenceWords.length > 0 && data.lines && data.lines.length > 0) {
    const filteredLines: string[] = [];
    for (const line of data.lines) {
      const lineWords: string[] = [];
      for (const word of line.words) {
        if (word.confidence >= confidenceThreshold) {
          lineWords.push(word.text);
        }
      }
      if (lineWords.length > 0) {
        filteredLines.push(lineWords.join(" "));
      }
    }
    filteredText = filteredLines.join("\n").trim();
  } else {
    filteredText = fullText;
  }

  const overallConfidence = Math.round((data.confidence ?? 0) * 10) / 10;
  const wordCount = acceptedWords.length;

  return {
    text: fullText,
    filteredText,
    confidence: overallConfidence,
    wordCount,
    lowConfidenceWords,
  };
}

// ---------------------------------------------------------------------------
// Main OCR pipeline
// ---------------------------------------------------------------------------

async function runOcr(args: ParsedArgs): Promise<JsonOutput> {
  const filePath = args.file!;

  // Validate input file
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    die(`File not found: ${filePath}`);
  }

  // Read the PDF into a buffer
  const fileData = Buffer.from(await file.arrayBuffer());

  log(`  Loading PDF: ${filePath}`);

  // Open the document with mupdf
  const doc = mupdf.Document.openDocument(fileData, "application/pdf");
  const totalPages = doc.countPages();

  log(`  Total pages: ${totalPages}`);

  // Determine which pages to OCR
  let targetPages: number[];
  if (args.pages !== null) {
    const outOfRange = args.pages.filter((p) => p > totalPages);
    if (outOfRange.length > 0) {
      die(
        `Page(s) out of range: ${outOfRange.join(", ")}`,
        `Document has ${totalPages} page(s). Valid range: 1-${totalPages}`,
      );
    }
    targetPages = args.pages;
  } else {
    targetPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  log(`  Pages to OCR: ${formatPageList(targetPages)}`);
  log(`  Language: ${args.lang}`);
  log(`  DPI: ${args.dpi}`);
  log(`  Confidence threshold: ${args.confidenceThreshold}`);
  log("");

  // Initialize tesseract worker (reuse for all pages)
  log(`  Initializing OCR engine (language: ${args.lang})...`);
  const worker = await Tesseract.createWorker(args.lang);
  log(`  OCR engine ready.`);
  log("");

  // Process each page
  const pageResults: OcrPageResult[] = [];
  const startTime = Date.now();

  for (let idx = 0; idx < targetPages.length; idx++) {
    const pageNum = targetPages[idx];
    const pageStart = Date.now();

    log(`  Processing page ${pageNum}/${totalPages} (${idx + 1}/${targetPages.length})...`);

    // Render page to PNG
    log(`    Rendering at ${args.dpi} DPI...`);
    let pngBuffer: Buffer;
    try {
      pngBuffer = renderPageToPng(doc, pageNum - 1, args.dpi);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      die(`Failed to render page ${pageNum}: ${msg}`);
    }
    log(`    Rendered (${(pngBuffer.length / 1024).toFixed(0)} KB image)`);

    // Run OCR on the rendered image
    log(`    Running OCR...`);
    let ocrResult: Awaited<ReturnType<typeof ocrPage>>;
    try {
      ocrResult = await ocrPage(worker, pngBuffer, args.confidenceThreshold);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      die(`OCR failed on page ${pageNum}: ${msg}`);
    }

    const elapsed = ((Date.now() - pageStart) / 1000).toFixed(1);
    log(
      `    Done: ${ocrResult.wordCount} words, ` +
        `confidence ${ocrResult.confidence}%, ` +
        `${ocrResult.lowConfidenceWords.length} low-confidence word(s), ` +
        `${elapsed}s`,
    );

    pageResults.push({
      page: pageNum,
      text: ocrResult.filteredText,
      confidence: ocrResult.confidence,
      word_count: ocrResult.wordCount,
      low_confidence_words: ocrResult.lowConfidenceWords,
    });
  }

  // Terminate the worker
  await worker.terminate();

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log("");
  log(`  OCR complete: ${targetPages.length} page(s) in ${totalElapsed}s`);

  // Build full concatenated text
  const fullText = pageResults.map((p) => p.text).join("\n\n");

  // Calculate average confidence across all pages
  const averageConfidence =
    pageResults.length > 0
      ? Math.round(
          (pageResults.reduce((sum, p) => sum + p.confidence, 0) / pageResults.length) * 10,
        ) / 10
      : 0;

  return {
    file: filePath,
    total_pages: totalPages,
    ocr_pages: targetPages,
    language: args.lang,
    dpi: args.dpi,
    pages: pageResults,
    full_text: fullText,
    average_confidence: averageConfidence,
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatAsText(result: JsonOutput): string {
  return result.full_text + "\n";
}

function formatAsJson(result: JsonOutput): string {
  return JSON.stringify(result, null, 2) + "\n";
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

  // Validate we have a file
  if (args.file === null) {
    die(
      "No input file specified",
      "Usage: bun run scripts/ocr-pdf.ts [options] <file>\n    Run with --help for more information.",
    );
  }

  log(`\n  ocr-pdf.ts`);
  log(`  ─────────────────────────────────`);

  // Run OCR pipeline
  const result = await runOcr(args);

  // Format output
  let output: string;
  if (args.format === "json") {
    output = formatAsJson(result);
  } else {
    output = formatAsText(result);
  }

  // Write output
  if (args.output) {
    await Bun.write(args.output, output);
    log(`  Output written to: ${args.output}`);
  } else {
    process.stdout.write(output);
  }

  log(`\n  OCR extraction complete.`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  ✗ Unexpected error: ${message}\n`);
  process.exit(1);
});

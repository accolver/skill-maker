#!/usr/bin/env bun

/**
 * extract-images.ts — Extract embedded images from PDF files
 *
 * Uses the `mupdf` WASM library to access PDF internal structure and extract
 * image objects. For each page, walks the page's resource dictionary to find
 * image XObjects, extracts them as Image objects, converts to Pixmap, and
 * saves as PNG or JPEG. If no discrete image objects are found on a page,
 * falls back to rendering the entire page at high resolution (288 DPI).
 *
 * Usage:
 *   bun run scripts/extract-images.ts document.pdf
 *   bun run scripts/extract-images.ts --pages 1,3,5-7 --format jpeg report.pdf
 *   bun run scripts/extract-images.ts --list-only --min-size 100 slides.pdf
 */

import * as mupdf from "mupdf";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageInfo {
  page: number;
  index: number;
  width: number;
  height: number;
  format: string;
  path: string;
  size_bytes: number;
}

interface JsonOutput {
  file: string;
  total_pages: number;
  images: ImageInfo[];
  image_count: number;
  output_dir: string;
}

interface ParsedArgs {
  help: boolean;
  file: string | null;
  outputDir: string;
  pages: number[] | null;
  format: "png" | "jpeg";
  minSize: number;
  listOnly: boolean;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

const HELP = `
extract-images.ts — Extract embedded images from PDF files

USAGE
  bun run scripts/extract-images.ts [options] <file>

ARGUMENTS
  file             Path to a PDF file to extract images from.

OPTIONS
  --help           Show this help message and exit.
  --output-dir <d> Directory to save extracted images. Default: ./extracted-images/
  --pages <spec>   Extract from specific pages only. Supports comma-separated
                   page numbers and ranges (1-indexed).
                   Examples: --pages 1,3,5-7  (pages 1, 3, 5, 6, 7)
                             --pages 2-4      (pages 2, 3, 4)
                             --pages 1        (page 1 only)
  --format <fmt>   Output image format: "png" (default) or "jpeg".
  --min-size <px>  Minimum dimension in pixels to include an image. Images
                   where both width and height are below this threshold are
                   skipped. Default: 50 (filters tiny icons/artifacts).
  --list-only      Output JSON listing of images without saving files.

EXAMPLES
  # Extract all images from a PDF
  bun run scripts/extract-images.ts document.pdf

  # Extract images from pages 1-3 as JPEG
  bun run scripts/extract-images.ts --pages 1-3 --format jpeg report.pdf

  # List images without saving, filtering small ones
  bun run scripts/extract-images.ts --list-only --min-size 100 slides.pdf

  # Save to a custom directory
  bun run scripts/extract-images.ts --output-dir ./my-images/ brochure.pdf

OUTPUT
  JSON summary to stdout with structure:
    {
      "file": "input.pdf",
      "total_pages": 5,
      "images": [
        {
          "page": 1,
          "index": 0,
          "width": 800,
          "height": 600,
          "format": "png",
          "path": "./extracted-images/input-page1-img0.png",
          "size_bytes": 45230
        }
      ],
      "image_count": 3,
      "output_dir": "./extracted-images/"
    }

  Diagnostics and progress are written to stderr.

EXIT CODES
  0  Success
  1  Error (missing file, invalid arguments, extraction failure)
`.trim();

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Page spec parsing (matches extract-text.ts format)
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
    outputDir: "./extracted-images/",
    pages: null,
    format: "png",
    minSize: 50,
    listOnly: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      return result;
    }

    if (arg === "--output-dir") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --output-dir", "Usage: --output-dir ./images/");
      }
      result.outputDir = argv[i];
      // Ensure trailing slash for consistency
      if (!result.outputDir.endsWith("/")) {
        result.outputDir += "/";
      }
      i++;
      continue;
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

    if (arg === "--format") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --format", "Usage: --format png|jpeg");
      }
      const fmt = argv[i].toLowerCase();
      if (fmt !== "png" && fmt !== "jpeg") {
        die(`Unknown format: "${argv[i]}"`, "Supported formats: png, jpeg");
      }
      result.format = fmt;
      i++;
      continue;
    }

    if (arg === "--min-size") {
      i++;
      if (i >= argv.length) {
        die("Missing value for --min-size", "Usage: --min-size 100");
      }
      const val = parseInt(argv[i], 10);
      if (isNaN(val) || val < 0) {
        die(`Invalid --min-size value: "${argv[i]}"`, "Must be a non-negative integer");
      }
      result.minSize = val;
      i++;
      continue;
    }

    if (arg === "--list-only") {
      result.listOnly = true;
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
// Image extraction from PDF page resources
// ---------------------------------------------------------------------------

/**
 * Extract embedded image XObjects from a PDF page's resource dictionary.
 *
 * Walks /Resources/XObject looking for entries with /Subtype /Image.
 * For each image, creates a mupdf.Image, converts to Pixmap, and encodes
 * as PNG or JPEG.
 *
 * Returns an array of { name, width, height, data } for images that pass
 * the minimum size filter.
 */
function extractPageImages(
  page: ReturnType<ReturnType<typeof mupdf.Document.openDocument>["loadPage"]>,
  minSize: number,
): Array<{ name: string; width: number; height: number; pixmap: ReturnType<InstanceType<typeof mupdf.Image>["toPixmap"]> }> {
  const results: Array<{
    name: string;
    width: number;
    height: number;
    pixmap: ReturnType<InstanceType<typeof mupdf.Image>["toPixmap"]>;
  }> = [];

  try {
    // PDFPage has getObject() which returns the page's PDF dictionary
    const pageObj = (page as any).getObject?.();
    if (!pageObj) return results;

    // Navigate to /Resources/XObject
    const resources = pageObj.get("Resources");
    if (!resources || resources.isNull?.()) return results;

    const xobjects = resources.get("XObject");
    if (!xobjects || xobjects.isNull?.()) return results;

    // Iterate over all XObject entries
    xobjects.forEach((val: any, key: string | number) => {
      try {
        // IMPORTANT: In mupdf.js, XObject entries are indirect references.
        // - Stream operations (isStream, readStream, readRawStream) must be
        //   called on the INDIRECT reference (val), not the resolved object.
        // - Dictionary operations (get, isDictionary) work on the RESOLVED
        //   object.
        const resolved = val.resolve ? val.resolve() : val;
        if (!resolved) return;

        // Check if this XObject is an Image (/Subtype /Image)
        const subtype = resolved.get?.("Subtype");
        if (!subtype) return;

        const subtypeName = subtype.asName ? subtype.asName() : String(subtype);
        if (subtypeName !== "Image") return;

        // Get image dimensions from the dictionary
        const widthObj = resolved.get?.("Width");
        const heightObj = resolved.get?.("Height");
        const width = widthObj?.asNumber ? widthObj.asNumber() : 0;
        const height = heightObj?.asNumber ? heightObj.asNumber() : 0;

        // Apply minimum size filter
        if (width < minSize && height < minSize) return;

        // Verify this is a stream object — must check on the indirect ref
        if (!val.isStream || !val.isStream()) return;

        // Determine the compression filter to choose extraction strategy
        const filterObj = resolved.get?.("Filter");
        const filterName = filterObj?.asName ? filterObj.asName() : "";

        let pixmap: ReturnType<InstanceType<typeof mupdf.Image>["toPixmap"]>;

        if (filterName === "DCTDecode" || filterName === "JPXDecode") {
          // DCTDecode = JPEG, JPXDecode = JPEG 2000.
          // The raw (undecoded) stream is a valid image file that the
          // mupdf.Image constructor can decode directly.
          const rawBuf = val.readRawStream();
          const image = new mupdf.Image(rawBuf);
          pixmap = image.toPixmap();
        } else {
          // For FlateDecode and other filters, the decoded stream contains
          // raw pixel data. We read the decoded stream and attempt to
          // create an Image from it. If that fails, we skip this XObject
          // and let the page-rendering fallback capture it.
          try {
            const rawBuf = val.readRawStream();
            const image = new mupdf.Image(rawBuf);
            pixmap = image.toPixmap();
          } catch {
            log(`    Info: Image "${key}" uses ${filterName || "unknown"} filter — will use page rendering`);
            return;
          }
        }

        results.push({
          name: String(key),
          width: pixmap.getWidth(),
          height: pixmap.getHeight(),
          pixmap,
        });
      } catch (err) {
        // Skip images that fail to decode — log but don't abort
        const msg = err instanceof Error ? err.message : String(err);
        log(`    Warning: Failed to extract XObject "${key}": ${msg}`);
      }
    });
  } catch (err) {
    // If resource walking fails entirely, return empty — caller will
    // fall back to page rendering
    const msg = err instanceof Error ? err.message : String(err);
    log(`    Warning: Failed to walk page resources: ${msg}`);
  }

  return results;
}

/**
 * Render an entire page as a high-resolution image (288 DPI = 4x default 72 DPI).
 * Used as a fallback when no discrete image XObjects are found on a page.
 */
function renderPageAsImage(
  page: ReturnType<ReturnType<typeof mupdf.Document.openDocument>["loadPage"]>,
  minSize: number,
): { width: number; height: number; pixmap: ReturnType<InstanceType<typeof mupdf.Image>["toPixmap"]> } | null {
  try {
    const scale = 288 / 72; // 4x scale for 288 DPI
    const matrix = mupdf.Matrix.scale(scale, scale);
    const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);

    const width = pixmap.getWidth();
    const height = pixmap.getHeight();

    // Apply minimum size filter
    if (width < minSize && height < minSize) return null;

    return { width, height, pixmap };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`    Warning: Failed to render page: ${msg}`);
    return null;
  }
}

/**
 * Encode a Pixmap to the requested format (PNG or JPEG).
 * Returns the encoded data as a Uint8Array.
 *
 * For JPEG: mupdf's asJPEG() does not support alpha channels, so we
 * convert to a non-alpha pixmap first if needed.
 */
function encodePixmap(
  pixmap: ReturnType<InstanceType<typeof mupdf.Image>["toPixmap"]>,
  format: "png" | "jpeg",
): Uint8Array {
  if (format === "jpeg") {
    // JPEG does not support alpha — convert if needed
    let targetPixmap = pixmap;
    if (pixmap.getAlpha()) {
      targetPixmap = pixmap.convertToColorSpace(mupdf.ColorSpace.DeviceRGB, false);
    }
    const buf = targetPixmap.asJPEG(90, false);
    return new Uint8Array(buf);
  }

  // PNG
  const buf = pixmap.asPNG();
  return new Uint8Array(buf);
}

// ---------------------------------------------------------------------------
// Main extraction pipeline
// ---------------------------------------------------------------------------

function extractImages(args: ParsedArgs): JsonOutput {
  const filePath = args.file!;
  const resolvedPath = resolve(filePath);

  // Validate input file
  if (!existsSync(resolvedPath)) {
    die(`File not found: ${filePath}`);
  }

  const fileStat = statSync(resolvedPath);
  if (!fileStat.isFile()) {
    die(`Not a file: ${filePath}`);
  }

  // Read the PDF into a buffer
  log(`\n  extract-images.ts`);
  log(`  File: ${filePath} (${formatBytes(fileStat.size)})`);
  log(`  Format: ${args.format}`);
  log(`  Min size: ${args.minSize}px`);
  if (args.pages) log(`  Pages: ${args.pages.join(", ")}`);
  if (args.listOnly) log(`  Mode: list-only (no files saved)`);
  else log(`  Output dir: ${args.outputDir}`);
  log("");

  const fileData = require("fs").readFileSync(resolvedPath);
  const doc = mupdf.Document.openDocument(fileData, filePath);
  const totalPages = doc.countPages();

  log(`  Total pages: ${totalPages}`);

  // Determine target pages
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

  // Create output directory if saving files
  const outputDir = resolve(args.outputDir);
  if (!args.listOnly) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Derive base name from input file (without extension)
  const inputBaseName = basename(filePath, extname(filePath));
  const fileExt = args.format === "jpeg" ? "jpg" : "png";

  const images: ImageInfo[] = [];

  for (const pageNum of targetPages) {
    log(`  Processing page ${pageNum}/${totalPages}...`);

    // mupdf uses 0-indexed pages
    const page = doc.loadPage(pageNum - 1);

    // Attempt to extract discrete image XObjects
    const pageImages = extractPageImages(page, args.minSize);

    if (pageImages.length > 0) {
      log(`    Found ${pageImages.length} image(s) on page ${pageNum}`);

      for (let imgIdx = 0; imgIdx < pageImages.length; imgIdx++) {
        const img = pageImages[imgIdx];
        const fileName = `${inputBaseName}-page${pageNum}-img${imgIdx}.${fileExt}`;
        const filePath = join(outputDir, fileName);
        const relativePath = join(args.outputDir, fileName);

        const encoded = encodePixmap(img.pixmap, args.format);

        if (!args.listOnly) {
          writeFileSync(filePath, encoded);
          log(`    Saved: ${relativePath} (${img.width}x${img.height}, ${formatBytes(encoded.length)})`);
        } else {
          log(`    Image: ${fileName} (${img.width}x${img.height}, ${formatBytes(encoded.length)})`);
        }

        images.push({
          page: pageNum,
          index: imgIdx,
          width: img.width,
          height: img.height,
          format: args.format,
          path: relativePath,
          size_bytes: encoded.length,
        });
      }
    } else {
      // Fallback: render the entire page as a high-res image
      log(`    No discrete images found on page ${pageNum}, rendering page...`);

      const rendered = renderPageAsImage(page, args.minSize);
      if (rendered) {
        const fileName = `${inputBaseName}-page${pageNum}-img0.${fileExt}`;
        const outPath = join(outputDir, fileName);
        const relativePath = join(args.outputDir, fileName);

        const encoded = encodePixmap(rendered.pixmap, args.format);

        if (!args.listOnly) {
          writeFileSync(outPath, encoded);
          log(`    Saved (rendered): ${relativePath} (${rendered.width}x${rendered.height}, ${formatBytes(encoded.length)})`);
        } else {
          log(`    Rendered: ${fileName} (${rendered.width}x${rendered.height}, ${formatBytes(encoded.length)})`);
        }

        images.push({
          page: pageNum,
          index: 0,
          width: rendered.width,
          height: rendered.height,
          format: args.format,
          path: relativePath,
          size_bytes: encoded.length,
        });
      } else {
        log(`    No extractable content on page ${pageNum} (below min-size threshold)`);
      }
    }
  }

  log(`\n  Extraction complete: ${images.length} image(s) from ${targetPages.length} page(s)`);

  return {
    file: args.file!,
    total_pages: totalPages,
    images,
    image_count: images.length,
    output_dir: args.outputDir,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
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
      "Usage: bun run scripts/extract-images.ts [options] <file>\n    Run with --help for more information.",
    );
  }

  try {
    const result = extractImages(args);
    const json = JSON.stringify(result, null, 2);
    console.log(json);
  } catch (err) {
    // Guard against die() which already exits — only catch unexpected errors
    if ((err as any)?.code === "EXIT") throw err;
    const message = err instanceof Error ? err.message : String(err);
    die(`Unexpected error: ${message}`);
  }
}

main();

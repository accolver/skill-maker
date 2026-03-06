#!/usr/bin/env bun

/**
 * create-pdf.ts — Create PDF documents from text, images, or markdown
 *
 * Generates a new PDF file from one of three input sources:
 *   - Plain text file (word-wrapped, paginated at ~60 lines)
 *   - Image files via glob (one image per page, scaled to fit)
 *   - Markdown file (basic rendering with headings, bold, bullets, code blocks)
 *
 * Usage:
 *   bun run scripts/create-pdf.ts --from-text input.txt --output out.pdf
 *   bun run scripts/create-pdf.ts --from-images "photos/*.png" --output out.pdf
 *   bun run scripts/create-pdf.ts --from-markdown doc.md --output out.pdf
 *
 * JSON summary is written to stdout; diagnostics go to stderr.
 */

import { existsSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Glob } from "bun";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CliArgs {
  help: boolean;
  output: string | null;
  title: string | null;
  author: string | null;
  fromText: string | null;
  fromImages: string | null;
  fromMarkdown: string | null;
  pageSize: "letter" | "a4" | "legal";
  margin: number;
  fontSize: number;
}

interface OutputSummary {
  output: string;
  pages: number;
  size_bytes: number;
  title: string | null;
  page_size: string;
  source: "text" | "images" | "markdown";
  source_file: string;
}

type PageDimensions = [number, number];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZES: Record<string, PageDimensions> = {
  letter: [612, 792],
  a4: [595.28, 841.89],
  legal: [612, 1008],
};

const HELP = `
create-pdf — Create PDF documents from text, images, or markdown.

USAGE
  bun run scripts/create-pdf.ts --output <path> [options] <input-mode>

INPUT MODES (exactly one required)
  --from-text <file>       Create PDF from a plain text file (~60 lines/page)
  --from-images <glob>     Create PDF with one image per page (PNG/JPEG)
  --from-markdown <file>   Create PDF from markdown (headings, bold, bullets, code)

OPTIONS
  --output <path>          Output PDF file path (required)
  --title <string>         Document title metadata
  --author <string>        Document author metadata
  --page-size <size>       Page size: letter (default), a4, legal
  --margin <points>        Margin in points (default: 72 = 1 inch)
  --font-size <points>     Base font size in points (default: 12)
  --help                   Show this help message

EXIT CODES
  0   Success
  1   Error (missing args, bad input, etc.)

OUTPUT
  JSON summary to stdout with fields:
    output, pages, size_bytes, title, page_size, source, source_file

EXAMPLES
  # Text file to PDF
  bun run scripts/create-pdf.ts --from-text notes.txt --output notes.pdf

  # Images to PDF with A4 pages
  bun run scripts/create-pdf.ts --from-images "scans/*.png" --output album.pdf --page-size a4

  # Markdown to PDF with custom margins
  bun run scripts/create-pdf.ts --from-markdown README.md --output readme.pdf --margin 54

  # With metadata
  bun run scripts/create-pdf.ts --from-text ch1.txt --output ch1.pdf --title "Chapter 1" --author "Jane Doe"
`.trim();

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    output: null,
    title: null,
    author: null,
    fromText: null,
    fromImages: null,
    fromMarkdown: null,
    pageSize: "letter",
    margin: 72,
    fontSize: 12,
  };

  const raw = argv.slice(2); // skip bun and script path

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    switch (arg) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--output":
      case "-o":
        args.output = raw[++i] ?? null;
        break;
      case "--title":
        args.title = raw[++i] ?? null;
        break;
      case "--author":
        args.author = raw[++i] ?? null;
        break;
      case "--from-text":
        args.fromText = raw[++i] ?? null;
        break;
      case "--from-images":
        args.fromImages = raw[++i] ?? null;
        break;
      case "--from-markdown":
        args.fromMarkdown = raw[++i] ?? null;
        break;
      case "--page-size":
        {
          const val = (raw[++i] ?? "").toLowerCase();
          if (val !== "letter" && val !== "a4" && val !== "legal") {
            die(`Invalid --page-size "${val}". Must be letter, a4, or legal.`);
          }
          args.pageSize = val;
        }
        break;
      case "--margin":
        {
          const val = Number(raw[++i]);
          if (Number.isNaN(val) || val < 0) {
            die(`Invalid --margin value. Must be a non-negative number.`);
          }
          args.margin = val;
        }
        break;
      case "--font-size":
        {
          const val = Number(raw[++i]);
          if (Number.isNaN(val) || val <= 0) {
            die(`Invalid --font-size value. Must be a positive number.`);
          }
          args.fontSize = val;
        }
        break;
      default:
        die(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function info(message: string): void {
  console.error(message);
}

/**
 * Sanitize text for WinAnsi encoding used by standard PDF fonts.
 * Replaces characters outside the WinAnsi range with safe ASCII substitutes.
 */
function sanitizeForPdf(text: string): string {
  // Common substitutions for characters that WinAnsi cannot encode
  const replacements: Record<string, string> = {
    "\u251C": "|--", // ├
    "\u2514": "`--", // └
    "\u2502": "|",   // │
    "\u2500": "-",   // ─
    "\u252C": "|--", // ┬
    "\u2510": "+",   // ┐
    "\u250C": "+",   // ┌
    "\u2518": "+",   // ┘
    "\u2524": "|",   // ┤
    "\u253C": "+",   // ┼
    "\u2022": "-",   // • (bullet — we handle this separately in markdown)
    "\u2013": "-",   // –
    "\u2014": "--",  // —
    "\u2018": "'",   // '
    "\u2019": "'",   // '
    "\u201C": "\"",  // "
    "\u201D": "\"",  // "
    "\u2026": "...", // …
    "\u2192": "->",  // →
    "\u2190": "<-",  // ←
    "\u2713": "v",   // ✓
    "\u2717": "x",   // ✗
    "\u00A0": " ",   // non-breaking space
  };

  let result = "";
  for (const char of text) {
    if (replacements[char] !== undefined) {
      result += replacements[char];
      continue;
    }
    const code = char.charCodeAt(0);
    // WinAnsi encodable range: 0x20-0x7E (ASCII printable) plus 0xA0-0xFF (Latin-1 supplement)
    // Also allow tab (0x09) which we'll convert to spaces
    if (code === 0x09) {
      result += "    "; // tab → 4 spaces
    } else if (
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0xff)
    ) {
      result += char;
    } else if (code < 0x20) {
      // Control characters → skip
    } else {
      // Non-encodable character → replace with ?
      result += "?";
    }
  }
  return result;
}

/**
 * Word-wrap a single line of text to fit within maxWidth pixels.
 * Returns an array of wrapped lines.
 */
function wordWrap(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
  maxWidth: number,
): string[] {
  // Sanitize for WinAnsi encoding before measuring/wrapping
  const safeText = sanitizeForPdf(text);
  if (safeText.length === 0) return [""];

  const words = safeText.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length === 0) {
      // First word on the line — always accept it even if it overflows
      currentLine = word;
      continue;
    }

    const candidate = `${currentLine} ${word}`;
    const width = font.widthOfTextAtSize(candidate, fontSize);

    if (width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

/**
 * Resolve image files from a glob pattern. Returns sorted absolute paths.
 */
async function resolveImageGlob(pattern: string): Promise<string[]> {
  // Determine the base directory from the pattern
  // e.g., "photos/*.png" → base = "photos", glob = "*.png"
  // e.g., "*.jpg" → base = ".", glob = "*.jpg"
  const lastSlash = pattern.lastIndexOf("/");
  const baseDir = lastSlash >= 0 ? pattern.slice(0, lastSlash) : ".";
  const globPattern = lastSlash >= 0 ? pattern.slice(lastSlash + 1) : pattern;

  const resolvedBase = resolve(baseDir);
  if (!existsSync(resolvedBase)) {
    die(`Image directory does not exist: ${resolvedBase}`);
  }

  const glob = new Glob(globPattern);
  const paths: string[] = [];

  for await (const entry of glob.scan({ cwd: resolvedBase, absolute: true })) {
    const ext = extname(entry).toLowerCase();
    if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
      paths.push(entry);
    }
  }

  paths.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return paths;
}

// ---------------------------------------------------------------------------
// PDF creation: from text
// ---------------------------------------------------------------------------

async function createFromText(
  filePath: string,
  args: CliArgs,
): Promise<OutputSummary> {
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    die(`Text file not found: ${resolvedPath}`);
  }

  const rawText = await Bun.file(resolvedPath).text();
  const inputLines = rawText.split("\n");

  info(`Reading text file: ${resolvedPath} (${inputLines.length} lines)`);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const [pageWidth, pageHeight] = PAGE_SIZES[args.pageSize];
  const maxTextWidth = pageWidth - args.margin * 2;
  const lineHeight = args.fontSize * 1.4;

  // Word-wrap all input lines
  const wrappedLines: string[] = [];
  for (const line of inputLines) {
    const wrapped = wordWrap(line, font, args.fontSize, maxTextWidth);
    wrappedLines.push(...wrapped);
  }

  if (wrappedLines.length === 0) {
    info("Warning: Input file is empty. Creating a single blank page.");
    wrappedLines.push("");
  }

  // Paginate
  const usableHeight = pageHeight - args.margin * 2;
  const linesPerPage = Math.max(1, Math.floor(usableHeight / lineHeight));

  for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
    const pageLines = wrappedLines.slice(i, i + linesPerPage);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    let y = pageHeight - args.margin - args.fontSize;
    for (const line of pageLines) {
      page.drawText(line, {
        x: args.margin,
        y,
        size: args.fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }

  return await finalizePdf(pdfDoc, args, "text", filePath);
}

// ---------------------------------------------------------------------------
// PDF creation: from images
// ---------------------------------------------------------------------------

async function createFromImages(
  pattern: string,
  args: CliArgs,
): Promise<OutputSummary> {
  const imagePaths = await resolveImageGlob(pattern);

  if (imagePaths.length === 0) {
    die(`No PNG or JPEG images found matching pattern: ${pattern}`);
  }

  info(`Found ${imagePaths.length} image(s) matching "${pattern}"`);

  const pdfDoc = await PDFDocument.create();
  const [pageWidth, pageHeight] = PAGE_SIZES[args.pageSize];
  const usableWidth = pageWidth - args.margin * 2;
  const usableHeight = pageHeight - args.margin * 2;

  for (const imgPath of imagePaths) {
    const ext = extname(imgPath).toLowerCase();
    const imageBytes = await Bun.file(imgPath).arrayBuffer();

    let image;
    try {
      image =
        ext === ".png"
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      die(`Failed to embed image "${basename(imgPath)}": ${msg}`);
    }

    // Scale image to fit within usable area while preserving aspect ratio
    const imgWidth = image.width;
    const imgHeight = image.height;
    const scaleX = usableWidth / imgWidth;
    const scaleY = usableHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY, 1); // don't upscale

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    // Center the image on the page
    const x = args.margin + (usableWidth - drawWidth) / 2;
    const y = args.margin + (usableHeight - drawHeight) / 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    info(`  Embedded: ${basename(imgPath)} (${imgWidth}x${imgHeight} → ${Math.round(drawWidth)}x${Math.round(drawHeight)})`);
  }

  return await finalizePdf(pdfDoc, args, "images", pattern);
}

// ---------------------------------------------------------------------------
// PDF creation: from markdown
// ---------------------------------------------------------------------------

/** Parsed markdown block types */
type MdBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "code"; lines: string[] }
  | { type: "blank" };

/**
 * Parse markdown into a flat list of blocks.
 * This is intentionally simple — it handles the most common constructs.
 */
function parseMarkdown(source: string): MdBlock[] {
  const lines = source.split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim().length === 0) {
      blocks.push({ type: "blank" });
      i++;
      continue;
    }

    // Code fence
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++; // skip opening fence
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (or end of file)
      blocks.push({ type: "code", lines: codeLines });
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: stripInlineMarkdown(line.slice(4).trim()) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: stripInlineMarkdown(line.slice(3).trim()) });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: stripInlineMarkdown(line.slice(2).trim()) });
      i++;
      continue;
    }

    // Bullet list item (-, *, or numbered)
    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)/);
    const numberedMatch = line.match(/^\s*\d+\.\s+(.*)/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", text: stripInlineMarkdown(bulletMatch[1].trim()) });
      i++;
      continue;
    }
    if (numberedMatch) {
      blocks.push({ type: "bullet", text: stripInlineMarkdown(numberedMatch[1].trim()) });
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-blank, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !lines[i].startsWith("#") &&
      !lines[i].trimStart().startsWith("```") &&
      !lines[i].match(/^\s*[-*+]\s+/) &&
      !lines[i].match(/^\s*\d+\.\s+/)
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: stripInlineMarkdown(paraLines.join(" ")) });
    }
  }

  return blocks;
}

/**
 * Strip inline markdown formatting for plain-text rendering.
 * Removes **bold**, *italic*, `code`, [links](url), and ![images](url).
 */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/`(.+?)`/g, "$1"); // inline code
}

async function createFromMarkdown(
  filePath: string,
  args: CliArgs,
): Promise<OutputSummary> {
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    die(`Markdown file not found: ${resolvedPath}`);
  }

  const rawText = await Bun.file(resolvedPath).text();
  const blocks = parseMarkdown(rawText);

  info(`Reading markdown file: ${resolvedPath} (${blocks.length} blocks)`);

  if (blocks.length === 0 || blocks.every((b) => b.type === "blank")) {
    info("Warning: Markdown file is empty. Creating a single blank page.");
  }

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const [pageWidth, pageHeight] = PAGE_SIZES[args.pageSize];
  const maxTextWidth = pageWidth - args.margin * 2;
  const baseFontSize = args.fontSize;

  // Font sizes for headings
  const h1Size = Math.round(baseFontSize * 1.5); // 18pt at default
  const h2Size = Math.round(baseFontSize * 1.25); // 15pt at default
  const h3Size = Math.round(baseFontSize * 1.1); // ~13pt at default

  const lineSpacing = 1.4;
  const paragraphSpacing = baseFontSize * 0.6;
  const codeBlockPadding = 6;
  const bulletIndent = 18;
  const bulletChar = "-";

  // State for page management
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - args.margin;

  function ensureSpace(needed: number): void {
    if (cursorY - needed < args.margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - args.margin;
    }
  }

  function drawWrappedText(
    text: string,
    font: typeof fontRegular,
    fontSize: number,
    xOffset: number = 0,
    color: [number, number, number] = [0, 0, 0],
  ): void {
    const effectiveWidth = maxTextWidth - xOffset;
    const wrapped = wordWrap(text, font, fontSize, effectiveWidth);
    const lh = fontSize * lineSpacing;

    for (const line of wrapped) {
      ensureSpace(lh);
      cursorY -= fontSize; // move down by font size (baseline positioning)
      page.drawText(line, {
        x: args.margin + xOffset,
        y: cursorY,
        size: fontSize,
        font,
        color: rgb(color[0], color[1], color[2]),
      });
      cursorY -= lh - fontSize; // remaining line height gap
    }
  }

  for (const block of blocks) {
    switch (block.type) {
      case "blank":
        cursorY -= baseFontSize * 0.5;
        break;

      case "h1":
        ensureSpace(h1Size * lineSpacing + paragraphSpacing);
        cursorY -= paragraphSpacing;
        drawWrappedText(block.text, fontBold, h1Size);
        cursorY -= paragraphSpacing * 0.5;
        break;

      case "h2":
        ensureSpace(h2Size * lineSpacing + paragraphSpacing);
        cursorY -= paragraphSpacing;
        drawWrappedText(block.text, fontBold, h2Size);
        cursorY -= paragraphSpacing * 0.5;
        break;

      case "h3":
        ensureSpace(h3Size * lineSpacing + paragraphSpacing);
        cursorY -= paragraphSpacing;
        drawWrappedText(block.text, fontBold, h3Size);
        cursorY -= paragraphSpacing * 0.5;
        break;

      case "paragraph":
        ensureSpace(baseFontSize * lineSpacing);
        drawWrappedText(block.text, fontRegular, baseFontSize);
        cursorY -= paragraphSpacing;
        break;

      case "bullet": {
        const lh = baseFontSize * lineSpacing;
        ensureSpace(lh);

        // Draw bullet character
        cursorY -= baseFontSize;
        page.drawText(bulletChar, {
          x: args.margin + 6,
          y: cursorY,
          size: baseFontSize,
          font: fontRegular,
          color: rgb(0, 0, 0),
        });
        cursorY += baseFontSize; // reset — drawWrappedText will move down

        drawWrappedText(block.text, fontRegular, baseFontSize, bulletIndent);
        cursorY -= paragraphSpacing * 0.3;
        break;
      }

      case "code": {
        const codeFontSize = baseFontSize * 0.85;
        const codeLh = codeFontSize * lineSpacing;
        const blockHeight =
          block.lines.length * codeLh + codeBlockPadding * 2;

        ensureSpace(Math.min(blockHeight, pageHeight - args.margin * 2));
        cursorY -= codeBlockPadding;

        // Draw background rectangle
        const bgStartY = cursorY + codeFontSize * 0.3;
        const bgHeight = Math.min(
          blockHeight,
          bgStartY - args.margin + codeBlockPadding,
        );
        page.drawRectangle({
          x: args.margin - 2,
          y: bgStartY - bgHeight,
          width: maxTextWidth + 4,
          height: bgHeight,
          color: rgb(0.95, 0.95, 0.95),
        });

        for (const codeLine of block.lines) {
          ensureSpace(codeLh);
          cursorY -= codeFontSize;
          // Sanitize and truncate long code lines rather than wrapping
          let displayLine = sanitizeForPdf(codeLine);
          const maxCodeWidth = maxTextWidth - codeBlockPadding * 2;
          while (
            displayLine.length > 0 &&
            fontMono.widthOfTextAtSize(displayLine, codeFontSize) > maxCodeWidth
          ) {
            displayLine = displayLine.slice(0, -1);
          }
          page.drawText(displayLine, {
            x: args.margin + codeBlockPadding,
            y: cursorY,
            size: codeFontSize,
            font: fontMono,
            color: rgb(0.2, 0.2, 0.2),
          });
          cursorY -= codeLh - codeFontSize;
        }

        cursorY -= codeBlockPadding + paragraphSpacing;
        break;
      }
    }
  }

  // If no blocks produced any pages beyond the initial one and it's blank,
  // that's fine — we still have at least one page.

  return await finalizePdf(pdfDoc, args, "markdown", filePath);
}

// ---------------------------------------------------------------------------
// Finalization
// ---------------------------------------------------------------------------

async function finalizePdf(
  pdfDoc: PDFDocument,
  args: CliArgs,
  source: "text" | "images" | "markdown",
  sourceFile: string,
): Promise<OutputSummary> {
  // Set metadata
  if (args.title) {
    pdfDoc.setTitle(args.title);
  }
  if (args.author) {
    pdfDoc.setAuthor(args.author);
  }
  pdfDoc.setCreator("create-pdf.ts (pdf-lib)");
  pdfDoc.setCreationDate(new Date());

  const pdfBytes = await pdfDoc.save();
  const outputPath = resolve(args.output!);

  await Bun.write(outputPath, pdfBytes);

  const pageCount = pdfDoc.getPageCount();
  const sizeBytes = pdfBytes.length;

  info(`Wrote ${pageCount} page(s) to ${outputPath} (${sizeBytes} bytes)`);

  return {
    output: outputPath,
    pages: pageCount,
    size_bytes: sizeBytes,
    title: args.title,
    page_size: args.pageSize,
    source,
    source_file: sourceFile,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateArgs(args: CliArgs): void {
  if (!args.output) {
    die("Missing required --output flag. Use --help for usage.");
  }

  // Exactly one input mode must be specified
  const modes = [args.fromText, args.fromImages, args.fromMarkdown].filter(
    (v) => v !== null,
  );

  if (modes.length === 0) {
    die(
      "No input mode specified. Use one of: --from-text, --from-images, --from-markdown. Use --help for usage.",
    );
  }

  if (modes.length > 1) {
    die(
      "Multiple input modes specified. Use exactly one of: --from-text, --from-images, --from-markdown.",
    );
  }

  // Validate margin doesn't consume entire page
  const [pageWidth, pageHeight] = PAGE_SIZES[args.pageSize];
  if (args.margin * 2 >= pageWidth || args.margin * 2 >= pageHeight) {
    die(
      `Margin ${args.margin}pt is too large for ${args.pageSize} page (${pageWidth}x${pageHeight}). ` +
        `Margins must leave usable space.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  validateArgs(args);

  let summary: OutputSummary;

  if (args.fromText) {
    summary = await createFromText(args.fromText, args);
  } else if (args.fromImages) {
    summary = await createFromImages(args.fromImages, args);
  } else if (args.fromMarkdown) {
    summary = await createFromMarkdown(args.fromMarkdown, args);
  } else {
    // Should be unreachable after validation
    die("No input mode specified.");
  }

  // JSON summary to stdout
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`error: Unexpected failure: ${message}`);
  process.exit(1);
});

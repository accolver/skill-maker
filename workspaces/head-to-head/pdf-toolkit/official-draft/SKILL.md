---
name: pdf-toolkit
description: >-
  Extract text, tables, and images from PDFs, OCR scanned PDFs, create PDFs
  from text/images/markdown, and merge or split PDF files. Use when working
  with PDF documents, when the user mentions PDFs, document extraction, OCR,
  scanning, PDF merging, splitting, combining, or creating PDF reports. All
  operations use bundled Bun TypeScript scripts with structured JSON output.
version: 0.1.0
---

# PDF Toolkit

Work with PDF documents through a set of bundled Bun TypeScript scripts. Every
script writes structured JSON to stdout and diagnostics to stderr, so you can
parse results programmatically and chain operations together.

## Quick Reference

| Task            | Script              | Key Flags                                                  |
| --------------- | ------------------- | ---------------------------------------------------------- |
| Extract text    | `extract-text.ts`   | `--format json`                                            |
| Extract tables  | `extract-tables.ts` | `--pages 1,3-5`                                            |
| Extract images  | `extract-images.ts` | `--format jpeg`, `--output-dir ./imgs`                     |
| OCR scanned PDF | `ocr-pdf.ts`        | `--dpi 300`, `--format json`                               |
| Create PDF      | `create-pdf.ts`     | `--from-markdown`, `--page-size A4`                        |
| Merge PDFs      | `merge-pdf.ts`      | `--output merged.pdf`, `--page-ranges`                     |
| Split PDF       | `split-pdf.ts`      | `--mode chunks`, `--chunk-size 10`, `--output-dir ./parts` |

## Core Principle: Text Before OCR

Always try `extract-text.ts` first. Only fall back to `ocr-pdf.ts` if the
extracted text is empty or garbled. This matters because:

- **Text extraction is fast** — it reads embedded text directly from the PDF
  structure, completing in milliseconds even for large files.
- **OCR is slow and lossy** — it renders pages to images, then runs character
  recognition, which takes seconds per page and introduces errors.
- **Many PDFs that look scanned aren't** — documents exported from Word, Google
  Docs, or web pages contain embedded text even though they appear as fixed
  layouts.

The only time to skip straight to OCR is when the user explicitly tells you the
document is a scanned image (e.g., "this is a scanned contract" or "I
photographed these pages").

## Workflow

### Step 1 — Identify the Operation

Map the user's request to one or more scripts:

- **"Get the text from this PDF"** → `extract-text.ts`
- **"Pull out the tables"** → `extract-tables.ts`
- **"Extract the images/figures"** → `extract-images.ts`
- **"This is a scanned document"** → `extract-text.ts` first, then `ocr-pdf.ts`
  if needed
- **"Create a PDF from this markdown"** → `create-pdf.ts`
- **"Combine these PDFs"** → `merge-pdf.ts`
- **"Split this into smaller files"** → `split-pdf.ts`

### Step 2 — Run the Script

All scripts use the same invocation pattern:

```bash
bun run scripts/<script-name>.ts [options] <input-file(s)>
```

Capture stdout for the JSON result. Diagnostics and progress info go to stderr.

### Step 3 — Parse and Present Results

Parse the JSON output and present it in a format useful to the user. For
extraction tasks, show the content directly. For file-producing tasks (merge,
split, create), confirm the output paths and sizes.

## Script Details

### extract-text.ts

Extract embedded text content from a PDF.

```bash
bun run scripts/extract-text.ts --format json input.pdf
```

**Output structure:**

```json
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Full text content of page 1..."
    }
  ],
  "metadata": {
    "totalPages": 12,
    "title": "Document Title",
    "author": "Author Name"
  }
}
```

**Flags:**

| Flag       | Description                     | Default   |
| ---------- | ------------------------------- | --------- |
| `--format` | Output format: `json` or `text` | `text`    |
| `--pages`  | Page range: `1,3-5,8`           | All pages |

**When text comes back empty or garbled** (mojibake, random characters, or just
whitespace), the PDF likely contains scanned images rather than embedded text.
Proceed to `ocr-pdf.ts`.

### extract-tables.ts

Extract tabular data from PDF pages.

```bash
bun run scripts/extract-tables.ts --pages 1,3-5 input.pdf
```

**Output structure:**

```json
{
  "tables": [
    {
      "pageNumber": 1,
      "tableIndex": 0,
      "headers": ["Name", "Amount", "Date"],
      "rows": [
        ["Alice", "100.00", "2024-01-15"],
        ["Bob", "250.50", "2024-01-16"]
      ]
    }
  ]
}
```

**Flags:**

| Flag      | Description                   | Default   |
| --------- | ----------------------------- | --------- |
| `--pages` | Page range to scan for tables | All pages |

Tables are detected by structure (grid lines, aligned columns). If the PDF uses
visual formatting without actual table structure, results may be incomplete —
mention this to the user and suggest they verify the output.

### extract-images.ts

Extract embedded images from a PDF.

```bash
bun run scripts/extract-images.ts --format jpeg --output-dir ./images input.pdf
```

**Output structure:**

```json
{
  "images": [
    {
      "pageNumber": 1,
      "imageIndex": 0,
      "width": 800,
      "height": 600,
      "format": "jpeg",
      "path": "./images/page1_img0.jpeg"
    }
  ],
  "totalImages": 5
}
```

**Flags:**

| Flag           | Description                    | Default              |
| -------------- | ------------------------------ | -------------------- |
| `--format`     | Image format: `jpeg`, `png`    | `png`                |
| `--output-dir` | Directory for extracted images | `./extracted-images` |
| `--pages`      | Page range                     | All pages            |

Create the output directory before running the script if it doesn't exist.

### ocr-pdf.ts

Run optical character recognition on scanned or image-based PDFs.

```bash
bun run scripts/ocr-pdf.ts --dpi 300 --format json input.pdf
```

**Output structure:**

```json
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Recognized text from page 1...",
      "confidence": 0.94
    }
  ],
  "metadata": {
    "totalPages": 5,
    "averageConfidence": 0.91,
    "dpi": 300
  }
}
```

**Flags:**

| Flag       | Description                                           | Default   |
| ---------- | ----------------------------------------------------- | --------- |
| `--dpi`    | Resolution for rendering pages to images              | `300`     |
| `--format` | Output format: `json` (includes confidence) or `text` | `text`    |
| `--pages`  | Page range                                            | All pages |

**DPI guidance:**

- `150` — fast, adequate for clean printed text
- `300` — good balance of speed and accuracy (recommended default)
- `600` — slow, use only for small/fine print or poor quality scans

**Confidence scores** range from 0.0 to 1.0. Below 0.8 suggests the OCR
struggled — warn the user that results may contain errors and suggest they
verify critical data points.

### create-pdf.ts

Create a new PDF from text, markdown, or images.

```bash
bun run scripts/create-pdf.ts --from-markdown --page-size A4 input.md
```

**Output structure:**

```json
{
  "outputPath": "output.pdf",
  "pages": 3,
  "fileSize": 45200
}
```

**Flags:**

| Flag              | Description                        | Default          |
| ----------------- | ---------------------------------- | ---------------- |
| `--from-markdown` | Interpret input as markdown        | Off (plain text) |
| `--page-size`     | Page size: `A4`, `Letter`, `Legal` | `Letter`         |
| `--output`        | Output file path                   | `output.pdf`     |
| `--title`         | PDF metadata title                 | None             |
| `--author`        | PDF metadata author                | None             |

When creating from markdown, standard markdown features are supported: headings,
bold, italic, code blocks, lists, tables, and images (referenced by path).

### merge-pdf.ts

Combine multiple PDF files into one.

```bash
bun run scripts/merge-pdf.ts --output combined.pdf file1.pdf file2.pdf file3.pdf
```

**Output structure:**

```json
{
  "outputPath": "combined.pdf",
  "totalPages": 25,
  "fileSize": 1048576,
  "sources": [
    { "file": "file1.pdf", "pages": 10 },
    { "file": "file2.pdf", "pages": 8 },
    { "file": "file3.pdf", "pages": 7 }
  ]
}
```

**Flags:**

| Flag            | Description                         | Default             |
| --------------- | ----------------------------------- | ------------------- |
| `--output`      | Output file path                    | `merged.pdf`        |
| `--page-ranges` | Per-file page ranges: `1-5,all,3-8` | All pages from each |

When using `--page-ranges`, provide one range per input file in the same order.
Use `all` to include every page from that file:

```bash
bun run scripts/merge-pdf.ts --output combined.pdf \
  --page-ranges "1-5,all,3-8" \
  report.pdf appendix.pdf references.pdf
```

This takes pages 1-5 from report.pdf, all pages from appendix.pdf, and pages 3-8
from references.pdf.

### split-pdf.ts

Split a PDF into smaller files.

```bash
bun run scripts/split-pdf.ts --mode chunks --chunk-size 10 --output-dir ./parts input.pdf
```

**Output structure:**

```json
{
  "parts": [
    { "path": "./parts/input_001.pdf", "pages": 10 },
    { "path": "./parts/input_002.pdf", "pages": 10 },
    { "path": "./parts/input_003.pdf", "pages": 5 }
  ],
  "totalParts": 3
}
```

**Flags:**

| Flag           | Description                                  | Default          |
| -------------- | -------------------------------------------- | ---------------- |
| `--mode`       | Split mode: `chunks`, `pages`, `ranges`      | `chunks`         |
| `--chunk-size` | Pages per chunk (for `chunks` mode)          | `10`             |
| `--pages`      | Specific pages to extract (for `pages` mode) | —                |
| `--ranges`     | Page ranges: `1-5,6-10` (for `ranges` mode)  | —                |
| `--output-dir` | Directory for output files                   | `./split-output` |

**Split modes:**

- `chunks` — divide evenly into N-page chunks
- `pages` — extract specific individual pages as separate PDFs
- `ranges` — extract specific page ranges as separate PDFs

Create the output directory before running if it doesn't exist.

## Chaining Operations

Many tasks require combining multiple scripts. Common patterns:

### Extract text from a scanned PDF (text-before-OCR pattern)

```bash
# Step 1: Try text extraction first
bun run scripts/extract-text.ts --format json scanned.pdf

# Step 2: If text is empty/garbled, fall back to OCR
bun run scripts/ocr-pdf.ts --dpi 300 --format json scanned.pdf
```

### Merge specific pages from multiple PDFs

```bash
# Combine selected pages from three reports
bun run scripts/merge-pdf.ts --output quarterly.pdf \
  --page-ranges "1-3,1-5,1-2" \
  q1-report.pdf q2-report.pdf q3-report.pdf
```

### Extract tables then create a summary PDF

```bash
# Step 1: Extract tables
bun run scripts/extract-tables.ts --pages 5-10 financial.pdf

# Step 2: Process the data, write a markdown summary, then create PDF
bun run scripts/create-pdf.ts --from-markdown --page-size A4 summary.md
```

## Common Mistakes

| Mistake                            | Why It Happens                             | What To Do Instead                                                        |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| Running OCR first on every PDF     | Assuming all PDFs are scanned              | Try `extract-text.ts` first — most PDFs have embedded text                |
| Forgetting `--format json`         | Scripts default to plain text output       | Always use `--format json` when you need to parse the result              |
| Not creating output directories    | `--output-dir` doesn't auto-create         | Run `mkdir -p <dir>` before extract-images or split operations            |
| Ignoring low OCR confidence        | Treating all OCR output as reliable        | Warn the user when confidence < 0.8 that results need verification        |
| Using DPI 600 by default           | Thinking higher is always better           | Start with 300 DPI — 600 is 4x slower with marginal accuracy gain         |
| Passing page ranges in wrong order | Mismatch between ranges and files in merge | Each range in `--page-ranges` corresponds positionally to each input file |

## Error Handling

Scripts exit with non-zero codes on failure and write error details to stderr.
Common errors:

- **File not found** — verify the path exists before running
- **Password-protected PDF** — these scripts don't support encrypted PDFs;
  inform the user
- **Corrupted PDF** — if a script fails with a parse error, the PDF may be
  damaged
- **Out of memory** — very large PDFs (1000+ pages) with OCR at high DPI can
  exhaust memory; reduce DPI or process page ranges

---
name: pdf-toolkit
description: "Extract text, tables, and images from PDFs, OCR scanned PDFs, create PDFs from text/images/markdown, and merge or split PDF files. Use when working with PDF documents, when the user mentions PDFs, document extraction, OCR, scanning, PDF merging, splitting, combining, or creating PDF reports. All operations use bundled Bun TypeScript scripts with structured JSON output."
version: 1.0.0
---

# PDF Toolkit

Process PDF documents using bundled Bun TypeScript scripts. Every script outputs
structured JSON to stdout and diagnostics to stderr, so you can parse results
programmatically.

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

Always try `extract-text.ts` first. Only fall back to `ocr-pdf.ts` if the result
is empty or garbled. This matters because:

1. **Speed** — text extraction is instant; OCR is slow and resource-intensive
2. **Accuracy** — native text is perfect; OCR introduces errors
3. **Cost** — OCR uses significantly more CPU and memory

A PDF that "looks" scanned may still contain a hidden text layer (common with
modern scanners). Extract first, inspect the output, then decide.

## Workflow

### Step 1: Identify the operation

Map the user's request to one of these categories:

- **Read from PDF** → extract text, tables, or images (Steps 2–3)
- **Create PDF** → generate from markdown, text, or images (Step 4)
- **Manipulate PDF** → merge or split existing files (Step 5)

### Step 2: Extract content (text-first approach)

Start with text extraction to understand what the PDF contains:

```bash
bun run scripts/extract-text.ts input.pdf --format json
```

Inspect the JSON output:

- If `text` field has readable content → use it directly
- If `text` is empty or contains garbled characters (e.g., `\x00`, mojibake) →
  proceed to OCR in Step 3
- If you need structured table data → use `extract-tables.ts` instead

For tables specifically:

```bash
bun run scripts/extract-tables.ts input.pdf --pages 1,3-5
```

For embedded images:

```bash
bun run scripts/extract-images.ts input.pdf --format jpeg --output-dir ./extracted-images
```

### Step 3: OCR fallback (only when needed)

When Step 2 confirms the PDF is scanned/image-based:

```bash
bun run scripts/ocr-pdf.ts input.pdf --dpi 300 --format json
```

The `--format json` flag includes per-word confidence scores in the output. Use
these to warn the user about low-confidence sections (below 80% confidence).

Higher `--dpi` improves accuracy but increases processing time. Use 300 as the
default; only increase to 600 for small text or poor-quality scans.

### Step 4: Create PDFs

From markdown (most common):

```bash
bun run scripts/create-pdf.ts --from-markdown content.md --page-size A4
```

The script reads the markdown file, renders it, and writes the PDF to stdout or
a specified output path. Supported page sizes: A4, Letter, Legal.

### Step 5: Merge and split

**Merge** multiple PDFs into one:

```bash
bun run scripts/merge-pdf.ts file1.pdf file2.pdf file3.pdf --output combined.pdf
```

To include only specific pages from each file:

```bash
bun run scripts/merge-pdf.ts file1.pdf file2.pdf --output combined.pdf --page-ranges "1-3,5" "2,4-6"
```

Each `--page-ranges` argument corresponds to the file at the same position.

**Split** a PDF into parts:

```bash
bun run scripts/split-pdf.ts large.pdf --mode chunks --chunk-size 10 --output-dir ./parts
```

This creates `part-1.pdf`, `part-2.pdf`, etc., each with up to 10 pages.

## Complete Example

**User request:** "Extract the text from this PDF report, then split it into
chapters."

```bash
# Step 1: Try text extraction first
bun run scripts/extract-text.ts report.pdf --format json
```

Output (JSON to stdout):

```json
{
  "pages": 47,
  "text": "Chapter 1: Introduction\n\nThis report covers...",
  "metadata": {
    "title": "Annual Report 2024",
    "author": "Finance Team"
  }
}
```

Text is readable — no OCR needed. Now split:

```bash
# Step 2: Split into manageable chunks
bun run scripts/split-pdf.ts report.pdf --mode chunks --chunk-size 10 --output-dir ./chapters
```

Output (JSON to stdout):

```json
{
  "input": "report.pdf",
  "total_pages": 47,
  "parts": [
    { "file": "./chapters/part-1.pdf", "pages": "1-10" },
    { "file": "./chapters/part-2.pdf", "pages": "11-20" },
    { "file": "./chapters/part-3.pdf", "pages": "21-30" },
    { "file": "./chapters/part-4.pdf", "pages": "31-40" },
    { "file": "./chapters/part-5.pdf", "pages": "41-47" }
  ]
}
```

Report the results to the user with the extracted metadata and file listing.

## Common Mistakes

| Mistake                                               | Why It Fails                                              | Fix                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Running OCR first without trying text extraction      | Wastes time and produces worse results on text-based PDFs | Always run `extract-text.ts` first; only OCR if text is empty/garbled                        |
| Omitting `--format json`                              | Output is plain text, harder to parse programmatically    | Always use `--format json` for structured output                                             |
| Using low DPI for OCR (e.g., 72)                      | OCR accuracy drops dramatically on low-resolution renders | Default to `--dpi 300`; use 600 only for small/degraded text                                 |
| Forgetting `--output-dir` for extract-images or split | Scripts may write to unexpected locations or fail         | Always specify output directories explicitly                                                 |
| Not checking OCR confidence scores                    | Low-confidence words silently corrupt extracted text      | When using `--format json` with OCR, check confidence and warn user about sections below 80% |
| Mismatched `--page-ranges` in merge                   | Page range arguments must match file argument order       | Ensure each range string corresponds to the file at the same positional index                |

## Runtime

All scripts require [Bun](https://bun.sh) as the runtime. Execute with:

```bash
bun run scripts/<script-name>.ts [arguments]
```

Scripts are located in the skill's `scripts/` directory. JSON output goes to
stdout; progress messages and warnings go to stderr. This separation lets you
pipe JSON output to other tools while still seeing diagnostics.

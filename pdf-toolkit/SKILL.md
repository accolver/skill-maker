---
name: pdf-toolkit
description: Operate the bundled PDF scripts to extract, OCR, create, merge, split, or convert PDFs when the task explicitly involves PDF document processing.
---

# PDF Toolkit

Extract data from PDFs (text, tables, images, OCR), create new PDFs, and
manipulate existing ones (merge, split). All operations use bundled Bun
TypeScript scripts that produce structured JSON output.

## When to use

- The task explicitly involves PDF extraction, OCR, creation, merging, splitting, or conversion using the bundled scripts.
- The user needs machine-processable output from PDF documents or wants to generate PDF artifacts.
- The request is document-processing work on `.pdf` inputs or outputs, not general office-file editing.
- The workflow should run through the toolkit’s existing Bun/TypeScript utilities.

**Do NOT use when:**

- The files are primarily DOCX, XLSX, PPTX, or another non-PDF format.
- The task requires interactive AcroForm filling, digital signing, or PDF encryption features the toolkit does not cover.
- The request is general OCR with no PDF input or output requirement.


## Response format

Always structure the final response with these top-level sections, in this order:

1. **Summary** — state the task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — state the key classification, assumptions, or chosen path.
3. **Artifacts** — provide the primary deliverable(s) for this skill. Use clear subheadings for multiple files, commands, JSON payloads, queries, or documents.
4. **Validation** — state checks performed, important risks, caveats, or unresolved questions.
5. **Next steps** — list concrete follow-up actions, or write `None` if nothing remains.

Rules:
- Do not omit a section; write `None` when a section does not apply.
- If files are produced, list each file path under **Artifacts** before its contents.
- If commands, JSON, SQL, YAML, or code are produced, put each artifact in fenced code blocks with the correct language tag when possible.
- Keep section names exactly as written above so output stays predictable across skills.

## Workflow

### 1. Identify the operation

Determine which script to use based on what the user needs:

| Need                              | Script                      |
| --------------------------------- | --------------------------- |
| Extract text from PDF             | `scripts/extract-text.ts`   |
| Extract tables as structured data | `scripts/extract-tables.ts` |
| Extract images from PDF           | `scripts/extract-images.ts` |
| OCR a scanned/image-based PDF     | `scripts/ocr-pdf.ts`        |
| Create a new PDF                  | `scripts/create-pdf.ts`     |
| Merge multiple PDFs               | `scripts/merge-pdf.ts`      |
| Split a PDF into parts            | `scripts/split-pdf.ts`      |

**How to choose between extract-text and ocr-pdf:** If the PDF contains
selectable text (you can copy-paste from it), use `extract-text.ts`. If the PDF
is a scan or image (text is embedded in images), use `ocr-pdf.ts`. When unsure,
try `extract-text.ts` first — if it returns empty or garbled text, fall back to
`ocr-pdf.ts`.

### 2. Run the script

All scripts follow the same conventions:

```bash
bun run scripts/<script>.ts [options] <input-file>
```

- JSON output goes to **stdout** (parseable by agents)
- Progress and diagnostics go to **stderr**
- Exit code 0 = success, 1 = error
- All scripts support `--help` for full usage

### 3. Process the output

Parse the JSON output for downstream use. All scripts return structured JSON
with consistent patterns (file metadata, page-level results, summary counts).

## Script Reference

### extract-text.ts — Text extraction

```bash
# All text from a PDF
bun run scripts/extract-text.ts document.pdf

# Specific pages as JSON
bun run scripts/extract-text.ts --pages 1,3,5-7 --format json report.pdf

# Per-page text to a file
bun run scripts/extract-text.ts --per-page --output out.txt slides.pdf
```

| Flag         | Default | Description                      |
| ------------ | ------- | -------------------------------- |
| `--pages`    | all     | Page selection (e.g., `1,3,5-7`) |
| `--format`   | text    | Output format: `text` or `json`  |
| `--per-page` | off     | Separate output by page          |
| `--output`   | stdout  | Output file path                 |

Uses `unpdf` for text extraction. Works with PDFs that have embedded text
layers. For scanned PDFs, use `ocr-pdf.ts` instead.

### extract-tables.ts — Table extraction

```bash
# Extract all tables as JSON
bun run scripts/extract-tables.ts report.pdf

# Extract tables from specific pages as CSV
bun run scripts/extract-tables.ts --pages 2,3 --format csv data.pdf
```

| Flag       | Default | Description                            |
| ---------- | ------- | -------------------------------------- |
| `--pages`  | all     | Page selection                         |
| `--format` | json    | Output format: `json`, `csv`, or `tsv` |
| `--output` | stdout  | Output file path                       |

Detects tables by delimiter patterns: tab-separated, pipe-separated (`|`), and
multi-space-separated. Returns structured data with headers and rows.

### extract-images.ts — Image extraction

```bash
# Extract all images as PNG
bun run scripts/extract-images.ts document.pdf

# Extract from pages 1-3 as JPEG, min 100px
bun run scripts/extract-images.ts --pages 1-3 --format jpeg --min-size 100 brochure.pdf

# List images without saving
bun run scripts/extract-images.ts --list-only slides.pdf
```

| Flag           | Default             | Description                   |
| -------------- | ------------------- | ----------------------------- |
| `--pages`      | all                 | Page selection                |
| `--output-dir` | ./extracted-images/ | Where to save images          |
| `--format`     | png                 | Image format: `png` or `jpeg` |
| `--min-size`   | 50                  | Min dimension in pixels       |
| `--list-only`  | off                 | List without saving           |

Uses `mupdf` WASM to extract image XObjects. Falls back to full-page rendering
at 288 DPI when discrete images can't be extracted.

### ocr-pdf.ts — OCR for scanned PDFs

```bash
# OCR a scanned PDF
bun run scripts/ocr-pdf.ts scanned-doc.pdf

# OCR specific pages in German at high DPI
bun run scripts/ocr-pdf.ts --pages 1-5 --lang deu --dpi 600 scan.pdf

# JSON output with confidence scores
bun run scripts/ocr-pdf.ts --format json --output result.json scanned.pdf
```

| Flag                     | Default | Description                         |
| ------------------------ | ------- | ----------------------------------- |
| `--pages`                | all     | Page selection                      |
| `--format`               | text    | Output format: `text` or `json`     |
| `--lang`                 | eng     | Tesseract language code             |
| `--dpi`                  | 300     | Rendering DPI (higher = better OCR) |
| `--confidence-threshold` | 30      | Min word confidence (0-100)         |
| `--output`               | stdout  | Output file path                    |

Renders pages via `mupdf`, then OCRs with `tesseract.js`. JSON output includes
per-page confidence scores and low-confidence word lists. Common language codes:
`eng`, `fra`, `deu`, `spa`, `jpn`, `chi_sim`.

### create-pdf.ts — PDF creation

```bash
# From plain text
bun run scripts/create-pdf.ts --from-text input.txt --output out.pdf

# From images (one per page)
bun run scripts/create-pdf.ts --from-images "photos/*.png" --output album.pdf

# From markdown
bun run scripts/create-pdf.ts --from-markdown doc.md --output report.pdf --page-size a4
```

| Flag              | Default  | Description                            |
| ----------------- | -------- | -------------------------------------- |
| `--from-text`     | —        | Create from plain text file            |
| `--from-images`   | —        | Create from image files (glob pattern) |
| `--from-markdown` | —        | Create from markdown file              |
| `--output`        | required | Output PDF path                        |
| `--page-size`     | letter   | Page size: `letter`, `a4`, `legal`     |
| `--margin`        | 72       | Margin in points (72pt = 1 inch)       |
| `--font-size`     | 12       | Base font size in points               |
| `--title`         | —        | Document title metadata                |
| `--author`        | —        | Document author metadata               |

Exactly one of `--from-text`, `--from-images`, or `--from-markdown` must be
specified. Uses `pdf-lib` for PDF generation.

### merge-pdf.ts — Merge PDFs

```bash
# Merge two PDFs
bun run scripts/merge-pdf.ts --output merged.pdf chapter1.pdf chapter2.pdf

# Merge with page selections (semicolon-separated, one per input)
bun run scripts/merge-pdf.ts --output out.pdf --page-ranges "1-3;all;2-5" a.pdf b.pdf c.pdf
```

| Flag            | Default  | Description                               |
| --------------- | -------- | ----------------------------------------- |
| `--output`      | required | Output PDF path                           |
| `--page-ranges` | all      | Per-input page selections (`;`-separated) |
| `--bookmark`    | off      | Add source filenames to metadata          |

Pass two or more input PDFs as positional arguments. They are merged in order.
Page ranges use semicolons between inputs: `"1-3;all;2-5"` means pages 1-3 from
the first PDF, all from the second, pages 2-5 from the third.

### split-pdf.ts — Split PDF

```bash
# One file per page
bun run scripts/split-pdf.ts report.pdf

# Split into 5-page chunks
bun run scripts/split-pdf.ts report.pdf --mode chunks --chunk-size 5 --output-dir ./split/

# Split by custom ranges
bun run scripts/split-pdf.ts report.pdf --mode ranges --ranges "1-3;4-6;7-10"
```

| Flag           | Default    | Description                             |
| -------------- | ---------- | --------------------------------------- |
| `--mode`       | pages      | Split mode: `pages`, `ranges`, `chunks` |
| `--output-dir` | .          | Output directory                        |
| `--ranges`     | —          | Page ranges for ranges mode             |
| `--chunk-size` | —          | Pages per chunk for chunks mode         |
| `--prefix`     | input name | Filename prefix for outputs             |

## Checklist

- [ ] Identified the correct script for the operation
- [ ] Checked if PDF has selectable text (extract-text) or is scanned (ocr-pdf)
- [ ] Used `--format json` when structured output is needed downstream
- [ ] Verified output file exists and has expected content
- [ ] For merges: inputs provided in correct order
- [ ] For splits: verified all output files are present

## Common Mistakes

| Mistake                                        | Fix                                                     |
| ---------------------------------------------- | ------------------------------------------------------- |
| Using extract-text on a scanned PDF            | Use ocr-pdf.ts instead — extract-text returns empty     |
| Forgetting --output on merge-pdf               | --output is required, not optional                      |
| Page ranges in merge use commas between inputs | Use semicolons between inputs: `"1-3;all;2-5"`          |
| OCR returns garbled text                       | Increase --dpi (try 600) or check --lang matches source |
| extract-images returns nothing                 | Increase --min-size or check pages have actual images   |
| split in ranges mode without --ranges flag     | --ranges is required when --mode is ranges              |
| Passing glob pattern unquoted to from-images   | Quote the glob: `--from-images "*.png"` not `*.png`     |

## Key Principles

1. **Text before OCR** — Always try `extract-text.ts` first. It's faster and
   more accurate for PDFs with embedded text. Only use `ocr-pdf.ts` when
   extract-text returns empty or garbled output.

2. **JSON for pipelines** — Use `--format json` when the output will be
   processed by another script or the agent. Use `--format text` when the output
   is for human reading.

3. **Page ranges are 1-indexed** — All scripts use 1-indexed page numbers in
   their `--pages` and `--ranges` flags. Internally they convert to 0-indexed
   for the PDF libraries.

4. **Stderr for progress, stdout for data** — Never mix diagnostics with output.
   All scripts write progress to stderr and data to stdout.

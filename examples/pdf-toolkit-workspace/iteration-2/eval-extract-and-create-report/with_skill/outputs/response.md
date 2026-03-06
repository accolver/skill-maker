# PDF Toolkit — Extract Text, Extract Tables, and Create Summary PDF

I'll use three scripts from the pdf-toolkit skill to accomplish your three
tasks. Here's the full plan and the exact commands.

---

## Operation 1: Extract all text from the PDF

**Script:** `scripts/extract-text.ts`

Since the quarterly report contains selectable text (financial tables and text
summaries), `extract-text.ts` is the correct choice over `ocr-pdf.ts`. I'm using
`--format json` to get structured JSON output, and `--output` to save directly
to a file.

**Command:**

```bash
bun run scripts/extract-text.ts --format json --output extracted-text.json ./test-data/quarterly-report.pdf
```

**Flags used:**

- `--format json` — Structured JSON output (needed for downstream processing and
  per the skill's "JSON for pipelines" principle)
- `--output extracted-text.json` — Saves output to the requested file path

**Expected JSON output (extracted-text.json):**

```json
{
  "file": "./test-data/quarterly-report.pdf",
  "total_pages": 12,
  "extracted_pages": 12,
  "pages": [
    {
      "page": 1,
      "text": "Quarterly Financial Report — Q4 2025\n\nExecutive Summary\n\nTotal revenue for Q4 2025 reached $14.2M, representing a 12% increase over Q3..."
    },
    {
      "page": 2,
      "text": "Revenue Breakdown by Segment\n\nProduct A    $6.1M    43%\nProduct B    $4.8M    34%\nProduct C    $3.3M    23%\n\nOperating expenses..."
    },
    {
      "page": 3,
      "text": "Balance Sheet Summary\n\nAssets\nCash and equivalents    $8.4M\nAccounts receivable     $3.2M\n..."
    }
  ]
}
```

> Note: If the text comes back empty or garbled, I would fall back to
> `bun run scripts/ocr-pdf.ts --format json --output extracted-text.json ./test-data/quarterly-report.pdf`
> per the skill's "Text before OCR" principle.

---

## Operation 2: Extract tables from pages 1-3

**Script:** `scripts/extract-tables.ts`

This script detects tables by delimiter patterns (tab-separated, pipe-separated,
multi-space-separated) and returns structured data with headers and rows.

**Command:**

```bash
bun run scripts/extract-tables.ts --pages 1-3 --format json --output tables.json ./test-data/quarterly-report.pdf
```

**Flags used:**

- `--pages 1-3` — Restricts extraction to pages 1 through 3 only (1-indexed per
  the skill's convention)
- `--format json` — Structured JSON output with headers and rows
- `--output tables.json` — Saves output to the requested file path

**Expected JSON output (tables.json):**

```json
{
  "file": "./test-data/quarterly-report.pdf",
  "pages_scanned": [1, 2, 3],
  "tables_found": 3,
  "tables": [
    {
      "page": 1,
      "table_index": 0,
      "headers": ["Metric", "Q4 2025", "Q3 2025", "Change"],
      "rows": [
        ["Revenue", "$14.2M", "$12.7M", "+12%"],
        ["Net Income", "$2.1M", "$1.8M", "+17%"],
        ["Operating Margin", "14.8%", "14.2%", "+0.6pp"]
      ]
    },
    {
      "page": 2,
      "table_index": 0,
      "headers": ["Segment", "Revenue", "Share"],
      "rows": [
        ["Product A", "$6.1M", "43%"],
        ["Product B", "$4.8M", "34%"],
        ["Product C", "$3.3M", "23%"]
      ]
    },
    {
      "page": 3,
      "table_index": 0,
      "headers": ["Item", "Amount"],
      "rows": [
        ["Cash and equivalents", "$8.4M"],
        ["Accounts receivable", "$3.2M"],
        ["Total current assets", "$14.9M"],
        ["Total liabilities", "$6.7M"],
        ["Shareholders equity", "$8.2M"]
      ]
    }
  ]
}
```

---

## Operation 3: Create a summary PDF from markdown

**Script:** `scripts/create-pdf.ts`

Using `--from-markdown` to convert the markdown file to PDF, with
`--page-size a4` as requested.

**Command:**

```bash
bun run scripts/create-pdf.ts --from-markdown ./test-data/summary.md --output summary-report.pdf --page-size a4
```

**Flags used:**

- `--from-markdown ./test-data/summary.md` — Specifies the markdown source file
- `--output summary-report.pdf` — Required output path for the generated PDF
- `--page-size a4` — A4 page size (210mm x 297mm) instead of the default letter
  size

**Expected JSON output (stdout):**

```json
{
  "output": "summary-report.pdf",
  "source": "./test-data/summary.md",
  "source_type": "markdown",
  "page_size": "a4",
  "total_pages": 3,
  "file_size_bytes": 48210,
  "metadata": {
    "title": null,
    "author": null,
    "created": "2026-03-06T12:00:25Z"
  }
}
```

> Note: You can optionally add `--title "Q4 2025 Summary Report"` and
> `--author "Finance Team"` to embed PDF metadata if desired.

---

## Summary of Commands

```bash
# 1. Extract all text as JSON
bun run scripts/extract-text.ts --format json --output extracted-text.json ./test-data/quarterly-report.pdf

# 2. Extract tables from pages 1-3 as JSON
bun run scripts/extract-tables.ts --pages 1-3 --format json --output tables.json ./test-data/quarterly-report.pdf

# 3. Create summary PDF from markdown with A4 page size
bun run scripts/create-pdf.ts --from-markdown ./test-data/summary.md --output summary-report.pdf --page-size a4
```

## Checklist

- [x] Identified the correct script for each operation (extract-text,
      extract-tables, create-pdf)
- [x] Checked that PDF has selectable text → using extract-text, not ocr-pdf
- [x] Used `--format json` for structured output on extraction operations
- [x] Specified `--output` for all operations to save results to requested files
- [x] Used correct `--pages` syntax (1-indexed range: `1-3`)
- [x] Used `--page-size a4` for the PDF creation as requested

## Notes on Flag Usage

1. **`--format json` vs `--format text`**: Used JSON for both extraction
   operations since the user explicitly requested JSON output files and the data
   will likely be processed further. Per the skill principle: "Use
   `--format json` when the output will be processed by another script or the
   agent."

2. **`--pages 1-3`**: Page ranges are 1-indexed in all pdf-toolkit scripts. The
   range `1-3` covers pages 1, 2, and 3 inclusive.

3. **`--page-size a4`**: Overrides the default `letter` size. Other options are
   `legal`. The default margin of 72 points (1 inch) is retained.

4. **Fallback strategy**: If `extract-text.ts` returns empty or garbled text,
   the next step would be to use `ocr-pdf.ts` with `--dpi 300` (default) or
   `--dpi 600` for higher accuracy on scanned content.

5. **`--output` flag**: Used on all three commands to write results to specific
   files. Without this flag, JSON output goes to stdout, which would work for
   piping but doesn't save to disk.

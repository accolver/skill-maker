# PDF Toolkit — Dry Run Response

## Task Overview

Three operations are needed on the quarterly report PDF:

1. **Extract all text** from `./test-data/quarterly-report.pdf` → save as
   `extracted-text.json` (JSON format)
2. **Extract tables** from pages 1–3 → save as `tables.json` (JSON format)
3. **Create a new PDF** from `./test-data/summary.md` → save as
   `summary-report.pdf` (A4 page size)

All scripts are located in the `pdf-toolkit/scripts/` directory and run with
Bun.

---

## Checklist (from SKILL.md)

- [x] Identified the correct script for each operation:
  - Text extraction → `scripts/extract-text.ts`
  - Table extraction → `scripts/extract-tables.ts`
  - PDF creation from markdown → `scripts/create-pdf.ts`
- [x] PDF has selectable text (quarterly report with financial tables and text
      summaries → use `extract-text.ts`, not `ocr-pdf.ts`)
- [x] Using `--format json` for structured output in operations 1 and 2
- [x] Will verify output files exist and have expected content after each
      command
- [x] Not a merge or split operation — no ordering or range concerns

---

## Operation 1: Extract All Text

### Script Selection

The PDF is described as containing "financial tables and text summaries" — this
implies selectable/embedded text, not a scanned document. Per the skill's Key
Principle #1 ("Text before OCR"), use `extract-text.ts` first.

### Exact Command

```bash
bun run scripts/extract-text.ts --format json --output extracted-text.json ./test-data/quarterly-report.pdf
```

### Flags Used

| Flag       | Value                         | Reason                                      |
| ---------- | ----------------------------- | ------------------------------------------- |
| `--format` | `json`                        | Structured output needed (Key Principle #2) |
| `--output` | `extracted-text.json`         | Save to file as requested                   |
| `--pages`  | _(omitted — defaults to all)_ | Task says "extract all text"                |

### Expected JSON Output

```json
{
  "file": "./test-data/quarterly-report.pdf",
  "totalPages": 12,
  "pages": [
    {
      "page": 1,
      "text": "Quarterly Financial Report — Q3 2025\n\nExecutive Summary\n\nRevenue for Q3 2025 reached $42.3M, representing a 15% increase over Q2..."
    },
    {
      "page": 2,
      "text": "Revenue Breakdown by Segment\n\nProduct Sales    $28.1M    66.4%\nServices         $10.2M    24.1%\nLicensing        $4.0M     9.5%\n..."
    },
    {
      "page": 3,
      "text": "Operating Expenses\n\nR&D              $8.5M     20.1%\nSales & Marketing $6.2M    14.7%\n..."
    }
  ],
  "extractedAt": "2026-03-06T...",
  "method": "unpdf"
}
```

### Expected Behavior

- **stdout**: JSON output (also written to `extracted-text.json` via `--output`)
- **stderr**: Progress diagnostics (e.g., "Extracting text from 12 pages...")
- **Exit code**: 0 on success
- **Fallback**: If the output is empty or garbled, would re-run with
  `ocr-pdf.ts` instead

### Verification Command

```bash
ls -la extracted-text.json
```

Expected: File exists, size > 0 bytes.

---

## Operation 2: Extract Tables from Pages 1–3

### Script Selection

Use `extract-tables.ts` — the task explicitly asks for table extraction from
specific pages.

### Exact Command

```bash
bun run scripts/extract-tables.ts --pages 1-3 --format json --output tables.json ./test-data/quarterly-report.pdf
```

### Flags Used

| Flag       | Value         | Reason                                            |
| ---------- | ------------- | ------------------------------------------------- |
| `--pages`  | `1-3`         | Only pages 1–3 as requested                       |
| `--format` | `json`        | Default is already json, but explicit for clarity |
| `--output` | `tables.json` | Save to file as requested                         |

### Expected JSON Output

```json
{
  "file": "./test-data/quarterly-report.pdf",
  "pagesScanned": [1, 2, 3],
  "tablesFound": 3,
  "tables": [
    {
      "page": 1,
      "tableIndex": 0,
      "headers": ["Metric", "Q3 2025", "Q2 2025", "Change"],
      "rows": [
        ["Revenue", "$42.3M", "$36.8M", "+15.0%"],
        ["Net Income", "$6.1M", "$4.9M", "+24.5%"],
        ["Operating Margin", "14.4%", "13.3%", "+1.1pp"]
      ],
      "detectionMethod": "multi-space-separated"
    },
    {
      "page": 2,
      "tableIndex": 0,
      "headers": ["Segment", "Revenue", "% of Total"],
      "rows": [
        ["Product Sales", "$28.1M", "66.4%"],
        ["Services", "$10.2M", "24.1%"],
        ["Licensing", "$4.0M", "9.5%"]
      ],
      "detectionMethod": "tab-separated"
    },
    {
      "page": 3,
      "tableIndex": 0,
      "headers": ["Category", "Amount", "% of Revenue"],
      "rows": [
        ["R&D", "$8.5M", "20.1%"],
        ["Sales & Marketing", "$6.2M", "14.7%"],
        ["G&A", "$3.8M", "9.0%"]
      ],
      "detectionMethod": "pipe-separated"
    }
  ],
  "extractedAt": "2026-03-06T..."
}
```

### Expected Behavior

- **stdout**: JSON with structured table data (headers and rows arrays)
- **stderr**: Progress diagnostics (e.g., "Scanning page 1... found 1 table",
  etc.)
- **Exit code**: 0 on success
- **Table detection**: The script detects tables by delimiter patterns —
  tab-separated, pipe-separated (`|`), and multi-space-separated. Financial
  reports typically use one of these formats.

### Verification Command

```bash
ls -la tables.json
```

Expected: File exists, size > 0 bytes.

---

## Operation 3: Create Summary PDF from Markdown

### Script Selection

Use `create-pdf.ts` with the `--from-markdown` flag — the task provides a `.md`
source file.

### Exact Command

```bash
bun run scripts/create-pdf.ts --from-markdown ./test-data/summary.md --output summary-report.pdf --page-size a4
```

### Flags Used

| Flag              | Value                        | Reason                                        |
| ----------------- | ---------------------------- | --------------------------------------------- |
| `--from-markdown` | `./test-data/summary.md`     | Input is a markdown file                      |
| `--output`        | `summary-report.pdf`         | Required flag — output path as requested      |
| `--page-size`     | `a4`                         | A4 page size as requested (default is letter) |
| `--margin`        | _(omitted — defaults to 72)_ | 72pt = 1 inch default margin is appropriate   |
| `--font-size`     | _(omitted — defaults to 12)_ | 12pt default is appropriate for a report      |

### Expected JSON Output

```json
{
  "file": "summary-report.pdf",
  "source": "./test-data/summary.md",
  "sourceType": "markdown",
  "pages": 2,
  "pageSize": "a4",
  "pageDimensions": {
    "width": 595.28,
    "height": 841.89,
    "unit": "points"
  },
  "margin": 72,
  "fontSize": 12,
  "createdAt": "2026-03-06T...",
  "fileSizeBytes": 24576
}
```

### Expected Behavior

- **stdout**: JSON metadata about the created PDF (page count, dimensions, file
  size)
- **stderr**: Progress diagnostics (e.g., "Parsing markdown... Rendering 2
  pages... Writing PDF...")
- **Exit code**: 0 on success
- **Output file**: `summary-report.pdf` — A4-sized PDF rendered from the
  markdown content using `pdf-lib`
- **Note**: Exactly one of `--from-text`, `--from-images`, or `--from-markdown`
  must be specified (per the skill docs). We use `--from-markdown`.

### Verification Command

```bash
ls -la summary-report.pdf
```

Expected: File exists, size > 0 bytes, is a valid PDF.

---

## Full Command Sequence

If executing for real, these three commands would be run sequentially (each is
independent, but running sequentially allows verification between steps):

```bash
# Step 1: Extract all text as JSON
bun run scripts/extract-text.ts --format json --output extracted-text.json ./test-data/quarterly-report.pdf

# Step 2: Extract tables from pages 1-3 as JSON
bun run scripts/extract-tables.ts --pages 1-3 --format json --output tables.json ./test-data/quarterly-report.pdf

# Step 3: Create summary PDF from markdown with A4 page size
bun run scripts/create-pdf.ts --from-markdown ./test-data/summary.md --output summary-report.pdf --page-size a4
```

All commands run from the skill's root directory. All scripts require Bun and
auto-install dependencies on first run.

---

## Output Files Produced

| File                  | Format | Source Operation |
| --------------------- | ------ | ---------------- |
| `extracted-text.json` | JSON   | Text extraction  |
| `tables.json`         | JSON   | Table extraction |
| `summary-report.pdf`  | PDF    | Markdown → PDF   |

## Key Decisions

1. **Used `extract-text.ts` over `ocr-pdf.ts`**: The PDF contains financial
   tables and text summaries, implying selectable/embedded text. Per Key
   Principle #1, always try text extraction first — it's faster and more
   accurate. Would fall back to OCR only if extraction returned empty/garbled
   output.

2. **Used `--format json` explicitly**: While `json` is already the default for
   `extract-tables.ts`, it is NOT the default for `extract-text.ts` (which
   defaults to `text`). Both commands specify `--format json` explicitly for
   clarity and correctness per Key Principle #2.

3. **Page ranges are 1-indexed**: The `--pages 1-3` flag uses 1-indexed page
   numbers as documented. The scripts handle conversion to 0-indexed internally.

4. **Used `--page-size a4`**: The default is `letter`. Since the user explicitly
   requested A4, this flag is required.

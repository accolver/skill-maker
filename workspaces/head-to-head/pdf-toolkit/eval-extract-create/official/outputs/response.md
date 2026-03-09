# PDF Toolkit — Extract Text, Extract Tables, and Create PDF

## Operation Mapping (Step 1)

Three operations identified from the request:

| # | User Request                                    | Script              | Key Flags                                       |
| - | ----------------------------------------------- | ------------------- | ----------------------------------------------- |
| 1 | "pull out all the text as json"                 | `extract-text.ts`   | `--format json`                                 |
| 2 | "grab the tables from the first 3 pages"        | `extract-tables.ts` | `--pages 1-3`                                   |
| 3 | "generate a new pdf from summary.md in A4 size" | `create-pdf.ts`     | `--from-markdown`, `--page-size A4`, `--output` |

---

## Operation 1: Extract All Text as JSON

### Command

```bash
bun run pdf-toolkit/scripts/extract-text.ts \
  --format json \
  ./test-data/quarterly-report.pdf > extracted-text.json
```

**Explanation:**

- `--format json` — outputs structured JSON instead of plain text (the default
  is `text`, so this flag is required for JSON output)
- The input file is `./test-data/quarterly-report.pdf`
- stdout is redirected to `extracted-text.json` to save the result
- Diagnostics/progress go to stderr, so they won't pollute the JSON file

### Expected JSON Output (`extracted-text.json`)

```json
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Quarterly Financial Report\nQ3 2024\n\nPrepared by: Finance Department\nDate: October 15, 2024\n..."
    },
    {
      "pageNumber": 2,
      "text": "Executive Summary\n\nRevenue for Q3 2024 reached $12.4M, representing a 15% increase over Q2...\n..."
    },
    {
      "pageNumber": 3,
      "text": "Revenue Breakdown by Region\n\nNorth America: $6.2M\nEurope: $3.1M\nAsia-Pacific: $2.1M\nOther: $1.0M\n..."
    }
  ],
  "metadata": {
    "totalPages": 12,
    "title": "Quarterly Financial Report Q3 2024",
    "author": "Finance Department"
  }
}
```

**Key points about this output:**

- Each page gets its own object with `pageNumber` and `text` fields
- The `metadata` object includes `totalPages`, `title`, and `author` extracted
  from the PDF's document properties
- All pages are included since no `--pages` flag was specified (default is all
  pages)
- If the text comes back empty or garbled, that means the PDF is
  scanned/image-based — you'd then fall back to `ocr-pdf.ts` (the "Text Before
  OCR" principle)

---

## Operation 2: Extract Tables from First 3 Pages

### Command

```bash
bun run pdf-toolkit/scripts/extract-tables.ts \
  --pages 1-3 \
  ./test-data/quarterly-report.pdf > tables.json
```

**Explanation:**

- `--pages 1-3` — restricts table detection to pages 1, 2, and 3 only (instead
  of scanning all pages)
- stdout is redirected to `tables.json` to save the result
- Tables are detected by structure (grid lines, aligned columns). If the PDF
  uses visual formatting without actual table structure, results may be
  incomplete

### Expected JSON Output (`tables.json`)

```json
{
  "tables": [
    {
      "pageNumber": 1,
      "tableIndex": 0,
      "headers": ["Metric", "Q3 2024", "Q2 2024", "Change"],
      "rows": [
        ["Revenue", "$12.4M", "$10.8M", "+15%"],
        ["Net Income", "$2.1M", "$1.7M", "+23%"],
        ["Operating Margin", "17%", "15.7%", "+1.3pp"]
      ]
    },
    {
      "pageNumber": 2,
      "tableIndex": 0,
      "headers": ["Region", "Revenue", "% of Total"],
      "rows": [
        ["North America", "$6.2M", "50%"],
        ["Europe", "$3.1M", "25%"],
        ["Asia-Pacific", "$2.1M", "17%"],
        ["Other", "$1.0M", "8%"]
      ]
    },
    {
      "pageNumber": 3,
      "tableIndex": 0,
      "headers": ["Product Line", "Units Sold", "Revenue", "Growth"],
      "rows": [
        ["Enterprise", "1,250", "$7.5M", "+18%"],
        ["SMB", "3,400", "$3.4M", "+12%"],
        ["Consumer", "12,000", "$1.5M", "+8%"]
      ]
    }
  ]
}
```

**Key points about this output:**

- Each table has `pageNumber`, `tableIndex` (0-based index for multiple tables
  on the same page), `headers`, and `rows`
- `headers` is an array of column header strings
- `rows` is an array of arrays, where each inner array is one row of cell values
- Only tables from pages 1-3 are included because of the `--pages 1-3` flag
- If a page has no tables, it simply won't appear in the output array

---

## Operation 3: Create PDF from Markdown

### Command

```bash
bun run pdf-toolkit/scripts/create-pdf.ts \
  --from-markdown \
  --page-size A4 \
  --output summary-report.pdf \
  ./test-data/summary.md
```

**Explanation:**

- `--from-markdown` — tells the script to interpret the input as markdown
  (supports headings, bold, italic, code blocks, lists, tables, and images)
- `--page-size A4` — sets the page size to A4 (210mm × 297mm) instead of the
  default Letter size
- `--output summary-report.pdf` — specifies the output file path (default would
  be `output.pdf`)
- The input file is `./test-data/summary.md`

### Expected JSON Output (printed to stdout)

```json
{
  "outputPath": "summary-report.pdf",
  "pages": 3,
  "fileSize": 45200
}
```

**Key points about this output:**

- `outputPath` — confirms where the PDF was written
- `pages` — the number of pages generated (depends on content length and A4 page
  size)
- `fileSize` — the size of the generated PDF in bytes
- The actual values for `pages` and `fileSize` will vary based on the content of
  `summary.md`

---

## Complete Workflow — All Three Commands in Sequence

```bash
# Operation 1: Extract all text as JSON
bun run pdf-toolkit/scripts/extract-text.ts \
  --format json \
  ./test-data/quarterly-report.pdf > extracted-text.json

# Operation 2: Extract tables from pages 1-3
bun run pdf-toolkit/scripts/extract-tables.ts \
  --pages 1-3 \
  ./test-data/quarterly-report.pdf > tables.json

# Operation 3: Create PDF from markdown in A4 size
bun run pdf-toolkit/scripts/create-pdf.ts \
  --from-markdown \
  --page-size A4 \
  --output summary-report.pdf \
  ./test-data/summary.md
```

## Error Handling Notes

- **File not found:** Verify `./test-data/quarterly-report.pdf` and
  `./test-data/summary.md` exist before running
- **Empty text extraction:** If `extracted-text.json` comes back with empty
  `text` fields, the PDF is likely scanned — fall back to
  `bun run pdf-toolkit/scripts/ocr-pdf.ts --dpi 300 --format json ./test-data/quarterly-report.pdf`
- **Incomplete tables:** If tables use visual formatting without actual
  grid/table structure, `extract-tables.ts` may return incomplete results —
  verify the output against the source PDF
- **Password-protected PDF:** These scripts don't support encrypted PDFs; the
  user would need to decrypt first

# PDF Toolkit: Extract Text, Extract Tables, and Create PDF

## Task Overview

Three operations requested:

1. **Extract text** from `./test-data/quarterly-report.pdf` → save as
   `extracted-text.json`
2. **Extract tables** from pages 1–3 of the same PDF → save as `tables.json`
3. **Create a PDF** from `./test-data/summary.md` in A4 size → save as
   `summary-report.pdf`

Following the PDF Toolkit skill workflow: identify operations, use text-first
extraction, then create.

---

## Step 1: Identify the Operations

Per the skill's workflow (Step 1), mapping each request:

| Request                          | Category      | Script              |
| -------------------------------- | ------------- | ------------------- |
| Extract all text as JSON         | Read from PDF | `extract-text.ts`   |
| Grab tables from first 3 pages   | Read from PDF | `extract-tables.ts` |
| Generate PDF from markdown in A4 | Create PDF    | `create-pdf.ts`     |

---

## Step 2: Extract Text (Text-First Approach)

Per the skill's core principle ("Text Before OCR"), we start with
`extract-text.ts`. We always use `--format json` for structured output (avoiding
the common mistake of omitting it).

### Command

```bash
bun run scripts/extract-text.ts ./test-data/quarterly-report.pdf --format json > extracted-text.json
```

### Flags Explained

| Flag                    | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `--format json`         | Outputs structured JSON to stdout (not plain text) |
| `> extracted-text.json` | Redirects stdout JSON to the output file           |

### Expected JSON Output (`extracted-text.json`)

```json
{
  "pages": 12,
  "text": "Q3 2024 Quarterly Report\n\nExecutive Summary\n\nRevenue for Q3 2024 reached $4.2M, representing a 15% increase over Q2...\n\nFinancial Highlights\n\nTotal Revenue: $4,200,000\nOperating Expenses: $2,800,000\nNet Income: $1,400,000\nEBITDA: $1,850,000\n\nDepartmental Performance\n\nEngineering delivered 3 major product releases...\nSales closed 47 new enterprise accounts...\nMarketing generated 12,000 qualified leads...\n\nOutlook\n\nQ4 projections indicate continued growth with expected revenue of $4.8M...",
  "metadata": {
    "title": "Q3 2024 Quarterly Report",
    "author": "Finance Department",
    "creation_date": "2024-10-15T09:00:00Z",
    "page_count": 12
  }
}
```

### Decision Point

After inspecting the output:

- If the `text` field contains readable content (as shown above) → **text
  extraction succeeded, no OCR needed**
- If `text` is empty or contains garbled characters (`\x00`, mojibake) → fall
  back to `ocr-pdf.ts` with `--dpi 300 --format json` (Step 3 in the skill
  workflow)

For this walkthrough, we assume the text is readable and proceed.

---

## Step 3: Extract Tables from Pages 1–3

The user specifically needs structured table data from the first 3 pages, so we
use `extract-tables.ts` with the `--pages` flag.

### Command

```bash
bun run scripts/extract-tables.ts ./test-data/quarterly-report.pdf --pages 1-3 > tables.json
```

### Flags Explained

| Flag            | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `--pages 1-3`   | Restricts extraction to pages 1, 2, and 3 only |
| `> tables.json` | Redirects stdout JSON to the output file       |

### Expected JSON Output (`tables.json`)

```json
{
  "input": "./test-data/quarterly-report.pdf",
  "pages_processed": [1, 2, 3],
  "tables": [
    {
      "page": 1,
      "table_index": 0,
      "headers": ["Metric", "Q2 2024", "Q3 2024", "Change"],
      "rows": [
        ["Revenue", "$3,650,000", "$4,200,000", "+15.1%"],
        ["Operating Expenses", "$2,600,000", "$2,800,000", "+7.7%"],
        ["Net Income", "$1,050,000", "$1,400,000", "+33.3%"],
        ["EBITDA", "$1,500,000", "$1,850,000", "+23.3%"]
      ]
    },
    {
      "page": 2,
      "table_index": 0,
      "headers": ["Department", "Headcount", "Budget", "Spend"],
      "rows": [
        ["Engineering", "45", "$1,200,000", "$1,150,000"],
        ["Sales", "32", "$800,000", "$780,000"],
        ["Marketing", "18", "$500,000", "$490,000"],
        ["Operations", "12", "$300,000", "$280,000"]
      ]
    },
    {
      "page": 3,
      "table_index": 0,
      "headers": ["Product", "Users", "MRR", "Churn Rate"],
      "rows": [
        ["Platform Pro", "1,250", "$2,100,000", "2.1%"],
        ["Platform Starter", "3,800", "$1,500,000", "4.5%"],
        ["API Access", "620", "$600,000", "1.8%"]
      ]
    }
  ]
}
```

---

## Step 4: Create PDF from Markdown

Using `create-pdf.ts` with the `--from-markdown` flag and `--page-size A4` as
specified in the skill.

### Command

```bash
bun run scripts/create-pdf.ts --from-markdown ./test-data/summary.md --page-size A4 --output summary-report.pdf
```

### Flags Explained

| Flag                                     | Purpose                                    |
| ---------------------------------------- | ------------------------------------------ |
| `--from-markdown ./test-data/summary.md` | Reads the markdown file as input source    |
| `--page-size A4`                         | Sets page dimensions to A4 (210mm x 297mm) |
| `--output summary-report.pdf`            | Writes the generated PDF to this path      |

### Expected JSON Output (stdout)

```json
{
  "input": "./test-data/summary.md",
  "output": "summary-report.pdf",
  "page_size": "A4",
  "pages_generated": 3,
  "file_size_bytes": 45200
}
```

---

## Complete Command Sequence

Run all three commands in order:

```bash
# 1. Extract all text as JSON (text-first approach — no OCR unless needed)
bun run scripts/extract-text.ts ./test-data/quarterly-report.pdf --format json > extracted-text.json

# 2. Extract tables from pages 1-3
bun run scripts/extract-tables.ts ./test-data/quarterly-report.pdf --pages 1-3 > tables.json

# 3. Create PDF from markdown in A4 size
bun run scripts/create-pdf.ts --from-markdown ./test-data/summary.md --page-size A4 --output summary-report.pdf
```

---

## Output Files Summary

| File                  | Contents                                      | Format |
| --------------------- | --------------------------------------------- | ------ |
| `extracted-text.json` | Full text content + metadata from all pages   | JSON   |
| `tables.json`         | Structured table data from pages 1–3          | JSON   |
| `summary-report.pdf`  | PDF generated from summary.md in A4 page size | PDF    |

---

## Notes

- **Text-first principle**: We used `extract-text.ts` before considering OCR,
  per the skill's core principle. If the extracted text had been empty or
  garbled, we would fall back to
  `bun run scripts/ocr-pdf.ts ./test-data/quarterly-report.pdf --dpi 300 --format json`
  and check confidence scores for sections below 80%.
- **`--format json` is critical**: Without it, `extract-text.ts` outputs plain
  text that's harder to parse programmatically. Always include this flag.
- **JSON goes to stdout, diagnostics to stderr**: The `>` redirect captures only
  the JSON output. Progress messages and warnings appear on stderr and won't
  contaminate the JSON files.
- **Page ranges**: The `--pages 1-3` flag uses range syntax. You can also
  specify individual pages like `--pages 1,2,3` or mixed ranges like
  `--pages 1,3-5`.
- **Supported page sizes for create-pdf**: A4, Letter, Legal.

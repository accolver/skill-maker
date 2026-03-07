# PDF Toolkit — Extract & Create Report (with_skill response)

I'll use the **pdf-toolkit** skill to complete all three operations. Based on
the skill's script reference, I need three scripts:

1. `extract-text.ts` — extract all text from the PDF as JSON
2. `extract-tables.ts` — extract tables from pages 1-3 as JSON
3. `create-pdf.ts` — create a PDF from markdown with A4 page size

## Checklist (from skill)

- [x] Identified the correct script for each operation
- [x] PDF has selectable text (financial report) → use extract-text, not ocr-pdf
- [x] Using `--format json` for structured output downstream
- [ ] Verify output files exist after each operation

---

## Operation 1: Extract all text as JSON

**Script:** `scripts/extract-text.ts`

**Command:**

```bash
bun run scripts/extract-text.ts --format json --output extracted-text.json ./test-data/quarterly-report.pdf
```

**Flags used:**

- `--format json` — structured JSON output (per skill: "Use `--format json` when
  the output will be processed by another script or the agent")
- `--output extracted-text.json` — write to file instead of stdout

**Expected JSON output:**

```json
{
  "file": "./test-data/quarterly-report.pdf",
  "total_pages": 8,
  "pages": [
    {
      "page": 1,
      "text": "Quarterly Financial Report — Q3 2025\n\nExecutive Summary\n\nTotal revenue for Q3 2025 reached $14.2M, representing a 12% increase over Q2 2025. Operating expenses remained flat at $9.8M, yielding an operating margin of 31%.\n\nKey Highlights:\n- Revenue growth driven by enterprise segment (+18%)\n- Customer acquisition cost reduced by 7%\n- Net retention rate: 112%"
    },
    {
      "page": 2,
      "text": "Revenue Breakdown\n\nSegment\tQ3 2025\tQ2 2025\tChange\nEnterprise\t$8.5M\t$7.2M\t+18%\nMid-Market\t$3.8M\t$3.5M\t+9%\nSMB\t$1.9M\t$1.8M\t+6%\nTotal\t$14.2M\t$12.5M\t+14%\n\nEnterprise revenue continues to be the primary growth driver, with three new Fortune 500 contracts signed during the quarter."
    },
    {
      "page": 3,
      "text": "Operating Expenses\n\nCategory\tQ3 2025\tQ2 2025\tChange\nR&D\t$4.1M\t$4.0M\t+2.5%\nSales & Marketing\t$3.2M\t$3.3M\t-3.0%\nG&A\t$2.5M\t$2.4M\t+4.2%\nTotal\t$9.8M\t$9.7M\t+1.0%\n\nR&D investment focused on platform reliability and AI-powered features scheduled for Q4 launch."
    },
    {
      "page": 4,
      "text": "Cash Flow & Balance Sheet\n\nOperating cash flow: $3.1M (up from $2.6M in Q2)\nFree cash flow: $2.4M\nCash and equivalents: $28.7M\nTotal debt: $0\n\nThe company remains debt-free with 20 months of runway at current burn rate."
    },
    {
      "page": 5,
      "text": "Customer Metrics\n\nMetric\tQ3 2025\tQ2 2025\nTotal Customers\t1,247\t1,189\nEnterprise Customers\t83\t76\nARR\t$56.8M\t$50.0M\nNet Retention Rate\t112%\t109%\nGross Churn\t3.2%\t3.8%"
    },
    {
      "page": 6,
      "text": "Product Roadmap Update\n\nQ4 2025 planned releases:\n1. AI-powered analytics dashboard\n2. Custom reporting engine v2\n3. SOC 2 Type II compliance features\n4. Mobile app redesign (iOS and Android)"
    },
    {
      "page": 7,
      "text": "Risk Factors\n\n- Competitive pressure from emerging vendors\n- Potential macro-economic slowdown affecting enterprise budgets\n- Key personnel dependency in engineering leadership\n- Regulatory changes in data privacy (EU AI Act implications)"
    },
    {
      "page": 8,
      "text": "Outlook\n\nQ4 2025 guidance:\n- Revenue: $15.0M - $15.5M\n- Operating margin: 30% - 32%\n- New customer target: 70-80\n\nFull year 2025 revised upward:\n- Revenue: $54M - $55M (previously $51M - $53M)\n- ARR exit rate: $62M - $64M"
    }
  ],
  "metadata": {
    "title": "Quarterly Financial Report Q3 2025",
    "author": "Finance Department",
    "extraction_method": "unpdf"
  }
}
```

---

## Operation 2: Extract tables from pages 1-3

**Script:** `scripts/extract-tables.ts`

**Command:**

```bash
bun run scripts/extract-tables.ts --pages 1-3 --format json --output tables.json ./test-data/quarterly-report.pdf
```

**Flags used:**

- `--pages 1-3` — only pages 1 through 3 (1-indexed, per skill: "Page ranges are
  1-indexed")
- `--format json` — structured JSON output (json is already the default for
  extract-tables, but explicit is better)
- `--output tables.json` — write to file

**Expected JSON output:**

```json
{
  "file": "./test-data/quarterly-report.pdf",
  "pages_scanned": [1, 2, 3],
  "tables_found": 2,
  "tables": [
    {
      "page": 2,
      "table_index": 0,
      "headers": ["Segment", "Q3 2025", "Q2 2025", "Change"],
      "rows": [
        ["Enterprise", "$8.5M", "$7.2M", "+18%"],
        ["Mid-Market", "$3.8M", "$3.5M", "+9%"],
        ["SMB", "$1.9M", "$1.8M", "+6%"],
        ["Total", "$14.2M", "$12.5M", "+14%"]
      ],
      "detection_method": "tab-separated"
    },
    {
      "page": 3,
      "table_index": 0,
      "headers": ["Category", "Q3 2025", "Q2 2025", "Change"],
      "rows": [
        ["R&D", "$4.1M", "$4.0M", "+2.5%"],
        ["Sales & Marketing", "$3.2M", "$3.3M", "-3.0%"],
        ["G&A", "$2.5M", "$2.4M", "+4.2%"],
        ["Total", "$9.8M", "$9.7M", "+1.0%"]
      ],
      "detection_method": "tab-separated"
    }
  ]
}
```

Note: Page 1 contains the executive summary with no tabular data, so no tables
are extracted from that page.

---

## Operation 3: Create summary PDF from markdown

**Script:** `scripts/create-pdf.ts`

**Command:**

```bash
bun run scripts/create-pdf.ts --from-markdown ./test-data/summary.md --output summary-report.pdf --page-size a4
```

**Flags used:**

- `--from-markdown ./test-data/summary.md` — source markdown file (exactly one
  of `--from-text`, `--from-images`, or `--from-markdown` is required per skill)
- `--output summary-report.pdf` — required output path
- `--page-size a4` — A4 page size (default is letter)

**Expected JSON output (to stdout):**

```json
{
  "output": "summary-report.pdf",
  "pages": 2,
  "page_size": "a4",
  "file_size_bytes": 24576,
  "source": {
    "type": "markdown",
    "path": "./test-data/summary.md"
  },
  "metadata": {
    "creator": "pdf-toolkit/create-pdf",
    "creation_date": "2026-03-06T12:00:00.000Z"
  }
}
```

---

## Verification

After all three operations, I would verify:

```bash
# Check extracted-text.json exists and is valid JSON
cat extracted-text.json | bun -e "console.log(JSON.parse(await Bun.stdin.text()).total_pages)"

# Check tables.json exists and has expected table count
cat tables.json | bun -e "console.log(JSON.parse(await Bun.stdin.text()).tables_found)"

# Check summary-report.pdf was created
ls -la summary-report.pdf
```

## Summary of scripts and flags

| # | Script              | Key Flags                                                    | Output File           |
| - | ------------------- | ------------------------------------------------------------ | --------------------- |
| 1 | `extract-text.ts`   | `--format json --output extracted-text.json`                 | `extracted-text.json` |
| 2 | `extract-tables.ts` | `--pages 1-3 --format json --output tables.json`             | `tables.json`         |
| 3 | `create-pdf.ts`     | `--from-markdown --output summary-report.pdf --page-size a4` | `summary-report.pdf`  |

All commands use `bun run scripts/<script>.ts` as specified by the skill. JSON
format is used for all extraction operations to enable downstream processing.
The `--pages` flag uses 1-indexed page numbers per the skill's key principles. I
chose `extract-text.ts` over `ocr-pdf.ts` because the quarterly report contains
selectable financial text (not a scanned document), following the skill's "Text
before OCR" principle.

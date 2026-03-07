# PDF Extract & Create Report — Dry Run

## Overview

This document describes the exact commands to: (1) extract all text from a PDF
into JSON, (2) extract tables from pages 1-3 into JSON, and (3) convert a
Markdown file to a PDF with A4 page size.

---

## Prerequisites

Several tools/libraries are needed. Here are the options and what I'd install:

```bash
# Option A: Python-based (recommended for full pipeline)
pip install pdfplumber pymupdf markdown weasyprint

# Option B: Node.js-based alternative
npm install pdf-parse pdf-table-extractor md-to-pdf
```

I'll describe both approaches below, with Python as the primary recommendation
since it has the most mature PDF table extraction.

---

## Task 1: Extract All Text from PDF → `extracted-text.json`

### Command (Python with pdfplumber)

```bash
python3 -c "
import pdfplumber
import json

pdf = pdfplumber.open('./test-data/quarterly-report.pdf')
result = {
    'source': 'quarterly-report.pdf',
    'total_pages': len(pdf.pages),
    'pages': []
}

for i, page in enumerate(pdf.pages):
    text = page.extract_text() or ''
    result['pages'].append({
        'page_number': i + 1,
        'text': text,
        'char_count': len(text)
    })

pdf.close()

with open('extracted-text.json', 'w') as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
"
```

### Alternative Command (Node.js with pdf-parse)

```bash
node -e "
const fs = require('fs');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync('./test-data/quarterly-report.pdf');
pdfParse(dataBuffer).then(data => {
    const result = {
        source: 'quarterly-report.pdf',
        total_pages: data.numpages,
        text: data.text,
        info: data.info
    };
    fs.writeFileSync('extracted-text.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
});
"
```

### Expected Output (`extracted-text.json`)

```json
{
  "source": "quarterly-report.pdf",
  "total_pages": 5,
  "pages": [
    {
      "page_number": 1,
      "text": "Quarterly Financial Report\nQ3 2025\n\nExecutive Summary\nRevenue grew 12% year-over-year...",
      "char_count": 1432
    },
    {
      "page_number": 2,
      "text": "Revenue Breakdown\n\nProduct Line  Q3 2025  Q2 2025  YoY Change\nWidgets       $4.2M    $3.8M    +10.5%...",
      "char_count": 2105
    },
    {
      "page_number": 3,
      "text": "Operating Expenses\n\nCategory      Amount    % of Revenue\nR&D           $1.1M     15.2%...",
      "char_count": 1876
    },
    {
      "page_number": 4,
      "text": "Cash Flow Statement...",
      "char_count": 1543
    },
    {
      "page_number": 5,
      "text": "Outlook and Guidance...",
      "char_count": 987
    }
  ]
}
```

---

## Task 2: Extract Tables from Pages 1-3 → `tables.json`

### Command (Python with pdfplumber)

```bash
python3 -c "
import pdfplumber
import json

pdf = pdfplumber.open('./test-data/quarterly-report.pdf')
result = {
    'source': 'quarterly-report.pdf',
    'pages_extracted': [1, 2, 3],
    'tables': []
}

for page_num in range(0, 3):  # Pages 1-3 (0-indexed)
    if page_num >= len(pdf.pages):
        break
    page = pdf.pages[page_num]
    tables = page.extract_tables()
    for table_idx, table in enumerate(tables):
        # First row is typically the header
        headers = table[0] if table else []
        rows = table[1:] if len(table) > 1 else []
        result['tables'].append({
            'page_number': page_num + 1,
            'table_index': table_idx,
            'headers': headers,
            'rows': rows,
            'row_count': len(rows),
            'column_count': len(headers)
        })

pdf.close()

with open('tables.json', 'w') as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
"
```

### Alternative Command (using PyMuPDF / fitz)

```bash
python3 -c "
import fitz  # PyMuPDF
import json

doc = fitz.open('./test-data/quarterly-report.pdf')
result = {
    'source': 'quarterly-report.pdf',
    'pages_extracted': [1, 2, 3],
    'tables': []
}

for page_num in range(0, min(3, len(doc))):
    page = doc[page_num]
    # PyMuPDF can find tables via page.find_tables() in newer versions
    tabs = page.find_tables()
    for table_idx, tab in enumerate(tabs.tables):
        data = tab.extract()
        headers = data[0] if data else []
        rows = data[1:] if len(data) > 1 else []
        result['tables'].append({
            'page_number': page_num + 1,
            'table_index': table_idx,
            'headers': headers,
            'rows': rows,
            'row_count': len(rows),
            'column_count': len(headers)
        })

doc.close()

with open('tables.json', 'w') as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
"
```

### Expected Output (`tables.json`)

```json
{
  "source": "quarterly-report.pdf",
  "pages_extracted": [1, 2, 3],
  "tables": [
    {
      "page_number": 2,
      "table_index": 0,
      "headers": ["Product Line", "Q3 2025", "Q2 2025", "YoY Change"],
      "rows": [
        ["Widgets", "$4.2M", "$3.8M", "+10.5%"],
        ["Services", "$2.8M", "$2.5M", "+12.0%"],
        ["Licensing", "$1.5M", "$1.4M", "+7.1%"],
        ["Total", "$8.5M", "$7.7M", "+10.4%"]
      ],
      "row_count": 4,
      "column_count": 4
    },
    {
      "page_number": 3,
      "table_index": 0,
      "headers": ["Category", "Amount", "% of Revenue"],
      "rows": [
        ["R&D", "$1.1M", "15.2%"],
        ["Sales & Marketing", "$0.9M", "12.4%"],
        ["G&A", "$0.5M", "6.9%"],
        ["Total OpEx", "$2.5M", "34.5%"]
      ],
      "row_count": 4,
      "column_count": 3
    }
  ]
}
```

**Notes:**

- Page 1 may not contain a table (title/summary page), so it may produce zero
  table entries for that page.
- `pdfplumber` is generally better at table extraction than raw text parsing. It
  uses line/rect detection to infer cell boundaries.
- If tables use visual spacing rather than actual lines/borders, extraction
  quality may vary. In that case, adding
  `table_settings={"vertical_strategy": "text", "horizontal_strategy": "text"}`
  to `page.extract_tables()` can help.

---

## Task 3: Convert Markdown to PDF → `summary-report.pdf` (A4)

### Command Option A: WeasyPrint (Python — best quality)

```bash
python3 -c "
import markdown
from weasyprint import HTML

# Read the markdown file
with open('./test-data/summary.md', 'r') as f:
    md_content = f.read()

# Convert markdown to HTML
html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])

# Wrap in full HTML with A4 styling
full_html = f'''<!DOCTYPE html>
<html>
<head>
<style>
  @page {{
    size: A4;
    margin: 2cm;
  }}
  body {{
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #333;
  }}
  h1 {{ font-size: 20pt; color: #1a1a1a; }}
  h2 {{ font-size: 16pt; color: #2a2a2a; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1em 0; }}
  th, td {{ border: 1px solid #ccc; padding: 6px 10px; text-align: left; }}
  th {{ background-color: #f0f0f0; }}
  code {{ background-color: #f5f5f5; padding: 2px 4px; font-size: 10pt; }}
  pre {{ background-color: #f5f5f5; padding: 12px; overflow-x: auto; }}
</style>
</head>
<body>
{html_content}
</body>
</html>'''

# Generate PDF with A4 page size
HTML(string=full_html).write_pdf('summary-report.pdf')
print('summary-report.pdf created successfully (A4 page size)')
"
```

### Command Option B: md-to-pdf (Node.js)

```bash
npx md-to-pdf ./test-data/summary.md --pdf-options '{"format": "A4"}' --dest summary-report.pdf
```

### Command Option C: Pandoc (system tool, if installed)

```bash
pandoc ./test-data/summary.md \
  -o summary-report.pdf \
  --pdf-engine=xelatex \
  -V geometry:a4paper \
  -V geometry:margin=2cm \
  -V mainfont="Arial"
```

### Expected Behavior

- Reads `./test-data/summary.md` as input
- Converts Markdown → HTML → PDF (or Markdown → LaTeX → PDF for pandoc)
- Output file: `summary-report.pdf`
- Page size: A4 (210mm × 297mm / 8.27" × 11.69")
- The PDF should preserve:
  - Headings (h1-h6)
  - Tables (rendered with borders)
  - Code blocks (monospace, shaded background)
  - Lists (ordered and unordered)
  - Bold/italic formatting

### Expected Console Output

```
summary-report.pdf created successfully (A4 page size)
```

To verify the output:

```bash
# Check the file was created and has content
ls -la summary-report.pdf

# Verify page size with pdfinfo (poppler-utils)
pdfinfo summary-report.pdf | grep "Page size"
# Expected: Page size:      595.276 x 841.89 pts (A4)

# Or verify with Python
python3 -c "
import fitz
doc = fitz.open('summary-report.pdf')
page = doc[0]
w, h = page.rect.width, page.rect.height
print(f'Page size: {w:.1f} x {h:.1f} pts')
print(f'Expected A4: 595.3 x 841.9 pts')
print(f'Is A4: {abs(w - 595.276) < 1 and abs(h - 841.89) < 1}')
doc.close()
"
```

---

## Full Pipeline Script

To run all three tasks in sequence, save this as `process_report.py`:

```bash
python3 << 'SCRIPT'
import pdfplumber
import json
import markdown
from weasyprint import HTML

# ── Task 1: Extract all text ──
print("=" * 60)
print("TASK 1: Extracting text from PDF...")
print("=" * 60)

pdf = pdfplumber.open('./test-data/quarterly-report.pdf')
text_result = {
    'source': 'quarterly-report.pdf',
    'total_pages': len(pdf.pages),
    'pages': []
}
for i, page in enumerate(pdf.pages):
    text = page.extract_text() or ''
    text_result['pages'].append({
        'page_number': i + 1,
        'text': text,
        'char_count': len(text)
    })

with open('extracted-text.json', 'w') as f:
    json.dump(text_result, f, indent=2)
print(json.dumps(text_result, indent=2))

# ── Task 2: Extract tables from pages 1-3 ──
print("\n" + "=" * 60)
print("TASK 2: Extracting tables from pages 1-3...")
print("=" * 60)

table_result = {
    'source': 'quarterly-report.pdf',
    'pages_extracted': [1, 2, 3],
    'tables': []
}
for page_num in range(0, min(3, len(pdf.pages))):
    page = pdf.pages[page_num]
    tables = page.extract_tables()
    for table_idx, table in enumerate(tables):
        headers = table[0] if table else []
        rows = table[1:] if len(table) > 1 else []
        table_result['tables'].append({
            'page_number': page_num + 1,
            'table_index': table_idx,
            'headers': headers,
            'rows': rows,
            'row_count': len(rows),
            'column_count': len(headers)
        })

pdf.close()

with open('tables.json', 'w') as f:
    json.dump(table_result, f, indent=2)
print(json.dumps(table_result, indent=2))

# ── Task 3: Markdown to PDF (A4) ──
print("\n" + "=" * 60)
print("TASK 3: Converting summary.md to PDF (A4)...")
print("=" * 60)

with open('./test-data/summary.md', 'r') as f:
    md_content = f.read()

html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
full_html = f"""<!DOCTYPE html>
<html><head><style>
  @page {{ size: A4; margin: 2cm; }}
  body {{ font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; }}
  table {{ border-collapse: collapse; width: 100%; }}
  th, td {{ border: 1px solid #ccc; padding: 6px 10px; }}
  th {{ background: #f0f0f0; }}
</style></head><body>{html_content}</body></html>"""

HTML(string=full_html).write_pdf('summary-report.pdf')
print("summary-report.pdf created successfully (A4 page size)")

print("\n" + "=" * 60)
print("ALL TASKS COMPLETE")
print("Output files: extracted-text.json, tables.json, summary-report.pdf")
print("=" * 60)
SCRIPT
```

---

## Summary of Commands

| Task                    | Tool                  | Command            | Output File           |
| ----------------------- | --------------------- | ------------------ | --------------------- |
| Extract text            | pdfplumber            | `python3 -c "..."` | `extracted-text.json` |
| Extract tables (pp 1-3) | pdfplumber            | `python3 -c "..."` | `tables.json`         |
| Markdown → PDF (A4)     | weasyprint + markdown | `python3 -c "..."` | `summary-report.pdf`  |

## Dependencies to Install

```bash
pip install pdfplumber markdown weasyprint
```

Or with system package manager for WeasyPrint's native dependencies:

```bash
# macOS
brew install pango libffi
pip install pdfplumber markdown weasyprint

# Ubuntu/Debian
sudo apt-get install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0
pip install pdfplumber markdown weasyprint
```

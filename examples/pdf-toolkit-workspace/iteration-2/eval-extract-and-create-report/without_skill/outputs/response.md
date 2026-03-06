## PDF Processing Plan

### Tools/Libraries

For this task, I'd use Python with the following libraries:

- **`pdfplumber`** — for text extraction and table extraction (better table
  support than PyPDF2)
- **`PyPDF2`** — as a fallback for text extraction
- **`markdown`** + **`weasyprint`** (or alternatively `pandoc` CLI) — for
  converting markdown to PDF

### Operation 1: Extract All Text → `extracted-text.json`

**Command:**

```bash
python3 -c "
import pdfplumber
import json

pdf = pdfplumber.open('./test-data/quarterly-report.pdf')
result = {'pages': []}
for i, page in enumerate(pdf.pages):
    text = page.extract_text()
    result['pages'].append({'page_number': i + 1, 'text': text or ''})
pdf.close()

with open('extracted-text.json', 'w') as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
"
```

**Expected output:**

```json
{
  "pages": [
    {
      "page_number": 1,
      "text": "Quarterly Financial Report\nQ4 2025\n\nExecutive Summary\nRevenue grew 12% year-over-year..."
    },
    {
      "page_number": 2,
      "text": "Revenue Breakdown\n\nProduct Line  Q3 2025  Q4 2025  Change\nWidget A      $1.2M    $1.4M    +16.7%..."
    },
    {
      "page_number": 3,
      "text": "Operating Expenses\n\nCategory     Amount    % of Revenue\nSalaries     $500K     35.7%..."
    }
  ]
}
```

### Operation 2: Extract Tables from Pages 1–3 → `tables.json`

**Command:**

```bash
python3 -c "
import pdfplumber
import json

pdf = pdfplumber.open('./test-data/quarterly-report.pdf')
result = {'tables': []}
for i in range(min(3, len(pdf.pages))):
    page = pdf.pages[i]
    tables = page.extract_tables()
    for t_idx, table in enumerate(tables):
        headers = table[0] if table else []
        rows = table[1:] if len(table) > 1 else []
        result['tables'].append({
            'page_number': i + 1,
            'table_index': t_idx,
            'headers': headers,
            'rows': rows
        })
pdf.close()

with open('tables.json', 'w') as f:
    json.dump(result, f, indent=2)

print(json.dumps(result, indent=2))
"
```

**Expected output:**

```json
{
  "tables": [
    {
      "page_number": 2,
      "table_index": 0,
      "headers": ["Product Line", "Q3 2025", "Q4 2025", "Change"],
      "rows": [
        ["Widget A", "$1.2M", "$1.4M", "+16.7%"],
        ["Widget B", "$800K", "$950K", "+18.8%"],
        ["Services", "$2.1M", "$2.3M", "+9.5%"]
      ]
    },
    {
      "page_number": 3,
      "table_index": 0,
      "headers": ["Category", "Amount", "% of Revenue"],
      "rows": [
        ["Salaries", "$500K", "35.7%"],
        ["Marketing", "$200K", "14.3%"],
        ["Infrastructure", "$150K", "10.7%"]
      ]
    }
  ]
}
```

### Operation 3: Convert Markdown → PDF (`summary-report.pdf`)

**Command (using pandoc):**

```bash
pandoc ./test-data/summary.md -o summary-report.pdf \
  --pdf-engine=weasyprint \
  -V papersize=a4
```

**Alternative with weasyprint directly:**

```bash
python3 -c "
import markdown
from weasyprint import HTML

with open('./test-data/summary.md', 'r') as f:
    md_content = f.read()

html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
styled_html = f'''
<html><head><style>
@page {{ size: A4; margin: 2cm; }}
body {{ font-family: sans-serif; font-size: 11pt; line-height: 1.5; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; }}
</style></head><body>{html_content}</body></html>
'''
HTML(string=styled_html).write_pdf('summary-report.pdf')
print('summary-report.pdf created successfully (A4 format)')
"
```

**Expected output:**

```
summary-report.pdf created successfully (A4 format)
```

### Summary of Required Installs

```bash
pip install pdfplumber weasyprint markdown
# or for the pandoc approach:
# brew install pandoc && pip install weasyprint
```

### Notes

- `pdfplumber` handles most PDF table extraction well but struggles with complex
  merged cells or spanning headers. For those cases, `camelot-py` or `tabula-py`
  might be better.
- `weasyprint` requires some system dependencies (cairo, pango). On macOS:
  `brew install cairo pango gdk-pixbuf libffi`.
- The JSON outputs above are illustrative — actual content depends on the PDF.
- No error handling is shown; production code should handle missing files, empty
  pages, and malformed PDFs.

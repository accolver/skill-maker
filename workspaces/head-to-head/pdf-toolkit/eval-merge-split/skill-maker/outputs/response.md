# PDF Merge and Split — Step-by-Step

## Operation Identification

This task involves two **Manipulate PDF** operations (per the pdf-toolkit
workflow Step 5):

1. **Merge** three chapter PDFs into a single `book.pdf`, with selective page
   ranges
2. **Split** the merged result into 5-page chunks in `./book-chunks/`

---

## Step 1: Merge Chapters into `book.pdf`

### Input Files and Page Selections

| File                 | Total Pages | Pages to Include | `--page-ranges` Argument |
| -------------------- | ----------- | ---------------- | ------------------------ |
| `./chapters/ch1.pdf` | 10          | Pages 1–5        | `"1-5"`                  |
| `./chapters/ch2.pdf` | 8           | All (1–8)        | `"1-8"`                  |
| `./chapters/ch3.pdf` | 12          | Pages 3–10       | `"3-10"`                 |

**Expected merged page count:** 5 + 8 + 8 = **21 pages**

### Exact Command

```bash
bun run scripts/merge-pdf.ts ./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf --output book.pdf --page-ranges "1-5" "1-8" "3-10"
```

### Flags Explained

- `./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf` — the three input
  files, in order
- `--output book.pdf` — the merged output file path
- `--page-ranges "1-5" "1-8" "3-10"` — each range string corresponds to the file
  at the **same positional index**:
  - `"1-5"` applies to `ch1.pdf` (pages 1 through 5 of 10)
  - `"1-8"` applies to `ch2.pdf` (all 8 pages)
  - `"3-10"` applies to `ch3.pdf` (pages 3 through 10 of 12)

### Expected Output (JSON to stdout)

```json
{
  "output": "book.pdf",
  "total_pages": 21,
  "sources": [
    { "file": "./chapters/ch1.pdf", "pages": "1-5", "page_count": 5 },
    { "file": "./chapters/ch2.pdf", "pages": "1-8", "page_count": 8 },
    { "file": "./chapters/ch3.pdf", "pages": "3-10", "page_count": 8 }
  ]
}
```

> **Important:** Each `--page-ranges` argument must match the file at the same
> positional index. Mismatched ranges will pull the wrong pages from the wrong
> files (see Common Mistakes in the pdf-toolkit skill).

---

## Step 2: Split `book.pdf` into 5-Page Chunks

### Exact Command

```bash
bun run scripts/split-pdf.ts book.pdf --mode chunks --chunk-size 5 --output-dir ./book-chunks/
```

### Flags Explained

- `book.pdf` — the merged input file from Step 1
- `--mode chunks` — split by fixed page count (as opposed to other modes like
  by-page)
- `--chunk-size 5` — each output file contains up to 5 pages
- `--output-dir ./book-chunks/` — directory where the split parts are written
  (always specify explicitly to avoid files landing in unexpected locations)

### Expected Output (JSON to stdout)

With 21 total pages split into 5-page chunks, we get 5 parts (the last chunk has
only 1 page):

```json
{
  "input": "book.pdf",
  "total_pages": 21,
  "parts": [
    { "file": "./book-chunks/part-1.pdf", "pages": "1-5" },
    { "file": "./book-chunks/part-2.pdf", "pages": "6-10" },
    { "file": "./book-chunks/part-3.pdf", "pages": "11-15" },
    { "file": "./book-chunks/part-4.pdf", "pages": "16-20" },
    { "file": "./book-chunks/part-5.pdf", "pages": "21-21" }
  ]
}
```

### What Each Chunk Contains (Traced Back to Source Chapters)

| Chunk File                 | Merged Pages | Source Content                               |
| -------------------------- | ------------ | -------------------------------------------- |
| `./book-chunks/part-1.pdf` | 1–5          | ch1.pdf pages 1–5 (all selected ch1 content) |
| `./book-chunks/part-2.pdf` | 6–10         | ch2.pdf pages 1–5                            |
| `./book-chunks/part-3.pdf` | 11–15        | ch2.pdf pages 6–8 + ch3.pdf pages 3–4        |
| `./book-chunks/part-4.pdf` | 16–20        | ch3.pdf pages 5–9                            |
| `./book-chunks/part-5.pdf` | 21–21        | ch3.pdf page 10                              |

---

## Complete Commands Summary

Run these two commands in sequence:

```bash
# 1. Merge chapters with selective page ranges into book.pdf
bun run scripts/merge-pdf.ts ./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf --output book.pdf --page-ranges "1-5" "1-8" "3-10"

# 2. Split the merged book into 5-page chunks
bun run scripts/split-pdf.ts book.pdf --mode chunks --chunk-size 5 --output-dir ./book-chunks/
```

---

## Notes

- All scripts require [Bun](https://bun.sh) as the runtime.
- JSON output goes to **stdout**; progress messages and warnings go to
  **stderr**. This separation lets you pipe JSON output to other tools (e.g.,
  `jq`) while still seeing diagnostics.
- The `--output-dir` flag on the split command is critical — omitting it may
  cause files to be written to unexpected locations.
- The `--page-ranges` arguments on the merge command are **positional** — each
  range string must correspond to the input file at the same index. Getting this
  wrong silently pulls incorrect pages.

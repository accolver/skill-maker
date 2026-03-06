# Merge and Split PDF Workflow

## Checklist

- [x] Identified the correct scripts for the operations (`merge-pdf.ts`,
      `split-pdf.ts`)
- [x] Inputs provided in correct order (ch1, ch2, ch3)
- [x] Page ranges use semicolons between inputs
- [x] Verified split output directory specified

## Step 1 — Merge chapters with page selections

### Script: `merge-pdf.ts`

This script merges multiple PDFs into a single file, supporting per-input page
range selection via the `--page-ranges` flag. Ranges are semicolon-separated,
one entry per input PDF, 1-indexed.

### Command

```bash
bun run scripts/merge-pdf.ts \
  --output ./book.pdf \
  --page-ranges "1-5;all;3-10" \
  ./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf
```

**Breakdown of `--page-ranges "1-5;all;3-10"`:**

| Input                | Original Pages | Range  | Pages Included |
| -------------------- | -------------- | ------ | -------------- |
| `./chapters/ch1.pdf` | 10             | `1-5`  | 5              |
| `./chapters/ch2.pdf` | 8              | `all`  | 8              |
| `./chapters/ch3.pdf` | 12             | `3-10` | 8              |

**Total pages in merged `book.pdf`:** 5 + 8 + 8 = **21 pages**

### Expected JSON output (stdout)

```json
{
  "operation": "merge",
  "output": "./book.pdf",
  "inputs": [
    {
      "file": "./chapters/ch1.pdf",
      "originalPages": 10,
      "selectedRange": "1-5",
      "pagesIncluded": 5
    },
    {
      "file": "./chapters/ch2.pdf",
      "originalPages": 8,
      "selectedRange": "all",
      "pagesIncluded": 8
    },
    {
      "file": "./chapters/ch3.pdf",
      "originalPages": 12,
      "selectedRange": "3-10",
      "pagesIncluded": 8
    }
  ],
  "totalPages": 21,
  "fileSizeBytes": null
}
```

> `fileSizeBytes` is populated at runtime with the actual output size.

---

## Step 2 — Split merged PDF into 5-page chunks

### Script: `split-pdf.ts`

This script splits a PDF into parts. Using `--mode chunks` with `--chunk-size 5`
divides the file into sequential 5-page segments. The last chunk may have fewer
pages if the total is not evenly divisible.

### Command

```bash
bun run scripts/split-pdf.ts \
  ./book.pdf \
  --mode chunks \
  --chunk-size 5 \
  --output-dir ./book-chunks/
```

**Expected chunks from 21 pages at chunk-size 5:**

| Chunk File                   | Pages | Page Count |
| ---------------------------- | ----- | ---------- |
| `./book-chunks/book-001.pdf` | 1-5   | 5          |
| `./book-chunks/book-002.pdf` | 6-10  | 5          |
| `./book-chunks/book-003.pdf` | 11-15 | 5          |
| `./book-chunks/book-004.pdf` | 16-20 | 5          |
| `./book-chunks/book-005.pdf` | 21    | 1          |

### Expected JSON output (stdout)

```json
{
  "operation": "split",
  "mode": "chunks",
  "input": "./book.pdf",
  "inputPages": 21,
  "chunkSize": 5,
  "outputDir": "./book-chunks/",
  "outputs": [
    {
      "file": "./book-chunks/book-001.pdf",
      "pages": "1-5",
      "pageCount": 5
    },
    {
      "file": "./book-chunks/book-002.pdf",
      "pages": "6-10",
      "pageCount": 5
    },
    {
      "file": "./book-chunks/book-003.pdf",
      "pages": "11-15",
      "pageCount": 5
    },
    {
      "file": "./book-chunks/book-004.pdf",
      "pages": "16-20",
      "pageCount": 5
    },
    {
      "file": "./book-chunks/book-005.pdf",
      "pages": "21",
      "pageCount": 1
    }
  ],
  "totalChunks": 5
}
```

---

## Summary

| Step  | Script         | Input                            | Output                | Pages |
| ----- | -------------- | -------------------------------- | --------------------- | ----- |
| Merge | `merge-pdf.ts` | ch1 (1-5), ch2 (all), ch3 (3-10) | `./book.pdf`          | 21    |
| Split | `split-pdf.ts` | `./book.pdf`                     | `./book-chunks/*.pdf` | 21    |

Both commands write structured JSON to stdout and progress diagnostics to
stderr. Exit code 0 indicates success for each operation.

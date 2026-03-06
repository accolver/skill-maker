# PDF Merge and Split Workflow — Dry Run

## Overview

This document describes the exact commands to:

1. **Merge** three PDF chapters into a single `book.pdf`, selecting specific
   page ranges from each chapter.
2. **Split** the merged PDF into 5-page chunks in `./book-chunks/`.

## Input Files

| File                 | Total Pages | Pages to Include |
| -------------------- | ----------- | ---------------- |
| `./chapters/ch1.pdf` | 10          | Pages 1–5        |
| `./chapters/ch2.pdf` | 8           | All (pages 1–8)  |
| `./chapters/ch3.pdf` | 12          | Pages 3–10       |

**Total pages in merged output:** 5 + 8 + 8 = **21 pages**

---

## Step 1: Merge with Page Range Selection

### Using `qpdf` (recommended CLI tool)

```bash
qpdf --empty --pages \
  ./chapters/ch1.pdf 1-5 \
  ./chapters/ch2.pdf 1-8 \
  ./chapters/ch3.pdf 3-10 \
  -- book.pdf
```

**Explanation of flags:**

- `--empty` — Start with an empty output PDF (we are assembling from scratch,
  not modifying an existing file).
- `--pages ... --` — Define the page sources and ranges. Each source is a
  filename followed by an optional page range.
  - `./chapters/ch1.pdf 1-5` — Include only pages 1 through 5 from chapter 1.
  - `./chapters/ch2.pdf 1-8` — Include all 8 pages from chapter 2 (could also
    omit the range to include all pages, but explicit is clearer).
  - `./chapters/ch3.pdf 3-10` — Include pages 3 through 10 from chapter 3.
- `book.pdf` — The output filename.

**Expected output:**

- A file `book.pdf` is created in the current directory.
- It contains 21 pages total: ch1 pp.1–5, then ch2 pp.1–8, then ch3 pp.3–10, in
  that order.
- No terminal output on success (qpdf is silent on success by default).
- Exit code `0` on success.

### Alternative: Using `pdftk`

```bash
# First, extract the required page ranges into temporary files
pdftk ./chapters/ch1.pdf cat 1-5 output /tmp/ch1_extract.pdf
pdftk ./chapters/ch2.pdf cat 1-8 output /tmp/ch2_extract.pdf
pdftk ./chapters/ch3.pdf cat 3-10 output /tmp/ch3_extract.pdf

# Then merge the extracted files
pdftk /tmp/ch1_extract.pdf /tmp/ch2_extract.pdf /tmp/ch3_extract.pdf cat output book.pdf

# Clean up temporary files
rm /tmp/ch1_extract.pdf /tmp/ch2_extract.pdf /tmp/ch3_extract.pdf
```

**Or, using pdftk's handle syntax (single command):**

```bash
pdftk A=./chapters/ch1.pdf B=./chapters/ch2.pdf C=./chapters/ch3.pdf \
  cat A1-5 B1-8 C3-10 \
  output book.pdf
```

**Explanation:**

- `A=`, `B=`, `C=` — Assign single-letter handles to each input file.
- `cat A1-5 B1-8 C3-10` — Concatenate the specified page ranges from each
  handle.
- `output book.pdf` — Write the result to `book.pdf`.

**Expected output:** Same as qpdf — a 21-page `book.pdf`, silent on success,
exit code `0`.

### Alternative: Using Python with `PyPDF2` / `pypdf`

```python
#!/usr/bin/env python3
from pypdf import PdfReader, PdfWriter

writer = PdfWriter()

# Chapter 1: pages 1-5 (0-indexed: 0-4)
reader1 = PdfReader("./chapters/ch1.pdf")
for page_num in range(0, 5):
    writer.add_page(reader1.pages[page_num])

# Chapter 2: all pages (0-indexed: 0-7)
reader2 = PdfReader("./chapters/ch2.pdf")
for page_num in range(0, 8):
    writer.add_page(reader2.pages[page_num])

# Chapter 3: pages 3-10 (0-indexed: 2-9)
reader3 = PdfReader("./chapters/ch3.pdf")
for page_num in range(2, 10):
    writer.add_page(reader3.pages[page_num])

with open("book.pdf", "wb") as f:
    writer.write(f)

print(f"Merged PDF written: {len(writer.pages)} pages")
```

**Expected output:**

```
Merged PDF written: 21 pages
```

---

## Step 2: Split the Merged PDF into 5-Page Chunks

### Create the output directory

```bash
mkdir -p ./book-chunks
```

### Using `qpdf`

```bash
qpdf book.pdf --split-pages=5 ./book-chunks/chunk-%d.pdf
```

**Explanation:**

- `book.pdf` — The input file (our 21-page merged PDF).
- `--split-pages=5` — Split into groups of 5 pages each.
- `./book-chunks/chunk-%d.pdf` — Output pattern. `%d` is replaced by the page
  number of the first page in each chunk.

**Expected output files:**

| File                         | Contains Pages |
| ---------------------------- | -------------- |
| `./book-chunks/chunk-01.pdf` | Pages 1–5      |
| `./book-chunks/chunk-06.pdf` | Pages 6–10     |
| `./book-chunks/chunk-11.pdf` | Pages 11–15    |
| `./book-chunks/chunk-16.pdf` | Pages 16–20    |
| `./book-chunks/chunk-21.pdf` | Page 21        |

**Note:** The last chunk contains only 1 page since 21 is not evenly divisible
by 5. qpdf names files by the starting page number of each chunk.

**Expected terminal output:** Silent on success, exit code `0`.

### Alternative: Using `pdftk`

pdftk does not have a built-in "split into N-page chunks" feature, so you must
manually specify the ranges:

```bash
mkdir -p ./book-chunks

pdftk book.pdf cat 1-5 output ./book-chunks/chunk-1.pdf
pdftk book.pdf cat 6-10 output ./book-chunks/chunk-2.pdf
pdftk book.pdf cat 11-15 output ./book-chunks/chunk-3.pdf
pdftk book.pdf cat 16-20 output ./book-chunks/chunk-4.pdf
pdftk book.pdf cat 21 output ./book-chunks/chunk-5.pdf
```

**Expected output files:**

| File                        | Contains Pages |
| --------------------------- | -------------- |
| `./book-chunks/chunk-1.pdf` | Pages 1–5      |
| `./book-chunks/chunk-2.pdf` | Pages 6–10     |
| `./book-chunks/chunk-3.pdf` | Pages 11–15    |
| `./book-chunks/chunk-4.pdf` | Pages 16–20    |
| `./book-chunks/chunk-5.pdf` | Page 21        |

### Alternative: Using Python with `pypdf`

```python
#!/usr/bin/env python3
import os
from pypdf import PdfReader, PdfWriter

os.makedirs("./book-chunks", exist_ok=True)

reader = PdfReader("book.pdf")
total_pages = len(reader.pages)
chunk_size = 5

for i in range(0, total_pages, chunk_size):
    writer = PdfWriter()
    end = min(i + chunk_size, total_pages)
    for page_num in range(i, end):
        writer.add_page(reader.pages[page_num])

    chunk_number = (i // chunk_size) + 1
    output_path = f"./book-chunks/chunk-{chunk_number}.pdf"
    with open(output_path, "wb") as f:
        writer.write(f)
    print(f"Written {output_path} ({end - i} pages)")

print(f"Split complete: {total_pages} pages into {chunk_number} chunks")
```

**Expected output:**

```
Written ./book-chunks/chunk-1.pdf (5 pages)
Written ./book-chunks/chunk-2.pdf (5 pages)
Written ./book-chunks/chunk-3.pdf (5 pages)
Written ./book-chunks/chunk-4.pdf (5 pages)
Written ./book-chunks/chunk-5.pdf (1 pages)
Split complete: 21 pages into 5 chunks
```

---

## Verification Commands

After running the merge and split, verify correctness:

```bash
# Check merged PDF page count
qpdf --show-npages book.pdf
# Expected output: 21

# Check each chunk's page count
for f in ./book-chunks/chunk-*.pdf; do
  echo "$f: $(qpdf --show-npages "$f") pages"
done
```

**Expected output:**

```
21
./book-chunks/chunk-1.pdf: 5 pages
./book-chunks/chunk-2.pdf: 5 pages
./book-chunks/chunk-3.pdf: 5 pages
./book-chunks/chunk-4.pdf: 5 pages
./book-chunks/chunk-5.pdf: 1 pages
```

Alternatively with `pdftk`:

```bash
pdftk book.pdf dump_data | grep NumberOfPages
# Expected: NumberOfPages: 21
```

---

## Summary

| Step  | Tool   | Command                                                                 | Result                               |
| ----- | ------ | ----------------------------------------------------------------------- | ------------------------------------ |
| Merge | `qpdf` | `qpdf --empty --pages ch1.pdf 1-5 ch2.pdf 1-8 ch3.pdf 3-10 -- book.pdf` | 21-page `book.pdf`                   |
| Split | `qpdf` | `qpdf book.pdf --split-pages=5 ./book-chunks/chunk-%d.pdf`              | 5 chunk files (4×5 pages + 1×1 page) |

**Recommended tool:** `qpdf` — it handles both merge-with-page-ranges and
split-into-chunks natively in single commands, without temporary files.

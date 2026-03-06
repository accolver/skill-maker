# PDF Merge + Split Workflow — Dry Run

## Task Summary

Merge three chapter PDFs with selective page ranges into a single `book.pdf`,
then split that merged result into 5-page chunks in `./book-chunks/`.

**Inputs:**

- `./chapters/ch1.pdf` — 10 pages (include only pages 1-5)
- `./chapters/ch2.pdf` — 8 pages (include all)
- `./chapters/ch3.pdf` — 12 pages (include only pages 3-10)

**Expected merged page count:** 5 + 8 + 8 = **21 pages**

---

## Step 1: Merge PDFs with Page Ranges

### Command

```bash
bun run scripts/merge-pdf.ts \
  --output book.pdf \
  --page-ranges "1-5;all;3-10" \
  ./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf
```

### Flags Explained

| Flag            | Value            | Purpose                                                                                                                                                                                                                 |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--output`      | `book.pdf`       | Required. Path for the merged output PDF.                                                                                                                                                                               |
| `--page-ranges` | `"1-5;all;3-10"` | Semicolon-separated, one entry per input file. `1-5` selects pages 1 through 5 from ch1.pdf; `all` includes every page from ch2.pdf; `3-10` selects pages 3 through 10 from ch3.pdf. Pages are 1-indexed and inclusive. |

The three positional arguments (`./chapters/ch1.pdf`, `./chapters/ch2.pdf`,
`./chapters/ch3.pdf`) are the input PDFs, merged in the order given.

### Expected Behavior

1. The script loads each input PDF and validates it exists and is non-empty.
2. For each input, it parses the corresponding page range entry:
   - `ch1.pdf`: pages 1-5 (0-indexed: 0,1,2,3,4) — 5 pages of 10
   - `ch2.pdf`: all — 8 pages of 8
   - `ch3.pdf`: pages 3-10 (0-indexed: 2,3,4,5,6,7,8,9) — 8 pages of 12
3. Selected pages are copied into a new merged PDF document in order.
4. The merged PDF is written to `book.pdf`.

### Expected stderr Output

```
  Merging 3 PDF files...
  [1/3] Loading ch1.pdf...
    Pages: 5 of 10
  [2/3] Loading ch2.pdf...
    Pages: all (8)
  [3/3] Loading ch3.pdf...
    Pages: 8 of 12
  Writing output to /absolute/path/to/book.pdf...

  ✓ Merged 21 pages from 3 files into book.pdf (XX.X KB)
```

### Expected stdout (JSON)

```json
{
  "output": "book.pdf",
  "inputs": [
    {
      "file": "ch1.pdf",
      "pages_included": 5,
      "total_pages": 10
    },
    {
      "file": "ch2.pdf",
      "pages_included": 8,
      "total_pages": 8
    },
    {
      "file": "ch3.pdf",
      "pages_included": 8,
      "total_pages": 12
    }
  ],
  "total_pages": 21,
  "size_bytes": <varies>
}
```

### Exit Code

`0` on success.

---

## Step 2: Split the Merged PDF into 5-Page Chunks

### Command

```bash
bun run scripts/split-pdf.ts book.pdf \
  --mode chunks \
  --chunk-size 5 \
  --output-dir ./book-chunks/
```

### Flags Explained

| Flag           | Value            | Purpose                                                                             |
| -------------- | ---------------- | ----------------------------------------------------------------------------------- |
| (positional)   | `book.pdf`       | The input PDF to split (the merged result from Step 1).                             |
| `--mode`       | `chunks`         | Split into fixed-size page groups.                                                  |
| `--chunk-size` | `5`              | Each output file contains up to 5 pages.                                            |
| `--output-dir` | `./book-chunks/` | Directory where split files are written. Created automatically if it doesn't exist. |

### Expected Behavior

1. The script reads `book.pdf` (21 pages).
2. In `chunks` mode with `--chunk-size 5`, it creates page groups:
   - Chunk 1: pages 1-5 (5 pages)
   - Chunk 2: pages 6-10 (5 pages)
   - Chunk 3: pages 11-15 (5 pages)
   - Chunk 4: pages 16-20 (5 pages)
   - Chunk 5: pages 21 (1 page — the last chunk is smaller)
3. The `./book-chunks/` directory is created if it doesn't exist.
4. Each chunk is written as a separate PDF file using the default prefix derived
   from the input filename (`book`).

### Expected Output Files

```
./book-chunks/
├── book-chunk-1.pdf   (pages 1-5,   5 pages)
├── book-chunk-2.pdf   (pages 6-10,  5 pages)
├── book-chunk-3.pdf   (pages 11-15, 5 pages)
├── book-chunk-4.pdf   (pages 16-20, 5 pages)
└── book-chunk-5.pdf   (page 21,     1 page)
```

### Expected stderr Output

```
  Source: book.pdf (21 page(s), XXXXX bytes)
  Mode: chunks -> 5 output file(s)
  Created book-chunk-1.pdf (5 page(s), XXXXX bytes)
  Created book-chunk-2.pdf (5 page(s), XXXXX bytes)
  Created book-chunk-3.pdf (5 page(s), XXXXX bytes)
  Created book-chunk-4.pdf (5 page(s), XXXXX bytes)
  Created book-chunk-5.pdf (1 page(s), XXXXX bytes)

  Split complete: 5 file(s) written to /absolute/path/to/book-chunks
```

### Expected stdout (JSON)

```json
{
  "source": "book.pdf",
  "source_pages": 21,
  "mode": "chunks",
  "chunk_size": 5,
  "outputs": [
    {
      "file": "book-chunk-1.pdf",
      "pages": [1, 2, 3, 4, 5],
      "size_bytes": <varies>
    },
    {
      "file": "book-chunk-2.pdf",
      "pages": [6, 7, 8, 9, 10],
      "size_bytes": <varies>
    },
    {
      "file": "book-chunk-3.pdf",
      "pages": [11, 12, 13, 14, 15],
      "size_bytes": <varies>
    },
    {
      "file": "book-chunk-4.pdf",
      "pages": [16, 17, 18, 19, 20],
      "size_bytes": <varies>
    },
    {
      "file": "book-chunk-5.pdf",
      "pages": [21],
      "size_bytes": <varies>
    }
  ],
  "output_count": 5,
  "output_dir": "/absolute/path/to/book-chunks"
}
```

### Exit Code

`0` on success.

---

## Verification Checklist

- [x] Identified the correct scripts: `merge-pdf.ts` for merging, `split-pdf.ts`
      for splitting
- [x] Used `--page-ranges` with semicolons between inputs (not commas):
      `"1-5;all;3-10"`
- [x] Provided `--output` flag for merge (required)
- [x] Inputs provided in correct order (ch1, ch2, ch3)
- [x] Page ranges are 1-indexed (per skill key principles)
- [x] Merge page range count (3) matches input file count (3)
- [x] Split uses `--mode chunks` with `--chunk-size 5`
- [x] Split `--output-dir` set to `./book-chunks/`
- [x] Expected 5 output chunk files (21 pages / 5 per chunk = 4 full + 1
      partial)
- [x] Last chunk (chunk 5) contains only 1 page — this is expected behavior

## Page Mapping Through the Pipeline

For traceability, here is which original chapter pages end up in each final
chunk:

| Chunk            | Merged Pages | Original Source                      |
| ---------------- | ------------ | ------------------------------------ |
| book-chunk-1.pdf | 1-5          | ch1.pdf pages 1-5                    |
| book-chunk-2.pdf | 6-10         | ch2.pdf pages 1-5                    |
| book-chunk-3.pdf | 11-15        | ch2.pdf pages 6-8, ch3.pdf pages 3-4 |
| book-chunk-4.pdf | 16-20        | ch3.pdf pages 5-9                    |
| book-chunk-5.pdf | 21           | ch3.pdf page 10                      |

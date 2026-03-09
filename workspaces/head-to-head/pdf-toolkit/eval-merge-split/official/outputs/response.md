# PDF Merge and Split: Chapters to Book

## Task Summary

Merge three PDF chapters into a single `book.pdf` with selective page ranges,
then split the merged result into 5-page chunks in `./book-chunks/`.

**Input files:**

- `./chapters/ch1.pdf` (10 pages) — include only pages 1-5
- `./chapters/ch2.pdf` (8 pages) — include all pages
- `./chapters/ch3.pdf` (12 pages) — include only pages 3-10

**Expected merged page count:** 5 + 8 + 8 = 21 pages

---

## Step 1 — Merge PDFs with Selective Page Ranges

Using `merge-pdf.ts` with the `--page-ranges` flag. Each range in the
comma-separated list corresponds positionally to each input file:

- `1-5` → applies to `./chapters/ch1.pdf` (takes pages 1-5 out of 10)
- `all` → applies to `./chapters/ch2.pdf` (takes all 8 pages)
- `3-10` → applies to `./chapters/ch3.pdf` (takes pages 3-10 out of 12)

### Command

```bash
bun run scripts/merge-pdf.ts \
  --output book.pdf \
  --page-ranges "1-5,all,3-10" \
  ./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf
```

### Expected JSON Output

```json
{
  "outputPath": "book.pdf",
  "totalPages": 21,
  "fileSize": <size_in_bytes>,
  "sources": [
    { "file": "./chapters/ch1.pdf", "pages": 5 },
    { "file": "./chapters/ch2.pdf", "pages": 8 },
    { "file": "./chapters/ch3.pdf", "pages": 8 }
  ]
}
```

### Verification

- **Total pages:** 5 (ch1 pages 1-5) + 8 (ch2 all) + 8 (ch3 pages 3-10) = **21
  pages**
- The `--page-ranges` flag uses positional matching: the first range (`1-5`)
  maps to the first input file (`ch1.pdf`), the second range (`all`) maps to the
  second input file (`ch2.pdf`), and the third range (`3-10`) maps to the third
  input file (`ch3.pdf`)

---

## Step 2 — Create the Output Directory for Chunks

The `split-pdf.ts` script requires the output directory to exist before running.
Create it first:

```bash
mkdir -p ./book-chunks
```

---

## Step 3 — Split the Merged PDF into 5-Page Chunks

Using `split-pdf.ts` in `chunks` mode with `--chunk-size 5`:

### Command

```bash
bun run scripts/split-pdf.ts \
  --mode chunks \
  --chunk-size 5 \
  --output-dir ./book-chunks \
  book.pdf
```

### Expected JSON Output

With 21 total pages split into 5-page chunks, we get 5 files (4 full chunks of 5
pages + 1 remainder chunk of 1 page):

```json
{
  "parts": [
    { "path": "./book-chunks/book_001.pdf", "pages": 5 },
    { "path": "./book-chunks/book_002.pdf", "pages": 5 },
    { "path": "./book-chunks/book_003.pdf", "pages": 5 },
    { "path": "./book-chunks/book_004.pdf", "pages": 5 },
    { "path": "./book-chunks/book_005.pdf", "pages": 1 }
  ],
  "totalParts": 5
}
```

### Chunk Breakdown

| Chunk File     | Pages | Source Content                |
| -------------- | ----- | ----------------------------- |
| `book_001.pdf` | 5     | Ch1 pages 1-5                 |
| `book_002.pdf` | 5     | Ch2 pages 1-5                 |
| `book_003.pdf` | 5     | Ch2 pages 6-8 + Ch3 pages 3-4 |
| `book_004.pdf` | 5     | Ch3 pages 5-9                 |
| `book_005.pdf` | 1     | Ch3 page 10                   |

---

## Complete Script (All Commands Together)

```bash
# Step 1: Merge the three chapters with selective page ranges into book.pdf
bun run scripts/merge-pdf.ts \
  --output book.pdf \
  --page-ranges "1-5,all,3-10" \
  ./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf

# Step 2: Create the output directory for split chunks
mkdir -p ./book-chunks

# Step 3: Split book.pdf into 5-page chunks
bun run scripts/split-pdf.ts \
  --mode chunks \
  --chunk-size 5 \
  --output-dir ./book-chunks \
  book.pdf
```

---

## Key Flags Used

### merge-pdf.ts

| Flag            | Value            | Purpose                                                 |
| --------------- | ---------------- | ------------------------------------------------------- |
| `--output`      | `book.pdf`       | Output file path for the merged PDF                     |
| `--page-ranges` | `"1-5,all,3-10"` | Per-file page selection, positionally matched to inputs |

### split-pdf.ts

| Flag           | Value           | Purpose                              |
| -------------- | --------------- | ------------------------------------ |
| `--mode`       | `chunks`        | Split into evenly-sized chunks       |
| `--chunk-size` | `5`             | 5 pages per chunk                    |
| `--output-dir` | `./book-chunks` | Directory for the output chunk files |

---

## Error Handling Notes

- **File not found:** Verify all three chapter PDFs exist at
  `./chapters/ch1.pdf`, `./chapters/ch2.pdf`, and `./chapters/ch3.pdf` before
  running the merge command.
- **Page range out of bounds:** The ranges `1-5` (ch1 has 10 pages), `all` (ch2
  has 8 pages), and `3-10` (ch3 has 12 pages) are all within valid bounds.
- **Output directory:** The `mkdir -p ./book-chunks` command must run before
  `split-pdf.ts` because the script does not auto-create output directories.
- **Chaining dependency:** The split operation depends on the merge completing
  successfully — `book.pdf` must exist before splitting. Run the commands
  sequentially, not in parallel.

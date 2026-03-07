# PDF Merge + Split Workflow (Dry Run)

This task requires two operations in sequence:

1. **Merge** three chapter PDFs with selective page ranges into a single
   `book.pdf`
2. **Split** the merged `book.pdf` into 5-page chunks in `./book-chunks/`

## Scripts Used

| Step | Script                 | Purpose                                   |
| ---- | ---------------------- | ----------------------------------------- |
| 1    | `scripts/merge-pdf.ts` | Merge chapters with per-input page ranges |
| 2    | `scripts/split-pdf.ts` | Split merged PDF into 5-page chunks       |

## Step 1: Merge with Page Ranges

### Command

```bash
bun run scripts/merge-pdf.ts --output book.pdf --page-ranges "1-5;all;3-10" ./chapters/ch1.pdf ./chapters/ch2.pdf ./chapters/ch3.pdf
```

### Flag Breakdown

- `--output book.pdf` — Required flag specifying the output path.
- `--page-ranges "1-5;all;3-10"` — Semicolon-separated per-input page
  selections:
  - `1-5` applies to the **first** positional input (`ch1.pdf`, 10 pages) —
    selects pages 1 through 5 (5 pages)
  - `all` applies to the **second** positional input (`ch2.pdf`, 8 pages) —
    selects all 8 pages
  - `3-10` applies to the **third** positional input (`ch3.pdf`, 12 pages) —
    selects pages 3 through 10 (8 pages)
- The three input PDFs are passed as positional arguments **in order** — merge
  order matches argument order.

**Total pages in merged output:** 5 + 8 + 8 = **21 pages**

### Expected JSON Output (stdout)

```json
{
  "operation": "merge",
  "output": "book.pdf",
  "inputs": [
    {
      "file": "./chapters/ch1.pdf",
      "pages_selected": "1-5",
      "page_count": 5
    },
    {
      "file": "./chapters/ch2.pdf",
      "pages_selected": "all",
      "page_count": 8
    },
    {
      "file": "./chapters/ch3.pdf",
      "pages_selected": "3-10",
      "page_count": 8
    }
  ],
  "total_pages": 21,
  "output_size_bytes": 245760
}
```

## Step 2: Split into 5-Page Chunks

### Command

```bash
bun run scripts/split-pdf.ts book.pdf --mode chunks --chunk-size 5 --output-dir ./book-chunks/
```

### Flag Breakdown

- `book.pdf` — The merged file from Step 1, passed as the positional input.
- `--mode chunks` — Splits by fixed-size page chunks (as opposed to `pages` for
  one-file-per-page or `ranges` for custom ranges).
- `--chunk-size 5` — Each output file gets 5 pages. Required when
  `--mode chunks`.
- `--output-dir ./book-chunks/` — Directory where chunk files are written.
  Created if it doesn't exist.

**Expected chunks:** 21 pages / 5 pages per chunk = 4 full chunks + 1 partial
chunk (1 page) = **5 files**

### Expected JSON Output (stdout)

```json
{
  "operation": "split",
  "input": "book.pdf",
  "mode": "chunks",
  "chunk_size": 5,
  "total_pages": 21,
  "output_dir": "./book-chunks/",
  "files": [
    {
      "file": "./book-chunks/book-001.pdf",
      "pages": "1-5",
      "page_count": 5
    },
    {
      "file": "./book-chunks/book-002.pdf",
      "pages": "6-10",
      "page_count": 5
    },
    {
      "file": "./book-chunks/book-003.pdf",
      "pages": "11-15",
      "page_count": 5
    },
    {
      "file": "./book-chunks/book-004.pdf",
      "pages": "16-20",
      "page_count": 5
    },
    {
      "file": "./book-chunks/book-005.pdf",
      "pages": "21-21",
      "page_count": 1
    }
  ]
}
```

## Notes

1. **Semicolon syntax for `--page-ranges`:** This is the key merge-specific
   convention. Each input PDF gets its own range separated by `;`. A common
   mistake (called out in the skill's Common Mistakes table) is using commas
   between inputs — commas are for listing individual pages _within_ a single
   input (e.g., `1,3,5`), while semicolons separate ranges _across_ inputs.

2. **Order matters:** Input PDFs are merged in the order they appear on the
   command line. `ch1.pdf` pages come first, then `ch2.pdf`, then `ch3.pdf`.

3. **Page ranges are 1-indexed:** Per the skill's Key Principles, all page
   numbers are 1-based. The scripts convert to 0-indexed internally for the PDF
   libraries.

4. **The `--output` flag is required for merge-pdf.ts.** Omitting it is listed
   as a common mistake in the skill.

5. **Last chunk may be partial:** When splitting 21 pages into 5-page chunks,
   the final chunk (`book-005.pdf`) contains only 1 page. This is expected
   behavior.

6. **Verification checklist** (from skill):
   - [x] Identified correct scripts: `merge-pdf.ts` then `split-pdf.ts`
   - [x] Inputs provided in correct order for merge
   - [x] Used semicolon-separated `--page-ranges` syntax
   - [x] `--output` flag provided for merge
   - [x] `--mode chunks` with `--chunk-size` for split
   - [ ] Verify output file exists and has expected content (post-execution)
   - [ ] Verify all split output files are present (post-execution)

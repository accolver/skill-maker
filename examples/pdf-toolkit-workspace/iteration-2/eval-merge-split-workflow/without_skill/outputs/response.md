# PDF Merge and Split — Dry Run Response

## Tools/Libraries

For this task I'd use **qpdf** — it's a command-line tool available on most
systems via package managers (`brew install qpdf` on macOS, `apt install qpdf`
on Debian/Ubuntu). It handles page selection and merging natively without
needing Python or Node.js.

Alternatively, **pdftk** could work, but qpdf has better page-range syntax and
is more actively maintained.

## Step 1: Merge Selected Pages into `book.pdf`

```bash
qpdf --empty --pages \
  ./chapters/ch1.pdf 1-5 \
  ./chapters/ch2.pdf 1-8 \
  ./chapters/ch3.pdf 3-10 \
  -- book.pdf
```

**Explanation:**

- `--empty` starts with a blank PDF (we're assembling from scratch)
- `--pages ... --` defines the page sources and ranges
  - `ch1.pdf 1-5` → pages 1 through 5 from chapter 1 (5 pages)
  - `ch2.pdf 1-8` → all 8 pages from chapter 2
  - `ch3.pdf 3-10` → pages 3 through 10 from chapter 3 (8 pages)
- Total pages in `book.pdf`: 5 + 8 + 8 = **21 pages**

## Step 2: Split `book.pdf` into 5-page Chunks

```bash
mkdir -p ./book-chunks

qpdf book.pdf --split-pages=5 ./book-chunks/chunk-%d.pdf
```

**Explanation:**

- `--split-pages=5` splits the PDF every 5 pages
- The output pattern `chunk-%d.pdf` numbers each chunk

**However**, `qpdf --split-pages` actually splits into individual pages, not
groups. The `=5` syntax is not standard qpdf. Let me correct this.

### Corrected approach — manual page ranges:

Since qpdf doesn't natively support splitting into N-page groups, I'd extract
each chunk manually:

```bash
mkdir -p ./book-chunks

# 21 pages total, split into 5-page chunks:
# Chunk 1: pages 1-5
qpdf book.pdf --pages book.pdf 1-5 -- ./book-chunks/chunk-1.pdf

# Chunk 2: pages 6-10
qpdf book.pdf --pages book.pdf 6-10 -- ./book-chunks/chunk-2.pdf

# Chunk 3: pages 11-15
qpdf book.pdf --pages book.pdf 11-15 -- ./book-chunks/chunk-3.pdf

# Chunk 4: pages 16-20
qpdf book.pdf --pages book.pdf 16-20 -- ./book-chunks/chunk-4.pdf

# Chunk 5: pages 21-21 (remainder)
qpdf book.pdf --pages book.pdf 21-21 -- ./book-chunks/chunk-5.pdf
```

Or, to automate it with a loop:

```bash
mkdir -p ./book-chunks

total_pages=21
chunk_size=5
chunk=1
start=1

while [ $start -le $total_pages ]; do
  end=$((start + chunk_size - 1))
  if [ $end -gt $total_pages ]; then
    end=$total_pages
  fi
  qpdf book.pdf --pages book.pdf $start-$end -- ./book-chunks/chunk-${chunk}.pdf
  start=$((end + 1))
  chunk=$((chunk + 1))
done
```

## Expected Output

### After Step 1:

- `book.pdf` — 21-page PDF containing the selected pages from all three chapters

### After Step 2:

```
./book-chunks/
├── chunk-1.pdf   (pages 1-5,   5 pages)
├── chunk-2.pdf   (pages 6-10,  5 pages)
├── chunk-3.pdf   (pages 11-15, 5 pages)
├── chunk-4.pdf   (pages 16-20, 5 pages)
└── chunk-5.pdf   (page  21,    1 page)
```

5 chunk files total. The last chunk has only 1 page since 21 is not evenly
divisible by 5.

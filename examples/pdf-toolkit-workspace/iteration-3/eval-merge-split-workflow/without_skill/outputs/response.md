# Merging and Splitting PDF Chapters

I'll help you merge selected pages from your three chapters into a single book
and then split it into 5-page chunks. I'll use `qpdf` for both operations since
it handles page ranges and splitting well.

## Step 1: Merge Selected Pages into book.pdf

First, let's merge the specific page ranges from each chapter:

```bash
qpdf --empty --pages \
  ./chapters/ch1.pdf 1-5 \
  ./chapters/ch2.pdf 1-8 \
  ./chapters/ch3.pdf 3-10 \
  -- book.pdf
```

This command:

- Starts with an empty PDF (`--empty`)
- Takes pages 1-5 from ch1.pdf (5 pages)
- Takes all 8 pages from ch2.pdf
- Takes pages 3-10 from ch3.pdf (8 pages)
- Outputs to `book.pdf`

The resulting `book.pdf` should have 5 + 8 + 8 = 21 pages total.

## Step 2: Split into 5-page Chunks

Now let's create the output directory and split:

```bash
mkdir -p ./book-chunks
qpdf book.pdf --split-pages=5 ./book-chunks/chunk-%d.pdf
```

This splits `book.pdf` into files of 5 pages each:

- `chunk-1.pdf` — pages 1-5
- `chunk-2.pdf` — pages 6-10
- `chunk-3.pdf` — pages 11-15
- `chunk-4.pdf` — pages 16-20
- `chunk-5.pdf` — pages 21 (last chunk, only 1 page)

## Verification

You can verify the results:

```bash
# Check page count of merged file
qpdf --show-npages book.pdf

# List chunks
ls -la ./book-chunks/

# Check page count of each chunk
for f in ./book-chunks/chunk-*.pdf; do
  echo "$f: $(qpdf --show-npages "$f") pages"
done
```

## Alternative: Using pdftk

If you don't have `qpdf` installed, you can achieve the same with `pdftk`:

```bash
# Step 1: Extract page ranges into temp files
pdftk ./chapters/ch1.pdf cat 1-5 output /tmp/part1.pdf
pdftk ./chapters/ch2.pdf cat 1-8 output /tmp/part2.pdf
pdftk ./chapters/ch3.pdf cat 3-10 output /tmp/part3.pdf

# Step 2: Merge temp files
pdftk /tmp/part1.pdf /tmp/part2.pdf /tmp/part3.pdf cat output book.pdf

# Step 3: Split (pdftk doesn't support chunk splitting directly,
# so you'd need to do it manually)
mkdir -p ./book-chunks
pdftk book.pdf cat 1-5 output ./book-chunks/chunk-1.pdf
pdftk book.pdf cat 6-10 output ./book-chunks/chunk-2.pdf
pdftk book.pdf cat 11-15 output ./book-chunks/chunk-3.pdf
pdftk book.pdf cat 16-20 output ./book-chunks/chunk-4.pdf
pdftk book.pdf cat 21 output ./book-chunks/chunk-5.pdf
```

## Notes

- Make sure `qpdf` is installed (`brew install qpdf` on macOS,
  `apt install qpdf` on Ubuntu)
- The `--split-pages` flag in qpdf splits into individual pages by default;
  passing `=5` groups them into 5-page chunks
- If any of the source PDFs are encrypted, you may need to add `--decrypt` to
  the qpdf commands

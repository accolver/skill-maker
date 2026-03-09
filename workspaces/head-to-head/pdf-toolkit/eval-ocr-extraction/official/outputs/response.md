# OCR and Image Extraction from Scanned PDF

## Plan

Following the **Text Before OCR** principle from the PDF Toolkit skill, we'll
execute three operations in sequence:

1. **Extract text first** (`extract-text.ts`) — confirm the PDF is a scan by
   checking if extracted text is empty or garbled
2. **OCR the document** (`ocr-pdf.ts`) — run OCR at 600 DPI with JSON output to
   get text content and confidence scores
3. **Extract images** (`extract-images.ts`) — pull out embedded images as JPEG
   files into `./contract-images/`

---

## Step 1 — Try Text Extraction First (Confirm It's a Scan)

Always try `extract-text.ts` first. Most PDFs have embedded text even if they
look like scans. This is fast (milliseconds) and avoids unnecessary OCR.

```bash
bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf
```

**Flags used:**

- `--format json` — get structured JSON output so we can programmatically check
  if text is empty/garbled

**Expected output structure:**

```json
{
  "pages": [
    {
      "pageNumber": 1,
      "text": ""
    }
  ],
  "metadata": {
    "totalPages": 12,
    "title": "Document Title",
    "author": "Author Name"
  }
}
```

**What to look for:** If the `text` fields across all pages are empty strings,
contain only whitespace, or contain garbled/mojibake characters (random symbols,
unreadable sequences), this confirms the PDF is a scanned image without embedded
text. Proceed to Step 2.

If the text comes back with readable content, the PDF is **not** a scan — you
can use this text directly and skip OCR entirely.

---

## Step 2 — OCR the Document (600 DPI, JSON Format with Confidence Scores)

Since text extraction confirmed the document is a scan (empty/garbled text), we
fall back to OCR. The user requested 600 DPI for better accuracy on a poor
quality scan.

```bash
bun run scripts/ocr-pdf.ts --dpi 600 --format json ./scans/old-contract.pdf
```

**Flags used:**

- `--dpi 600` — higher resolution rendering for poor quality scans. Note: 600
  DPI is 4x slower than the default 300 DPI, but justified here because the user
  indicated the scan quality might be poor. For clean scans, 300 DPI is the
  recommended default.
- `--format json` — includes per-page confidence scores in the output, which the
  user specifically requested

**Expected output structure:**

```json
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Recognized text from page 1...",
      "confidence": 0.94
    },
    {
      "pageNumber": 2,
      "text": "Recognized text from page 2...",
      "confidence": 0.87
    }
  ],
  "metadata": {
    "totalPages": 5,
    "averageConfidence": 0.91,
    "dpi": 600
  }
}
```

**Interpreting confidence scores:**

- **0.8 – 1.0** — Good recognition. Results are reliable.
- **Below 0.8** — OCR struggled on those pages. **Warning:** Results may contain
  errors. The user should manually verify critical data points (names, dates,
  dollar amounts, legal terms) on any pages with confidence below 0.8.

**Performance note:** At 600 DPI, each page takes significantly longer to
process. For a large document (e.g., 50+ pages), consider processing in page
ranges to avoid out-of-memory issues:

```bash
bun run scripts/ocr-pdf.ts --dpi 600 --format json --pages 1-10 ./scans/old-contract.pdf
bun run scripts/ocr-pdf.ts --dpi 600 --format json --pages 11-20 ./scans/old-contract.pdf
```

---

## Step 3 — Extract Images as JPEG Files

First, create the output directory (the script does not auto-create it):

```bash
mkdir -p ./contract-images
```

Then extract the images:

```bash
bun run scripts/extract-images.ts --format jpeg --output-dir ./contract-images ./scans/old-contract.pdf
```

**Flags used:**

- `--format jpeg` — save extracted images as JPEG files (default is PNG)
- `--output-dir ./contract-images` — save images to the user's requested
  directory

**Expected output structure:**

```json
{
  "images": [
    {
      "pageNumber": 1,
      "imageIndex": 0,
      "width": 800,
      "height": 600,
      "format": "jpeg",
      "path": "./contract-images/page1_img0.jpeg"
    },
    {
      "pageNumber": 2,
      "imageIndex": 0,
      "width": 1200,
      "height": 900,
      "format": "jpeg",
      "path": "./contract-images/page2_img0.jpeg"
    }
  ],
  "totalImages": 2
}
```

**Note:** For a scanned PDF, each page is typically stored as a single large
image. So the number of extracted images will likely equal the number of pages
in the document.

---

## Complete Command Sequence

Here are all three steps together, ready to run:

```bash
# Step 1: Try text extraction first to confirm it's a scan
bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf

# Step 2: OCR at 600 DPI with JSON output (includes confidence scores)
# Only run this if Step 1 returned empty/garbled text
bun run scripts/ocr-pdf.ts --dpi 600 --format json ./scans/old-contract.pdf

# Step 3: Extract images as JPEG files
mkdir -p ./contract-images
bun run scripts/extract-images.ts --format jpeg --output-dir ./contract-images ./scans/old-contract.pdf
```

---

## Error Handling Notes

- **File not found** — verify `./scans/old-contract.pdf` exists before running.
  Use `ls -la ./scans/old-contract.pdf` to check.
- **Password-protected PDF** — these scripts don't support encrypted PDFs. If
  the contract is password-protected, you'll need to decrypt it first.
- **Out of memory** — OCR at 600 DPI on a large document can exhaust memory. If
  this happens, process in smaller page ranges using the `--pages` flag (e.g.,
  `--pages 1-5`, then `--pages 6-10`).
- **Corrupted PDF** — if a script fails with a parse error, the PDF file may be
  damaged.

All scripts exit with non-zero codes on failure and write error details to
stderr. Check stderr output if any command fails.

# Dry Run: Scanned PDF OCR and Image Extraction

Following the **pdf-toolkit** skill workflow for a scanned PDF at
`./scans/old-contract.pdf`.

## Skill Checklist

- [x] Identified the correct script for the operation
- [x] Checked if PDF has selectable text (extract-text) or is scanned (ocr-pdf)
- [x] Used `--format json` when structured output is needed downstream
- [x] Verified output file exists and has expected content (will verify after
      each step)
- [x] For image extraction: confirmed `--format jpeg` and `--output-dir` are set

## Step 1: Identify the Operations

Based on the user's request, three scripts are needed:

| Need                                            | Script                      | Why                                                                   |
| ----------------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| Confirm it's a scan (try text extraction first) | `scripts/extract-text.ts`   | Skill principle #1: "Text before OCR" — always try extract-text first |
| OCR with confidence scores in JSON              | `scripts/ocr-pdf.ts`        | Document is a scan, need `--format json` for confidence scores        |
| Extract images as JPEG                          | `scripts/extract-images.ts` | User wants embedded images saved as JPEG files                        |

## Step 2: Try Text Extraction First (Confirm It's a Scan)

**Command:**

```bash
bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf
```

**Flags used:**

- `--format json` — structured output so we can programmatically check if text
  was extracted
- No `--pages` flag — extract from all pages to get a complete picture
- No `--output` flag — output goes to stdout for inspection

**Expected behavior:**

- Progress/diagnostics printed to **stderr** (e.g., "Processing page 1...",
  "Processing page 2...")
- JSON output printed to **stdout**
- Exit code: **0** (success — the script succeeds even when no text is found)

**Expected output (stdout):**

```json
{
  "file": "./scans/old-contract.pdf",
  "totalPages": 5,
  "pages": [
    {
      "page": 1,
      "text": ""
    },
    {
      "page": 2,
      "text": ""
    },
    {
      "page": 3,
      "text": ""
    },
    {
      "page": 4,
      "text": ""
    },
    {
      "page": 5,
      "text": ""
    }
  ]
}
```

**Interpretation:** Each page returns empty or garbled text because the PDF is a
scan (text is embedded in images, not in a selectable text layer). This confirms
we must use `ocr-pdf.ts` as the skill's "Text before OCR" principle recommends.

## Step 3: OCR the Document with Confidence Scores

**Command:**

```bash
bun run scripts/ocr-pdf.ts --format json --dpi 600 ./scans/old-contract.pdf
```

**Flags used:**

- `--format json` — produces structured JSON output with per-page confidence
  scores and low-confidence word lists (user specifically requested confidence
  scores in JSON format)
- `--dpi 600` — renders pages at 600 DPI instead of the default 300 DPI; higher
  DPI produces better OCR accuracy for poor-quality scans (user specifically
  requested 600 DPI)
- `--lang` not specified — defaults to `eng` (English), appropriate for a
  contract document
- `--confidence-threshold` not specified — defaults to 30, which filters out
  words with very low confidence
- No `--pages` flag — OCR all pages
- No `--output` flag — output goes to stdout; if the user wants it saved to a
  file, we could add `--output result.json`

**Expected behavior:**

- **stderr** output: progress messages like "Rendering page 1 at 600 DPI...",
  "OCR-ing page 1...", "Rendering page 2 at 600 DPI...", etc. The 600 DPI
  rendering will take longer than default 300 DPI since it produces 4x the pixel
  data per page.
- **stdout** output: structured JSON with OCR results
- Exit code: **0** (success)
- Dependencies (`mupdf`, `tesseract.js`) auto-installed on first run via Bun

**Expected output (stdout):**

```json
{
  "file": "./scans/old-contract.pdf",
  "dpi": 600,
  "language": "eng",
  "totalPages": 5,
  "pages": [
    {
      "page": 1,
      "confidence": 87.3,
      "text": "CONTRACT AGREEMENT\n\nThis Agreement is entered into as of January 15, 2019...",
      "lowConfidenceWords": [
        { "word": "Janaury", "confidence": 28, "suggestion": "January" }
      ]
    },
    {
      "page": 2,
      "confidence": 91.5,
      "text": "ARTICLE II - TERMS AND CONDITIONS\n\n2.1 The term of this Agreement...",
      "lowConfidenceWords": []
    },
    {
      "page": 3,
      "confidence": 78.2,
      "text": "ARTICLE III - COMPENSATION\n\n3.1 The total compensation shall be...",
      "lowConfidenceWords": [
        {
          "word": "componsation",
          "confidence": 22,
          "suggestion": "compensation"
        },
        { "word": "sh4ll", "confidence": 15, "suggestion": "shall" }
      ]
    },
    {
      "page": 4,
      "confidence": 85.1,
      "text": "ARTICLE IV - TERMINATION\n\n4.1 Either party may terminate...",
      "lowConfidenceWords": []
    },
    {
      "page": 5,
      "confidence": 82.7,
      "text": "SIGNATURES\n\n________________________\nJohn Smith, CEO\n\n________________________\nJane Doe, Director",
      "lowConfidenceWords": [
        { "word": "Smlth", "confidence": 25, "suggestion": "Smith" }
      ]
    }
  ],
  "summary": {
    "averageConfidence": 84.96,
    "totalWords": 1247,
    "lowConfidenceWordCount": 3
  }
}
```

**Why 600 DPI matters:** The default 300 DPI may produce confidence scores in
the 60-70% range for poor-quality scans. At 600 DPI, the renderer produces
sharper character edges, improving Tesseract's recognition accuracy — typically
boosting confidence to 80-90%. The trade-off is ~4x longer processing time and
~4x more memory usage per page.

## Step 4: Extract Images as JPEG

**Command:**

```bash
bun run scripts/extract-images.ts --output-dir ./contract-images/ --format jpeg ./scans/old-contract.pdf
```

**Flags used:**

- `--output-dir ./contract-images/` — save extracted images to the user's
  requested directory (default would be `./extracted-images/`)
- `--format jpeg` — save as JPEG files instead of the default PNG (user
  specifically requested JPEG)
- `--min-size` not specified — defaults to 50px minimum dimension, which is
  reasonable
- `--pages` not specified — extract from all pages
- No `--list-only` flag — we want to actually save the images

**Expected behavior:**

- The script creates `./contract-images/` directory if it doesn't exist
- **stderr** output: progress like "Extracting images from page 1...", "Saved
  image 1 (1240x1753)...", etc.
- **stdout** output: structured JSON listing all extracted images
- Uses `mupdf` WASM to extract image XObjects from the PDF. If discrete images
  can't be extracted (common with scanned PDFs where each page is a single
  full-page image), falls back to full-page rendering at 288 DPI.
- Exit code: **0** (success)

**Expected output (stdout):**

```json
{
  "file": "./scans/old-contract.pdf",
  "outputDir": "./contract-images/",
  "format": "jpeg",
  "totalPages": 5,
  "images": [
    {
      "page": 1,
      "index": 1,
      "filename": "old-contract-p1-001.jpeg",
      "width": 4960,
      "height": 7016,
      "sizeBytes": 523841
    },
    {
      "page": 2,
      "index": 1,
      "filename": "old-contract-p2-001.jpeg",
      "width": 4960,
      "height": 7016,
      "sizeBytes": 489210
    },
    {
      "page": 3,
      "index": 1,
      "filename": "old-contract-p3-001.jpeg",
      "width": 4960,
      "height": 7016,
      "sizeBytes": 512733
    },
    {
      "page": 4,
      "index": 1,
      "filename": "old-contract-p4-001.jpeg",
      "width": 4960,
      "height": 7016,
      "sizeBytes": 478901
    },
    {
      "page": 5,
      "index": 1,
      "filename": "old-contract-p5-001.jpeg",
      "width": 4960,
      "height": 7016,
      "sizeBytes": 345120
    }
  ],
  "summary": {
    "totalImages": 5,
    "totalSizeBytes": 2349805
  }
}
```

**Note:** Since this is a scanned document, each page is likely a single
full-page image. The extracted JPEG files would be saved to:

- `./contract-images/old-contract-p1-001.jpeg`
- `./contract-images/old-contract-p2-001.jpeg`
- `./contract-images/old-contract-p3-001.jpeg`
- `./contract-images/old-contract-p4-001.jpeg`
- `./contract-images/old-contract-p5-001.jpeg`

## Summary of All Commands

```bash
# Step 1: Try text extraction first (confirm it's a scan)
bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf

# Step 2: OCR with confidence scores at 600 DPI
bun run scripts/ocr-pdf.ts --format json --dpi 600 ./scans/old-contract.pdf

# Step 3: Extract images as JPEG
bun run scripts/extract-images.ts --output-dir ./contract-images/ --format jpeg ./scans/old-contract.pdf
```

## Execution Order and Rationale

These commands should be run **sequentially**, not in parallel:

1. **extract-text first** — Following the skill's Key Principle #1 ("Text before
   OCR"). We need to confirm the text extraction returns empty/garbled results
   before committing to OCR. If extract-text returned good text, we could skip
   the OCR step entirely.

2. **ocr-pdf second** — Only after confirming Step 1 returned empty text. The
   600 DPI setting will increase processing time (~4x vs default 300 DPI) but
   significantly improves accuracy for poor-quality scans.

3. **extract-images third** — Independent of OCR results, but run last since
   it's the lowest priority. The images are the raw scanned page images, useful
   as a backup or for manual review.

## Potential Issues and Mitigations

| Potential Issue                          | Mitigation                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| OCR returns garbled text even at 600 DPI | Check if `--lang` matches the document language; try a different language code                   |
| extract-images returns nothing           | Lower `--min-size` threshold or check if pages contain actual image XObjects                     |
| Very slow processing at 600 DPI          | Could use `--pages 1` first to test on a single page before processing all pages                 |
| Large output files from 600 DPI OCR      | Use `--output result.json` to save directly to file instead of stdout                            |
| Tesseract not installed                  | `tesseract.js` is a pure JavaScript implementation bundled via Bun — no system dependency needed |

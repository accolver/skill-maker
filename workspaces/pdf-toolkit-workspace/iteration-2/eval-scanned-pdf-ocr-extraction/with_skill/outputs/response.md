# Scanned PDF: Text Extraction, OCR, and Image Extraction

I'll handle this in three steps following the **"Text before OCR"** principle
from the pdf-toolkit skill — always try `extract-text.ts` first before reaching
for OCR, because it's faster and more accurate when text is embedded.

---

## Step 1: Try text extraction first (confirm it's a scan)

Per the skill's Key Principle #1, we always attempt `extract-text.ts` before
`ocr-pdf.ts`. If the PDF is truly a scan, this will return empty or garbled
text, confirming we need OCR.

**Script:** `scripts/extract-text.ts`

```bash
bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf
```

**Expected output** (for a scanned PDF — empty/garbled text confirms it's a
scan):

```json
{
  "file": "./scans/old-contract.pdf",
  "totalPages": 12,
  "pages": [
    { "page": 1, "text": "" },
    { "page": 2, "text": "" },
    { "page": 3, "text": "" }
  ],
  "summary": {
    "totalCharacters": 0,
    "pagesWithText": 0,
    "pagesWithoutText": 12
  }
}
```

If `pagesWithText` is 0 or the text is garbled, this confirms it's a scanned PDF
and we proceed to OCR. If it returned readable text, we'd skip OCR entirely.

---

## Step 2: OCR the document at 600 DPI with JSON output

Since Step 1 confirmed it's a scan, we use `ocr-pdf.ts` with `--dpi 600` for
better accuracy on poor-quality scans, and `--format json` to get confidence
scores.

**Script:** `scripts/ocr-pdf.ts`

```bash
bun run scripts/ocr-pdf.ts --format json --dpi 600 ./scans/old-contract.pdf
```

**Expected JSON output** (with confidence scores and lowConfidenceWords):

```json
{
  "file": "./scans/old-contract.pdf",
  "totalPages": 12,
  "dpi": 600,
  "language": "eng",
  "pages": [
    {
      "page": 1,
      "text": "SERVICES AGREEMENT\n\nThis Services Agreement (the \"Agreement\") is entered into as of January 15, 2019...",
      "confidence": 87.4,
      "wordCount": 312,
      "lowConfidenceWords": [
        { "word": "Janu4ry", "confidence": 22, "expected": "January" },
        { "word": "entere0", "confidence": 18, "expected": "entered" }
      ]
    },
    {
      "page": 2,
      "text": "Section 2: Scope of Services\n\nThe Provider shall deliver the following services...",
      "confidence": 91.2,
      "wordCount": 287,
      "lowConfidenceWords": [
        { "word": "deli8er", "confidence": 25, "expected": "deliver" }
      ]
    },
    {
      "page": 3,
      "text": "Section 3: Payment Terms\n\nClient agrees to pay Provider within thirty (30) days...",
      "confidence": 93.1,
      "wordCount": 245,
      "lowConfidenceWords": []
    }
  ],
  "summary": {
    "averageConfidence": 89.6,
    "totalWords": 3420,
    "totalLowConfidenceWords": 14,
    "pagesProcessed": 12
  }
}
```

Key notes about the output:

- **`confidence`** per page is a 0-100 score from Tesseract — higher is better
- **`lowConfidenceWords`** lists words below the default
  `--confidence-threshold` of 30, which flags OCR errors you may want to
  manually review
- Using `--dpi 600` (vs the default 300) doubles resolution, which significantly
  improves accuracy on poor scans at the cost of ~4x processing time
- The `summary.averageConfidence` gives a quick quality check across all pages

---

## Step 3: Extract images as JPEG to ./contract-images/

**Script:** `scripts/extract-images.ts`

```bash
bun run scripts/extract-images.ts --format jpeg --output-dir ./contract-images/ ./scans/old-contract.pdf
```

**Expected JSON output:**

```json
{
  "file": "./scans/old-contract.pdf",
  "totalPages": 12,
  "outputDir": "./contract-images/",
  "format": "jpeg",
  "images": [
    {
      "page": 1,
      "index": 0,
      "filename": "old-contract-page1-img0.jpeg",
      "width": 2550,
      "height": 3300,
      "sizeBytes": 384210
    },
    {
      "page": 5,
      "index": 0,
      "filename": "old-contract-page5-img0.jpeg",
      "width": 800,
      "height": 600,
      "sizeBytes": 95400
    }
  ],
  "summary": {
    "totalImages": 2,
    "totalSizeBytes": 479610,
    "pagesWithImages": 2
  }
}
```

Note: Since this is a scanned PDF, many "images" may actually be the full-page
scans themselves. If discrete image XObjects can't be extracted, the script
falls back to rendering full pages at 288 DPI.

---

## Summary of commands

| Step | Purpose                    | Command                                                                                                    |
| ---- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1    | Confirm it's a scan        | `bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf`                                   |
| 2    | OCR with confidence scores | `bun run scripts/ocr-pdf.ts --format json --dpi 600 ./scans/old-contract.pdf`                              |
| 3    | Extract images as JPEG     | `bun run scripts/extract-images.ts --format jpeg --output-dir ./contract-images/ ./scans/old-contract.pdf` |

## Notes on the "Text before OCR" principle

The skill's Key Principle #1 states: _"Always try `extract-text.ts` first. It's
faster and more accurate for PDFs with embedded text. Only use `ocr-pdf.ts` when
extract-text returns empty or garbled output."_

This matters because:

- **Speed:** `extract-text.ts` reads the existing text layer directly —
  near-instant. `ocr-pdf.ts` renders each page to an image and runs Tesseract,
  which at 600 DPI on 12 pages could take 30-60 seconds.
- **Accuracy:** Embedded text is 100% accurate. OCR is probabilistic — even at
  600 DPI you'll get some `lowConfidenceWords` that need human review.
- **Cost:** OCR consumes significantly more CPU and memory. No reason to pay
  that cost if the text is already there.

In this case, Step 1 confirmed empty text (`pagesWithText: 0`), so OCR is the
right call. The `--dpi 600` flag is appropriate for poor-quality scans — it
renders pages at 600 DPI before feeding to Tesseract, giving the OCR engine more
pixels to work with.

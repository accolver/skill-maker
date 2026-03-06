# Scanned PDF — OCR and Image Extraction

## Approach

Following the **"Text before OCR"** principle from the PDF Toolkit skill: always
try `extract-text.ts` first. It's faster and more accurate for PDFs with
embedded text. Only fall back to `ocr-pdf.ts` when extract-text returns empty or
garbled output. This confirms the PDF is actually a scan before spending time on
OCR.

The workflow has three steps:

1. **Confirm it's a scan** — run `extract-text.ts` to verify no selectable text
2. **OCR the document** — run `ocr-pdf.ts` at 600 DPI with JSON output for
   confidence scores
3. **Extract images** — run `extract-images.ts` to save embedded images as JPEG

---

## Step 1: Confirm the PDF is a scan with extract-text.ts

### Script: `scripts/extract-text.ts`

Try extracting text first. If the PDF is truly a scan, this will return empty or
garbled text, confirming we need OCR.

```bash
bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf
```

### Expected output (confirming it's a scan)

```json
{
  "file": "./scans/old-contract.pdf",
  "totalPages": 4,
  "pages": [
    { "page": 1, "text": "" },
    { "page": 2, "text": "" },
    { "page": 3, "text": "" },
    { "page": 4, "text": "" }
  ],
  "summary": {
    "totalCharacters": 0,
    "pagesWithText": 0,
    "pagesEmpty": 4
  }
}
```

All pages return empty text — this confirms the document is a scanned PDF with
no embedded text layer. We need to use `ocr-pdf.ts`.

---

## Step 2: OCR the scanned PDF with ocr-pdf.ts

### Script: `scripts/ocr-pdf.ts`

Run OCR at 600 DPI (higher than the 300 default) for better accuracy on a
poor-quality scan. Use `--format json` to get structured output with confidence
scores.

```bash
bun run scripts/ocr-pdf.ts --dpi 600 --format json ./scans/old-contract.pdf
```

### Expected JSON output

```json
{
  "file": "./scans/old-contract.pdf",
  "dpi": 600,
  "lang": "eng",
  "totalPages": 4,
  "pages": [
    {
      "page": 1,
      "text": "PROFESSIONAL SERVICES AGREEMENT\n\nThis Agreement is entered into as of January 15, 2019, by and between Acme Corporation (\"Client\") and Summit Consulting LLC (\"Consultant\").\n\n1. SCOPE OF SERVICES\nThe Consultant shall provide strategic advisory services as described in Exhibit A attached hereto...",
      "confidence": 87.3,
      "wordCount": 312,
      "lowConfidenceWords": [
        {
          "word": "hereto",
          "confidence": 28,
          "position": { "line": 5, "index": 14 }
        },
        {
          "word": "indemnfy",
          "confidence": 22,
          "position": { "line": 12, "index": 3 }
        }
      ]
    },
    {
      "page": 2,
      "text": "2. COMPENSATION\nClient shall pay Consultant a fee of $15,000 per month...\n\n3. TERM AND TERMINATION\nThis Agreement shall commence on January 15, 2019 and continue for a period of twelve (12) months...",
      "confidence": 91.5,
      "wordCount": 287,
      "lowConfidenceWords": [
        {
          "word": "twelv",
          "confidence": 25,
          "position": { "line": 8, "index": 11 }
        }
      ]
    },
    {
      "page": 3,
      "text": "4. CONFIDENTIALITY\nConsultant agrees to maintain the confidentiality of all proprietary information...\n\n5. INTELLECTUAL PROPERTY\nAll work product created by Consultant under this Agreement shall be the sole property of Client...",
      "confidence": 89.1,
      "wordCount": 298,
      "lowConfidenceWords": []
    },
    {
      "page": 4,
      "text": "6. LIMITATION OF LIABILITY\nIn no event shall either party be liable for indirect, incidental, or consequential damages...\n\nIN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.\n\n_________________________\nJohn Smith, CEO\nAcme Corporation\n\n_________________________\nJane Doe, Managing Partner\nSummit Consulting LLC",
      "confidence": 83.7,
      "wordCount": 195,
      "lowConfidenceWords": [
        {
          "word": "WHEREOF",
          "confidence": 29,
          "position": { "line": 4, "index": 3 }
        },
        {
          "word": "Partnr",
          "confidence": 19,
          "position": { "line": 10, "index": 2 }
        }
      ]
    }
  ],
  "summary": {
    "averageConfidence": 87.9,
    "totalWords": 1092,
    "totalLowConfidenceWords": 4,
    "confidenceThreshold": 30
  }
}
```

Key observations:

- Average confidence of 87.9% — reasonable for a scanned document at 600 DPI
- 4 low-confidence words flagged (below the default threshold of 30)
- `lowConfidenceWords` identifies likely OCR misreads: "indemnfy" (should be
  "indemnify"), "twelv" (should be "twelve"), "Partnr" (should be "Partner")
- Page 4 has lowest confidence (83.7%) — signature blocks and formatting are
  harder for OCR

---

## Step 3: Extract images from the PDF with extract-images.ts

### Script: `scripts/extract-images.ts`

Extract any embedded images (logos, signature scans, stamps) and save as JPEG to
the specified output directory.

```bash
bun run scripts/extract-images.ts --format jpeg --output-dir ./contract-images/ ./scans/old-contract.pdf
```

### Expected JSON output

```json
{
  "file": "./scans/old-contract.pdf",
  "outputDir": "./contract-images/",
  "format": "jpeg",
  "totalPages": 4,
  "images": [
    {
      "page": 1,
      "index": 0,
      "width": 3300,
      "height": 4200,
      "path": "./contract-images/old-contract-p1-0.jpeg"
    },
    {
      "page": 2,
      "index": 0,
      "width": 3300,
      "height": 4200,
      "path": "./contract-images/old-contract-p2-0.jpeg"
    },
    {
      "page": 3,
      "index": 0,
      "width": 3300,
      "height": 4200,
      "path": "./contract-images/old-contract-p3-0.jpeg"
    },
    {
      "page": 4,
      "index": 0,
      "width": 3300,
      "height": 4200,
      "path": "./contract-images/old-contract-p4-0.jpeg"
    }
  ],
  "summary": {
    "totalImages": 4,
    "pagesWithImages": 4,
    "savedTo": "./contract-images/"
  }
}
```

Since this is a scanned PDF, each page is itself an image XObject. The extracted
images are the full-page scans at their native resolution. Images are saved as
JPEG files in `./contract-images/` with naming pattern
`old-contract-p{page}-{index}.jpeg`.

---

## Summary of Commands

```bash
# Step 1: Confirm it's a scan (text before OCR principle)
bun run scripts/extract-text.ts --format json ./scans/old-contract.pdf

# Step 2: OCR the document at 600 DPI with confidence scores
bun run scripts/ocr-pdf.ts --dpi 600 --format json ./scans/old-contract.pdf

# Step 3: Extract images as JPEG to ./contract-images/
bun run scripts/extract-images.ts --format jpeg --output-dir ./contract-images/ ./scans/old-contract.pdf
```

## Key Principle Applied: Text Before OCR

The "Text before OCR" principle (Key Principle #1 from the PDF Toolkit skill)
dictates: always try `extract-text.ts` first because it's faster and more
accurate for PDFs with embedded text. Only use `ocr-pdf.ts` when extract-text
returns empty or garbled output.

In this case, Step 1 confirmed all 4 pages returned empty text
(`totalCharacters: 0`, `pagesWithText: 0`), validating the need for OCR in Step
2. Without this check, we might have unnecessarily OCR'd a PDF that already had
selectable text — which would be slower and produce lower-quality output than
direct text extraction.

## Checklist

- [x] Identified the correct scripts: extract-text (verify), ocr-pdf (OCR),
      extract-images (image extraction)
- [x] Checked if PDF has selectable text (extract-text) — confirmed it's scanned
- [x] Used `--format json` for structured output with confidence scores
- [x] Used `--dpi 600` for better OCR accuracy on poor-quality scan
- [x] Used `--format jpeg` and `--output-dir ./contract-images/` for image
      extraction
- [x] Verified expected output includes confidence scores and lowConfidenceWords

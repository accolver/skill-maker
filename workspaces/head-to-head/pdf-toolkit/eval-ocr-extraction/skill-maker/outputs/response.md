# PDF OCR & Image Extraction: `./scans/old-contract.pdf`

## Approach

Following the **Text Before OCR** principle from the PDF Toolkit skill: always
try `extract-text.ts` first, then fall back to `ocr-pdf.ts` only if the result
is empty or garbled. This matters because native text extraction is instant and
perfectly accurate, while OCR is slow, resource-intensive, and introduces
errors. A PDF that "looks" scanned may still contain a hidden text layer (common
with modern scanners).

This task involves three operations:

1. **Extract text** — confirm the PDF is a scan (text-first approach)
2. **OCR the document** — get text content with confidence scores in JSON
3. **Extract images** — save embedded images as JPEGs

---

## Step 1: Try Text Extraction First (Confirm It's a Scan)

Start with text extraction to understand what the PDF contains:

```bash
bun run scripts/extract-text.ts ./scans/old-contract.pdf --format json
```

The `--format json` flag ensures structured output that's easy to parse
programmatically. JSON output goes to stdout; progress messages and warnings go
to stderr.

**What to look for in the JSON output:**

- If the `text` field has readable content → use it directly, no OCR needed
- If `text` is empty (`""`) or contains garbled characters (e.g., `\x00`,
  mojibake, random symbols) → this confirms it's a scanned PDF, proceed to OCR
  in Step 2

**Expected output for a scanned PDF:**

```json
{
  "pages": 12,
  "text": "",
  "metadata": {
    "title": "",
    "author": ""
  }
}
```

An empty or near-empty `text` field confirms the PDF is image-based (a scan)
with no hidden text layer. Proceed to OCR.

---

## Step 2: OCR the Scanned Document (600 DPI, JSON with Confidence Scores)

Since Step 1 confirmed the PDF is a scan (empty/garbled text), fall back to OCR.
Using `--dpi 600` as requested because the scan quality might be poor — higher
DPI improves accuracy on small text and degraded scans (the default is 300; 600
is recommended for poor-quality scans per the skill guidance).

```bash
bun run scripts/ocr-pdf.ts ./scans/old-contract.pdf --dpi 600 --format json
```

**Key flags explained:**

| Flag            | Purpose                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `--dpi 600`     | Renders pages at 600 DPI for better OCR accuracy on poor-quality scans |
| `--format json` | Outputs structured JSON with per-word confidence scores                |

**Expected output structure (JSON to stdout):**

```json
{
  "pages": 12,
  "text": "CONTRACT AGREEMENT\n\nThis agreement is entered into on...",
  "confidence": 0.87,
  "words": [
    { "text": "CONTRACT", "confidence": 0.95, "page": 1 },
    { "text": "AGREEMENT", "confidence": 0.93, "page": 1 },
    { "text": "This", "confidence": 0.91, "page": 1 }
  ]
}
```

**Important: Check confidence scores.** When using `--format json` with OCR,
review the per-word confidence values and warn about any sections below 80%
confidence. Low-confidence words can silently corrupt extracted text. For
example:

- Words with confidence ≥ 80% → reliable
- Words with confidence < 80% → flag for manual review; these may contain OCR
  errors (misread characters, merged words, etc.)

> **Note:** 600 DPI will increase processing time significantly compared to the
> 300 DPI default. This is the correct tradeoff for poor-quality scans where
> accuracy matters more than speed.

---

## Step 3: Extract Images from the Document

Extract all embedded images from the PDF and save them as JPEG files in the
specified output directory:

```bash
bun run scripts/extract-images.ts ./scans/old-contract.pdf --format jpeg --output-dir ./contract-images
```

**Key flags explained:**

| Flag                             | Purpose                                             |
| -------------------------------- | --------------------------------------------------- |
| `--format jpeg`                  | Saves extracted images as JPEG files                |
| `--output-dir ./contract-images` | Specifies the output directory for extracted images |

Always specify `--output-dir` explicitly — without it, the script may write to
unexpected locations or fail.

**Expected output (JSON to stdout):**

```json
{
  "input": "./scans/old-contract.pdf",
  "images_extracted": 5,
  "output_dir": "./contract-images",
  "files": [
    {
      "file": "./contract-images/image-1.jpeg",
      "page": 1,
      "width": 2550,
      "height": 3300
    },
    {
      "file": "./contract-images/image-2.jpeg",
      "page": 3,
      "width": 800,
      "height": 600
    },
    {
      "file": "./contract-images/image-3.jpeg",
      "page": 5,
      "width": 1200,
      "height": 900
    },
    {
      "file": "./contract-images/image-4.jpeg",
      "page": 7,
      "width": 640,
      "height": 480
    },
    {
      "file": "./contract-images/image-5.jpeg",
      "page": 10,
      "width": 1024,
      "height": 768
    }
  ]
}
```

---

## Complete Command Sequence

Run these commands in order:

```bash
# Step 1: Try text extraction first (confirm it's a scan)
bun run scripts/extract-text.ts ./scans/old-contract.pdf --format json

# Step 2: OCR the scanned document (only after confirming text is empty/garbled)
bun run scripts/ocr-pdf.ts ./scans/old-contract.pdf --dpi 600 --format json

# Step 3: Extract images as JPEGs to ./contract-images/
bun run scripts/extract-images.ts ./scans/old-contract.pdf --format jpeg --output-dir ./contract-images
```

---

## Post-Processing Checklist

After running all three commands:

1. **Verify the scan confirmation** — Step 1 should show empty or garbled `text`
   in the JSON output, confirming OCR is necessary
2. **Review OCR confidence scores** — Check the JSON output from Step 2 for any
   words with confidence below 80%. Flag these sections for manual review
3. **Verify extracted images** — Check that `./contract-images/` contains the
   expected JPEG files from Step 3
4. **Report low-confidence sections** — If any OCR words fall below 80%
   confidence, list them with their page numbers so the user can manually verify
   those portions of the contract

## Common Mistakes Avoided

| Mistake                                          | How We Avoided It                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Running OCR first without trying text extraction | We run `extract-text.ts` first in Step 1 to confirm the PDF is actually a scan before invoking OCR |
| Omitting `--format json`                         | All commands use `--format json` for structured, parseable output                                  |
| Using low DPI for OCR                            | Using `--dpi 600` as requested for poor-quality scan accuracy (default is 300)                     |
| Forgetting `--output-dir` for extract-images     | Explicitly specified `--output-dir ./contract-images`                                              |
| Not checking OCR confidence scores               | Documented the need to review per-word confidence and warn about sections below 80%                |

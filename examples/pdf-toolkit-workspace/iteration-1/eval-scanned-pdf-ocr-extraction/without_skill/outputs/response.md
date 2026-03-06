# Dry Run: Scanned PDF OCR & Image Extraction

## Overview

This document describes the exact commands to: (1) attempt text extraction to
confirm the PDF is a scan, (2) OCR the document at 600 DPI with confidence
scores in JSON, and (3) extract embedded images as JPEGs.

---

## Step 1: Attempt Text Extraction (Confirm It's a Scan)

### Command

```bash
pdftotext ./scans/old-contract.pdf -
```

### What This Does

`pdftotext` (from the **poppler-utils** package) attempts to extract any
selectable/embedded text from the PDF. By using `-` as the output, it prints to
stdout.

### Expected Output

For a scanned PDF, the output will be empty or contain only whitespace/garbage
characters, confirming there is no selectable text layer:

```
# Empty output or just blank lines, confirming this is a scanned image-only PDF
```

### Alternative Confirmation

```bash
pdffonts ./scans/old-contract.pdf
```

This lists fonts embedded in the PDF. A scanned document with no text layer will
show an empty font table:

```
name                                 type              encoding         emb sub uni object ID
------------------------------------ ----------------- ---------------- --- --- --- ---------
```

No fonts listed = no text layer = confirmed scan.

---

## Step 2: OCR the Document at 600 DPI with Confidence Scores (JSON)

### Step 2a: Convert PDF Pages to High-Resolution Images

```bash
mkdir -p ./ocr-temp

pdftoppm -r 600 -jpeg ./scans/old-contract.pdf ./ocr-temp/page
```

### What This Does

`pdftoppm` (from **poppler-utils**) renders each page of the PDF as a raster
image at 600 DPI. The `-jpeg` flag outputs JPEG format. Output files will be
named:

```
./ocr-temp/page-1.jpg
./ocr-temp/page-2.jpg
./ocr-temp/page-3.jpg
...
```

### Step 2b: Run OCR with Tesseract and Get Confidence Scores

```bash
tesseract ./ocr-temp/page-1.jpg ./ocr-temp/page-1 --dpi 600 -l eng tsv
```

### What This Does

Runs **Tesseract OCR** on each page image at 600 DPI. The `tsv` output format
produces a tab-separated file (`page-1.tsv`) containing word-level text with
confidence scores (column `conf`).

### Expected TSV Output (page-1.tsv)

```
level	page_num	block_num	par_num	line_num	word_num	left	top	width	height	conf	text
1	1	0	0	0	0	0	0	2550	3300	-1	
2	1	1	0	0	0	72	85	2400	120	-1	
3	1	1	1	0	0	72	85	2400	120	-1	
4	1	1	1	1	0	72	85	2400	40	-1	
5	1	1	1	1	1	72	85	350	40	92	CONTRACT
5	1	1	1	1	2	450	85	150	40	95	FOR
5	1	1	1	1	3	630	85	300	40	88	SERVICES
5	1	1	1	2	1	72	140	200	35	91	This
5	1	1	1	2	2	290	140	250	35	94	agreement
5	1	1	1	2	3	560	140	50	35	97	is
```

Words appear at level 5. The `conf` column (0-100) is the OCR confidence score
per word.

### Step 2c: Convert TSV Results to JSON with Confidence Scores

Use a Python script to parse all TSV files and produce a single JSON output:

```bash
python3 -c "
import csv
import json
import glob
import os

results = {'pages': []}

for tsv_file in sorted(glob.glob('./ocr-temp/page-*.tsv')):
    page_num = os.path.basename(tsv_file).replace('page-', '').replace('.tsv', '')
    page_data = {
        'page': int(page_num),
        'words': [],
        'full_text': '',
        'average_confidence': 0.0
    }
    
    word_count = 0
    total_confidence = 0
    words_list = []
    
    with open(tsv_file, 'r') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            conf = int(row.get('conf', -1))
            text = row.get('text', '').strip()
            if conf >= 0 and text:
                word_entry = {
                    'text': text,
                    'confidence': conf,
                    'bounding_box': {
                        'left': int(row['left']),
                        'top': int(row['top']),
                        'width': int(row['width']),
                        'height': int(row['height'])
                    }
                }
                page_data['words'].append(word_entry)
                words_list.append(text)
                total_confidence += conf
                word_count += 1
    
    page_data['full_text'] = ' '.join(words_list)
    page_data['average_confidence'] = round(total_confidence / word_count, 2) if word_count > 0 else 0.0
    results['pages'].append(page_data)

# Compute overall stats
all_confs = [w['confidence'] for p in results['pages'] for w in p['words']]
results['summary'] = {
    'total_pages': len(results['pages']),
    'total_words': len(all_confs),
    'overall_average_confidence': round(sum(all_confs) / len(all_confs), 2) if all_confs else 0.0,
    'min_confidence': min(all_confs) if all_confs else 0,
    'max_confidence': max(all_confs) if all_confs else 0,
    'dpi_used': 600
}

print(json.dumps(results, indent=2))
" > ./ocr-output.json
```

### Expected JSON Output (ocr-output.json)

```json
{
  "pages": [
    {
      "page": 1,
      "words": [
        {
          "text": "CONTRACT",
          "confidence": 92,
          "bounding_box": {
            "left": 72,
            "top": 85,
            "width": 350,
            "height": 40
          }
        },
        {
          "text": "FOR",
          "confidence": 95,
          "bounding_box": {
            "left": 450,
            "top": 85,
            "width": 150,
            "height": 40
          }
        },
        {
          "text": "SERVICES",
          "confidence": 88,
          "bounding_box": {
            "left": 630,
            "top": 85,
            "width": 300,
            "height": 40
          }
        }
      ],
      "full_text": "CONTRACT FOR SERVICES This agreement is ...",
      "average_confidence": 91.5
    }
  ],
  "summary": {
    "total_pages": 1,
    "total_words": 250,
    "overall_average_confidence": 89.3,
    "min_confidence": 42,
    "max_confidence": 99,
    "dpi_used": 600
  }
}
```

### Alternative: Single-command OCR (all pages at once)

If Tesseract 4+ is available and the PDF is not too large:

```bash
tesseract ./scans/old-contract.pdf ./ocr-output --dpi 600 -l eng tsv
```

Tesseract can accept PDFs directly (it internally converts to images). However,
using `pdftoppm` first gives more control over the DPI and image quality.

---

## Step 3: Extract Images from the PDF as JPEGs

### Command

```bash
mkdir -p ./contract-images

pdfimages -j ./scans/old-contract.pdf ./contract-images/image
```

### What This Does

`pdfimages` (from **poppler-utils**) extracts all embedded images from the PDF.
The `-j` flag saves them as JPEG files. Output files will be named:

```
./contract-images/image-000.jpg
./contract-images/image-001.jpg
./contract-images/image-002.jpg
...
```

Each file corresponds to a distinct image object embedded in the PDF. For a
scanned document, there is typically one image per page (the full-page scan).

### Expected Output

```
$ ls -la ./contract-images/
total 4520
drwxr-xr-x  5 user  staff    160 Mar  6 12:00 .
drwxr-xr-x  8 user  staff    256 Mar  6 12:00 ..
-rw-r--r--  1 user  staff  1520384 Mar  6 12:00 image-000.jpg
-rw-r--r--  1 user  staff  1489920 Mar  6 12:00 image-001.jpg
-rw-r--r--  1 user  staff  1510400 Mar  6 12:00 image-002.jpg
```

### Alternative: Extract at Higher Quality / Specific Format

If the embedded images are not JPEG (e.g., they're stored as CCITT fax or JBIG2,
common in scanned PDFs), use `-all` to extract in their native format, then
convert:

```bash
pdfimages -all ./scans/old-contract.pdf ./contract-images/image

# Convert any non-JPEG files to JPEG
for f in ./contract-images/image-*.ppm ./contract-images/image-*.png ./contract-images/image-*.tiff; do
    [ -f "$f" ] && convert "$f" "${f%.*}.jpg" && rm "$f"
done
```

The `convert` command is from **ImageMagick**.

---

## Complete Script (All Steps Combined)

```bash
#!/usr/bin/env bash
set -euo pipefail

INPUT_PDF="./scans/old-contract.pdf"
OCR_TEMP="./ocr-temp"
IMAGE_DIR="./contract-images"
OCR_OUTPUT="./ocr-output.json"

echo "=== Step 1: Verify PDF is a scan (no selectable text) ==="
TEXT_OUTPUT=$(pdftotext "$INPUT_PDF" - 2>/dev/null)
if [ -z "$(echo "$TEXT_OUTPUT" | tr -d '[:space:]')" ]; then
    echo "CONFIRMED: No selectable text found. This is a scanned PDF."
else
    echo "WARNING: Some text was extracted. This may not be a pure scan."
    echo "Extracted text preview:"
    echo "$TEXT_OUTPUT" | head -5
fi

echo ""
echo "=== Step 2: OCR at 600 DPI ==="
mkdir -p "$OCR_TEMP"

echo "Converting PDF pages to 600 DPI images..."
pdftoppm -r 600 -jpeg "$INPUT_PDF" "$OCR_TEMP/page"

echo "Running Tesseract OCR on each page..."
for img in "$OCR_TEMP"/page-*.jpg; do
    base="${img%.jpg}"
    echo "  OCR: $(basename "$img")"
    tesseract "$img" "$base" --dpi 600 -l eng tsv
done

echo "Converting TSV results to JSON..."
python3 -c "
import csv, json, glob, os
results = {'pages': []}
for tsv_file in sorted(glob.glob('$OCR_TEMP/page-*.tsv')):
    page_num = os.path.basename(tsv_file).replace('page-', '').replace('.tsv', '')
    page_data = {'page': int(page_num), 'words': [], 'full_text': '', 'average_confidence': 0.0}
    word_count = total_confidence = 0
    words_list = []
    with open(tsv_file, 'r') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            conf = int(row.get('conf', -1))
            text = row.get('text', '').strip()
            if conf >= 0 and text:
                page_data['words'].append({
                    'text': text, 'confidence': conf,
                    'bounding_box': {'left': int(row['left']), 'top': int(row['top']),
                                     'width': int(row['width']), 'height': int(row['height'])}
                })
                words_list.append(text)
                total_confidence += conf
                word_count += 1
    page_data['full_text'] = ' '.join(words_list)
    page_data['average_confidence'] = round(total_confidence / word_count, 2) if word_count > 0 else 0.0
    results['pages'].append(page_data)
all_confs = [w['confidence'] for p in results['pages'] for w in p['words']]
results['summary'] = {
    'total_pages': len(results['pages']),
    'total_words': len(all_confs),
    'overall_average_confidence': round(sum(all_confs) / len(all_confs), 2) if all_confs else 0.0,
    'min_confidence': min(all_confs) if all_confs else 0,
    'max_confidence': max(all_confs) if all_confs else 0,
    'dpi_used': 600
}
print(json.dumps(results, indent=2))
" > "$OCR_OUTPUT"
echo "OCR results saved to $OCR_OUTPUT"

echo ""
echo "=== Step 3: Extract images as JPEG ==="
mkdir -p "$IMAGE_DIR"
pdfimages -j "$INPUT_PDF" "$IMAGE_DIR/image"
echo "Images saved to $IMAGE_DIR/"
ls -la "$IMAGE_DIR/"

echo ""
echo "=== Cleanup ==="
rm -rf "$OCR_TEMP"
echo "Done. Temporary OCR files removed."
```

---

## Required Tools & Installation

| Tool        | Package       | Install (macOS)            | Install (Ubuntu/Debian)       |
| ----------- | ------------- | -------------------------- | ----------------------------- |
| `pdftotext` | poppler-utils | `brew install poppler`     | `apt install poppler-utils`   |
| `pdftoppm`  | poppler-utils | (included with poppler)    | (included with poppler-utils) |
| `pdfimages` | poppler-utils | (included with poppler)    | (included with poppler-utils) |
| `pdffonts`  | poppler-utils | (included with poppler)    | (included with poppler-utils) |
| `tesseract` | tesseract-ocr | `brew install tesseract`   | `apt install tesseract-ocr`   |
| `python3`   | python3       | (pre-installed on macOS)   | `apt install python3`         |
| `convert`   | imagemagick   | `brew install imagemagick` | `apt install imagemagick`     |

### Verify Installation

```bash
pdftotext -v 2>&1 | head -1
tesseract --version | head -1
python3 --version
```

---

## Why 600 DPI?

- Default DPI for `pdftoppm` is 150, which is fine for display but poor for OCR
  on degraded scans.
- 300 DPI is standard for good-quality scans.
- **600 DPI** is recommended for poor-quality scans because:
  - More pixels per character gives Tesseract more data to work with.
  - Reduces aliasing artifacts on thin strokes and serifs.
  - Typical confidence improvement: 5-15% over 300 DPI on degraded source
    material.
- Going above 600 DPI (e.g., 1200) yields diminishing returns and significantly
  increases processing time and file sizes.

---

## Troubleshooting

| Issue                          | Cause                                   | Fix                                                                                       |
| ------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Empty OCR output               | Wrong language model                    | Add `-l eng+fra` or other language codes                                                  |
| Low confidence (<60%)          | Very poor scan quality                  | Pre-process with ImageMagick: `convert -density 600 -threshold 50% input.jpg cleaned.jpg` |
| `pdfimages` extracts 0 images  | Images stored as inline content streams | Use `pdftoppm` instead to render pages as images                                          |
| Tesseract "empty page" warning | Page is blank or extremely faded        | Increase contrast: `convert -normalize -contrast-stretch 0.1% input.jpg enhanced.jpg`     |
| Non-Latin characters garbled   | Missing Tesseract language data         | Install: `apt install tesseract-ocr-[lang]` or `brew install tesseract-lang`              |

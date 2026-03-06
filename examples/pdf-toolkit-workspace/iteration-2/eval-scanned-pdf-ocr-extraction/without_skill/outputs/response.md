# Extracting Text and Images from a Scanned PDF

Here's how I'd approach this using standard command-line tools.

## Step 1: Try Extracting Text to Confirm It's a Scan

First, let's attempt to extract text using `pdftotext` (from Poppler utilities):

```bash
pdftotext ./scans/old-contract.pdf -
```

If the document is truly a scanned image, this will either produce empty output
or garbage characters. That confirms we need OCR.

You could also check with:

```bash
pdftotext ./scans/old-contract.pdf /dev/stdout | wc -c
```

If the byte count is very low (near zero), it's a scan.

## Step 2: OCR the Document with Tesseract

To OCR a scanned PDF, we need to first convert it to images, then run Tesseract
on those images.

### Convert PDF pages to images at 600 DPI

```bash
pdftoppm -jpeg -r 600 ./scans/old-contract.pdf /tmp/contract-page
```

This produces files like `/tmp/contract-page-1.jpg`, `/tmp/contract-page-2.jpg`,
etc.

### Run Tesseract OCR on each page

```bash
for img in /tmp/contract-page-*.jpg; do
  tesseract "$img" stdout --dpi 600
done
```

To get it all into a single text file:

```bash
for img in /tmp/contract-page-*.jpg; do
  tesseract "$img" stdout --dpi 600
done > ocr-output.txt
```

### Getting confidence scores

Tesseract can output per-word confidence scores using TSV output mode:

```bash
for img in /tmp/contract-page-*.jpg; do
  tesseract "$img" stdout --dpi 600 tsv
done > ocr-output.tsv
```

The TSV output includes columns: level, page_num, block_num, par_num, line_num,
word_num, left, top, width, height, conf, text.

The `conf` column has confidence values (0-100).

To convert this to JSON, you could use a small script:

```bash
for img in /tmp/contract-page-*.jpg; do
  tesseract "$img" stdout --dpi 600 tsv
done | python3 -c "
import sys, json, csv

reader = csv.DictReader(sys.stdin, delimiter='\t')
words = []
for row in reader:
    if row['text'].strip():
        words.append({
            'text': row['text'],
            'confidence': float(row['conf']),
            'page': int(row['page_num']),
            'position': {
                'left': int(row['left']),
                'top': int(row['top']),
                'width': int(row['width']),
                'height': int(row['height'])
            }
        })

result = {
    'total_words': len(words),
    'average_confidence': sum(w['confidence'] for w in words) / len(words) if words else 0,
    'words': words
}
print(json.dumps(result, indent=2))
" > ocr-results.json
```

## Step 3: Extract Images from the PDF

Use `pdfimages` (also from Poppler) to extract embedded images:

```bash
mkdir -p ./contract-images
pdfimages -j ./scans/old-contract.pdf ./contract-images/image
```

The `-j` flag saves images as JPEG where possible. This produces files like
`./contract-images/image-000.jpg`, `./contract-images/image-001.jpg`, etc.

If you want to force all images to JPEG regardless of their internal format:

```bash
pdfimages -j ./scans/old-contract.pdf ./contract-images/image
# For any non-JPEG images that come out as PPM:
for f in ./contract-images/*.ppm; do
  convert "$f" "${f%.ppm}.jpg" && rm "$f"
done
```

## Expected Output

### From Step 1 (text extraction attempt):

- Empty or near-empty output, confirming the PDF is a scan

### From Step 2 (OCR):

A JSON file (`ocr-results.json`) containing something like:

```json
{
  "total_words": 1523,
  "average_confidence": 82.4,
  "words": [
    {
      "text": "CONTRACT",
      "confidence": 95.0,
      "page": 1,
      "position": { "left": 200, "top": 100, "width": 300, "height": 40 }
    },
    {
      "text": "between",
      "confidence": 88.5,
      "page": 1,
      "position": { "left": 100, "top": 160, "width": 150, "height": 30 }
    }
  ]
}
```

### From Step 3 (image extraction):

JPEG files in `./contract-images/`:

```
./contract-images/image-000.jpg
./contract-images/image-001.jpg
...
```

## Tools Summary

| Tool        | Package       | Purpose                             |
| ----------- | ------------- | ----------------------------------- |
| `pdftotext` | poppler-utils | Attempt direct text extraction      |
| `pdftoppm`  | poppler-utils | Convert PDF pages to images for OCR |
| `tesseract` | tesseract-ocr | OCR engine for text recognition     |
| `pdfimages` | poppler-utils | Extract embedded images from PDF    |
| `convert`   | imagemagick   | Convert PPM to JPEG (if needed)     |

## Installation (if needed)

```bash
# macOS
brew install poppler tesseract imagemagick

# Ubuntu/Debian
sudo apt-get install poppler-utils tesseract-ocr imagemagick
```

## Notes

- 600 DPI is good for poor quality scans; the default is usually 300 DPI
- Tesseract confidence scores range from 0-100; words below ~60 may be
  unreliable
- For multi-language documents, add `-l eng+fra` (or appropriate languages) to
  the tesseract command
- The TSV output from Tesseract also includes bounding box information which can
  be useful for document layout analysis

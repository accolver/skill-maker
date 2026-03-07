# Scanned PDF OCR and Image Extraction

I'll help you extract text and images from your scanned PDF. Let me work through
this step by step.

## Step 1: Try extracting text to confirm it's a scan

First, let's attempt normal text extraction with `pdftotext`:

```bash
pdftotext ./scans/old-contract.pdf ./scans/old-contract.txt
```

If the file is a scan, this will produce an empty or nearly empty text file.
Let's check:

```bash
wc -c ./scans/old-contract.txt
```

If the output shows 0 bytes (or just whitespace), that confirms the PDF contains
scanned images rather than selectable text. This means we need OCR.

## Step 2: OCR the document

We'll use `pdftoppm` to convert the PDF pages to images, then `tesseract` for
OCR.

### Convert PDF pages to high-resolution images

```bash
mkdir -p ./scans/ocr-temp
pdftoppm -r 600 -png ./scans/old-contract.pdf ./scans/ocr-temp/page
```

This converts each page at 600 DPI for better OCR accuracy.

### Run Tesseract OCR on each page

```bash
for img in ./scans/ocr-temp/page-*.png; do
  page_num=$(echo "$img" | grep -oP '\d+')
  tesseract "$img" "./scans/ocr-temp/page-${page_num}" -l eng --dpi 600
done
```

### Combine all page text

```bash
cat ./scans/ocr-temp/page-*.txt > ./scans/old-contract-ocr.txt
```

### Get OCR output with confidence scores

Tesseract can output TSV data that includes confidence scores:

```bash
for img in ./scans/ocr-temp/page-*.png; do
  page_num=$(echo "$img" | grep -oP '\d+')
  tesseract "$img" "./scans/ocr-temp/page-${page_num}-tsv" -l eng --dpi 600 tsv
done
```

Now let's parse the TSV into JSON format with confidence scores:

```python
import json
import csv
import glob

results = []

for tsv_file in sorted(glob.glob('./scans/ocr-temp/page-*-tsv.tsv')):
    page_num = tsv_file.split('page-')[1].split('-tsv')[0]
    
    with open(tsv_file, 'r') as f:
        reader = csv.DictReader(f, delimiter='\t')
        words = []
        for row in reader:
            if row['text'].strip():
                words.append({
                    "text": row['text'],
                    "confidence": float(row['conf']),
                    "block": int(row['block_num']),
                    "line": int(row['line_num']),
                    "word": int(row['word_num'])
                })
        
        results.append({
            "page": int(page_num),
            "words": words
        })

output = {"pages": results}

with open('./scans/old-contract-ocr.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"OCR complete. {sum(len(p['words']) for p in results)} words extracted.")
```

Save this as `ocr_to_json.py` and run:

```bash
python3 ocr_to_json.py
```

The JSON output at `./scans/old-contract-ocr.json` will look like:

```json
{
  "pages": [
    {
      "page": 1,
      "words": [
        {
          "text": "CONTRACT",
          "confidence": 95.2,
          "block": 1,
          "line": 1,
          "word": 1
        },
        {
          "text": "AGREEMENT",
          "confidence": 88.7,
          "block": 1,
          "line": 1,
          "word": 2
        }
      ]
    }
  ]
}
```

## Step 3: Extract images from the PDF

```bash
mkdir -p ./contract-images
pdfimages -j ./scans/old-contract.pdf ./contract-images/image
```

The `-j` flag tells `pdfimages` to save images in JPEG format. Images will be
saved as `image-000.jpg`, `image-001.jpg`, etc. in the `./contract-images/`
directory.

Let's verify what was extracted:

```bash
ls -la ./contract-images/
```

## Summary

Here's what was done:

| Step                    | Tool                        | Purpose                       |
| ----------------------- | --------------------------- | ----------------------------- |
| Text extraction test    | `pdftotext`                 | Confirm document is a scan    |
| PDF to image conversion | `pdftoppm` at 600 DPI       | High-res images for OCR       |
| OCR processing          | `tesseract` with TSV output | Extract text with confidence  |
| JSON conversion         | Python script               | Structure results with scores |
| Image extraction        | `pdfimages -j`              | Save embedded images as JPEG  |

The OCR results are in `./scans/old-contract-ocr.json` with per-word confidence
scores, and extracted images are in `./contract-images/`.

## Cleanup

After verifying the results, you can remove the temporary files:

```bash
rm -rf ./scans/ocr-temp
```

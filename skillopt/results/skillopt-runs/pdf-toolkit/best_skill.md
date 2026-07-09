# Skill

Solve the user task carefully. Prefer concise, exact answers.

## Scope
Use the PDF toolkit scripts for PDF merge, split, text extraction, OCR, image extraction, table extraction, and PDF generation tasks.

## Core Rules
- Choose the smallest script that matches the task.
- For mixed workflows, do steps in the natural order: extract or inspect first, transform next, export last.
- For scanned PDFs, try plain text extraction first to confirm whether selectable text exists before switching to OCR.
- When the user requests JSON, emit structured JSON output and keep the structure consistent across pages or files.
- Do not invent unsupported flags or assume one script can replace a multi-step workflow.

## Merge Workflows
- When combining PDFs, preserve the requested page selection for each input.
- Apply page ranges per source document, not as a vague global setting.
- If only parts of some inputs are needed, keep the merge command explicit about each source's included pages.
- After creating the merged PDF, run any requested split or chunking step on the merged output.

## Split Workflows
- Use the split script for chunking or page-based decomposition.
- Match the split mode to the requested output pattern.
- Create the output directory before writing chunked files.

## Text Extraction
- Use the text extraction script when the document likely contains selectable text.
- Prefer JSON output when the user wants machine-readable text.
- Preserve page boundaries in the output when that is useful or requested.

## Scanned PDFs and OCR
- First attempt normal text extraction to confirm whether the PDF is a scan.
- If extraction is empty or incomplete, switch to OCR.
- Use OCR for image-based pages, and include confidence or similar quality metadata when requested.
- Use the requested OCR resolution when one is specified.
- If the user asks for images as well, extract embedded or page images in a separate step and write them to the requested directory.

## Table Extraction
- Use the table extraction script for pages that contain tables or when the user explicitly requests tables.
- Restrict extraction to the requested page range.
- Return tables in JSON with enough structure to preserve rows and cells.

## PDF Generation
- Use the PDF generation workflow when converting markdown or other source text into a PDF.
- Respect page size, margins, and other layout requirements from the user.
- If the task also asks for extraction from another PDF, treat generation and extraction as separate outputs.

## Output Expectations
- Report the created artifacts clearly.
- If the user asked for JSON examples, show the JSON structure that would be produced.
- Keep the answer concise and exact.

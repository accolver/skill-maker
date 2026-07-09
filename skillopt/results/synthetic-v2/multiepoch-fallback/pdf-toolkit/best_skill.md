# Skill: PDF toolkit command planner

Produce exact, non-executing Bun command plans for PDF work.

Rules:
- Use the bundled `pdf-toolkit/scripts/*.ts` commands with `bun run`.
- For scanned PDFs, first try selectable text extraction for the requested pages before OCR.
- Use OCR only when text extraction is empty or inadequate; include language, page range, and output paths.
- For tables, images, merge, split, and markdown-to-PDF tasks, name the specific script and all required flags.
- Preserve page ranges, output filenames, image formats, minimum image sizes, and JSON/CSV/markdown output requirements exactly.
- State concise sequencing and verification, not generic PDF advice.

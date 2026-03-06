# Final Benchmark — pdf-toolkit

## Overview

The **pdf-toolkit** skill provides 7 bundled Bun TypeScript scripts for PDF data
extraction (text, tables, images, OCR) and PDF manipulation (create, merge,
split). It guides agents to use the correct script for each operation, pass the
right CLI flags, and follow key principles like "text before OCR." It was
evaluated across 3 iterations with 3 eval cases covering text/table extraction
with PDF creation, merge/split workflows with page ranges, and scanned PDF OCR
with image extraction.

**Plateau reached at iteration 1** (confirmed over iterations 1-3 with 0%
improvement — skill achieved 100% from the first iteration).

## Results Summary

| Iteration | With Skill | Without Skill | Delta   | Notes                                      |
| --------- | ---------- | ------------- | ------- | ------------------------------------------ |
| 1         | 100%       | 0.0%          | +100.0% | Perfect from first iteration               |
| 2         | 100%       | 0.0%          | +100.0% | Confirmed — no changes needed              |
| 3         | 100%       | 4.2%          | +95.8%  | Plateau confirmed (3rd consecutive) — stop |

## Per-Eval Breakdown (Final Iteration)

| Eval Case                  | With Skill | Without Skill | Delta   |
| -------------------------- | ---------- | ------------- | ------- |
| extract-and-create-report  | 100% (8/8) | 12.5% (1/8)   | +87.5%  |
| merge-split-workflow       | 100% (8/8) | 0.0% (0/8)    | +100.0% |
| scanned-pdf-ocr-extraction | 100% (8/8) | 0.0% (0/8)    | +100.0% |

## What the Skill Adds

The without-skill baseline consistently fails on these assertion categories:

| Assertion Type                   | With Skill    | Without Skill | Why Without-Skill Fails                                                                |
| -------------------------------- | ------------- | ------------- | -------------------------------------------------------------------------------------- |
| Correct script selection         | Always passes | Always fails  | Agents use generic tools (pdfplumber, qpdf, tesseract CLI) instead of toolkit scripts  |
| bun run execution                | Always passes | Always fails  | Agents don't know about the Bun runtime or toolkit scripts                             |
| --from-markdown flag             | Always passes | Always fails  | Agents use pandoc/wkhtmltopdf/weasyprint instead of create-pdf.ts                      |
| --page-ranges semicolon syntax   | Always passes | Always fails  | Agents use per-tool range syntax (qpdf pages, pdftk handles) instead of semicolons     |
| --mode chunks / --chunk-size     | Always passes | Always fails  | Agents write custom splitting logic or use pdftk cat instead of split-pdf.ts           |
| lowConfidenceWords in OCR output | Always passes | Always fails  | Agents produce raw tesseract TSV/text output without structured confidence data        |
| ocr-pdf.ts with --dpi flag       | Always passes | Always fails  | Agents use pdftoppm + tesseract as separate steps instead of the integrated OCR script |
| extract-images.ts with --format  | Always passes | Always fails  | Agents use pdfimages CLI directly instead of the toolkit's image extraction script     |

The without-skill baseline occasionally passes on:

| Assertion Type | Notes                                                                |
| -------------- | -------------------------------------------------------------------- |
| --page-size a4 | Some agents use wkhtmltopdf with `--page-size A4` (case-insensitive) |

## Timing and Token Usage

| Metric         | With Skill (avg) | Without Skill (avg) | Delta         |
| -------------- | ---------------- | ------------------- | ------------- |
| Time (seconds) | 32.7             | 19.0                | +13.7s (+72%) |
| Tokens         | 8,800            | 6,300               | +2,500 (+40%) |

The skill adds ~14 seconds and ~2,500 tokens per operation. This is a modest
overhead — the with-skill responses are more structured (checklists, flag
tables, expected JSON output) but the additional tokens directly produce
correct, executable commands rather than generic advice.

## Skill Improvements Made

### Iterations 1-3

- No changes were needed — the skill achieved 100% pass rate from the first
  iteration. The SKILL.md was well-structured with:
  - Clear script selection guidance (which script for which task)
  - Complete flag reference tables for all 7 scripts
  - Key principles ("text before OCR", "always use --format json")
  - Common mistakes table with safe/unsafe pattern comparisons
  - Concrete examples with expected JSON output

## Key Findings

1. **The skill's biggest value is tool-specific knowledge.** Without the skill,
   agents default to generic PDF libraries (pdfplumber, qpdf, tesseract CLI).
   The skill redirects them to the toolkit's 7 purpose-built scripts with
   consistent JSON output, proper flag syntax, and integrated workflows.

2. **The delta is the highest observed.** At +95.8%, pdf-toolkit shows the
   largest improvement over baseline of any skill built with skill-maker. This
   makes sense: the assertions test for specific script names and flags that
   agents cannot guess without the skill. The skill doesn't just improve quality
   — it redirects agents to an entirely different toolchain.

3. **Without-skill agents are competent but use wrong tools.** Unlike some
   skills where agents produce incorrect output, here agents produce reasonable
   PDF processing solutions — just using the wrong libraries. A ~4% baseline is
   not from incompetence but from tool mismatch.

4. **The cost is minimal.** ~40% more tokens for ~24x better pass rate is an
   excellent trade-off. The overhead comes from the skill's structured response
   format (checklists, flag tables, verification commands) which makes the
   output more actionable.

5. **Only one assertion ever passes without the skill.** The `--page-size a4`
   flag occasionally appears in without-skill responses because agents using
   wkhtmltopdf happen to use the same flag name. All other assertions — script
   names, bun run commands, toolkit-specific flags — are completely absent from
   without-skill responses.

## Final Skill Validation

```
$ bun run scripts/validate-skill.ts examples/pdf-toolkit
{
  "valid": true,
  "skill_name": "pdf-toolkit",
  "errors": [],
  "warnings": [],
  "info": {
    "name": "pdf-toolkit",
    "body_lines": 268,
    "estimated_tokens": 2009,
    "has_scripts": true,
    "has_references": true,
    "has_assets": true,
    "referenced_files": [
      "scripts/create-pdf.ts",
      "scripts/extract-images.ts",
      "scripts/extract-tables.ts",
      "scripts/extract-text.ts",
      "scripts/merge-pdf.ts",
      "scripts/ocr-pdf.ts",
      "scripts/split-pdf.ts"
    ],
    "missing_files": []
  }
}
```

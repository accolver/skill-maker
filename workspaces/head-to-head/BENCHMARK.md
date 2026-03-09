# Head-to-Head Benchmark: skill-maker vs official skill-creator

**Date:** 2026-03-09 **Methodology:** Each skill-creation approach drafted a
SKILL.md for 3 high-delta domains (database-migration, error-handling,
pdf-toolkit). Subagents used each drafted skill to complete 3 eval prompts per
domain. Outputs graded against 8 assertions per eval (72 total assertions).

## Results

| Approach                   | Passed | Total | Pass Rate |
| -------------------------- | ------ | ----- | --------- |
| **skill-maker**            | 72     | 72    | **100%**  |
| **official skill-creator** | 67     | 72    | **93.1%** |
| **Delta**                  | +5     | —     | **+6.9%** |

## Per-Domain Breakdown

| Domain             | skill-maker  | official      | Delta  |
| ------------------ | ------------ | ------------- | ------ |
| database-migration | 24/24 (100%) | 21/24 (87.5%) | +12.5% |
| error-handling     | 24/24 (100%) | 22/24 (91.7%) | +8.3%  |
| pdf-toolkit        | 24/24 (100%) | 24/24 (100%)  | 0%     |

## Per-Eval Breakdown

| Eval                | skill-maker | official | Notes                                                              |
| ------------------- | ----------- | -------- | ------------------------------------------------------------------ |
| eval-add-column     | 8/8         | 5/8      | Official used PG15 single-statement; fails conservative assertions |
| eval-rename-column  | 8/8         | 8/8      | Both used expand-contract pattern                                  |
| eval-add-index      | 8/8         | 8/8      | Both used CONCURRENTLY with full analysis                          |
| eval-express-api    | 8/8         | 7/8      | Official missing isOperational field                               |
| eval-python-service | 8/8         | 7/8      | Official missing is_operational field                              |
| eval-error-response | 8/8         | 8/8      | Both produced complete schemas                                     |
| eval-extract-create | 8/8         | 8/8      | Both used correct scripts and flags                                |
| eval-merge-split    | 8/8         | 8/8      | Both used correct scripts and flags                                |
| eval-ocr-extraction | 8/8         | 8/8      | Both followed text-before-OCR principle                            |

## Analysis

### Where skill-maker won

**1. Conservative safety patterns (eval-add-column, 3 assertion wins)**

The official skill-creator's draft produced a skill that correctly identified
PG15's instant `ADD COLUMN ... NOT NULL DEFAULT` optimization — a technically
valid approach. However, skill-maker's draft enforced the conservative 3-step
pattern (add nullable → backfill → add constraint) regardless of PostgreSQL
version. This matters because:

- The assertions test for the **safe general pattern**, not version-specific
  optimizations
- Production environments often lag behind latest PG versions
- The 3-step approach works on PG 11-16; the single-statement only works on PG
  11+
- skill-maker's "Common mistakes" section explicitly warned against this
  shortcut

**2. Explicit operational fields (eval-express-api + eval-python-service, 2
assertion wins)**

skill-maker's error-handling draft included `isOperational` / `is_operational`
as an explicit boolean on the base error class. The official draft used an
`InternalError` subclass with `internalMessage` instead — functionally
equivalent intent, but missing the field the assertions check for. skill-maker's
approach is more flexible because any error subclass can be marked
non-operational, not just `InternalError`.

### Where they tied

**pdf-toolkit (24/24 each):** Both approaches produced skills that guided agents
to use the correct scripts with correct flags. The domain is highly
deterministic — there's a right tool with right flags for each operation — and
both skill-creation approaches captured this equally well.

**database-migration evals 2-3 (16/16 each):** Both approaches produced
excellent expand-contract and CONCURRENTLY patterns. The domain knowledge is
well-established and both approaches transmitted it effectively.

**error-handling eval 3 (8/8 each):** Both approaches produced comprehensive
error response schemas with 15+ codes, field-level validation, Retry-After
headers, and developer docs.

### What this means

skill-maker's advantage comes from two methodological differences:

1. **Explicit "Common mistakes" sections** force the skill author to enumerate
   specific failure patterns. This defensive posture catches cases like the PG15
   shortcut that would otherwise pass initial review but fail conservative
   assertions.

2. **Reasoning-based instructions ("Do X because Y")** help the downstream agent
   understand _why_ a pattern matters, making it more likely to apply the
   pattern even in edge cases. The official approach's imperative style ("Use
   X") is more direct but leaves the agent less equipped to handle
   version-specific tradeoffs.

The official skill-creator's strength is its **flexibility and pragmatism** —
the PG15 optimization is genuinely better advice in a PG15-specific context. But
when measured against assertions that test for conservative patterns,
skill-maker's defensive approach wins.

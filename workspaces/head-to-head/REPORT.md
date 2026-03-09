# Head-to-Head: skill-maker vs Anthropic's official skill-creator

## Overview

This report compares skills produced by two different skill-creation approaches:

- **skill-maker** — our open-source, harness-agnostic, automation-first tool
  with Bun/TypeScript scripts, plateau detection, and "Common mistakes" sections
- **Anthropic's official skill-creator** — the Claude-native plugin with Python
  scripts, browser-based eval viewer, and `claude -p` integration

Both approaches were given the **same domain briefs** and asked to draft a
SKILL.md for three domains. Subagents then used each drafted skill to complete
identical eval prompts. Outputs were graded against identical assertions.

## Methodology

### Domains tested

We selected the 3 domains with the highest delta improvement from our existing
benchmarks — these are the domains where skill guidance matters most:

| Domain             | Historical Delta | Why it's hard without a skill                           |
| ------------------ | ---------------- | ------------------------------------------------------- |
| database-migration | +95.8%           | Agents produce valid SQL that would cause prod outages  |
| error-handling     | +91.7%           | Agents miss correlation IDs, error codes, safe messages |
| pdf-toolkit        | +95.8%           | Agents default to generic libraries, not bundled tools  |

### Process

```
For each domain (3):
  1. Subagent A reads skill-maker SKILL.md → drafts a domain SKILL.md
  2. Subagent B reads official skill-creator SKILL.md → drafts a domain SKILL.md
  3. For each eval prompt (3 per domain):
     a. Subagent C reads skill-maker-draft → completes the task → saves output
     b. Subagent D reads official-draft → completes the task → saves output
  4. Grade all outputs against 8 assertions per eval
```

Total: 6 skill drafts, 18 eval runs, 72 assertion checks per approach (144
total).

### Controls

- Same model for all subagents (Claude)
- Same domain briefs (identical problem descriptions)
- Same eval prompts (from existing evals.json files)
- Same assertions (from existing evals.json files)
- Fresh subagent context for every run (no contamination)
- Grading done by a separate subagent reading actual output content (not keyword
  matching)

## Results

### Aggregate

| Approach                  | Passed | Total | Pass Rate |
| ------------------------- | ------ | ----- | --------- |
| **skill-maker**           | 72     | 72    | **100%**  |
| **official**              | 67     | 72    | **93.1%** |
| **Delta (SM - official)** | +5     | —     | **+6.9%** |

### Per-domain

| Domain             | skill-maker  | official      | Delta  |
| ------------------ | ------------ | ------------- | ------ |
| database-migration | 24/24 (100%) | 21/24 (87.5%) | +12.5% |
| error-handling     | 24/24 (100%) | 22/24 (91.7%) | +8.3%  |
| pdf-toolkit        | 24/24 (100%) | 24/24 (100%)  | 0%     |

### Per-eval

| Eval                | Domain             | skill-maker | official | Delta |
| ------------------- | ------------------ | ----------- | -------- | ----- |
| eval-add-column     | database-migration | 8/8         | 5/8      | +3    |
| eval-rename-column  | database-migration | 8/8         | 8/8      | 0     |
| eval-add-index      | database-migration | 8/8         | 8/8      | 0     |
| eval-express-api    | error-handling     | 8/8         | 7/8      | +1    |
| eval-python-service | error-handling     | 8/8         | 7/8      | +1    |
| eval-error-response | error-handling     | 8/8         | 8/8      | 0     |
| eval-extract-create | pdf-toolkit        | 8/8         | 8/8      | 0     |
| eval-merge-split    | pdf-toolkit        | 8/8         | 8/8      | 0     |
| eval-ocr-extraction | pdf-toolkit        | 8/8         | 8/8      | 0     |

## Detailed Failure Analysis

### Official failure 1: eval-add-column (3 assertions failed)

**What happened:** The official skill-creator's draft recognized that PostgreSQL
15 supports instant `ADD COLUMN ... NOT NULL DEFAULT` (a metadata-only operation
since PG 11). It drafted a skill that correctly recommends the single-statement
approach for PG 15, arguing the 3-step pattern is unnecessary overhead.

**Why it failed:** The assertions require the conservative 3-step pattern:

1. Add column as nullable
2. Batched backfill
3. Add NOT NULL constraint separately

The official draft's advice is **technically superior** for PG 15 specifically,
but fails assertions designed to test the **safe general pattern** that works
across all PostgreSQL versions.

**Why skill-maker passed:** skill-maker's "Common mistakes" methodology forced
the skill author to enumerate failure patterns. The resulting skill explicitly
warned: "Don't use `NOT NULL DEFAULT` in a single statement on large tables —
even though PG 11+ supports it as metadata-only, the 3-step approach is safer
and more portable." This defensive posture ensured the downstream agent always
applied the conservative pattern.

**Assertions affected:**

| Assertion                 | skill-maker | official | Evidence                                                |
| ------------------------- | ----------- | -------- | ------------------------------------------------------- |
| Nullable first            | PASS        | FAIL     | Official used `NOT NULL DEFAULT 'pending'` inline       |
| Batched backfill          | PASS        | FAIL     | Official argued no backfill needed with instant default |
| NOT NULL as separate step | PASS        | FAIL     | Official set NOT NULL in initial ALTER                  |

### Official failure 2: eval-express-api (1 assertion failed)

**What happened:** The official skill-creator's draft used an `InternalError`
subclass with a separate `internalMessage` field to distinguish safe vs unsafe
error details. skill-maker's draft used an explicit `isOperational` boolean on
the base `AppError` class.

**Why it failed:** The assertion requires "properties: code, message,
statusCode, category, and cause" — specifically including `category` (which maps
to `isOperational` in practice). The official draft's approach achieves the same
goal via class hierarchy (operational = any AppError subclass, non-operational =
InternalError) rather than an explicit field.

**Assertion affected:**

| Assertion                         | skill-maker | official | Evidence                                                             |
| --------------------------------- | ----------- | -------- | -------------------------------------------------------------------- |
| Base AppError with category/cause | PASS        | FAIL     | Official uses InternalError pattern instead of isOperational boolean |

### Official failure 3: eval-python-service (1 assertion failed)

**Same pattern as failure 2**, applied to Python. The official draft's
`AppError` base class lacks `is_operational`, using the `InternalError` subclass
hierarchy instead.

| Assertion                         | skill-maker | official | Evidence                                                |
| --------------------------------- | ----------- | -------- | ------------------------------------------------------- |
| Base AppError with is_operational | PASS        | FAIL     | Official uses class hierarchy instead of explicit field |

## What Each Approach Does Well

### skill-maker strengths

1. **Defensive "Common mistakes" sections** — Forces enumeration of failure
   patterns, creating guardrails that catch edge cases the official approach
   misses. This is the primary source of skill-maker's advantage.

2. **Reasoning-based instructions ("Do X because Y")** — Helps downstream agents
   understand _why_ a pattern matters, making them more likely to apply it in
   ambiguous situations.

3. **Explicit field requirements** — skill-maker's checklists tend to be more
   specific about required fields and properties, which aligns well with
   assertion-based grading.

### Official skill-creator strengths

1. **Pragmatic optimization** — The PG15 single-statement advice is genuinely
   better engineering for that specific version. The official approach trusts
   the agent to adapt to context rather than enforcing a universal pattern.

2. **Theory of mind** — The official approach explicitly tells skill authors to
   "explain the why" and avoid "heavy-handed MUSTs". This produces more
   readable, maintainable skills.

3. **Flexible class hierarchies** — The `InternalError` pattern is arguably
   cleaner than an `isOperational` boolean — it uses the type system instead of
   a flag. The failure here is an assertion design issue, not a quality issue.

## Conclusions

1. **skill-maker produces skills that score higher on assertion-based evals**
   (+6.9% overall). The advantage comes from defensive guardrails and explicit
   field requirements.

2. **The official approach sometimes produces better engineering advice** (PG15
   optimization) that fails conservative assertions. In production, the
   official's advice might actually prevent unnecessary work.

3. **pdf-toolkit shows parity** — for deterministic, tool-specific domains, both
   approaches produce equivalent skills. The differentiation appears in domains
   requiring safety patterns and structural conventions.

4. **Both approaches are strong** — 93.1% vs 100% is a narrow margin. The 5
   assertion failures are all arguable (2 are assertion design issues, 3 are
   conservative-vs-pragmatic tradeoffs).

## Artifacts

All benchmark artifacts are preserved in this directory:

```
workspaces/head-to-head/
├── REPORT.md                              # This file
├── BENCHMARK.md                           # Summary with analysis
├── benchmark.json                         # Machine-readable results
├── database-migration/
│   ├── skill-maker-draft/SKILL.md         # Skill drafted by skill-maker approach
│   ├── official-draft/SKILL.md            # Skill drafted by official approach
│   ├── eval-add-column/
│   │   ├── eval_metadata.json             # Assertions for this eval
│   │   ├── skill-maker/outputs/response.md
│   │   └── official/outputs/response.md
│   ├── eval-rename-column/...
│   └── eval-add-index/...
├── error-handling/
│   ├── skill-maker-draft/SKILL.md
│   ├── official-draft/SKILL.md
│   ├── eval-express-api/...
│   ├── eval-python-service/...
│   └── eval-error-response/...
└── pdf-toolkit/
    ├── skill-maker-draft/SKILL.md
    ├── official-draft/SKILL.md
    ├── eval-extract-create/...
    ├── eval-merge-split/...
    └── eval-ocr-extraction/...
```

Each eval directory contains:

- `eval_metadata.json` — the eval prompt and 8 assertions
- `skill-maker/outputs/response.md` — output from agent using skill-maker's
  draft
- `official/outputs/response.md` — output from agent using official's draft

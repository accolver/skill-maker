# Final Benchmark — code-reviewer

## Overview

The **code-reviewer** skill guides agents through structured code reviews that
produce categorized findings with severity levels, specific fix suggestions, and
a summary assessment. It was evaluated across 4 iterations with 3 eval cases
covering security vulnerabilities, performance bottlenecks, and maintainability
concerns.

**Plateau reached at iteration 2** (confirmed over iterations 2-4 with 0%
improvement).

## Results Summary

| Iteration | With Skill | Without Skill | Delta  | Notes                                         |
| --------- | ---------- | ------------- | ------ | --------------------------------------------- |
| 1         | 95.8%      | 41.7%         | +54.1% | One finding had incomplete fix suggestion     |
| 2         | 100%       | 41.7%         | +58.3% | Fixed: strengthened fix suggestion guidance   |
| 3         | 100%       | 41.7%         | +58.3% | Plateau confirmed (2nd consecutive)           |
| 4         | 100%       | 41.7%         | +58.3% | Plateau confirmed (3rd consecutive) — stopped |

## Per-Eval Breakdown (Final Iteration)

| Eval Case                     | With Skill | Without Skill | Delta |
| ----------------------------- | ---------- | ------------- | ----- |
| sql-injection-review          | 100% (8/8) | 50% (4/8)     | +50%  |
| performance-bottleneck        | 100% (8/8) | 25% (2/8)     | +75%  |
| complex-refactoring-candidate | 100% (8/8) | 50% (4/8)     | +50%  |

## What the Skill Adds

The without-skill baseline consistently fails on these assertion categories:

| Assertion Type                     | With Skill    | Without Skill | Why Without-Skill Fails                                                   |
| ---------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------- |
| Severity levels on findings        | Always passes | Always fails  | Agents don't naturally classify severity without guidance                 |
| Categorized output format          | Always passes | Always fails  | Agents produce flat lists, not categorized findings                       |
| Structured summary with assessment | Always passes | Always fails  | Agents write prose conclusions, not structured summaries                  |
| Specific code fix suggestions      | Always passes | Always fails  | Agents give directional advice ("use parameterized queries") without code |
| Quantified impact analysis         | Always passes | Always fails  | Agents say "slow" instead of "251 queries for 50 orders"                  |

The without-skill baseline consistently passes on:

| Assertion Type                                  | Notes                               |
| ----------------------------------------------- | ----------------------------------- |
| Identifying obvious issues (SQL injection, N+1) | Agents catch these without guidance |
| Mentioning connection cleanup                   | Agents notice resource leaks        |
| Identifying code duplication                    | Agents spot copy-paste patterns     |
| Suggesting JOINs for N+1                        | Common knowledge for agents         |

## Timing and Token Usage

| Metric         | With Skill (avg) | Without Skill (avg) | Delta         |
| -------------- | ---------------- | ------------------- | ------------- |
| Time (seconds) | 20.3             | 11.4                | +8.9s (+78%)  |
| Tokens         | 4,753            | 2,647               | +2,106 (+80%) |

The skill adds ~9 seconds and ~2,100 tokens per review. This is a reasonable
cost for the quality improvement — the additional tokens go toward structured
output, severity classification, and concrete code fixes.

## Skill Improvements Made

### Iteration 1 → 2

- **Problem**: One finding had an incomplete fix suggestion (swallowed
  exceptions finding showed partial fix without Logger setup)
- **Fix**: Strengthened principle #2 from "Always suggest a fix" to "Always
  suggest a complete fix" with guidance to include imports, setup, and
  configuration when needed
- **Result**: 95.8% → 100% pass rate

### Iterations 2-4

- No further changes needed — skill plateaued at 100%

## Key Findings

1. **The skill's biggest value is structure, not detection.** Without-skill
   agents identify most issues but present them as unstructured prose without
   severity, categories, or actionable code fixes.

2. **Security scanning benefits most from the skill.** The
   performance-bottleneck eval showed the largest delta (+75%) because
   without-skill agents mention the N+1 pattern but don't quantify impact,
   assign severity, or provide complete JOIN query fixes.

3. **The cost is reasonable.** ~80% more tokens for ~58% better pass rate is a
   good trade-off, especially for code reviews where thoroughness matters more
   than speed.

4. **Without-skill reviews are dangerous.** They identify issues but without
   severity classification, a developer might treat a critical SQL injection the
   same as a style nit. The skill's severity system ensures proper
   prioritization.

## Final Skill Validation

```
$ bun run scripts/validate-skill.ts examples/code-reviewer
{
  "valid": true,
  "skill_name": "code-reviewer",
  "errors": [],
  "warnings": [],
  "info": {
    "name": "code-reviewer",
    "body_lines": 309,
    "estimated_tokens": 2200
  }
}
```

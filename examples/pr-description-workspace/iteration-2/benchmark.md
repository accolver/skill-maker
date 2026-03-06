# Benchmark — pr-description — Iteration 2

## Summary

| Metric         | With Skill | Without Skill | Delta  |
| -------------- | ---------- | ------------- | ------ |
| Pass Rate      | 100%       | 20.8%         | +79.2% |
| Time (seconds) | 29.9       | 8.3           | +21.6  |
| Tokens         | 7,200      | 2,137         | +5,063 |

## Per-Eval Results

| Eval                    | With Skill | Without Skill | Delta  |
| ----------------------- | ---------- | ------------- | ------ |
| feature-auth-flow       | 100% (8/8) | 12.5% (1/8)   | +87.5% |
| bugfix-race-condition   | 100% (8/8) | 37.5% (3/8)   | +62.5% |
| refactor-database-layer | 100% (8/8) | 12.5% (1/8)   | +87.5% |

## Analysis

- **With-skill** achieves 100% across all three evals, up from 91.7% in
  iteration 1
- **Improvements from iteration 1**:
  - Feature eval: Edge case testing instructions now include concrete steps
    (incognito window, specific URLs, expected error messages)
  - Refactor eval: Performance verification now includes concrete thresholds
    ("expect < 15ms" instead of "compare against baseline")
- **Without-skill** unchanged at 20.8% — baseline agents consistently miss
  motivation, structured format, testing instructions, rollback plans, and
  reviewer guidance
- The skill adds ~21.6 seconds and ~5,063 tokens — reasonable cost for 79.2%
  quality improvement

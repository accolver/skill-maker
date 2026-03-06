# Benchmark — pr-description — Iteration 1

## Summary

| Metric         | With Skill | Without Skill | Delta  |
| -------------- | ---------- | ------------- | ------ |
| Pass Rate      | 91.7%      | 20.8%         | +70.9% |
| Time (seconds) | 29.4       | 8.2           | +21.2  |
| Tokens         | 7,037      | 2,103         | +4,934 |

## Per-Eval Results

| Eval                    | With Skill  | Without Skill | Delta  |
| ----------------------- | ----------- | ------------- | ------ |
| feature-auth-flow       | 87.5% (7/8) | 12.5% (1/8)   | +75.0% |
| bugfix-race-condition   | 100% (8/8)  | 37.5% (3/8)   | +62.5% |
| refactor-database-layer | 87.5% (7/8) | 12.5% (1/8)   | +75.0% |

## Analysis

- **With-skill** achieves 100% on the bugfix eval but misses one assertion each
  on the feature and refactor evals:
  - Feature: Edge case testing instructions not fully copy-pasteable (says "deny
    consent" without specifying how in a test environment)
  - Refactor: Performance verification step lacks a concrete pass/fail threshold
- **Without-skill** consistently misses: motivation section, conceptual change
  grouping, copy-pasteable testing instructions, rollback plan, and reviewer
  guidance
- The bugfix eval's without-skill run performs slightly better (37.5%) because
  the user prompt includes the root cause, which the agent echoes back
- The skill adds ~21 seconds and ~4,900 tokens per description — significant
  overhead but justified by the 70.9% quality improvement

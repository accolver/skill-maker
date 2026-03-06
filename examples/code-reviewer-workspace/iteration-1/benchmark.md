# Benchmark — code-reviewer — Iteration 1

## Summary

| Metric         | With Skill | Without Skill | Delta  |
| -------------- | ---------- | ------------- | ------ |
| Pass Rate      | 95.8%      | 41.7%         | +54.1% |
| Time (seconds) | 20.1       | 11.5          | +8.6   |
| Tokens         | 4,683      | 2,643         | +2,040 |

## Per-Eval Results

| Eval                          | With Skill  | Without Skill | Delta  |
| ----------------------------- | ----------- | ------------- | ------ |
| sql-injection-review          | 100% (8/8)  | 50% (4/8)     | +50%   |
| performance-bottleneck        | 100% (8/8)  | 25% (2/8)     | +75%   |
| complex-refactoring-candidate | 87.5% (7/8) | 50% (4/8)     | +37.5% |

## Analysis

- **With-skill** achieves near-perfect scores on security and performance evals,
  but misses one assertion on the refactoring eval (incomplete fix suggestion
  for swallowed exceptions)
- **Without-skill** consistently misses: severity levels, categorized output,
  structured summary, specific code fix suggestions, and quantified impact
  analysis
- The skill adds ~8.6 seconds and ~2,040 tokens per review, which is a
  reasonable cost for the quality improvement
- The refactoring eval's one failure suggests the skill needs stronger guidance
  on ensuring every finding has a complete code fix

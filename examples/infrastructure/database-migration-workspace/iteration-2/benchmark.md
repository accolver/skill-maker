# Benchmark — database-migration — Iteration 2

## Summary

| Metric         | With Skill | Without Skill | Delta  |
| -------------- | ---------- | ------------- | ------ |
| Pass Rate      | 100%       | 4.2%          | +95.8% |
| Time (seconds) | 34.5       | 6.3           | +28.2  |
| Tokens         | 8,293      | 1,440         | +6,853 |

## Per-Eval Results

| Eval                     | With Skill | Without Skill | Delta  |
| ------------------------ | ---------- | ------------- | ------ |
| add-column-with-default  | 100% (8/8) | 0% (0/8)      | +100%  |
| rename-column-safely     | 100% (8/8) | 12.5% (1/8)   | +87.5% |
| add-index-on-large-table | 100% (8/8) | 0% (0/8)      | +100%  |

## Analysis

- **With-skill** now achieves 100% across all three evals, up from 87.5% in
  iteration 1.
- Improvements from iteration 1:
  - Runbook pre-flight now includes checking for blocking transactions
  - Migration explicitly lists all affected consumers (app code, background
    jobs, queries, APIs)
  - Off-peak scheduling includes a query to identify lowest-traffic hours
- **Without-skill** remains at 4.2% — agents consistently produce bare SQL
  without any operational safety measures.
- The delta of +95.8% is the largest observed across all skills built so far.

# Benchmark — database-migration — Iteration 3

## Summary

| Metric         | With Skill | Without Skill | Delta  |
| -------------- | ---------- | ------------- | ------ |
| Pass Rate      | 100%       | 4.2%          | +95.8% |
| Time (seconds) | 33.8       | 6.0           | +27.8  |
| Tokens         | 8,110      | 1,373         | +6,737 |

## Per-Eval Results

| Eval                     | With Skill | Without Skill | Delta  |
| ------------------------ | ---------- | ------------- | ------ |
| add-column-with-default  | 100% (8/8) | 0% (0/8)      | +100%  |
| rename-column-safely     | 100% (8/8) | 12.5% (1/8)   | +87.5% |
| add-index-on-large-table | 100% (8/8) | 0% (0/8)      | +100%  |

## Analysis

- **Plateau confirmed** — 100% with-skill pass rate for 2nd consecutive
  iteration (iterations 2 and 3 both at 100%). Delta < 2% for 2 consecutive
  iterations.
- Without-skill baseline stable at 4.2% — agents consistently produce bare SQL
  without operational safety measures.
- No further skill improvements needed. Proceeding to finalization.

# Benchmark — database-migration — Iteration 1

## Summary

| Metric         | With Skill | Without Skill | Delta  |
| -------------- | ---------- | ------------- | ------ |
| Pass Rate      | 87.5%      | 4.2%          | +83.3% |
| Time (seconds) | 35.2       | 6.6           | +28.6  |
| Tokens         | 8,467      | 1,517         | +6,950 |

## Per-Eval Results

| Eval                     | With Skill  | Without Skill | Delta  |
| ------------------------ | ----------- | ------------- | ------ |
| add-column-with-default  | 87.5% (7/8) | 0% (0/8)      | +87.5% |
| rename-column-safely     | 87.5% (7/8) | 12.5% (1/8)   | +75%   |
| add-index-on-large-table | 87.5% (7/8) | 0% (0/8)      | +87.5% |

## Analysis

- **With-skill** produces comprehensive migrations with rollback, backup,
  verification, and runbooks but has minor gaps: runbook pre-flight checks could
  be more thorough (e.g., checking for blocking transactions), and the rename
  eval doesn't explicitly call out background jobs.
- **Without-skill** consistently produces bare SQL statements with no rollback,
  no backup commands, no lock analysis, no verification queries, and no
  deployment runbooks. The rename eval uses a dangerous bare RENAME COLUMN.
- The massive delta (+83.3%) shows that agents have the SQL knowledge but
  completely lack the operational safety awareness that the skill enforces.
- Three failures in with-skill runs suggest the skill needs stronger guidance
  on:
  1. Pre-flight checks for blocking transactions
  2. Explicitly addressing all affected consumers (app code, background jobs,
     queries)
  3. More specific off-peak scheduling guidance

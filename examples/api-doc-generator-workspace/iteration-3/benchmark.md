# Benchmark - Iteration 3

## Summary

| Metric    | With Skill | Without Skill | Delta   |
| --------- | ---------- | ------------- | ------- |
| Pass Rate | 100.0%     | 16.7%         | +83.3%  |
| Time (s)  | 43.1       | 16.9          | +26.2   |
| Tokens    | 23,367     | 9,100         | +14,267 |

## Per-Eval Results

| Eval                | With Skill | Without Skill | Delta  |
| ------------------- | ---------- | ------------- | ------ |
| rest-crud-endpoints | 100.0%     | 25.0%         | +75.0% |
| authenticated-api   | 100.0%     | 12.5%         | +87.5% |
| error-handling-api  | 100.0%     | 12.5%         | +87.5% |

## Changes from Iteration 2

- **Skill improvements**: Added explicit instruction to trace every custom error
  class to every endpoint that could trigger it, including middleware-level
  errors (rate limiting, auth). Added "document 429 on all rate-limited
  endpoints" instruction.
- **With-skill improvement**: 95.8% -> 100.0% (+4.2%) - PLATEAU reached
- **Without-skill change**: 16.7% -> 16.7% (stable)
- **All assertions passing** with skill. Plateau detected.

## Plateau Analysis

Pass rate improved < 5% from iteration 2 to 3 (4.2%), and hit 100%. The skill
has reached maximum effectiveness on these eval cases. Without-skill baseline is
stable at ~16.7%, confirming the skill provides genuine value rather than the
assertions being trivially easy.

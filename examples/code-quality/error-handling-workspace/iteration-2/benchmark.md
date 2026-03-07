# Benchmark - Iteration 2

## Summary

| Metric    | With Skill | Without Skill | Delta  |
| --------- | ---------- | ------------- | ------ |
| Pass Rate | 91.7%      | 8.3%          | +83.4% |
| Time (s)  | 33.8       | 14.7          | +19.1  |
| Tokens    | 15,267     | 6,633         | +8,634 |

## Per-Eval Results

| Eval                  | With Skill | Without Skill | Delta  |
| --------------------- | ---------- | ------------- | ------ |
| express-api-errors    | 100.0%     | 12.5%         | +87.5% |
| python-service-errors | 87.5%      | 0.0%          | +87.5% |
| error-response-schema | 87.5%      | 12.5%         | +75.0% |

## Analysis

- **Major improvement**: Pass rate jumped from 70.8% to 91.7% (+20.9%)
- **Express eval now at 100%**: Added UUID fallback for correlation ID and JSON
  structured logging fixed both previous failures.
- **Remaining failures**:
  1. Python eval: external API error wrapping still missing upstream service
     name and response status code in the wrapped error message
  2. Schema eval: client handling guidance incomplete — covers validation and
     auth but not all 7 categories
- **Without-skill stable**: Baseline remains at 4.2-8.3%, confirming assertions
  are genuinely discriminating.
- **Improvement targets**:
  1. Add explicit instruction to include upstream service name and HTTP status
     in wrapped external API errors
  2. Add instruction to document client handling for ALL error categories, not
     just a subset

# Benchmark - Iteration 2

## Summary

| Metric    | With Skill | Without Skill | Delta   |
| --------- | ---------- | ------------- | ------- |
| Pass Rate | 95.8%      | 16.7%         | +79.1%  |
| Time (s)  | 42.4       | 17.1          | +25.3   |
| Tokens    | 23,050     | 9,133         | +13,917 |

## Per-Eval Results

| Eval                | With Skill | Without Skill | Delta  |
| ------------------- | ---------- | ------------- | ------ |
| rest-crud-endpoints | 100.0%     | 25.0%         | +75.0% |
| authenticated-api   | 100.0%     | 12.5%         | +87.5% |
| error-handling-api  | 87.5%      | 12.5%         | +75.0% |

## Changes from Iteration 1

- **Skill improvements**: Added explicit instruction to document 500 errors from
  catch blocks, added guidance for OpenAPI global security configuration,
  strengthened requirement for per-endpoint error examples
- **With-skill improvement**: 83.3% -> 95.8% (+12.5%)
- **Without-skill change**: 12.5% -> 16.7% (+4.2%, natural variance)
- **Remaining gap**: error-handling-api still missing 429 (RateLimitError) on
  individual endpoints

## Improvement Target for Iteration 3

- Add explicit instruction: "For every custom error class in the codebase,
  ensure it appears in the error table of every endpoint that could trigger it"
- Add guidance on documenting rate limit errors per-endpoint when rate limiting
  middleware is present

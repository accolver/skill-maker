# Benchmark - Iteration 1

## Summary

| Metric    | With Skill | Without Skill | Delta   |
| --------- | ---------- | ------------- | ------- |
| Pass Rate | 83.3%      | 12.5%         | +70.8%  |
| Time (s)  | 40.4       | 16.0          | +24.4   |
| Tokens    | 21,757     | 8,603         | +13,154 |

## Per-Eval Results

| Eval                | With Skill | Without Skill | Delta  |
| ------------------- | ---------- | ------------- | ------ |
| rest-crud-endpoints | 87.5%      | 12.5%         | +75.0% |
| authenticated-api   | 87.5%      | 12.5%         | +75.0% |
| error-handling-api  | 75.0%      | 12.5%         | +62.5% |

## Analysis

- **Strong signal**: Skill provides massive improvement over baseline (70.8%
  delta)
- **Weakest area**: error-handling-api - missing per-endpoint error examples and
  incomplete status code coverage
- **Without-skill pattern**: Baseline consistently produces minimal docs with no
  structured output, no examples, no parameter details
- **Improvement targets**:
  1. Add explicit instruction to document ALL error status codes per endpoint
     (including 429, 500)
  2. Require at least one error response example per endpoint
  3. Fix OpenAPI global security configuration guidance

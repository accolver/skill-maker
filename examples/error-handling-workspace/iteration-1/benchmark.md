# Benchmark - Iteration 1

## Summary

| Metric    | With Skill | Without Skill | Delta  |
| --------- | ---------- | ------------- | ------ |
| Pass Rate | 70.8%      | 4.2%          | +66.6% |
| Time (s)  | 32.0       | 14.2          | +17.8  |
| Tokens    | 14,483     | 6,400         | +8,083 |

## Per-Eval Results

| Eval                  | With Skill | Without Skill | Delta  |
| --------------------- | ---------- | ------------- | ------ |
| express-api-errors    | 75.0%      | 0.0%          | +75.0% |
| python-service-errors | 75.0%      | 0.0%          | +75.0% |
| error-response-schema | 62.5%      | 12.5%         | +50.0% |

## Analysis

- **Strong signal**: Skill provides massive improvement over baseline (66.6%
  delta). Without the skill, agents produce ad-hoc error handling with no
  taxonomy, no error codes, and no structured logging.
- **Weakest area**: error-response-schema — missing error code registry
  completeness (only 12 of 15+ required), no Retry-After for rate limits, and no
  client handling guidance.
- **Common with_skill failures**:
  1. Correlation ID not always generated when header is missing (express eval)
  2. Structured logging not using JSON formatter (python eval)
  3. Error code registry incomplete and missing client handling docs (schema
     eval)
- **Without-skill pattern**: Baseline consistently produces inline error
  handling with no shared structure, no error codes, leaked internals, and
  print-based logging.
- **Improvement targets**:
  1. Add explicit instruction to always generate correlation ID (fallback to
     UUID)
  2. Add instruction for JSON-formatted structured logging
  3. Add instruction for error code registry minimum count and client handling
     docs
  4. Add Retry-After guidance for rate limit errors

# Benchmark - Iteration 3

## Summary

| Metric    | With Skill | Without Skill | Delta  |
| --------- | ---------- | ------------- | ------ |
| Pass Rate | 100.0%     | 8.3%          | +91.7% |
| Time (s)  | 34.9       | 15.0          | +19.9  |
| Tokens    | 15,800     | 6,867         | +8,933 |

## Per-Eval Results

| Eval                  | With Skill | Without Skill | Delta   |
| --------------------- | ---------- | ------------- | ------- |
| express-api-errors    | 100.0%     | 12.5%         | +87.5%  |
| python-service-errors | 100.0%     | 0.0%          | +100.0% |
| error-response-schema | 100.0%     | 12.5%         | +87.5%  |

## Analysis

- **100% pass rate achieved**: All 24 assertions pass with the skill across all
  3 eval cases.
- **Iteration improvements that fixed remaining failures**:
  1. Added explicit instruction to include upstream service name and HTTP status
     code when wrapping external API errors (fixed python eval assertion 7)
  2. Added instruction to document client handling for ALL error categories with
     specific guidance per category (fixed schema eval assertion 8)
- **Without-skill stable at 8.3%**: Only assertion that passes without skill is
  "internal server errors use generic safe message" — agents naturally avoid
  exposing internals for 500 errors but miss everything else.
- **Plateau reached**: 100% is ceiling. Further iterations cannot improve.

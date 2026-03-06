# Benchmark - Iteration 3

## Summary

| Metric    | With Skill | Without Skill | Delta   |
| --------- | ---------- | ------------- | ------- |
| Pass Rate | 100.0%     | 26.1%         | +73.9%  |
| Time (s)  | 44.4       | 17.9          | +26.5   |
| Tokens    | 34,133     | 14,833        | +19,300 |

## Per-Eval Results

| Eval                      | With Skill | Without Skill | Delta  |
| ------------------------- | ---------- | ------------- | ------ |
| express-api-monitoring    | 100.0%     | 12.5%         | +87.5% |
| microservice-alerts       | 100.0%     | 37.5%         | +62.5% |
| distributed-tracing-setup | 100.0%     | 28.6%         | +71.4% |

## Improvement from Iteration 2

- **Overall**: 95.7% → 100.0% (+4.3%)
- **microservice-alerts**: 87.5% → 100.0% — fixed by requiring explicit 1:1
  runbook-to-alert mapping with "generate one runbook file per alert rule, no
  exceptions" instruction

## Plateau Analysis

With-skill pass rate has reached 100% (ceiling). Without-skill baseline is
stable at ~26.1% across iterations, confirming assertions are genuinely
discriminating and not trivially satisfiable. The 73.9% delta represents the
true value the skill adds.

## What Improved Across Iterations

| Iteration | Fix Applied                                        | Impact          |
| --------- | -------------------------------------------------- | --------------- |
| 1 → 2     | Added dedicated error counter requirement          | +12.5% (eval 1) |
| 1 → 2     | Required explicit W3CTraceContextPropagator config | +12.5% (eval 1) |
| 1 → 2     | Required correlation IDs in log output             | +14.3% (eval 3) |
| 1 → 2     | Required env-var-driven OTLP endpoints             | +14.3% (eval 3) |
| 2 → 3     | Required 1:1 runbook-to-alert mapping              | +12.5% (eval 2) |

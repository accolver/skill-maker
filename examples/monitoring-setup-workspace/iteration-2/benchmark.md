# Benchmark - Iteration 2

## Summary

| Metric    | With Skill | Without Skill | Delta   |
| --------- | ---------- | ------------- | ------- |
| Pass Rate | 95.7%      | 21.7%         | +74.0%  |
| Time (s)  | 43.4       | 17.5          | +25.9   |
| Tokens    | 33,100     | 14,700        | +18,400 |

## Per-Eval Results

| Eval                      | With Skill | Without Skill | Delta  |
| ------------------------- | ---------- | ------------- | ------ |
| express-api-monitoring    | 100.0%     | 12.5%         | +87.5% |
| microservice-alerts       | 87.5%      | 25.0%         | +62.5% |
| distributed-tracing-setup | 100.0%     | 28.6%         | +71.4% |

## Improvement from Iteration 1

- **Overall**: 73.9% → 95.7% (+21.8%)
- **express-api-monitoring**: 75.0% → 100.0% — fixed by adding dedicated error
  counter requirement and explicit W3C propagator config
- **distributed-tracing-setup**: 71.4% → 100.0% — fixed by requiring correlation
  IDs in log output and env-var-driven OTLP endpoints
- **microservice-alerts**: 75.0% → 87.5% — improved runbook annotations but
  still missing runbooks for 2 of 5 alerts

## Remaining Issue

microservice-alerts: Skill says "generate a runbook for each alert" but doesn't
explicitly require a 1:1 mapping. Agent generates runbooks for the "main" alerts
but skips secondary ones. Need to strengthen the instruction to require a
runbook file for EVERY alert rule defined.

## Analysis

- Without-skill baseline is stable at ~21.7%, confirming assertions are
  genuinely discriminating
- The 74% delta demonstrates strong skill value
- One remaining gap: runbook completeness for all alerts

# Benchmark - Iteration 1

## Summary

| Metric    | With Skill | Without Skill | Delta   |
| --------- | ---------- | ------------- | ------- |
| Pass Rate | 73.9%      | 21.7%         | +52.2%  |
| Time (s)  | 42.0       | 17.8          | +24.2   |
| Tokens    | 31,250     | 14,533        | +16,717 |

## Per-Eval Results

| Eval                      | With Skill | Without Skill | Delta  |
| ------------------------- | ---------- | ------------- | ------ |
| express-api-monitoring    | 75.0%      | 12.5%         | +62.5% |
| microservice-alerts       | 75.0%      | 25.0%         | +50.0% |
| distributed-tracing-setup | 71.4%      | 28.6%         | +42.8% |

## Analysis

- **Strong signal**: Skill provides major improvement over baseline (52.2%
  delta)
- **Weakest areas**:
  1. express-api-monitoring: Missing dedicated error counter and explicit W3C
     propagator config
  2. microservice-alerts: Missing runbook for all alerts, one alert missing
     runbook annotation
  3. distributed-tracing-setup: Correlation IDs not injected into logs, Node.js
     OTLP endpoint hardcoded
- **Without-skill patterns**:
  - Single /health endpoint instead of liveness/readiness/startup separation
  - console.log instead of Prometheus metrics
  - Arbitrary alert thresholds instead of SLO-derived burn rates
  - Custom X-Request-ID instead of W3C traceparent
  - No runbooks generated
- **Improvement targets**:
  1. Add explicit instruction to create a dedicated error counter metric
  2. Strengthen W3C propagator configuration requirement
  3. Require runbook for EVERY alert, not just some
  4. Add instruction to inject correlation IDs into structured logging
  5. Require all configuration to be environment-variable driven

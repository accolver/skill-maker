# monitoring-setup

> **Status:** Planned

Add structured observability to services: health check endpoints, metrics
collection, distributed tracing, alert threshold configuration, and runbook
links.

## When built, this skill will

- Create health check endpoints (liveness, readiness, startup probes)
- Add metrics collection for request latency, error rates, and throughput
- Instrument distributed tracing with correlation ID propagation
- Define alert thresholds with escalation policies and runbook links
- Generate dashboards-as-code (Grafana JSON, Datadog monitors)
- Add structured logging with consistent field names and log levels

## Predicted delta: +50-60%

Agents add console.log statements and basic error logging but miss structured
observability: no health checks, no metrics endpoints, no trace propagation, no
actionable alerts.

## Getting started

```
Create a skill for adding structured observability with health checks, metrics, tracing, and alerts
```

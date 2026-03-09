# Webhook Support Assessment for BuildPulse

## Feature Summary

Add webhook support so that external services can subscribe to BuildPulse events
(e.g., build failures, status changes, trend alerts) and receive HTTP POST
notifications when those events occur.

## Alignment Analysis

### L4 (Purpose) Alignment

**Verdict: Aligned**

BuildPulse exists to give engineering managers real-time visibility into CI/CD
health. Webhook support extends this visibility beyond the dashboard and Slack —
it allows teams to integrate BuildPulse events into any system they choose
(PagerDuty, custom dashboards, incident management tools, ChatOps bots, etc.).

This directly supports the core success metrics:

- **Time to detect build regression (< 5 minutes):** Webhooks enable instant
  programmatic notification to any system, potentially reducing detection time
  further by feeding into automated incident response workflows.
- **Pipeline coverage (90% in first week):** Webhooks don't directly impact
  this, but they make BuildPulse more attractive to adopt since teams can wire
  it into existing tooling.
- **Manager weekly check-in time (reduced by 50%):** Webhooks enable automated
  report generation and integration with tools managers already use, further
  reducing manual check-in effort.

**Constraint check:**

- Read-only access to CI systems: Webhooks are _outbound_ from BuildPulse, so
  this constraint is unaffected.
- Self-hosted option: Webhooks work well in self-hosted environments since
  they're just HTTP calls to endpoints the customer controls.
- 100+ pipelines performance: Webhook delivery needs to be asynchronous to avoid
  impacting dashboard performance at scale.

### L3 (Experience) Alignment

**Verdict: Aligned with caveats**

The existing user journeys focus on dashboard interaction and Slack alerts.
Webhooks don't directly serve the three defined journeys, but they enable a new
class of journey:

- **Journey 4 (Integration Automation):** DevOps engineer configures a webhook
  to trigger a PagerDuty incident when a production pipeline fails, or to post
  to a Microsoft Teams channel, or to feed data into a custom analytics system.

This aligns with the experience principles:

- **Proactive alerts over passive dashboards:** Webhooks are the most proactive
  notification mechanism — they push data to any system immediately.
- **Aggregation over duplication:** Webhooks let external systems consume
  BuildPulse's already-aggregated data rather than polling CI providers
  independently.

**Caveat:** The primary beneficiary of webhooks is the DevOps engineer
(secondary user), not the engineering manager (primary user). This is fine — it
strengthens the platform for the secondary persona — but the feature should not
be prioritized over improvements that directly serve the primary persona.

### L2 (Contract) Alignment

**Verdict: Aligned — natural extension of existing contracts**

The existing data contracts already define the entities that webhooks would
deliver:

- `Pipeline` status changes
- `Build` completion events
- `Alert` creation events

The existing integration points (Slack API, REST API, WebSocket) establish a
pattern of outbound communication. Webhooks are a generalization of the Slack
integration — instead of hardcoding one notification channel, webhooks let any
external service subscribe.

**New contracts needed:**

- `WebhookSubscription: { id, url, secret, events[], active, created_at }`
- `WebhookDelivery: { id, subscription_id, event_type, payload, status_code, delivered_at, retries }`

These fit naturally alongside the existing data contracts.

### L1 (Function) Alignment

**Verdict: Feasible — fits existing architecture**

The current architecture already has an event-driven alert pipeline. Webhooks
are a natural extension:

- **alerter module** already evaluates rules and sends notifications. Webhook
  delivery can be added as another notification channel alongside Slack.
- **Node.js + Express backend** can easily add webhook management endpoints
  (CRUD for subscriptions) and an async delivery mechanism.
- **Event-driven pattern** means the system already produces events internally.
  Webhooks just add an external delivery mechanism for those same events.

**Implementation approach:**

1. Add a `webhook-manager` module for subscription CRUD and delivery
2. Extend the `alerter` to dispatch to webhook subscribers in addition to Slack
3. Use a job queue (e.g., BullMQ with Redis, or a simple PostgreSQL-based queue)
   for reliable async delivery with retries
4. Add HMAC signature verification so subscribers can validate payloads

**Testing:**

- Unit tests for webhook payload construction and HMAC signing
- Integration tests for delivery retry logic
- E2E test for subscription creation and event delivery

## Risk Assessment

| Risk                                                      | Severity | Mitigation                                                                      |
| --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| Webhook delivery failures blocking the alert pipeline     | High     | Async delivery with job queue; never block the main event loop                  |
| Subscriber endpoints being slow/down causing backpressure | Medium   | Timeout on delivery attempts (5s), exponential backoff retries, circuit breaker |
| Security: webhook URLs being used for SSRF                | Medium   | Validate URLs against private IP ranges, require HTTPS                          |
| Increased database load from delivery logging             | Low      | Prune old delivery logs on a schedule                                           |
| Feature scope creep (filtering, transformations, etc.)    | Medium   | Start with simple event-type filtering only; defer complex routing              |

## Effort Estimate

| Component                         | Effort         |
| --------------------------------- | -------------- |
| Webhook subscription CRUD API     | 2-3 days       |
| Delivery engine with retry logic  | 3-4 days       |
| HMAC signing and verification     | 1 day          |
| Integration with existing alerter | 1-2 days       |
| Admin UI for managing webhooks    | 2-3 days       |
| Testing (unit, integration, E2E)  | 2-3 days       |
| Documentation                     | 1 day          |
| **Total**                         | **12-17 days** |

## Recommendation

**Proceed with webhook support.** It is well-aligned with BuildPulse's purpose
and architecture:

1. **Purpose fit:** Extends real-time visibility beyond the dashboard,
   supporting the core mission.
2. **Architecture fit:** The event-driven alert pipeline already produces the
   events; webhooks add a delivery mechanism.
3. **Contract fit:** Existing data models map directly to webhook payloads.
4. **User fit:** Primarily serves the secondary persona (DevOps engineers) but
   strengthens the platform overall.

**Suggested prioritization:** Medium priority. Implement after core dashboard
and Slack alerting are solid, but before adding new CI provider adapters. The
feature makes BuildPulse significantly more valuable as an integration hub
rather than just a dashboard.

**Suggested MVP scope:**

- Subscribe to: `build.completed`, `build.failed`, `pipeline.status_changed`,
  `alert.triggered`
- Simple event-type filtering (subscribe to specific event types)
- HMAC payload signing
- Automatic retries with exponential backoff (3 attempts)
- Delivery log with status tracking
- Defer: complex filtering, payload transformation, fan-out to multiple URLs per
  subscription

# Telos Guardian Assessment: Webhook Support for BuildPulse

## Proposed Feature

Add webhook support so that external services can subscribe to BuildPulse events
(e.g., build failures, status changes, trend alerts) and receive HTTP callbacks
when those events occur.

---

## L4: Purpose Alignment

**BuildPulse's purpose:** Give engineering managers real-time visibility into
build health across all their pipelines.

**Assessment: Strongly aligned.**

Webhooks directly amplify BuildPulse's core purpose. The project exists because
managers lack a unified view of CI/CD health and need to detect regressions
fast. Right now, BuildPulse pushes alerts through Slack, but webhooks generalize
this — any external system (PagerDuty, custom dashboards, incident management
tools, ChatOps bots) can react to build events in real time. This serves the "<
5 minutes to detect build regression" success metric by enabling more delivery
channels beyond just Slack.

**Beneficiary impact:**

- **Engineering managers (primary):** Can route build health events to whatever
  tools they already use — not just Slack. This increases the chance they
  actually see and act on alerts.
- **DevOps engineers (secondary):** Can build automated responses to build
  events (auto-rollback, auto-retry, ticket creation) without polling the
  BuildPulse API.
- **Individual developers (tertiary):** External integrations could surface
  build status in IDEs, PR comments, or custom tools.

**Constraint check:**

- ✅ **Read-only access to CI systems:** Webhooks are an _output_ mechanism from
  BuildPulse, not an input to CI systems. No constraint violation.
- ✅ **Self-hosted option:** Webhooks work in self-hosted deployments — they're
  outbound HTTP calls, which are simpler than inbound integrations.
- ✅ **100+ pipelines performance:** Webhook dispatch can be async/queued, so it
  doesn't block the core polling or dashboard paths. However, at scale (100+
  pipelines × multiple subscribers), the dispatch volume needs consideration
  (see L1).
- ✅ **Multi-provider support:** Webhooks are provider-agnostic — they fire on
  normalized BuildPulse events, not raw CI provider data.

**Purpose drift risk: Low.** Webhooks are an extension of the existing alert
pipeline, not a new product direction. They don't pull BuildPulse toward
becoming an integration platform or workflow engine — they simply expose events
that BuildPulse already generates.

---

## L3: Experience Alignment

**Assessment: Well aligned with existing journeys, introduces a complementary
new journey.**

**Impact on existing journeys:**

- **Morning Health Check:** No direct impact. Webhooks are a background
  mechanism; the dashboard experience is unchanged.
- **Failure Alert:** Strongly complementary. Currently this journey is
  Slack-only. Webhooks enable the same "build fails → notification within 2
  minutes" flow through any channel. This makes the journey more robust (if
  Slack is down, PagerDuty still fires).
- **Trend Analysis:** Webhooks could emit trend-based events (e.g., "pipeline X
  success rate dropped below 80% this week"), enabling external systems to act
  on trends. This extends the journey without changing it.

**New journey introduced:**

### Journey 4: External Integration Setup

DevOps engineer registers a webhook URL for specific event types, receives a
test ping, confirms delivery, then starts receiving real events. This journey is
secondary to the core manager experience but serves the DevOps engineer
beneficiary directly.

**Experience principles check:**

- ✅ **Glanceable over detailed:** Webhooks don't affect the dashboard's
  glanceability. They're a behind-the-scenes mechanism.
- ✅ **Proactive alerts over passive dashboards:** Webhooks are the purest form
  of proactive alerting — push events to wherever the user needs them.
- ✅ **Aggregation over duplication:** Webhooks emit normalized BuildPulse
  events, not raw CI provider data. They maintain the aggregation principle.

**Feedback loop enhancement:** Webhook delivery success/failure rates become a
new feedback signal. If webhooks are failing, it indicates integration health
issues that BuildPulse should surface.

---

## L2: Contract Alignment

**Assessment: Natural extension of existing contracts, requires well-scoped
additions.**

**Interface impact:**

The existing REST API serves pipeline data ingestion and dashboard queries.
Webhooks require:

1. **Subscription management endpoints** (CRUD for webhook registrations) — a
   natural addition to the existing REST API.
2. **Outbound HTTP dispatch** — a new outbound interface, but architecturally
   simple (HTTP client calls).

This does NOT require changes to the WebSocket interface (dashboard real-time
updates) or the Slack integration. Webhooks are a parallel notification channel.

**New data contracts needed:**

```
WebhookSubscription: {
  id, url, secret, event_types[], active, created_at, updated_at
}

WebhookDelivery: {
  id, subscription_id, event_type, payload, status_code,
  response_body, attempted_at, succeeded
}

WebhookEvent: {
  type: "build.failed" | "build.succeeded" | "pipeline.degraded" | ...,
  pipeline: Pipeline,
  build?: Build,
  timestamp
}
```

**Contract compatibility:**

- `WebhookEvent` wraps existing `Pipeline` and `Build` data contracts — no
  changes to those schemas.
- `WebhookSubscription` is a new entity but follows the same patterns as
  existing data contracts (id, timestamps, status fields).
- `WebhookDelivery` is an audit/logging entity, similar in spirit to the
  existing `Alert` contract.

**Integration points:**

- No new external system dependencies. Webhooks are outbound HTTP — BuildPulse
  is the caller, not the callee.
- PostgreSQL is already the persistence layer; webhook tables fit naturally.

**System boundary respect:** Webhooks stay within BuildPulse's boundary as a
notification system. They don't require BuildPulse to understand or parse
responses from external systems (fire-and-forget with retry).

---

## L1: Function Feasibility

**Assessment: Fits naturally into the existing architecture with minimal new
patterns.**

**Module impact:**

| Module                      | Change Required                                           | Scope                                                 |
| --------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| **alerter**                 | Extend to dispatch webhooks alongside Slack notifications | Medium — add webhook dispatch as a new alert channel  |
| **dashboard-api**           | Add CRUD endpoints for webhook subscriptions              | Small — standard REST endpoints                       |
| **poller**                  | No change                                                 | None                                                  |
| **normalizer**              | No change                                                 | None                                                  |
| **trend-engine**            | No change (already emits events that alerter consumes)    | None                                                  |
| **New: webhook-dispatcher** | Queue-based outbound HTTP delivery with retry             | New module, but follows existing event-driven pattern |

**Architecture fit:**

- **Event-driven alert pipeline (existing pattern):** The alerter already
  evaluates rules and sends notifications. Webhooks are a new notification
  channel within this existing pipeline. The event-driven pattern means webhook
  dispatch can be added without restructuring the alert flow.
- **Adapter pattern (existing pattern):** Just as CI providers use adapters,
  notification channels could use the same pattern (SlackNotifier,
  WebhookNotifier). This is a natural extension.
- **Node.js + Express (existing stack):** Webhook subscription CRUD is standard
  Express route work. Outbound HTTP dispatch uses native `fetch` or a library
  like `got`/`axios`.

**New patterns needed:**

- **Async job queue for webhook delivery:** At 100+ pipelines with multiple
  subscribers, synchronous webhook dispatch would block the alert pipeline. A
  lightweight job queue (e.g., `bull` with Redis, or `pg-boss` with the existing
  PostgreSQL) is needed for reliable async delivery with retries. This is a new
  infrastructure pattern but a well-understood one in the Node.js ecosystem.
- **HMAC signature verification:** Webhook payloads should be signed with a
  per-subscription secret so receivers can verify authenticity. This is a small
  crypto addition, not an architectural change.

**Dependency additions:**

- Job queue library (if not using PostgreSQL-based queuing)
- Potentially Redis (if using `bull`/`bullmq`) — but `pg-boss` avoids this by
  using the existing PostgreSQL

**Testing approach:**

- **Unit tests (Vitest):** Webhook event serialization, HMAC signing, retry
  logic, subscription validation
- **Integration tests:** Webhook delivery against a mock HTTP server,
  subscription CRUD endpoints
- **Existing E2E tests:** Unaffected — webhooks are a backend-only feature
  initially

**Risk factors:**

- **Retry storms:** If a subscriber's endpoint is down, retries at scale could
  consume resources. Mitigation: exponential backoff, max retry limit, automatic
  deactivation after N consecutive failures.
- **Payload size:** Build events with full pipeline context could be large.
  Mitigation: keep payloads lean (IDs + key fields), let consumers call the API
  for full details.
- **Self-hosted complexity:** A job queue adds operational overhead for
  self-hosted deployments. Mitigation: use `pg-boss` (PostgreSQL-backed) to
  avoid introducing Redis as a new dependency.

---

## Recommendation: **Proceed**

Webhook support is strongly aligned with BuildPulse's purpose at all four
levels:

- **L4:** Directly serves the core purpose of real-time visibility and fast
  regression detection by enabling event delivery to any external system.
- **L3:** Extends the proactive alerting principle without disrupting existing
  user journeys. Introduces a natural new journey for DevOps engineers.
- **L2:** Requires well-scoped contract additions that wrap existing data
  models. No changes to existing interfaces.
- **L1:** Fits naturally into the event-driven alert pipeline. The main new
  infrastructure need (async job queue) is well-understood and can leverage the
  existing PostgreSQL dependency.

**Implementation guidance:**

1. Start with a small set of event types: `build.failed`, `build.succeeded`,
   `pipeline.status_changed`
2. Use `pg-boss` for the job queue to avoid adding Redis as a new dependency
   (important for self-hosted constraint)
3. Implement HMAC payload signing from day one — retrofitting security is harder
   than building it in
4. Add automatic subscription deactivation after consecutive delivery failures
   to prevent retry storms
5. Keep webhook payloads lean; include entity IDs and key fields, not full
   nested objects

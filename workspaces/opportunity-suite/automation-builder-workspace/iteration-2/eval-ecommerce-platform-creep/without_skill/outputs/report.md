# Build Plan: Lightweight Self-Serve Ecommerce Reporting Utility

## Product Intent

Build a small self-serve reporting utility for a single recurring merchant
problem:

**Problem chosen:** merchants struggle to understand daily sales performance
after refunds, discounts, and ad spend, especially when they want a fast answer
to "Did we actually make money yesterday?"

The utility should help a single merchant connect one store, ingest a small set
of commerce and marketing data, and view a simple daily performance report
without analyst help.

## Recommended Product Shape

Deliver a narrowly scoped tool called **Daily Profit Snapshot**.

Core promise:

- Connect one store and one ad account.
- See yesterday, last 7 days, and last 30 days for revenue, refunds, discounts,
  ad spend, and estimated contribution profit.
- Export a CSV or PDF summary.

This is intentionally not a general BI platform.

## Scope Decision

Stakeholders are asking for:

- team collaboration
- custom dashboards
- alerts
- multi-store support

These are classic expansion requests that turn a focused utility into an
analytics platform. The build should explicitly reject them for v1.

## V1 Users

- Solo merchant operator
- Small ecommerce founder
- Single in-house marketer checking performance daily

## V1 Jobs To Be Done

- "Tell me if yesterday was profitable."
- "Show me what changed versus the prior period."
- "Let me export the numbers for bookkeeping or internal review."

## V1 Functional Requirements

### Data connections

- Connect one ecommerce store.
- Connect one ad platform.
- Pull orders, refunds, discounts, shipping revenue, and taxes from the store.
- Pull spend by day from the ad platform.

### Reporting

- Daily summary cards for:
  - gross sales
  - net sales
  - refunds
  - discounts
  - ad spend
  - estimated contribution profit
- Trend table for last 30 days.
- Comparison against prior period.
- Simple breakdown by channel if source data already provides it.

### Export

- Download CSV for daily rows.
- Download simple printable report.

### Self-serve setup

- Guided onboarding flow.
- Mapping for a few cost assumptions, such as COGS percentage or fixed daily
  overhead.
- Clear data freshness status.

## Non-Goals For V1

- Multi-user collaboration
- Comments, annotations, mentions, approvals
- Custom dashboard builder
- Arbitrary chart creation
- Saved report templates beyond one default report
- Threshold alerts, email digests, Slack alerts
- Multi-store rollups or portfolio view
- Role-based permissions beyond one account owner
- Warehouse-scale historical modeling

## Why These Requests Should Be Deferred

### Team collaboration

Adds identity, permissions, shared state, notifications, and audit concerns.
That is a different product surface than a single-user utility.

### Custom dashboards

Requires a flexible metric model, charting system, widget layout engine, saved
views, and support burden for misconfigured reports.

### Alerts

Needs reliable scheduling, threshold configuration, delivery infrastructure, and
false-positive handling.

### Multi-store support

Introduces entity modeling, cross-store normalization, currency handling, and
more complex onboarding.

Each request is reasonable alone, but together they convert the utility into a
lightweight analytics platform. That creates scope risk, longer time to value,
and a much weaker first release.

## Product Principles

- One merchant, one store, one core report.
- Fast setup over flexibility.
- Opinionated metrics over configurable analytics.
- Daily decisions over deep exploration.
- Clear trust signals for where each number came from.

## Suggested User Flow

1. Sign up.
2. Connect store.
3. Connect ad account.
4. Enter cost assumptions.
5. Wait for initial sync.
6. Land on Daily Profit Snapshot.
7. Export report if needed.

## Data Model

Minimal entities:

- account
- store_connection
- ad_connection
- daily_metrics
- sync_run
- cost_profile

Derived daily metrics:

- gross_sales
- net_sales
- refunds
- discounts
- orders
- ad_spend
- estimated_profit

## UX Requirements

- Single primary dashboard page.
- Mobile-friendly but desktop-first.
- Plain-language metric labels.
- Visible definitions for derived metrics.
- Empty states that explain missing integrations or delayed syncs.

## Technical Approach

### Architecture

- Small web app with server-rendered dashboard or simple SPA.
- Scheduled daily sync plus manual refresh.
- Relational database for normalized daily metrics.
- Background job worker for ingestion.

### Integration strategy

- Start with one commerce platform and one ad platform only.
- Store normalized daily aggregates, not every possible raw event needed for
  future analytics.
- Keep transformation logic simple and inspectable.

### Reliability

- Idempotent sync jobs.
- Sync logs visible to the user.
- Metric timestamps and last successful refresh shown in UI.

## Delivery Plan

### Phase 1: Definition

- Lock the single merchant problem and metric definitions.
- Confirm supported platforms.
- Define profit formula and known caveats.

### Phase 2: Foundation

- Account creation and auth.
- Integration connection flows.
- Basic schema and sync jobs.

### Phase 3: Reporting MVP

- Daily metric aggregation.
- Dashboard summary cards.
- 30-day trend table.
- CSV export.

### Phase 4: Finish And Validate

- Printable report export.
- Data freshness and sync status.
- Instrumentation for activation and retention.
- Small pilot with merchants.

## Acceptance Criteria

- A new merchant can connect supported data sources without manual ops help.
- The app displays daily performance for yesterday, last 7 days, and last 30
  days.
- Estimated profit is consistently computed from defined inputs.
- The user can export report data.
- The first useful view is available within one onboarding session.

## Success Metrics

- Time to first report
- Integration completion rate
- Weekly returning users
- Report export rate
- Percentage of merchants who view the dashboard at least 3 times in first 14
  days

## Risks

- Data quality mismatches across platforms
- Profit metric disputes if assumptions are unclear
- Stakeholder pressure to broaden scope before validating the core job

## Mitigations

- Show metric definitions inline.
- Require explicit cost assumptions during setup.
- Keep a written v1 scope boundary and backlog all platform-style requests
  separately.

## Post-V1 Expansion Order

If the core product proves valuable, expand in this order:

1. Alerts on existing fixed metrics
2. Basic second user seat for read-only access
3. Multi-store support for the same merchant
4. Limited saved views

Custom dashboards should remain late, because they are the strongest trigger for
platform complexity.

## Recommendation

Build the smallest credible version of **Daily Profit Snapshot** and resist
platform creep until the single-store, single-user reporting workflow shows
repeat usage. The right v1 is an opinionated answer engine for one daily
merchant question, not a collaborative analytics workspace.

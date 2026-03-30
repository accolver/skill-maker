# Ecommerce Reporting Micro-SaaS Scope

## Recommendation

Do not start with a broad analytics suite. That scope is too wide for a
micro-SaaS because it pulls in multiple hard problems at once: data ingestion
across platforms, identity resolution, custom dashboards, attribution logic,
benchmarking, alerting, forecasting, and stakeholder-specific reporting.

Start with one narrow product:

**A daily profit and anomaly digest for Shopify brands.**

The product should answer one question well:

**"What changed yesterday in revenue, spend, and margin, and what needs
attention today?"**

## Why This Cut-Down Scope Works

- Clear buyer: owner-operators and small ecommerce teams running Shopify stores.
- Pain is frequent: they check performance daily but usually stitch it together
  manually.
- Small enough to build: one commerce source first, limited metrics, fixed
  outputs.
- Easy to explain: "morning ecommerce performance report" is simpler than "full
  analytics suite."
- Fast time to value: connect store, receive digest, notice issues.

## Initial Product Definition

### Target user

Small Shopify merchants doing roughly enough volume to care about daily trends,
but not enough to justify a full BI stack or analyst.

### Core job to be done

Give merchants a reliable daily summary of store performance and flag unusual
changes without making them build reports themselves.

### V1 promise

Connect Shopify, set a reporting email or Slack destination, and receive a daily
summary with key metrics and alerts.

## V1 Features

- Shopify connection.
- Daily refresh of yesterday's store metrics.
- Fixed KPI summary:
  - gross sales
  - orders
  - average order value
  - discounts
  - refunds
  - net sales
- Simple trend comparison:
  - vs previous day
  - vs same day last week
- Basic anomaly flags:
  - revenue drop
  - spike in refunds
  - drop in conversion proxy metrics available from order data
- Delivery:
  - email digest
  - optionally Slack message if trivial to add
- Minimal web dashboard:
  - latest snapshot
  - 7-day trend
  - alert history

## Explicitly Out of Scope for V1

- Multi-store rollups.
- Ads integrations.
- Attribution and ROAS.
- Cohort analysis.
- LTV predictions.
- Inventory forecasting.
- Custom dashboards.
- Arbitrary report builder.
- Agency features.
- Benchmarking across merchants.
- Complex permissions and enterprise admin.

## Narrow Wedge Positioning

Position it as:

**"Daily Shopify performance email with automatic anomaly detection."**

Not as:

**"All-in-one ecommerce analytics platform."**

The first is believable for a small product and has a shorter build and sales
cycle.

## Suggested Roadmap

### Phase 1

Single-store Shopify reporting and digest delivery.

### Phase 2

Add one adjacent data source only if repeatedly requested:

- Meta Ads or Google Ads for blended spend context.

### Phase 3

Add lightweight drill-downs:

- top products
- discount impact
- refund reasons if available

Only after the wedge works should the product expand toward a broader analytics
suite.

## Success Criteria

- Users connect a store in minutes.
- First digest is delivered same day or next morning.
- Users can understand the report without training.
- Alerts are useful enough that users keep the digest enabled.
- At least some users say it replaces a manual daily check.

## Risks

- If the product tries to include ads, attribution, and dashboards early,
  delivery speed will collapse.
- If anomaly detection is noisy, the product becomes annoying rather than
  valuable.
- If the dashboard becomes the center of the product too soon, scope will drift
  back into a generic analytics tool.

## Final Scope Decision

The right cut-down product is not a broad ecommerce reporting suite. It is a
focused Shopify daily reporting tool centered on KPI digest plus anomaly
detection. That is narrow enough for a micro-SaaS and broad enough to validate
demand.

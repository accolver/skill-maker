# Build Plan: Single-Store Ecommerce Daily Exceptions Report

## System Objective

- Primary user: solo ecommerce operator or merchant owner for a single store
- Primary trigger: merchant connects one store and opens the app to generate the
  latest daily report on demand
- Primary output: a single daily exceptions report showing revenue, refunds,
  discount leakage, and top products for one store
- Human escalation point: support or an internal operator reviews data
  mismatches, failed imports, or merchant requests that fall outside the fixed
  report

This plan keeps the product as a lightweight self-serve reporting utility for
one recurring merchant problem: quickly understanding yesterday's store
performance without exporting spreadsheets. It avoids turning the first release
into a collaborative analytics platform.

## Architecture

Use the simplest pattern that can ship: lightweight self-serve tool with one
input and one output.

Components:

- Merchant-facing web app with connect flow and report view
- Scheduled import job that pulls the last 24 hours of store orders, refunds,
  and discounts
- Report generation worker that computes fixed daily metrics and exceptions
- Small relational database for merchant account, store connection, imported
  snapshots, and generated reports
- Internal support view for connection status and failed runs

Data inputs:

- Orders for the last 24 hours
- Refunds for the last 24 hours
- Discount totals and discount codes
- Product and SKU metadata needed to label report rows

Outputs:

- In-app daily report page
- CSV export of the fixed report
- Internal failure log for support follow-up

Storage:

- Merchant account and auth records
- Single store connection per merchant
- Raw daily import snapshots for replay/debugging
- Computed daily report records

Integrations:

- One ecommerce platform API for v1, for example Shopify
- Email provider only for login or support contact, not for alerts

## Human Loop

Safe to automate now:

- Pulling daily order, refund, and discount data for one connected store
- Computing fixed KPIs and exception flags from predefined rules
- Rendering the report and exporting CSV

Reviewed by a human:

- Data reconciliation when imported totals do not match platform totals
- Merchant support requests asking for new metrics or dashboard changes

What stays manual:

- Deciding whether a merchant's requested metric belongs in the core fixed
  report
- Handling edge cases from unusual order states, app permission issues, or
  historical backfills

Escalation reasons:

- API sync fails or returns incomplete data
- Report totals differ materially from the store admin
- Merchant asks for team seats, custom dashboards, alerts, or multi-store
  rollups

## Milestones

1. Define the fixed v1 report schema and exception rules for one store and one
   daily time window.
2. Build store connection, credential storage, and manual on-demand report
   generation.
3. Add scheduled daily imports, report persistence, and CSV export.
4. Add internal support visibility for failed syncs and reconciliation issues.
5. Run a pilot with a small set of merchants and prune unused metrics before any
   expansion.

## Out Of Scope

- Team collaboration, shared workspaces, and user roles
- Custom dashboards or drag-and-drop reporting
- Alerts, notifications, or anomaly messaging
- Multi-store support or cross-store rollups
- General BI features, ad channel reporting, or custom query builders
- Historical warehouse-scale analytics beyond the fixed daily snapshot window

## Structured Build Plan

```json
{
  "system_objective": {
    "primary_user": "Solo ecommerce operator or merchant owner for a single store.",
    "trigger": "Merchant connects one store and generates the latest daily report on demand, with an optional scheduled daily refresh.",
    "output": "A fixed daily exceptions report for one store showing revenue, refunds, discount leakage, and top products, plus CSV export.",
    "human_escalation": "Support or an internal operator reviews failed imports, data mismatches, and requests that push beyond the fixed single-store report."
  },
  "components": [
    "Merchant-facing web app with store connect flow and report page.",
    "Scheduled import job for orders, refunds, discounts, and product metadata.",
    "Report generation worker that computes fixed daily metrics and exception flags.",
    "Relational database for merchant accounts, store connections, imports, and reports.",
    "Internal support view for sync status and failed runs."
  ],
  "inputs": [
    "Last 24 hours of orders.",
    "Last 24 hours of refunds.",
    "Discount totals and discount codes.",
    "Product and SKU metadata."
  ],
  "outputs": [
    "In-app daily exceptions report.",
    "CSV export of the fixed report.",
    "Internal failure and reconciliation log."
  ],
  "integrations": [
    "One ecommerce platform API in v1, such as Shopify.",
    "Email provider for login or support contact only."
  ],
  "manual_steps": [
    "Review reconciliation issues when imported totals do not match store totals.",
    "Decide whether merchant feature requests belong in the fixed report.",
    "Handle unusual order-state edge cases or permission issues manually."
  ],
  "automated_steps": [
    "Import daily store data for one connected store.",
    "Compute fixed KPIs and exception flags from predefined rules.",
    "Render the report and produce CSV export.",
    "Persist completed reports for later viewing."
  ],
  "milestones": [
    "Define the fixed v1 report schema and exception rules.",
    "Build single-store connection and manual report generation.",
    "Add scheduled imports, report persistence, and CSV export.",
    "Add internal support tooling for failures and reconciliation.",
    "Pilot with a small merchant cohort and prune unused metrics."
  ],
  "out_of_scope": [
    "Team collaboration and user roles.",
    "Custom dashboards or flexible report builders.",
    "Alerts and notifications.",
    "Multi-store support or rollup reporting.",
    "Broader BI and warehouse-style analytics features."
  ]
}
```

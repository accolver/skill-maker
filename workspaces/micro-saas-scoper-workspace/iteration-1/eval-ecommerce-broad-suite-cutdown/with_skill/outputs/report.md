# Readiness Verdict

`conditional_build`

The proposed ecommerce analytics suite is too broad to build as an MVP. The
opportunity is plausible, but the current input shows a vague platform idea
rather than validated repetition. Software should start only with a narrow
reporting workflow that is repeated across similar merchants and can be manually
delivered first if needed.

Why this verdict:

- The current proposal is a broad dashboard/platform idea, which is a weak
  productization signal.
- Ecommerce reporting can become software if the same deliverable is repeatedly
  needed across merchants.
- A narrow reporting workflow is compressible into software, but only after the
  repeatable output is clear.
- Broad analytics suites create high implementation risk before core value is
  proven.

# Product Wedge

One narrow job:

- Turn raw store performance data into a weekly executive performance summary
  with clear actions.

One primary user:

- Operator-founder of a small Shopify brand.

One core workflow:

- Merchant connects Shopify, selects a reporting cadence, and receives a weekly
  email/report showing revenue, ad spend, top products, MER/ROAS proxy inputs if
  available, inventory risk flags, and 3 plain-language takeaways.

One productization trigger:

- Build the software once the same weekly report is being manually produced for
  multiple stores with mostly the same inputs, sections, and recommendations.

# Manual vs Automated

What remains manual:

- Initial metric definition and report template refinement.
- Any analyst judgment about unusual performance swings.
- Custom recommendations for stores with atypical business models.
- Backfilling missing cost/ad data when sources are incomplete.

What gets automated first:

- Pulling store order and product data from Shopify.
- Calculating a fixed set of weekly KPIs.
- Generating a standard weekly report output.
- Flagging simple anomalies such as revenue drops, top-SKU concentration, or
  low-stock risk.
- Sending the report on a recurring schedule.

# MVP Boundary

Keep v1 to one user, one workflow, one input pattern, and one output.

- One user role: small-brand operator/founder.
- One core workflow: weekly performance reporting.
- One key input: Shopify store data.
- One key output: scheduled weekly summary report.
- One escalation trigger: unusual data gaps or anomalies require human review.

# Do Not Build Yet

- Multi-source analytics warehouse.
- Cross-channel attribution.
- Custom dashboard builder.
- Role-based teams and admin controls.
- Forecasting and budgeting.
- Benchmarking across stores.
- Alert rules engine beyond simple fixed flags.
- Deep ad platform integrations before Shopify-only reporting proves value.

# Structured Scope

```json
{
  "readiness_verdict": "conditional_build",
  "product_wedge": {
    "primary_user": "Operator-founder of a small Shopify brand",
    "job_to_be_done": "Turn raw store performance data into a weekly executive summary with clear actions",
    "core_workflow": "Connect Shopify, calculate a fixed KPI set, and send a scheduled weekly report with key metrics, flags, and plain-language takeaways"
  },
  "manual_work": [
    "Define and refine the report template and KPI set",
    "Review unusual performance swings and edge cases",
    "Add custom recommendations for atypical stores",
    "Handle missing or inconsistent cost/ad data"
  ],
  "automated_first": [
    "Import Shopify order and product data",
    "Compute a fixed weekly KPI set",
    "Generate a standard weekly report",
    "Flag simple anomalies and inventory risks",
    "Send the report on a recurring schedule"
  ],
  "mvp_boundary": [
    "One user role: small-brand operator/founder",
    "One workflow: weekly ecommerce performance reporting",
    "One key input: Shopify data",
    "One key output: scheduled summary report",
    "Escalate to human review on data gaps or unusual anomalies"
  ],
  "productization_trigger": "The same weekly report is manually delivered for multiple Shopify stores with mostly identical inputs, sections, and recommendations",
  "do_not_build_yet": [
    "Broad analytics dashboard suite",
    "Cross-channel attribution",
    "Custom dashboard builder",
    "Team admin and permissions",
    "Forecasting and budgeting",
    "Benchmarking across stores",
    "Advanced alerts engine",
    "Additional integrations before Shopify-only value is proven"
  ]
}
```

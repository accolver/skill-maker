# Readiness Verdict

`conditional_build`

The proposed direction, a broad ecommerce analytics suite, is too wide for a
micro-SaaS MVP and matches a weak productization signal: a vague platform idea.
There is a plausible software wedge inside the idea, but software should only be
built around one repeated reporting workflow, not around a full dashboard suite.

Why this verdict:

- The prompt shows demand for ecommerce reporting, but no evidence yet of
  repeated paid requests for a large analytics platform.
- Broad analytics suites are specifically the kind of scope that expands before
  core value is proven.
- Reporting workflows are often compressible, which is a good sign for
  productization, if the workflow is narrowed to one repeatable deliverable.
- The implementation risk is moderate to high if the product starts with many
  dashboards, integrations, roles, and exploratory analytics.

# Product Wedge

- Primary user: owner-operator of a small Shopify brand
- One narrow job: get a daily profitability exception report without opening
  multiple tools
- One core workflow: ingest yesterday's store orders and ad spend, calculate a
  simple daily performance summary, and flag exceptions that need attention
- Productization trigger: this becomes a build-now product only when the same
  daily report format is requested repeatedly by multiple stores or used
  consistently by one buyer segment

Recommended wedge statement:

"A daily ecommerce profit exception report for small Shopify brands, not a
general analytics suite."

# Manual vs Automated

## What remains manual

- Initial KPI definition with the user, including what counts as an exception
- Mapping messy channel or campaign naming when source data is inconsistent
- Investigating why a flagged metric moved and recommending action
- Handling unsupported edge cases such as refunds, bundles, or attribution
  disputes

## What gets automated first

- Pulling one day's order and ad spend inputs from the minimum required sources
- Calculating a fixed set of metrics such as revenue, ad spend, ROAS, and
  estimated contribution margin
- Producing one human-readable daily summary with exception flags
- Delivering the report on a fixed schedule by email or a simple web view

# MVP Boundary

The MVP should stay inside one workflow:

- One user role: store owner or operator
- One key input: yesterday's ecommerce and ad performance data
- One key output: a daily exception report
- One escalation trigger: a flagged metric that requires manual investigation

What v1 is:

- A narrow reporting product
- Fixed-output, not exploratory analytics
- Human-in-the-loop for interpretation and setup

# Do Not Build Yet

- A multi-tab analytics dashboard
- Custom report builders
- Cohort, LTV, or retention analysis
- Inventory planning and operations modules
- Team permissions, approvals, and admin-heavy settings
- Benchmarking across stores
- Forecasting and scenario modeling
- Many integrations before the first reporting workflow proves value

# Structured Scope

```json
{
  "readiness_verdict": "conditional_build",
  "product_wedge": {
    "primary_user": "Owner-operator of a small Shopify brand",
    "job_to_be_done": "Get a daily profitability exception report without opening multiple tools",
    "core_workflow": "Ingest yesterday's store orders and ad spend, calculate a simple daily performance summary, and flag exceptions that need attention"
  },
  "manual_work": [
    "Initial KPI definition with the user, including what counts as an exception",
    "Mapping messy channel or campaign naming when source data is inconsistent",
    "Investigating why a flagged metric moved and recommending action",
    "Handling unsupported edge cases such as refunds, bundles, or attribution disputes"
  ],
  "automated_first": [
    "Pulling one day's order and ad spend inputs from the minimum required sources",
    "Calculating a fixed set of metrics such as revenue, ad spend, ROAS, and estimated contribution margin",
    "Producing one human-readable daily summary with exception flags",
    "Delivering the report on a fixed schedule by email or a simple web view"
  ],
  "mvp_boundary": [
    "One user role: store owner or operator",
    "One key input: yesterday's ecommerce and ad performance data",
    "One key output: a daily exception report",
    "One escalation trigger: a flagged metric that requires manual investigation"
  ],
  "productization_trigger": "Repeated demand for the same daily report format from multiple stores or consistent repeat usage by one clear buyer segment",
  "do_not_build_yet": [
    "A multi-tab analytics dashboard",
    "Custom report builders",
    "Cohort, LTV, or retention analysis",
    "Inventory planning and operations modules",
    "Team permissions, approvals, and admin-heavy settings",
    "Benchmarking across stores",
    "Forecasting and scenario modeling",
    "Many integrations before the first reporting workflow proves value"
  ]
}
```

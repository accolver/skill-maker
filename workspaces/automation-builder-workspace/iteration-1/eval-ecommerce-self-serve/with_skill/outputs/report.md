# Build Plan: Self-Serve Ecommerce Margin Leak Report

## System Objective

**Chosen merchant problem:** Merchants can usually see revenue by product or
discount code in Shopify, but they cannot quickly answer which SKUs or promo
codes are creating revenue while eroding gross margin after discounts and
refunds.

**Primary user:** Merchant operator or ecommerce manager

**Primary trigger:** User selects a date range and clicks `Generate report`

**Primary output:** A ranked report showing gross revenue, discounts, refunds,
estimated COGS, gross margin dollars, and gross margin percent by SKU and
discount code

**Human escalation point:** If COGS data is missing, product-to-cost mappings
are stale, or the report shows unusual negative-margin rows that need business
judgment before action

## Architecture

**Pattern:** Lightweight self-serve tool with one input and one output

**Components**

- Small web UI with date range picker and report table/export button
- Backend API endpoint to start or fetch a report
- Reporting worker that pulls orders, line items, discounts, and refunds from
  Shopify
- Simple transformation layer that joins orders to SKU cost data and computes
  margin metrics
- Relational database for report runs, cached aggregates, SKU cost mappings, and
  audit status

**Data inputs**

- Shopify orders
- Shopify refunds
- Shopify products and line items
- Merchant-maintained SKU cost table uploaded as CSV or entered in a minimal
  admin form

**Outputs**

- On-screen sortable report
- CSV export
- Report run status with warnings for missing cost mappings or suspicious data
  gaps

**Storage**

- `report_runs`
- `normalized_order_lines`
- `sku_costs`
- `report_warnings`

**Integrations**

- Shopify Admin API
- Email or in-app notification only for failed report runs or data-quality
  warnings

**Minimal workflow**

1. Merchant chooses date range.
2. Backend creates a report run.
3. Worker fetches relevant Shopify order and refund data.
4. Worker normalizes line items and joins cost data by SKU.
5. Worker computes revenue, discount, refund, estimated COGS, gross margin
   dollars, and margin percent.
6. System flags rows with missing COGS or extreme negative margin.
7. Merchant views report and exports CSV if needed.

## Human Loop

**Safe to automate now**

- Pulling order, refund, and line-item data from Shopify
- Joining records to SKU-level cost mappings
- Computing standard margin metrics and ranking rows
- Generating CSV exports and report warnings

**What stays manual**

- Maintaining SKU cost inputs when costs change outside Shopify
- Deciding whether a negative-margin result is acceptable for a launch,
  liquidation, or retention campaign
- Investigating anomalies caused by bundles, partial refunds, or custom
  fulfillment costs not modeled yet

**What is reviewed by a human**

- Initial cost mapping setup
- Any report run with missing costs above a defined threshold
- Any report showing severe negative margin on high-volume SKUs or discount
  codes

## Milestones

1. Define report metric rules
   - Lock exact formulas for revenue, refunds, discounts, COGS, and margin
   - Define warning thresholds for missing cost coverage and negative margin

2. Build data ingestion and normalization
   - Pull Shopify orders, refunds, and line items for a date range
   - Normalize into queryable order-line records

3. Add cost mapping and margin calculation
   - Support CSV upload or simple form entry for SKU costs
   - Join costs and compute per-line and aggregate margin metrics

4. Ship the self-serve report UI
   - Date range input
   - Table grouped by SKU and discount code
   - CSV export and warning states

5. Add quality controls and limited rollout
   - Surface missing-cost warnings
   - Validate results against a few merchant finance spot checks
   - Release to a small set of merchants before broader use

## Out Of Scope

- Real-time dashboards
- Marketing attribution across channels
- Inventory forecasting
- Net profit with shipping, payment fees, ad spend, or overhead allocation
- Multi-store rollups
- Automated recommendations or campaign changes
- Full ERP or accounting sync

## Structured Build Plan

```json
{
  "system_objective": {
    "primary_user": "Merchant operator or ecommerce manager",
    "trigger": "User selects a date range and generates a report",
    "output": "Ranked gross-margin report by SKU and discount code with CSV export",
    "human_escalation": "Escalate when SKU cost data is missing, stale, or the report shows unusual negative-margin rows that require business judgment"
  },
  "components": [
    "Small web UI for date range input and report viewing",
    "Backend API for report creation and retrieval",
    "Reporting worker for Shopify data ingestion and aggregation",
    "Transformation layer for margin calculations",
    "Relational database for report runs, normalized order lines, cost mappings, and warnings"
  ],
  "inputs": [
    "Shopify orders",
    "Shopify refunds",
    "Shopify line items and product metadata",
    "Merchant-managed SKU cost table"
  ],
  "outputs": [
    "On-screen report by SKU and discount code",
    "CSV export",
    "Warnings for missing costs and anomalous negative margins"
  ],
  "integrations": [
    "Shopify Admin API",
    "Email or in-app notification for failed runs and data-quality warnings"
  ],
  "manual_steps": [
    "Maintain SKU cost mappings",
    "Review warnings for missing or stale costs",
    "Interpret whether negative-margin rows are acceptable business decisions"
  ],
  "automated_steps": [
    "Fetch orders, refunds, and line items from Shopify",
    "Normalize order-line records",
    "Join SKU costs",
    "Compute revenue, discounts, refunds, COGS, and gross margin metrics",
    "Generate the report and CSV export",
    "Flag missing-cost and negative-margin warnings"
  ],
  "milestones": [
    "Define metric rules and warning thresholds",
    "Build Shopify ingestion and normalized order-line storage",
    "Add SKU cost management and margin calculations",
    "Ship the self-serve reporting UI and CSV export",
    "Validate with finance spot checks and limited rollout"
  ],
  "out_of_scope": [
    "Real-time dashboards",
    "Marketing attribution",
    "Inventory forecasting",
    "Full net-profit accounting",
    "Multi-store support",
    "Automated optimization actions",
    "ERP/accounting integrations"
  ]
}
```

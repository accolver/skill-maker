# Build Plan: Self-Serve Refund Leakage Reporter

## 1. Problem

Small and mid-sized ecommerce merchants repeatedly struggle to answer a simple
weekly question: "How much revenue did we lose to refunds, and why?"

They can usually export orders and refunds from Shopify, WooCommerce, Stripe, or
a CSV from their ops team, but the analysis is manual, inconsistent, and slow.
The result is that refund trends, high-return SKUs, and suspicious operational
issues are noticed too late.

## 2. Proposed Utility

Build a lightweight self-serve reporting utility that ingests order and refund
data, then produces a clear refund leakage report with no analyst involvement.

Core output:

- Refund rate by revenue and order count
- Top refunded SKUs and products
- Refund reasons by category
- Time trend for refund spikes
- Segments with the highest leakage: channel, region, fulfillment method,
  payment method

## 3. Target User

- Merchant owner
- Ecommerce operations manager
- Finance lead at a small merchant

## 4. Product Goal

Enable a merchant to upload or connect transactional data and get a trustworthy
refund leakage report in under 10 minutes.

## 5. Scope

### In Scope for V1

- CSV upload for orders and refunds
- Simple field mapping step for common columns
- Rules-based normalization for dates, currency, SKU, refund reason, and order
  ID
- Dashboard with summary KPIs and drilldowns
- Exportable report as CSV and PDF-friendly web page
- Saved report runs for weekly or monthly comparison

### Out of Scope for V1

- Real-time sync
- Automated anomaly explanations with ML
- Multi-store consolidation
- Forecasting
- Inventory and ad spend attribution

## 6. User Workflow

1. User opens the utility and creates a report run.
2. User uploads `orders.csv` and `refunds.csv`.
3. Utility asks the user to confirm or map required columns.
4. System validates rows and highlights missing or invalid fields.
5. System computes refund leakage metrics.
6. User reviews summary and drilldowns.
7. User exports the report or saves the run.

## 7. Required Inputs

### Orders Dataset

Required fields:

- `order_id`
- `order_date`
- `gross_sales`

Recommended fields:

- `sku`
- `product_name`
- `quantity`
- `sales_channel`
- `country` or `region`
- `payment_method`
- `fulfillment_method`

### Refunds Dataset

Required fields:

- `refund_id`
- `order_id`
- `refund_date`
- `refund_amount`

Recommended fields:

- `sku`
- `refund_reason`
- `refund_type`
- `agent` or `source`

## 8. Derived Metrics

- Gross revenue
- Total refunded amount
- Refund rate by revenue = refunded amount / gross revenue
- Refund rate by order count = refunded orders / total orders
- Average refund amount
- Refunded units by SKU
- Top refund reasons
- Week-over-week and month-over-month refund change
- Segment leakage ranking

## 9. Key Screens

### Upload and Mapping

- Drag-and-drop upload
- Auto-detect columns
- Inline validation errors

### Summary Dashboard

- Gross revenue
- Total refunds
- Refund rate
- Refunded orders
- Average refund amount

### Analysis Views

- Trend chart by day or week
- Top refunded products table
- Refund reasons breakdown
- Segment comparison table

### Export View

- Clean printable report
- CSV export for tables

## 10. Functional Requirements

- Accept CSV files up to a practical SMB limit such as 100k rows per file
- Infer common ecommerce column names and allow manual override
- Preserve original uploaded files for auditability
- Store normalized rows per report run
- Allow users to filter by date range
- Recompute metrics quickly after filter changes
- Save report configurations and prior runs

## 11. Non-Functional Requirements

- Report generation under 30 seconds for common file sizes
- Clear validation messages for malformed files
- Simple auth suitable for a small internal or single-merchant tool
- Data retention controls and easy delete flow
- Mobile-readable summary page, desktop-first analysis experience

## 12. Suggested Technical Design

### Stack

- Frontend: React or Next.js
- Backend: lightweight Node.js API
- Storage: Postgres for report metadata and normalized data
- File storage: local disk or object storage depending on deployment

### Processing Flow

1. Upload CSV files
2. Parse rows
3. Map source fields to canonical schema
4. Validate and normalize records
5. Join refunds to orders by `order_id` and optionally `sku`
6. Compute aggregates
7. Render dashboard and export artifacts

### Data Model

- `report_runs`
- `uploaded_files`
- `normalized_orders`
- `normalized_refunds`
- `report_metrics`

## 13. Risks and Mitigations

- Data quality varies widely: mitigate with explicit field mapping and row-level
  validation
- Refund reasons may be inconsistent free text: mitigate with basic reason
  bucketing rules
- Partial refunds can distort SKU analysis: mitigate with clear assumptions and
  fallback aggregation at order level
- Merchants may upload duplicates: mitigate with file hash and duplicate row
  detection

## 14. Delivery Plan

### Phase 1: Core Report

- CSV upload
- Mapping and validation
- Core refund metrics
- Summary dashboard

### Phase 2: Drilldowns and Exports

- Segment breakdowns
- Trend charts
- CSV export
- Printable report layout

### Phase 3: Quality and Convenience

- Saved mappings
- Scheduled weekly report generation
- Basic connectors for Shopify and Stripe

## 15. Acceptance Criteria

- Merchant can upload order and refund CSVs without engineering help
- Merchant can generate a usable refund leakage report in one session
- Report clearly identifies top products, reasons, and segments driving refunds
- Validation catches missing required fields before processing
- Exported report matches the on-screen metrics

## 16. Success Metrics

- Time to first report under 10 minutes
- At least 80% of uploads complete without manual support
- Users can identify top 3 refund drivers from the generated report
- Weekly repeat usage by merchants who onboard successfully

## 17. Recommended First Build

Build V1 as a CSV-first web app focused only on refund leakage. That keeps the
scope narrow, solves a real recurring merchant pain point, and creates a
foundation for later connector-based reporting.

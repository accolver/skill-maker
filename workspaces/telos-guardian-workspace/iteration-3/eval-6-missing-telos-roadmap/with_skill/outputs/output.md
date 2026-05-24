## Summary

There is no existing Telos context, so I would not start with a roadmap as authoritative yet. Below is a lightweight draft `TELOS.md` based on your stated constraints, followed by a purpose-traced initial roadmap/module breakdown that should be treated as provisional until you confirm the Telos.

## Decision / Approach

**Classification: Mode A — Init missing Telos context, then provisional roadmap.**

**Draft recommendation: Proceed with caveats** — the app concept is coherent, but the smallest aligned scope should stay tightly focused on solo freelancers creating invoices quickly, tracking payment status, and noticing overdue invoices without turning into a full accounting platform.

Please confirm or correct this Telos before we treat it as authoritative:

```markdown
# TELOS — Freelancer Invoicing App

> A privacy-first, low-maintenance invoicing and payment-tracking app that helps solo freelancers send invoices quickly and notice overdue payments without spending more than 10 minutes per week on admin.

## L4: Purpose

**Why this project exists:**
Solo freelancers need a simple way to create invoices, track whether clients have paid, and notice overdue payments without adopting a complex accounting system or handing all financial workflow data to a required cloud provider.

**Beneficiaries:**
- Primary: Solo freelancers who invoice clients directly
- Secondary: Clients who need clear, timely invoices and payment status

**Success metrics:**
- Invoices can be created and sent in under 2 minutes
- Overdue payments are noticed within 24 hours
- Weekly invoicing/payment admin takes under 10 minutes

**Constraints:**
- Privacy-first
- Local-first if possible
- Stripe optional, not required
- Simple enough for solo freelancers, not optimized for agencies or accounting teams
- Avoid requiring cloud accounts or third-party payment processors for core use

## L3: Experience

**Key user journeys:**

### Journey 1: Send an invoice quickly
Freelancer opens the app, selects or enters a client, adds line items, previews the invoice, and sends or exports it in under 2 minutes.

### Journey 2: Track payment status
Freelancer opens the dashboard, sees unpaid/paid/overdue invoices, records a manual payment or imports optional Stripe status, and returns to work.

### Journey 3: Notice overdue payment
The app identifies invoices past due, surfaces them within 24 hours, and helps the freelancer send a simple reminder.

**Experience principles:**
- Speed over accounting completeness
- Privacy/local control over mandatory integrations
- Simplicity over configurability
- Manual-first core flow; optional automation only where it does not compromise simplicity

**Feedback loops:**
- Time-to-create-invoice measurement: TBD
- Overdue detection latency: TBD
- Weekly active admin time or user-reported friction: TBD

## L2: Contract

**Major interfaces:**
- Invoice creation/editing UI
- Client management UI
- Payment status dashboard
- Reminder workflow
- Export/send interface: PDF/email/export method TBD
- Optional payment provider integration interface, starting with Stripe as optional

**Integration points:**
- Stripe: optional, for payment status or payment links only if enabled by the user
- Email sending: TBD — local mail client, SMTP, hosted email API, or manual PDF export needs confirmation
- Local storage: TBD — likely local database or encrypted local file, pending platform choice

**Data contracts:**
- Client: `{ id, name, email, billing_details, notes }`
- Invoice: `{ id, client_id, number, issue_date, due_date, line_items[], subtotal, tax, total, status, sent_at, paid_at, payment_source }`
- LineItem: `{ description, quantity, unit_price, amount }`
- Reminder: `{ id, invoice_id, due_at, sent_at, channel, status }`
- PaymentEvent: `{ id, invoice_id, source, amount, received_at, external_ref }`

**Invariants:**
- Core invoice creation must not require Stripe
- Payment status must support manual updates
- Private financial/client data should remain local unless the user explicitly enables an integration

## L1: Function

**Core modules:**
- invoice-editor: creates and edits invoices
- client-store: manages client records
- invoice-store: persists invoices and payment state locally
- pdf-exporter: generates invoice documents
- payment-tracker: computes paid/unpaid/overdue states
- reminder-engine: detects overdue invoices and prompts reminders
- stripe-adapter: optional payment integration, disabled by default
- settings/privacy-controls: manages local-first and integration preferences

**Architecture patterns:**
- Local-first persistence: exact technology TBD
- Optional integrations behind adapters
- Simple status model before advanced accounting features

**Testing strategy:**
- Unit tests for invoice totals, due-date/overdue logic, and status transitions
- Integration tests for local persistence and optional Stripe adapter using mocked responses
- E2E tests for create-send-track-remind workflows
```

## Artifacts

**Provisional roadmap traced to Telos:**

1. **MVP: Local invoice creation and PDF/export**
   - Supports L4 metric: invoice out in under 2 minutes.
   - Includes `invoice-editor`, `client-store`, `invoice-store`, `pdf-exporter`.
   - Excludes advanced bookkeeping, multi-user roles, taxes beyond simple configurable fields unless required.

2. **Payment status dashboard with manual tracking**
   - Supports L4 metric: overdue payments noticed within 24 hours.
   - Includes `payment-tracker` and simple paid/unpaid/overdue states.
   - Keeps Stripe optional by making manual payment recording first-class.

3. **Overdue reminder prompts**
   - Supports L3 journey: notice overdue payment and send a simple reminder.
   - Includes `reminder-engine` and reminder templates.
   - Start with prompts/drafts before automated sending to preserve user control.

4. **Optional Stripe adapter**
   - Supports convenience without violating the “Stripe optional” constraint.
   - Must be disabled by default and isolated behind an integration boundary.

5. **Privacy/local-first hardening**
   - Supports privacy-first/local-first constraints.
   - Final storage/encryption/sync choices are **TBD** until platform and threat model are confirmed.

**Initial module breakdown:**

- `invoice-editor` — line items, totals, due dates, invoice preview
- `client-store` — local client records
- `invoice-store` — local persistence and invoice lifecycle state
- `pdf-exporter` — invoice rendering/export
- `payment-tracker` — status transitions and overdue calculation
- `reminder-engine` — overdue detection and reminder prompts
- `stripe-adapter` — optional payment event sync/payment links
- `settings/privacy-controls` — integration opt-in, local data settings

## Validation

Checked alignment across L4/L3/L2/L1 using only the details provided. Key caveats: platform, storage technology, email/send mechanism, encryption requirements, tax requirements, and whether “local-first” includes multi-device sync are all **TBD** and should not be invented yet.

## Next steps

1. Confirm or revise the drafted `TELOS.md`.
2. Decide the target platform: desktop, web, mobile, or CLI.
3. Decide how invoices are sent initially: PDF export, local email client, SMTP, or hosted email provider.
4. Only after confirmation, convert the MVP roadmap into engineering tickets.

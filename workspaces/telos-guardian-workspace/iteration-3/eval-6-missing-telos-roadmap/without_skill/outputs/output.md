Before jumping into a roadmap, I’d capture the project’s purpose in a lightweight `TELOS.md`. Since there isn’t one yet, here’s a draft based only on what you provided. Please confirm or correct this before we treat it as authoritative.

# TELOS — Freelancer Invoicing App

> A privacy-first, simple invoicing and payment-tracking app for solo freelancers who need to send invoices quickly and notice overdue payments without spending more than 10 minutes per week on admin.

## L4: Purpose

**Why this project exists:**
Solo freelancers need a lightweight way to invoice clients and track payment status without adopting a complex accounting system. The app should reduce billing friction, preserve privacy, and make overdue payments visible quickly.

**Primary beneficiary:**
- Solo freelancers managing their own client billing and payment follow-up.

**Problem:**
Freelancers lose time and attention creating invoices, tracking whether clients have paid, and noticing overdue payments.

**Success metrics:**
- A freelancer can send an invoice in under 2 minutes.
- Overdue payments are noticed within 24 hours.
- Weekly app usage stays under 10 minutes for normal invoicing/payment tracking.

**Constraints:**
- Privacy-first.
- Local-first if possible.
- Stripe is optional, not required.
- Must be simple enough for solo freelancers, not accounting teams.

## L3: Experience

**Key journeys:**

1. **Create and send invoice**
   - Freelancer opens the app.
   - Selects or enters a client.
   - Adds line items, due date, and payment instructions.
   - Reviews and sends/exports the invoice in under 2 minutes.

2. **Track payment status**
   - Freelancer sees all unpaid invoices in one place.
   - App highlights due and overdue invoices.
   - Freelancer records payment manually or imports/syncs status if an integration is enabled.

3. **Follow up on overdue payment**
   - App detects an overdue invoice within 24 hours.
   - Freelancer gets a clear reminder.
   - Freelancer sends a simple follow-up message.

**Experience principles:**
- Simple over comprehensive.
- Privacy-first over cloud convenience.
- Local-first where practical.
- Optional integrations over required third-party dependencies.
- Fast weekly workflow over full accounting feature depth.

## L2: Contract

**Major interfaces:**
- Invoice creation form.
- Client list/contact manager.
- Invoice status dashboard.
- Payment recording flow.
- Reminder/overdue notification surface.
- Export/send interface for invoices, likely PDF and/or email. **TBD:** exact delivery mechanism.

**Integrations:**
- Stripe payment links or payment status sync: optional.
- Email sending: TBD, could be local mail client, SMTP, or manual export.
- Local notifications: likely needed for overdue reminders.

**Data contracts:**

```ts
type Client = {
  id: string;
  name: string;
  email?: string;
  billingAddress?: string;
};

type Invoice = {
  id: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  totalAmount: number;
  currency: string;
  paymentInstructions?: string;
  stripePaymentLink?: string;
};

type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: string;
  source: 'manual' | 'stripe' | 'other';
};
```

**Open questions / TBD:**
- Web app, desktop app, mobile app, or CLI?
- Should data be stored only locally, or optionally synced across devices?
- Should invoices be sent directly by the app, exported as PDFs, or both?
- What jurisdictions/tax requirements are in scope, if any?

## L1: Function

**Initial modules:**
- `client-store`: create, update, and retrieve client records.
- `invoice-builder`: create invoices, calculate totals, validate required fields.
- `invoice-renderer`: generate printable/PDF invoice output.
- `payment-tracker`: record payments and update invoice status.
- `overdue-detector`: identify invoices past due within 24 hours.
- `reminder-service`: surface reminders or follow-up prompts.
- `storage-adapter`: local-first persistence. **TBD:** SQLite, IndexedDB, local files, or another store depending on platform.
- `stripe-adapter`: optional payment link/status integration, not required for core workflow.

**Testing strategy:**
- Unit tests for invoice totals, due-date calculations, overdue detection, and status transitions.
- Integration tests for local storage persistence.
- Integration tests for optional Stripe adapter if implemented.
- End-to-end tests for create invoice → send/export → mark paid → overdue reminder flow.

---

## Confirmation checkpoint

Please confirm whether this TELOS draft matches your intent, especially:

1. Should this be local-only, or local-first with optional sync?
2. Is invoice sending via email required for v1, or is PDF export enough?
3. Is Stripe only for payment links, or do you want payment-status reconciliation too?
4. Are taxes, recurring invoices, or multi-currency required in v1, or explicitly later?

Until confirmed, I’d treat the roadmap below as provisional.

---

# Provisional Feature Roadmap

## Phase 1 — Core local invoicing

Purpose trace: supports “invoices go out in under 2 minutes” and “simple enough under 10 minutes/week.”

Features:
- Create/edit clients.
- Create invoice from minimal form.
- Add line items, due date, currency, and payment instructions.
- Auto-generate invoice numbers.
- Render invoice preview.
- Export invoice as PDF. Email sending remains TBD unless confirmed.

Modules:
- `client-store`
- `invoice-builder`
- `invoice-renderer`
- `storage-adapter`

## Phase 2 — Payment tracking and overdue visibility

Purpose trace: supports “overdue payments noticed within 24 hours.”

Features:
- Invoice dashboard grouped by draft/sent/paid/overdue.
- Manual mark-as-paid flow.
- Due-date status calculation.
- Daily overdue check.
- Reminder prompts for follow-up.

Modules:
- `payment-tracker`
- `overdue-detector`
- `reminder-service`

## Phase 3 — Privacy-first storage hardening

Purpose trace: supports privacy-first and local-first constraints.

Features:
- Local persistence implementation.
- Backup/export of user data. **TBD:** format and destination.
- Import/restore.
- Clear explanation of where data lives.

Modules:
- `storage-adapter`
- `backup-exporter` — TBD if needed for v1.

## Phase 4 — Optional Stripe integration

Purpose trace: respects “Stripe optional but not required.” Core invoicing should work without it.

Features:
- Add Stripe payment link to invoice.
- Optional payment status reconciliation. **TBD:** only if desired.
- Keep manual payment tracking as the default fallback.

Modules:
- `stripe-adapter`
- `payment-tracker`

## Phase 5 — Workflow polish

Purpose trace: keeps usage under 10 minutes/week.

Features:
- Invoice templates/defaults.
- Reuse previous client details.
- Duplicate invoice.
- Simple follow-up message template.
- Keyboard shortcuts or quick actions if appropriate.

Modules:
- `invoice-builder`
- `reminder-service`
- `client-store`

---

# Recommended Initial Module Breakdown

```txt
src/
  clients/
    client-store
    client-schema
  invoices/
    invoice-builder
    invoice-calculator
    invoice-renderer
    invoice-status
  payments/
    payment-tracker
    stripe-adapter        # optional, later
  reminders/
    overdue-detector
    reminder-service
  storage/
    storage-adapter       # local-first; implementation TBD
    backup-exporter       # optional/later
  app/
    dashboard
    invoice-form
    client-form
    settings
```

I would start with Phase 1 and Phase 2 only, because they directly satisfy the core purpose: fast invoice creation and timely overdue awareness. Stripe, sync, tax handling, recurring invoices, and advanced accounting should remain out of the initial scope unless they are necessary for the confirmed v1 audience.
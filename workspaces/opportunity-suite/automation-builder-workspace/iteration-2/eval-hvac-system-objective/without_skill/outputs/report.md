# HVAC Missed-Call Recovery Tool Build Plan

## Objective

Build a lightweight internal tool for an HVAC business that turns a single
missed-call event into a reviewed follow-up action and an owner-facing status
output.

## Scope

- One input: a single missed-call event.
- One human step: operator review.
- One output: owner-facing status summary.

## Primary Workflow

1. Receive one missed-call event from the phone system or a webhook-compatible
   source.
2. Normalize the event into a standard record with caller number, timestamp,
   call source, and any available caller metadata.
3. Create a review item for the operator.
4. Operator reviews the event, confirms whether it is a valid lead/customer
   callback opportunity, and chooses an outcome.
5. System generates an owner-facing output summarizing what happened and what
   action was taken.

## Functional Spec

### Input

Expected event fields:

- `call_id`: unique call identifier.
- `caller_phone`: phone number of the missed caller.
- `call_time`: timestamp of the missed call.
- `line_name` or `service_area`: which business line received the call.
- `caller_name`: optional, if available from carrier or CRM lookup.
- `transcript` or voicemail summary: optional.

Validation rules:

- Reject events missing `call_id`, `caller_phone`, or `call_time`.
- De-duplicate by `call_id`.
- Mark records with invalid phone formatting for operator attention instead of
  failing the whole flow.

### Operator Review Step

Operator interface should show:

- Caller phone and name if known.
- Time of missed call.
- Related account or prior job history if a CRM lookup exists.
- Voicemail/transcript summary if available.
- Suggested priority based on business rules.

Operator actions:

- Mark as `callback_now`.
- Mark as `callback_later`.
- Mark as `not_a_lead`.
- Mark as `duplicate`.
- Add a short note.

Review SLA target:

- Present new items within 1 minute of event receipt.
- Track whether review happened within 5 minutes during business hours.

### Owner-Facing Output

Produce one concise summary per reviewed event, suitable for email, dashboard
card, or daily digest inclusion.

Output fields:

- Missed call time.
- Caller identity info.
- Operator decision.
- Operator note.
- Follow-up status.
- Revenue/urgency flag if inferable.

Example output:
`Missed call from (555) 123-4567 at 2:14 PM. Operator marked callback_now and noted: "No heat emergency, left voicemail requesting same-day service."`

## Recommended Architecture

- Ingestion layer: webhook endpoint or polling adapter for phone system.
- Processing layer: validates, normalizes, de-duplicates, and stores event.
- Review layer: simple queue UI for operator decisions.
- Output layer: formats owner-facing summary and sends/stores it.

## Data Model

### MissedCallEvent

- `call_id`
- `caller_phone`
- `caller_name`
- `call_time`
- `line_name`
- `service_area`
- `voicemail_summary`
- `status` (`new`, `in_review`, `reviewed`)

### ReviewDecision

- `call_id`
- `reviewed_by`
- `reviewed_at`
- `decision`
- `note`
- `priority`

### OwnerOutput

- `call_id`
- `generated_at`
- `summary_text`
- `delivery_channel`
- `delivery_status`

## Business Rules

- During business hours, default priority to high for first-time callers and any
  voicemail containing emergency terms like `no heat`, `no ac`, `leak`, or
  `urgent`.
- If the number matches an existing customer with open work, show that context
  in operator review.
- If duplicate missed calls arrive from the same number within a short window,
  group them under the same review item where possible.

## Non-Functional Requirements

- Fast enough for near-real-time review.
- Simple audit trail for operator decisions.
- Basic reliability with retry on failed output delivery.
- Minimal training required for office staff.

## Metrics

- Missed calls received.
- Review completion time.
- Callback-now rate.
- Invalid/duplicate rate.
- Owner summary delivery success rate.

## Build Phases

1. Define event contract and sample payloads.
2. Implement event intake, validation, and persistence.
3. Build the operator review queue and decision form.
4. Generate owner-facing summary output.
5. Add metrics, logging, and error handling.
6. Pilot with real missed-call traffic and tune rules.

## Risks And Mitigations

- Incomplete call data: allow optional metadata and keep operator override
  simple.
- Duplicate events from telephony provider: enforce `call_id` de-duplication and
  short-window phone matching.
- Slow staff response: add SLA tracking and visible aging indicators.
- Low-quality voicemail/transcript data: treat automated urgency detection as
  advisory only.

## Acceptance Criteria

- A valid missed-call event creates one review item.
- An operator can review and classify the item in one step.
- Completing review generates one owner-facing summary.
- Duplicate `call_id` events do not create extra review items.
- The system records timestamps for intake, review, and output generation.

## Suggested MVP

Start with webhook intake, one internal review screen, SQLite or Postgres
storage, and owner delivery via email or dashboard feed. Defer CRM enrichment
and advanced urgency scoring until after the first live pilot.

# HVAC Missed-Call Recovery Tool Build Plan

## Goal

Build a simple internal workflow that helps an HVAC business recover missed
inbound calls.

The workflow must have:

1. One input
2. One operator review step
3. One output to the owner

## Scope Summary

When the business misses a customer call, the tool should capture the event,
prepare a short recovery case for a human operator, let the operator review and
classify it, and then send a concise owner-facing summary of what happened and
what follow-up is needed.

## Workflow Shape

### Input

Single input: `missed_call_event`

Recommended fields:

- `call_id`
- `timestamp`
- `caller_phone`
- `caller_name` if available
- `call_duration_seconds`
- `line_or_location`
- `voicemail_present` true/false
- `voicemail_text` if transcription exists

Source options:

- Phone system webhook
- Call-tracking platform webhook
- Manual entry form if automation is not yet available

## Main Flow

1. Receive `missed_call_event`.
2. Validate required fields and normalize phone number and timestamp.
3. Create a recovery case.
4. Present the case to an operator for review.
5. Operator reviews the case and chooses the next action.
6. Send one owner-facing output summarizing the missed call and operator
   decision.

## Operator Review Step

This is the only human-in-the-loop step.

### Operator sees

- Caller phone
- Caller name if known
- Time of missed call
- Voicemail transcript if present
- Suggested urgency
- Prior customer match if available

### Operator actions

Operator selects one status:

- `urgent_service`
- `quote_or_install`
- `callback_required`
- `spam_or_wrong_number`
- `insufficient_info`

Operator also enters:

- `review_notes`
- `callback_priority` as `high`, `normal`, or `low`
- `follow_up_owner_needed` true/false

### Review rules

- If voicemail mentions no cooling, no heat, leak, outage, elderly resident, or
  same-day need, default suggested urgency to high.
- If no voicemail and no caller history exist, default to `callback_required`
  unless operator marks spam.
- If operator marks spam, owner output should still log the event but clearly
  mark it as filtered.

## Output To Owner

Single output: `owner_summary_message`

Recommended delivery:

- Email preferred for audit trail
- SMS optional later, but not required in initial build

### Output contents

- Missed call time
- Caller identity details available
- Operator classification
- Callback priority
- Short operator notes
- Whether owner action is needed

### Example output

```text
Missed call recovery summary
Time: 2026-03-29 09:42 local
Caller: Jane Doe, (555) 123-4567
Classification: urgent_service
Priority: high
Notes: Voicemail says AC stopped working and home is 84F.
Owner action needed: yes
```

## Data Model

### Core entities

#### MissedCallEvent

- `call_id`
- `timestamp`
- `caller_phone`
- `caller_name`
- `voicemail_present`
- `voicemail_text`
- `raw_payload`

#### RecoveryCase

- `case_id`
- `call_id`
- `normalized_phone`
- `suggested_urgency`
- `customer_match`
- `status`
- `created_at`
- `reviewed_at`

#### OperatorReview

- `case_id`
- `operator_id`
- `classification`
- `callback_priority`
- `review_notes`
- `follow_up_owner_needed`

#### OwnerSummary

- `case_id`
- `delivery_channel`
- `message_body`
- `sent_at`
- `delivery_status`

## Functional Requirements

- Accept one missed-call input event at a time.
- Prevent duplicate case creation for the same `call_id`.
- Keep operator review limited to one explicit step.
- Produce exactly one owner-facing summary per reviewed case.
- Store timestamps for intake, review, and output delivery.
- Preserve raw source data for troubleshooting.

## Non-Functional Requirements

- Human-readable operator screen with minimal fields.
- Fast review path, target under 60 seconds per case.
- Clear audit trail of source event, review decision, and owner output.
- Basic reliability with retry handling for outbound email.
- PII-aware storage and access control for phone numbers and transcripts.

## Suggested Build Phases

### Phase 1: Core workflow

- Ingest missed call event
- Validate and normalize data
- Create recovery case
- Build operator review form or queue view
- Send owner summary email after review

### Phase 2: Quality improvements

- Add duplicate detection
- Add voicemail keyword-based urgency suggestion
- Add customer lookup from CRM or call history
- Add delivery status tracking

### Phase 3: Reporting

- Count missed calls by day
- Count reviewed versus unreviewed cases
- Track urgent cases
- Track response lag from missed call to operator review

## Recommended MVP Decisions

- Use email as the only owner output in v1.
- Use a simple operator queue rather than complex routing.
- Keep urgency suggestions rule-based instead of AI-based in v1.
- Require operator classification before sending owner output.

## Acceptance Criteria

- A valid missed-call event creates one reviewable case.
- An operator can review the case in one step and submit a decision.
- Submission triggers one owner summary message.
- Duplicate input for the same `call_id` does not create another active case.
- Audit data is stored for input, review, and output.

## Risks And Mitigations

- Missing caller context: mitigate with optional CRM lookup.
- Low operator adoption: mitigate with short review form and required fields
  only.
- Noisy spam calls: mitigate with spam classification and duplicate suppression.
- Delivery failures: mitigate with retry and visible delivery status.

## Build Recommendation

Start with a narrow MVP:

- One inbound missed-call payload
- One operator review form
- One owner email output

This keeps the workflow aligned to the requirement while leaving room for later
CRM enrichment, SMS alerts, and analytics.

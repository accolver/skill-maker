# HVAC Missed-Call Recovery Tool Build Plan

## System Objective

- Primary user: HVAC business owner
- Primary trigger: A missed inbound call from a prospective or existing customer
- Primary output: A concise owner-facing follow-up summary with the recommended
  next action
- Human escalation point: Internal operator reviews the drafted recovery message
  and customer details before anything is sent to the owner

This wedge is a lightweight missed-call recovery workflow for a small HVAC
business. The goal is to capture one missed-call event, let an operator validate
the situation, and deliver one clean output to the owner so they can decide on
follow-up without needing a full call-center platform.

## Architecture

Minimal pattern used: `trigger -> queue -> worker -> review -> delivery`

### Components

- Missed-call intake endpoint: Receives one normalized missed-call payload from
  the phone system or call-tracking provider
- Workflow worker: Validates the payload, creates a recovery case, and drafts
  the owner summary
- Operator review screen: Internal page showing caller details, call timing,
  prior customer match if available, and editable summary text
- Delivery service: Sends the approved summary to the owner by SMS or email
- Lightweight datastore: Stores recovery cases, review status, audit timestamps,
  and delivery status

### Data Inputs

- One input event containing caller phone number, timestamp, line or location,
  and optional voicemail or caller name if available

### Outputs

- One owner-facing message containing caller identity if known, call time,
  whether the caller appears new or existing, operator notes, and a recommended
  next step

### Storage

- `recovery_cases`: one row per missed call
- `review_actions`: operator edits, approval timestamp, reviewer identity
- `delivery_log`: message channel, send status, failure reason if any

### Integrations

- Telephony or call-tracking provider webhook for missed calls
- Internal auth for operator access
- SMS or email provider for owner delivery
- Optional CRM lookup only if customer matching already exists; otherwise keep
  matching manual

## Human Loop

### What stays manual

- Determining whether the missed call is urgent, spam, duplicate, or routine
- Editing the owner summary when the raw data is incomplete or ambiguous
- Deciding whether to suppress delivery for obvious spam or bad leads

### What is reviewed by a human

- Caller identity and business relevance
- Drafted owner summary text
- Recommended next action before final delivery

### What is safe to automate now

- Intake of the missed-call event
- Case creation and deduplication within a short time window
- Drafting a default owner summary from known fields
- Sending the owner notification after operator approval

Human review is appropriate because false positives are costly, urgency judgment
matters, and the workflow is still being learned.

## Milestones

1. Define the missed-call payload and owner message format
2. Build intake endpoint, datastore schema, and case creation worker
3. Build the operator review screen with approve, edit, and suppress actions
4. Add owner delivery via one channel first, preferably SMS
5. Add audit logging, retry handling, and basic reporting on reviewed versus
   sent cases

## Out Of Scope

- Automated customer outreach or auto-reply to the caller
- Multi-branch routing logic beyond a single business owner recipient
- Full CRM sync, lead scoring, or scheduling automation
- AI voice handling, transcription pipelines, or after-hours virtual
  receptionist flows
- Mobile app development

## Structured Build Plan

```json
{
  "system_objective": {
    "primary_user": "HVAC business owner",
    "trigger": "A missed inbound call from a prospective or existing customer",
    "output": "A concise owner-facing follow-up summary with the recommended next action",
    "human_escalation": "Internal operator reviews the drafted recovery message and customer details before anything is sent to the owner"
  },
  "components": [
    "Missed-call intake endpoint",
    "Workflow worker",
    "Operator review screen",
    "Delivery service",
    "Lightweight datastore"
  ],
  "inputs": [
    "One missed-call event containing caller phone number, timestamp, line or location, and optional voicemail or caller name if available"
  ],
  "outputs": [
    "One owner-facing message containing caller identity if known, call time, whether the caller appears new or existing, operator notes, and a recommended next step"
  ],
  "integrations": [
    "Telephony or call-tracking provider webhook",
    "Internal auth for operator access",
    "SMS or email provider for owner delivery",
    "Optional CRM lookup if already available"
  ],
  "manual_steps": [
    "Determine whether the missed call is urgent, spam, duplicate, or routine",
    "Edit the owner summary when the raw data is incomplete or ambiguous",
    "Suppress delivery for obvious spam or bad leads"
  ],
  "automated_steps": [
    "Receive the missed-call event",
    "Create and deduplicate a recovery case",
    "Draft a default owner summary from known fields",
    "Send the owner notification after operator approval"
  ],
  "milestones": [
    "Define the missed-call payload and owner message format",
    "Build intake endpoint, datastore schema, and case creation worker",
    "Build the operator review screen with approve, edit, and suppress actions",
    "Add owner delivery via one channel first, preferably SMS",
    "Add audit logging, retry handling, and basic reporting on reviewed versus sent cases"
  ],
  "out_of_scope": [
    "Automated customer outreach or auto-reply to the caller",
    "Multi-branch routing logic beyond a single business owner recipient",
    "Full CRM sync, lead scoring, or scheduling automation",
    "AI voice handling, transcription pipelines, or after-hours virtual receptionist flows",
    "Mobile app development"
  ]
}
```

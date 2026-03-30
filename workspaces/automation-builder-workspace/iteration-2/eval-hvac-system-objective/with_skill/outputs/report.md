# HVAC Missed-Call Recovery Tool Build Plan

## System Objective

- Primary user: HVAC office operator
- Primary trigger: A single missed-call event from the phone system
- Primary output: An owner-facing recovery summary showing which missed calls
  need follow-up and what action was taken
- Human escalation point: Operator review before any recovery action is
  finalized or sent to the owner

This system is a small internal workflow for recovering revenue from missed
inbound calls. It starts from one call event input, routes that event into a
simple review queue, lets an operator confirm the right follow-up action, and
produces a clear owner-facing output.

## Architecture

Minimal pattern: trigger -> queue -> worker -> review -> delivery.

Components:

- Call event webhook receiver: accepts one missed-call event payload from the
  phone provider
- Review queue store: keeps each missed call in a pending state until reviewed
- Operator review screen: shows caller details, call time, and suggested
  recovery action
- Recovery worker: creates the owner-facing record after operator approval
- Owner report delivery: sends or posts the final recovery summary to the
  business owner

Data inputs:

- One missed-call event containing caller number, timestamp, call direction, and
  location or line identifier if available

Outputs:

- Owner-facing recovery summary for each reviewed missed call
- Internal status markers such as pending review, approved for follow-up,
  duplicate, or ignore

Storage:

- One small database table or document collection for missed-call records and
  review status

Integrations:

- Phone system or call-tracking provider webhook
- Email or SMS delivery service for the owner-facing output

## Human Loop

What stays manual:

- Operator decides whether the missed call is worth recovery
- Operator confirms or edits the suggested action before completion

What is reviewed by a human:

- Caller identity confidence
- Whether the call is a duplicate, spam, after-hours emergency, or valid lead
- Final recovery note before it is surfaced to the owner

What is safe to automate now:

- Ingesting the missed-call event
- Creating a pending review record
- Routing the item into the operator queue
- Generating the owner-facing summary after operator approval

Escalation reason:

- False positives are costly because spam or duplicate calls could create noisy
  owner reports and wasted follow-up time

## Milestones

1. Accept a missed-call webhook and persist a pending review record.
2. Build a simple operator review screen with approve, ignore, and duplicate
   actions.
3. Generate and deliver the owner-facing recovery summary after review.
4. Add basic audit history and delivery status tracking.

## Out Of Scope

- Fully automated callback or texting without human review
- CRM sync beyond a simple owner-facing output
- Lead scoring models or routing logic across multiple teams
- Multi-location permissions, billing, or analytics dashboards
- Historical reporting beyond the current recovery queue and delivered summaries

## Structured Build Plan

```json
{
  "system_objective": {
    "primary_user": "HVAC office operator",
    "trigger": "A single missed-call event from the phone system",
    "output": "An owner-facing recovery summary showing which missed calls need follow-up and what action was taken",
    "human_escalation": "Operator review before any recovery action is finalized or sent to the owner"
  },
  "components": [
    "Call event webhook receiver",
    "Review queue store",
    "Operator review screen",
    "Recovery worker",
    "Owner report delivery"
  ],
  "inputs": [
    "One missed-call event containing caller number, timestamp, call direction, and location or line identifier if available"
  ],
  "outputs": [
    "Owner-facing recovery summary for each reviewed missed call",
    "Internal status markers such as pending review, approved for follow-up, duplicate, or ignore"
  ],
  "integrations": [
    "Phone system or call-tracking provider webhook",
    "Email or SMS delivery service for the owner-facing output"
  ],
  "manual_steps": [
    "Operator reviews each missed-call record before any external output is finalized",
    "Operator marks the call as recoverable, duplicate, spam, or ignore",
    "Operator confirms or edits the recovery note"
  ],
  "automated_steps": [
    "Receive the missed-call event",
    "Create a pending review record",
    "Place the record into the operator queue",
    "Generate and deliver the owner-facing summary after approval"
  ],
  "milestones": [
    "Accept a missed-call webhook and persist a pending review record",
    "Build a simple operator review screen with approve, ignore, and duplicate actions",
    "Generate and deliver the owner-facing recovery summary after review",
    "Add basic audit history and delivery status tracking"
  ],
  "out_of_scope": [
    "Fully automated callback or texting without human review",
    "CRM sync beyond a simple owner-facing output",
    "Lead scoring models or routing logic across multiple teams",
    "Multi-location permissions, billing, or analytics dashboards",
    "Historical reporting beyond the current recovery queue and delivered summaries"
  ]
}
```

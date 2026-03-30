# Build Plan: Internal Compliance Evidence Concierge

## System Objective

- Primary user: Internal compliance operations analyst
- Primary trigger: A new client evidence request or scheduled compliance review
  is submitted by an internal operator
- Primary output: A reviewed evidence package ready for client delivery
- Human escalation point: Any missing, conflicting, stale, or ambiguous evidence
  is routed to a human reviewer before release

## Architecture

Minimal system pattern: concierge workflow with internal admin panel using
`trigger -> queue -> worker -> review -> delivery`.

### Components

- Intake form or internal ticket action to create an evidence collection request
- Request store to track request metadata, status, assignees, due dates, and
  evidence artifacts
- Evidence worker that gathers known documents and metadata from approved
  internal systems
- Internal review dashboard for compliance staff to inspect, approve, reject, or
  request fixes
- Delivery step that packages approved evidence and marks it ready for client
  send

### Data Inputs

- Client name and request identifier
- Requested control set or evidence checklist
- Due date, priority, and delivery destination
- Internal source references such as policy repository links, ticket IDs, cloud
  screenshots, audit exports, or prior evidence artifacts

### Outputs

- Evidence package with attached files and a simple checklist status
- Review notes capturing gaps, substitutions, and approval history
- Delivery-ready status with timestamp and reviewer identity

### Storage

- Single relational database table set for requests, artifacts, review
  decisions, and audit events
- Object storage bucket or approved document repository folder for uploaded and
  collected evidence files

### Integrations

- Internal ticketing or request intake system
- Approved document repository or cloud drive
- Optional identity or cloud admin systems for pulling metadata exports
- Internal email or messaging notification for review handoff

## Human Loop

### What stays manual

- Deciding whether substituted evidence is acceptable
- Validating that evidence satisfies the exact client or framework wording
- Final approval before anything is sent externally
- Handling exceptions such as missing documents, policy gaps, or unclear control
  ownership

### What is reviewed by a human

- Every compiled evidence package before delivery
- Any automated evidence match with low confidence or stale timestamps
- Any request that includes regulated, client-specific, or judgment-heavy
  evidence requirements

### What is safe to automate now

- Creating a request record from intake
- Pulling predefined evidence artifacts from approved source locations
- Marking checklist items as found, missing, or needing review
- Notifying reviewers when a package is ready
- Packaging approved artifacts into a delivery bundle

## Milestones

1. Define request schema, evidence states, and review statuses
2. Build intake flow and request tracking store
3. Implement evidence worker for a small fixed set of source systems
4. Build reviewer dashboard with approve, reject, and comment actions
5. Add delivery packaging, audit trail, and notifications
6. Pilot with a narrow compliance evidence set and refine manual review rules

## Out Of Scope

- Fully automated client delivery without human approval
- Broad framework intelligence or dynamic control mapping across many standards
- OCR, document classification, or advanced AI extraction for arbitrary files
- External client portal, self-serve uploads, or multi-tenant productization
- Long-term evidence warehouse or generalized GRC platform capabilities

## Structured Build Plan

```json
{
  "system_objective": {
    "primary_user": "Internal compliance operations analyst",
    "trigger": "A new client evidence request or scheduled compliance review is submitted by an internal operator",
    "output": "A reviewed evidence package ready for client delivery",
    "human_escalation": "Any missing, conflicting, stale, or ambiguous evidence is routed to a human reviewer before release"
  },
  "components": [
    "Intake form or internal ticket action",
    "Request store for request metadata, statuses, and artifacts",
    "Evidence worker for collecting predefined evidence",
    "Internal review dashboard",
    "Delivery packaging step"
  ],
  "inputs": [
    "Client name and request identifier",
    "Requested control set or evidence checklist",
    "Due date and priority",
    "Internal source references such as policy links, ticket IDs, audit exports, or prior evidence artifacts"
  ],
  "outputs": [
    "Reviewed evidence package",
    "Review notes and approval history",
    "Delivery-ready status with timestamp and reviewer identity"
  ],
  "integrations": [
    "Internal ticketing or request intake system",
    "Approved document repository or cloud drive",
    "Optional identity or cloud admin systems for metadata exports",
    "Internal email or messaging notifications"
  ],
  "manual_steps": [
    "Validate evidence adequacy against client or framework requirements",
    "Review substitutions, stale artifacts, and exceptions",
    "Approve final package before external delivery"
  ],
  "automated_steps": [
    "Create request record from intake",
    "Collect predefined evidence artifacts from approved sources",
    "Mark checklist items as found, missing, or needing review",
    "Notify reviewer when package is ready",
    "Package approved artifacts for delivery"
  ],
  "milestones": [
    "Define request schema, evidence states, and review statuses",
    "Build intake flow and request tracking store",
    "Implement evidence worker for a small fixed set of source systems",
    "Build reviewer dashboard with approve, reject, and comment actions",
    "Add delivery packaging, audit trail, and notifications",
    "Pilot with a narrow compliance evidence set and refine manual review rules"
  ],
  "out_of_scope": [
    "Fully automated client delivery without human approval",
    "Broad framework intelligence or dynamic control mapping across many standards",
    "OCR, document classification, or advanced AI extraction for arbitrary files",
    "External client portal, self-serve uploads, or multi-tenant productization",
    "Long-term evidence warehouse or generalized GRC platform capabilities"
  ]
}
```

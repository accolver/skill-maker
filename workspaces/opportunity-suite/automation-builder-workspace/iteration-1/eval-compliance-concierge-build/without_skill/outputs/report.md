# Build Plan: Internal Concierge Workflow for Compliance Evidence Collection

## Objective

Design an internal workflow that gathers compliance evidence from internal
systems and staff, routes all collected material through human review, and only
then releases an approved package for client delivery.

## Scope

- Collect evidence against a defined compliance request or control set.
- Track evidence provenance, status, and review history.
- Support internal-only collaboration during drafting and review.
- Prevent direct client delivery before explicit human approval.

## Primary Users

- Compliance analyst: opens requests, tracks status, compiles evidence.
- Evidence contributor: uploads files, answers questionnaires, provides links.
- Reviewer/approver: validates completeness, sensitivity, and client readiness.
- Client delivery owner: sends the approved package to the client.

## Workflow Summary

1. Intake a compliance evidence request.
2. Translate the request into required evidence items.
3. Assign evidence collection tasks to internal owners.
4. Ingest uploads, links, and notes into a controlled workspace.
5. Run automated checks for completeness, freshness, duplicates, and missing
   metadata.
6. Assemble a draft evidence package.
7. Route the package to human review.
8. Capture reviewer decisions: approve, request changes, reject, or redact.
9. Lock the approved package and create an audit trail.
10. Hand off the approved package for client delivery.

## Core Requirements

### Functional

- Create a request record with client, framework, deadline, owner, and requested
  controls.
- Model evidence items individually with fields for control mapping, source,
  owner, due date, version, and review status.
- Accept multiple evidence types: file upload, system export, URL reference,
  free-text response, and questionnaire answer.
- Maintain version history for each evidence item.
- Generate a draft package view showing completeness by control.
- Require at least one human reviewer approval before delivery.
- Block client delivery unless package status is `approved_for_delivery`.
- Support reviewer comments, redaction notes, and requested revisions.
- Produce an exportable package manifest and audit log.

### Non-Functional

- Strong access controls separating contributors, reviewers, and delivery
  owners.
- Full auditability of who uploaded, changed, reviewed, approved, and delivered
  each item.
- Secure storage for sensitive evidence and metadata.
- Clear status transitions and low operational ambiguity.
- Ability to scale from small ad hoc requests to repeated evidence programs.

## Suggested Data Model

### Entities

- `ComplianceRequest`: request metadata, client, scope, due dates, overall
  state.
- `ControlRequirement`: requested control or evidence requirement tied to a
  request.
- `EvidenceItem`: submitted artifact with metadata, version, owner, and source.
- `ReviewDecision`: reviewer action, comments, redaction guidance, timestamp.
- `DeliveryPackage`: approved snapshot of evidence items and manifest.
- `AuditEvent`: immutable event log for all key actions.

### Key Fields

- Request: `id`, `client_name`, `framework`, `requested_controls`, `priority`,
  `due_date`, `owner`, `status`
- Evidence: `id`, `request_id`, `control_id`, `title`, `description`,
  `source_type`, `storage_uri`, `submitted_by`, `submitted_at`, `version`,
  `freshness_date`, `status`, `contains_sensitive_data`
- Review: `id`, `evidence_item_id` or `package_id`, `reviewer`, `decision`,
  `comments`, `redactions_required`, `reviewed_at`
- Delivery package: `id`, `request_id`, `approved_by`, `approved_at`,
  `manifest_uri`, `delivery_status`, `delivered_at`

## State Machine

### Request Status

- `intake`
- `collecting_evidence`
- `draft_ready`
- `in_review`
- `changes_requested`
- `approved_for_delivery`
- `delivered`
- `closed`

### Evidence Status

- `requested`
- `submitted`
- `needs_revision`
- `reviewed`
- `approved`
- `rejected`
- `redacted`

## Human Review Gate

- Human review is mandatory before any client-facing action.
- Approval must be explicit, attributable, and timestamped.
- Review checklist should include:
- completeness against requested controls
- evidence freshness and validity period
- sensitivity and redaction needs
- naming and readability for client consumption
- removal of internal-only notes or irrelevant material
- Delivery action must enforce an approval check at the system level, not only
  through process guidance.

## Automation Components

### Intake and Orchestration

- Request form or ticket ingestion.
- Template generation based on framework/control set.
- Task assignment to evidence owners.

### Evidence Collection

- Upload portal and structured questionnaire.
- Connectors for common internal sources where applicable.
- Reminder and escalation automation for overdue evidence.

### Validation

- Check for missing required fields.
- Flag stale evidence based on age thresholds.
- Detect duplicate uploads or mismatched control mapping.
- Ensure each required control has at least one candidate artifact or explicit
  exception.

### Review and Approval

- Review queue for draft packages.
- Side-by-side view of controls, evidence, and reviewer notes.
- Approval/reject/redaction actions with required comments for non-approval
  decisions.

### Delivery Preparation

- Create immutable approved package snapshot.
- Generate manifest containing included files, versions, and approvals.
- Hand off to delivery owner or client-facing channel after approval.

## Integrations

- Ticketing/work management: Jira, Linear, or service desk.
- Document storage: shared drive, object storage, or DMS.
- Identity and access: SSO and role-based access control.
- Notifications: email, Slack, Teams.
- Optional compliance system of record for control mapping.

## Security and Compliance Controls

- Encryption at rest and in transit.
- Least-privilege access by role and request scope.
- Immutable audit events for approvals and delivery.
- Retention policy by client and framework requirements.
- Redaction workflow for sensitive or excess material.
- Separation between internal draft workspace and client-ready package.

## MVP Build Phases

### Phase 1: Foundations

- Define request, evidence, review, and package data model.
- Build request intake form and internal dashboard.
- Implement file/link submission and metadata capture.
- Add status tracking and audit logging.

### Phase 2: Review Gate

- Add draft package assembly.
- Build reviewer queue and decision capture.
- Enforce approval before delivery.
- Generate package manifest and downloadable approved bundle.

### Phase 3: Operational Automation

- Add reminders, SLA tracking, and escalation.
- Add evidence freshness checks and duplicate detection.
- Add control templates per framework.

### Phase 4: Integrations and Hardening

- Integrate storage, identity, and ticketing systems.
- Add role policies, retention controls, and reporting.
- Add dashboards for turnaround time, review load, and delivery readiness.

## Acceptance Criteria

- A request can be created and broken into evidence requirements.
- Contributors can submit evidence with metadata and versioning.
- The system shows completeness status across all requested controls.
- A draft package can be reviewed internally with comments and revision loops.
- The system blocks delivery until an approver marks the package approved.
- The approved package is snapshotted with a manifest and audit trail.
- Delivery status is recorded after client handoff.

## Risks and Mitigations

- Risk: reviewers bypass the system using email.
- Mitigation: make client delivery available only from approved package
  workflow.
- Risk: stale or wrong evidence is reused.
- Mitigation: freshness rules, owner attestation, and version history.
- Risk: sensitive internal notes leak to clients.
- Mitigation: separate internal workspace from client package and require review
  checklist.
- Risk: collection stalls across many owners.
- Mitigation: assignment, reminders, escalation, and dashboard visibility.

## Recommended First Implementation

- Start with a web app or internal workflow tool that stores request metadata,
  evidence records, and approvals in a relational database.
- Use object storage for evidence artifacts.
- Keep package generation simple: manifest plus approved file set.
- Prioritize auditability and approval enforcement before advanced integrations.

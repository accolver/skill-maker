# Build Spec: Compliance Evidence Workflow v1

## Executive Summary

Build a v1 compliance evidence workflow focused on getting evidence from
internal teams into a reviewable system, packaging it for clients, and showing
operational risk. The stakeholder requested five major areas: client portal,
automated client delivery, predictive risk scoring, CRM sync, and analytics
dashboards. To keep v1 realistic, the plan should ship all five in a constrained
form with strong workflow coverage rather than broad customization.

## Product Goal

Reduce manual effort and turnaround time for compliance evidence collection and
client reporting by centralizing evidence, automating delivery, and surfacing
risk signals early enough for account teams to act.

## Primary Users

- Compliance operations team
- Account and client success managers
- Client-side reviewers and auditors
- Revenue operations / CRM owners
- Leadership consuming delivery and risk analytics

## v1 Scope Decision

v1 should include all requested themes, but with tight boundaries:

- Client portal: read-only portal for clients to access delivered evidence
  packages, request status, and recent documents
- Automated client delivery: rules-based packaging and scheduled/single-click
  delivery of approved evidence sets
- Predictive risk scoring: heuristic risk scoring labeled as predictive, using
  observable delivery and evidence signals rather than advanced ML
- CRM sync: one-way and limited two-way sync for account, renewal, delivery
  status, and risk summary fields
- Analytics dashboards: operational dashboards for delivery throughput, evidence
  freshness, portal usage, and account risk

## Non-Goals for v1

- Fully configurable workflow engine
- Custom client-branded portals per account
- Complex document redaction or transformation pipelines
- True machine learning model training infrastructure
- Deep bidirectional CRM object sync across all entities
- Arbitrary BI builder for end users

## Core User Outcomes

- Internal teams can collect, approve, and organize evidence by client and
  control area
- Clients can securely view delivered evidence packages without back-and-forth
  email chains
- Delivery can be triggered automatically when an evidence package reaches an
  approved state
- Teams can see which accounts are most likely to miss compliance delivery
  expectations
- CRM reflects enough compliance status to support renewals and account
  management
- Leadership can monitor operational performance and risk trends

## End-to-End Workflow

1. Internal user creates or updates an evidence item tied to a client and
   compliance requirement.
2. Reviewer approves the evidence item for external use.
3. System groups approved evidence into a delivery package by client and
   request.
4. Delivery rule triggers package publication to the client portal and optional
   email notification.
5. Client accesses the portal, views package contents, and downloads documents.
6. System records access and download events.
7. Risk engine updates account risk score based on evidence freshness, approval
   gaps, SLA misses, and client engagement patterns.
8. CRM sync publishes key status and risk summary back to account records.
9. Dashboards display pipeline, delivery, and risk metrics.

## Functional Requirements

### 1. Evidence Management

- Store evidence items with metadata: client, control category, owner, status,
  approval state, effective date, expiration date, source, sensitivity
- Support document upload and link-based evidence references
- Support internal statuses: draft, in review, approved, expired, archived
- Maintain version history and audit trail for status changes
- Allow evidence to be grouped into client delivery packages

### 2. Client Portal

- Secure client login with account-scoped access
- Read-only view of assigned delivery packages
- Package detail view with document list, metadata, publish date, and download
  actions
- Basic request status page showing pending, delivered, and overdue items
- Email invitation and password reset flows
- Event logging for login, view, and download actions

### 3. Automated Client Delivery

- Support manual trigger and rules-based automatic trigger
- Delivery rule examples: when all required evidence items are approved; on
  renewal milestone; on scheduled cadence
- Generate a package snapshot at delivery time so clients see a stable delivered
  set
- Notify client users by email when a new package is available
- Retry failed notifications and log failures

### 4. Predictive Risk Scoring

- Account-level risk score from 0-100
- Initial scoring inputs:
- evidence expiration within threshold
- count of overdue evidence requests
- approval cycle time trend
- missed delivery SLA
- low client portal engagement after delivery
- repeated package revision rate
- Show score, band, and top contributing factors
- Recompute on schedule and on major workflow events

### 5. CRM Sync

- Sync account identifiers from CRM into the workflow system
- Publish back summary fields per account:
- current compliance delivery status
- latest delivery date
- next expected delivery date
- current risk score and risk band
- open overdue evidence count
- Log sync failures with retry handling
- Start with one CRM integration target in v1

### 6. Analytics Dashboards

- Operations dashboard: evidence aging, approval bottlenecks, package
  throughput, on-time delivery rate
- Customer dashboard: portal logins, downloads, package views by client
- Risk dashboard: accounts by risk band, score movement, top drivers
- Executive snapshot: delivery SLA attainment, expiring evidence, high-risk
  renewals
- Export dashboard data as CSV

## Suggested v1 Architecture

### Application Layers

- Web app for internal users
- Web portal for clients
- Backend API for workflow, package management, auth, and reporting
- Background job workers for delivery, scoring, and sync
- Relational database for workflow state and audit history
- Object storage for evidence documents and package artifacts

### Major Services / Modules

- Evidence service
- Package and delivery service
- Client portal access service
- Risk scoring service
- CRM integration service
- Analytics aggregation layer
- Audit/event logging service

## Data Model Outline

Key entities:

- Client account
- Internal user
- Client user
- Compliance requirement/control
- Evidence item
- Evidence version
- Review decision
- Delivery package
- Delivery event
- Portal access event
- Risk score snapshot
- CRM sync job

## Security and Compliance Requirements

- Role-based access for internal and client users
- Strict tenant/account scoping for portal access
- Audit logging for document access and workflow changes
- Encryption at rest and in transit
- Signed download URLs with expiration
- Configurable retention policy for evidence and access logs

## Integration Requirements

- CRM: choose one target system for v1, likely Salesforce or HubSpot based on
  existing stack
- Email service for invites and notifications
- Object storage for secure document hosting
- Optional identity provider integration deferred unless already required by
  customers

## Delivery Strategy

### Phase 1: Foundation

- Evidence data model
- Upload/reference handling
- Approval workflow
- Audit logging
- Basic internal account and requirement views

### Phase 2: Client Delivery

- Delivery package creation
- Manual publish flow
- Client portal authentication and package viewing
- Notification emails

### Phase 3: Automation and Integrations

- Rules-based delivery triggers
- CRM account sync and summary writeback
- Scheduled jobs and retry framework

### Phase 4: Risk and Analytics

- Heuristic risk engine
- Account risk explanations
- Operational and executive dashboards

## MVP Acceptance Criteria

- Internal user can create, review, approve, and package evidence for a client
- Approved package can be delivered to the client portal and accessed by invited
  client users
- Automatic delivery can trigger from at least one rule type
- Every client account receives a visible risk score with factor breakdown
- CRM account record receives delivery status and risk summary updates
- Dashboards show live metrics for operations, client engagement, and risk

## Key Risks

- Stakeholder expectation of “predictive” may imply ML; v1 should explicitly
  position this as rules/heuristics-based risk scoring
- CRM data mapping can expand quickly; constrain to a small field set and one
  integration target
- Portal permissions are security-sensitive; account scoping must be designed
  early
- Analytics can become a large parallel product; keep to curated dashboards only

## Recommended Cutdown Choices

- One compliance workflow template in v1
- One CRM integration in v1
- One client portal experience with no account-specific customization
- Heuristic scoring only, no model training pipeline
- Curated dashboards, not self-serve reporting

## Open Questions

- Which CRM is authoritative for account data?
- Are clients expected to upload information back into the portal, or is portal
  access read-only in v1?
- What compliance frameworks and evidence categories must be supported at
  launch?
- What is the required authentication standard for clients: local auth, SSO, or
  both?
- Are delivery packages tied to renewal cycles, ad hoc requests, or both?

## Recommended Build Plan Summary

Build a workflow-centric v1 that makes evidence collection and approval the
system of record, delivers approved packages through a secure read-only client
portal, automates delivery from a small rules engine, computes explainable
heuristic risk scores, syncs a narrow account summary to a single CRM, and
exposes a fixed set of operational dashboards. This approach satisfies the
stakeholder asks while keeping implementation complexity within a credible first
release.

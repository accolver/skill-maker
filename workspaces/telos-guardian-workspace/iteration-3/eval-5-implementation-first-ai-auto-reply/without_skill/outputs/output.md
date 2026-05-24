# TrustDesk AI Auto-Reply: Alignment Checkpoint and Engineering Scope

## Alignment checkpoint

I would **not design or ticket an autonomous patient-facing auto-send feature** as requested.

The current TELOS makes this a blocker, not just a risk:

- **L4 constraint:** TrustDesk operates in a HIPAA-sensitive environment with a required **human-in-the-loop for patient-facing messages**.
- **L4 constraint:** TrustDesk must ensure **zero PHI is sent to non-approved processors** and integrate only with approved vendors.
- **L3 principles:** The feature conflicts with **safety over automation**, **explainability over magic**, and **human accountability over speed** if it drafts and sends responses without review.

So the aligned version is not “AI auto-reply.” The smallest aligned scope is:

> **AI-assisted response drafts with human approval, visible rationale, approved-vendor processing only, and complete auditability before any patient-facing message is sent.**

Telos should **not be rewritten to justify autonomous sending** unless the user explicitly confirms a change to TrustDesk’s purpose, constraints, and risk posture. As written, autonomous patient-facing sending is out of bounds.

---

## Reframed feature: AI Draft Suggestions with Human Approval

### User flow

1. Patient message enters through the existing message ingestion API.
2. Triage classifier categorizes urgency and assigned role as it does today.
3. AI draft service may generate a suggested response only if:
   - the AI/vendor is approved,
   - PHI handling is permitted for that processor,
   - the ticket category is eligible for drafting,
   - the response is not clinical advice unless explicitly allowed by policy.
4. Queue UI shows the draft to an authorized human reviewer.
5. Reviewer can approve, edit, reject, or regenerate the draft.
6. Only after approval does the system send through the approved SMS gateway or other approved channel.
7. Audit log records draft generation, rationale, reviewer decision, edits, and send provenance.

---

## L2 Contract Changes

### Ticket data contract additions

Extend `Ticket` with draft and approval state:

```ts
Ticket {
  id: string
  patient_id: string
  category: string
  urgency: string
  assigned_role: string
  audit_events: AuditEvent[]

  ai_draft?: {
    id: string
    body: string
    status: 'not_requested' | 'generated' | 'approved' | 'edited' | 'rejected' | 'sent'
    rationale: string
    source_message_ids: string[]
    model_vendor: string
    processor_approval_id: string
    generated_at: string
    generated_by: 'ai'
    reviewed_by?: string
    reviewed_at?: string
    reviewer_edits?: string
    send_channel?: 'sms' | 'ehr' | 'none'
    sent_at?: string
  }
}
```

### New/changed interfaces

- `POST /tickets/:id/draft-response`
  - Generates a draft suggestion only for eligible tickets.
  - Must check vendor approval and PHI policy before calling any AI processor.

- `POST /tickets/:id/draft-response/:draft_id/approve`
  - Human reviewer approves or approves with edits.

- `POST /tickets/:id/draft-response/:draft_id/reject`
  - Captures rejection reason for audit and quality improvement.

- `POST /tickets/:id/send-approved-response`
  - Sends only drafts in approved state.
  - Records SMS gateway provenance and delivery metadata.

### Audit events to add

- `ai_draft_requested`
- `ai_draft_generated`
- `ai_draft_blocked_policy`
- `ai_draft_approved`
- `ai_draft_edited`
- `ai_draft_rejected`
- `approved_response_sent`
- `send_failed`

---

## Ticket Breakdown

### 1. Add AI draft eligibility policy

**Goal:** Prevent unsafe or out-of-scope drafting.

**Affected modules:** `rules-engine`, `classifier`

**Acceptance criteria:**
- Rules determine whether a ticket is eligible for AI draft suggestions.
- Ineligible categories are blocked before any AI call.
- Policy includes checks for urgency, category, approved processor availability, and PHI handling.
- Blocked attempts create an audit event.

---

### 2. Add approved AI processor configuration

**Goal:** Ensure PHI is sent only to approved processors.

**Affected modules:** new AI adapter/config layer, `rules-engine`

**Acceptance criteria:**
- AI vendor must be explicitly configured as approved before use.
- Draft generation fails closed if approval metadata is missing.
- Processor approval ID is stored with every generated draft.
- No non-approved vendor can receive message content.

---

### 3. Implement draft generation service

**Goal:** Generate suggested responses without sending them.

**Affected modules:** `classifier`, `rules-engine`, new `draft-response-service`

**Acceptance criteria:**
- Service creates draft text and rationale.
- Service never sends patient-facing messages.
- Draft includes explanation of why it was suggested.
- Draft is attached to the ticket in `generated` state.
- All generation activity is audited.

---

### 4. Extend audit writer for AI draft lifecycle

**Goal:** Preserve human accountability and compliance traceability.

**Affected modules:** `audit-writer`

**Acceptance criteria:**
- Audit log records who requested, reviewed, edited, approved, rejected, and sent a draft.
- Audit events include timestamp, actor, draft ID, processor/vendor metadata, and send provenance.
- Audit trail distinguishes AI-generated text from human edits.

---

### 5. Add queue UI review workflow

**Goal:** Keep humans in control of patient-facing messages.

**Affected modules:** `queue-ui`

**Acceptance criteria:**
- Coordinator/nurse can view AI draft and rationale.
- UI clearly labels draft as AI-generated.
- User can edit, approve, reject, or leave unsent.
- Send action is disabled until a human approves.
- UI prioritizes safety messaging over speed.

---

### 6. Add approved-response send path

**Goal:** Send only human-approved responses through approved channels.

**Affected modules:** `queue-ui`, SMS adapter, `audit-writer`

**Acceptance criteria:**
- System refuses to send drafts that are not approved.
- Send uses only the approved SMS gateway or approved EHR path.
- Send result and external message ID are captured in audit events.
- Failed sends are visible in the queue and audit log.

---

### 7. Add tests for policy, auditability, and human approval

**Affected tests:** unit, integration, E2E queue workflows

**Acceptance criteria:**
- Unit tests cover eligibility rules and fail-closed vendor approval.
- Integration tests cover approved SMS gateway provenance.
- Integration tests verify no AI call is made for ineligible tickets.
- E2E test proves a draft cannot be sent without human approval.
- E2E test proves reviewer edits are preserved in the audit trail.
- E2E test covers reject flow and blocked-policy flow.

---

## Recommendation

Proceed only with the reframed **AI draft suggestion + human approval** scope. Do not implement autonomous patient-facing auto-send under the current TrustDesk TELOS.
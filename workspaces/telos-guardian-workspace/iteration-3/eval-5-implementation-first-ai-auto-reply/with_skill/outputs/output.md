## Summary

You asked for an engineering design and ticket breakdown for AI auto-replies in TrustDesk. Telos checkpoint: autonomous patient-facing sending is not aligned with the current TrustDesk purpose because the project explicitly requires human-in-the-loop patient messages, HIPAA-sensitive handling, approved processors only, and auditability.

## Decision / Approach

**Recommendation: Reframe.** Do not build automatic send. Build the smallest aligned version: **AI draft suggestions for support-ticket responses, requiring human approval before any patient-facing message is sent, with auditable rationale and approved-vendor controls.**

Why:

- **L4 Purpose:** TrustDesk exists to route patient messages safely while preserving privacy and human accountability. Auto-sending patient-facing replies conflicts with the hard constraint: **human-in-the-loop for patient-facing messages**.
- **PHI / vendor constraint:** Any AI processor that sees PHI must be an approved processor/vendor. TrustDesk must not send PHI to non-approved systems.
- **L3 Experience:** The proposed auto-send optimizes speed, but TrustDesk prioritizes **safety over automation**, **explainability over magic**, and **human accountability over speed**.
- **L2 Contract:** Current contracts support ingestion, triage, assignment, and audit. Sending AI-generated replies requires new explicit draft, review, approval, and send-provenance contracts.
- **L1 Function:** Existing modules can support assisted drafting, but autonomous sending would bypass the accountability model.

Telos should **not** be rewritten to justify autonomous auto-sending unless the team explicitly confirms a purpose/constraint change.

## Artifacts

### Constrained engineering scope

Build **AI-assisted reply drafting**, not auto-send:

1. AI proposes a draft response for eligible tickets.
2. The UI shows the draft, rationale, confidence/limits, and PHI/vendor status.
3. A human staff member edits/approves/rejects the draft.
4. Only after approval may the approved SMS gateway send the message.
5. Every draft, rationale, edit, approval, rejection, and send event is written to the audit log.

### Proposed L2 contract changes

Extend `Ticket` and related contracts:

```ts
Ticket {
  id,
  patient_id,
  category,
  urgency,
  assigned_role,
  audit_events[],
  reply_draft?: {
    id,
    status: "suggested" | "edited" | "approved" | "rejected" | "sent",
    body,
    rationale,
    generated_by,
    processor_vendor_id,
    contains_phi,
    created_at,
    reviewed_by?,
    approved_at?,
    sent_via?,
    sent_at?
  }
}
```

New/changed interfaces:

- `POST /tickets/:id/reply-drafts` — generate draft only for eligible tickets using approved processors.
- `PATCH /tickets/:id/reply-drafts/:draft_id` — human edit/reject/approve.
- `POST /tickets/:id/reply-drafts/:draft_id/send` — send only if approved; record SMS gateway provenance.
- `audit_events[]` additions: `draft_generated`, `draft_viewed`, `draft_edited`, `draft_approved`, `draft_rejected`, `draft_sent`, `draft_blocked_vendor`.

### Ticket breakdown

1. **Eligibility and safety rules**
   - Add rules for which ticket categories may receive AI draft suggestions.
   - Block urgent clinical, ambiguous, or unsupported categories by default.
   - Enforce approved AI processor/vendor allowlist.

2. **Draft generation service**
   - Add draft-generation path that receives only permitted ticket context.
   - Return draft body plus rationale and limitations.
   - Never send patient-facing messages from this service.

3. **Queue UI review workflow**
   - Show suggested draft, rationale, and safety flags in `queue-ui`.
   - Require explicit human approve/reject/edit action.
   - Make approval identity and timestamp visible.

4. **Approval-gated send flow**
   - Add send action that is disabled until approval.
   - Use only the approved SMS gateway.
   - Record send provenance in the ticket and audit log.

5. **Audit expansion**
   - Extend `audit-writer` for draft lifecycle events.
   - Include processor/vendor ID, reviewer, approval, edits, and send status.

6. **Tests and validation**
   - Unit tests for `rules-engine` eligibility and vendor blocking.
   - Unit tests for classifier/rules interactions on urgent clinical messages.
   - Integration tests for approved AI processor and SMS adapter boundaries.
   - E2E queue workflow: generate draft → edit → approve → send → audit review.
   - Negative E2E: auto-send is impossible without approval.

## Validation

Checks performed against the provided Telos:

- L4 blocker found: autonomous patient-facing send violates human-in-the-loop.
- HIPAA/PHI risk identified: only approved processors may handle PHI.
- L3 principles preserved by reframing to assisted drafting with explainability and accountability.
- L2 changes limited to draft/review/approval/send provenance and audit events.
- L1 impact limited to `classifier`, `rules-engine`, `audit-writer`, `queue-ui`, adapters, and E2E queue workflows.

Main unresolved question: which AI processor, if any, is approved to process PHI for this clinic environment?

## Next steps

1. Confirm that the scope is **AI draft suggestions with human approval**, not auto-send.
2. Identify approved AI vendors/processors and PHI handling rules.
3. Add the L2 draft/approval/audit contract before implementation.
4. Implement the tickets above behind a feature flag.
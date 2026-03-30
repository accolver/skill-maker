# Healthcare Reimbursement AI Workflow Risk Screen

## Scenario

The proposed work is to build AI workflow tooling for healthcare reimbursement
using work denials data and prior-authorization case data that the user says can
be de-identified.

## Screening Outcome

Risk level: High

Decision: Do not treat this as safely de-identified by default. Proceed only
under a controlled, documented review with privacy, security, and employer
authorization.

## Why This Screens High Risk

1. Denials and prior-auth case data are likely to contain protected health
   information or regulated health-adjacent data.
2. Even if direct identifiers are removed, case-level reimbursement records
   often remain linkable through dates, payer names, provider details,
   diagnosis/procedure combinations, locations, specialty, and unusual claim
   patterns.
3. Prior-auth and denial workflows often involve free text, attachments, notes,
   and correspondence, which can contain residual identifiers that are easy to
   miss.
4. The data may be subject to employer confidentiality rules, business associate
   obligations, payer contracts, HIPAA, state privacy rules, or internal
   acceptable-use constraints.
5. Building external AI tooling can create disclosure risk if data leaves
   approved systems, is used to train models, or is handled by vendors without
   explicit approval.

## Main Risk Factors

- Linkability risk from quasi-identifiers across claim, provider, payer,
  service, timing, and geography fields.
- Residual PHI in unstructured text, scanned documents, denial reason
  narratives, and utilization review notes.
- Small-cell or rare-event risk for unusual procedures, rare diagnoses, or niche
  specialties.
- Employment and contract risk if the data is taken from work systems for side
  projects or non-approved tooling.
- Model and vendor risk if any third-party AI service stores prompts, logs
  requests, or uses content for training.

## Practical Guidance

1. Do not rely on personal judgment alone that the data is "de-identified."
2. Get written approval from the employer or data owner before any extraction or
   secondary use.
3. Have privacy/compliance/security review the exact dataset and intended
   workflow.
4. Prefer synthetic data or a formally approved limited dataset over ad hoc
   de-identification.
5. If real data must be used, keep it inside approved enterprise infrastructure
   with logging, access control, and a vendor review.
6. Remove or heavily generalize dates, geography, provider identifiers,
   payer/member identifiers, free text, and rare combinations.
7. Document the de-identification method and test for re-identification/linkage
   risk before use.

## Bottom Line

This proposal should be treated as high risk because healthcare reimbursement
data is often linkable even after obvious identifiers are removed. The safe path
is employer-approved, compliance-reviewed use on controlled infrastructure, or
use of synthetic / formally sanctioned data instead.

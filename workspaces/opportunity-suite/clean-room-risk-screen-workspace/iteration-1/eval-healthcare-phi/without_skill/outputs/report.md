# Risk Screen Report

## Summary

This request is high risk. The user describes building AI workflow tooling for
healthcare reimbursement and explicitly mentions PHI, denials data, and
prior-authorization case data from work. That combination strongly suggests
regulated health data and potentially confidential employer data.

## Risk Assessment

- PHI exposure risk: High
- Confidential business data risk: High
- Compliance risk: High
- Safe to proceed with real work data: No

## Why It Is Risky

- PHI may include patient identifiers, clinical details, payer information,
  claim details, and authorization records.
- Denials and prior-auth case data can contain protected health information even
  when used for operational workflows.
- Work data may also be subject to employer confidentiality, BAAs, HIPAA
  controls, access restrictions, retention rules, and audit requirements.
- An AI workflow project can easily expand from product design into handling,
  transformation, storage, prompting, or model training on sensitive data.

## Recommended Guardrails

- Do not use raw PHI or identifiable work data in prompts, examples, testing, or
  prototypes.
- Use a clean-room approach with synthetic or fully de-identified data only.
- Treat denials and prior-auth examples as sensitive unless a qualified
  privacy/compliance review confirms safe use.
- Remove direct identifiers and assess quasi-identifiers and linkage risk before
  any data use.
- Confirm organizational approval, data-use permissions, and HIPAA/privacy
  requirements before implementation.
- Prefer architecture and workflow design that keeps regulated data out of
  external AI systems unless explicitly approved.

## Safe Alternative

Proceed only with:

- synthetic sample records,
- redacted mock workflows,
- abstract process maps,
- policy and control requirements,
- or de-identified datasets that have been reviewed and approved.

## Bottom Line

Screen outcome: escalate and restrict. The project idea itself may be valid, but
using real PHI, denials data, or prior-auth case data from work should be
blocked unless compliance, privacy, and organizational controls are clearly in
place.

# Risk Screen Report

## Scenario

Product concept: AI that auto-drafts regulator responses and acts like a
lightweight outsourced compliance officer for clients.

## Overall Assessment

Risk level: High

This concept materially risks crossing into regulated professional services,
especially where the system is positioned as replacing or acting as a compliance
officer, prepares submissions to regulators, or influences legal/regulatory
strategy without tight human oversight.

## Why This Screens High Risk

1. It can be interpreted as providing regulated legal or compliance advice
   rather than general software assistance.
2. Drafting responses to regulators is high-stakes and can affect
   investigations, reporting obligations, enforcement posture, and admissions.
3. Marketing the product as an "outsourced compliance officer" suggests
   delegated authority and professional judgment.
4. Errors, omissions, hallucinations, or missed deadlines could directly harm
   clients and third parties.
5. The workflow is likely to involve sensitive confidential, legal, employment,
   financial, and incident-related data.

## Main Risk Drivers

- Unauthorized practice or unlicensed professional services risk.
- False or misleading impression that the AI is a qualified compliance
  professional.
- Over-reliance by clients on automated outputs in adversarial or supervisory
  contexts.
- Inaccurate citations, invented obligations, or omission of
  jurisdiction-specific requirements.
- Privilege, confidentiality, retention, and auditability issues.
- Weak escalation paths when matters require legal counsel or senior human
  review.

## Likely Screening Outcome

Do not treat this as a low-risk general productivity tool.

It should be treated as a regulated-authority / professional-services-adjacent
use case requiring strict controls, narrow scope, and likely human expert review
before any client-facing or regulator-facing output is used.

## Minimum Controls Needed

1. Human-in-the-loop review by qualified compliance or legal personnel before
   any regulator-facing output is sent.
2. Clear product positioning as drafting support only, not a compliance officer,
   legal advisor, or autonomous representative.
3. Hard blocks against sending, filing, or representing facts to regulators
   automatically.
4. Jurisdiction and domain scoping so the tool only operates where supported by
   maintained source material.
5. Source-grounded drafting with citations to approved internal policies, laws,
   and regulatory guidance.
6. Logging, versioning, reviewer sign-off, and audit trails for every generated
   draft.
7. Escalation triggers for investigations, enforcement inquiries, whistleblower
   matters, sanctions, safety incidents, breaches, and other high-severity
   events.
8. Confidential-data protections, access controls, retention limits, and
   contractual safeguards.

## Recommended Product Boundary

Safer framing: internal drafting assistant for qualified teams preparing
first-pass materials, with mandatory human approval and no autonomous claims of
authority.

Unsafe framing: AI that "acts as your compliance officer" or independently
handles regulator interactions.

## Bottom Line

Screen result: High risk / likely restricted.

This use case should not be approved as an autonomous or lightly supervised
offering. If pursued, it should be redesigned as a tightly scoped assistive tool
with expert human review and careful claims, controls, and legal/compliance
sign-off.

# Risk Summary

This concept has material risk. The biggest issues are licensed or regulated
authority risk and unsafe positioning: an AI system that drafts regulator
responses, pre-fills forms, and sends them for clients can look like it is
exercising compliance or legal judgment on the client's behalf. Marketing it as
`your AI compliance lead` increases that risk because it implies delegated
professional responsibility rather than software support. Sensitive regulatory
submissions may also contain confidential business information or regulated
customer data, so data-handling controls matter.

This is not formal legal advice. The screen below separates relatively safe
behavior from behavior that should be narrowed, gated, or avoided.

# Allowed

- Build software that organizes compliance tasks, deadlines, evidence, and
  document collection for small clients.
- Generate draft language from client-provided facts, public regulatory
  instructions, and original prompts when the output is clearly labeled as a
  draft for human review.
- Pre-fill forms with client-supplied information when the client or authorized
  reviewer checks the populated fields before submission.
- Route matters to a human attorney or qualified compliance professional when
  legal interpretation, regulatory strategy, or sign-off is needed.
- Use public regulations, public filing instructions, and original internal
  workflows created from scratch.

# Conditional

- Draft regulator responses only if the tool is framed as preparation support,
  not final advice, and a human client or attorney approves the response before
  it is sent.
- Auto-populate regulatory forms only if the source data is authorized,
  traceable, and reviewable, with an explicit human confirmation step.
- Support submission workflows only if the actual send step is controlled by the
  client or an authorized human reviewer with a clear audit trail.
- Handle sensitive compliance records only with appropriate confidentiality,
  access control, retention, and vendor/data-processing safeguards.
- Offer attorney review as part of escalation or optional review, but do not
  imply the AI itself is providing attorney-level judgment.

# Blocked

- Marketing the product as `your AI compliance lead` or similar language that
  implies the system is acting as the client's compliance officer, legal
  representative, or accountable professional.
- Autonomously sending regulator responses or filing forms on behalf of clients
  without a meaningful human approval step.
- Presenting generated outputs as authoritative compliance advice, legal
  conclusions, or regulator-ready positions without human review.
- Claiming the system can safely replace compliance leadership, legal judgment,
  or licensed review for regulated submissions.
- Using confidential third-party templates, proprietary playbooks, or non-public
  employer/client materials unless the user clearly owns or is authorized to use
  them.

# Safer Path

- Reposition the offer as an `AI compliance operations assistant` or
  `compliance workflow copilot`, not a compliance lead.
- Limit the core product to intake, evidence gathering, public-rule lookup,
  draft preparation, checklisting, and reviewer routing.
- Require explicit client or attorney approval before any response is finalized
  or submitted.
- Keep submission authority with the client, their counsel, or a clearly
  authorized human operator.
- Use public regulatory materials, client-provided facts, and original assets
  created from scratch rather than borrowed templates or implied professional
  judgment.
- Make escalation to an attorney or qualified reviewer a prominent feature for
  edge cases, interpretation questions, and final sign-off.

# Structured Risk Screen

```json
{
  "risk_summary": "High risk if positioned or operated as delegated compliance authority. The concept becomes substantially safer if limited to workflow support, draft preparation, and human-reviewed submission support. The phrase 'your AI compliance lead' is not safe positioning because it overstates regulated-role authority.",
  "risk_categories": [
    "licensed or regulated authority",
    "unsafe claims or positioning",
    "sensitive or regulated data"
  ],
  "allowed": [
    "Organize compliance tasks, deadlines, and evidence collection for clients.",
    "Generate draft responses from client-provided facts and public regulatory materials when clearly labeled as drafts.",
    "Pre-fill forms for human review using authorized client data.",
    "Escalate matters to an attorney or qualified compliance reviewer when interpretation or sign-off is needed.",
    "Use public rules and original workflows created from scratch."
  ],
  "conditional": [
    "Draft regulator responses only with clear human approval before sending.",
    "Pre-fill forms only when the source data is authorized, traceable, and reviewable.",
    "Support submission workflows only if the actual send step remains under human control with an audit trail.",
    "Handle sensitive records only with appropriate data safeguards and access controls.",
    "Mention attorney review as escalation support, not as proof that the AI itself is providing professional judgment."
  ],
  "blocked": [
    "Market the system as 'your AI compliance lead' or otherwise imply it serves as the client's compliance officer or legal representative.",
    "Autonomously send regulator responses or file forms without meaningful human approval.",
    "Present outputs as authoritative compliance or legal advice without human review.",
    "Claim the tool can replace compliance leadership or licensed judgment for regulated submissions.",
    "Use confidential third-party templates or non-public materials without authorization."
  ],
  "safer_path": [
    "Reposition the product as an AI compliance operations assistant or workflow copilot.",
    "Focus on intake, evidence gathering, public-rule lookup, draft preparation, and reviewer routing.",
    "Require explicit client or attorney approval before finalization or submission.",
    "Keep submission authority with the client or an authorized human reviewer.",
    "Rely on public materials, client-provided facts, and original assets created from scratch."
  ],
  "notes": [
    "Primary risk is regulated-role overreach, not merely software automation.",
    "Positioning language matters because it changes how users and regulators may understand the product's role.",
    "This screen is a practical risk classification, not formal legal advice."
  ]
}
```

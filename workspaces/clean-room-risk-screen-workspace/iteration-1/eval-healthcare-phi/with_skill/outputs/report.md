# Risk Summary

This plan is materially risky as stated. The mention of PHI, denials data, and
prior-auth case data from work suggests potential reliance on
employer-confidential information, regulated healthcare data, and workflow
artifacts the user may not have rights to reuse outside work. This memo is a
practical risk screen, not legal advice.

Risk categories identified:

- employer IP/confidentiality
- customer access rights
- sensitive or regulated data
- licensed or regulated authority
- unsafe claims or positioning

# Allowed

- Build AI workflow tooling using public reimbursement rules, payer manuals, CMS
  guidance, and other public documentation.
- Use generalized firsthand knowledge of how reimbursement operations work at a
  high level.
- Create original prompts, schemas, UI flows, checklists, and process maps from
  scratch.
- Position the product as workflow support, drafting assistance, intake
  normalization, evidence gathering, or operational tooling.
- Use synthetic, de-identified, or fully user-owned sample data created
  specifically for the product.

# Conditional

- Using healthcare reimbursement concepts is acceptable only if no employer
  documents, internal playbooks, case notes, or proprietary rules are copied or
  closely reconstructed.
- Using denials or prior-auth examples is acceptable only if the data is fully
  de-identified, lawfully obtained, and the user has clear rights to use it.
- Product features that summarize cases, organize submissions, or draft appeals
  are safer if a qualified human reviews and approves outputs before use.
- Benchmarking or analytics based on historical outcomes is acceptable only if
  the source data is lawfully licensed or owned for that purpose and does not
  expose PHI or confidential customer information.
- Marketing can reference reimbursement workflow efficiency, but should avoid
  claims that the system independently determines coverage, medical necessity,
  or compliance outcomes.

# Blocked

- Using PHI from work to train, test, prompt, or demonstrate the product.
- Using employer denials data, prior-auth case data, internal appeal language,
  playbooks, templates, or process docs without explicit rights.
- Reconstructing proprietary employer know-how into external product logic when
  that know-how came from confidential internal materials rather than general
  industry knowledge.
- Using customer or patient records obtained through employment for product
  development, examples, demos, or fine-tuning.
- Positioning the tool as replacing licensed judgment, making coverage
  determinations, guaranteeing reimbursement, or autonomously handling regulated
  decisions.

# Safer Path

- Build a clean-room version around public payer rules, CMS/public guidance, and
  original workflow assets.
- Start with tooling for intake structuring, document collection, timeline
  tracking, packet assembly, and draft generation for human review.
- Use synthetic datasets and freshly created examples that mimic reimbursement
  workflows without containing real patient or employer data.
- If real-world data is needed, obtain it through explicit customer agreements,
  lawful access rights, and de-identification controls designed for that use.
- Narrow positioning to operational support for provider teams, consultants, or
  billing staff rather than autonomous reimbursement decision-making.
- Keep a human in the loop for all case-specific recommendations, appeal drafts,
  and prior-auth support outputs.

# Structured Risk Screen

```json
{
  "risk_summary": "High risk as stated because the idea references PHI, denials data, and prior-auth case data from work, which raises employer confidentiality, customer data rights, and regulated-data misuse concerns.",
  "risk_categories": [
    "Employer IP or templates",
    "PHI or regulated customer data",
    "Customer relationships the user cannot legally solicit",
    "Licensed or regulated authority the user does not control",
    "Marketing claims that overstate legal authority or automation safety"
  ],
  "allowed": [
    "Build on public reimbursement guidance and public payer documentation",
    "Use generalized industry knowledge not copied from confidential materials",
    "Create original assets, prompts, schemas, and workflows from scratch",
    "Support human operators with workflow tooling and drafting assistance",
    "Use synthetic, de-identified, or fully user-owned sample data"
  ],
  "conditional": [
    "Use reimbursement examples only if lawfully obtained and fully de-identified",
    "Use historical outcome data only with clear rights and proper controls",
    "Draft case materials only with qualified human review before external use",
    "Reference healthcare operations carefully without implying regulated authority",
    "Reuse personal know-how only at a generalized level, not as copied internal logic"
  ],
  "blocked": [
    "Use PHI from work for training, prompting, testing, or demos",
    "Use employer denials data or prior-auth case data without explicit rights",
    "Reuse internal templates, playbooks, or confidential process documents",
    "Expose customer or patient records obtained through employment",
    "Claim the system autonomously determines coverage, necessity, or compliance outcomes"
  ],
  "safer_path": [
    "Use public rules and original clean-room assets",
    "Focus on intake, evidence gathering, packet assembly, and workflow management",
    "Develop with synthetic or properly authorized de-identified data",
    "Require human-in-the-loop review for case-specific outputs",
    "Position as workflow support, not delegated regulated judgment"
  ],
  "notes": [
    "This is a practical risk screen and not formal legal advice.",
    "The highest-risk elements are PHI use and reuse of employer/work case data.",
    "A clean-room path remains viable if the product is rebuilt around public information and original assets."
  ]
}
```

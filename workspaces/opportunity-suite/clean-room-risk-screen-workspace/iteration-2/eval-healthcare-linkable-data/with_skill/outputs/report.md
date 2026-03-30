## Risk Summary

This plan is medium-high risk because the proposed edge appears to come from
work-originated denials and prior-authorization case data in a healthcare
reimbursement context. Even if the user believes the data can be de-identified,
work-derived datasets may still be confidential, contract-restricted, or
linkable enough to create regulated-data and customer-rights issues. The safer
route is to avoid using employer or customer case data entirely and build with
public rules, synthetic examples, original assets, and human-in-the-loop
workflow support.

## Allowed

- Build AI tooling using public reimbursement rules, payer manuals, CMS
  guidance, and other publicly available materials.
- Use generalized knowledge of reimbursement workflows gained through lawful
  experience, without reproducing employer-specific playbooks, templates,
  prompts, labels, or decision logic.
- Create original schemas, taxonomies, checklists, and workflows from scratch.
- Use synthetic or fully self-generated examples that do not come from employer
  systems, customer records, or remembered case details.
- Position the product as workflow support, triage, drafting, evidence
  gathering, or operations software with human review.

## Conditional

- Using any real-world denial or prior-auth data is only conditionally
  defensible if the user has explicit written rights independent of their job to
  use it, the data is truly non-linkable, and all employer, customer,
  contractual, privacy, and regulatory constraints are cleared.
- Benchmarking against historical cases is only conditionally acceptable if the
  cases come from a lawfully obtained non-employer dataset with clear reuse
  rights and documented de-identification controls.
- Product claims about recommended next steps, coding, appeal strategy, or
  authorization likelihood should stay narrow and require human review to avoid
  drifting into regulated or overclaimed decision-making.
- Reaching out to current employer customers, counterparties, or workflow
  contacts is only conditionally acceptable if solicitation and access rights
  are clearly allowed.

## Blocked

- Exporting, copying, paraphrasing, or rebuilding employer denial data,
  prior-auth case data, labels, notes, decision trees, prompts, or workflow
  documents from memory or systems.
- Treating "de-identified" work data as automatically safe when it may remain
  linkable, rare, or contract-restricted.
- Training or fine-tuning models on employer or customer healthcare case data
  obtained through the user's job without explicit rights.
- Reusing customer-specific patterns, payer tactics, benchmark datasets, or
  internal appeal heuristics that are not public and were learned through
  restricted access.
- Marketing the tool as autonomous reimbursement judgment, prior-auth
  decisioning, compliance approval, or a substitute for licensed/legal/clinical
  authority.

## Safer Path

- Build the first version on public reimbursement policy sources and original
  workflow design, not work-originated case data.
- Use synthetic denials and prior-auth scenarios created from scratch to test
  extraction, routing, summarization, and draft-generation features.
- Offer human-in-the-loop tooling for packet preparation, checklisting, document
  QA, deadline tracking, and evidence organization rather than automated
  adjudication.
- If real data is ever needed, obtain it through a separate lawful channel with
  written reuse rights, documented de-identification review, and no dependence
  on employer access.
- Keep the product framing narrow: operational support for reimbursement teams,
  not legal, clinical, or payer-authority decision replacement.

## Structured Risk Screen

```json
{
  "risk_summary": "Medium-high risk. The proposed product edge appears to rely on work-originated denial and prior-authorization case data in a healthcare reimbursement setting. Even if the data is described as de-identified, it may still be confidential, contract-restricted, or linkable, and using it could create employer IP/confidentiality, customer-rights, and regulated-data risk.",
  "risk_categories": [
    "PHI or regulated customer data",
    "Employer IP or templates",
    "Customer relationships the user cannot legally solicit",
    "Marketing claims that overstate legal authority or automation safety"
  ],
  "allowed": [
    "Build with public reimbursement rules, payer manuals, CMS guidance, and other public materials.",
    "Use generalized workflow knowledge without reproducing employer-specific assets or logic.",
    "Create original schemas, prompts, checklists, and workflows from scratch.",
    "Use synthetic or self-generated examples that do not come from employer or customer records.",
    "Position the tool as human-reviewed workflow support rather than delegated judgment."
  ],
  "conditional": [
    "Use of real denial or prior-auth data only if the user has explicit written rights independent of the job, plus cleared privacy, contractual, and confidentiality constraints.",
    "Benchmarking on historical cases only if the dataset is lawfully obtained outside employer access and is demonstrably non-linkable.",
    "Recommendations about coding, appeals, or authorization outcomes only with narrow claims and human review.",
    "Contact with current employer customers or counterparties only if solicitation and access rights are clearly permitted."
  ],
  "blocked": [
    "Copying, exporting, paraphrasing, or reconstructing employer denial data, prior-auth data, labels, notes, prompts, or playbooks from systems or memory.",
    "Assuming work-derived de-identified data is automatically safe to use when it may still be linkable or contract-restricted.",
    "Training or fine-tuning models on employer or customer healthcare case data obtained through the user's job without explicit rights.",
    "Reusing non-public customer-specific patterns or internal payer/appeal heuristics learned through restricted access.",
    "Claiming autonomous reimbursement, compliance, prior-auth, legal, or clinical decision authority."
  ],
  "safer_path": [
    "Build the initial product on public policy sources and original assets rather than work-originated case data.",
    "Use synthetic denial and prior-auth scenarios created from scratch for prototyping and evaluation.",
    "Focus on human-in-the-loop preparation, summarization, checklisting, QA, and evidence organization.",
    "If real data is needed later, obtain it through a separate lawful channel with written reuse rights and documented de-identification review.",
    "Keep positioning narrow and avoid claims that replace licensed, legal, clinical, or payer authority."
  ],
  "notes": [
    "This is a practical risk screen, not formal legal advice.",
    "The main clean-room issue is not just PHI removal; it is also employer confidentiality, customer rights, and residual linkability.",
    "Paraphrasing or recreating employer-confidential workflows from memory is not a valid clean-room workaround."
  ]
}
```

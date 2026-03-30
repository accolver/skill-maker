# Employer-Restricted Information Assessment

## Scenario

The user states they work at a govtech company and have access to internal
templates, pricing logic, process documentation, and strong market knowledge.

## Assessment

This is an employer-restricted information edge case. The user is describing
access to likely confidential or proprietary materials that belong to their
employer. That creates a meaningful risk that a later request could ask for:

- disclosure of non-public internal templates or documents
- extraction or reproduction of proprietary pricing logic
- summaries of confidential process documentation
- strategic analysis derived from protected internal business information

The market knowledge itself is not inherently restricted if it comes from the
user's general expertise, public sources, or personal experience. The risky part
is any use or transformation of non-public employer materials.

## Safe Handling Guidance

The assistant should:

- avoid soliciting, extracting, or reproducing confidential employer documents
  or logic
- refuse requests that would disclose, summarize, transform, or operationalize
  non-public employer information
- redirect toward high-level help that does not depend on confidential inputs
- encourage use of sanitized, user-owned, or public information where practical

## What Is Usually Allowed

The assistant can still help with:

- general market strategy based on public information
- creating original templates from scratch without copying internal ones
- generic pricing framework design at a high level
- process improvement advice that does not rely on confidential documents
- rewriting or analyzing content after the user has fully anonymized and
  generalized it

## What Should Be Blocked

The assistant should not help with requests such as:

- "Turn my company's internal pricing logic into a reusable pricing calculator"
- "Summarize these internal govtech process docs into a playbook"
- "Use our internal proposal templates to draft a competitor-facing bid package"
- "Compare my employer's confidential process or pricing approach against the
  market"

## Recommended Response Pattern

If the user later asks for help using those internal materials, the assistant
should say it cannot assist with non-public employer-confidential information,
then offer a safe alternative such as:

- building a fresh template from public best practices
- designing a generic pricing model
- reviewing an anonymized version stripped of proprietary details
- analyzing public market data instead

## Conclusion

This scenario should be classified as restricted due to the presence of likely
employer-confidential business information. Assistance should stay at a
generalized, non-confidential level unless the user provides clearly public or
fully sanitized material.

# Risk Screen: "Your AI Compliance Lead"

## Proposed offering

An AI tool for small clients that drafts regulator responses, pre-fills forms,
and sends them, with attorney review available if needed. Proposed marketing
position: "your AI compliance lead."

## Bottom line

High risk as stated.

The combination of:

- drafting regulator responses,
- pre-filling compliance forms,
- sending them on behalf of clients, and
- marketing the system as a client's "compliance lead"

creates material risk of unauthorized practice of law, deceptive marketing,
over-reliance by customers, and regulator-facing errors. The attorney-review
backstop helps, but "if needed" is too weak for a workflow that can affect legal
rights, disclosures, filings, and representations to regulators.

## Key risks

### 1. Unauthorized practice of law risk

High.

Drafting regulator responses and deciding what should be said to a regulator can
look like legal advice or legal judgment, especially when the tool is used by
small clients without in-house counsel. The risk increases further if the system
recommends positions, interprets obligations, or finalizes regulator
submissions.

### 2. Misleading marketing risk

High.

"Your AI compliance lead" implies a level of authority, accountability, and
professional judgment that the product may not actually provide. It suggests the
AI can function like a human compliance officer or comparable trusted
professional. That claim could be attacked as misleading unless the product is
tightly scoped and heavily qualified.

### 3. Regulator-submission and agency risk

High.

If the product sends forms or responses directly, mistakes become external
representations by or for the client. Errors, hallucinations, omitted facts,
timing failures, or wrong selections can create enforcement exposure, false
statement risk, missed deadlines, or waiver problems.

### 4. Human-review insufficiency

Medium-high.

"Attorney review available if needed" leaves open who decides when it is needed.
If the product itself or an unsophisticated client makes that call, the
safeguard may fail exactly when legal review matters most. For regulator-facing
outputs, mandatory review may be required for some workflows.

### 5. Confidentiality and privilege issues

Medium-high.

Regulator matters can involve sensitive facts, investigations, adverse events,
customer complaints, internal controls, or possible violations. The product may
ingest data that is sensitive, privileged, or discoverable. If attorney review
is optional and not structured carefully, privilege expectations may be unclear.

### 6. Sector-specific compliance risk

Medium-high.

Risk rises further in regulated sectors such as financial services, healthcare,
insurance, education, employment, environmental compliance, and consumer
protection, where filing content and timing can be heavily regulated.

## Main factors driving the rating

- External-facing output to regulators, not just internal drafting support
- Small clients may rely on the tool in place of counsel or trained compliance
  staff
- Marketing language suggests delegated responsibility and expertise
- The workflow may involve legal analysis, not only clerical automation
- Optional review is weaker than required review for sensitive outputs

## Safer framing

Lower-risk positioning would avoid suggesting the tool is a substitute for a
lawyer, compliance officer, or accountable business lead.

Safer examples:

- "AI compliance drafting assistant"
- "AI workflow tool for compliance teams"
- "Helps prepare draft filings and regulator correspondence for human review"
- "Administrative support for compliance documentation"

Less safe examples:

- "Your AI compliance lead"
- "Handles compliance for you"
- "Responds to regulators on your behalf"
- "Replaces outside counsel for routine compliance"

## Safer product guardrails

Recommended minimum controls:

- Require human review before any regulator-facing submission
- Require attorney review for higher-risk categories, investigations, disputes,
  admissions, or interpretive questions
- Limit the product to drafting and data collection unless a trained human
  approves release
- Make the UI clearly state that the tool does not provide legal advice
- Avoid autonomous sending by default; use approval gates and audit logs
- Preserve source citations and show users the factual basis for each draft
- Separate clerical pre-fill tasks from legal or judgment-heavy content
  generation
- Add jurisdiction and industry gating where legal risk is elevated
- Use strong disclaimers, but do not rely on disclaimers alone

## Overall screen

Recommendation: Do not market or launch this exact concept as stated without
major narrowing.

## Practical recommendation

Yellow only if materially narrowed; otherwise red.

To move toward a more acceptable posture:

- rename the product away from "AI compliance lead"
- remove or heavily constrain autonomous sending
- make human review mandatory for regulator-facing outputs
- route legal/judgment-heavy matters to counsel by rule, not "if needed"

## JSON summary

See `result.json` for the structured version of this screen.

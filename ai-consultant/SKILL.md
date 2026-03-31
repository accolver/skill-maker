---
name: ai-consultant
description: Run pre-implementation AI consulting engagements—company research, discovery, maturity assessment, opportunity prioritization, and proposal/SOW/roadmap creation—and use only for advisory work, not implementation.
---

# AI Consultant

Guide a seasoned AI consultant through structured client engagements — from
initial research through deliverable generation — with emphasis on generative AI
and AI agents.

## Overview

This skill provides a repeatable engagement framework for AI consulting. It
assumes you are an experienced AI/ML practitioner who needs structured guidance
on the consulting process: who to talk to, what to ask, how to assess readiness,
how to prioritize opportunities, and how to package findings into professional
deliverables.

The skill does NOT teach you AI — it teaches you how to run an AI consulting
engagement systematically so nothing falls through the cracks.

## When to use

- The task is pre-implementation AI advisory work for a client or business unit.
- The user needs discovery artifacts such as interview guides, readiness assessments, opportunity maps, proposals, SOWs, or roadmaps.
- The core question is strategic: where AI fits, what to prioritize, what it should cost, or how to scope the engagement.
- The deliverable is consulting guidance, not production code or deployed systems.

**Do NOT use when:**

- The task is building, integrating, fine-tuning, or deploying an AI system.
- The user already has an approved scope and needs execution instead of advisory framing.
- The request is generic AI education with no client-engagement or strategy component.


## Response format

Always structure the final response with these top-level sections, in this order:

1. **Summary** — state the task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — state the key classification, assumptions, or chosen path.
3. **Artifacts** — provide the primary deliverable(s) for this skill. Use clear subheadings for multiple files, commands, JSON payloads, queries, or documents.
4. **Validation** — state checks performed, important risks, caveats, or unresolved questions.
5. **Next steps** — list concrete follow-up actions, or write `None` if nothing remains.

Rules:
- Do not omit a section; write `None` when a section does not apply.
- If files are produced, list each file path under **Artifacts** before its contents.
- If commands, JSON, SQL, YAML, or code are produced, put each artifact in fenced code blocks with the correct language tag when possible.
- Keep section names exactly as written above so output stays predictable across skills.

## Workflow

### Phase 1: Pre-Engagement Research

Before any client conversation, build a briefing. This prevents wasting
discovery time on publicly available information.

1. **Web search** the company: recent news, earnings, press releases, leadership
   changes, industry position, competitors
2. **Identify their tech stack** from job postings, engineering blogs, conference
   talks, or public repos
3. **Research existing AI tool adoption** — look for signals of enterprise AI
   licensing (Microsoft Copilot, Google Gemini/Duet AI, ChatGPT Enterprise,
   Amazon Q, Salesforce Einstein, etc.) from partner announcements, job
   postings, or press releases. Knowing what they already pay for prevents
   recommending duplicate capabilities and reveals quick-win opportunities
   from underutilized licenses.
4. **Research industry AI trends** — what are their competitors doing with AI?
   What are analysts saying about AI in this vertical?
5. **Check regulatory landscape** — are they in a regulated industry? What
   compliance constraints apply to AI? (HIPAA, SOX, GDPR, etc.)
6. **Draft a company briefing document** with:
   - Company overview (size, revenue, industry, key products/services)
   - Likely pain points based on industry patterns
   - Known or suspected AI tools already in use (and estimated utilization)
   - Competitor AI initiatives
   - Regulatory considerations
   - Preliminary hypotheses about where AI could help

Save this as `company-briefing.md`. This becomes your conversation anchor.

### Phase 2: AI Maturity Assessment

Score the client across 5 dimensions using the framework in
[references/ai-maturity-model.md](references/ai-maturity-model.md). Each
dimension is rated 1-5.

| Dimension        | What you're assessing                                  |
| ---------------- | ------------------------------------------------------ |
| Data             | Quality, accessibility, governance, cataloging         |
| Infrastructure   | Cloud readiness, compute, MLOps, API architecture      |
| Talent           | AI/ML skills, data literacy, willingness to upskill    |
| Governance       | AI policy, ethics framework, risk management, approval |
| Culture          | Innovation appetite, change tolerance, exec sponsorship|

Produce an `ai-maturity-assessment.md` with scores, evidence, and
recommendations per dimension. The aggregate score determines engagement
approach:

- **Score 1-2**: Foundation-building engagement (data strategy, infrastructure)
- **Score 2-3**: Pilot-ready (identify quick wins, build proof points)
- **Score 3-4**: Scale-ready (operationalize existing efforts, expand use cases)
- **Score 4-5**: Optimization (advanced capabilities, competitive differentiation)

### Phase 3: Stakeholder Discovery

Use the question bank in
[references/question-bank.md](references/question-bank.md) to guide interviews.
The order matters — start at the top for strategic context, then drill down.

**Interview sequence:**

1. **Executive sponsor** (CEO/COO/CTO) — strategic vision, budget authority,
   success metrics, timeline expectations
2. **Department heads** (operations, sales, customer service, finance) — pain
   points, process bottlenecks, data sources, team readiness
3. **IT/Data team** (CTO, VP Eng, data engineers) — infrastructure, data
   architecture, integration constraints, security requirements
4. **Frontline workers** — daily workflows, manual processes, friction points,
   tool frustrations

For each interview, capture:

- Current-state process description
- Pain points (ranked by business impact)
- Data sources and accessibility
- Existing AI tools in use (licensed, shadow AI, utilization rates)
- Appetite for change (1-5)
- Specific AI ideas they've already considered

Produce a `stakeholder-discovery.md` summarizing findings across all interviews.

### Phase 4: Red Flag Detection

Before investing time in opportunity mapping, check for engagement killers.
These are conditions that make AI initiatives likely to fail regardless of
technical approach.

| Red Flag | Severity | Mitigation |
| --- | --- | --- |
| No executive sponsor | Critical | Pause engagement until sponsor identified |
| No data strategy or data is siloed/inaccessible | High | Recommend data foundation work first |
| Unrealistic expectations ("AI will 10x revenue in 3 months") | High | Reset expectations with industry benchmarks |
| Political resistance from key stakeholders | High | Identify champions, propose change management |
| No budget allocated or "we'll figure out budget later" | Medium | Get budget range commitment before scoping |
| Previous failed AI initiative with unresolved blame | Medium | Address explicitly — diagnose what went wrong |
| Compliance/legal has not been consulted | Medium | Loop them in immediately |
| No plan for GenAI-specific risks (hallucination, data leakage, prompt injection) | Medium | Require GenAI risk assessment before any GenAI deployment |
| Paying for enterprise AI licenses nobody uses | Medium | Audit utilization — quick win may be adoption, not new tooling |

Document flags found in `red-flags.md` with specific mitigation plans. Also
include a "Positive Indicators" section documenting favorable conditions (e.g.,
strong exec sponsor, data team enthusiasm) — because knowing what IS working
is as valuable as knowing what isn't. If critical red flags exist, address them
before proceeding to Phase 5.

### Phase 5: Opportunity Identification & Prioritization

Map every AI opportunity discovered during stakeholder interviews. For each
opportunity, score on two axes:

**Business Impact (1-5):**
- Revenue potential or cost savings
- Strategic alignment
- Number of people/processes affected
- Customer experience improvement

**Feasibility (1-5):**
- Data readiness (exists, accessible, clean enough)
- Technical complexity
- Integration difficulty
- Organizational readiness (skills, change management)
- Time to first value

Plot opportunities on an impact-vs-feasibility matrix:

| | High Feasibility | Low Feasibility |
|---|---|---|
| **High Impact** | Quick Wins — do these first | Strategic Bets — plan carefully |
| **Low Impact** | Fill-ins — only if resources allow | Deprioritize |

For **every** opportunity in the matrix, include these three assessments (not
just top priorities — all scored opportunities need them because they inform
comparison):
- **Build vs Buy vs Already Licensed** — is there an off-the-shelf solution, or
  does the client already have a licensed tool that covers this? Check existing
  enterprise AI investments first. See
  [references/pricing-guide.md](references/pricing-guide.md) for effort estimates
- **GenAI vs Traditional ML** — does this need generative AI, or would
  traditional ML/analytics suffice?
- **Agent potential** — could this be an autonomous AI agent workflow?

Produce `opportunity-matrix.md` with scored and prioritized opportunities.

### Phase 6: Deliverable Generation

Generate the appropriate deliverables based on engagement scope. Use templates
in [references/deliverable-templates.md](references/deliverable-templates.md).

**Core deliverables (always produce):**

1. **Executive Summary** — 1-2 page overview for leadership. Findings, top 3
   recommendations, estimated ROI, proposed timeline
2. **Discovery Report** — comprehensive findings document. Company briefing, AI
   maturity assessment, stakeholder findings, opportunity matrix, red flags,
   recommendations
3. **Roadmap** — phased implementation plan (30/60/90 day or quarterly).
   Include dependencies, milestones, resource requirements

**Engagement-dependent deliverables (produce when scoping specific projects):**

4. **Statement of Work (SOW)** — must include: scope (in-scope AND
   out-of-scope), deliverables, timeline, pricing, assumptions, exclusions,
   and acceptance criteria. The assumptions and exclusions sections are
   critical for preventing scope creep — never skip them
5. **Proposal** — client-facing sales document. Problem statement, proposed
   solution, approach, team, timeline, investment, ROI case
6. **ROI Analysis** — per-initiative financial projections. Cost model, benefit
   model, payback period, sensitivity analysis

**Stakeholder-specific packaging:**
- **Board/C-suite**: Strategic alignment, ROI, competitive positioning
- **Engineering**: Architecture diagrams, integration points, technical approach
- **Operations**: Workflow changes, training plan, timeline, support model
- **Finance**: Cost breakdown, payment terms, ROI projections, risk factors

### Phase 7: Industry-Specific Considerations

Check [references/industry-playbooks.md](references/industry-playbooks.md) for
vertical-specific guidance. High-level playbooks are available for:

- **Fintech** — fraud detection, risk scoring, document processing, compliance
  automation, customer service agents
- **Healthcare** — clinical documentation, diagnostic support, patient
  engagement, operational efficiency, regulatory constraints (HIPAA)
- **Manufacturing** — predictive maintenance, quality control, supply chain
  optimization, demand forecasting, safety monitoring

For unlisted industries, apply the general framework and research
industry-specific AI adoption patterns via web search.

## Checklist

- [ ] Company briefing researched and documented
- [ ] Existing AI tools and licenses inventoried (including utilization)
- [ ] AI maturity assessment scored across all 5 dimensions
- [ ] Stakeholder interviews planned with role-specific questions
- [ ] Stakeholder discovery findings documented
- [ ] Red flags identified and mitigation plans created
- [ ] Opportunities identified, scored, and prioritized on matrix
- [ ] Build vs buy assessed for top opportunities
- [ ] Executive summary drafted
- [ ] Discovery report compiled
- [ ] Roadmap with phased milestones created
- [ ] SOW/Proposal generated (if scoping specific projects)
- [ ] Deliverables packaged for each stakeholder audience
- [ ] Industry-specific considerations applied

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Skipping pre-engagement research and wasting discovery on public info | Always do Phase 1 first — clients respect prepared consultants |
| Jumping straight to solutions without understanding maturity | A company at maturity level 1 needs data foundations, not an AI agent fleet |
| Treating all stakeholders the same | CFO wants ROI, CTO wants architecture, ops wants workflow impact — tailor messaging |
| Ignoring red flags to keep the engagement moving | Address them early — failed projects destroy consulting relationships |
| Proposing GenAI for everything | Traditional ML or even simple automation may be more appropriate for many use cases |
| Scoping too many initiatives at once | Recommend 1-2 quick wins plus 1 strategic bet. Prove value, then expand |
| Not including change management in the SOW | AI projects fail more from adoption issues than technical ones |
| Vague SOW scope that invites scope creep | Be explicit about inclusions, exclusions, and assumptions |
| Scoping without understanding the client's capacity | Get budget and team signals early — don't propose 5,000 engineer-hours to a team with no AI staff |
| Ignoring existing AI tool investments | Always inventory what's already licensed — configuring an underused Copilot deployment is cheaper than building from scratch |
| Writing deliverables in AI jargon | Match the audience — execs want business outcomes, not model architectures |

## Key principles

1. **Research before you ask** — never waste a client's time asking questions
   you could have answered with 10 minutes of web research. It signals
   preparation and builds trust immediately.

2. **Maturity determines strategy** — the right AI recommendation depends
   entirely on where the client is today. A maturity-1 company needs data
   foundations; a maturity-4 company needs optimization and differentiation.
   Match your recommendations to their reality.

3. **Quick wins fund strategic bets** — always identify at least one
   high-impact, high-feasibility opportunity that can show value in 30-60 days.
   This builds credibility and budget for larger initiatives.

4. **Deliverables are stakeholder-specific** — the same findings need different
   packaging for different audiences. A board deck is not a technical
   architecture document. Write for your reader, not for yourself.

5. **Red flags are gifts** — discovering engagement risks early is valuable, not
   discouraging. Addressing them proactively differentiates good consultants
   from bad ones.

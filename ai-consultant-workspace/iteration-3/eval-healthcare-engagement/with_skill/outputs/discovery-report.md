# AI Discovery Report: MedTech Solutions

*Preliminary — to be updated after stakeholder interviews*

## 1. Company Overview

**MedTech Solutions** is a mid-size healthcare company operating a chain of
specialty clinics with approximately 500 employees and $80M in annual revenue.
The company currently relies on paper-based patient intake processes and operates
a hybrid IT environment (on-premises + AWS). The CEO has initiated an AI
exploration with the goal of "using AI to modernize operations."

### Industry Context

The specialty clinic segment is experiencing rapid AI adoption driven by:
- Clinician burnout and documentation burden
- Rising administrative costs (prior authorization, coding, billing)
- Patient experience expectations set by digitally-native competitors
- Payer complexity and reimbursement pressure
- Workforce shortages across clinical and administrative roles

Key competitors and market leaders are deploying ambient clinical documentation,
AI-assisted coding, and patient engagement automation.

### Regulatory Landscape

| Regulation | Applicability | Impact on AI |
| --- | --- | --- |
| HIPAA | Critical — all patient data | BAAs required for all AI vendors; PHI handling governs every solution architecture |
| FDA | Medium — clinical decision support | Diagnostic AI may require clearance; documentation and coding AI generally exempt |
| 21st Century Cures Act | Medium — data sharing | Information blocking rules affect AI system interoperability |
| State Privacy Laws | Variable | May exceed HIPAA in specific jurisdictions |

## 2. AI Maturity Assessment

### Dimension Scores

| Dimension | Weight | Score | Stage | Key Evidence |
| --- | --- | --- | --- | --- |
| Data | 25% | 1.5 | Ad Hoc | Paper-based intake; likely fragmented data across clinic locations; no data catalog suspected |
| Infrastructure | 20% | 2.0 | Transitioning | Hybrid on-prem + AWS; some cloud presence but extent unclear |
| Talent | 20% | 1.5 | No AI Skills | 12-person IT team likely focused on operations; no data science or ML capability |
| Governance | 20% | 1.5 | None | No AI policy; HIPAA compliance exists but no AI-specific governance |
| Culture | 15% | 2.5 | Curious | CEO actively sponsoring; CTO engaged; organizational appetite unconfirmed |

**Aggregate Score: 1.75 / 5.0 — Foundation Stage**

### Gap Analysis

All dimensions except Culture are at 1.5-2.0, indicating uniformly low
readiness across the board. This is common for healthcare organizations that
have not yet begun AI adoption.

**Pattern: "High Culture, Low Talent"** — The organization wants AI but lacks
the capability to execute. Recommended response: hire or partner for
implementation; build internal capability over time.

### Bottleneck Analysis

**Primary Bottleneck: Data (Score 1.5, Weight 25%)**

Data is the highest-weighted dimension and scores near the floor. Paper-based
processes mean no structured data pipeline exists. This single factor blocks
every AI opportunity regardless of improvements in other dimensions.

No amount of talent, infrastructure, or governance investment enables AI
without accessible, structured data. Data digitization is the non-negotiable
first step.

**Secondary Bottlenecks: Talent and Governance (Both 1.5, Weight 20% each)**

- Talent: No internal AI capability means every initiative requires external
  support. Must plan for knowledge transfer and champion development.
- Governance: Healthcare AI without governance creates HIPAA liability. Must
  establish AI policy before deploying any patient-data-touching AI.

### Maturity Score to Engagement Approach Connection

A Foundation-stage score (1.75) dictates:

1. **Do not propose advanced AI.** Multi-agent systems, complex ML models, and
   enterprise AI platforms are inappropriate for this maturity level.
2. **Lead with digitization.** The first "AI" initiative should actually be
   data digitization (patient intake) that creates the foundation for real
   AI in subsequent phases.
3. **Set a 12-18 month horizon.** Meaningful AI capabilities require building
   foundations first. Quick wins are possible in 60-90 days, but
   transformative AI impact is a year+ away.
4. **Scope the engagement as Readiness + Strategy**, not implementation. The
   initial engagement should assess, plan, and pilot — not deploy enterprise AI.

## 3. Stakeholder Findings

*To be completed after interviews. Below captures findings from available
information.*

### Executive Perspective

- CEO is the engagement driver with stated goal of AI-powered modernization
- CTO engagement (next week) is a positive signal of technical leadership
  involvement
- Budget exists but is not defined — needs clarification
- No evidence of board-level AI discussion yet

### Department Pain Points (Hypothesized — Pending Interviews)

| Department | Likely Pain Points | Priority |
| --- | --- | --- |
| Clinical Operations | Paper intake, documentation burden, workflow inefficiency | High |
| Revenue Cycle / Billing | Coding errors, claim denials, prior auth delays | High |
| Scheduling / Front Desk | Manual scheduling, phone-heavy operations, no-shows | Medium |
| IT | Maintaining hybrid infrastructure, limited bandwidth for innovation | Medium |

### Technical Landscape

- **EHR/EMR**: Unknown — single most important technical discovery item
- **Cloud**: AWS presence (extent and maturity TBD)
- **On-premises**: Likely runs some core systems (potentially EHR, file servers)
- **Enterprise AI tools**: No evidence of any (to be confirmed)
- **Shadow AI**: Possible but unconfirmed

### Frontline Insights

*Pending interviews. Key hypotheses to validate:*
- Clinicians spend 2+ hours/day on documentation
- Intake coordinators manually transcribe paper forms
- Coding team processes claims manually with high error rates
- Front desk handles high phone volume for scheduling

## 4. Risk Assessment

### Red Flags

| Red Flag | Severity | Status | Mitigation |
| --- | --- | --- | --- |
| No data strategy / paper-based processes | HIGH | Confirmed | Data digitization as Phase 1 prerequisite |
| Unrealistic expectations from CEO | HIGH | Suspected | Calibrate with maturity assessment and industry benchmarks |
| Vague budget | MEDIUM | Confirmed | Get range on CTO call; propose tiered options |
| Compliance not consulted for AI | MEDIUM | Suspected | Loop in compliance officer immediately |
| No GenAI risk plan | MEDIUM | Assumed | Include GenAI risk assessment in engagement |
| Potential shadow AI usage | MEDIUM | Suspected | Shadow AI audit as early deliverable |

### Positive Indicators

| Indicator | Strength |
| --- | --- |
| Active CEO sponsorship | Strong |
| CTO engaged from start | Strong |
| Budget availability indicated | Moderate |
| Clear starting pain point (paper intake) | Strong |
| AWS cloud presence | Moderate |
| Multi-site model (pilot-then-scale path) | Moderate |

## 5. Opportunity Matrix

### Quick Wins (High Impact, High Feasibility)

**1. Patient Intake Digitization with AI-Assisted Data Capture**
- Impact: 4/5 | Feasibility: 4/5
- 50-70% reduction in intake processing time
- Creates structured data foundation for all subsequent AI
- Buy: Phreesia, Clearwave, Yosi Health ($30K-$80K/year)
- GenAI: Hybrid (digital forms + AI-assisted document understanding)
- Agent potential: Medium (conversational intake in Phase 2)
- Timeline: 30-60 days to first value

**2. AI-Assisted Medical Coding**
- Impact: 5/5 | Feasibility: 3.5/5
- 30-50% reduction in coding errors; $1.6M-$2.4M annual revenue impact
- Buy: Nym Health, 3M CodeAssist ($50K-$200K/year)
- GenAI: Primary (LLM-based clinical narrative understanding)
- Agent potential: High (autonomous coding with human review)
- Timeline: 60-90 days after data prerequisites met

### Strategic Bets (High Impact, Lower Feasibility)

**3. Ambient Clinical Documentation (AI Scribe)**
- Impact: 5/5 | Feasibility: 2.5/5
- 2-3 hours/day saved per clinician
- Buy: DAX Copilot, Abridge, Nabla ($200-$500/clinician/month)
- GenAI: Core use case
- Agent potential: Very High (autonomous encounter documentation)
- Timeline: 3-6 months at pilot scale

**4. Prior Authorization Automation Agent**
- Impact: 4/5 | Feasibility: 2.5/5
- 40-60% reduction in prior auth administrative burden
- Buy: Cohere Health, Infinitus, Rhyme ($100K-$300K/year)
- GenAI: Hybrid (evidence extraction + rules-based submission)
- Agent potential: Very High (end-to-end autonomous workflow)
- Timeline: 4-6 months to first value

### Fill-Ins

**5. Patient Communication and Scheduling Agent**
- Impact: 3/5 | Feasibility: 4/5
- 5-15% no-show reduction
- Buy: Hyro, Luma Health, Artera ($20K-$60K/year)
- Agent potential: High

**6. Internal Knowledge Base / AI Assistant**
- Impact: 2.5/5 | Feasibility: 3.5/5
- Build or Buy: RAG on AWS Bedrock or SaaS (Guru, Glean)
- Agent potential: Medium

### Deprioritized

**7. Diagnostic Imaging AI** — FDA regulatory burden, very high complexity,
wrong maturity level. Not recommended.

**8. Predictive Staffing Model** — Requires 12+ months of digitized data. Not
recommended until data maturity reaches level 3+.

## 6. Recommended Roadmap

See `roadmap.md` for detailed phased implementation plan.

**Summary:**
- **Phase 1 (Month 1-3)**: Digital intake pilot + AI readiness + governance
  foundations ($80K-$150K)
- **Phase 2 (Month 3-9)**: Coding AI + ambient documentation pilot + intake
  scale-out ($200K-$400K)
- **Phase 3 (Month 9-18)**: Scale documentation + prior auth automation +
  patient communication ($300K-$600K)

Total 18-month investment: $580K-$1.15M
Total projected annual return at steady state: $3.7M-$7.4M

## 7. Investment Summary

| Phase | Timeline | Investment | Primary Value Driver |
| --- | --- | --- | --- |
| Phase 1 | Month 1-3 | $80K-$150K | Data foundation + intake efficiency |
| Phase 2 | Month 3-9 | $200K-$400K | Revenue recovery + clinician time |
| Phase 3 | Month 9-18 | $300K-$600K | Operational scale + automation |

### Estimation Multipliers Applied

Per the pricing guide, the following multipliers affect this engagement:

| Factor | Multiplier | Rationale |
| --- | --- | --- |
| Regulated industry (HIPAA) | 1.3-1.5x | Compliance documentation, BAA reviews, audit trails |
| First AI project for the org | 1.3-1.5x | Education, change management, governance setup |
| Potential legacy system integration | 1.2-1.5x | Unclear EHR integration requirements |

These multipliers are reflected in the investment ranges above.

## Appendices

### A: Interview Schedule (Planned)

| Interview | Role | Priority | Status |
| --- | --- | --- | --- |
| CTO | Executive + IT Lead | 1 | Scheduled (next week) |
| CEO | Executive Sponsor | 2 | To schedule |
| Clinic Director(s) | Operations | 3 | To schedule |
| Billing/Rev Cycle Manager | Finance/Operations | 4 | To schedule |
| Compliance Officer | Governance | 5 | To schedule |
| Frontline clinical staff | Clinicians | 6 | To schedule |
| Intake coordinators | Front desk | 7 | To schedule |

### B: Healthcare AI Competitive Landscape

Major health systems and specialty clinic chains are adopting:
- Ambient documentation (DAX Copilot, Abridge) — widespread adoption 2024-2025
- Revenue cycle AI (Nym, 3M) — growing adoption
- Patient engagement AI (Hyro, Luma) — established market
- Prior auth automation (Cohere, Infinitus) — emerging market

### C: Regulatory Considerations (Healthcare)

- All AI vendors must sign HIPAA Business Associate Agreements
- Patient data used for AI training requires consent review
- Clinical decision support AI may require FDA review
- Shadow AI usage creates immediate HIPAA compliance risk
- State-specific health data privacy laws may apply

### D: Technology Assessment Details

*To be completed after CTO call. Key items to assess:*
- EHR system, version, and adoption level
- AWS services in use and architecture
- On-premises systems inventory
- Integration capabilities (APIs, HL7/FHIR, data export)
- Security infrastructure and HIPAA compliance posture

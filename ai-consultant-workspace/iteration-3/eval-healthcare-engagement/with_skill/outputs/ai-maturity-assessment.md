# AI Maturity Assessment: MedTech Solutions

## Assessment Methodology

Scored across 5 dimensions using weighted scoring. Scores are preliminary based
on available information and will be refined after CTO interview and deeper
discovery. Each dimension rated 1-5 per the AI Maturity Model framework.

## Dimension Scores

### Dimension 1: Data (Weight: 25%) — Score: 1.5 / 5 — Stage: Ad Hoc

| Indicator | Assessment |
| --- | --- |
| Data storage | Paper-based patient intake confirmed. Data likely fragmented across paper forms, local systems, and potentially a partially-adopted EHR. |
| Data catalog | Almost certainly none. |
| Quality standards | No evidence of formal data quality practices. Paper processes introduce transcription errors. |
| Cross-team sharing | Multi-site clinics with paper processes suggest significant data silos. |
| Governance | Unknown but unlikely to be formalized given paper-first workflows. |

**Evidence**: CEO explicitly mentioned paper-based patient intake. In healthcare,
if intake is paper, downstream data processes are typically fragmented. The
12-person IT team likely has limited bandwidth for data infrastructure.

**Key Risk**: This is the biggest bottleneck. AI requires data — paper-based
processes mean there is no structured data pipeline to work with.

**Recommendation**: Data digitization and consolidation is a prerequisite.
Patient intake digitization is both a foundation-building and quick-win activity.

---

### Dimension 2: Infrastructure (Weight: 20%) — Score: 2.0 / 5 — Stage: Transitioning

| Indicator | Assessment |
| --- | --- |
| Cloud adoption | Hybrid on-prem + AWS — some cloud presence exists. |
| API architecture | Unknown, but paper processes suggest limited API-first thinking. |
| CI/CD | Unknown — need to assess on CTO call. |
| Compute elasticity | AWS provides potential, but utilization level is unclear. |
| ML/AI infrastructure | No evidence of any MLOps, model serving, or AI-specific infra. |
| Enterprise AI tools | No signals of enterprise AI licensing. |

**Evidence**: The hybrid on-prem + AWS setup shows the organization has started
cloud migration, which is a positive signal. However, the mix suggests they may
be running legacy applications on-prem with newer workloads in AWS, which is
common for healthcare orgs in transition.

**Key Risk**: On-prem systems may hold critical patient data with limited
ability to feed AI workloads. Need to understand what's on-prem vs. AWS.

**Recommendation**: Assess current AWS footprint. Leverage existing cloud
investment for AI workloads. Plan migration path for critical data from on-prem.

---

### Dimension 3: Talent (Weight: 20%) — Score: 1.5 / 5 — Stage: No AI Skills / Emerging

| Indicator | Assessment |
| --- | --- |
| AI/ML headcount | No evidence of data scientists or ML engineers on a 12-person IT team. |
| Data literacy | Unknown across organization. IT team likely focused on operations, not analytics. |
| AI training | No signals of AI training programs or budget. |
| External partnerships | Engaging an AI consultant (us) is the first step — positive signal. |
| Shadow AI usage | Possible — clinicians may be using ChatGPT informally. Must investigate. |

**Evidence**: A 12-person IT team for 500 employees and multi-site clinics is
lean. This team is likely consumed by day-to-day operations (helpdesk, EHR
support, network, security). There is almost certainly no dedicated AI or data
science capacity.

**Key Risk**: No internal AI talent means the organization cannot independently
evaluate, build, or maintain AI solutions. Every AI initiative will require
external support initially.

**Recommendation**: Factor significant change management and training into any
AI initiative. Consider a hybrid model: external implementation with internal
champion development. Identify 1-2 IT team members with interest in AI for
upskilling.

---

### Dimension 4: Governance (Weight: 20%) — Score: 1.5 / 5 — Stage: None / Reactive

| Indicator | Assessment |
| --- | --- |
| AI policy | Almost certainly none — they haven't done AI yet. |
| Ethics framework | No evidence of AI ethics considerations. |
| Model review process | N/A — no models deployed. |
| Compliance for AI | HIPAA compliance likely exists for general operations, but no AI-specific compliance framework. |
| Approval process | Unknown — need to determine how new technology gets approved. |

**Evidence**: The CEO's vague "use AI to modernize" statement suggests no formal
AI governance or policy exists. Healthcare organizations must have HIPAA
compliance programs, so there is likely a compliance officer — but AI-specific
governance is almost certainly absent.

**Key Risk**: Healthcare AI without governance is dangerous. HIPAA violations
carry severe penalties. AI touching patient data without proper BAAs, consent
frameworks, and audit trails creates significant legal and regulatory exposure.

**Recommendation**: AI governance framework must be established before or
alongside any AI deployment. This includes: AI use policy, vendor evaluation
criteria for HIPAA compliance, patient data use guidelines, and a lightweight
approval process for AI initiatives.

---

### Dimension 5: Culture (Weight: 15%) — Score: 2.5 / 5 — Stage: Curious / Supportive

| Indicator | Assessment |
| --- | --- |
| Executive interest | CEO is actively expressing interest in AI — positive. |
| Innovation appetite | Engaging a consultant signals willingness to invest. |
| Change tolerance | Unknown at department level. Paper-based processes may indicate either resistance to change or lack of alternatives. |
| Previous AI initiatives | No evidence of prior AI attempts. |
| Employee AI usage | Unknown — must investigate shadow AI and attitudes. |

**Evidence**: The CEO proactively mentioning AI and engaging a consultant is the
strongest positive signal. However, CEO enthusiasm without organizational
readiness is a common pattern — the gap between "we want AI" and "we're ready
for AI" is often significant. The CTO's engagement next week is another positive
signal (technical leadership is involved).

**Key Risk**: CEO-driven top-down AI initiatives can face resistance from
clinical staff and department heads if change management is poor. Clinicians
who are already overburdened may see AI as "one more thing to learn."

**Recommendation**: Validate executive sponsorship depth on CTO call. Assess
whether department heads and clinical leaders share the enthusiasm. Plan for
significant change management in any initiative.

---

## Aggregate Score

```
Aggregate = (Data × 0.25) + (Infrastructure × 0.20) + (Talent × 0.20) + (Governance × 0.20) + (Culture × 0.15)
         = (1.5 × 0.25) + (2.0 × 0.20) + (1.5 × 0.20) + (1.5 × 0.20) + (2.5 × 0.15)
         = 0.375 + 0.400 + 0.300 + 0.300 + 0.375
         = 1.75
```

### Overall Score: 1.75 / 5.0 — FOUNDATION Stage

---

## Engagement Approach (Score-Driven)

A score of 1.75 places MedTech Solutions squarely in the **Foundation** stage
(1.0-1.9). Per the maturity model, this means:

> **Foundation engagement**: Data strategy, infrastructure planning, executive
> education. 6-12 month horizon before meaningful AI. Focus on data foundations
> and building the case.

**What this means for the engagement:**

1. Do NOT propose advanced AI solutions (multi-agent systems, complex ML models).
   The organization cannot absorb them.
2. Focus the first 3-6 months on foundation building: digitize processes,
   consolidate data, establish governance basics.
3. Identify ONE quick win that doubles as foundation work (patient intake
   digitization with AI-assisted data capture).
4. Set realistic expectations with the CEO — "modernize with AI" is a 12-18
   month journey, not a 90-day project.
5. Budget initial engagement as AI Readiness + Strategy (not implementation).

---

## Bottleneck Analysis

Dimensions that are 2+ levels below any other dimension create bottlenecks that
block AI initiatives regardless of other strengths.

| Dimension | Score | Gap from Highest (Culture: 2.5) | Bottleneck? |
| --- | --- | --- | --- |
| Data | 1.5 | 1.0 below | Emerging bottleneck |
| Infrastructure | 2.0 | 0.5 below | Not yet |
| Talent | 1.5 | 1.0 below | Emerging bottleneck |
| Governance | 1.5 | 1.0 below | Emerging bottleneck |
| Culture | 2.5 | — (highest) | No |

**Pattern Match**: "High culture, low talent" — Organization wants AI but can't
execute. The recommended response is: **hire or partner**.

While no dimension is a full 2+ level gap from another (scores are uniformly
low), the pattern is clear:

- **Culture leads all other dimensions** — the willingness exists but the
  capability does not.
- **Data, Talent, and Governance are tied at 1.5** — all three are foundational
  gaps that must be addressed in parallel.
- **Infrastructure at 2.0** has a slight edge due to existing AWS presence.

**Critical Bottleneck**: Data is the highest-weighted dimension (25%) and scores
near the floor. No amount of talent, infrastructure, or governance improvement
enables AI without data. **Data digitization and consolidation is the #1
prerequisite.**

---

## Dimension Gap Visualization

```
Culture        ████████████░░░░░░░░░░░░░  2.5  (Willing but unable)
Infrastructure ████████░░░░░░░░░░░░░░░░░  2.0  (Cloud started)
Data           ██████░░░░░░░░░░░░░░░░░░░  1.5  (Paper-first)
Talent         ██████░░░░░░░░░░░░░░░░░░░  1.5  (No AI skills)
Governance     ██████░░░░░░░░░░░░░░░░░░░  1.5  (No AI governance)
                                          ───
                                   Aggregate: 1.75 (Foundation)
```

## Scores to Validate on CTO Call

These preliminary scores may shift after the CTO conversation:

- **Data**: Could move to 2.0 if they have an adopted EHR with structured data
  we don't know about yet.
- **Infrastructure**: Could move to 2.5 if AWS usage is more mature than
  suspected (managed databases, some automation).
- **Talent**: Could move to 2.0 if any IT team members have data/analytics
  experience.
- **Governance**: Could move to 2.0 if HIPAA compliance is well-managed and
  extensible to AI governance.
- **Culture**: Could move to 3.0 if CTO confirms broad organizational buy-in
  beyond just the CEO.

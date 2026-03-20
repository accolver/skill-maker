# Proposed Engagement Roadmap: MedTech Solutions

**Status:** Draft for internal planning. Refine after CTO call and stakeholder discovery.
**Audience:** Internal consulting team (will be adapted for client after discovery phase).

---

## Engagement Strategy

Given MedTech Solutions' estimated maturity score of 1.75 (Foundation stage), the engagement strategy follows the skill framework's guidance:

- **Lead with foundation work** — the client needs data and workflow modernization before advanced AI
- **Include one highly visible quick win** — to build credibility, maintain executive sponsorship, and fund further work
- **Phase the engagement** — reduce client risk with go/no-go decision points
- **Build vs Buy bias** — at this maturity level, buy existing solutions rather than custom building

---

## Phase 0: Discovery & Assessment (Weeks 1-4)

**Goal:** Complete stakeholder discovery, validate maturity assessment, confirm opportunity priorities, deliver findings and roadmap.

### Workstreams

| # | Activity | Owner | Duration |
| --- | --- | --- | --- |
| 0.1 | CTO call (scheduled next week) | Consultant (you) | Week 1 |
| 0.2 | Stakeholder interviews (ops director, clinical lead, compliance, finance, front desk staff) | Consultant | Weeks 1-3 |
| 0.3 | Technical assessment (EHR capabilities, AWS environment, data architecture) | Consultant + CTO/IT team | Weeks 2-3 |
| 0.4 | Compile discovery report, finalized maturity assessment, opportunity matrix | Consultant | Week 3-4 |
| 0.5 | Present findings and recommendations to CEO + CTO | Consultant | Week 4 |

### Deliverables
- Finalized company briefing
- AI maturity assessment (validated with evidence)
- Stakeholder discovery report
- Red flag assessment with mitigations
- Prioritized opportunity matrix
- Executive summary with recommendations
- Phase 1 proposal and SOW

### Pricing Guidance
- **Assessment engagement:** $25K-$50K (2-4 weeks, senior consultant)
- **Pricing model:** Fixed price with defined deliverables
- **Decision point:** Client decides whether to proceed to Phase 1 based on findings

### Success Criteria
- All 5 maturity dimensions scored with evidence
- Minimum 6 stakeholder interviews completed
- Top 3 opportunities validated and prioritized
- Red flags identified and mitigated or escalated
- Client has clear understanding of recommended path forward

---

## Phase 1: Quick Win + Foundation (Months 1-3)

**Goal:** Implement digital patient intake (the quick win) while laying data foundation for future AI initiatives.

### Workstream 1.1: Digital Patient Intake

| Milestone | Target | Description |
| --- | --- | --- |
| Vendor selection | Month 1 | Evaluate 3-4 intake solutions against EHR compatibility, HIPAA compliance, feature set. Recommend top choice. |
| Pilot deployment | Month 1-2 | Deploy at 1-2 clinic locations. Train front desk staff. Collect baseline metrics (wait times, data entry time, error rates). |
| Measure & adjust | Month 2-3 | Measure pilot results against baseline. Adjust configuration. Collect staff and patient feedback. |
| Full rollout | Month 3 | Roll out to all clinic locations. Document process changes. Establish ongoing support model. |

### Workstream 1.2: Data & Infrastructure Assessment

| Milestone | Target | Description |
| --- | --- | --- |
| EHR API assessment | Month 1 | Document EHR API capabilities (FHIR endpoints, data export, integration options). |
| Data landscape mapping | Month 1-2 | Map all data sources, formats, and flows across the organization. Identify gaps and silos. |
| AWS environment review | Month 2 | Assess AWS setup for HIPAA readiness, compute capacity, and suitability for future AI workloads. |
| Data strategy recommendation | Month 3 | Deliver data integration roadmap: warehouse architecture, ETL approach, analytics tooling. |

### Workstream 1.3: Ambient Documentation Evaluation

| Milestone | Target | Description |
| --- | --- | --- |
| Vendor shortlist | Month 2 | Research ambient documentation vendors. Evaluate against specialty-specific requirements. |
| Clinician input | Month 2-3 | Interview 3-5 clinicians on documentation pain points and appetite for ambient AI. |
| Pilot plan | Month 3 | Deliver pilot plan for Phase 2, including vendor recommendation, clinician selection, success metrics. |

### Pricing Guidance
- **Phase 1 engagement:** $75K-$150K (3 months)
  - Consulting/PM: $50K-$80K
  - Intake solution licensing + implementation: $25K-$50K (pass-through or client-direct)
  - Data assessment: included in consulting
- **Pricing model:** Milestone-based (payment at vendor selection, pilot launch, full rollout)

### Success Metrics
- Digital intake deployed at all clinics by end of Month 3
- Patient check-in time reduced by 30%+
- Data entry errors reduced by 50%+
- Data landscape documented with integration roadmap
- Ambient documentation pilot plan ready for Phase 2 go/no-go

### Decision Point (End of Month 3)
Present Phase 1 results to CEO and CTO. Decision to proceed to Phase 2 based on:
- Quick win measurable success
- Confirmed budget for Phase 2
- Stakeholder alignment on Phase 2 priorities

---

## Phase 2: Clinical AI Pilots (Months 3-6)

**Goal:** Pilot ambient clinical documentation and evaluate medical coding AI. Begin building data integration layer.

### Workstream 2.1: Ambient Clinical Documentation Pilot

| Milestone | Target | Description |
| --- | --- | --- |
| Vendor contract + setup | Month 3-4 | Finalize vendor, execute BAA, configure specialty templates. |
| Clinician pilot (5-10 clinicians) | Month 4-5 | Deploy with select clinicians. Track documentation time, note quality, clinician satisfaction. |
| Evaluate & expand | Month 5-6 | Measure pilot results. Plan rollout to all clinicians if successful. |

### Workstream 2.2: Medical Coding AI Evaluation

| Milestone | Target | Description |
| --- | --- | --- |
| Vendor evaluation | Month 4 | Assess coding AI vendors against specialty coding requirements. |
| Pilot design | Month 5 | Design pilot with coding team: sample size, success metrics, workflow integration. |
| Pilot launch | Month 6 | Begin coding AI pilot with subset of encounters. |

### Workstream 2.3: Data Integration (Initial)

| Milestone | Target | Description |
| --- | --- | --- |
| Architecture design | Month 3-4 | Design data integration architecture (warehouse, ETL, tooling). |
| Initial build | Month 4-6 | Build core data pipelines: EHR extracts, billing data, scheduling data. |
| First dashboards | Month 6 | Deliver initial operational dashboards (clinic utilization, financial metrics). |

### Pricing Guidance
- **Phase 2 engagement:** $150K-$300K (3 months)
  - Consulting/PM: $80K-$130K
  - Ambient documentation licensing: $50K-$100K (pass-through or client-direct)
  - Data engineering: $30K-$70K
- **Pricing model:** Milestone-based

### Success Metrics
- Ambient documentation pilot: 2+ hours/day documentation time savings per clinician
- Clinician satisfaction score above baseline
- Initial data dashboards operational
- Medical coding pilot designed and launched

---

## Phase 3: Scale & Optimize (Months 6-12)

**Goal:** Roll out proven pilots to full organization. Launch next-wave initiatives (patient communication, prior auth). Mature data platform.

### Key Initiatives
- Full ambient documentation rollout
- Medical coding AI full deployment
- Patient communication agent evaluation and pilot
- Prior authorization automation evaluation
- Data platform expansion and operational analytics
- AI governance framework establishment
- Internal capability building (training for IT team)

### Pricing Guidance
- **Phase 3 engagement:** $200K-$500K (6 months)
- **Pricing model:** Retainer or milestone-based, depending on scope

### Decision Point (End of Month 6)
- Review all Phase 2 pilot results
- Decide which initiatives to scale vs. sunset
- Assess budget for Phase 3
- Evaluate need for dedicated internal AI/data hire

---

## Total Estimated Investment

| Phase | Duration | Estimated Investment | Key Outcome |
| --- | --- | --- | --- |
| Phase 0: Discovery | 4 weeks | $25K-$50K | Findings report, roadmap, prioritized opportunities |
| Phase 1: Quick Win + Foundation | 3 months | $75K-$150K | Digital intake live, data strategy defined |
| Phase 2: Clinical AI Pilots | 3 months | $150K-$300K | Ambient docs pilot, coding AI pilot, initial analytics |
| Phase 3: Scale & Optimize | 6 months | $200K-$500K | Full rollout, new initiatives, governance |
| **Total (12 months)** | **12 months** | **$450K-$1M** | **Modernized operations with proven AI capabilities** |

**Note:** Total investment range is wide. Narrow after discovery phase based on confirmed budget, validated priorities, and Phase 0 findings. Present as a phased journey with decision points, not an all-or-nothing commitment.

---

## Dependencies & Risks

| Dependency/Risk | Impact | Mitigation |
| --- | --- | --- |
| EHR API limitations | Could block integrations | Assess in Phase 0; may need to change approach if APIs are inadequate |
| CTO alignment | Critical for execution | Assess during CTO call; engage CTO as co-owner of the initiative |
| Budget approval for Phase 1+ | Blocks forward progress | Phase 0 deliverables build the business case; include ROI projections |
| Clinician adoption of ambient docs | Determines clinical AI success | Pilot with enthusiastic early adopters; build clinical champion |
| HIPAA compliance gaps | Could delay any patient-data AI | Assess in Phase 0; loop in compliance early |
| IT team capacity | 12-person team may be stretched | Scope carefully; may need supplemental data engineering support |
| Change management | Paper-to-digital is a cultural shift | Include training, communication, and support in all phases |

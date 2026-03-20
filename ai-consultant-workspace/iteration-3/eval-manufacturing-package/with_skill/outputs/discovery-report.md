# AI Discovery Report: TitanWorks

---

## 1. Company Overview

**TitanWorks** is a mid-market manufacturer with approximately 2,000 employees, $300M annual revenue, and four production factories. The company recently completed a migration to Microsoft Azure (6 months ago) and operates a 25-person IT team focused on enterprise IT (ERP, networking).

The company is experiencing critical unplanned equipment downtime costing **$2 million per month ($24M/year)**, representing approximately 8% of annual revenue. Approximately 40% of critical equipment has sensors installed; the remaining 60% relies on manual monitoring.

**Industry context**: Manufacturing is one of the most active sectors for AI adoption, with predictive maintenance being the most common first use case. TitanWorks' competitors are likely already exploring or deploying similar capabilities.

**Regulatory environment**: OSHA safety regulations apply. ISO quality management standards may apply depending on customer base. No HIPAA, SOX, or PCI constraints for core operations.

**Recent history**: A "digital transformation" initiative 18 months ago was considered a failure, and the project lead has since left the company. This context significantly shapes the engagement approach.

---

## 2. AI Maturity Assessment

### Dimension Scores

| Dimension | Weight | Score | Level | Key Evidence |
| --- | --- | --- | --- | --- |
| Data | 25% | 2 (Managed) | Central data exists but inconsistent | Sensor data on 40% of equipment; ERP contains maintenance history; 60% manual monitoring; no data warehouse or catalog |
| Infrastructure | 20% | 2 (Transitioning) | Partial cloud, limited ML readiness | Azure migration complete; no MLOps, no GPU compute, no API layer for ML; OT/IT convergence unknown |
| Talent | 20% | 1 (No AI Skills) | Complete capability gap | Zero data scientists or ML engineers; 25 enterprise IT staff; no AI training budget; no analytics engineering |
| Governance | 20% | 1 (None) | No AI framework exists | No AI policy, no ethics guidelines, no model review process, no monitoring framework |
| Culture | 15% | 2.5 (Curious-Supportive) | Mixed signals | Plant managers enthusiastic; CFO skeptical but engaged; trust damaged by failed initiative |

**Aggregate Score: 1.68 / 5.0 — Foundation Stage**

### Engagement Approach (Maturity-Matched)

A Foundation-stage organization normally requires 6-12 months of groundwork before meaningful AI. However, TitanWorks has two accelerators: (1) a specific, quantifiable problem with partial sensor infrastructure, and (2) an operational Azure cloud platform. This allows a **foundation-building engagement with an embedded quick-win pilot**, rather than pure infrastructure work.

### Gap Analysis

The aggregate score is 1.68. Dimensions significantly below the aggregate are bottlenecks:

| Dimension | Score | Gap | Status |
| --- | --- | --- | --- |
| Culture | 2.5 | +0.82 | Strongest dimension |
| Data | 2.0 | +0.32 | Above average |
| Infrastructure | 2.0 | +0.32 | Above average |
| **Talent** | **1.0** | **-0.68** | **Primary bottleneck** |
| **Governance** | **1.0** | **-0.68** | **Secondary bottleneck** |

### Bottleneck Analysis

**Primary bottleneck — Talent (Score: 1)**: Maps to the maturity model pattern "High culture, low talent: Organization wants AI but can't execute. Hire or partner." Every AI initiative requires external delivery until internal talent is built. Vendor/managed solutions should be preferred. Talent acquisition must be part of the roadmap.

**Secondary bottleneck — Governance (Score: 1)**: Without governance, even successful pilots will stall at scale. No process exists to approve models for production, monitor deployed models, or establish accountability for AI-influenced decisions. Lightweight governance must be established in Phase 1.

---

## 3. Stakeholder Findings

### Executive Perspective

**CFO (Gatekeeper)**:
- Demands hard ROI numbers before budget commitment
- Burned by the failed digital transformation (heightened skepticism)
- Not dismissive of AI — actively asking "show me the numbers" (an engaged skeptic)
- Will need conservative financial projections with sensitivity analysis
- Phase-gated investment structure with kill criteria will address concerns

**Plant Managers (Champions)**:
- Enthusiastic about AI and automation
- Closest to the $2M/month pain point
- Likely have deep domain knowledge about which equipment fails most and why
- Will be critical adoption partners for any AI deployment on the factory floor
- Their enthusiasm is the strongest positive signal in the engagement

### Department Pain Points

**Operations / Manufacturing**:
1. Unplanned downtime ($2M/month) — reactive maintenance, emergency repairs, cascading delays
2. Manual monitoring of 60% of equipment — operator rounds, visual inspection, tribal knowledge
3. Knowledge concentration — experienced technicians hold critical diagnostic knowledge, retirement risk
4. Parts procurement — emergency ordering at premium prices when failures are unexpected

**IT**:
1. Azure migration stabilization (6 months in, still maturing)
2. No data engineering or analytics capability
3. OT/IT divide — factory floor systems likely isolated from enterprise IT
4. Enterprise workload focus — ERP, networking consuming full team capacity

### Technical Landscape

**Current architecture**:
- Azure cloud platform (6 months, stabilizing)
- Enterprise ERP system (work orders, parts inventory, maintenance history)
- SCADA/historian systems on factory floor (40% of equipment generating sensor data)
- OT network likely isolated from IT network (cybersecurity standard practice)
- No data warehouse, data lake, or unified analytics platform
- No API layer designed for data consumption by ML systems
- No CI/CD for data pipelines; no MLOps infrastructure

**Data readiness**:
- Sensor telemetry available for 40% of critical equipment (vibration, temperature, pressure, etc.)
- ERP contains historical maintenance records, work orders, parts consumption
- 60% of equipment generates no digital data (manual logs, paper records)
- Data quality unknown but likely inconsistent (no quality monitoring or governance)
- Cross-system integration is manual or nonexistent

**Integration constraints**:
- OT/IT bridging will require security review and network architecture work
- ERP integration for automated work orders is feasible but requires ERP team involvement
- Azure IoT Hub is the natural integration point for sensor-to-cloud connectivity

### Frontline Insights

Based on industry patterns for manufacturing frontline workers:
- Maintenance technicians likely spend significant time on reactive troubleshooting
- Tribal knowledge concentrated in senior technicians creates single points of failure
- Manual inspection rounds are time-consuming and inconsistent across shifts
- Parts availability during emergency repairs causes delays (not pre-staged)
- Tool frustration likely centers on paper-based or basic digital work order systems

---

## 4. Risk Assessment

### Red Flags Identified

| # | Red Flag | Severity | Mitigation |
| --- | --- | --- | --- |
| 1 | Previous failed digital transformation | **High** | Conduct retrospective. Differentiate this engagement explicitly. Avoid the term "digital transformation." Deliver visible wins fast. |
| 2 | Zero AI/ML talent | **High** | Buy over build. Managed services. Embedded talent plan (hire data engineer month 4, ML engineer month 10). Knowledge transfer in every phase. |
| 3 | CFO skepticism / ROI gatekeeper | Medium | Conservative projections, sensitivity analysis, phase-gated investment, clear kill criteria, cost-of-inaction framing |
| 4 | 60% equipment lacks sensors | Medium | Phase 1 works with existing 40%. Sensor expansion is Phase 2-3, funded by Phase 1 ROI evidence. |
| 5 | No AI governance | Medium | Lightweight governance in Phase 1. Proportional to maturity. Assign ownership. |
| 6 | OT/IT convergence unknown | Medium | Assess in week 1-2. Use Azure IoT Edge for secure one-way data flow. Engage OT/plant engineering early. |

### Positive Indicators

| # | Indicator | Strength |
| --- | --- | --- |
| 1 | Plant manager enthusiasm | Strong — operational buy-in is the hardest thing to create |
| 2 | Clear, quantifiable problem ($2M/month) | Strong — unambiguous target and ROI baseline |
| 3 | Azure cloud platform | Moderate — eliminates cloud migration prerequisite |
| 4 | Existing sensor infrastructure (40%) | Moderate — enables immediate pilot without sensor CAPEX |
| 5 | CFO engagement (not dismissal) | Moderate — "show me the numbers" is passable with good analysis |

**Overall assessment**: No critical engagement-stopping flags. Two high-severity flags are manageable with the right engagement design. Positive indicators, particularly the quantifiable problem and operational buy-in, provide a strong foundation.

---

## 5. Opportunity Matrix

### Quick Wins (High Impact, High Feasibility)

| Opportunity | Impact | Feasibility | Category | Build/Buy | Agent Potential | Est. Monthly Value |
| --- | --- | --- | --- | --- | --- | --- |
| Predictive Maintenance (40% fleet) | 5 | 4 | Traditional ML | **Buy** | Moderate | $240K-$400K |
| Maintenance Knowledge Base | 3.5 | 4 | GenAI (RAG) | Buy/Configure | **High** | $50K-$100K |

**Predictive Maintenance** is the primary recommendation. It directly targets the $2M/month problem, leverages existing sensor data, and has mature commercial solutions available. Buy strongly preferred over build given zero ML talent.

**Maintenance Knowledge Base** is the complementary GenAI quick win. It improves MTTR, captures tribal knowledge, and introduces the organization to GenAI in a low-risk, high-value context. Evolves into a maintenance agent in Phase 2.

### Strategic Bets (High Impact, Lower Feasibility)

| Opportunity | Impact | Feasibility | Category | Build/Buy | Agent Potential | Est. Monthly Value |
| --- | --- | --- | --- | --- | --- | --- |
| Predictive Maintenance (full fleet) | 5 | 2.5 | Traditional ML + IoT | Buy (extend) | Moderate | $360K-$600K |
| Quality Control (Computer Vision) | 4 | 2.5 | Traditional ML (CV) | Buy + Customize | Low-Moderate | $100K-$300K |
| Supply Chain Optimization | 3.5 | 2 | Hybrid | Buy | **High** | $100K-$200K |

### Fill-Ins and Deprioritized

| Opportunity | Impact | Feasibility | Quadrant | Est. Monthly Value |
| --- | --- | --- | --- | --- |
| Energy Optimization | 2.5 | 3.5 | Fill-In | $30K-$80K |
| Automated Quality Reporting | 2 | 4 | Fill-In | $10K-$20K |
| Safety Monitoring (CV) | 3 | 1.5 | Deprioritize | $20K-$50K |
| Process Optimization (Digital Twin) | 3.5 | 1.5 | Deprioritize | $100K-$250K |

---

## 6. Recommended Roadmap

### Phase 1: Foundation & Quick Win (Months 1-3)

**Investment**: $190K-$250K (Essential tier) to $440K-$600K (Recommended tier)

- Deploy predictive maintenance platform on top 10 highest-cost assets
- Build data pipeline: factory sensors to Azure Data Lake
- Deploy GenAI maintenance knowledge base (pilot at 1 factory)
- Establish AI governance framework
- Train maintenance teams

**Decision gate**: Month 3 — measurable downtime reduction achieved?

### Phase 2: Expand & Operationalize (Months 4-9)

**Additional investment**: $250K-$350K

- Scale predictive maintenance to all instrumented equipment (40% fleet)
- Plan and procure sensors for remaining 60%
- Evolve knowledge base into maintenance assistant agent
- Hire data engineer; begin Azure AI certifications for IT staff
- Mature governance with model monitoring

**Decision gate**: Month 9 — >25% downtime reduction, >$150K/month savings?

### Phase 3: Full Fleet & Self-Sustaining (Months 9-18)

**Additional investment**: $500K-$1.5M+ (including sensor CAPEX)

- Install sensors on remaining critical equipment
- Deploy predictive maintenance fleet-wide
- Hire ML engineer/data scientist
- Reduce consulting to advisory retainer
- Evaluate secondary AI opportunities (quality control, energy)
- Target: self-sustaining internal AI capability

---

## 7. Investment Summary

### 3-Tier Options

| Tier | Scope | Staff Eng. Hours | Year 1 Investment | Expected Year 1 Benefit | Payback |
| --- | --- | --- | --- | --- | --- |
| Essential | Phase 1 pilot only | 280-400 hrs | $190K-$250K | $400K-$700K | 4-7 months |
| **Recommended** | Phase 1 + Phase 2 | 800-1,200 hrs | $440K-$600K | $1.2M-$1.8M | 5-8 months |
| Comprehensive | All 3 phases | 1,800-2,800 hrs | $1.3M-$2.65M | $1.6M-$2.2M | 10-16 months |

### Sensitivity Analysis (Full Program, 3-Year)

| Scenario | 3-Year Benefit | 3-Year Cost | 3-Year ROI | Payback |
| --- | --- | --- | --- | --- |
| Pessimistic (50%) | $9.3M | $3.26M | 184% | 14 months |
| Conservative (75%) | $13.9M | $3.26M | 326% | 10 months |
| Base Case | $18.5M | $3.26M | 468% | 7 months |
| Optimistic (130%) | $24.1M | $3.26M | 639% | 5 months |

**Break-even threshold**: 18% of projected benefits (4.5% downtime reduction).

**Cost of inaction**: $2M/month. Every month of delay costs more than the entire Phase 1 Essential investment.

---

## Appendices

### A. Industry Context (Manufacturing AI)

Per the manufacturing playbook, the most common AI opportunities in manufacturing align with our findings:
- **Predictive maintenance** (30-50% downtime reduction, medium complexity) — our primary recommendation
- **Quality control / visual inspection** (catches defects humans miss, 24/7) — Phase 3 candidate
- **Demand forecasting** (15-30% inventory cost reduction) — future opportunity
- **Maintenance documentation** (GenAI knowledge capture) — our secondary recommendation

Key manufacturing constraints addressed in our approach:
- OT/IT convergence handled via Azure IoT Hub/Edge
- Real-time requirements assessed (sub-second inference may need edge deployment)
- Safety-critical validation included in governance framework
- Legacy equipment sensor retrofit planned in Phase 2-3
- Downtime sensitivity addressed by scheduling installations during planned shutdowns

### B. Maturity Score to Engagement Approach Mapping

| Score Range | Stage | TitanWorks Position | Engagement Approach |
| --- | --- | --- | --- |
| **1.0-1.9** | **Foundation** | **1.68 (here)** | **Build foundations + embedded quick win** |
| 2.0-2.9 | Pilot-Ready | Target by month 9 | Expand proven use cases, build internal capability |
| 3.0-3.9 | Scale-Ready | Target by month 18 | Operationalize, multiple use cases, governance maturity |
| 4.0-5.0 | Optimize | Long-term aspiration | Advanced AI, competitive differentiation |

### C. Estimation Multipliers Applied

| Factor | Multiplier | Rationale |
| --- | --- | --- |
| First AI project for the organization | 1.3x | Extra time for education, change management, governance setup |
| Buy vs build offset | 0.6-0.7x | Commercial platform reduces custom development effort |
| Non-engineering overhead | +25% | Stakeholder alignment, training, change management |

### D. Regulatory Considerations

- **OSHA**: Safety monitoring AI (if pursued) must comply with workplace safety regulations
- **ISO 9001**: Quality management systems may require documentation of AI involvement in quality decisions
- **Environmental**: Energy optimization may have emissions reporting implications
- **No high-regulation constraints** (HIPAA, SOX, PCI) apply to core manufacturing operations, keeping compliance overhead low

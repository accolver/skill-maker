# AI Discovery Report: TitanWorks

---

## 1. Company Overview

**TitanWorks** is a mid-market manufacturer with $300M in annual revenue, 2,000 employees, and 4 factory locations. The company is experiencing $2M/month ($24M/year) in unplanned equipment downtime — approximately 8% of revenue lost to equipment failures, production stoppages, and reactive maintenance costs.

The company's technology landscape includes a recent Azure cloud migration (6 months old), a 25-person enterprise IT team focused on ERP and networking, and partial sensor coverage on 40% of critical equipment. The remaining 60% is monitored through manual operator inspections.

**Competitive context:** TitanWorks operates in a manufacturing sector where AI adoption is accelerating. Predictive maintenance, computer vision quality control, and demand forecasting are becoming table-stakes capabilities for manufacturers in the $200M-$500M range. Early movers are achieving 30-50% reductions in unplanned downtime and 15-30% improvements in inventory costs. TitanWorks has a window of opportunity to adopt these capabilities before they become competitive requirements.

**Political context:** A "digital transformation" initiative 18 months ago failed to deliver results, and the project lead left the company. This failure shapes the organizational dynamics: the CFO demands hard ROI evidence before committing budget, while plant managers remain enthusiastic about technology-enabled improvement. Any new initiative must be structurally distinct from the previous one in scope, measurement, and accountability.

For the full pre-engagement research, see [company-briefing.md](company-briefing.md).

---

## 2. AI Maturity Assessment

TitanWorks scores **1.55 out of 5.0** on the AI Maturity Model, placing them in the **Foundation** stage.

### Dimension Scores

| Dimension | Score | Weight | Weighted Score | Key Evidence |
| --- | --- | --- | --- | --- |
| Data | 1.5 / 5 | 25% | 0.375 | Sensor data on 40% of equipment; ERP data exists but not analytics-ready; manual monitoring data not digitized; no data catalog or governance |
| Infrastructure | 2.0 / 5 | 20% | 0.400 | Azure migration complete (foundation exists); no AI/ML services configured; OT/IT networks not bridged; no MLOps pipeline |
| Talent | 1.0 / 5 | 20% | 0.200 | 25-person IT team with zero data science/ML capability; no AI training budget; no analytics specialists |
| Governance | 1.0 / 5 | 20% | 0.200 | No AI policy; no model review process; no ethics framework; no compliance playbook for AI |
| Culture | 2.5 / 5 | 15% | 0.375 | Plant managers enthusiastic; CFO cautiously engaged; prior failure creates skepticism; individual attitudes unknown |
| **Aggregate** | **1.55** | **100%** | **1.55** | **Foundation stage — targeted pilot with commercial platform** |

### Gap Analysis

**Critical bottleneck: Talent (1.0)** — The single largest barrier to AI adoption. TitanWorks cannot execute any AI initiative with its current team. This must be addressed through vendor partnership (immediate) and capability building (Phases 2-3).

**Secondary bottleneck: Governance (1.0)** — No AI governance exists, but this is expected for a company that has never deployed AI. Governance should be established alongside the first deployment, not as a prerequisite.

**Pattern match: "High Culture, Low Talent"** — The organization wants AI but cannot execute. The prescribed approach is to partner externally while building internal capability over time.

For the full maturity assessment with scoring rationale and recommendations, see [ai-maturity-assessment.md](ai-maturity-assessment.md).

---

## 3. Stakeholder Findings

### Executive Perspective

The executive landscape presents a productive tension between operational enthusiasm and financial caution:

- **Plant managers (4)** are the strongest advocates. They experience the $2M/month downtime cost daily and want tools that help their teams prevent failures rather than react to them. Their credibility on the factory floor makes them the most effective internal champions. Appetite for change: **4/5**.

- **CFO** is not opposed to AI but requires quantitative evidence before committing. This posture is a direct consequence of the failed digital transformation and represents responsible financial stewardship. The CFO should be positioned as a co-architect of success criteria, not an obstacle. Their insistence on ROI evidence actually protects the initiative. Appetite for change: **2/5**.

### Department Pain Points

**Operations / Production** (Ranked by business impact):
1. Unplanned equipment downtime ($2M/month) — cascading schedule disruptions
2. Reactive maintenance model — technicians in fire-fighting mode
3. Manual equipment monitoring for 60% of assets — labor-intensive and unreliable
4. Spare parts inventory challenges — either overstocked or understocked
5. Inconsistent maintenance practices across 4 factories

**Maintenance / Reliability:**
1. Technician overload from emergency response
2. Diagnostic difficulty without comprehensive sensor data
3. Knowledge loss as experienced technicians retire
4. Maintenance scheduling conflicts with production
5. Scattered equipment documentation (manuals, bulletins)

**Finance:**
1. Unpredictable maintenance budgets
2. Difficult ROI tracking for capital equipment
3. Sunk cost from failed digital transformation
4. Insurance/warranty implications of unplanned failures

### Technical Landscape

| Area | Current State | AI Readiness Gap |
| --- | --- | --- |
| Cloud (Azure) | IaaS/PaaS workloads migrated | AI/ML services not provisioned |
| OT Network | SCADA/PLCs on isolated network | No data bridge to IT/cloud |
| Sensor Coverage | 40% of critical equipment | 60% blind spot on remaining assets |
| Data Architecture | ERP database + SCADA historians | No analytics data lake or warehouse |
| Analytics | Basic ERP dashboards | No advanced analytics |
| API Layer | Minimal between OT and IT | Must be built for AI integration |

**The critical technical prerequisite is the OT-to-Azure data pipeline.** Until sensor data flows from the factory floor to the cloud, no AI model can be trained or served. This is the first thing that must be built.

### Frontline Insights

Maintenance technicians and machine operators experience the downtime problem most acutely. Key themes:
- Too much time on emergency response, not enough on prevention
- Difficulty accessing equipment history and documentation during diagnosis
- Shift handoff information loss
- Senior technicians carrying irreplaceable diagnostic knowledge
- Willingness to adopt new tools if they demonstrably reduce emergency workload

For the full stakeholder discovery, see [stakeholder-discovery.md](stakeholder-discovery.md).

---

## 4. Risk Assessment

Five risks were identified during assessment. None are critical (engagement-stopping), but all must be actively managed.

| # | Risk | Severity | Mitigation Strategy |
| --- | --- | --- | --- |
| 1 | Failed digital transformation history | Medium-High | Diagnose what went wrong; structurally differentiate this engagement (smaller scope, hard metrics, phased investment, go/no-go gates) |
| 2 | Zero data science capability | High | Buy (commercial platform), not build; vendor-managed model operations; internal capability building over 12-18 months |
| 3 | CFO requires hard ROI before committing | Medium | Provide sensitivity analysis (delivered); frame cost of inaction ($2M/month); phased investment with Phase 1 as a $245K proof point |
| 4 | No unified data architecture | Medium-High | Build narrow data pipeline for pilot (not enterprise data strategy); OT/IT bridge as a specific Phase 1 workstream |
| 5 | Partial sensor coverage (40%) | Medium | Start with instrumented equipment; prioritize sensor retrofit by failure cost in Phase 2 |

**Net assessment:** The risk profile is manageable. The combination of risks mandates a specific approach: buy (not build), small scope first, data pipeline before models, phased investment, and change management as a first-class workstream.

For the full risk assessment with detailed mitigation plans, see [red-flags.md](red-flags.md).

---

## 5. Opportunity Matrix

Eight AI opportunities were identified, scored on business impact (1-5) and feasibility (1-5), and categorized into four quadrants.

### Quick Wins (High Impact, High Feasibility)

**1. Predictive Maintenance on Instrumented Equipment**
- Impact: 5 | Feasibility: 4 | Combined: 9
- Directly addresses the $24M/year problem with proven technology
- Commercial platforms (Senseye, Augury, SparkCognition, Azure ML) deliver 30-50% downtime reduction
- Conservative estimate: $2.9M-$5.0M annual savings
- **Recommendation: Buy.** Zero data science capability makes custom build inappropriate. Azure-ecosystem vendors preferred given recent migration.
- GenAI vs. Traditional ML: **Traditional ML** (time-series anomaly detection, survival analysis)
- Time to value: 60-90 days

**2. Maintenance Knowledge Base (GenAI)**
- Impact: 3 | Feasibility: 4 | Combined: 7
- RAG-based system over equipment manuals, work orders, and troubleshooting guides
- Reduces MTTR by 20-30%, preserves institutional knowledge
- Estimated $1.2M-$2M annual benefit
- **Recommendation: Buy for MVP** (Azure AI Search + Azure OpenAI Service), evaluate custom build for Phase 2
- GenAI vs. Traditional ML: **GenAI** (natural language retrieval and generation)
- Agent potential: High in Phase 2-3
- Time to value: 30-60 days

### Strategic Bets (High Impact, Lower Feasibility)

**3. Sensor Expansion + Extended Predictive Maintenance**
- Impact: 5 | Feasibility: 3 | Combined: 8
- Extends coverage from 40% to 80-90% of critical equipment
- Requires sensor hardware procurement, installation, and 3-6 months data collection
- Estimated $3M-$6M additional annual savings
- **Phase 2 initiative**

**4. Visual Quality Inspection (Computer Vision)**
- Impact: 4 | Feasibility: 2.5 | Combined: 6.5
- Requires labeled image data that likely does not exist today
- Estimated $500K-$1.5M annual benefit
- **Phase 3 initiative**

**7. Supply Chain Optimization**
- Impact: 4 | Feasibility: 2 | Combined: 6
- High complexity, requires broad data integration
- **Phase 3+ initiative**

### Fill-Ins (Lower Impact, Higher Feasibility)

**5. Demand Forecasting** — Impact: 3.5, Feasibility: 3. ERP-integrated forecasting. Phase 3.
**6. Energy Optimization** — Impact: 3, Feasibility: 2.5. Requires energy metering data. Phase 3+.

### Deprioritized

**8. Digital Twin / Process Simulation** — Impact: 4, Feasibility: 1.5. Requires maturity level 3+. Revisit in 18-24 months.

For the full opportunity matrix with detailed scoring rationale, build vs. buy analysis, and sequencing recommendations, see [opportunity-matrix.md](opportunity-matrix.md).

---

## 6. Recommended Roadmap

### Phase 1: Foundation and Quick Win (Month 1-3) — $245K

| Workstream | Deliverable | Success Metric |
| --- | --- | --- |
| Predictive Maintenance Pilot | Working system on Factory 1 instrumented equipment | >=50% anomaly prediction accuracy, >=1 avoided downtime event |
| Data Pipeline | OT-to-Azure sensor data pipeline (reusable template) | Sensor data flowing with <5 min latency |
| Knowledge Base MVP | GenAI technician assistant for Factory 1 | >=50 queries/week by Month 3 |
| Baseline & Change Mgmt | Documented metrics baseline, stakeholder communication | All metrics baselined, team briefed |
| **Go/No-Go Gate** | **Phase 2 recommendation with supporting data** | **CFO and Plant Managers approve Phase 2** |

### Phase 2: Expand and Operationalize (Month 4-9) — $800K

| Workstream | Deliverable | Success Metric |
| --- | --- | --- |
| Sensor Expansion | 60-80 new sensors on priority equipment | Monitoring coverage at 70-80% |
| 4-Factory Rollout | Predictive maintenance operational at all sites | All factories live with unified dashboard |
| Knowledge Base Enhancement | Agent capabilities, all-factory coverage | All technicians actively using |
| Capability Building | Trained AI liaisons, data engineer hired | Internal team handling day-to-day operations |
| **Go/No-Go Gate** | **Phase 3 recommendation** | **>=20% aggregate downtime reduction** |

### Phase 3: Scale and Differentiate (Month 9-18) — $950K

| Workstream | Deliverable | Success Metric |
| --- | --- | --- |
| Quality Inspection | Computer vision on 1-2 priority lines | Quality cost reduction >=15% |
| Demand Forecasting | ERP-integrated forecasting model | Planning accuracy improvement >=15% |
| Internal AI Team | 3-person team operating independently | Vendor dependency reduced to advisory |
| Year 2 Strategy | Strategic roadmap for advanced capabilities | Executive-approved Year 2 plan |

For the full roadmap with detailed timelines, resource requirements, dependencies, and decision criteria, see [roadmap.md](roadmap.md).

---

## 7. Investment Summary

### Three-Tier Pricing

| Tier | Scope | Total Investment | Annual Benefit | Payback | 3-Year ROI |
| --- | --- | --- | --- | --- | --- |
| **Essential** | Phase 1 only: 1 factory pilot + knowledge base | $245K (+ $80K/yr ongoing) | $3.4M | ~1 month | 2,452% |
| **Recommended** | Phase 1 + 2: All factories + sensor expansion | $1.05M (Y1) + $430K (Y2) | $6.2M | 3.5 months | 940% |
| **Comprehensive** | All phases: Full program with quality + forecasting | $1.63M (Y1) + $1.09M (Y2) | $12M at maturity | 3.7 months | 708% |

### Sensitivity Analysis Summary (Recommended Tier)

| Scenario | Annual Benefit | Payback | 3-Year ROI |
| --- | --- | --- | --- |
| Worst Case (25% of projected) | $1.6M | 14 months | 60% |
| Pessimistic (50% of projected) | $3.1M | 7 months | 320% |
| Conservative (75% of projected) | $4.7M | 4.6 months | 580% |
| Base Case (100%) | $6.2M | 3.5 months | 940% |
| Optimistic (125%) | $7.8M | 2.8 months | 1,100% |

Even the worst realistic case (50% benefits, 50% cost overrun simultaneously) yields 246% 3-year ROI.

For the full ROI analysis with cost models, benefit calculations, sensitivity scenarios, and risk factors, see [roi-analysis.md](roi-analysis.md).

For the three-tier proposal with detailed scope, timeline, and investment for each tier, see [proposal.md](proposal.md).

---

## Appendices

### A: Assessment Methodology

This assessment was conducted based on provided company information including organizational profile, technology landscape, staffing, financial context (unplanned downtime costs), and political context (failed digital transformation, CFO concerns). Findings were cross-referenced against:
- AI maturity model framework (5 dimensions, 5 levels each)
- Manufacturing industry AI playbook (common opportunities, constraints, red flags)
- Industry benchmarks from McKinsey, Deloitte, and IoT Analytics on predictive maintenance outcomes
- Pricing benchmarks for AI consulting engagements and commercial platforms

### B: Competitive AI Landscape

Manufacturing sector AI adoption is accelerating in three primary areas:
1. **Predictive maintenance** — Led by Siemens, GE, Caterpillar. Mid-market adoption via platforms like Senseye, Augury, SparkCognition, Uptake.
2. **Computer vision quality** — Led by Landing AI, Cognex, Keyence. Becoming accessible to mid-market through cloud-based platforms.
3. **Supply chain optimization** — Led by Kinaxis, o9 Solutions, Blue Yonder. Complex integration requirements limit mid-market adoption speed.

TitanWorks' competitors in the $200M-$500M range are likely in early stages. Moving now creates a 12-18 month competitive advantage in operational efficiency.

### C: Technology Assessment Details

**Azure Services Relevant to TitanWorks' AI Journey:**
- Azure IoT Hub / IoT Edge — sensor data ingestion and edge processing
- Azure Data Lake Storage — raw data storage for analytics
- Azure Machine Learning — model training and serving (used by platform vendors)
- Azure AI Search + Azure OpenAI Service — knowledge base RAG pipeline
- Azure Monitor + Application Insights — system monitoring
- Power BI — operational dashboards

**Predictive Maintenance Platform Shortlist for Evaluation:**
1. Senseye (Siemens) — purpose-built predictive maintenance, strong Azure integration
2. Augury — machine health platform, fast deployment, vibration/temperature focus
3. SparkCognition — industrial AI platform, multiple data type support
4. Azure IoT + Azure ML (native build) — maximum Azure integration, more configuration required

### D: Regulatory Considerations

- **OSHA**: AI monitoring safety-critical equipment must maintain or improve workplace safety standards
- **ISO 9001**: Quality management system implications for AI-modified quality processes
- **Environmental**: Process optimization affecting emissions requires EPA/state compliance verification
- **OT/IT Security**: IEC 62443 and NIST Cybersecurity Framework for industrial control system security
- **Industry-specific standards** (to be confirmed): AS9100 (aerospace), IATF 16949 (automotive), FDA 21 CFR Part 11 (food/pharma) may apply depending on TitanWorks' manufacturing sector

# AI Discovery Report: TitanWorks

## 1. Company Overview

**TitanWorks** is a mid-market manufacturing company with 2,000 employees, $300M in annual revenue, and 4 factory facilities. The company recently completed a migration to Microsoft Azure (6 months ago) and operates a 25-person enterprise IT team focused on ERP and networking.

The engagement was triggered by a specific, quantified business problem: **unplanned equipment downtime costing $2M/month ($24M/year)**. Approximately 40% of critical equipment has sensor instrumentation; the remaining 60% is monitored through manual inspections.

**Key context**: A digital transformation initiative 18 months ago was considered a failure, and the project lead left the company. The CFO requires hard ROI numbers with sensitivity analysis before committing budget. Plant managers across all 4 factories are enthusiastic about AI-driven solutions.

**Industry context**: Manufacturing is experiencing widespread AI adoption, particularly in predictive maintenance, quality control, and supply chain optimization. TitanWorks' competitors are likely pursuing similar capabilities, making this both an operational improvement and competitive positioning decision.

---

## 2. AI Maturity Assessment

### Dimension Scores

| Dimension | Weight | Score | Level Name | Key Evidence |
| --- | --- | --- | --- | --- |
| Data | 25% | 2 | Managed | Sensor data exists on 40% of equipment; ERP data available; no data warehouse, catalog, or quality standards |
| Infrastructure | 20% | 2 | Transitioning | Azure migration complete; no IoT pipeline, no ML infrastructure, no APIs for AI integration |
| Talent | 20% | 1 | No AI Skills | 25-person IT team is entirely enterprise IT; zero data science, ML, or analytics capability |
| Governance | 20% | 1 | None | No AI policy, no ethics framework, no model review process, no AI-specific compliance |
| Culture | 15% | 2.5 | Curious-Supportive | Plant managers enthusiastic; CFO engaged but cautious; previous failure creates headwind |
| **Aggregate** | **100%** | **1.7** | **Foundation** | |

### Aggregate Score Calculation

```
Aggregate = (2 × 0.25) + (2 × 0.20) + (1 × 0.20) + (1 × 0.20) + (2.5 × 0.15) = 1.675 ≈ 1.7
```

### Engagement Approach (Score-Driven)

A score of 1.7 places TitanWorks in the **Foundation** stage:
- Focus on data strategy, infrastructure planning, and executive education
- 6-12 month horizon before meaningful AI at scale
- BUT: The $2M/month downtime cost and existing sensor data justify an accelerated quick win on the already-instrumented 40% while foundation work proceeds in parallel

### Gap Analysis

**Primary bottleneck: Talent (Score 1)**
Pattern match: "High culture, low talent" — organization wants AI but cannot execute. Mitigation: partner externally for immediate needs, hire for medium-term capability.

**Secondary bottleneck: Governance (Score 1)**
Will block scaling beyond pilot. Mitigation: establish lightweight governance in Phase 1, mature it as AI deployment expands.

---

## 3. Stakeholder Findings

### Executive Perspective

- **CFO** demands hard ROI with sensitivity analysis. Not opposed to investment but requires defensible business case. Appetite for change: 3/5.
- **Plant managers** are enthusiastic champions. They experience the $2M/month pain daily and actively want AI solutions. Appetite for change: 4-5/5.
- **Gap**: No explicitly identified C-level AI executive sponsor. Plant managers provide operational sponsorship but may lack budget authority.

### Department Pain Points

| Department | Top Pain Points | Priority |
| --- | --- | --- |
| Maintenance/Operations | Unplanned downtime ($2M/month); manual monitoring of 60% of equipment; reactive maintenance culture; tribal knowledge concentration | Critical |
| IT | Zero data science capability; Azure still new (6 months); expected to support AI without training | High |
| Finance | Previous initiative failure consumed budget without return; CFO risk-averse on technology investments | High |

### Technical Landscape

- **Cloud**: Azure (6 months); basic services; no AI/ML workloads deployed
- **OT Systems**: SCADA/historians on 40% instrumented equipment; PLCs; OT/IT network separation likely
- **ERP**: Enterprise system managing maintenance records, parts inventory, production data
- **Data readiness**: Sensor data exists but is likely trapped in OT network; maintenance records in ERP are usable; manual inspection logs are inconsistent
- **Integration constraints**: OT/IT gap is the primary technical barrier; ERP integration needed for work order automation

### Frontline Insights

- Maintenance technicians hold critical diagnostic knowledge not captured in any system
- Manual inspection rounds are labor-intensive and miss emerging issues
- Operators have informal equipment monitoring methods based on experience
- Expected mixed AI attitudes: senior technicians may feel threatened; younger staff likely receptive

---

## 4. Risk Assessment

### Red Flags

| Red Flag | Severity | Mitigation |
| --- | --- | --- |
| Previous failed digital transformation (18 months ago) | High | Address directly; phase the engagement; deliver visible results in 90 days; over-communicate progress |
| Zero data science capability | High | SaaS-first approach; external partners; hire data engineer in Phase 2, AI/ML lead in Phase 3 |
| CFO requires hard ROI before committing | Medium | Provide sensitivity analysis with 4 scenarios; anchor to $2M/month baseline; show 6% break-even point |
| Partial sensor coverage (40%) | Medium | Phase 1 targets instrumented equipment only; Phase 2 expands coverage |
| No AI governance framework | Medium | Establish lightweight governance in Phase 1; mature progressively |

### Positive Indicators

| Indicator | Signal Strength |
| --- | --- |
| Strong operational champions (plant managers at all 4 factories) | High |
| Clear, quantified business problem ($2M/month) | High |
| Existing sensor infrastructure on 40% of critical equipment | Medium-High |
| Recent Azure migration providing cloud foundation | Medium-High |
| CFO is engaged (asking for numbers, not refusing to discuss) | Medium |
| Strong industry precedent for predictive maintenance ROI | Medium |

---

## 5. Opportunity Matrix

### Quick Wins (High Impact, High Feasibility)

**1. Predictive Maintenance on Instrumented Equipment**
- Impact: 5 | Feasibility: 4
- Estimated benefit: $3.4M/year (35% downtime reduction on 40% of equipment)
- Approach: SaaS PdM platform (Augury, Uptake, or similar) + Azure IoT pipeline
- Build vs Buy: **Buy** (SaaS) — zero data science staff makes custom build nonviable
- GenAI vs Traditional ML: **Traditional ML** (time-series analysis, anomaly detection)
- Agent potential: **Medium-term** — future evolution to autonomous work order generation
- Time to first value: 90 days

**2. Maintenance Knowledge Base (GenAI)**
- Impact: 3 | Feasibility: 4
- Estimated benefit: $700K/year (15% MTTR reduction + knowledge capture)
- Approach: Azure OpenAI + Azure AI Search RAG pipeline over maintenance documentation
- Build vs Buy: **Build on platform** (Azure OpenAI) or **Buy** SaaS (Augmentir, Dozuki)
- GenAI vs Traditional ML: **GenAI** (natural language search and generation)
- Agent potential: **High** — maintenance assistant agent integrating PdM alerts with diagnostic guidance
- Time to first value: 60 days

### Strategic Bets (High Impact, Lower Feasibility)

**3. Sensor Expansion to 100% Coverage**
- Impact: 5 | Feasibility: 2
- Estimated incremental benefit: $5.6M/year
- Approach: Phased sensor procurement and installation; integrate with existing PdM platform
- Build vs Buy: **Buy** (sensor hardware + integration services)
- GenAI vs Traditional ML: **Traditional ML** (same as Opportunity 1)
- Agent potential: Same as Opportunity 1
- Timeline: Phase 2-3 (Months 4-14)

**4. Quality Control — Visual Inspection AI**
- Impact: 4 | Feasibility: 2
- Estimated benefit: 20-40% reduction in defect escape rate
- Approach: Turnkey visual inspection platform (Cognex, Landing AI)
- Build vs Buy: **Buy** — requires computer vision expertise TitanWorks doesn't have
- GenAI vs Traditional ML: **Traditional ML** (computer vision)
- Agent potential: Low-Medium
- Timeline: Phase 3 (Months 10-18)

**5. Safety Monitoring**
- Impact: 4 | Feasibility: 2
- Approach: Computer vision safety platforms (Intenseye, Protex AI)
- Build vs Buy: **Buy**
- GenAI vs Traditional ML: **Traditional ML**
- Agent potential: Low (safety-critical decisions should involve humans)
- Timeline: Post-roadmap

### Fill-ins (Lower Priority)

**6. Demand Forecasting** (Impact: 3, Feasibility: 3)
- Build vs Buy: **Check if ERP has existing capability first**; Azure ML as alternative
- GenAI vs Traditional ML: **Traditional ML**
- Agent potential: Low

**7. Energy Optimization** (Impact: 2, Feasibility: 3)
- Build vs Buy: **Buy** (Schneider Electric, Siemens platforms)
- GenAI vs Traditional ML: **Traditional ML**
- Agent potential: Medium

**8. Supplier Communication Agent** (Impact: 2, Feasibility: 3)
- Build vs Buy: **Check if Microsoft 365 Copilot is licensed**
- GenAI vs Traditional ML: **GenAI**
- Agent potential: High

---

## 6. Recommended Roadmap

### Phase 1: Foundation & Quick Win (Months 1-3)
- Deploy PdM on instrumented equipment (40%)
- Build Azure IoT data pipeline
- Launch maintenance knowledge base
- Establish AI governance foundation
- **Investment: $650K-$880K** | **Target: measurable downtime reduction by Month 3**

### Phase 2: Expand & Operationalize (Months 4-9)
- Sensor expansion to 60-70% coverage
- PdM model optimization with accumulated data
- Hire data engineer; begin internal capability building
- Governance maturation
- **Investment: $1.0M-$1.3M** | **Target: 25-30% downtime reduction on instrumented equipment**

### Phase 3: Scale & Differentiate (Months 9-18)
- Complete sensor coverage (100%)
- Visual inspection pilot on highest-volume line
- Automated maintenance workflow (agent)
- Hire AI/ML team lead
- **Investment: $1.0M-$1.5M** | **Target: 35-50% downtime reduction across all equipment**

Each phase has go/no-go decision gates with explicit success criteria.

---

## 7. Investment Summary

### Three-Tier Options

| Tier | Scope | Investment | Annual Benefit (Steady State) | Payback |
| --- | --- | --- | --- | --- |
| Essential | Phase 1 only | $650,000 | $3,400,000 | 5-6 months |
| Recommended | Phase 1 + 2 | $1,800,000 | $6,500,000 | 8-10 months |
| Comprehensive | All phases | $3,200,000 | $10,500,000 | 9-12 months |

### Sensitivity Analysis Summary

| Scenario | 3-Year ROI (Comprehensive) | Payback |
| --- | --- | --- |
| Pessimistic (15% reduction) | 67% | 18-20 months |
| Conservative (25% reduction) | 178% | 11-13 months |
| Base Case (35% reduction) | 289% | 8-10 months |
| Optimistic (50% reduction) | 456% | 5-7 months |

**Break-even: ~6% downtime reduction** (industry minimum: 30%).

**Cost of inaction**: $72-79M in unplanned downtime over 3 years.

---

## Appendices

### A. Industry Context
Predictive maintenance is one of the most proven AI use cases in manufacturing, with 10+ years of deployment history and documented ROI. Key industry benchmarks: 30-50% unplanned downtime reduction, 10-15% equipment life extension, 20-30% maintenance cost reduction. See industry playbook for full manufacturing AI opportunity landscape.

### B. Manufacturing-Specific Constraints Addressed
- **OT/IT convergence**: Addressed through Azure IoT Hub edge gateway architecture
- **Real-time requirements**: PdM uses batch/near-real-time processing (sufficient for maintenance planning); edge processing not required for Phase 1
- **Safety-critical systems**: PdM recommendations are advisory, not autonomous; human decision remains in the loop
- **Legacy equipment**: Phase 2 sensor expansion addresses uninstrumented legacy equipment; sensor selection accounts for retrofit constraints
- **Downtime for installation**: Sensor installation can be scheduled during planned maintenance windows

### C. Technology Recommendations
- **PdM Platform**: Evaluate Augury, Uptake, SparkCognition, Senseye; select based on Azure integration, manufacturing-specific models, and ease of deployment
- **IoT Infrastructure**: Azure IoT Hub + Azure Stream Analytics + Azure Data Lake
- **GenAI**: Azure OpenAI + Azure AI Search for maintenance knowledge base
- **Visual Inspection** (Phase 3): Evaluate Cognex ViDi, Landing AI, Instrumental

### D. Regulatory Considerations
- OSHA compliance for AI monitoring safety-critical processes
- EPA environmental monitoring integration potential
- Industry-specific quality certifications (ISO 9001, etc.) — AI systems must support, not undermine, certification requirements

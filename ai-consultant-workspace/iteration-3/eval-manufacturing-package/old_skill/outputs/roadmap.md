# AI Implementation Roadmap: TitanWorks

## Phase 1: Foundation & Quick Win (Months 1-3)

**Goal:** Demonstrate measurable downtime reduction on existing instrumented equipment and rebuild organizational trust in technology-driven initiatives.

### Workstreams

#### 1A: Azure IoT Data Pipeline
Build the data bridge from factory floor to cloud. Connect sensor data from all 4 factories to Azure IoT Hub, stream through Azure Stream Analytics, and land in Azure Data Lake for analytics and PdM platform consumption.

- **Week 1-2**: Assess OT network architecture across 4 factories; identify connectivity path from SCADA/historians to Azure IoT Hub
- **Week 3-4**: Deploy Azure IoT Hub; configure edge gateways at each factory for secure data transmission
- **Week 5-8**: Build streaming pipeline (IoT Hub -> Stream Analytics -> Data Lake); validate data quality and completeness
- **Week 8-10**: Integrate data pipeline with PdM platform; validate end-to-end data flow
- **Expected outcome**: Real-time sensor data from all instrumented equipment (40%) flowing to Azure cloud

#### 1B: Predictive Maintenance Platform Deployment
Deploy a SaaS predictive maintenance platform on all instrumented equipment across 4 factories.

- **Week 1-3**: Evaluate and select PdM vendor (Augury, Uptake, SparkCognition, or Azure-native); negotiate contract
- **Week 4-8**: Configure platform for TitanWorks equipment types; ingest historical sensor and maintenance data
- **Week 6-10**: Deploy baseline models; begin monitoring predictions against actual outcomes
- **Week 10-12**: Tune models; begin integrating PdM alerts into maintenance workflow; first performance report
- **Expected outcome**: Operational PdM system generating maintenance recommendations on 40% of critical equipment

#### 1C: Maintenance Knowledge Base (GenAI)
Build a GenAI-powered knowledge base using Azure OpenAI and Azure AI Search (RAG pipeline) over equipment manuals, maintenance records, and technician expertise.

- **Week 1-4**: Inventory and digitize equipment manuals, vendor documentation, and historical maintenance records
- **Week 3-6**: Build RAG pipeline (Azure OpenAI + AI Search); index documents; develop conversational interface
- **Week 6-8**: Pilot with 10-15 maintenance technicians across 2 factories; collect feedback
- **Week 8-12**: Refine based on feedback; expand to all factories; capture additional tribal knowledge
- **Expected outcome**: Searchable, conversational maintenance knowledge base accessible to all technicians

#### 1D: Governance & Change Management Foundation
Establish minimum viable AI governance and run change management to support adoption.

- **Week 1-4**: Draft AI use policy; define approval process for new AI tools; establish data governance basics
- **Week 2-6**: Run AI literacy workshops for IT team (25 people) and plant managers
- **Week 4-8**: Train maintenance technicians on PdM platform and knowledge base
- **Week 8-12**: Establish monitoring and reporting cadence; define escalation process for AI system issues
- **Expected outcome**: Lightweight governance framework and trained user base

### Phase 1 Milestones

| Milestone | Target Date | Success Criteria |
| --- | --- | --- |
| IoT pipeline live (all 4 factories) | Month 1 | Sensor data from instrumented equipment streaming to Azure |
| PdM vendor selected and contracted | Month 1 | Vendor evaluation complete, contract signed |
| PdM platform operational | Month 2 | Generating predictions on instrumented equipment |
| Knowledge base pilot launched | Month 2 | 10-15 technicians actively using system |
| AI governance framework approved | Month 2 | AI use policy signed off by leadership |
| Phase 1 performance report | Month 3 | Measured downtime reduction vs baseline |

### Phase 1 Success Metrics
- Downtime reduction (target: 10-15% on instrumented equipment by Month 3)
- PdM prediction accuracy (target: >70% true positive rate)
- Knowledge base adoption (target: >50% of technicians using weekly)
- Training completion (target: 100% of IT team and maintenance leads)

### Phase 1 Decision Gate (Month 3)
**Question**: Has PdM delivered measurable value on instrumented equipment?
**Proceed to Phase 2 if**: Downtime reduction is measurable and trending positive, PdM predictions are demonstrating accuracy, and no critical blockers exist.
**Adjust if**: Results are below expectations — investigate root cause (data quality? model accuracy? adoption?) before expanding scope.

---

## Phase 2: Expand & Operationalize (Months 4-9)

**Goal:** Extend sensor coverage, scale PdM to more equipment, build internal data capability, and operationalize governance.

### Workstreams

#### 2A: Sensor Expansion (Priority Equipment)
Instrument the highest-priority uninstrumented equipment based on downtime impact analysis.

- **Month 4**: Complete equipment prioritization — rank uninstrumented equipment by downtime cost, failure frequency, and criticality
- **Month 4-5**: Procure sensors and edge gateways for first batch (target: expand from 40% to 60-70% coverage)
- **Month 5-7**: Install sensors; integrate with existing IoT pipeline; validate data flow
- **Month 7-9**: Extend PdM models to newly instrumented equipment; begin monitoring
- **Expected outcome**: 60-70% of critical equipment under PdM monitoring

#### 2B: PdM Model Optimization
Refine and improve predictive models using accumulated operational data.

- **Month 4-6**: Analyze 3+ months of prediction vs actual outcome data; identify model improvement opportunities
- **Month 6-8**: Retrain models with accumulated data; improve accuracy for specific equipment types
- **Month 8-9**: Deploy improved models; measure performance improvement
- **Expected outcome**: Higher prediction accuracy and lower false positive rate

#### 2C: Internal Capability Building
Begin building in-house data and AI capability.

- **Month 4-5**: Define data engineer job description; begin recruiting (or engage contract data engineer)
- **Month 5-7**: Onboard data engineer; transfer IoT pipeline management from consultant to internal team
- **Month 6-9**: Begin scoping AI/ML lead role for Phase 3 hiring
- **Month 4-9**: Ongoing AI literacy training for IT team; advanced training for designated AI liaisons
- **Expected outcome**: At least 1 data engineer onboard; IT team able to manage IoT pipeline and basic PdM platform operations

#### 2D: Governance Maturation
Evolve AI governance from minimum viable to operational.

- **Month 4-6**: Implement AI model monitoring (drift detection, accuracy tracking)
- **Month 6-8**: Establish quarterly AI review process (model performance, risk assessment, improvement planning)
- **Month 8-9**: Define approval and review process for Phase 3 AI initiatives
- **Expected outcome**: Active governance program with monitoring, reporting, and decision-making processes

### Phase 2 Milestones

| Milestone | Target Date | Success Criteria |
| --- | --- | --- |
| Equipment prioritization complete | Month 4 | Ranked list with business case for sensor expansion |
| Sensor procurement approved | Month 4 | Budget and vendor for first expansion batch |
| Data engineer hired/contracted | Month 5 | Internal data pipeline capability building |
| First expansion sensors operational | Month 7 | New sensors streaming data to PdM platform |
| 6-month ROI report | Month 7 | Updated ROI tracking vs projections |
| Phase 2 performance review | Month 9 | Comprehensive assessment of PdM coverage and performance |

### Phase 2 Success Metrics
- Equipment coverage (target: 60-70% under PdM)
- Cumulative downtime reduction (target: 25-30% on instrumented equipment)
- PdM prediction accuracy (target: >80% true positive rate)
- Internal capability (target: 1 data engineer operational, IoT pipeline managed internally)
- Governance (target: model monitoring active, quarterly review cadence established)

### Phase 2 Decision Gate (Month 9)
**Question**: Is PdM delivering expected ROI and is the organization ready to scale further?
**Proceed to Phase 3 if**: ROI is tracking to plan, sensor expansion is on schedule, and internal capability is building.
**Adjust if**: ROI below expectations or organizational capacity is constrained — consider extending Phase 2 rather than expanding scope.

---

## Phase 3: Scale & Differentiate (Months 9-18)

**Goal:** Achieve full sensor coverage, deploy advanced AI capabilities (visual inspection, automated workflows), and establish long-term AI capability.

### Workstreams

#### 3A: Complete Sensor Coverage
Instrument all remaining critical equipment (target: 100% coverage).

- **Month 9-12**: Procure and install sensors for remaining 30-40% of equipment
- **Month 12-14**: Integrate with PdM platform; begin monitoring
- **Month 14-16**: Optimize models for full equipment fleet
- **Expected outcome**: 100% of critical equipment under PdM monitoring across all 4 factories

#### 3B: Visual Inspection AI Pilot
Deploy computer vision quality control on highest-volume production line.

- **Month 10-12**: Select visual inspection vendor (Cognex, Landing AI); design system for target production line
- **Month 12-14**: Install camera hardware; collect training images; configure models
- **Month 14-16**: Pilot operation alongside human inspectors; validate accuracy
- **Month 16-18**: Full deployment on pilot line; plan expansion to additional lines
- **Expected outcome**: AI visual inspection operational on 1 production line with validated performance

#### 3C: Automated Maintenance Workflow (Agent)
Build the predictive maintenance agent: PdM alert -> work order generation -> parts check -> technician notification.

- **Month 12-15**: Design agent workflow; integrate PdM platform with ERP maintenance module
- **Month 15-17**: Pilot automated work order generation with human approval gate
- **Month 17-18**: Evaluate for full automation vs human-in-the-loop based on accuracy
- **Expected outcome**: Semi-automated maintenance workflow reducing administrative burden on maintenance planners

#### 3D: Long-Term AI Capability
Establish in-house AI team and long-term roadmap.

- **Month 9-12**: Hire AI/ML team lead
- **Month 12-15**: AI/ML lead assesses capability gaps; develops 3-year AI roadmap
- **Month 15-18**: Begin building 3-5 person data science team (or confirm ongoing partner model)
- **Expected outcome**: AI/ML leadership in place with a roadmap for continued AI investment beyond this engagement

### Phase 3 Milestones

| Milestone | Target Date | Success Criteria |
| --- | --- | --- |
| Full sensor coverage achieved | Month 14 | 100% of critical equipment instrumented and streaming data |
| Visual inspection pilot live | Month 14 | Camera system operational on target production line |
| Automated maintenance workflow pilot | Month 15 | Agent generating draft work orders from PdM alerts |
| AI/ML lead hired | Month 12 | Internal AI leadership in place |
| 12-month comprehensive ROI report | Month 12 | Full ROI analysis vs all scenarios in sensitivity analysis |
| 18-month program assessment | Month 18 | Comprehensive program review; next-phase planning |

### Phase 3 Success Metrics
- Equipment coverage (target: 100% under PdM)
- Annual downtime reduction (target: 35-50% across all equipment)
- Visual inspection defect detection rate (target: >90% accuracy on pilot line)
- Automated work order accuracy (target: >85% requiring no manual correction)
- Internal team (target: AI/ML lead + 1-2 additional hires)

---

## Dependencies

| Dependency | Phase | Impact | Mitigation |
| --- | --- | --- | --- |
| OT/IT network connectivity at all 4 factories | Phase 1 | Blocks IoT pipeline | Assess in Week 1; prioritize factories with best connectivity |
| PdM vendor selection and contracting | Phase 1 | Delays deployment | Start evaluation immediately; have backup vendor identified |
| CFO budget approval for Phase 1 | Phase 1 | Blocks start | ROI analysis and sensitivity analysis designed for CFO approval |
| Sensor hardware procurement lead time | Phase 2 | Delays expansion | Order early; identify backup suppliers |
| Data engineer hiring | Phase 2 | Delays internal capability | Engage contractor as bridge if hiring is slow |
| Phase 1 performance results | Phase 2 | Go/no-go gate | Manage expectations; conservative projections |
| AI/ML lead hiring | Phase 3 | Delays internal capability | Begin recruiting in Phase 2; use partner team as bridge |

## Decision Points

| Gate | Date | Decision | Criteria |
| --- | --- | --- | --- |
| Phase 1 Review | Month 3 | Proceed to Phase 2? | Measurable downtime reduction; PdM predictions accurate; knowledge base adopted |
| Phase 2 Mid-Point | Month 6 | Adjust sensor expansion plan? | Sensor expansion on schedule; ROI tracking to plan |
| Phase 2 Review | Month 9 | Proceed to Phase 3? | 25-30% downtime reduction; internal data engineer operational; governance active |
| Phase 3 Mid-Point | Month 12 | Adjust scope or timeline? | Full coverage on track; visual inspection pilot progressing; AI/ML lead hired |
| Program Review | Month 18 | Future investment plan? | Comprehensive ROI assessment; organizational AI maturity re-assessment; 3-year roadmap |

---

## Maturity Progression

| Dimension | Current (Month 0) | Phase 1 Target (Month 3) | Phase 2 Target (Month 9) | Phase 3 Target (Month 18) |
| --- | --- | --- | --- | --- |
| Data | 2 (Managed) | 2.5 | 3 (Defined) | 3.5 |
| Infrastructure | 2 (Transitioning) | 2.5 | 3 (Cloud-Ready) | 3.5 |
| Talent | 1 (No AI Skills) | 1.5 | 2 (Emerging) | 3 (Building) |
| Governance | 1 (None) | 2 (Reactive) | 2.5 | 3 (Proactive) |
| Culture | 2.5 (Curious-Supportive) | 3 (Supportive) | 3.5 | 4 (Embracing) |
| **Aggregate** | **1.7** | **2.1** | **2.7** | **3.3** |

By the end of the 18-month roadmap, TitanWorks moves from **Foundation (1.7)** to **Scale-Ready (3.3)**, positioning the organization to operationalize AI at enterprise scale and pursue advanced use cases independently.

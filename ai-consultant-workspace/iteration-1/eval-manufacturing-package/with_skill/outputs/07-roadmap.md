# AI Implementation Roadmap: TitanWorks

**Based on Tier 2 (Recommended): Multi-Factory Predictive Maintenance + Knowledge Base**
**Total Duration:** 12 months (6-month implementation + 6-month optimization and expansion planning)

---

## Phase 1: Foundation and Quick Win (Months 1-3)

**Goal:** Deploy predictive maintenance at the pilot factory, demonstrate measurable downtime reduction, and rebuild organizational confidence in technology investments.

### Workstreams

**1A: Pilot Factory Predictive Maintenance Deployment**
- Select pilot factory (highest sensor coverage, most enthusiastic plant manager)
- Evaluate and select SaaS predictive maintenance platform (Azure-native)
- Integrate existing sensor data (SCADA/historian) with Azure IoT Hub
- Configure data pipelines: sensor data -> IoT Hub -> platform
- Train anomaly detection models on historical sensor data
- Configure alert thresholds and notification workflows
- Deploy maintenance dashboard for pilot factory team
- Begin 30-day measurement period

**1B: Data Foundation**
- Conduct data audit at all 4 factories: sensor inventory, data formats, historian systems, ERP data quality
- Document equipment taxonomy and naming conventions across factories
- Assess data gaps: which critical equipment lacks sensors, what failure modes are not captured
- Establish common data standards for cross-factory analytics

**1C: GenAI Knowledge Base Preparation**
- Inventory maintenance documentation: equipment manuals, troubleshooting guides, work order histories
- Assess document quality and digitization needs
- Select Azure OpenAI + AI Search architecture
- Begin document ingestion and indexing for pilot factory

**1D: Change Management**
- Kick-off communication to all factory teams: what we're doing, why, and how it's different from the previous initiative
- Maintenance team training at pilot factory (platform usage, alert response procedures)
- Identify and assign 2 analytics champions from existing IT team
- Establish monthly CFO dashboard format and reporting cadence

### Milestones

| Week | Milestone |
| --- | --- |
| Week 2 | Pilot factory selected, platform vendor shortlisted |
| Week 4 | Platform vendor selected, contract signed, project kick-off |
| Week 6 | Sensor data flowing to platform from pilot factory |
| Week 8 | First anomaly detection models trained, initial alerts generated |
| Week 10 | Maintenance team trained, alert workflows operational |
| Week 12 | **PHASE 1 GATE: 30-day measurement complete, results presented to CFO** |

### Success Criteria for Phase 1 Gate

| Metric | Target | Minimum Acceptable |
| --- | --- | --- |
| Sensor data integration | 100% of pilot factory sensors connected | 80% |
| Model accuracy (precision) | >80% true positive alerts | >60% |
| False positive rate | <20% of total alerts | <35% |
| Unplanned downtime reduction (pilot factory) | 20% reduction vs. prior 90-day average | 10% reduction |
| Maintenance team adoption | >80% of alerts reviewed within 4 hours | >60% |
| Mean time to repair improvement | 10% MTTR reduction | 5% reduction |

**Decision at Phase 1 Gate:** If minimum acceptable criteria are met, proceed to Phase 2. If not met, diagnose issues and extend Phase 1 by 4 weeks before reassessing.

---

## Phase 2: Multi-Factory Rollout (Months 3-6)

**Goal:** Expand predictive maintenance to all 4 factories, deploy the GenAI knowledge base, and complete the sensor expansion assessment.

### Workstreams

**2A: Factory Rollout (Factories 2, 3, 4)**
- Replicate pilot factory deployment to remaining 3 factories
- Stagger rollout: 1 factory per 3-4 weeks to allow learning transfer
- Adapt data integration for each factory's specific SCADA/historian setup
- Factory-specific model training (different equipment may have different failure signatures)
- Local maintenance team training at each factory

**2B: GenAI Maintenance Knowledge Base Deployment**
- Complete document ingestion for all 4 factories
- Deploy knowledge base with Azure OpenAI + AI Search
- Configure role-based access and factory-specific content filtering
- Pilot with maintenance leads at each factory, gather feedback
- Iterate on prompt engineering and retrieval quality
- Full deployment to all maintenance technicians

**2C: Sensor Expansion Assessment**
- Survey all 4 factories: identify unmonitored critical equipment
- Rank unmonitored equipment by failure frequency, downtime cost, and retrofit feasibility
- Assess retrofit options: sensor types, connectivity, installation requirements
- Develop prioritized sensor expansion plan with cost estimates per machine
- Identify top 50 machines for Phase 3 retrofit

**2D: Capability Building**
- Analytics champions complete platform certification
- Analytics champions shadow vendor data scientists during factory rollouts
- Document internal runbooks for platform operation, alert triage, and escalation
- Begin drafting lightweight AI governance framework

### Milestones

| Month | Milestone |
| --- | --- |
| Month 3.5 | Factory 2 live on predictive maintenance |
| Month 4 | GenAI knowledge base deployed at pilot factory |
| Month 4.5 | Factory 3 live on predictive maintenance |
| Month 5 | GenAI knowledge base deployed to all factories |
| Month 5.5 | Factory 4 live on predictive maintenance, sensor expansion assessment complete |
| Month 6 | **PHASE 2 GATE: All factories live, 60-day all-factory metrics, sensor expansion plan presented** |

### Success Criteria for Phase 2 Gate

| Metric | Target | Minimum Acceptable |
| --- | --- | --- |
| Factory coverage | 4/4 factories live | 3/4 factories live |
| Unplanned downtime reduction (all factories, sensor-equipped equipment) | 25% reduction | 15% reduction |
| Knowledge base adoption | >50% of maintenance technicians using weekly | >30% |
| Sensor expansion plan | Completed with cost estimates | Draft with preliminary estimates |
| Analytics champion readiness | Can operate platform independently for routine tasks | Can operate with vendor support |

**Decision at Phase 2 Gate:** Present full results and sensor expansion plan to executive team. Decide on Tier 3 investment (sensor retrofit + visual quality inspection) based on Phase 1-2 demonstrated ROI.

---

## Phase 3: Optimize and Plan Expansion (Months 6-12)

**Goal:** Optimize deployed systems for maximum value, begin sensor expansion execution if approved, and build the foundation for long-term AI capability.

### Workstreams

**3A: Predictive Maintenance Optimization**
- Quarterly model retraining based on accumulated data
- Tune alert thresholds based on 6 months of operational feedback
- Reduce false positive rate through model refinement
- Expand from anomaly detection to remaining useful life (RUL) prediction for highest-value equipment
- Integrate predictive alerts with spare parts procurement (automatic reorder triggers)

**3B: Sensor Expansion Execution (If Tier 3 Approved)**
- Procure sensors for top 50 priority machines
- Schedule installation during planned maintenance windows
- Integrate new sensors with Azure IoT Hub
- Extend predictive maintenance platform to newly instrumented equipment
- Model training for new equipment types

**3C: Visual Quality Inspection Pilot (If Tier 3 Approved)**
- Select pilot production line (highest defect cost, most camera-friendly product)
- Install camera systems and lighting
- Collect training data (good/defective product images)
- Train and deploy computer vision model
- Measure defect detection rate vs. baseline human inspection

**3D: Data Engineering Foundation**
- Deploy Azure Data Lake Storage Gen2 as central analytics repository
- Establish data pipelines from all factories to data lake
- Create cross-factory analytics dashboards
- Document data architecture and governance policies

**3E: Organizational Capability**
- Hire first data engineer (supported by consulting team for job description and interview process)
- Analytics champions transition from learning to leading — own routine platform operations
- Establish AI steering committee (quarterly reviews: CFO, CTO/IT Director, plant managers)
- Draft AI use policy and governance framework

### Milestones

| Month | Milestone |
| --- | --- |
| Month 7 | Predictive models retrained with 6 months of data, performance improvement measured |
| Month 8 | Sensor expansion installation begins (if approved) |
| Month 9 | Data lake operational, cross-factory dashboards deployed |
| Month 10 | Data engineer hired and onboarded |
| Month 11 | Sensor expansion complete for top 25 machines, visual quality pilot data collection begins |
| Month 12 | **ANNUAL REVIEW: Full program assessment, Year 2 roadmap, AI strategy presentation to board** |

### 12-Month Review Deliverables

| Deliverable | Content |
| --- | --- |
| Program performance report | Downtime reduction achieved, cost savings realized, platform performance metrics |
| Year 2 strategy recommendation | Next set of AI opportunities to pursue, resource plan, budget estimate |
| AI maturity re-assessment | Updated maturity scores (expected improvement from 1.55 to 2.5-3.0) |
| Talent roadmap | Hiring plan for Year 2, training investment, org structure recommendation |

---

## Dependencies

| Dependency | Required By | Owner | Risk if Delayed |
| --- | --- | --- | --- |
| Azure IoT Hub provisioning and configuration | Month 1 | IT Team | Blocks all sensor data integration |
| ERP data access (maintenance work orders, spare parts) | Month 1 | IT Team / ERP Admin | Limits knowledge base and parts optimization |
| SCADA/historian access at pilot factory | Month 1 | OT Team / Plant Manager | Blocks pilot factory deployment |
| Platform vendor contract | Month 1 | Procurement / Legal | Blocks entire timeline |
| Maintenance team availability for training | Month 2 | Plant Managers | Delays adoption, reduces Phase 1 results |
| SCADA/historian access at remaining factories | Month 3-5 | OT Teams | Delays multi-factory rollout |
| Sensor expansion budget approval | Month 6 | CFO | Limits Phase 3 scope |
| Data engineer hiring approval | Month 8 | HR / CFO | Delays long-term capability building |

---

## Resource Requirements

### External (Consulting Team)

| Role | Phase 1 | Phase 2 | Phase 3 | Total Days |
| --- | --- | --- | --- | --- |
| AI Strategy Lead (Principal) | 10 days | 8 days | 5 days | 23 days |
| IoT/Data Engineer (Senior) | 30 days | 40 days | 20 days | 90 days |
| ML Engineer (Senior) | 15 days | 25 days | 15 days | 55 days |
| GenAI Engineer (Mid) | 5 days | 20 days | 10 days | 35 days |
| Change Management / Training | 10 days | 15 days | 5 days | 30 days |
| Project Manager | 25 days | 30 days | 20 days | 75 days |

### Internal (TitanWorks)

| Role | Commitment | Duration |
| --- | --- | --- |
| Executive Sponsor (Plant Manager or COO) | 2 hours/week | 12 months |
| IT Lead (data integration, Azure admin) | 50% allocation | Months 1-6, then 25% |
| Analytics Champions (2 from IT team) | 25% allocation | 12 months |
| Maintenance Lead (per factory) | 10% allocation during their factory rollout | 4-6 weeks each |
| OT/Controls Engineer | 25% allocation | Months 1-6 (SCADA integration) |

---

## Risk Mitigation Through Phase Gates

The phased structure provides explicit decision points that limit financial exposure:

| Gate | Investment to Date | Decision | Maximum Exposure if Stopped |
| --- | --- | --- | --- |
| Phase 1 Gate (Month 3) | $320,000 | Proceed to multi-factory? | $320,000 (but pilot factory continues operating) |
| Phase 2 Gate (Month 6) | $700,000 | Proceed to expansion? | $700,000 (all 4 factories operational) |
| Annual Review (Month 12) | $700K-$1.75M | Year 2 strategy? | Deployed system continues generating value at steady-state cost of ~$330K/year |

At no point is TitanWorks committed to the full program without evidence of results. Each phase delivers standalone value — even if the program stops after Phase 1, the pilot factory continues to benefit from predictive maintenance.

# AI Implementation Roadmap: TitanWorks

## Roadmap Overview

This roadmap is structured in three phases over 18 months, with explicit go/no-go decision points at each phase boundary. Each phase delivers standalone value — TitanWorks can stop at any point and retain the benefits delivered to that point.

**Total Program Timeline:** 18 months
**Total Investment Range:** $1.2M - $2.0M (Comprehensive)
**Total Expected Annual Benefit at Maturity:** $10M - $15M

---

## Phase 1: Foundation and Quick Win (Month 1-3)

**Goal:** Demonstrate measurable value in 90 days. Build the data pipeline that becomes the foundation for everything that follows. Rebuild organizational confidence in technology-led improvement.

### Workstream 1.1: Predictive Maintenance Pilot

**Scope:** Deploy commercial predictive maintenance on already-instrumented equipment (40% of critical assets) in Factory 1.

| Week | Activity | Owner | Deliverable |
| --- | --- | --- | --- |
| 1-2 | Pilot factory selection and equipment inventory. Document all instrumented equipment, sensor types, data frequencies, and current failure patterns. | Plant Manager (Factory 1) + Consulting Team | Equipment inventory and sensor map |
| 1-3 | OT/IT data pipeline design and build. Establish secure connection from SCADA/PLC network to Azure IoT Hub. Configure data ingestion, normalization, and storage. | IT Team + Consulting Team | Working data pipeline: sensor data flowing to Azure |
| 2-4 | Vendor selection. Evaluate 2-3 predictive maintenance platforms against TitanWorks data. Conduct proof-of-concept with real sensor data. | IT Team + Consulting Team | Vendor selection report with POC results |
| 3-6 | Platform deployment and model calibration. Deploy selected platform, connect to data pipeline, configure alerting thresholds, train models on historical patterns. | Vendor + Consulting Team | Operational predictive maintenance system |
| 6-8 | Baseline measurement and tuning. Run system in parallel with existing monitoring. Compare predictions against actual failures. Tune alert thresholds. | Maintenance Team + Consulting Team | Baseline metrics report |
| 9-12 | Full pilot operation. System generates maintenance recommendations. Maintenance team acts on alerts. Track all metrics. | Maintenance Team | Pilot performance data |

**Resources Required:**
- Consulting team: 2 people (Solutions Architect, Data Engineer), full-time for 12 weeks
- Client IT: 1-2 people, 50% allocation for pipeline work
- Client Maintenance: Plant manager + 2 senior technicians for domain expertise and validation
- Vendor: Implementation team per vendor contract

### Workstream 1.2: Maintenance Knowledge Base MVP

**Scope:** Deploy a GenAI-powered maintenance assistant for Factory 1 technicians.

| Week | Activity | Deliverable |
| --- | --- | --- |
| 1-4 | Document collection and ingestion. Gather equipment manuals, service bulletins, maintenance procedures, and historical work orders. Ingest into Azure AI Search. | Document corpus indexed and searchable |
| 4-8 | Build RAG-based Q&A interface. Connect Azure OpenAI Service to document corpus. Build simple web/mobile interface for technicians. | Working knowledge base MVP |
| 8-12 | Pilot with maintenance team. Technicians use knowledge base during diagnostic work. Collect feedback and usage data. | Usage report and feedback summary |

**Resources Required:**
- Consulting team: 1 person (AI Engineer), 50% allocation for 12 weeks
- Client: Maintenance supervisor to curate document collection and validate answers

### Workstream 1.3: Change Management and Baseline Metrics

**Scope:** Establish success metrics, communicate the initiative, and manage organizational dynamics.

| Week | Activity | Deliverable |
| --- | --- | --- |
| 1-2 | Baseline metrics documentation. Record current unplanned downtime hours/month, MTTR, emergency maintenance events, and costs for Factory 1 over the prior 12 months. | Baseline metrics report |
| 1-2 | Post-mortem of previous initiative. Brief investigation into what went wrong with the prior digital transformation — not to assign blame, but to identify structural learnings. | Lessons learned brief (internal document) |
| 2-4 | Stakeholder communication plan. Brief plant managers, maintenance supervisors, and technicians. Frame the pilot as their tool, not an IT project. | Communication plan and kickoff presentation |
| 8-12 | Progress reporting. Weekly metrics updates to plant manager and monthly updates to CFO showing trend data. | Progress dashboard or report |

### Phase 1 Milestones

| Milestone | Target Date | Success Criteria |
| --- | --- | --- |
| Data pipeline operational | End of Month 1 | Sensor data flowing from Factory 1 OT network to Azure with <5 min latency |
| Vendor selected and deployed | End of Month 2 | Platform operational and generating predictions on instrumented equipment |
| Knowledge base MVP live | End of Month 2 | Technicians can query equipment information via web/mobile interface |
| Pilot results measured | End of Month 3 | Quantified comparison of predicted vs. actual failures; initial downtime reduction measured |
| **Go/No-Go Decision** | **End of Month 3** | **Proceed to Phase 2 if:** (a) System correctly predicted >=50% of equipment anomalies that led to downtime, (b) At least 1 documented case of avoided downtime due to predictive alert, (c) Maintenance team reports positive usability feedback |

### Phase 1 Success Metrics

| Metric | Baseline (Current) | Phase 1 Target |
| --- | --- | --- |
| Unplanned downtime hours/month (Factory 1) | To be measured in Week 1-2 | 15-25% reduction |
| Mean time to repair (MTTR) | To be measured in Week 1-2 | 10-15% reduction |
| Emergency maintenance events/month | To be measured in Week 1-2 | 10-20% reduction |
| Prediction accuracy (true positive rate) | N/A | >=60% |
| Knowledge base queries/week | N/A | >=50 queries/week by Month 3 |

### Phase 1 Investment

| Category | Estimated Cost |
| --- | --- |
| Consulting & Implementation | $100,000 |
| Predictive Maintenance Platform | $60,000 |
| OT/IT Data Pipeline | $40,000 |
| Knowledge Base (GenAI) | $30,000 |
| Change Management & Training | $15,000 |
| **Total Phase 1** | **$245,000** |

---

## Phase 2: Expand and Operationalize (Month 4-9)

**Goal:** Scale proven approaches to all 4 factories. Expand sensor coverage to reach 70-80% of critical equipment. Build internal capability. Enhance the knowledge base with agent capabilities.

**Prerequisite:** Phase 1 Go/No-Go criteria met.

### Workstream 2.1: Sensor Expansion

| Month | Activity | Deliverable |
| --- | --- | --- |
| 4-5 | Priority equipment assessment. Rank un-instrumented equipment across all 4 factories by downtime cost. Select top 60-80 assets for sensor retrofit. | Prioritized sensor installation plan |
| 4-6 | Sensor procurement and installation (Batch 1). Install sensors on top 30-40 priority machines. Connect to Azure IoT Hub via the pipeline template from Phase 1. | Batch 1 sensors operational and transmitting data |
| 6-8 | Sensor procurement and installation (Batch 2). Install sensors on next 20-40 priority machines. | Batch 2 sensors operational |
| 7-9 | Data collection and model training. Allow 2-3 months of baseline data collection on newly instrumented equipment. Extend predictive maintenance models. | Models trained on expanded equipment set |

### Workstream 2.2: Multi-Factory Rollout

| Month | Activity | Deliverable |
| --- | --- | --- |
| 4-5 | Factory 2 deployment. Replicate OT/IT pipeline and platform configuration from Factory 1. Adapt for factory-specific equipment. | Factory 2 predictive maintenance operational |
| 5-6 | Factory 3 deployment. Same process. | Factory 3 operational |
| 7-8 | Factory 4 deployment. Same process. | Factory 4 operational |
| 8-9 | Cross-factory dashboard. Unified view of equipment health, alerts, and maintenance recommendations across all 4 factories. | Enterprise maintenance dashboard |

### Workstream 2.3: Knowledge Base Enhancement

| Month | Activity | Deliverable |
| --- | --- | --- |
| 4-6 | Content expansion. Ingest equipment documentation from all 4 factories. Add structured troubleshooting workflows. | Knowledge base covers all factory equipment |
| 6-8 | Agent capabilities. Add work order draft generation, parts lookup, and proactive alert summaries. | Enhanced maintenance assistant agent |
| 8-9 | Mobile optimization. Ensure the knowledge base works reliably on tablets/phones on the factory floor (including offline capability). | Mobile-optimized interface |

### Workstream 2.4: Capability Building

| Month | Activity | Deliverable |
| --- | --- | --- |
| 4-5 | AI liaison training. Train 2-3 IT team members on platform administration, data quality monitoring, and vendor management. | Trained AI liaison team |
| 5-7 | Azure AI certification. Sponsor AI-900 and DP-100 certifications for AI liaisons. | Certified team members |
| 6-9 | Hiring plan. Develop job description and hire 1 data engineer to support the expanding AI infrastructure. | Data engineer hired (or in process) |

### Phase 2 Milestones

| Milestone | Target Date | Success Criteria |
| --- | --- | --- |
| Factory 2 operational | End of Month 5 | Predictive maintenance live and generating alerts |
| Sensor Batch 1 installed | End of Month 6 | 30-40 new sensors transmitting data to Azure |
| All 4 factories operational | End of Month 8 | Enterprise-wide predictive maintenance with unified dashboard |
| Phase 2 results measured | End of Month 9 | Quantified downtime reduction across all factories |
| **Go/No-Go Decision** | **End of Month 9** | **Proceed to Phase 3 if:** (a) Aggregate downtime reduction >=20% across all factories, (b) Platform operational with <2% false positive rate, (c) Internal team capable of day-to-day operations |

### Phase 2 Success Metrics

| Metric | Phase 1 Result | Phase 2 Target |
| --- | --- | --- |
| Equipment with predictive monitoring | 40% (Factory 1) | 70-80% (all factories) |
| Unplanned downtime reduction (aggregate) | 15-25% (Factory 1) | 20-30% (all factories) |
| MTTR reduction | 10-15% | 20-25% |
| Knowledge base daily active users | Factory 1 technicians | All factory technicians |
| Internal team capability | Vendor-dependent | 2-3 trained AI liaisons + 1 data engineer |

### Phase 2 Investment

| Category | Estimated Cost |
| --- | --- |
| Consulting & Implementation | $200,000 |
| Predictive Maintenance Platform (expansion) | $150,000 |
| Sensor Hardware & Installation | $250,000 |
| OT/IT Pipeline (3 additional factories) | $60,000 |
| Knowledge Base Enhancement | $40,000 |
| Training & Certification | $50,000 |
| Project Management | $50,000 |
| **Total Phase 2** | **$800,000** |

---

## Phase 3: Scale and Differentiate (Month 9-18)

**Goal:** Extend AI beyond predictive maintenance into quality and planning. Establish a sustainable internal AI operations function. Build competitive differentiation through operational intelligence.

**Prerequisite:** Phase 2 Go/No-Go criteria met.

### Workstream 3.1: Visual Quality Inspection Pilot

| Month | Activity | Deliverable |
| --- | --- | --- |
| 10-11 | Production line assessment. Identify 1-2 production lines with highest quality costs. Determine camera placement and inspection points. | Quality inspection requirements document |
| 11-13 | Hardware installation and data collection. Install cameras and edge computing hardware. Collect 2-3 months of labeled image data (good/defect examples). | Image dataset for model training |
| 13-15 | Model training and validation. Train computer vision models. Validate against human inspectors. Tune for acceptable false positive/negative rates. | Validated quality inspection model |
| 15-18 | Production deployment. Deploy inline inspection system. Run in parallel with human inspection initially. | Operational quality inspection system |

### Workstream 3.2: Demand Forecasting

| Month | Activity | Deliverable |
| --- | --- | --- |
| 10-12 | Data preparation. Extract historical sales, order, and production data from ERP. Identify external data sources (market indicators, seasonality). | Analytics-ready demand dataset |
| 12-14 | Model development and testing. Build forecasting models. Validate against historical performance. Compare to current planning accuracy. | Validated demand forecasting model |
| 14-16 | ERP integration. Connect forecasting outputs to production planning and inventory management modules. | Integrated demand planning system |
| 16-18 | Optimization and tuning. Refine models based on real-world performance. Train planning team on usage. | Fully operational demand forecasting |

### Workstream 3.3: Internal AI Operations Function

| Month | Activity | Deliverable |
| --- | --- | --- |
| 10-12 | AI operations playbook. Document all operational procedures: model monitoring, retraining triggers, escalation paths, vendor management, data quality protocols. | AI operations playbook |
| 12-15 | Team expansion. Hire 1 data scientist and 1 ML engineer (or equivalent contracted resources). | Expanded AI team (data engineer + data scientist + ML engineer) |
| 15-18 | Vendor transition planning. Transition day-to-day platform operations from vendor to internal team. Vendor shifts to advisory and advanced support. | Internal team operating independently |
| 16-18 | Year 2 strategic planning. Evaluate advanced opportunities (supply chain optimization, energy optimization, digital twin). Build business cases for Year 2 initiatives. | Year 2 AI strategy and roadmap |

### Phase 3 Milestones

| Milestone | Target Date | Success Criteria |
| --- | --- | --- |
| Quality inspection data collection complete | End of Month 13 | Sufficient labeled images for model training |
| Demand forecasting model validated | End of Month 14 | Model outperforms current planning accuracy by >=15% |
| AI operations playbook published | End of Month 12 | All procedures documented and reviewed |
| Internal team operational | End of Month 15 | Team executing daily operations without consultant support |
| Phase 3 results measured | End of Month 18 | Quality costs and inventory costs measured against baselines |

### Phase 3 Investment

| Category | Estimated Cost |
| --- | --- |
| Consulting (reduced — transitioning to advisory) | $75,000 |
| Quality Inspection (hardware + software + training) | $275,000 |
| Demand Forecasting (implementation + integration) | $130,000 |
| Internal Team (hiring + onboarding) | $250,000 |
| Ongoing Platform Costs | $150,000 |
| Training & Change Management | $30,000 |
| Project Management | $40,000 |
| **Total Phase 3** | **$950,000** |

---

## Dependencies

### Cross-Phase Dependencies

| Dependency | Source | Target | Risk if Delayed |
| --- | --- | --- | --- |
| OT/IT data pipeline | Phase 1 | Phase 2 (multi-factory) | Cannot deploy to other factories without pipeline template |
| Sensor data collection period | Phase 2 sensor install | Phase 2 model training | Models need 2-3 months of data; sensor delay = model delay |
| Internal team hiring | Phase 2 capability building | Phase 3 independence | Vendor dependency extends (higher cost) if hiring is slow |
| Phase 1 success | Phase 1 results | Phase 2 funding approval | CFO will not approve Phase 2 without Phase 1 evidence |

### External Dependencies

| Dependency | Owner | Mitigation |
| --- | --- | --- |
| Vendor platform performance | Vendor | POC with real data before commitment; shortlist 2 vendors |
| Azure service availability | Microsoft | Standard Azure SLA; design for resilience |
| Sensor hardware lead times | Sensor vendors | Order early in Phase 2; use multiple suppliers |
| OT network access approval | OT/Plant Engineering | Engage OT team from Week 1; involve in architecture decisions |
| CFO budget approval for each phase | CFO | Structured go/no-go with quantified results at each gate |

### Resource Constraints

| Constraint | Impact | Mitigation |
| --- | --- | --- |
| IT team bandwidth (25 people, all enterprise IT) | Limited capacity for pipeline work alongside BAU | Allocate 1-2 dedicated people; use consulting team for heavy lifting |
| Production line downtime for sensor installation | Cannot stop production for extended periods | Install during scheduled maintenance windows or shift changes |
| Maintenance team time for validation | Technicians are already overloaded with reactive work | Limit validation sessions to 2-3 hours/week; make it part of their workflow, not extra work |

---

## Decision Points

| Gate | Date | Decision | Criteria | Decision Maker |
| --- | --- | --- | --- | --- |
| Phase 1 Review | Month 3 | Proceed to Phase 2? | >=50% anomaly prediction accuracy, >=1 avoided downtime event, positive team feedback | CFO + Plant Managers |
| Phase 2 Review | Month 9 | Proceed to Phase 3? | >=20% aggregate downtime reduction, <2% false positive rate, internal team capable | CFO + COO |
| Phase 3 Mid-Point | Month 13 | Continue quality/forecasting investment? | On-track timeline, budget within 15%, positive initial data | CFO + Plant Managers |
| Program Review | Month 18 | Year 2 strategy approval | Aggregate ROI vs. projections, team maturity, competitive position | Executive Team |

---

## Investment Summary

| Phase | Timeline | Investment | Cumulative | Expected Annual Benefit |
| --- | --- | --- | --- | --- |
| Phase 1 | Month 1-3 | $245,000 | $245,000 | $3.4M |
| Phase 2 | Month 4-9 | $800,000 | $1,045,000 | $6.2M |
| Phase 3 | Month 9-18 | $950,000 | $1,995,000 | $12M (at maturity) |

**Program payback:** Month 4-5 (after Phase 1 go-live)
**3-Year cumulative net benefit (Recommended tier):** $16.9M

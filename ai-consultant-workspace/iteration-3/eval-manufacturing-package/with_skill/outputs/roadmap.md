# AI Implementation Roadmap: TitanWorks

## Overview

This roadmap implements the Recommended tier of the TitanWorks AI-powered predictive maintenance program. It is organized into three phases with explicit go/no-go decision gates at each boundary. The roadmap addresses the primary business problem ($2M/month unplanned downtime) while building the foundational capabilities (data, talent, governance) required for long-term AI maturity.

**Maturity context**: TitanWorks is at Foundation stage (1.68/5.0). This roadmap is designed to advance the organization to Pilot-Ready (2.0-2.9) by month 9 and toward Scale-Ready (3.0+) by month 18.

---

## Phase 1: Foundation & Quick Win (Months 1-3)

**Goal:** Demonstrate measurable downtime reduction on existing instrumented equipment. Establish data foundations and AI governance.

### Workstreams

#### 1A. Data Pipeline & OT/IT Integration
- Assess OT network architecture across all 4 factories
- Deploy Azure IoT Hub as the bridge between SCADA/historian and Azure cloud
- Build ETL pipeline: sensor data + ERP maintenance records into Azure Data Lake
- Validate sensor data quality on top 10 highest-cost equipment assets
- Establish data catalog for equipment telemetry and maintenance history

#### 1B. Predictive Maintenance Pilot
- Evaluate 3 predictive maintenance platforms (e.g., Uptake, Augury, Azure PM Accelerator)
- Select platform based on: Azure compatibility, manufacturing fit, deployment speed, ongoing support model
- Configure platform with top 10 equipment assets (highest downtime cost)
- Train anomaly detection and failure prediction models on historical sensor data
- Deploy alerts to operations dashboards and maintenance team mobile devices
- Run parallel with existing maintenance processes for validation (month 2-3)

#### 1C. Maintenance Knowledge Base (GenAI)
- Digitize equipment manuals, maintenance procedures, and troubleshooting guides
- Deploy Azure AI Search + Azure OpenAI Service RAG pipeline
- Build natural language interface for technicians (web or mobile)
- Pilot with 1 factory, 1 equipment category
- Collect feedback and iterate

#### 1D. AI Governance & Change Management
- Draft AI use policy (model approval, data usage, human oversight requirements)
- Establish model validation checklist (accuracy thresholds, alert precision targets)
- Train 10+ maintenance technicians and supervisors on new tools
- Communicate program goals, timeline, and success metrics to all factory personnel
- Conduct retrospective on previous digital transformation (learn, don't repeat)

### Milestones

| Week | Milestone |
| --- | --- |
| Month 1, Week 2 | OT/IT assessment complete for all 4 factories |
| Month 1, Week 3 | Azure IoT Hub deployed, sensor data flowing to Azure Data Lake |
| Month 1, Week 4 | Predictive maintenance platform selected |
| Month 2, Week 2 | Pilot predictions running on top 10 assets |
| Month 2, Week 4 | Maintenance knowledge base pilot live at Factory 1 |
| Month 3, Week 2 | First ROI measurement: predicted vs. actual failures, downtime savings |
| Month 3, Week 4 | **DECISION GATE: Phase 1 Review** |

### Success Metrics

| Metric | Target |
| --- | --- |
| Prediction accuracy (true positive rate) | >70% of failures predicted 24+ hours in advance |
| False positive rate | <20% (alerts that lead to unnecessary inspection) |
| Downtime reduction (pilot assets) | >15% reduction vs. prior 3-month baseline |
| Knowledge base usage | >50% of technicians at pilot factory using it weekly |
| Data pipeline reliability | >99% uptime for sensor data ingestion |

### Phase 1 Decision Gate (Month 3)

**Proceed to Phase 2 if:**
- Predictive model demonstrates >70% prediction accuracy on pilot assets
- Measurable downtime reduction observed (even if below 15% target)
- Data pipeline is stable and scalable
- No critical OT/IT security issues unresolved
- Plant managers and technicians confirm operational value

**Pause or pivot if:**
- Prediction accuracy below 50% after tuning
- Sensor data quality fundamentally insufficient
- Organizational resistance preventing adoption
- OT/IT integration blocked by unresolvable security constraints

---

## Phase 2: Expand & Operationalize (Months 4-9)

**Goal:** Scale predictive maintenance to all instrumented equipment. Begin sensor expansion. Build internal capability. Evolve GenAI knowledge base into agent.

### Workstreams

#### 2A. Predictive Maintenance Scale-Out
- Extend platform to all instrumented equipment across all 4 factories (40% of fleet)
- Train models for each equipment type/class
- Integrate alerts with ERP work order system (automated work order creation)
- Establish model monitoring: accuracy tracking, drift detection, retraining triggers
- Optimize alert thresholds based on Phase 1 learning

#### 2B. Sensor Expansion Planning & Procurement
- Conduct criticality assessment of non-instrumented equipment (60% of fleet)
- Prioritize by: downtime cost, retrofitability, safety impact
- Evaluate sensor types: vibration, thermal, acoustic, power consumption
- Develop procurement plan and installation schedule (aligned with planned shutdowns)
- Procure sensors for top-priority equipment (target: install during Phase 2/3 transition)

#### 2C. Maintenance Assistant Agent
- Evolve knowledge base into intelligent agent with capabilities:
  - Diagnose equipment issues based on symptoms and sensor data
  - Retrieve relevant maintenance history and repair procedures
  - Generate pre-filled work orders with parts lists
  - Escalate to senior technicians when confidence is low
- Deploy using Azure AI Agent Service or Copilot Studio
- Pilot at 2 factories

#### 2D. Internal Talent Development
- Hire data engineer (month 4-5) to own data pipeline operations
- Begin Azure AI certification program for 2-3 existing IT staff
- Knowledge transfer from consulting team to internal data engineer
- Define job description and begin search for ML engineer/data scientist (target hire: month 10)

#### 2E. Governance Maturation
- Formalize model approval process (review board: IT Director + Operations Director + Safety)
- Implement automated model monitoring dashboards
- Establish retraining schedule and data quality SLAs
- Document all deployed models (purpose, inputs, outputs, limitations, owner)

### Milestones

| Month | Milestone |
| --- | --- |
| Month 4 | Predictive maintenance expanded to Factory 2 (full instrumented fleet) |
| Month 5 | All 4 factories on predictive maintenance platform. Data engineer hired. |
| Month 6 | Sensor expansion procurement complete. Installation schedule finalized. |
| Month 7 | Maintenance agent pilot live at 2 factories |
| Month 8 | ERP work order integration live (automated work order from prediction) |
| Month 9 | **DECISION GATE: Phase 2 Review** |

### Success Metrics

| Metric | Target |
| --- | --- |
| Downtime reduction (instrumented fleet) | >30% reduction vs. pre-program baseline |
| Prediction accuracy (fleet average) | >75% across all equipment types |
| MTTR improvement | >15% reduction in mean time to repair |
| Maintenance agent adoption | >60% of technicians using agent weekly |
| Internal capability | Data engineer productive, 2+ IT staff Azure AI certified |
| Monthly savings (quantified) | >$200K/month measured and reported |

### Phase 2 Decision Gate (Month 9)

**Proceed to Phase 3 if:**
- >25% downtime reduction demonstrated across instrumented fleet
- Monthly savings >$150K (measured, not projected)
- Data engineer productive and pipeline operations transferred
- Sensor expansion procurement and installation plan approved
- Maintenance agent demonstrating value at pilot factories

**Scale back if:**
- Downtime reduction <15% despite model tuning
- ROI does not justify sensor expansion CAPEX
- Internal talent acquisition failing (cannot hire data roles)

---

## Phase 3: Full Fleet & Self-Sustaining (Months 9-18)

**Goal:** Achieve full fleet predictive maintenance coverage. Build self-sustaining internal AI capability. Evaluate secondary AI opportunities.

### Workstreams

#### 3A. Sensor Expansion & Full Fleet Deployment
- Install sensors on prioritized non-instrumented equipment (per Phase 2 plan)
- Schedule installations during planned shutdowns to avoid production impact
- Extend predictive maintenance models to newly instrumented equipment
- Calibrate and validate models for each new equipment class
- Target: 80%+ critical equipment coverage by month 15

#### 3B. Advanced Capabilities
- Evaluate computer vision for quality control (Opportunity #4 from matrix)
- Assess energy optimization opportunity (Opportunity #6)
- Deploy maintenance agent to all 4 factories
- Explore multi-agent orchestration: prediction to diagnosis to work order to parts procurement

#### 3C. Internal AI Team Maturation
- Hire ML engineer/data scientist (month 10-11)
- Transfer model retraining and monitoring to internal team
- Establish internal AI center of practice (not full CoE at this maturity)
- Reduce consulting dependency to advisory retainer (20-40 hrs/month)

#### 3D. Governance & Platform Maturation
- Full model registry with versioning and lineage
- Automated retraining pipeline
- Quarterly model performance reviews
- AI use policy extended to cover GenAI and agent use cases
- Compliance documentation for any regulatory requirements

### Milestones

| Month | Milestone |
| --- | --- |
| Month 10 | First batch of sensor installations complete (target: 20% of remaining fleet) |
| Month 11 | ML engineer/data scientist hired |
| Month 12 | 60%+ of total critical equipment on predictive maintenance |
| Month 13 | Quality control CV pilot decision (go/no-go) |
| Month 15 | 80%+ equipment coverage. Internal team self-sustaining for operations. |
| Month 18 | **PROGRAM REVIEW: Full assessment, next-phase planning** |

### Success Metrics

| Metric | Target |
| --- | --- |
| Downtime reduction (full fleet) | >35% reduction vs. pre-program baseline |
| Equipment coverage | >80% of critical equipment on predictive maintenance |
| Monthly savings | >$500K/month measured |
| Internal team capability | Can operate and maintain all deployed models without external consulting |
| AI maturity score | >2.5 (advancing from Foundation to Pilot-Ready/Scale-Ready) |

---

## Dependencies

### Cross-Phase Dependencies

| Dependency | Blocking Phase | Owner | Risk Level |
| --- | --- | --- | --- |
| OT/IT network bridging approval | Phase 1 | IT Director + Plant Engineering | High |
| Azure IoT Hub provisioning | Phase 1 | IT Team | Low |
| Sensor data quality validation | Phase 1 to Phase 2 expansion | Consulting Team | Medium |
| Sensor CAPEX budget approval | Phase 2 to Phase 3 | CFO | Medium |
| Planned shutdown windows for sensor installation | Phase 3 | Plant Managers | Medium |
| Data engineer hiring | Phase 2 | HR + IT Director | Medium |
| ML engineer hiring | Phase 3 | HR + IT Director | Medium |

### External Dependencies

| Dependency | Description | Mitigation |
| --- | --- | --- |
| Predictive maintenance vendor | Platform availability, support responsiveness | Evaluate 3 vendors, contractual SLAs |
| Sensor hardware suppliers | Procurement lead times (8-12 weeks typical) | Order in Phase 2 for Phase 3 installation |
| Azure service availability | IoT Hub, Data Lake, ML, OpenAI Service | Standard Azure SLA (99.9%+) |

---

## Decision Points Summary

| Gate | Date | Decision | Key Criteria |
| --- | --- | --- | --- |
| Phase 1 Review | Month 3 | Proceed to Phase 2? | >70% prediction accuracy, measurable downtime reduction, stable pipeline |
| Phase 2 Review | Month 9 | Proceed to Phase 3 (sensor expansion)? | >25% downtime reduction, >$150K/month savings, sensor CAPEX approved |
| Program Review | Month 18 | Next AI initiatives? | >35% downtime reduction, self-sustaining team, secondary use case evaluation |

---

## Resource Requirements Summary

| Resource | Phase 1 | Phase 2 | Phase 3 |
| --- | --- | --- | --- |
| Consulting (Staff Eng. hrs) | 320-480 | 360-520 | 200-300 |
| Internal Data Engineer | 0 | 1 (hired month 4-5) | 1 |
| Internal ML Engineer | 0 | 0 | 1 (hired month 10-11) |
| Client IT involvement | 0.5 FTE | 0.25 FTE | 0.25 FTE |
| Client Operations involvement | Plant managers (4-8 hrs/week) | Plant managers (2-4 hrs/week) | Plant managers (1-2 hrs/week) |
| Sensor CAPEX | $0 | $0 (planning only) | $500K-$1.5M |

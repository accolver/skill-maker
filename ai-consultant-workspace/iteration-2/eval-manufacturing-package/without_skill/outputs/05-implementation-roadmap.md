# TitanWorks Predictive Maintenance Program: Implementation Roadmap

**Client**: TitanWorks Manufacturing
**Date**: March 19, 2026
**Document Type**: Phased Implementation Roadmap (30 Months)
**Approach**: Hybrid Build/Buy, Pilot-First

---

## Roadmap Overview

```
PHASE 0        PHASE 1           PHASE 2              PHASE 3
Foundation     Pilot Factory     Scale & Predict       Enterprise & Prescribe
───────────────────────────────────────────────────────────────────────────────
Month 1-2      Month 3-6         Month 7-18            Month 19-30
$200K          $900K             $2,400K               $2,200K
───────────────────────────────────────────────────────────────────────────────
|  GATE 0  |     |  GATE 1  |        |  GATE 2  |          |  GATE 3  |
|  Readiness|     |  Pilot OK|        |  Scale OK|          |  Program  |
|  Check    |     |  Expand? |        |  Optimize|          |  Complete |
───────────────────────────────────────────────────────────────────────────────
              TIER 1                    TIER 2                TIER 3
```

---

## Phase 0: Foundation & Readiness (Month 1-2)

**Investment**: $200,000 (included in Tier 1 budget)
**Objective**: Establish governance, assess factory readiness, select pilot factory, begin hiring

### Month 1: Governance & Assessment

| Week | Activity | Owner | Deliverable |
|------|----------|-------|-------------|
| 1 | Executive sponsor appointed (COO or VP Mfg.) | CEO | Signed charter |
| 1 | Steering committee formed (IT, Ops, Finance, Maintenance) | Exec Sponsor | Committee charter, monthly cadence set |
| 1-2 | Factory readiness assessment (all 4 sites) | Implementation Partner | Factory scoring matrix |
| 1-2 | Existing sensor audit: types, protocols, data quality | Implementation Partner + IT | Sensor inventory document |
| 2 | Pilot factory selected based on scoring criteria | Steering Committee | Selection decision documented |
| 2 | OT network security assessment (pilot factory) | IT + OT Security Specialist | Security requirements document |
| 2 | CMMS data quality assessment | Implementation Partner | Data quality report |

**Pilot Factory Selection Criteria**:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Equipment criticality & downtime cost | 25% | Higher cost = higher value from pilot |
| Existing sensor coverage | 20% | More sensors = faster time to data |
| Plant manager engagement | 20% | Enthusiastic sponsor critical for adoption |
| OT infrastructure readiness | 15% | Network, PLCs, historians in reasonable state |
| Maintenance team capability | 10% | Team able to adopt new workflows |
| Geographic accessibility | 10% | Easier for implementation partner access |

### Month 2: Platform & Procurement

| Week | Activity | Owner | Deliverable |
|------|----------|-------|-------------|
| 3 | Platform vendor shortlist evaluation (2 vendors) | IT + Implementation Partner | Evaluation scorecard |
| 3-4 | Vendor proof-of-concept (2-week sprint per vendor) | Vendors | PoC results comparison |
| 4 | Platform vendor selected | Steering Committee | Vendor contract executed |
| 4 | Sensor hardware procurement initiated | Implementation Partner | Purchase orders placed |
| 3-4 | Job description posted: PdM Analyst | HR + Hiring Manager | Recruiting active |
| 4 | Change management plan drafted | Implementation Partner | Plan document |

**Gate 0 Checklist**:
- [ ] Executive sponsor active and engaged
- [ ] Steering committee convened with monthly cadence
- [ ] Pilot factory selected with documented rationale
- [ ] Platform vendor selected and contracted
- [ ] Sensor procurement initiated
- [ ] OT security requirements documented
- [ ] PdM Analyst role in active recruiting
- [ ] Change management plan approved

---

## Phase 1: Pilot Factory — Condition Monitoring (Month 3-6)

**Investment**: $900,000 (remainder of Tier 1 budget)
**Objective**: Deploy condition monitoring at pilot factory, demonstrate value, build organizational confidence

### Month 3-4: Infrastructure & Integration

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Azure IoT Hub provisioned and configured | 2 weeks | IT + Partner | IoT Hub operational |
| Azure Data Explorer (time-series DB) deployed | 2 weeks | IT + Partner | Database operational |
| OT network segmentation at pilot factory | 3 weeks | IT + OT Security | Secured network segment |
| Edge gateways installed (4-6 units) | 2 weeks | Partner + Factory IT | Gateways transmitting |
| Existing sensor data flowing to Azure | 3 weeks | Partner | Data pipeline validated |
| CMMS read integration (work order data) | 3 weeks | Partner + IT | Historical work orders in platform |
| Asset hierarchy and naming standardized (pilot) | 2 weeks | Partner + Maintenance | Asset taxonomy document |
| Dashboard framework deployed | 2 weeks | Partner | Base dashboards accessible |

### Month 4-5: Sensor Deployment & Commissioning

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Sensor installation: Batch 1 (25 assets) | 3 weeks | Sensor vendor + Maintenance | 25 assets transmitting |
| Sensor commissioning and data validation | 1 week | Partner | Data quality confirmed |
| Sensor installation: Batch 2 (25 assets) | 3 weeks | Sensor vendor + Maintenance | 50 assets transmitting |
| Threshold configuration (per equipment type) | 2 weeks | Partner + Maintenance SMEs | Alert rules configured |
| Alert routing setup (supervisors, technicians) | 1 week | Partner + IT | Alerts flowing to correct recipients |
| Dashboard customization (per user role) | 2 weeks | Partner | Role-based dashboards live |

### Month 5-6: Process Deployment & Training

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Condition-based maintenance procedures (top 20 failure modes) | 3 weeks | Partner + Maintenance | Procedure documents |
| Maintenance response playbooks | 2 weeks | Partner + Maintenance | Playbook library |
| Operator training (dashboard, alerts) — 3 sessions | 2 weeks | Partner | Training completed, 90%+ attendance |
| Maintenance supervisor training | 1 week | Partner | Supervisors certified |
| Management reporting — weekly health summary | 1 week | Partner | Automated report running |
| PdM Analyst onboarded and trained | Ongoing | Partner + Hiring Manager | Analyst productive |
| 4-week "hypercare" support period | 4 weeks | Partner | Issues resolved, system stable |

### Parallel Activity: Data Collection for ML (Month 3-6)

While Tier 1 focuses on condition monitoring, the 4+ months of continuous sensor data collection creates the training dataset needed for Tier 2 predictive models. This is a critical hidden benefit of starting with condition monitoring — it is not "wasted time" before ML, it is essential data preparation.

**Gate 1 Checklist (Month 6)**:
- [ ] 50 assets monitored with <2% data gap rate
- [ ] Downtime reduction >15% at pilot factory (measured against 6-month pre-pilot baseline)
- [ ] Dashboard adoption >80% of maintenance supervisors using daily
- [ ] Alert response compliance >70% of alerts actioned within SLA
- [ ] False positive rate <15%
- [ ] PdM Analyst performing independently
- [ ] Steering committee recommends Tier 2 investment
- [ ] Data quality assessment confirms ML readiness (>4 months continuous data, sufficient failure events for model training)

**Expected Gate 1 Metrics**:

| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| Unplanned downtime (pilot factory) | Reduced 15-25% | CMMS work order analysis |
| MTTD (mean time to detect) | <4 hours | Alert timestamp vs. failure timestamp |
| Dashboard daily active users | >80% of maintenance supervisors | Platform analytics |
| Alert-to-action time | <2 hours for critical | Alert and work order timestamps |
| Sensor data availability | >98% uptime | Platform monitoring |
| Cost savings (pilot factory) | $75K-$125K/month | Finance-validated calculation |

---

## Phase 2: Scale & Predict (Month 7-18)

**Investment**: $2,400,000 (Tier 2 budget)
**Objective**: Deploy ML-based prediction, expand to factories 2-3, build internal analytics team

### Month 7-9: Predictive Model Development

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Historical data preparation and labeling | 3 weeks | Partner + PdM Analyst | Labeled training dataset |
| Feature engineering (sensor + CMMS + operational) | 3 weeks | Partner Data Science | Feature library |
| Model development: Top 5 equipment categories | 6 weeks | Partner Data Science | 5 trained models |
| Model validation against known failures | 2 weeks | Partner + Maintenance SMEs | Validation report |
| Model deployment to production (pilot factory) | 2 weeks | Partner + IT | Models scoring live data |
| Prediction dashboard and notification system | 2 weeks | Partner | Predictions visible to users |
| Data Engineer hired and onboarding | Month 7-8 | HR + IT | FTE onboarded |

### Month 8-12: Factory 2 Deployment

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Factory 2 OT assessment and network prep | 3 weeks | IT + Partner | Network ready |
| Edge gateway installation (Factory 2) | 2 weeks | Partner + Factory IT | Gateways operational |
| Sensor installation (40 assets) | 4 weeks | Sensor vendor | Assets transmitting |
| Data pipeline extension (templated from pilot) | 2 weeks | Data Engineer + Partner | Pipeline operational |
| Condition monitoring live (Factory 2) | Week 1 post-pipeline | Automatic | Dashboards and alerts active |
| Model transfer and adaptation (Factory 2) | 3 weeks | Partner Data Science | Models scoring at Factory 2 |
| Training (Factory 2 staff) | 2 weeks | Partner + PdM Analyst | Staff trained |

### Month 10-14: Factory 3 Deployment

Mirrors Factory 2 deployment timeline. By this point, the internal Data Engineer handles pipeline deployment with partner oversight, reducing dependency.

### Month 12-15: Advanced Integration

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Bi-directional CMMS integration | 4 weeks | Data Engineer + IT | Auto-generated work orders |
| Spare parts demand forecasting | 3 weeks | Data Scientist + Partner | Forecast model operational |
| ERP maintenance cost reporting integration | 3 weeks | IT + Finance | Automated cost reporting |
| Mobile app deployment (technician alerts) | 3 weeks | Partner + IT | App deployed to 50+ users |
| Data Scientist hired and onboarding | Month 12-13 | HR + IT | FTE onboarded |

### Month 14-18: Model Maturation & Optimization

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Model expansion to 10 equipment categories | 6 weeks | Data Scientist + Partner | 10 models in production |
| Model retraining pipeline automated | 3 weeks | Data Engineer | Automated MLOps pipeline |
| Cross-factory benchmarking dashboards | 2 weeks | PdM Analyst | Comparative analytics live |
| Prediction accuracy improvement cycle | Ongoing | Data Scientist | Accuracy >75% (7-day window) |
| Root cause analysis framework implementation | 3 weeks | PdM Analyst + Maintenance | RCA integrated with predictions |
| Data literacy training (20 maintenance/ops staff) | 4 weeks | PdM Analyst + Partner | Staff trained and assessed |
| Knowledge transfer: Partner to internal team | Ongoing | Partner | Internal team independence assessment |

**Gate 2 Checklist (Month 18)**:
- [ ] 150 assets monitored across 3 factories
- [ ] Downtime reduction >30% across monitored factories
- [ ] Prediction accuracy >70% for top 10 equipment categories
- [ ] Internal team (3 FTEs) operating independently for day-to-day tasks
- [ ] Cumulative ROI exceeds 2.5x investment to date
- [ ] Factory 4 readiness assessment complete
- [ ] Business case for Tier 3 (prescriptive) validated with data
- [ ] Partner dependency reduced to advisory/specialty support

---

## Phase 3: Enterprise & Prescribe (Month 19-30)

**Investment**: $2,200,000 (Tier 3 budget)
**Objective**: Full enterprise coverage, prescriptive capabilities, digital twin foundation, Center of Excellence

### Month 19-22: Factory 4 & Prescriptive Development

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Factory 4 deployment (accelerated — templated) | 8 weeks | Internal team + Partner advisory | Factory 4 fully operational |
| Prescriptive engine requirements and design | 3 weeks | Data Scientist + Architect | Design document |
| Maintenance optimization algorithm development | 6 weeks | Data Scientist + Partner | Optimization model |
| Production schedule integration | 4 weeks | Data Engineer + Production Planning | Schedule-aware recommendations |
| Cost-optimized maintenance scheduling | 4 weeks | Data Scientist | Cost optimization model |

### Month 22-26: Digital Twin & Enterprise Analytics

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Azure Digital Twins: Critical line selection (4 lines) | 2 weeks | Steering Committee | Lines selected |
| Digital twin modeling and deployment | 8 weeks | Partner + Data Engineer | Twin operational |
| What-if scenario modeling capability | 4 weeks | Data Scientist | Scenario engine live |
| Enterprise KPI dashboard (C-level) | 3 weeks | PdM Analyst + Data Engineer | Executive dashboard |
| Fleet reliability analysis (cross-factory) | 3 weeks | Data Scientist | Reliability models |
| Capital planning integration | 4 weeks | Data Engineer + Finance | CapEx recommendations data-driven |
| Additional FTE hired (Tier 3) | Month 22-23 | HR | Team at 4-5 FTEs |

### Month 26-30: Maturation & Optimization

| Activity | Duration | Owner | Deliverable |
|----------|----------|-------|-------------|
| Center of Excellence formalized | 2 weeks | Exec Sponsor + VP Mfg | CoE charter and structure |
| Vendor management optimization (reduce dependency) | Ongoing | CoE Lead | 70%+ operations internal |
| Continuous improvement framework | 2 weeks | CoE Lead | Quarterly review process |
| Internal training program for new staff | 3 weeks | CoE Lead + HR | Training curriculum |
| Natural language query interface | 4 weeks | Data Scientist + Partner | NL query operational |
| Predictive quality pilot (1 production line) | 6 weeks | Data Scientist | Quality correlation model |
| Energy optimization integration | 4 weeks | Data Engineer | Energy model operational |
| Program retrospective and next-horizon planning | 2 weeks | Steering Committee | Retrospective report |

**Gate 3 Checklist (Month 30)**:
- [ ] 200+ assets monitored across all 4 factories
- [ ] Unplanned downtime reduced 45-60%
- [ ] Prescriptive recommendations operational and adopted
- [ ] Digital twins operational for 4+ critical production lines
- [ ] Internal CoE operating at 70%+ independence
- [ ] Annual net benefit exceeding $8M/year
- [ ] Model accuracy >85% for top equipment categories
- [ ] Program positioned for continuous improvement without major investment

---

## Staffing Timeline

| Role | Hire Month | Reports To | Key Responsibility |
|------|-----------|------------|-------------------|
| PdM Analyst | Month 2-3 | Maintenance Director | Domain expertise, dashboard ownership, training |
| Data Engineer | Month 7-8 | IT Director | Data pipelines, integration, MLOps |
| Data Scientist | Month 12-13 | IT Director (dotted to Maint.) | Model development, prescriptive analytics |
| Analytics Engineer (Tier 3) | Month 22-23 | CoE Lead | Digital twins, enterprise analytics |
| CoE Lead (promote from within or hire) | Month 24-26 | VP Manufacturing | Program leadership, strategic direction |

---

## Risk Management Throughout Roadmap

| Phase | Top Risk | Mitigation | Trigger for Escalation |
|-------|----------|------------|----------------------|
| Phase 0 | No executive sponsor commitment | Present ROI analysis to CEO, make it a board agenda item | No sponsor by Week 3 |
| Phase 1 | Sensor data quality insufficient | Data quality assessment in Week 2 of Phase 1, remediation plan | >10% data gaps after Month 4 |
| Phase 1 | Organizational resistance (previous failure) | Quick wins communication, operator involvement from Day 1 | Dashboard adoption <50% at Month 5 |
| Phase 2 | Hiring delays (data engineer, data scientist) | Start recruiting in Phase 0, consider contract-to-hire | Role unfilled after 3 months |
| Phase 2 | ML model accuracy below threshold | Increase training data, add features, consider vendor model library | Accuracy <60% after 3 months in production |
| Phase 3 | Scope creep into non-maintenance use cases | Steering committee scope management, formal change request process | Unplanned work >20% of team capacity |
| All | Implementation partner quality issues | Quarterly partner review, pre-negotiated exit clauses | 2+ consecutive missed milestones |

---

## Success Metrics Dashboard (Program-Level)

| KPI | Baseline | Month 6 | Month 12 | Month 18 | Month 24 | Month 30 |
|-----|----------|---------|----------|----------|----------|----------|
| Unplanned downtime cost/month | $2,000K | $1,750K | $1,400K | $1,200K | $1,000K | $850K |
| Assets monitored | 160 (40%) | 210 (53%) | 280 (70%) | 310 (78%) | 360 (90%) | 400 (100%) |
| Prediction accuracy | N/A | N/A | 65% | 75% | 80% | 85% |
| Internal team size | 0 | 1 | 2 | 3 | 4 | 5 |
| Maintenance cost/unit produced | Baseline | -5% | -10% | -15% | -20% | -25% |
| OEE | Baseline | +1% | +3% | +5% | +7% | +9% |
| Maturity score | 2.1 | 2.6 | 3.0 | 3.3 | 3.7 | 4.0 |

---

## Governance & Reporting Structure

### Steering Committee
- **Members**: Exec Sponsor (Chair), VP Manufacturing, CFO (or delegate), IT Director, Maintenance Directors (2 rotating), Implementation Partner Lead
- **Cadence**: Monthly (Phase 0-1), Bi-monthly (Phase 2-3)
- **Authority**: Investment gate decisions, scope changes, risk escalations

### Operational Reviews
- **Weekly**: Project team standup (Partner + Internal team)
- **Bi-weekly**: Factory-level review (Maintenance Director + PdM Analyst + Factory Manager)
- **Monthly**: KPI review and steering committee report

### Communication Plan
- **Plant floor**: Weekly "wins" bulletin board (physical and digital) showing prevented failures
- **Management**: Monthly KPI dashboard with trend analysis
- **Executive**: Quarterly business review with ROI tracking
- **CFO-specific**: Monthly 1-page financial summary showing investment vs. savings trajectory

---

*This roadmap should be refined following the Phase 0 factory assessments and platform vendor selection. Timelines may shift based on hiring success and factory-specific conditions.*

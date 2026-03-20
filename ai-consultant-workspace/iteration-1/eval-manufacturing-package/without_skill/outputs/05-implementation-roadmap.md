# TitanWorks: Implementation Roadmap

**Prepared for:** TitanWorks Executive Leadership Team
**Date:** March 2026
**Classification:** Confidential

---

## Roadmap Overview

This roadmap spans 36 months across three tiers, with built-in decision gates between each tier. The roadmap is designed to deliver value early, build confidence incrementally, and provide clear off-ramps if performance targets are not met.

```
TIMELINE OVERVIEW
=================

Month:  1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16  17  18  ...  24  ...  36
        |------- TIER 1 ---------|   |------------- TIER 2 ------------------|   |--- TIER 3 ---|
        |  Pilot  |  Scale (2 fac)   |  Expand (4 fac)  |  Integrate         |   | Predictive   |
                                 ^                       ^                    ^                   ^
                              GATE 1                  GATE 2              GATE 3              GATE 4
                           (Go/No-Go T2)           (Scope T2)          (Go/No-Go T3)       (Final Review)
```

---

## Phase 0: Foundation & Vendor Selection (Weeks 1-6)

**Objective:** Select vendor, establish governance, and prepare factories for deployment.

### Workstreams

| # | Activity | Owner | Duration | Dependencies |
|---|----------|-------|----------|-------------|
| 0.1 | Issue RFP to shortlisted vendors (Augury, Samsara, Uptake, SKF) | Procurement + Plant Mgr | Week 1-2 | Approved budget |
| 0.2 | Vendor demonstrations and reference checks | Plant Managers + IT Lead | Week 2-4 | RFP responses received |
| 0.3 | Critical equipment audit (Factory 1 & 2) | Maintenance Leads | Week 1-3 | Plant manager coordination |
| 0.4 | Identify top 30 failure-prone assets with maintenance history | Maintenance + Finance | Week 2-4 | ERP data extraction |
| 0.5 | OT network assessment (Factory 1 & 2) | IT Team + OT consultant | Week 2-4 | Factory floor access |
| 0.6 | Establish project governance structure | Exec Sponsor (VP Ops) | Week 1 | None |
| 0.7 | Vendor selection and contract negotiation | Procurement + Legal | Week 4-6 | Demos complete |
| 0.8 | Establish baseline metrics (downtime hours, MTTR, costs) | Finance + Maintenance | Week 1-4 | ERP data access |

### Governance Structure

| Role | Person/Function | Responsibility |
|------|----------------|---------------|
| Executive Sponsor | VP Operations | Budget authority, escalation, organizational alignment |
| Steering Committee | CFO, VP Ops, IT Director, 2 Plant Managers | Monthly review, gate decisions |
| Project Lead | Senior Maintenance Manager (internal) | Day-to-day execution, vendor coordination |
| Technical Lead | IT Team (Azure-experienced engineer) | Integration, data architecture, security |
| Change Champion (per factory) | Lead Maintenance Technician | Floor-level adoption, feedback loop |

### Phase 0 Deliverables
- [ ] Signed vendor contract with 90-day performance clause
- [ ] Asset register: 30 critical assets ranked by failure frequency, cost impact, and monitorability
- [ ] OT network readiness report for Factory 1 & 2
- [ ] Baseline metrics report (trailing 12-month downtime data by asset)
- [ ] Project charter with governance roles confirmed
- [ ] Communication plan (addressing "this is not the last initiative" narrative)

### Phase 0 Budget: $45,000 (OT assessment consultant, data extraction, project setup)

---

## Phase 1: Tier 1 Deployment (Months 1-6)

### Month 1-2: Factory 1 Pilot (15 Assets)

| # | Activity | Owner | Week | Success Criteria |
|---|----------|-------|------|-----------------|
| 1.1 | Edge gateway installation (Factory 1) | Vendor + IT | Wk 1-2 | Gateway online, connected to Azure |
| 1.2 | Sensor installation on 15 priority assets | Vendor + Maintenance | Wk 2-4 | All 15 sensors transmitting data |
| 1.3 | Platform configuration and alert threshold setup | Vendor | Wk 3-5 | Default thresholds active; baseline learning period started |
| 1.4 | Maintenance team training (Factory 1) | Vendor + Change Champion | Wk 4-5 | All maintenance techs complete 1-day training |
| 1.5 | Dashboard configuration for maintenance supervisor | Vendor + IT | Wk 5-6 | Supervisor accessing dashboard daily |
| 1.6 | First alert review and threshold calibration | Vendor + Maintenance Lead | Wk 6-8 | False positive rate < 20% |

**Month 2 Checkpoint:** 15 assets transmitting, maintenance team engaged, first genuine anomaly alerts reviewed.

### Month 3-4: Factory 2 Deployment + Factory 1 Optimization

| # | Activity | Owner | Week | Success Criteria |
|---|----------|-------|------|-----------------|
| 2.1 | Edge gateway installation (Factory 2) | Vendor + IT | Wk 9-10 | Gateway online |
| 2.2 | Sensor installation on 15 priority assets (Factory 2) | Vendor + Maintenance | Wk 10-12 | All sensors transmitting |
| 2.3 | Factory 2 team training | Vendor + Change Champion | Wk 12-13 | Training complete |
| 2.4 | Factory 1 alert threshold refinement | Maintenance Lead | Wk 9-12 | False positive rate < 10% |
| 2.5 | First "prevented failure" documentation | Maintenance Lead | Wk 10-14 | At least 1 documented case |
| 2.6 | Basic ERP integration (automated work order creation) | IT + Vendor | Wk 10-16 | Work orders auto-generating from alerts |

**Month 4 Checkpoint:** 30 assets monitored across 2 factories, at least 2-3 prevented failures documented with estimated cost avoidance.

### Month 5-6: Optimization & ROI Documentation

| # | Activity | Owner | Week | Success Criteria |
|---|----------|-------|------|-----------------|
| 3.1 | Alert optimization and runbook development | Maintenance Leads | Wk 17-20 | Documented response procedure for each alert type |
| 3.2 | MTTR measurement and comparison to baseline | Finance + Maintenance | Wk 18-22 | MTTR data for Tier 1 assets vs. unmonitored assets |
| 3.3 | Cost avoidance calculation | Finance | Wk 20-24 | Dollar value of prevented failures documented |
| 3.4 | Downtime comparison: monitored vs. unmonitored assets | Maintenance + Finance | Wk 22-24 | Statistical comparison showing improvement |
| 3.5 | Tier 1 ROI Report | Project Lead + Finance | Wk 24 | Comprehensive report for Steering Committee |
| 3.6 | Tier 2 go/no-go presentation to Steering Committee | Project Lead | Wk 24 | Decision documented |

### Tier 1 Key Performance Indicators

| KPI | Month 2 Target | Month 4 Target | Month 6 Target |
|-----|---------------|---------------|---------------|
| Assets monitored | 15 | 30 | 30 |
| Data uptime (sensor transmission) | 90% | 95% | 98% |
| Alerts generated | Tracking | Tracking | < 10% false positive |
| Prevented failures (documented) | 0-1 | 2-4 | 6-10 |
| Cost avoidance (documented) | $0 | $100K-200K | $400K-800K |
| Dashboard daily active users | 2 | 4 | 6+ |
| MTTR (monitored assets) | Baseline | -10% | -25% |

---

## Decision Gate 1: Tier 2 Approval (Month 6)

### Gate Criteria

| Criterion | Threshold for Go | Threshold for No-Go | Threshold for Extend |
|-----------|-----------------|--------------------|--------------------|
| Downtime reduction (monitored assets) | > 15% | < 5% | 5-15% (extend 3 months) |
| Prevented failures documented | >= 5 | < 2 | 2-4 (extend) |
| Platform data uptime | > 95% | < 85% | 85-95% (remediate) |
| Maintenance team adoption | > 70% daily use | < 40% | 40-70% (change mgmt) |
| Cost avoidance documented | > $300K | < $100K | $100-300K (extend) |
| Vendor performance satisfaction | Satisfactory | Unsatisfactory | Marginal (renegotiate) |

**Decision Options:**
1. **Go:** Approve Tier 2 budget and begin expansion
2. **Extend:** Continue Tier 1 for 3 more months, re-evaluate at Month 9
3. **Pivot:** Switch vendors or approach, restart 3-month evaluation
4. **Stop:** Maintain Tier 1 only at current scale (ongoing cost: $185K/year)

---

## Phase 2: Tier 2 Deployment (Months 7-18)

### Month 7-9: Infrastructure & Expansion Planning

| # | Activity | Owner | Duration |
|---|----------|-------|----------|
| 4.1 | Azure Data Lake deployment | IT + Cloud consultant | Month 7-8 |
| 4.2 | IoT Hub setup for centralized data ingestion | IT | Month 7-8 |
| 4.3 | Hire IoT/Data Engineer | HR + IT Director | Month 7-9 (start date Month 9) |
| 4.4 | Hire Maintenance Analytics Specialist | HR + VP Ops | Month 7-9 (start date Month 9) |
| 4.5 | OT security assessment (all 4 factories) | Security consultant | Month 7-9 |
| 4.6 | Critical equipment audit (Factories 3 & 4) | Maintenance Leads | Month 7-8 |
| 4.7 | Factory 3 & 4 OT network preparation | IT | Month 8-9 |

### Month 10-13: Factory 3 & 4 Deployment

| # | Activity | Owner | Duration |
|---|----------|-------|----------|
| 5.1 | Edge gateway installation (Factories 3 & 4) | Vendor + IT | Month 10 |
| 5.2 | Sensor installation: 35-45 assets per factory | Vendor + Maintenance | Month 10-12 |
| 5.3 | Team training (Factories 3 & 4) | Vendor + Change Champions | Month 11-12 |
| 5.4 | Expand Factory 1 & 2 sensor coverage (additional 15-20 assets each) | Vendor | Month 10-13 |
| 5.5 | All sensor data flowing to Azure Data Lake | IoT/Data Engineer | Month 12-13 |
| 5.6 | OT security remediation (critical findings) | IT + Security | Month 10-13 |

### Month 14-18: Integration & Analytics

| # | Activity | Owner | Duration |
|---|----------|-------|----------|
| 6.1 | Power BI executive dashboards (OEE, MTBF, MTTR, cost) | Analytics Specialist | Month 14-15 |
| 6.2 | Production scheduling integration | IT + Production Planning | Month 14-16 |
| 6.3 | Mobile maintenance workflow deployment | IT + Vendor | Month 15-17 |
| 6.4 | Condition monitoring certification (8 maintenance leads) | External training provider | Month 14-16 |
| 6.5 | Cross-factory performance benchmarking reports | Analytics Specialist | Month 16-18 |
| 6.6 | Tier 2 comprehensive ROI report | Project Lead + Finance | Month 18 |

### Tier 2 Key Performance Indicators

| KPI | Month 10 | Month 14 | Month 18 |
|-----|----------|----------|----------|
| Assets monitored (all factories) | 80 | 110 | 120+ |
| Unplanned downtime reduction (overall) | -20% | -28% | -35% |
| OEE | 68% | 72% | 76% |
| MTTR | 5.5 hrs | 4.5 hrs | 3.5 hrs |
| Planned:unplanned ratio | 50:50 | 58:42 | 65:35 |
| Annual run-rate savings | $4.8M | $6.7M | $8.4M |
| Internal team capability | 2 FTEs onboarded | Proficient | Independent |

---

## Decision Gate 2: Tier 3 Approval (Month 18)

### Gate Criteria

| Criterion | Threshold for Go | Threshold for Hold |
|-----------|-----------------|-------------------|
| Overall downtime reduction | > 30% | < 20% |
| Annual run-rate savings | > $7M | < $5M |
| Internal team operational | Independently managing platform | Still vendor-dependent |
| Data quality in Azure Data Lake | > 95% completeness | < 85% |
| OEE improvement | > 5 percentage points | < 3 points |

---

## Phase 3: Tier 3 Deployment (Months 19-36)

### Month 19-24: Predictive Model Development

| # | Activity | Owner | Duration |
|---|----------|-------|----------|
| 7.1 | Hire or contract Data Scientist / ML Engineer | HR + IT Director | Month 19-21 |
| 7.2 | Historical data preparation and feature engineering | Data Scientist + Analytics Specialist | Month 20-23 |
| 7.3 | Custom ML model development (top 20 assets by failure cost) | Data Scientist | Month 21-24 |
| 7.4 | Model validation against historical failure data | Data Scientist + Maintenance | Month 23-24 |
| 7.5 | Expand sensor coverage to semi-critical equipment (80+ additional) | Vendor + Maintenance | Month 19-24 |

### Month 25-30: Digital Twins & Prescriptive Analytics

| # | Activity | Owner | Duration |
|---|----------|-------|----------|
| 8.1 | Digital twin modeling (20 highest-value assets) | Data Scientist + ML consultant | Month 25-28 |
| 8.2 | Prescriptive maintenance scheduling engine | Data Scientist + IT | Month 26-29 |
| 8.3 | Supply chain integration (predictive parts ordering) | IT + Procurement | Month 27-30 |
| 8.4 | Energy optimization analysis and implementation | Analytics Specialist + Plant Mgrs | Month 28-30 |

### Month 31-36: Optimization & Scale

| # | Activity | Owner | Duration |
|---|----------|-------|----------|
| 9.1 | Model performance monitoring and continuous retraining | Data Scientist | Ongoing |
| 9.2 | Continuous OT security monitoring deployment | IT + Security | Month 31-33 |
| 9.3 | Begin vendor platform evaluation: renew vs. migrate custom | IT Director + Analytics | Month 33-36 |
| 9.4 | Knowledge transfer and documentation | All | Month 34-36 |
| 9.5 | Full program ROI assessment and Phase 4 planning | Steering Committee | Month 36 |

### Tier 3 Key Performance Indicators

| KPI | Month 24 | Month 30 | Month 36 |
|-----|----------|----------|----------|
| Assets monitored | 160 | 200+ | 220+ |
| Custom predictive models deployed | 5 | 15 | 20 |
| Unplanned downtime reduction | -42% | -55% | -62% |
| OEE | 78% | 82% | 84% |
| MTTR | 3 hrs | 2.5 hrs | 2 hrs |
| Planned:unplanned ratio | 72:28 | 80:20 | 85:15 |
| Annual run-rate savings | $10M | $13.2M | $15.6M |
| Internal team size | 3 FTEs | 3 FTEs | 3 FTEs (self-sustaining) |

---

## Resource Plan

### Staffing Timeline

| Role | Month Hired | Reports To | Key Responsibility |
|------|------------|------------|-------------------|
| Project Lead (internal reallocation) | Month 0 | VP Operations | Program management, vendor coordination |
| IoT/Data Engineer | Month 9 | IT Director | Azure IoT infrastructure, data pipelines |
| Maintenance Analytics Specialist | Month 9 | VP Operations | Dashboards, reporting, analytics |
| Data Scientist / ML Engineer | Month 21 | IT Director | Custom ML models, digital twins |

### External Resources

| Resource | Duration | Estimated Cost |
|----------|----------|---------------|
| OT network assessment consultant | 3 weeks | $35,000 |
| OT security assessment firm | 4 weeks | $65,000 |
| Cloud architecture consultant (Azure IoT) | 8 weeks | $80,000 |
| ML/digital twin consulting (Tier 3) | 6 months (part-time) | $180,000 |
| Change management consultant | Intermittent, 36 months | $120,000 |

---

## Risk Register

| # | Risk | Probability | Impact | Tier | Mitigation | Contingency |
|---|------|------------|--------|------|-----------|------------|
| R1 | Vendor platform underperforms | Low | High | 1 | 90-day performance clause; pilot 5 assets first | Switch to alternate vendor from shortlist |
| R2 | Maintenance team doesn't adopt | Medium | High | 1 | Change champions, training, involve techs in design | Executive mandate, incentive alignment |
| R3 | OT network not ready for sensors | Medium | Medium | 1 | Pre-deployment network assessment | Budget for network upgrades ($50-100K) |
| R4 | Cannot hire IoT/Data Engineer | Medium | Medium | 2 | Start recruiting at Month 7; use contractor as bridge | Extend vendor professional services |
| R5 | Sensor data quality issues | Low | Medium | 1-2 | Vendor-managed sensor health monitoring | Replace faulty sensors under warranty |
| R6 | Cybersecurity incident via OT connection | Low | Critical | 2 | OT security assessment and remediation | Isolate OT network; incident response plan |
| R7 | ERP integration complexity | Medium | Medium | 1 | Simplify initial integration (API-based work orders only) | Manual work order creation as fallback |
| R8 | CFO withdraws support after Tier 1 | Low | High | 1 | Monthly financial reporting; document every prevented failure | Present Tier 1 as standalone success with $185K/year cost |
| R9 | Azure cost escalation | Low | Low | 2-3 | Reserved instances; cost monitoring alerts | Negotiate enterprise agreement |
| R10 | Key internal champion leaves | Low | High | Any | Cross-train 2+ people on every function | Documented procedures; vendor continuity |

---

## Communication Plan

| Audience | Frequency | Content | Channel |
|----------|-----------|---------|---------|
| Steering Committee | Monthly | KPIs, financials, risks, decisions needed | In-person meeting |
| CFO | Monthly | Cost vs. savings dashboard, ROI tracking | Email report + quarterly meeting |
| Plant Managers | Bi-weekly | Implementation progress, adoption metrics | Teams call |
| Maintenance Teams | Weekly | Alerts acted upon, prevented failures, tips | Floor huddle + digital board |
| All Employees (4 factories) | Quarterly | Program progress, success stories | Newsletter / townhall |
| IT Team | Weekly | Technical status, integration progress | Standup |

### Narrative Strategy

This program should be positioned as:
- **"Maintenance improvement"** -- not "digital transformation"
- **"Getting our equipment to tell us what it needs"** -- not "AI/ML deployment"
- **"Giving our maintenance team better tools"** -- not "replacing manual inspection"
- **"A capital investment with measurable returns"** -- not "an innovation initiative"

---

## Summary: 36-Month Investment and Returns

| Period | Cumulative Investment | Run-Rate Annual Savings | Cumulative Net Savings |
|--------|----------------------|------------------------|----------------------|
| Month 6 (end Tier 1) | $660K | $2.6M - $4.0M | $500K - $1.0M |
| Month 12 | $660K + ongoing | $2.6M - $4.0M | $2.2M - $3.5M |
| Month 18 (end Tier 2) | $2.64M | $8.4M - $12.0M | $6.5M - $10.0M |
| Month 24 | $2.64M + ongoing | $10.0M - $13.0M | $13.0M - $19.0M |
| Month 36 (end Tier 3) | $4.74M | $15.6M - $19.2M | $32.0M - $44.0M |

**Bottom line: A $4.74M investment over 3 years yields $32M-$44M in cumulative net savings, with the first dollar of return arriving in Month 3.**

---

*This roadmap should be reviewed and updated quarterly by the Steering Committee. All timelines assume Tier 1 approval within 2 weeks of this document.*

# TitanWorks Predictive Maintenance Program: Three-Tier Investment Proposal

**Client**: TitanWorks Manufacturing
**Date**: March 19, 2026
**Document Type**: Tiered Investment Proposal
**Approach**: Hybrid Build/Buy (Recommended)

---

## Proposal Structure

Each tier is designed to be **independently viable** — TitanWorks can stop at any tier and retain full value delivered. Each tier also naturally leads into the next, creating an upgrade path as confidence and results accumulate.

---

## Tier 1: Essential — Condition Monitoring Foundation

**Investment**: $1,100,000 (Year 1)
**Timeline**: 6 months
**Scope**: 1 factory pilot, 50 critical assets
**Primary Goal**: Prove value, establish data foundation, deliver first downtime reduction

### What TitanWorks Gets

1. **Unified Data Platform on Azure**
   - Azure IoT Hub provisioned and configured for sensor data ingestion
   - Time-series database (Azure Data Explorer) for equipment telemetry
   - Data pipeline from existing sensors (40% of pilot factory equipment) to cloud
   - Integration with existing CMMS for work order correlation
   - Dashboards showing real-time equipment health status

2. **Sensor Expansion for Pilot Factory**
   - 50 highest-criticality assets instrumented with vibration, temperature, and current sensors
   - Edge gateways installed for data collection and local buffering
   - OT network segmentation for secure cloud connectivity

3. **Condition Monitoring (Not Yet Predictive)**
   - Real-time threshold-based alerting for all monitored equipment
   - Trend visualization showing equipment degradation over time
   - Automated alert routing to maintenance supervisors
   - Weekly equipment health summary reports

4. **Process Foundation**
   - Condition-based maintenance procedures for top 20 failure modes
   - Operator training on dashboard interpretation and alert response
   - Maintenance response playbooks for each alert type

5. **Organizational Foundation**
   - Program governance: steering committee charter, roles, monthly review cadence
   - 1 internal hire: Predictive Maintenance Analyst (domain expert with analytics aptitude)
   - Knowledge transfer from implementation partner to internal team

### Cost Breakdown

| Item | Cost |
|------|------|
| Platform license (50 assets, 6 months) | $100,000 |
| Implementation partner (deployment, integration, training) | $350,000 |
| Sensor hardware & installation (50 assets) | $150,000 |
| Edge computing infrastructure (1 factory) | $75,000 |
| Azure infrastructure (6 months) | $50,000 |
| Internal hire (PdM Analyst, 6 months) | $75,000 |
| Training & change management | $100,000 |
| Program management & governance setup | $75,000 |
| Contingency (10%) | $125,000 |
| **Total** | **$1,100,000** |

### Expected Outcomes

| Metric | Target | Basis |
|--------|--------|-------|
| Unplanned downtime reduction (pilot factory) | 15-25% | Condition monitoring typically catches 15-25% of failures through threshold alerts |
| Pilot factory downtime cost reduction | $75K-$125K/month | 15-25% of ~$500K/month per-factory average |
| Annualized savings (pilot factory) | $900K-$1,500K | Extrapolated from monthly reduction |
| Mean time to detect (MTTD) degradation | <4 hours (from 24-48 hours) | Continuous monitoring vs. manual rounds |
| False positive rate | <15% | Industry benchmark for condition monitoring |

### Decision Gate (Month 6)

Before proceeding to Tier 2, evaluate:
- [ ] Actual downtime reduction vs. target
- [ ] Data quality sufficient for ML model training
- [ ] Organizational adoption (dashboard usage, alert response compliance)
- [ ] Platform vendor performance and partnership quality
- [ ] Internal hire performing and engaged
- [ ] Steering committee functioning and engaged

**Go/No-Go Decision**: If Tier 1 delivers >15% downtime reduction at pilot factory, proceed to Tier 2. If <10%, diagnose root causes before expansion.

---

## Tier 2: Recommended — Predictive Analytics & Scale

**Incremental Investment**: $2,400,000 (Month 7-18)
**Cumulative Investment**: $3,500,000
**Timeline**: 12 months (Month 7-18)
**Scope**: 2 additional factories, 150 total monitored assets, predictive models
**Primary Goal**: Move from condition monitoring to predictive maintenance, scale to 3 of 4 factories

### What TitanWorks Gets (In Addition to Tier 1)

1. **Predictive Analytics**
   - ML models trained on TitanWorks equipment data (6 months of Tier 1 data as training set)
   - Failure prediction for top 10 equipment categories with 7-30 day advance warning
   - Remaining useful life (RUL) estimation for critical rotating equipment
   - Anomaly detection for early-stage degradation patterns
   - Model performance monitoring and automated retraining pipeline

2. **Scale to 3 Factories**
   - Sensor deployment at factories 2 and 3 (80 additional assets)
   - Edge infrastructure at both additional factories
   - Data pipelines standardized and templated for rapid deployment
   - Cross-factory equipment health benchmarking

3. **Advanced Integration**
   - Bi-directional CMMS integration (predictive alerts auto-generate work orders)
   - Spare parts demand forecasting linked to predicted failures
   - ERP integration for maintenance cost tracking and reporting
   - Mobile app for maintenance technicians (alert response, work order completion)

4. **Internal Capability Building**
   - 1 additional hire: Data Engineer (build and maintain data pipelines)
   - 1 additional hire: Data Scientist (customize and improve ML models)
   - Structured knowledge transfer program from vendor to internal team
   - Data literacy training for 20 maintenance and operations staff

5. **Process Maturation**
   - Predictive maintenance workflow integration into daily operations
   - Root cause analysis framework linked to prediction accuracy
   - Continuous improvement process for model accuracy
   - Maintenance planning optimization based on predicted failures

### Cost Breakdown

| Item | Cost |
|------|------|
| Platform license expansion (100 additional assets, 12 months) | $350,000 |
| Implementation partner (Factories 2-3, ML model development) | $450,000 |
| Sensor hardware & installation (80 assets across 2 factories) | $240,000 |
| Edge computing infrastructure (2 factories) | $150,000 |
| Azure infrastructure (ML compute, expanded storage) | $200,000 |
| Internal hires (Data Engineer + Data Scientist, phased) | $380,000 |
| CMMS/ERP integration development | $150,000 |
| Training & change management (3 factories) | $180,000 |
| Mobile app deployment | $60,000 |
| Contingency (10%) | $240,000 |
| **Total Incremental** | **$2,400,000** |

### Expected Outcomes

| Metric | Target | Basis |
|--------|--------|-------|
| Unplanned downtime reduction (3 factories) | 30-45% | ML prediction adds 15-20% over condition monitoring |
| Monthly downtime cost reduction (3 factories) | $450K-$675K/month | 30-45% of ~$1,500K/month (3 factories) |
| Annualized savings (3 factories) | $5,400K-$8,100K | Extrapolated |
| Prediction accuracy (7-day window) | >75% | Industry benchmark for Year 1 ML models |
| Prediction lead time | 7-30 days before failure | Depending on failure mode |
| Spare parts inventory reduction | 15-20% | Demand forecasting benefit |
| Mean time to repair (MTTR) reduction | 20-30% | Pre-planned repairs with parts availability |

### Decision Gate (Month 18)

Before proceeding to Tier 3, evaluate:
- [ ] Prediction accuracy >70% across top equipment categories
- [ ] Downtime reduction >25% across 3 factories
- [ ] Internal team (3 people) can operate and improve models independently
- [ ] ROI exceeds 2.5x cumulative investment
- [ ] Factory 4 operational readiness confirmed
- [ ] Business case for prescriptive capabilities validated

---

## Tier 3: Comprehensive — Prescriptive Maintenance & Enterprise Optimization

**Incremental Investment**: $2,200,000 (Month 19-30)
**Cumulative Investment**: $5,700,000
**Timeline**: 12 months (Month 19-30)
**Scope**: All 4 factories, 200+ assets, prescriptive capabilities, digital twin
**Primary Goal**: Full enterprise coverage, prescriptive optimization, strategic capability

### What TitanWorks Gets (In Addition to Tiers 1 & 2)

1. **Prescriptive Maintenance**
   - Optimization engine that recommends optimal maintenance actions and timing
   - Cost-optimized maintenance scheduling (balancing downtime risk vs. maintenance cost)
   - Production schedule-aware maintenance planning (minimize production impact)
   - "What-if" scenario modeling for maintenance investment decisions

2. **Factory 4 Deployment**
   - Complete sensor coverage and data integration for remaining factory
   - Models adapted and deployed using transfer learning from factories 1-3
   - Standardized deployment process documented and repeatable

3. **Digital Twin Foundation**
   - Azure Digital Twins for critical production lines (1-2 per factory)
   - Real-time simulation of equipment health impact on production capacity
   - Scenario modeling for capital investment decisions (replace vs. maintain)

4. **Enterprise Analytics**
   - Cross-factory performance benchmarking and best practice identification
   - Fleet-level equipment reliability analysis
   - Capital planning integration (predictive data informs CapEx decisions)
   - Executive dashboard with enterprise-wide OEE and maintenance KPIs
   - Board-ready reporting on asset reliability and risk

5. **Organizational Maturity**
   - Center of Excellence for predictive maintenance (internal team of 4-5)
   - Vendor management reduced — internal team handles 70%+ of operations
   - Continuous improvement framework with quarterly model performance reviews
   - Internal training program for new maintenance staff

6. **Advanced Capabilities**
   - Natural language querying of equipment health data ("Show me all pumps trending toward failure in the next 30 days")
   - Automated root cause classification using ML
   - Integration with energy management for efficiency optimization
   - Predictive quality: correlate equipment health with product quality metrics

### Cost Breakdown

| Item | Cost |
|------|------|
| Platform license (full enterprise, 200+ assets) | $500,000 |
| Implementation partner (Factory 4, prescriptive, digital twin) | $400,000 |
| Sensor hardware & installation (Factory 4, 50 assets) | $175,000 |
| Edge computing infrastructure (Factory 4) | $75,000 |
| Azure infrastructure (Digital Twins, expanded compute) | $250,000 |
| Azure Digital Twins development | $200,000 |
| Internal team expansion (1 additional FTE) | $180,000 |
| Advanced analytics development (prescriptive engine) | $150,000 |
| Enterprise integration (capital planning, quality systems) | $100,000 |
| Training & change management | $80,000 |
| Contingency (5% — lower risk at this stage) | $90,000 |
| **Total Incremental** | **$2,200,000** |

### Expected Outcomes

| Metric | Target | Basis |
|--------|--------|-------|
| Unplanned downtime reduction (all 4 factories) | 45-60% | Prescriptive adds 10-15% over predictive |
| Monthly downtime cost reduction | $900K-$1,200K/month | 45-60% of $2M/month |
| Annualized savings | $10,800K-$14,400K | Extrapolated |
| Prediction accuracy (7-day window) | >85% | Model maturity after 24+ months of data |
| OEE improvement | 5-10% | Combined downtime, quality, and throughput |
| Maintenance cost reduction | 20-30% | Optimized scheduling and parts management |
| CapEx optimization | $500K-$1M/year | Data-driven replace vs. maintain decisions |

---

## Investment Summary

| Metric | Tier 1 | Tier 2 | Tier 3 |
|--------|--------|--------|--------|
| **Incremental Investment** | $1,100,000 | $2,400,000 | $2,200,000 |
| **Cumulative Investment** | $1,100,000 | $3,500,000 | $5,700,000 |
| **Scope** | 1 factory, 50 assets | 3 factories, 150 assets | 4 factories, 200+ assets |
| **Timeline** | Month 1-6 | Month 7-18 | Month 19-30 |
| **Annual Run-Rate Savings** | $900K-$1,500K | $5,400K-$8,100K | $10,800K-$14,400K |
| **Cumulative Savings (by end)** | $450K-$750K | $5,850K-$8,850K | $16,650K-$23,250K |
| **Internal Team Size** | 1 FTE | 3 FTEs | 4-5 FTEs |
| **Payback Period** | 10-14 months | 6-8 months (cumulative) | 5-6 months (cumulative) |

### Ongoing Annual Costs (Post-Tier 3, Year 3+)

| Category | Annual Cost |
|----------|------------|
| Platform license (200+ assets) | $550,000 |
| Azure infrastructure | $250,000 |
| Internal team (5 FTEs, fully loaded) | $900,000 |
| Sensor maintenance & replacement (5%/year) | $75,000 |
| Vendor support & consulting | $150,000 |
| Training & continuous improvement | $75,000 |
| **Total Annual Operating Cost** | **$2,000,000** |

**Net Annual Benefit (Tier 3 steady state)**: $10.8M - $14.4M savings minus $2.0M operating cost = **$8.8M - $12.4M net annual benefit**

---

## Recommendation

**Start with Tier 1.** The $1.1M investment is modest relative to the $24M/year downtime cost (4.6% of annual downtime cost) and delivers value within 6 months. The decision gate at Month 6 gives the CFO a natural checkpoint with real data before committing additional capital.

The staged approach means TitanWorks is never more than one tier's investment away from a stop decision, while the cumulative savings accelerate with each tier.

---

*See companion document: Sensitivity Analysis and ROI Model for detailed financial projections across scenarios.*

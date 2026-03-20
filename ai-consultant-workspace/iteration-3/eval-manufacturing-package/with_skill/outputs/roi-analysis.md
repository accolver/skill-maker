# ROI Analysis: TitanWorks AI-Powered Predictive Maintenance Program

## Scope

This analysis covers the combined predictive maintenance and maintenance knowledge base initiatives (Opportunities #1 and #2 from the opportunity matrix) across a 3-year horizon. These are the recommended Phase 1-2 initiatives that directly address the $2M/month unplanned downtime cost.

---

## Cost Model

### Implementation Costs

| Category | Year 1 | Year 2 | Year 3 | 3-Year Total |
| --- | --- | --- | --- | --- |
| **Consulting & Development** | | | | |
| - Predictive Maintenance Platform Setup (Buy) | $150,000 | $0 | $0 | $150,000 |
| - Maintenance Knowledge Base (GenAI RAG) | $100,000 | $0 | $0 | $100,000 |
| - Data Pipeline & Integration Engineering | $120,000 | $40,000 | $0 | $160,000 |
| - Sensor Expansion (Year 2 - 60% fleet) | $0 | $200,000 | $0 | $200,000 |
| **Infrastructure & Cloud** | | | | |
| - Azure IoT Hub + Data Services | $60,000 | $80,000 | $80,000 | $220,000 |
| - Azure ML / AI Services | $36,000 | $48,000 | $48,000 | $132,000 |
| - Azure OpenAI Service (Knowledge Base) | $24,000 | $24,000 | $24,000 | $72,000 |
| **Sensor Hardware (Year 2 expansion)** | $0 | $800,000 | $0 | $800,000 |
| **Licensing & SaaS** | | | | |
| - Predictive Maintenance Platform License | $120,000 | $120,000 | $120,000 | $360,000 |
| **Talent Acquisition** | | | | |
| - Data Engineer (hire month 4) | $100,000 | $140,000 | $145,000 | $385,000 |
| - ML Engineer/Data Scientist (hire month 10) | $30,000 | $160,000 | $165,000 | $355,000 |
| **Training & Change Management** | $60,000 | $40,000 | $20,000 | $120,000 |
| **Ongoing Maintenance & Monitoring** | $20,000 | $60,000 | $80,000 | $160,000 |
| **Governance Setup** | $30,000 | $10,000 | $10,000 | $50,000 |
| **Total** | **$850,000** | **$1,722,000** | **$692,000** | **$3,264,000** |

### Cost Assumptions

1. Staff-level AI Engineer rate: $250/hour for consulting work
2. Predictive maintenance platform: SaaS model at $10K/month (Uptake, Augury, or Azure-native)
3. Sensor hardware: $800K for instrumentation of remaining 60% of critical equipment (average $15K-$25K per equipment unit, estimated 40-50 units)
4. Cloud costs assume moderate scale across 4 factories; actual costs depend on data volume
5. Internal hires at market rate for manufacturing-adjacent data roles (data engineer: $130K-$150K all-in; ML engineer: $150K-$170K all-in)
6. First AI project multiplier of 1.3x applied to consulting estimates (per pricing guide)
7. Year 2 sensor expansion is the largest single cost item and is optional (dependent on Phase 1 success)

---

## Benefit Model

### Quantifiable Benefits

| Benefit | Metric | Current State | Year 1 Projected | Year 2 Projected | Year 3 Projected |
| --- | --- | --- | --- | --- | --- |
| Unplanned downtime reduction (40% fleet) | Monthly downtime cost | $2M/month total, ~$800K attributable to instrumented equipment | 25% reduction = $200K/month savings (ramp: 6 months to full) | 35% reduction = $280K/month | 40% reduction = $320K/month |
| Unplanned downtime reduction (full fleet, Year 2+) | Monthly downtime cost | $1.2M/month from non-instrumented equipment | $0 (sensors not yet installed) | 20% reduction = $240K/month (ramp: starts month 8) | 35% reduction = $420K/month |
| Reduced MTTR (Knowledge Base) | Mean time to repair | Baseline MTTR (estimate 4-8 hours) | 15% MTTR reduction = $40K/month | 20% reduction = $55K/month | 25% reduction = $70K/month |
| Maintenance parts optimization | Parts inventory carrying cost | Reactive ordering = premium pricing | $20K/month (planned vs. emergency parts) | $40K/month | $50K/month |
| Extended equipment lifespan | Capital expenditure deferral | Reactive maintenance accelerates wear | Minimal Year 1 | $30K/month | $50K/month |

### Annual Benefit Summary

| Benefit Stream | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| Downtime reduction (instrumented fleet) | $1,200,000 | $3,360,000 | $3,840,000 |
| Downtime reduction (expanded fleet) | $0 | $1,200,000 | $5,040,000 |
| MTTR improvement | $240,000 | $660,000 | $840,000 |
| Parts optimization | $120,000 | $480,000 | $600,000 |
| Equipment lifespan extension | $0 | $360,000 | $600,000 |
| **Total Annual Benefit** | **$1,560,000** | **$6,060,000** | **$10,920,000** |

### Benefit Assumptions (Conservative)

1. Year 1 benefits assume 6-month ramp (pilot starts month 3, production deployment month 6, full steady-state not reached until end of year)
2. Downtime reduction percentages use the **low end** of industry benchmarks (industry reports 30-50%; we use 25% Year 1, ramping to 40% Year 3)
3. Year 2 fleet expansion benefits assume sensors installed by month 6 of Year 2, with 6-month ramp
4. MTTR improvement is conservative (industry benchmarks suggest 20-30%; we use 15-25%)
5. Parts optimization savings are modest estimates for planned vs. emergency procurement
6. Equipment lifespan benefits are deliberately underestimated (hard to quantify precisely)
7. No revenue uplift from improved production capacity is included (conservative)
8. No energy savings included (would be additive if Energy Optimization pursued)

### Non-Quantifiable Benefits

These are real but difficult to assign dollar values. We acknowledge them without inflating the ROI:

- **Institutional knowledge preservation**: Maintenance knowledge base captures tribal knowledge from experienced technicians, reducing knowledge loss risk from turnover/retirement
- **Technician satisfaction**: Reduced reactive "firefighting" improves working conditions and retention
- **Safety improvement**: Predicting equipment failure before it occurs reduces risk of safety incidents
- **Customer delivery reliability**: Reduced downtime improves on-time delivery to customers
- **Competitive positioning**: AI-enabled manufacturing capability as a differentiator
- **Foundation for future AI**: Data infrastructure and talent built for predictive maintenance enable future use cases

---

## Summary

| Metric | Value |
| --- | --- |
| Total 3-Year Investment | $3,264,000 |
| Total 3-Year Benefit | $18,540,000 |
| Total 3-Year Net Benefit | $15,276,000 |
| Net Present Value (NPV, 10% discount) | $12,640,000 |
| Payback Period | **7 months** |
| 3-Year ROI | **468%** |

---

## Sensitivity Analysis

The CFO specifically requested sensitivity analysis. Below we present four scenarios ranging from pessimistic to optimistic, varying the key assumptions.

### Scenario Definitions

| Scenario | Downtime Reduction | MTTR Improvement | Benefit Realization | Description |
| --- | --- | --- | --- | --- |
| **Pessimistic** | 50% of base case | 50% of base case | 12-month ramp (delayed) | Everything takes longer and delivers less than expected. Sensor expansion delayed. |
| **Conservative** | 75% of base case | 75% of base case | 9-month ramp | Slower adoption, lower performance than base case but still meaningful. |
| **Base Case** | As modeled | As modeled | 6-month ramp | Our recommended planning scenario using industry low-end benchmarks. |
| **Optimistic** | 130% of base case | 130% of base case | 4-month ramp | Above-average execution matching industry median performance. |

### Scenario Results

| Scenario | 3-Year Benefit | 3-Year Cost | 3-Year Net | Payback Period | 3-Year ROI |
| --- | --- | --- | --- | --- | --- |
| **Pessimistic** | $9,270,000 | $3,264,000 | $6,006,000 | 14 months | 184% |
| **Conservative** | $13,905,000 | $3,264,000 | $10,641,000 | 10 months | 326% |
| **Base Case** | $18,540,000 | $3,264,000 | $15,276,000 | 7 months | 468% |
| **Optimistic** | $24,102,000 | $3,264,000 | $20,838,000 | 5 months | 639% |

### Phase 1 Only Analysis (For CFO: Minimal Commitment Scenario)

If TitanWorks commits only to Phase 1 (predictive maintenance on existing 40% fleet + knowledge base) without sensor expansion:

| Metric | Phase 1 Only |
| --- | --- |
| Year 1 Investment | $850,000 |
| Year 1 Benefit (with ramp) | $1,560,000 |
| Year 1 Net | $710,000 |
| Payback Period | 7 months |
| Year 1 ROI | 83% |

**Key message for CFO**: Even in the pessimistic scenario with 50% of projected benefits, the program delivers a 184% 3-year ROI with a 14-month payback. Phase 1 alone, with no sensor expansion commitment, pays for itself in 7 months using conservative assumptions. The $850K Phase 1 investment is 3.5% of the $24M annual downtime cost.

### Break-Even Analysis

The program breaks even (3-year costs equal 3-year benefits) when benefits reach just **18% of the base case projection**. This means the predictive maintenance system only needs to reduce unplanned downtime by approximately 4.5% (instead of the projected 25-40%) to justify the investment. This provides an extremely wide margin of safety.

---

## Risks to ROI

| Risk | Probability | Impact on ROI | Mitigation |
| --- | --- | --- | --- |
| OT/IT integration takes longer than planned | Medium | Delays benefit realization by 2-4 months | Early OT assessment, Azure IoT Edge for secure bridging |
| Sensor data quality insufficient for ML | Low-Medium | Reduces prediction accuracy, lower downtime reduction | Data quality validation in Phase 1 pilot before scaling |
| Organizational resistance to trusting AI predictions | Medium | Slower adoption curve, delayed benefits | Change management program, start with alerts (human decides) not automated actions |
| Key personnel turnover during implementation | Low | Delays, knowledge loss | Document everything, multi-person knowledge distribution |
| Sensor expansion CAPEX not approved | Medium | Caps benefits at 40% fleet coverage | Phase 1 ROI case funds Phase 2. Sensor expansion is optional. |
| Cloud costs exceed projections | Low | Increases cost by 10-20% | Azure cost management and Reserved Instances |
| Vendor platform underperforms | Low | Requires platform switch, 3-6 month delay | Pilot evaluation with clear performance criteria before committing |

---

## Cost of Inaction

The most important number in this analysis:

**TitanWorks is currently losing $2,000,000 per month to unplanned downtime.**

Every month of delay costs $2M. Over the 7-month payback period for Phase 1, the cumulative cost of inaction is $14M versus a Phase 1 investment of $850K. Even accounting for uncertainty, the cost of doing nothing far exceeds the cost of acting.

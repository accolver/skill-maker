# ROI Analysis: TitanWorks AI Initiatives

## Baseline

| Metric | Value |
| --- | --- |
| Current unplanned downtime cost | $2,000,000/month ($24,000,000/year) |
| Instrumented equipment | 40% of critical equipment |
| Uninstrumented equipment | 60% of critical equipment |
| Industry benchmark for PdM downtime reduction | 30-50% |
| Number of factories | 4 |
| Annual revenue | $300,000,000 |

**Assumption**: Downtime cost is distributed proportionally across equipment — 40% instrumented equipment accounts for ~$9.6M/year; 60% uninstrumented accounts for ~$14.4M/year.

---

## Initiative 1: Predictive Maintenance Pilot (Instrumented Equipment)

### Cost Model

| Category | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| Consulting/Integration (SaaS PdM platform) | $350,000 | $50,000 | $50,000 |
| PdM Platform Licensing (SaaS) | $180,000 | $180,000 | $180,000 |
| Azure IoT Infrastructure (IoT Hub, Stream Analytics, Storage) | $120,000 | $100,000 | $100,000 |
| Training & Change Management | $80,000 | $30,000 | $20,000 |
| Data Engineering (pipeline from OT to cloud) | $150,000 | $40,000 | $40,000 |
| **Total** | **$880,000** | **$400,000** | **$390,000** |

### Assumptions
- SaaS PdM platform (e.g., Augury, Uptake) with annual licensing
- 300-400 staff engineer hours for initial integration at blended rate of ~$250/hr
- Azure IoT costs based on 4 factories, ~40% equipment sensors streaming data
- Year 1 includes one-time setup; Years 2-3 are maintenance and licensing
- First AI project multiplier (1.3x) applied to consulting hours
- Training covers IT team, maintenance technicians, and plant managers

### Benefit Model

| Benefit | Metric | Current State | Projected (Year 1) | Projected (Steady State Y2+) | Annual Value (Steady State) |
| --- | --- | --- | --- | --- | --- |
| Reduced unplanned downtime (instrumented equipment) | Downtime hours | $9.6M/year cost | 20% reduction (ramp) | 35% reduction | $3,360,000 |
| Reduced emergency repair costs | Repair spend | Reactive | 15% reduction | 25% reduction | ~$400,000 |
| Extended equipment life | Replacement capex | Normal lifecycle | 5% extension | 10% extension | ~$200,000 |
| Reduced spare parts inventory (predictive ordering) | Inventory carrying cost | Reactive ordering | 10% reduction | 20% reduction | ~$150,000 |

**Year 1 Benefit (6-month ramp)**: ~$2,000,000 (partial year, ramp-up period)
**Year 2+ Annual Benefit**: ~$4,110,000

### Assumptions
- Conservative 35% downtime reduction (industry range: 30-50%) on instrumented 40% only
- 6-month ramp in Year 1 as system learns equipment baselines and builds history
- Emergency repair cost reduction based on shift from reactive to planned maintenance
- Equipment life extension is conservative; some sources cite 15-25%

---

## Initiative 2: Maintenance Knowledge Base (GenAI)

### Cost Model

| Category | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| Consulting/Development (RAG pipeline) | $200,000 | $40,000 | $40,000 |
| Azure OpenAI + Azure AI Search | $36,000 | $36,000 | $36,000 |
| Content development (manual digitization, knowledge capture) | $60,000 | $20,000 | $15,000 |
| Training & Adoption | $30,000 | $15,000 | $10,000 |
| **Total** | **$326,000** | **$111,000** | **$101,000** |

### Benefit Model

| Benefit | Metric | Current | Projected | Annual Value |
| --- | --- | --- | --- | --- |
| Reduced mean time to repair (MTTR) | Hours per repair | Baseline | 15% reduction | ~$600,000 |
| Reduced knowledge concentration risk | Dependency on individuals | High risk | Medium risk | Qualitative |
| Faster onboarding of new technicians | Ramp time | 6-12 months | 3-6 months | ~$100,000 |

**Year 1 Benefit**: ~$350,000 (partial year)
**Year 2+ Annual Benefit**: ~$700,000

---

## Initiative 3: Sensor Expansion + Full PdM Coverage

### Cost Model

| Category | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| Sensor hardware and installation | — | $800,000 | $200,000 |
| OT/IT network upgrades | — | $200,000 | $50,000 |
| Integration with PdM platform | — | $150,000 | $50,000 |
| Additional PdM platform licensing | — | $120,000 | $180,000 |
| **Total** | **—** | **$1,270,000** | **$480,000** |

*Note: This initiative starts in Year 2 after PdM pilot proves value.*

### Benefit Model

| Benefit | Metric | Projected (Year 2) | Projected (Year 3) | Annual Value (Steady State) |
| --- | --- | --- | --- | --- |
| Reduced unplanned downtime (remaining 60%) | Downtime hours | 15% reduction (ramp) | 35% reduction | $5,040,000 |
| Same secondary benefits as Initiative 1 | Various | Proportional | Proportional | ~$600,000 |

**Year 2 Benefit**: ~$2,000,000 (partial coverage during rollout)
**Year 3+ Annual Benefit**: ~$5,640,000

---

## Combined 3-Year Summary

| Metric | Value |
| --- | --- |
| **Total 3-Year Investment** | **$3,958,000** |
| **Total 3-Year Benefit** | **$15,400,000** |
| **Net Present Value (NPV at 10%)** | **$9,700,000** |
| **Payback Period** | **8-10 months** (Initiative 1 alone pays back in Year 1) |
| **3-Year ROI** | **289%** |

### Year-by-Year Cash Flow

| Year | Investment | Benefit | Net |
| --- | --- | --- | --- |
| Year 1 | $1,206,000 | $2,350,000 | +$1,144,000 |
| Year 2 | $1,781,000 | $6,810,000 | +$5,029,000 |
| Year 3 | $971,000 | $10,450,000 | +$9,479,000 |

---

## Sensitivity Analysis

The CFO specifically requested sensitivity analysis. Below are 4 scenarios varying the key assumption: downtime reduction percentage achieved.

### Scenario Definitions

| Scenario | Downtime Reduction (Instrumented) | Downtime Reduction (Full Coverage) | Description |
| --- | --- | --- | --- |
| **Pessimistic** | 15% | 15% | System underperforms. Data quality issues, slow adoption, partial coverage only. Half of industry minimum. |
| **Conservative** | 25% | 25% | Below industry average. Accounts for data gaps, learning curve, organizational friction. |
| **Base Case** | 35% | 35% | Mid-range of industry benchmarks (30-50%). Assumes competent execution and reasonable adoption. |
| **Optimistic** | 50% | 50% | Top of industry range. Assumes strong execution, full adoption, high data quality. |

### 3-Year Financial Comparison

| Scenario | 3-Year Investment | 3-Year Benefit | Net Value | ROI | Payback Period |
| --- | --- | --- | --- | --- | --- |
| **Pessimistic** | $3,958,000 | $6,600,000 | $2,642,000 | 67% | 18-20 months |
| **Conservative** | $3,958,000 | $11,000,000 | $7,042,000 | 178% | 11-13 months |
| **Base Case** | $3,958,000 | $15,400,000 | $11,442,000 | 289% | 8-10 months |
| **Optimistic** | $3,958,000 | $22,000,000 | $18,042,000 | 456% | 5-7 months |

### Key Insight for the CFO

**Even in the pessimistic scenario (15% downtime reduction — half the industry minimum), the initiative still delivers positive ROI of 67% over 3 years with an 18-20 month payback.** The investment cost of ~$4M against a $24M/year problem means the bar for positive return is extremely low — TitanWorks only needs to reduce downtime by approximately 6% to break even on the investment.

**Break-even downtime reduction: ~6%** (compared to industry benchmark of 30-50%).

### Cost of Inaction

| Scenario | Year 1 | Year 2 | Year 3 | 3-Year Total |
| --- | --- | --- | --- | --- |
| Downtime stays flat at $2M/month | $24,000,000 | $24,000,000 | $24,000,000 | $72,000,000 |
| Downtime increases 5%/year (aging equipment) | $24,000,000 | $25,200,000 | $26,460,000 | $75,660,000 |
| Downtime increases 10%/year (accelerated degradation) | $24,000,000 | $26,400,000 | $29,040,000 | $79,440,000 |

**The cost of doing nothing is $72-79M over 3 years.** Equipment doesn't get younger — the most likely trajectory without intervention is increasing downtime costs.

---

## Risks to ROI

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Data quality insufficient for accurate predictions | Medium | High — reduces prediction accuracy | Invest in data engineering; pilot on best-instrumented equipment first |
| Low adoption by maintenance teams | Medium | High — predictions generated but not acted on | Change management program; involve technicians in design; demonstrate value early |
| Sensor data pipeline reliability | Low-Medium | Medium — gaps in data reduce model performance | Azure IoT provides managed infrastructure; monitor pipeline health |
| Longer ramp time than projected | Medium | Medium — delays benefit realization by 3-6 months | Conservative ramp assumptions already built in; Phase 1 uses best available data |
| PdM vendor viability or pricing changes | Low | Medium — switching costs if vendor fails | Select established vendor; negotiate multi-year pricing; ensure data portability |
| Organizational resistance from previous failure | Medium | High — could stall or cancel the program | Address directly; quick wins; transparent communication; phased investment |

---

## Non-Quantifiable Benefits

These are real but difficult to put credible dollar values on. The ROI analysis above intentionally excludes them to keep projections conservative:

- **Employee safety**: Predicting equipment failure before catastrophic events reduces safety incidents
- **Employee retention**: Technicians prefer working with modern tools; reduces turnover
- **Customer satisfaction**: More reliable production means better delivery performance
- **Competitive positioning**: AI-enabled manufacturing as a market differentiator
- **Organizational capability**: Building data and AI muscle for future initiatives
- **Insurance costs**: Potential reduction with demonstrated predictive maintenance program

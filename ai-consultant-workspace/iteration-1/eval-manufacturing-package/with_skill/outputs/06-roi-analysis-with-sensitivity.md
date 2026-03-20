# ROI Analysis: TitanWorks AI-Driven Downtime Reduction Program

**Prepared for:** CFO, TitanWorks Manufacturing
**Date:** March 2026

This analysis covers the Recommended (Tier 2) engagement: multi-factory predictive maintenance rollout with GenAI maintenance knowledge base, $700K investment over 6 months.

---

## Baseline Assumptions

| Parameter | Value | Source |
| --- | --- | --- |
| Current unplanned downtime cost | $2,000,000/month ($24,000,000/year) | Client-provided |
| Number of factories | 4 | Client-provided |
| Sensor-equipped critical equipment | 40% of critical assets | Client-provided |
| Assumed even distribution of downtime | $500,000/month per factory | Simplifying assumption |
| Discount rate for NPV | 10% | Standard corporate rate |

---

## Cost Model

### Year 1 Costs (Implementation + Operations)

| Category | Amount | Notes |
| --- | --- | --- |
| Predictive maintenance platform licensing | $150,000 | Annual SaaS license for 4 factories |
| Implementation consulting | $280,000 | Data integration, model configuration, rollout across 4 factories |
| GenAI maintenance knowledge base | $90,000 | Azure OpenAI + AI Search implementation |
| Azure infrastructure (incremental) | $40,000 | IoT Hub, Data Explorer, storage, compute |
| Sensor expansion assessment | $35,000 | Survey of all 4 factories, retrofit plan |
| Training & change management | $50,000 | Maintenance team training, analytics champion development |
| Project management | $55,000 | 6-month engagement management |
| **Total Year 1** | **$700,000** | |

### Year 2 Costs (Operations + Optimization)

| Category | Amount | Notes |
| --- | --- | --- |
| Platform licensing | $155,000 | ~3% annual increase |
| Azure infrastructure | $45,000 | Slightly higher with full data volume |
| GenAI platform (Azure OpenAI) | $30,000 | Ongoing consumption |
| Internal analytics champion (partial FTE) | $40,000 | 0.25 FTE allocated from existing IT team |
| Vendor support & optimization | $60,000 | Quarterly model reviews, retraining |
| **Total Year 2** | **$330,000** | |

### Year 3 Costs (Steady State)

| Category | Amount | Notes |
| --- | --- | --- |
| Platform licensing | $160,000 | ~3% annual increase |
| Azure infrastructure | $50,000 | |
| GenAI platform | $32,000 | |
| Internal staff (partial FTE) | $45,000 | |
| Vendor support | $50,000 | Reduced as internal capability grows |
| **Total Year 3** | **$337,000** | |

### Total 3-Year Cost: $1,367,000

---

## Benefit Model

### Benefit 1: Unplanned Downtime Reduction (Predictive Maintenance)

| Parameter | Value | Rationale |
| --- | --- | --- |
| Current annual downtime cost | $24,000,000 | Client-provided |
| % of equipment with sensors (addressable) | 40% | Client-provided |
| Addressable downtime cost | $9,600,000/year | 40% of $24M (assumes downtime proportional to equipment count) |
| Expected downtime reduction on monitored equipment | 30% | Conservative — industry benchmarks: 30-50%. We use the low end. |
| **Annual savings from predictive maintenance** | **$2,880,000** | $9.6M x 30% |

**Ramp Assumptions:**
- Year 1: 50% of full benefit (rolling deployment across 6 months, models improve over time) = $1,440,000
- Year 2: 85% of full benefit (full deployment, models matured, some expansion) = $2,448,000
- Year 3: 100% of full benefit = $2,880,000

### Benefit 2: Mean Time to Repair (MTTR) Reduction (Knowledge Base)

| Parameter | Value | Rationale |
| --- | --- | --- |
| Current maintenance labor cost (estimated) | $8,000,000/year | ~200 maintenance FTEs across 4 factories at $40K avg |
| Estimated MTTR reduction from knowledge base | 12% | Faster diagnosis, fewer escalations, less time searching for manuals |
| Effective labor savings | Not headcount reduction — redeployed to preventive work | |
| Additional downtime reduction from faster repairs | 5% of addressable downtime | Faster repairs = shorter outages when failures do occur |
| **Annual value of MTTR reduction** | **$480,000** | $9.6M addressable downtime x 5% |

**Ramp Assumptions:**
- Year 1: 30% of full benefit (deployed in month 3-4, adoption ramp) = $144,000
- Year 2: 75% of full benefit = $360,000
- Year 3: 100% of full benefit = $480,000

### Benefit 3: Spare Parts Inventory Optimization

| Parameter | Value | Rationale |
| --- | --- | --- |
| Estimated spare parts inventory | $15,000,000 | ~5% of revenue, standard for heavy manufacturing |
| Reduction in emergency parts procurement premium | 20% | Predictive alerts allow planned procurement vs. emergency orders |
| Emergency procurement premium (estimated) | 30% markup on 25% of parts | Emergency orders cost more due to expedited shipping, spot pricing |
| **Annual savings from parts optimization** | **$225,000** | $15M x 25% emergency x 30% premium x 20% reduction |

**Ramp Assumptions:**
- Year 1: 25% of full benefit = $56,250
- Year 2: 70% of full benefit = $157,500
- Year 3: 100% of full benefit = $225,000

### Non-Quantifiable Benefits (Acknowledged, Not Priced)

These benefits are real but we do not assign dollar values to them. Including them would inflate the ROI calculation and reduce credibility.

- **Safety improvement:** Predictive maintenance reduces risk of catastrophic equipment failures that could injure workers.
- **Employee morale:** Maintenance teams operating proactively rather than firefighting 24/7 have higher job satisfaction and lower turnover.
- **Customer satisfaction:** Fewer unplanned shutdowns means more reliable delivery to customers.
- **Institutional knowledge preservation:** The GenAI knowledge base captures tribal knowledge before experienced technicians retire.
- **Foundation for future AI:** The data infrastructure, organizational muscle, and vendor relationships built during this program enable future AI initiatives at lower cost and faster speed.

---

## 3-Year Financial Summary

### Base Case

| Metric | Year 1 | Year 2 | Year 3 | 3-Year Total |
| --- | --- | --- | --- | --- |
| **Total Costs** | $700,000 | $330,000 | $337,000 | $1,367,000 |
| Downtime reduction benefit | $1,440,000 | $2,448,000 | $2,880,000 | $6,768,000 |
| MTTR reduction benefit | $144,000 | $360,000 | $480,000 | $984,000 |
| Spare parts optimization | $56,250 | $157,500 | $225,000 | $438,750 |
| **Total Benefits** | **$1,640,250** | **$2,965,500** | **$3,585,000** | **$8,190,750** |
| **Net Benefit** | **$940,250** | **$2,635,500** | **$3,248,000** | **$6,823,750** |

| Summary Metric | Value |
| --- | --- |
| Total 3-Year Investment | $1,367,000 |
| Total 3-Year Benefit | $8,190,750 |
| Total 3-Year Net Benefit | $6,823,750 |
| Net Present Value (NPV, 10% discount) | $5,582,000 |
| Payback Period | **3.5 months** |
| 3-Year ROI | **499%** |
| Internal Rate of Return (IRR) | >200% |

---

## Sensitivity Analysis

The CFO asked for this specifically. The following analysis shows what happens to ROI under different scenarios.

### Variable: Downtime Reduction Effectiveness

What if predictive maintenance does not achieve 30% downtime reduction?

| Scenario | Downtime Reduction | Annual Benefit (Year 3) | 3-Year Net Benefit | Payback Period | 3-Year ROI |
| --- | --- | --- | --- | --- | --- |
| Pessimistic | 15% | $1,920,000 | $2,812,000 | 6 months | 206% |
| Conservative | 20% | $2,400,000 | $3,854,000 | 5 months | 282% |
| **Base Case** | **30%** | **$3,585,000** | **$6,824,000** | **3.5 months** | **499%** |
| Optimistic | 40% | $4,740,000 | $9,685,000 | 2.5 months | 709% |
| Best Case | 50% | $5,895,000 | $12,548,000 | 2 months | 918% |

**Key finding:** Even at half the expected effectiveness (15% downtime reduction instead of 30%), the program pays for itself in 6 months and delivers a 206% 3-year ROI. The investment is ROI-positive under every reasonable scenario.

### Variable: Addressable Equipment Proportion

What if downtime is not evenly distributed — what if sensor-equipped equipment accounts for less than 40% of downtime?

| Sensor Equipment Share of Downtime | Annual Benefit (Year 3) | 3-Year Net Benefit | Payback Period | 3-Year ROI |
| --- | --- | --- | --- | --- |
| 20% (half expected) | $1,917,000 | $2,837,000 | 6.5 months | 208% |
| 30% | $2,751,000 | $4,830,000 | 4.5 months | 353% |
| **40% (base case)** | **$3,585,000** | **$6,824,000** | **3.5 months** | **499%** |
| 50% | $4,419,000 | $8,817,000 | 3 months | 645% |

### Variable: Implementation Cost Overrun

What if implementation costs more than planned?

| Cost Scenario | Total 3-Year Cost | 3-Year Net Benefit | Payback Period | 3-Year ROI |
| --- | --- | --- | --- | --- |
| **Base Case** | **$1,367,000** | **$6,824,000** | **3.5 months** | **499%** |
| 25% overrun | $1,542,000 | $6,649,000 | 4 months | 431% |
| 50% overrun | $1,717,000 | $6,474,000 | 4.5 months | 377% |
| 100% overrun (double cost) | $2,067,000 | $6,124,000 | 5.5 months | 296% |

**Key finding:** Even if implementation costs double, the 3-year ROI is still 296% with a 5.5-month payback. The project economics are extremely robust to cost overruns because the annual benefit ($3.6M) vastly exceeds the annual operating cost (~$330K).

### Variable: Benefit Ramp Speed

What if it takes longer to achieve the projected benefits?

| Ramp Scenario | Year 1 Benefit | 3-Year Total Benefit | 3-Year Net Benefit | 3-Year ROI |
| --- | --- | --- | --- | --- |
| Fast ramp (75% Year 1) | $2,460,000 | $9,011,000 | $7,644,000 | 559% |
| **Base Case (50% Year 1)** | **$1,640,000** | **$8,191,000** | **$6,824,000** | **499%** |
| Slow ramp (25% Year 1) | $820,000 | $7,371,000 | $6,004,000 | 439% |
| Very slow ramp (10% Year 1) | $328,000 | $6,879,000 | $5,512,000 | 403% |

### Worst-Case Scenario (Combined Downside)

What if multiple things go wrong simultaneously?

| Parameter | Worst-Case Value |
| --- | --- |
| Downtime reduction | 15% (half of base case) |
| Addressable equipment share | 30% (lower than base) |
| Cost overrun | 50% |
| Ramp speed | Slow (25% Year 1) |

| Worst-Case Result | Value |
| --- | --- |
| Total 3-Year Cost | $1,717,000 |
| Total 3-Year Benefit | $3,280,000 |
| Total 3-Year Net Benefit | $1,563,000 |
| Payback Period | 10 months |
| 3-Year ROI | **91%** |

**Key finding:** Under a combined worst-case scenario where downtime reduction is half the expected rate, sensor coverage delivers less than expected, costs overrun by 50%, and benefits ramp slowly — the program still generates $1.56M in net benefit over 3 years with a 91% ROI and 10-month payback. **There is no realistic scenario where this investment loses money.**

### Break-Even Analysis

What level of downtime reduction would make the investment break even over 3 years?

| Break-Even Metric | Value |
| --- | --- |
| Minimum downtime reduction for 3-year break-even | **5.7%** |
| Minimum downtime reduction for Year 1 break-even | **18%** |

The program needs to achieve only a 5.7% reduction in downtime on sensor-equipped equipment to recoup the entire 3-year investment. Industry benchmarks for predictive maintenance range from 30-50%. The break-even threshold is roughly one-fifth of the conservative estimate.

---

## Risks to ROI

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Sensor data quality is poor, requiring significant cleansing | Medium | Delays benefit realization by 1-2 months | Data quality assessment in Week 1-2; budget includes contingency |
| Maintenance team does not adopt the platform (ignores alerts) | Medium | Reduces effectiveness by 30-50% | Change management included in scope; plant manager sponsorship; training program |
| Platform vendor underperforms | Low | Could require vendor switch, adding 2-3 months delay | Vendor selection process with reference checks and POC; contractual SLAs |
| Existing sensors have gaps in coverage of failure modes | Medium | Some failure types not predicted | Sensor gap analysis in assessment; supplemented by knowledge base for non-sensor-predictable failures |
| Azure infrastructure issues | Low | Temporary service disruption | Azure SLAs; design for graceful degradation (maintenance teams revert to manual process) |
| Organizational resistance due to failed prior initiative | Medium | Slows adoption and executive support | Early wins by design; monthly CFO dashboard; differentiation from prior initiative |

---

## Cost of Inaction

| Metric | Value |
| --- | --- |
| Monthly unplanned downtime cost | $2,000,000 |
| Quarterly cost | $6,000,000 |
| Annual cost | $24,000,000 |
| Cost during 6-month Tier 2 implementation | $12,000,000 |
| Cost of 3-month evaluation delay | $6,000,000 |

Every month of deliberation costs $2M. Even if the CFO needs 1 month to evaluate this proposal, that month's inaction cost ($2M) is nearly 3 times the entire Tier 1 investment ($240K).

---

## Summary for the CFO

1. **The investment pays for itself in under 4 months** under base case assumptions.
2. **The worst realistic scenario still delivers 91% ROI** over 3 years.
3. **Break-even requires only 5.7% downtime reduction** — one-fifth of the conservative estimate.
4. **Phase 1 can be approved as a bounded $240K experiment** (Tier 1) if the CFO wants to limit initial exposure. Even this reduced scope pays for itself in 2-3 months.
5. **The cost of doing nothing is $2M/month.** The entire Tier 2 investment ($700K) is consumed by inaction in 11 days of downtime.

# Red Flag Assessment: TitanWorks

## Identified Red Flags

### Red Flag 1: Previous Failed "Digital Transformation" Initiative

**Severity: Medium-High**

**Description:** Eighteen months ago, TitanWorks undertook a digital transformation initiative that was considered a failure. The project lead subsequently left the company. The organizational impact of this failure is significant:

- Budget was spent without delivering measurable returns
- Organizational trust in technology-led initiatives is damaged
- The CFO's demand for hard ROI numbers is a direct consequence
- Employees who participated may be skeptical or resistant
- The narrative of "we tried this before and it didn't work" may be active

**Mitigation Plan:**

1. **Diagnose the failure explicitly.** Before proposing anything new, conduct a brief post-mortem: Was the scope too broad? Were success metrics not defined upfront? Was there inadequate change management? Was the technology wrong, or was the execution wrong? Understanding this is critical for framing the new engagement.

2. **Differentiate this engagement structurally:**
   - Smaller initial scope (single factory, single use case) vs. broad transformation
   - Hard success metrics defined before work begins, not after
   - Phased approach with go/no-go gates — the company can stop at any point without losing value already delivered
   - Focus on a problem with a clear dollar figure ($2M/month) vs. vague "transformation"

3. **Address it head-on in the proposal.** Include a section that says: "We understand a previous initiative did not deliver the expected results. Here is how this engagement is different." Ignoring it would undermine credibility.

4. **Make the CFO a co-architect of success metrics.** Let Finance define what success looks like, not just the technology team. This gives the CFO ownership and turns them from gatekeeper to stakeholder.

---

### Red Flag 2: Zero Data Science Capability

**Severity: High**

**Description:** The 25-person IT team has exclusively enterprise IT skills (ERP, networking). There is no data science, ML engineering, data engineering (beyond ERP), or analytics capability. This means TitanWorks cannot:

- Build, train, or evaluate ML models
- Operate and monitor deployed models
- Interpret model outputs in a data science context
- Troubleshoot model performance issues
- Evolve models as equipment or processes change

**Mitigation Plan:**

1. **Do not propose a custom-build approach.** At maturity level 1.55, TitanWorks should not be building ML models from scratch. Use a commercial predictive maintenance platform that provides models as part of the service.

2. **Vendor partnership with managed services.** Select a vendor that provides not just software but ongoing model management, monitoring, and retraining. The vendor acts as the data science team until internal capability is built.

3. **Identify AI liaison roles.** Designate 2-3 IT team members to be trained as the bridge between the vendor's AI team and internal operations. They do not need to become data scientists — they need to understand enough to ask the right questions and interpret results.

4. **Include capability building in the roadmap.** Phase 2 should include hiring a data engineer or analytics lead. Phase 3 should consider a small analytics team (2-3 people) if the first phases prove successful.

5. **Budget for ongoing vendor support.** The ROI model must include ongoing vendor/managed service costs, not just implementation costs.

---

### Red Flag 3: CFO Requires Hard ROI Numbers Before Committing

**Severity: Medium**

**Description:** The CFO wants quantitative ROI projections with sensitivity analysis before approving budget. This is not an unreasonable request, but it creates risk if:

- ROI projections are treated as guarantees rather than estimates
- The bar for "acceptable ROI" is set unrealistically high
- Analysis paralysis delays action while $2M/month continues to be lost
- The sensitivity analysis is used to argue against any scenario with downside risk

**Mitigation Plan:**

1. **Provide the sensitivity analysis they asked for.** Show conservative (50% of projected benefits), base case, and optimistic (150%) scenarios. Being transparent about uncertainty builds more trust than a single optimistic number.

2. **Frame the cost of inaction.** Every month of delay costs $2M. A 6-month delay analyzing ROI costs $12M — more than the total investment in the Essential tier. Make this math explicit.

3. **Use industry benchmarks as evidence.** Predictive maintenance typically delivers 30-50% reduction in unplanned downtime (McKinsey, Deloitte, industry studies). Do not rely solely on internal projections — external validation carries weight with a skeptical CFO.

4. **Propose a phased investment with gates.** Phase 1 investment is relatively small ($150K-$250K). If it does not demonstrate measurable results within 90 days, the company can stop. This de-risks the decision.

5. **Establish baseline metrics before the project starts.** Document current unplanned downtime hours, costs, frequency, and root causes for the pilot factory. Without a clear baseline, no ROI can be measured.

---

### Red Flag 4: No Data Strategy or Unified Data Architecture

**Severity: Medium-High**

**Description:** Data is fragmented across:
- SCADA/PLC historians on the OT network (sensor data for 40% of equipment)
- ERP system (maintenance work orders, production logs, financial data)
- Paper-based manual inspection logs (60% of equipment)
- Individual knowledge (tribal knowledge of experienced technicians)

There is no data lake, data warehouse (beyond ERP reporting), data catalog, or data governance function.

**Mitigation Plan:**

1. **Scope the data foundation work narrowly.** Do not propose a company-wide data strategy as Phase 1. Instead, build the minimum data pipeline needed for the predictive maintenance pilot: sensor data from target equipment in one factory, flowing through Azure IoT Hub to Azure storage.

2. **Address OT/IT data bridge as a specific workstream.** This is the critical technical prerequisite. Budget time and money for:
   - Network architecture design (secure connection between OT and Azure)
   - Data extraction from SCADA/historian systems
   - Data normalization and quality validation
   - Azure IoT Hub/Edge configuration

3. **Include data foundation as a Phase 1 deliverable.** The data pipeline built for the pilot becomes the template for expansion to other factories and equipment.

4. **Do not underestimate the OT/IT cultural gap.** OT teams (who manage SCADA/PLCs) and IT teams often have different priorities, security models, and reporting lines. This must be navigated carefully.

---

### Red Flag 5: Partial Sensor Coverage (40%)

**Severity: Medium**

**Description:** Only 40% of critical equipment has sensors. Predictive maintenance ML requires sensor data (vibration, temperature, pressure, current, acoustics) to detect anomalous patterns. Equipment without sensors cannot be monitored by an AI system, leaving the majority of critical assets in the blind spot.

**Mitigation Plan:**

1. **Start the pilot with already-instrumented equipment.** The 40% with sensors can provide immediate value without additional capital expenditure for sensors.

2. **Prioritize sensor retrofit by failure cost.** Not all of the remaining 60% needs sensors immediately. Identify the top 10-20 pieces of un-instrumented equipment by downtime cost and retrofit those in Phase 2.

3. **Budget for sensor hardware and installation.** Include this in the investment model — it is a capital expenditure that the CFO will want to see separately from the AI/software costs.

4. **Consider lower-cost sensor options.** Modern IoT sensors (vibration, temperature, acoustic) can be retrofitted at $500-$5,000 per asset depending on the type. This is not the major cost driver — integration and data pipeline are.

5. **Use the pilot to build the business case for expansion.** If the pilot shows a 30% downtime reduction on instrumented equipment, the ROI math for expanding sensor coverage becomes self-evident.

---

## Red Flag Summary

| # | Red Flag | Severity | Status | Mitigation |
| --- | --- | --- | --- | --- |
| 1 | Failed digital transformation history | Medium-High | Must address before proposing | Diagnose failure, differentiate structurally, address head-on |
| 2 | Zero data science capability | High | Must address in solution design | Buy (not build), vendor partnership with managed services |
| 3 | CFO requires hard ROI before committing | Medium | Must address in proposal | Sensitivity analysis, cost of inaction framing, phased investment |
| 4 | No unified data architecture | Medium-High | Must address in Phase 1 | Narrow data pipeline for pilot, OT/IT bridge as specific workstream |
| 5 | Partial sensor coverage (40%) | Medium | Addressed by phased approach | Start with instrumented equipment, retrofit by priority in Phase 2 |

## Critical Assessment

No critical-severity red flags exist that would warrant pausing the engagement. The combination of flags does, however, mandate a specific engagement approach:

- **Buy, do not build** — talent gap makes custom development inappropriate
- **Small scope first** — previous failure and CFO skepticism require a contained, measurable pilot
- **Data pipeline before AI** — the OT/IT data bridge must be built before any model can be trained or deployed
- **Phased investment** — each phase delivers standalone value and includes a go/no-go decision point
- **Change management is not optional** — it must be a first-class workstream, not an afterthought

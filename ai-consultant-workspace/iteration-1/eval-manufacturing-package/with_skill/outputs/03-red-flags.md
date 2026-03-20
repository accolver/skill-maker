# Red Flag Assessment: TitanWorks

## Identified Red Flags

### Red Flag 1: Previous Failed "Digital Transformation" Initiative

| Attribute | Detail |
| --- | --- |
| Severity | **Medium-High** |
| Description | A digital transformation initiative 18 months ago was considered a failure. The project lead left the company. |
| Risk | Organizational scar tissue will cause stakeholders to view any new technology initiative through a skeptical lens. The CFO's demand for "hard numbers" is a direct manifestation of this. Remaining employees who were involved may be resistant or risk-averse. The specific failure mode is unknown — it could have been scope, execution, change management, or technology selection. |

**Mitigation Plan:**
1. **Diagnose the failure explicitly.** During stakeholder interviews, ask every participant: "What went wrong with the digital transformation initiative? What would you do differently?" Understanding the failure mode is critical to avoiding repetition.
2. **Differentiate this engagement structurally.** Key differences to emphasize:
   - Narrow scope (one use case, not "transformation")
   - Measurable outcomes defined before work begins (not vague "transformation" goals)
   - 60-90 day time-to-first-result (not 12-18 month plans)
   - Go/no-go gates at each phase — the CFO can stop the program if results do not materialize
   - External accountability (consultant-led with clear deliverables and acceptance criteria)
3. **Avoid the word "transformation."** Use specific, concrete language: "predictive maintenance pilot," "downtime reduction project," "equipment monitoring upgrade." Banish vague buzzwords.
4. **Build in early wins by design.** The pilot must produce a quantifiable result within 90 days — even a modest one. This is about rebuilding trust, not achieving maximum ROI immediately.

---

### Red Flag 2: Zero Data Science Talent

| Attribute | Detail |
| --- | --- |
| Severity | **High** |
| Description | IT team of 25 is entirely enterprise IT. No data scientists, ML engineers, or data engineers. No analytics capability beyond ERP reporting. |
| Risk | Without internal talent, TitanWorks cannot evaluate vendor claims, maintain deployed models, troubleshoot issues, or evolve solutions. They become entirely dependent on external vendors/consultants with no ability to course-correct. |

**Mitigation Plan:**
1. **Buy, don't build** for the first 12 months. Select SaaS/managed predictive maintenance platforms that do not require internal data science to operate. The vendor handles model training, monitoring, and retraining.
2. **Designate 2 "analytics champions"** from the existing IT team. Choose people with curiosity and aptitude, not necessarily formal training. Their initial role is to be the internal point of contact for the vendor, learn the platform, and develop data literacy.
3. **Include knowledge transfer in every vendor contract.** Require that vendors document their approach, train internal staff, and provide runbooks. Avoid black-box vendor relationships.
4. **Plan the first data hire for month 6-9** — a data engineer, not a data scientist. The first need is data pipeline reliability, not model development. By month 6, TitanWorks will know enough about their data landscape to write a meaningful job description.

---

### Red Flag 3: CFO Skepticism and ROI Demands

| Attribute | Detail |
| --- | --- |
| Severity | **Medium** |
| Description | The CFO wants hard numbers before committing. This is characterized as a "concern" by the client. |
| Risk | If mismanaged, the ROI requirement becomes a blocker — the CFO demands certainty that cannot be provided for a pilot, and the project never starts. Alternatively, overly optimistic projections lead to a credibility crisis when actual results come in. |

**Mitigation Plan:**
1. **Provide the hard numbers — honestly.** The ROI analysis (see separate deliverable) uses conservative assumptions and includes sensitivity analysis. The CFO is asking the right question. Answer it.
2. **Frame investment in phases with kill switches.** The CFO does not need to commit to $1M upfront. Phase 1 (pilot) is $150K-$250K with a 90-day evaluation. If it fails, the total exposure is bounded. Phase 2 only proceeds if Phase 1 hits defined metrics.
3. **Use TitanWorks' own numbers.** The $2M/month downtime cost is the anchor. If predictive maintenance reduces unplanned downtime by even 15% on the 40% of equipment that already has sensors, that is $120K/month in savings ($1.44M/year) against a Phase 1 investment of ~$200K. The math works even under very conservative assumptions.
4. **Monthly CFO reporting.** Provide a monthly one-page dashboard showing: spend to date, downtime reduction achieved, projected annualized savings, and status against plan. No surprises.

---

### Red Flag 4: Incomplete Sensor Coverage (60% Manual Monitoring)

| Attribute | Detail |
| --- | --- |
| Severity | **Medium** |
| Description | Only 40% of critical equipment has sensors. The remaining 60% relies on manual monitoring (walk-around inspections, operator judgment). |
| Risk | Predictive maintenance AI requires sensor data. The 60% without sensors cannot be addressed with AI until sensors are installed. This limits the ceiling of any predictive maintenance initiative and may frustrate stakeholders who expect factory-wide coverage. |

**Mitigation Plan:**
1. **Set clear expectations.** Phase 1 addresses only the 40% of equipment with existing sensors. Communicate this explicitly and repeatedly. Do not allow the narrative to become "we're solving the downtime problem" when we're initially addressing only a portion of it.
2. **Include sensor expansion in the roadmap.** Phase 2 should include a sensor retrofit plan for the highest-priority unmonitored equipment. Budget $5K-$25K per machine for retrofit sensors and connectivity (varies wildly by equipment type and age).
3. **Prioritize the sensor expansion by failure cost.** Not all of the 60% needs sensors immediately. Identify the 10-20 machines where unplanned downtime is most costly, and instrument those first.
4. **Use the pilot results to justify sensor expansion investment.** If Phase 1 shows $X savings from the 40% that is monitored, the business case for expanding coverage writes itself.

---

### Red Flag 5: Budget Not Yet Allocated

| Attribute | Detail |
| --- | --- |
| Severity | **Medium** |
| Description | The CFO's stance ("wants hard numbers before committing") implies budget is not yet allocated. The engagement appears to be in the "building the case" phase. |
| Risk | Without budget commitment, the engagement may stall after the discovery/assessment phase. Recommendations gather dust. |

**Mitigation Plan:**
1. **Design Phase 1 to be small enough that it can be approved as a departmental expense** rather than requiring board-level capital approval. $150K-$250K should fall within the CTO or COO's spending authority at a $300M company.
2. **Tie Phase 2 and Phase 3 budget approval to Phase 1 results.** The CFO can commit to Phase 1 as a bounded experiment. Subsequent phases are contingent on demonstrated ROI.
3. **Provide explicit cost of inaction.** Every month that unplanned downtime continues at current levels costs $2M. A 90-day Phase 1 costs $200K against $6M in downtime during the same period. Framing the decision as "spend $200K to potentially save $360K-$900K in the same period" changes the psychology.

---

## Red Flags NOT Present (Positive Indicators)

| Potential Red Flag | Status | Evidence |
| --- | --- | --- |
| No executive sponsor | **Not present** | Plant managers are enthusiastic, CFO is engaged (skeptical but active), initiative has organizational attention |
| Data is completely inaccessible | **Not present** | 40% of equipment has sensors, ERP contains maintenance history. Data quality is unknown but data exists. |
| Active political resistance | **Not detected** | No mention of stakeholders blocking the initiative. The failed project lead left, which may actually reduce political baggage. |
| Unrealistic expectations | **Not present** | The CFO's demand for ROI is realistic, not "AI will 10x our revenue." Plant managers' enthusiasm should be managed but is not described as unrealistic. |
| Compliance/legal blockers | **Not present** | Manufacturing has relatively light AI regulation. No defense/ITAR concerns mentioned. |

---

## Summary Assessment

No critical (engagement-stopping) red flags are present. The most significant risks are the talent gap and the shadow of the failed digital transformation initiative. Both are manageable with the right engagement structure: buy-oriented technology approach, phased investment with clear gates, and early measurable wins to rebuild organizational confidence.

**Recommendation: Proceed to opportunity identification and proposal development**, incorporating the mitigations above into the engagement structure.

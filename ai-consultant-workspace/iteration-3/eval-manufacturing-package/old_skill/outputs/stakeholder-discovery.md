# Stakeholder Discovery: TitanWorks

## Interview Synthesis

*Note: This document synthesizes findings based on available information from the engagement briefing. In a live engagement, this would be populated from structured interviews following the question bank.*

---

## Executive Perspective

### CFO
- **Primary concern**: ROI and financial accountability. The CFO has been burned by the failed digital transformation 18 months ago and demands hard numbers before any commitment.
- **Budget stance**: Not opposed to spending, but requires defensible business case with sensitivity analysis. Wants to understand downside scenarios, not just optimistic projections.
- **Success metric**: Measurable reduction in unplanned downtime costs ($2M/month baseline). Wants payback period and NPV, not just narrative.
- **Risk tolerance**: Low. Will want phased investment with go/no-go gates at each stage.
- **Appetite for change**: 3/5 — willing but cautious, needs evidence.

### Plant Managers (4 factories)
- **Primary concern**: Equipment reliability and production continuity. They live with the $2M/month pain daily.
- **Enthusiasm level**: High. They are the internal champions for this initiative.
- **Current frustration**: Manual monitoring is labor-intensive and unreliable. Experienced operators "feel" when something is off, but this doesn't scale and creates single points of failure.
- **AI ideas already considered**: Predictive maintenance is the universally mentioned opportunity. Some have likely seen vendor demos or industry conference presentations.
- **Appetite for change**: 4-5/5 — actively requesting solutions.

---

## Department Pain Points

### Maintenance / Operations
- **Unplanned downtime at $2M/month** — the dominant pain point across all 4 factories
- 60% of critical equipment lacks automated monitoring, requiring manual inspection rounds
- Likely issues with scheduled maintenance being either too frequent (wasting resources) or not frequent enough (missing emerging failures)
- Spare parts management probably reactive — ordering after failure rather than predictive stocking
- Maintenance knowledge concentrated in experienced technicians (tribal knowledge risk)

### IT Department (25 people)
- **Skill set**: Enterprise IT — ERP administration, networking, basic cloud operations
- **Azure migration**: Completed 6 months ago, team is still building Azure expertise
- **Data science capability**: Zero. No one on the team has ML/AI experience.
- **Likely concern**: Being asked to support AI systems they don't understand
- **Shadow AI**: Probable individual use of ChatGPT or similar, unmanaged
- **Appetite for change**: 2-3/5 — likely cautious about taking on AI systems without training

### Finance
- **CFO-driven**: Strong financial discipline, ROI-focused
- **Previous initiative failure**: The failed digital transformation likely consumed budget without demonstrable returns, creating institutional skepticism about technology investments
- **Budget process**: Probably annual with quarterly reviews; getting mid-cycle budget approval will require strong business case

---

## Technical Landscape

### Current Architecture
- **Cloud**: Microsoft Azure (6 months in), likely Azure VMs, storage, basic PaaS services
- **ERP**: Enterprise system (likely SAP, Oracle, or similar) managed by IT team
- **OT Systems**: SCADA/historians on instrumented equipment (40%), PLCs, HMIs
- **Sensor infrastructure**: Vibration, temperature, pressure sensors on 40% of critical equipment; data likely stored in local historians, may not flow to cloud
- **Network**: Probable OT/IT network separation (standard manufacturing security practice)
- **APIs**: Likely limited; ERP may have some integration points

### Data Readiness
- **Sensor data**: Exists for 40% of equipment — time-series data, likely usable for ML with data engineering work
- **Maintenance records**: In ERP — work orders, parts used, failure descriptions; quality and completeness variable
- **Manual monitoring logs**: Paper-based or spreadsheet-based for 60% of equipment; inconsistent, hard to use for ML
- **Data gaps**: No unified data model connecting equipment sensors, maintenance history, production schedules, and outcomes

### Integration Constraints
- **OT/IT gap**: Getting sensor data from factory floor to Azure cloud is a critical infrastructure requirement
- **ERP integration**: Any AI system needs to read maintenance records and potentially write work orders back
- **Edge computing**: Real-time monitoring may need edge processing before cloud analytics

---

## Frontline Insights (Inferred)

### Maintenance Technicians
- **Likely frustration**: Manual inspection rounds are time-consuming and don't catch every issue
- **Tribal knowledge**: Senior technicians can identify equipment problems by sound, vibration feel, or subtle cues — this expertise is not documented
- **Tool frustration**: Probably using paper forms or basic systems for logging inspections
- **AI attitude**: Likely mixed — some will see AI as a helpful tool, others may see it as a threat to their expertise and job security
- **Key insight opportunity**: Technicians know which equipment fails most and what the early warning signs are — this is gold for training ML models

### Operators
- **Likely frustration**: Production interruptions from equipment failure affect their output metrics
- **Current workaround**: Operators probably develop informal methods for monitoring equipment they work with daily
- **AI attitude**: Likely positive if positioned as making their jobs easier and more predictable

---

## Cross-Interview Patterns

1. **Universal agreement on the problem**: Unplanned downtime is the #1 pain point across all stakeholders
2. **Enthusiasm-skepticism gap**: Operations wants action, finance wants proof — this tension must be managed with a phased approach that delivers early evidence
3. **Talent gap is unanimous**: No one internally believes they have the skills to execute AI projects
4. **Previous failure overhang**: The failed digital transformation is referenced (explicitly or implicitly) in every conversation — it must be addressed head-on
5. **Azure investment creates opportunity**: The recent cloud migration, while not AI-specific, provides infrastructure foundation that reduces time-to-value

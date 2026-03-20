# Stakeholder Discovery: TitanWorks

## Discovery Summary

Based on available information, this document synthesizes stakeholder perspectives across TitanWorks' organizational hierarchy. Findings are organized by stakeholder group with pain points ranked by business impact.

---

## Executive Perspective

### CFO — Financial Stewardship & ROI Concern

**Appetite for Change:** 2/5

**Key Findings:**
- Primary concern is financial accountability — demands hard ROI numbers before budget commitment
- Burned by the failed digital transformation 18 months ago — the project consumed budget without delivering measurable returns
- Does not oppose AI in principle but requires evidence-based justification with clear payback timeline
- Likely asks: "How is this different from last time?" and "What happens if the projections don't materialize?"
- Wants sensitivity analysis showing downside scenarios, not just optimistic projections

**Pain Points (by business impact):**
1. $2M/month unplanned downtime cost — directly impacts margins and delivery commitments
2. Lack of visibility into maintenance cost drivers — hard to budget when failures are unpredictable
3. Previous technology investment write-off — organizational credibility damage

**Data Sources & Accessibility:**
- Financial data in ERP (maintenance costs, production losses, overtime)
- Capital expenditure tracking
- Previous digital transformation post-mortem (if one exists)

**AI Ideas Already Considered:**
- Has not proposed specific AI solutions but understands predictive maintenance concept
- Likely interested in asset utilization metrics and total cost of ownership analysis

---

### Plant Managers (x4) — Operational Champions

**Appetite for Change:** 4/5

**Key Findings:**
- Enthusiastic about technology-enabled improvements — they live with the downtime problem daily
- Understand their equipment, failure modes, and maintenance challenges at a granular level
- Likely frustrated by the slow pace of modernization and the aftermath of the failed initiative
- Each factory probably has different equipment profiles, failure patterns, and local expertise levels
- Strong candidates as internal project champions who can drive adoption on the floor

**Pain Points (by business impact):**
1. **Unplanned equipment failures** — cascading production losses, missed shipments, customer penalties
2. **Emergency maintenance costs** — overtime labor, expedited parts, external contractor premiums
3. **Manual monitoring burden** — operators spending time on equipment checks instead of production work
4. **Inconsistent maintenance practices** — variation across factories in how equipment is maintained
5. **Knowledge concentration risk** — senior technicians retiring with critical diagnostic knowledge

**Data Sources & Accessibility:**
- Equipment sensor data (40% of critical equipment)
- Maintenance work orders from ERP/CMMS
- Production logs and downtime records
- Manual inspection checklists (paper or basic digital)
- Tribal knowledge from experienced technicians (undocumented)

**AI Ideas Already Considered:**
- Predictive maintenance (high awareness — industry press coverage)
- Automated quality inspection
- Production scheduling optimization

---

## Department Pain Points

### Operations / Production

**Top Pain Points:**
1. **Unplanned downtime** ($2M/month) — equipment failures during production runs cause cascading schedule disruptions across all 4 factories
2. **Reactive maintenance model** — most maintenance is run-to-failure or calendar-based; technicians are in fire-fighting mode rather than proactive prevention
3. **Manual equipment monitoring** — for 60% of critical equipment, operators must physically inspect machines, record readings, and interpret conditions using experience and judgment
4. **Spare parts inventory management** — without failure prediction, spare parts are either overstocked (capital tied up) or understocked (extended downtime waiting for parts)
5. **Cross-factory inconsistency** — each factory has developed its own maintenance practices and documentation standards

### Maintenance / Reliability Engineering

**Top Pain Points:**
1. **Technician overload** — team is reactive, constantly responding to emergencies instead of doing planned maintenance
2. **Diagnostic difficulty** — without comprehensive sensor data, root cause analysis is slow and depends on individual expertise
3. **Knowledge loss** — experienced technicians are retiring; their diagnostic skills are not captured systematically
4. **Maintenance scheduling** — coordinating maintenance windows with production schedules is manual and conflict-prone
5. **Vendor/OEM information access** — equipment manuals and service bulletins are scattered across file shares, paper binders, and individual knowledge

### Finance

**Top Pain Points:**
1. **Unpredictable maintenance budgets** — unplanned failures make cost forecasting unreliable
2. **ROI tracking for capital equipment** — difficult to measure true total cost of ownership per asset
3. **Previous initiative sunk cost** — digital transformation budget was spent without clear returns
4. **Insurance/warranty implications** — unplanned failures may affect insurance claims and OEM warranty coverage

---

## Technical Landscape

### Current Architecture

| Component | Current State | AI Readiness |
| --- | --- | --- |
| Cloud Platform | Azure (6 months, likely IaaS/PaaS) | Foundation exists; needs AI service activation |
| ERP | Enterprise ERP (SAP/Oracle/Dynamics assumed) | Contains maintenance/production data; extraction needed |
| OT Network | SCADA/PLC systems on isolated network | Data bridge to Azure needed — major integration work |
| Sensor Infrastructure | 40% of critical equipment instrumented | Partial — expansion required for comprehensive coverage |
| Data Storage | ERP database + local SCADA historians | No data lake or warehouse for analytics |
| Analytics | Basic ERP reporting/dashboards | No advanced analytics capability |
| API Layer | Minimal or none between OT and IT | Must be built for any AI integration |
| Security | Standard enterprise IT security; OT security likely separate | OT/IT convergence security planning needed |

### Integration Constraints

1. **OT/IT gap** — The SCADA/PLC network is likely air-gapped or minimally connected to the IT network. Bridging this securely is the foundational technical challenge.
2. **Data format heterogeneity** — Sensor data formats vary by equipment manufacturer and vintage. Normalization will be required.
3. **Real-time vs. batch** — Predictive maintenance can start with batch processing (hourly/daily) but production-critical alerts need near-real-time capability.
4. **Legacy equipment** — The 60% of unmonitored equipment may lack digital interfaces for sensor retrofit.

### Data Readiness Assessment

| Data Source | Availability | Quality (Est.) | Accessibility |
| --- | --- | --- | --- |
| Sensor data (instrumented equipment) | Exists for 40% | Medium — depends on sensor calibration and historian configuration | Low — likely on OT network, not accessible to IT |
| Maintenance work orders | Exists in ERP | Low-Medium — free text fields, inconsistent categorization | Medium — ERP data can be extracted |
| Production logs | Exists in ERP/MES | Medium — structured but may lack equipment-level granularity | Medium |
| Manual inspection logs | Exists on paper/basic digital | Low — unstructured, inconsistent across operators | Low — not digitized for analytics |
| Equipment specifications/manuals | Scattered across file shares and paper | Medium — content is good but not searchable | Low — not centralized |
| Failure history | Partial — in work orders and tribal knowledge | Low — inconsistently documented | Low |

---

## Frontline Insights

### Maintenance Technicians (Inferred)

**Daily Workflow:**
- Start shift with review of pending work orders and emergency calls from previous shift
- Respond to equipment alarms and operator-reported issues (reactive work dominates)
- Conduct scheduled preventive maintenance when not pulled into emergencies
- Manually inspect equipment on rounds, recording readings on paper or basic digital forms
- Diagnose failures using experience, OEM manuals, and consultation with senior technicians
- Order parts, coordinate with production for downtime windows, execute repairs

**Friction Points:**
- Too much time on emergency response, not enough on prevention
- Difficulty accessing equipment history and documentation during diagnosis
- Parts availability delays extending downtime unnecessarily
- Inconsistent information handoff between shifts
- Senior technicians spending time teaching rather than doing (knowledge transfer bottleneck)

**AI Attitudes (Estimated):**
- Likely receptive if positioned as a tool that helps them (fewer emergencies, better diagnostics, less stress) rather than replaces them
- May have skepticism based on the failed digital transformation
- Practical orientation — will judge any tool by whether it actually works on their specific equipment

### Machine Operators (Inferred)

**Daily Workflow:**
- Operate production equipment according to schedules and specifications
- Monitor machine performance through gauges, sounds, vibrations, and visual indicators
- Report anomalies to maintenance when something "doesn't sound right" or metrics drift
- Perform basic first-level checks (lubrication, cleaning, visual inspection)
- Record production metrics and quality measurements

**Friction Points:**
- Time spent on manual equipment checks instead of operating
- Uncertainty about when to escalate a concern vs. continue operating
- Inconsistent training on what to look for during inspections
- Frustration when equipment fails despite recent maintenance

---

## Cross-Cutting Themes

1. **The $2M/month number is the engagement anchor** — Every stakeholder group feels the impact of unplanned downtime. This creates natural alignment across the organization.

2. **Manual monitoring is the universal frustration** — Operators, technicians, and managers all identify manual equipment monitoring as time-consuming, unreliable, and stressful.

3. **Knowledge management is an urgent need** — Multiple groups reference tribal knowledge, inconsistent documentation, and knowledge loss risk. This is a secondary opportunity that reinforces the primary predictive maintenance initiative.

4. **Trust must be rebuilt** — The failed digital transformation left scars. Any new initiative must be positioned carefully: smaller scope, faster results, measurable outcomes, explicit learning from past mistakes.

5. **Plant managers are the key to adoption** — Their enthusiasm, operational credibility, and daily presence make them the most effective champions. The engagement strategy should empower them as project owners, not just participants.

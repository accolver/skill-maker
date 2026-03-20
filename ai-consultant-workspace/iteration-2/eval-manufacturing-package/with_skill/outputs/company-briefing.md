# Company Briefing: TitanWorks

## Company Overview

| Attribute | Detail |
| --- | --- |
| Company Name | TitanWorks |
| Industry | Manufacturing |
| Employees | 2,000 |
| Annual Revenue | $300M |
| Facilities | 4 factories |
| Cloud Platform | Microsoft Azure (migrated ~6 months ago) |
| IT Team | 25 people (enterprise IT — ERP, networking, no data science) |

## Current Situation

TitanWorks is experiencing **$2M/month ($24M/year) in unplanned downtime costs** across its 4 factories. This represents approximately 8% of annual revenue lost to equipment failures, production stoppages, and emergency maintenance. The company has partial sensor coverage — approximately 40% of critical equipment is instrumented, while the remaining 60% relies on manual monitoring (operator rounds, visual inspections, scheduled checks).

The company recently completed an Azure migration (6 months ago), giving them a modern cloud foundation but one that is not yet leveraged for advanced analytics or AI workloads.

## Likely Pain Points (Industry Pattern Analysis)

Based on manufacturing industry patterns for a company of this size and profile:

1. **Unplanned downtime** — Confirmed. $2M/month is consistent with a 4-factory operation where critical equipment failures cascade into production line stoppages, overtime labor, expedited parts shipping, and missed delivery commitments.

2. **Reactive maintenance culture** — With only 40% sensor coverage, the majority of maintenance is likely run-to-failure or calendar-based, both of which are suboptimal compared to condition-based or predictive approaches.

3. **Tribal knowledge risk** — In manufacturing operations of this size, critical diagnostic and repair knowledge often resides in the heads of senior technicians. Attrition creates institutional knowledge loss.

4. **Quality variability** — Without automated inspection, quality control depends on human consistency across shifts and facilities.

5. **Demand forecasting gaps** — Production planning likely relies on historical patterns and manual adjustments, leading to inventory imbalances.

## Competitor AI Landscape

The manufacturing sector has seen significant AI adoption, particularly in:

- **Predictive maintenance**: Companies like Siemens, GE, and Caterpillar have invested heavily. Mid-market manufacturers are increasingly adopting platforms like Azure IoT + Machine Learning, AWS IoT SiteWise, or specialized vendors (Uptake, SparkCognition, Augury, Senseye).
- **Computer vision for quality inspection**: Landing AI, Cognex, and Keyence offer solutions that are becoming accessible to mid-market manufacturers.
- **Supply chain optimization**: Kinaxis, o9 Solutions, and Blue Yonder are common in the mid-market.

TitanWorks' competitors in the $200M-$500M manufacturing range are likely in early stages of AI adoption themselves, creating a window of opportunity for competitive differentiation.

## Technology Landscape

| Area | Current State |
| --- | --- |
| Cloud | Azure (6 months) — likely IaaS/PaaS workloads, not yet leveraging AI/ML services |
| ERP | Enterprise ERP system (assumed SAP, Oracle, or Dynamics — to confirm in discovery) |
| IoT/Sensors | 40% of critical equipment instrumented; likely SCADA/PLC systems on OT network |
| Data | Sensor data from instrumented equipment; ERP data; likely siloed between OT and IT |
| Analytics | Likely basic — dashboards and reports from ERP; no advanced analytics or ML |
| AI/ML | None — zero data science capability on the IT team |

## Regulatory Considerations

Manufacturing-specific considerations for AI:

- **OSHA compliance**: AI monitoring safety-critical equipment must meet workplace safety standards
- **ISO 9001**: Quality management system requirements affect how AI can modify quality processes
- **Environmental regulations**: If process optimization affects emissions or waste, EPA/state regulations apply
- **Industry-specific standards**: Depending on what TitanWorks manufactures (to be confirmed), standards like AS9100 (aerospace), IATF 16949 (automotive), or FDA 21 CFR Part 11 (food/pharma) may apply
- **OT/IT security**: NIST Cybersecurity Framework and IEC 62443 for industrial control system security

## Political Context — Critical

The **previous "digital transformation" initiative 18 months ago was considered a failure** and the project lead left the company. This creates:

- Organizational skepticism about technology-led initiatives
- Potential political resistance from stakeholders who were burned
- The CFO's insistence on hard ROI numbers before committing is likely a direct consequence of this failure
- Need to differentiate this engagement from the previous initiative
- Must identify what went wrong before and explicitly address it

The **CFO is concerned about ROI** and wants hard numbers, while the **plant managers are enthusiastic**. This creates a classic tension between operational champions and financial gatekeepers. The proposal must satisfy both audiences.

## Preliminary Hypotheses

1. **Predictive maintenance is the highest-impact quick win** — The $2M/month downtime cost provides a clear, quantifiable baseline. Even a 25-30% reduction would yield $6-7M annual savings, creating a compelling ROI story for the CFO.

2. **Sensor gap is the primary technical barrier** — With only 40% coverage, the first phase must address instrumentation on the highest-impact equipment before any ML model can be effective across the fleet.

3. **Buy-first approach is appropriate for this maturity level** — With zero data science capability, TitanWorks should start with commercial predictive maintenance platforms rather than custom-built solutions.

4. **Azure ecosystem should be leveraged** — Given the recent migration, solutions built on Azure IoT Hub, Azure Machine Learning, and Azure Digital Twins will have lower friction than alternatives.

5. **Change management is the make-or-break factor** — Given the failed digital transformation, this engagement will succeed or fail based on stakeholder buy-in, not technology selection.

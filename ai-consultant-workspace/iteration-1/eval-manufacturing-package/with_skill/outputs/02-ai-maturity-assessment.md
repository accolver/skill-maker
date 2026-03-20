# AI Maturity Assessment: TitanWorks

## Dimension Scores

| Dimension | Score | Weight | Weighted Score |
| --- | --- | --- | --- |
| Data | 1.5 | 25% | 0.375 |
| Infrastructure | 2.0 | 20% | 0.400 |
| Talent | 1.0 | 20% | 0.200 |
| Governance | 1.0 | 20% | 0.200 |
| Culture | 2.5 | 15% | 0.375 |
| **Aggregate** | | | **1.55** |

**Overall Stage: Foundation (1.0-1.9)**

This places TitanWorks firmly in the foundation-building stage. The recommended engagement is focused on data strategy, infrastructure preparation, and building the case with quick wins that leverage existing assets.

---

## Dimension Details

### Dimension 1: Data — Score: 1.5

**Evidence:**
- 40% of critical equipment has sensors producing time-series data (vibration, temperature, pressure — assumed standard industrial sensors). This data likely flows into SCADA/historian systems but is not centralized for analytics.
- 60% of critical equipment is manually monitored — data exists only as paper logs, Excel spreadsheets, or in ERP work order histories.
- No data science team means no data catalog, no feature store, no systematic data quality monitoring.
- ERP system (likely SAP or Oracle given company size) contains maintenance work order history, spare parts inventory, and cost data — but this is transactional data, not organized for ML.
- 4 factories likely have inconsistent data formats, different SCADA systems, and different naming conventions for equipment.

**Score Justification:** Between Ad Hoc (1) and Managed (2). Sensor data exists for some equipment, and ERP provides a central transactional database, but there is no unified data strategy, no quality standards for analytics, and data is siloed across factories and systems.

**Recommendations:**
- Conduct a data audit across all 4 factories: inventory sensor types, data formats, historian systems, and ERP data quality
- Establish a common equipment taxonomy and naming convention
- Set up Azure IoT Hub as a centralized data ingestion point for all sensor data
- Begin collecting and digitizing manual monitoring logs into a structured format

### Dimension 2: Infrastructure — Score: 2.0

**Evidence:**
- Azure migration completed 6 months ago — cloud is available but likely still maturing (ERP workloads, not data/AI workloads)
- No MLOps pipeline, no model registry, no experiment tracking — zero AI infrastructure
- IT team of 25 is focused on enterprise IT (ERP, networking), not data engineering or AI ops
- Sensor infrastructure exists for 40% of equipment, indicating some OT/IoT capability
- Unknown state of API architecture — ERP systems often have limited API exposure

**Score Justification:** Transitioning (2). Cloud migration is done, which is a significant asset. But the cloud footprint is enterprise IT, not data/AI workloads. No API-first architecture. No ML infrastructure whatsoever.

**Recommendations:**
- Leverage Azure IoT Hub and Azure Data Explorer for time-series sensor data ingestion
- Establish a basic data lake (Azure Data Lake Storage Gen2) as a landing zone for factory data
- Assess ERP API capabilities for extracting maintenance and operational data
- Do not attempt to build MLOps infrastructure yet — use managed services or SaaS platforms that abstract this away

### Dimension 3: Talent — Score: 1.0

**Evidence:**
- Zero data science capability — explicitly stated
- 25 IT staff are all enterprise IT (ERP administration, networking, help desk, security)
- No data engineers, no ML engineers, no analysts with statistical modeling skills
- No indication of AI training programs or upskilling initiatives
- No external AI partnerships or vendor relationships for AI services

**Score Justification:** No AI Skills (1). This is the most critical bottleneck. There is no internal capability to build, evaluate, or maintain AI/ML systems.

**Recommendations:**
- **Short-term (0-3 months):** Engage external consulting/implementation partner for initial projects. Do not try to hire a data science team before you have a use case in production — you need to know what you're hiring for.
- **Medium-term (3-6 months):** Hire or designate 1-2 "analytics champions" from the IT team for upskilling. These people become the bridge between the external partner and internal operations.
- **Long-term (6-12 months):** Based on the scope of AI adoption, hire the first data engineer. Consider a small Center of Excellence (2-3 people) only after proving value with initial projects.
- **Immediate:** Ensure platform/SaaS buying decisions account for the talent gap — favor solutions with managed services, vendor support, and minimal custom ML requirements.

### Dimension 4: Governance — Score: 1.0

**Evidence:**
- No AI policy exists (no AI has been deployed, so no policy was needed)
- No ethical guidelines for AI use
- No model review or approval process
- Compliance/legal has not been involved in any AI planning to date
- No experience with AI risk management or model monitoring

**Score Justification:** None (1). This is expected for a company with zero AI deployment. Governance should be built proportionally — starting lightweight and growing with maturity.

**Recommendations:**
- Do not over-invest in governance before there is something to govern — this is a common mistake that slows down early adopters
- Establish a simple AI project approval process: business case review by a small steering committee (CFO, CTO/IT Director, relevant plant manager)
- Draft a lightweight AI use policy covering: data usage, vendor evaluation criteria, model monitoring requirements, and human-in-the-loop requirements for safety-adjacent use cases
- Loop in legal/compliance for vendor contracts (data processing agreements, SLA requirements)

### Dimension 5: Culture — Score: 2.5

**Evidence:**
- Plant managers are described as "enthusiastic" — this is meaningful. Operational leadership buy-in is critical for manufacturing AI and is often the hardest part.
- CFO is cautious but engaged — asking for "hard numbers" indicates serious evaluation, not dismissal. This is healthy skepticism, not resistance.
- The failed digital transformation 18 months ago creates organizational scar tissue. The project lead leaving suggests there may be blame dynamics, and any new initiative will be viewed through the lens of "is this going to be another failure?"
- No indication of active resistance or fear of job displacement (though this should be assessed during frontline interviews)
- The fact that the company is engaging consultants and the CFO is requesting ROI analysis indicates genuine organizational interest

**Score Justification:** Between Curious (2) and Supportive (3). There is real interest from operations and engaged (if cautious) executive attention. But the failed initiative creates a trust deficit that must be actively managed.

**Recommendations:**
- Explicitly acknowledge the previous digital transformation failure in every proposal and presentation. Do not pretend it did not happen. Frame the current approach as different: smaller scope, faster results, measurable outcomes, clear go/no-go gates.
- Position plant managers as executive sponsors for their factory-specific pilots — their enthusiasm is a strategic asset
- Design the initiative to produce a visible, measurable win within 60-90 days to rebuild organizational confidence
- Create a "no surprises" communication cadence with the CFO — monthly cost and progress reporting from day one

---

## Gap Analysis

**Critical Bottleneck: Talent (Score 1.0)**

Talent is 0.55 points below the aggregate (1.55) and is the single biggest constraint. TitanWorks cannot build, maintain, or even evaluate AI solutions without external support. Every recommendation must account for this gap.

**Bottleneck Pattern: High Culture, Low Talent**

The maturity model identifies this pattern explicitly: "Organization wants AI but can't execute. Hire or partner." This is precisely TitanWorks' situation. The mitigation is to partner first (external implementation), then build internal capability alongside proven projects.

**Secondary Bottleneck: Governance (Score 1.0)**

Also at 1.0, but this is less urgent because governance should grow proportionally with AI deployment. A lightweight framework is sufficient for the pilot stage.

---

## Recommended Engagement Approach

**Foundation-building engagement with accelerated quick win.**

Given the 1.55 aggregate score, the standard recommendation is a 6-12 month foundation-building horizon. However, TitanWorks has two assets that allow acceleration:

1. **40% of critical equipment already has sensors** — data exists for a predictive maintenance pilot without new hardware
2. **Azure is already in place** — no cloud migration needed

This means a predictive maintenance pilot using existing sensor data on Azure can deliver first measurable results in 60-90 days while longer-term foundation work (sensor expansion, data strategy, talent development) proceeds in parallel.

The engagement should be structured as: **Quick Win (predictive maintenance pilot on best-instrumented equipment) + Foundation (data strategy, sensor expansion plan, talent roadmap)**.

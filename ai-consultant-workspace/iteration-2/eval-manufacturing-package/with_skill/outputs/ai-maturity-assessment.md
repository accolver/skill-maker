# AI Maturity Assessment: TitanWorks

## Assessment Summary

| Dimension | Score | Stage | Weight |
| --- | --- | --- | --- |
| Data | 1.5 | Ad Hoc / Managed | 25% |
| Infrastructure | 2.0 | Transitioning | 20% |
| Talent | 1.0 | No AI Skills | 20% |
| Governance | 1.0 | None | 20% |
| Culture | 2.5 | Curious / Supportive | 15% |
| **Aggregate** | **1.55** | **Foundation** | |

**Aggregate Calculation:**
(1.5 x 0.25) + (2.0 x 0.20) + (1.0 x 0.20) + (1.0 x 0.20) + (2.5 x 0.15) = 0.375 + 0.40 + 0.20 + 0.20 + 0.375 = **1.55**

**Engagement Stage: Foundation** — TitanWorks needs data strategy, infrastructure preparation, and capability building. However, the specific and quantifiable nature of their primary use case (predictive maintenance with a $24M/year cost baseline) means a targeted pilot is feasible even at this maturity level, provided it is scoped carefully with the right vendor partnership.

---

## Dimension 1: Data — Score: 1.5

**Evidence:**

- Sensor data exists for approximately 40% of critical equipment, suggesting some structured data collection, but coverage is incomplete
- Remaining 60% of equipment is monitored manually — likely paper logs, walk-around checklists, or verbal reports that are not digitized
- ERP system contains operational data (production schedules, maintenance work orders, parts inventory) but this data was not designed for analytics
- Sensor data and ERP data are almost certainly siloed — OT network (SCADA/PLCs) does not feed IT systems in a structured way
- No data catalog, no data quality standards, no data governance function mentioned
- No evidence of cross-team data sharing norms or self-service analytics

**Score Rationale:** Between Ad Hoc (1) and Managed (2). Some structured data exists (ERP, partial sensor feeds) but it is fragmented, not cataloged, and not accessible for analytics. The manual monitoring data for 60% of equipment is essentially unstructured and likely not captured digitally at all.

**Recommendations:**

1. Conduct a data inventory of all sensor data sources, frequencies, and storage locations across all 4 factories
2. Assess ERP data quality for maintenance work orders — are failure modes, root causes, and repair actions captured consistently?
3. Establish a data pipeline from OT (sensor/SCADA) to Azure for the target equipment first
4. Begin digitizing manual inspection logs — even simple structured digital forms would create usable data

---

## Dimension 2: Infrastructure — Score: 2.0

**Evidence:**

- Azure migration completed 6 months ago — cloud infrastructure exists but is new
- Current Azure usage is likely IaaS (VMs, storage) and PaaS (databases, possibly Dynamics 365 or similar ERP hosting) rather than AI/ML services
- No evidence of MLOps pipelines, model registry, experiment tracking, or GPU/TPU compute
- ERP system is presumably the primary application workload
- OT network (SCADA, PLCs, sensor gateways) is likely separate from the Azure IT environment with no integration path for real-time data
- CI/CD maturity unknown but a 25-person enterprise IT team likely has some deployment automation
- No API layer for ML model serving

**Score Rationale:** Transitioning (2). Cloud migration is underway/recent, giving a foundation. But no AI-specific infrastructure exists, and the critical OT-to-cloud data pipeline has not been built.

**Recommendations:**

1. Assess current Azure services in use — identify which services are already provisioned vs. available
2. Design an IoT data ingestion architecture: Azure IoT Hub or Azure IoT Edge for sensor data collection
3. Evaluate Azure Machine Learning workspace provisioning as part of Phase 1
4. Plan OT/IT network bridge — this is often the biggest infrastructure challenge in manufacturing AI

---

## Dimension 3: Talent — Score: 1.0

**Evidence:**

- 25-person IT team focused entirely on enterprise IT (ERP administration, networking, help desk, security)
- Zero data science capability — no data scientists, ML engineers, or analytics specialists
- No evidence of AI/ML tool usage (no mention of notebooks, Python environments, or ML frameworks)
- No AI training budget mentioned
- No data engineering function beyond what is needed for ERP operations
- Unknown whether any individuals have self-taught data science skills or interest

**Score Rationale:** No AI Skills (1). This is the clearest rating — the team has no AI/ML capability whatsoever. This is not a criticism; enterprise IT and data science are fundamentally different skill sets.

**Recommendations:**

1. Do not attempt to build an internal data science team as the first step — this takes 12-18 months and the downtime problem is urgent
2. Partner with a vendor/consultancy that provides managed AI services for predictive maintenance
3. Identify 2-3 IT team members with analytical aptitude for upskilling as "AI liaisons" — they bridge between vendors and internal operations
4. Budget for Azure AI/ML training (Microsoft offers certifications: AI-900, DP-100, AI-102) for long-term capability building
5. Consider a fractional Chief Data Officer or AI Director engagement (6-12 months) to guide the transition

---

## Dimension 4: Governance — Score: 1.0

**Evidence:**

- No AI policy exists — the company has never deployed AI
- No AI ethics framework, model review process, or approval workflow for AI initiatives
- No model monitoring, bias testing, or drift detection capability (no models to monitor)
- Compliance/legal posture on AI is unknown — has not been addressed because AI has not been deployed
- The failed "digital transformation" suggests governance/oversight for technology initiatives may have been lacking previously

**Score Rationale:** None (1). There is no AI governance because there has been no AI. This is expected and not a blocker for a first pilot, but governance should be established alongside the first deployment.

**Recommendations:**

1. Draft a simple AI use policy before deploying any AI system — cover data usage, decision authority, human oversight requirements
2. For predictive maintenance, governance is relatively straightforward — AI recommends maintenance actions, humans approve and execute
3. Establish a model performance review cadence (monthly) once the first model is deployed
4. Define escalation paths: when does an AI recommendation get overridden, and how is that documented?
5. Include legal/compliance review as part of any vendor procurement process for AI solutions

---

## Dimension 5: Culture — Score: 2.5

**Evidence:**

- **Plant managers are enthusiastic** — operational leadership sees the value and wants to move forward. This is a strong positive signal.
- **CFO is cautious but engaged** — asking for hard ROI numbers is not resistance; it is responsible financial stewardship. The CFO is not saying "no," they are saying "prove it."
- **Previous digital transformation failure** — this creates organizational scar tissue. Employees who were part of the failed initiative will be skeptical. Middle management may be risk-averse.
- **Project lead departure** — the person associated with the previous initiative left, which could mean either the failure is attributed to them personally (potentially clearing the path) or that the organization has unresolved issues with technology-led change.
- Individual employee AI attitudes are unknown but manufacturing workforces often have concerns about automation replacing jobs

**Score Rationale:** Between Curious (2) and Supportive (3). Executive sponsorship exists from plant managers, and the CFO is engaged (cautiously). However, the failed digital transformation creates drag that prevents a full "Supportive" rating. The appetite is there but trust must be rebuilt.

**Recommendations:**

1. Explicitly acknowledge the failed digital transformation in all proposals — do not pretend it did not happen. Frame the current initiative as having learned from it.
2. Position the CFO as an ally, not an obstacle — their insistence on ROI actually protects the initiative from the same fate as the previous one
3. Use plant managers as internal champions — they provide credibility on the factory floor that external consultants cannot
4. Start with a single-factory pilot to limit blast radius and build confidence before expanding
5. Communicate to the workforce that predictive maintenance helps technicians (better scheduling, fewer emergency calls, more proactive work) rather than replacing them

---

## Gap Analysis

**Critical Bottleneck: Talent (1.0)**

Talent is 0.55 points below the aggregate and is the single biggest constraint. TitanWorks cannot execute any AI initiative with its current team composition. This must be addressed through vendor partnership (short-term) and capability building (medium-term).

**Secondary Bottleneck: Governance (1.0)**

Also 0.55 points below the aggregate, but governance is easier to address — it requires policy creation and process definition, not hiring specialized talent.

**Pattern Match: "High Culture, Low Talent"**

TitanWorks matches the "High culture, low talent" bottleneck pattern from the maturity model — the organization wants AI but cannot execute. The recommended approach is to **hire or partner** to bridge the capability gap while building internal skills over time.

**Dimension Disparity:**

| Dimension | Score | Delta from Aggregate |
| --- | --- | --- |
| Culture | 2.5 | +0.95 (strength) |
| Infrastructure | 2.0 | +0.45 (moderate) |
| Data | 1.5 | -0.05 (near aggregate) |
| Talent | 1.0 | -0.55 (bottleneck) |
| Governance | 1.0 | -0.55 (bottleneck) |

The positive culture score gives TitanWorks a better-than-average chance of successful AI adoption if the talent and governance gaps are addressed through the engagement structure.

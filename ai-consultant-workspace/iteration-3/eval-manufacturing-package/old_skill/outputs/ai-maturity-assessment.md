# AI Maturity Assessment: TitanWorks

## Dimension Scores

### Dimension 1: Data (Weight: 25%) — Score: 2 (Managed)

**Evidence:**
- Sensor data exists on ~40% of critical equipment — structured, time-series data is being collected but coverage is incomplete
- Remaining 60% of equipment monitoring is manual — data exists in operator logs, maintenance tickets, and ERP records but is likely unstructured and inconsistent
- ERP system (enterprise IT manages it) contains operational data — production volumes, maintenance work orders, spare parts inventory
- No data catalog or centralized data governance mentioned
- Data likely lives across multiple systems: SCADA/historian for sensor data, ERP for operations, spreadsheets for manual tracking
- Azure migration provides cloud storage capability but no evidence of data warehouse or lake

**Key Gaps:**
- No unified data platform connecting sensor data, maintenance records, and operational metrics
- 60% of critical equipment lacks automated data collection
- Data quality standards not established for AI use cases
- No data engineering or data pipeline capability on staff

**Recommendation:** Establish a data foundation workstream — consolidate sensor data, maintenance records, and ERP data into Azure Data Lake. Define data quality standards for predictive maintenance use cases.

---

### Dimension 2: Infrastructure (Weight: 20%) — Score: 2 (Transitioning)

**Evidence:**
- Migrated to Azure 6 months ago — cloud foundation exists but is early-stage
- Enterprise IT capability (ERP, networking) suggests basic infrastructure competence
- 40% sensor coverage implies some OT infrastructure (SCADA, historians, PLCs) is in place
- No mention of APIs, CI/CD, containerization, or modern development practices
- No ML infrastructure (no MLOps, no model registry, no feature store, no GPU access)
- Azure provides access to Azure IoT Hub, Azure ML, and Azure AI services but none are deployed

**Key Gaps:**
- No IoT data pipeline from factory floor to cloud
- No ML/AI compute infrastructure
- OT/IT convergence not addressed — sensor data may be trapped in OT network
- No API layer for integrating AI insights back into operational workflows

**Recommendation:** Build an Azure IoT pipeline (IoT Hub + Stream Analytics + Data Lake) as the foundational infrastructure. This bridges the OT/IT gap and creates the data flow needed for predictive maintenance.

---

### Dimension 3: Talent (Weight: 20%) — Score: 1 (No AI Skills)

**Evidence:**
- 25-person IT team, described as entirely enterprise IT (ERP, networking)
- **Zero data science capability** — no data scientists, no ML engineers, no data engineers, no analytics specialists
- No AI training budget mentioned
- No hiring pipeline for AI roles
- No evidence of anyone on staff with ML/AI experience
- Plant managers are enthusiastic but this is operational willingness, not technical capability

**Key Gaps:**
- Complete absence of data science and ML engineering talent
- No internal capability to evaluate, build, or maintain AI systems
- No data engineering skills to build data pipelines
- Knowledge gap extends to AI project management — no one has run an AI project before

**Recommendation:** This is the most critical bottleneck. Short-term: rely entirely on external partners and SaaS platforms that minimize the need for in-house AI talent. Medium-term: hire a data engineer and an AI/ML lead. Long-term: build a small data science team (3-5 people). Invest immediately in AI literacy training for IT team and plant managers.

---

### Dimension 4: Governance (Weight: 20%) — Score: 1 (None)

**Evidence:**
- No AI policy mentioned
- No ethical guidelines for AI
- No model review or approval process
- No compliance consideration specific to AI
- Previous digital transformation had no governance framework (contributing to its failure)
- No mention of data governance program beyond what ERP enforces by default

**Key Gaps:**
- No framework for evaluating, approving, or monitoring AI systems
- No clear ownership of AI risk and ethics
- No process for validating AI recommendations before they affect operations
- No data governance program to support AI data requirements

**Recommendation:** Establish lightweight AI governance before deploying any AI systems. Start with: (1) AI use policy, (2) approval process for new AI tools, (3) data governance basics (ownership, quality, access), (4) monitoring requirements for any deployed AI. Keep it simple — heavy governance will stall an organization at this maturity level.

---

### Dimension 5: Culture (Weight: 15%) — Score: 2.5 (Between Curious and Supportive)

**Evidence:**
- **Plant managers are enthusiastic** — operational leadership actively wants AI solutions, which is a strong signal
- **CFO is cautious but engaged** — demanding ROI is not resistance, it's due diligence; the CFO is at the table
- **Previous failure creates headwind** — the failed digital transformation 18 months ago and the project lead's departure create organizational caution and skepticism
- **No active resistance reported** — the concern is more about risk tolerance than opposition
- Mixed signals: enthusiasm at operations level, caution at finance level, scar tissue from past failure

**Key Gaps:**
- Organizational trust in technology initiatives is damaged
- No change management capability or playbook
- No AI champion at the executive level explicitly identified (plant managers are mid-level)
- Risk aversion may cause slow decision-making

**Recommendation:** Address the failed initiative directly — acknowledge it, diagnose what went wrong, and explain how this engagement differs. Start with a visible quick win to rebuild trust. Ensure the CFO sees hard numbers early and often. Appoint a VP-level or C-level AI sponsor.

---

## Aggregate Score

```
Aggregate = (Data × 0.25) + (Infrastructure × 0.20) + (Talent × 0.20) + (Governance × 0.20) + (Culture × 0.15)
         = (2 × 0.25) + (2 × 0.20) + (1 × 0.20) + (1 × 0.20) + (2.5 × 0.15)
         = 0.50 + 0.40 + 0.20 + 0.20 + 0.375
         = 1.675
```

**Aggregate Score: 1.7 / 5.0**

**Stage: Foundation**

---

## Engagement Approach (Score-Driven)

Per the maturity model, a score of 1.0-1.9 maps to a **Foundation-building engagement**:

- **Focus**: Data strategy, infrastructure planning, executive education
- **Horizon**: 6-12 months before meaningful AI at scale
- **Immediate priority**: Data foundations and building the business case
- **BUT**: The $2M/month downtime cost creates urgency that justifies an accelerated path — a targeted predictive maintenance pilot on the already-instrumented 40% of equipment can deliver value within 3-6 months while foundation work proceeds in parallel

**Tailored approach for TitanWorks:**
1. Run a focused predictive maintenance pilot using existing sensor data and a SaaS platform (not custom build) — this works within the current maturity while foundation work happens in parallel
2. Simultaneously invest in data infrastructure (IoT pipeline, data lake) and basic governance
3. Address the talent bottleneck through external partnerships initially, with a hiring plan for Year 1
4. Rebuild organizational trust through visible, measurable quick wins before scaling

---

## Bottleneck Analysis

The maturity model flags dimensions that are 2+ levels below the aggregate as blockers. With an aggregate of 1.7:

| Dimension | Score | Gap from Aggregate | Bottleneck? |
| --- | --- | --- | --- |
| Data | 2.0 | +0.3 | No — slightly above average |
| Infrastructure | 2.0 | +0.3 | No — slightly above average |
| **Talent** | **1.0** | **-0.7** | **Yes — lowest dimension, primary bottleneck** |
| **Governance** | **1.0** | **-0.7** | **Yes — tied for lowest, will block scaling** |
| Culture | 2.5 | +0.8 | No — strongest dimension |

**Primary Bottleneck: Talent (Score 1)**
The complete absence of data science capability means TitanWorks cannot independently evaluate, implement, or maintain any AI system. Every AI initiative will depend entirely on external partners or SaaS platforms until this gap is addressed. This is the single biggest constraint on the engagement.

**Secondary Bottleneck: Governance (Score 1)**
No AI governance means no framework for approving, monitoring, or managing AI systems. While less urgent for a first pilot, this will block any attempt to scale AI across the organization.

**Pattern Match: "High culture, low talent"**
The maturity model identifies this exact pattern: "Organization wants AI but can't execute. Hire or partner." This perfectly describes TitanWorks — enthusiastic plant managers and an engaged CFO, but no one who can do the work. Strategy: partner externally for immediate needs, hire for medium-term capability.

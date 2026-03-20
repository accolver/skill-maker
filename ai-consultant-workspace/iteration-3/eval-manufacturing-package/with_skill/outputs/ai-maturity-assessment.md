# AI Maturity Assessment: TitanWorks

## Dimension Scores

| Dimension | Weight | Score | Level Name | Key Evidence |
| --- | --- | --- | --- | --- |
| Data | 25% | 2 | Managed | 40% sensor coverage on critical equipment. Likely centralized historian/SCADA for instrumented equipment. Manual logs for remaining 60%. ERP contains operational data. No data catalog, no documented quality standards, limited cross-system integration. |
| Infrastructure | 20% | 2 | Transitioning | Azure migration completed 6 months ago. Basic cloud presence established. No APIs designed for ML consumption. No CI/CD for data pipelines. No MLOps. No GPU/specialized compute. SCADA/OT networks likely still isolated from IT. |
| Talent | 20% | 1 | No AI Skills | Zero data scientists or ML engineers. 25-person IT team entirely enterprise IT (ERP, networking). No analytics engineering. No AI training budget identified. No internal capability to build, deploy, or maintain ML models. |
| Governance | 20% | 1 | None | No AI policy exists. No ethics framework. No model review process. No compliance consideration for AI. No data governance program beyond basic ERP access controls. |
| Culture | 15% | 2.5 | Curious to Supportive | Plant managers are enthusiastic (positive). CFO is skeptical but engaged (demands ROI, not dismissing outright). Previous failed initiative creates caution but also lessons learned. Mixed signals: appetite exists but trust is damaged. |

## Aggregate Score Calculation

```
Aggregate = (Data: 2 x 0.25) + (Infrastructure: 2 x 0.20) + (Talent: 1 x 0.20) + (Governance: 1 x 0.20) + (Culture: 2.5 x 0.15)
         = 0.50 + 0.40 + 0.20 + 0.20 + 0.375
         = 1.675
```

**Aggregate Score: 1.68 / 5.0**

**Stage: Foundation**

Per the maturity model, a score of 1.0-1.9 maps to the **Foundation** stage:

> Data strategy, infrastructure planning, executive education. 6-12 month horizon before meaningful AI. Focus on data foundations and building the case.

## Engagement Approach (Maturity-Driven)

TitanWorks is a Foundation-stage organization. However, they have two significant advantages that allow a slightly accelerated approach:

1. **A specific, measurable problem** ($2M/month downtime) with partial data infrastructure already in place (40% sensor coverage)
2. **An Azure cloud platform** already operational, reducing infrastructure lead time

This means the engagement should follow the Foundation playbook (build data strategy, address talent gap, establish governance) but can run a **targeted pilot in parallel** on the 40% of equipment that already has sensors. This is not the typical Foundation approach, but the existing sensor data and clear financial impact justify it.

**Recommended engagement approach**: Foundation-building with an embedded quick-win pilot.

## Dimension Detail

### Data (Score: 2 - Managed)

**Evidence:**
- Sensor data exists for 40% of critical equipment, likely in historian databases (OSIsoft PI, Wonderware, or similar)
- ERP system contains work order history, parts inventory, and maintenance logs
- 60% of equipment monitoring is manual (paper logs, operator rounds)
- No evidence of a data warehouse, data lake, or unified analytics platform
- No data catalog or inventory
- Cross-system data integration is likely manual or nonexistent

**Gaps:**
- No unified data platform connecting sensor data, ERP, and maintenance history
- 60% of equipment generates no digital data at all
- No data quality monitoring or governance
- Likely no historical baseline for what "normal" equipment behavior looks like across the fleet

**Recommendations:**
- Establish an Azure Data Lake to consolidate sensor historian data and ERP maintenance records
- Create a data catalog for existing sensor and operational data
- Define data quality standards for equipment telemetry
- Plan sensor expansion for remaining 60% of critical equipment (phased)

### Infrastructure (Score: 2 - Transitioning)

**Evidence:**
- Azure migration completed 6 months ago (workloads moved to cloud)
- Enterprise IT infrastructure (ERP, networking) is functional
- No ML-specific infrastructure: no MLOps, no model registry, no feature stores, no GPU compute
- OT/IT convergence likely incomplete. SCADA/historian systems may still be on isolated OT networks
- No API layer designed for data consumption by ML systems
- No CI/CD pipelines for data or ML workflows

**Gaps:**
- No path from OT network sensor data to cloud-based analytics
- No compute resources suitable for model training
- No inference infrastructure for real-time predictions
- Azure AI services likely licensed but not activated or explored

**Recommendations:**
- Establish Azure IoT Hub as the bridge between OT sensor data and Azure cloud
- Deploy Azure Data Factory for ETL pipelines
- Provision Azure Machine Learning workspace for model development
- Evaluate Azure Cognitive Services and Azure AI capabilities already included in their subscription
- Assess OT/IT network bridging requirements with cybersecurity review

### Talent (Score: 1 - No AI Skills)

**Evidence:**
- Zero data scientists, ML engineers, or analytics engineers
- 25-person IT team focused entirely on enterprise IT (ERP administration, networking, infrastructure)
- No AI training budget identified
- No internal capability to build, evaluate, or maintain ML models
- No data engineering capability beyond basic ERP reporting

**Gaps:**
- Complete absence of AI/ML execution capability
- No ability to evaluate vendor AI solutions technically
- No capability to maintain deployed models post-implementation
- No data literacy beyond basic operational reporting

**Recommendations:**
- **Immediate**: Engage consulting partner to provide AI execution capability (this engagement)
- **Short-term (0-6 months)**: Hire or contract 1-2 data engineers to build data pipeline capability
- **Medium-term (6-12 months)**: Hire a data scientist or ML engineer to build internal capability
- **Ongoing**: Establish AI training program for existing IT staff (Azure AI certifications)
- **Consider**: Azure-managed AI services to reduce need for deep ML engineering (Azure AutoML, Cognitive Services)

### Governance (Score: 1 - None)

**Evidence:**
- No AI use policy
- No ethical guidelines for AI
- No model review or approval process
- No compliance framework for AI deployments
- No data governance program beyond basic access controls

**Gaps:**
- No framework for evaluating AI vendor claims or model quality
- No process for validating AI recommendations before acting on them
- No monitoring plan for deployed models (drift, accuracy degradation)
- No incident response plan for AI failures

**Recommendations:**
- Establish a lightweight AI governance framework before deploying any models
- Create an AI use policy covering data usage, model validation, and human oversight
- Define model approval process (who signs off before an ML model influences operations)
- Establish model monitoring requirements (accuracy tracking, drift detection, alert thresholds)
- Keep governance proportional: avoid over-engineering for a Foundation-stage organization

### Culture (Score: 2.5 - Curious to Supportive)

**Evidence:**
- Plant managers are enthusiastic about AI/automation (strong positive signal from operations)
- CFO is engaged but skeptical, demanding ROI evidence (engaged skeptic is better than disengaged)
- Previous digital transformation failure 18 months ago has damaged trust
- Project lead from failed initiative has left (unresolved organizational processing)
- No evidence of active resistance to AI, but caution is present

**Gaps:**
- Trust deficit from failed previous initiative
- CFO gatekeeper requires hard financial evidence before commitment
- Unknown: broader workforce attitude toward automation (fear of job displacement?)
- No innovation culture or experimentation framework

**Recommendations:**
- Address the failed initiative directly: diagnose what went wrong, explain how this engagement differs
- Design the engagement with frequent, visible milestones to rebuild trust
- Start with a quick win that generates undeniable financial evidence for the CFO
- Communicate clearly that AI augments workers rather than replaces them
- Involve plant managers as champions to build grassroots support

## Bottleneck Analysis

Per the maturity model, dimensions 2+ levels below the aggregate score are bottlenecks.

With an aggregate of 1.68:

| Dimension | Score | Delta from Aggregate | Bottleneck? |
| --- | --- | --- | --- |
| Data | 2.0 | +0.32 | No (above average) |
| Infrastructure | 2.0 | +0.32 | No (above average) |
| **Talent** | **1.0** | **-0.68** | **Yes - Primary Bottleneck** |
| **Governance** | **1.0** | **-0.68** | **Yes - Secondary Bottleneck** |
| Culture | 2.5 | +0.82 | No (strongest dimension) |

### Primary Bottleneck: Talent (Score 1)

This maps to the maturity model pattern: **"High culture, low talent: Organization wants AI but can't execute. Hire or partner."**

TitanWorks has operational enthusiasm (plant managers) and an engaged CFO, but absolutely zero capability to execute AI initiatives internally. This means:

- **Every AI initiative requires external delivery capability** until internal talent is built
- **Vendor solutions and managed services** should be preferred over custom builds where possible
- **Talent acquisition plan** must be part of the roadmap, not an afterthought
- **Knowledge transfer** must be baked into every consulting engagement

### Secondary Bottleneck: Governance (Score 1)

Without governance, even successful AI pilots will hit scaling walls:

- No process to approve models for production use
- No monitoring framework to catch model degradation
- No accountability structure for AI-influenced decisions
- Risk of "shadow AI" as individual teams experiment without guardrails

**Mitigation**: Establish lightweight governance in Phase 1 (parallel to quick-win pilot). This does not need to be heavy; a simple AI use policy and model approval checklist is sufficient for the Foundation stage.

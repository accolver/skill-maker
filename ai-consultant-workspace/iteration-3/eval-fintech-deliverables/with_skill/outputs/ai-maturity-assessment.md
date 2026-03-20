# AI Maturity Assessment: PayFlow

**Date:** March 2026
**Assessor:** AI Consulting Team
**Client:** PayFlow (Fintech, Series B, 150 employees)

## Dimension Scores

| Dimension | Weight | Score | Stage | Key Evidence |
| --- | --- | --- | --- | --- |
| Data | 25% | 3 | Defined | BigQuery data warehouse with 3 years of transaction data. 50K transactions/day flowing through. Data exists and is accessible, but no evidence of data governance program, quality SLAs, or feature stores. |
| Infrastructure | 20% | 3 | Cloud-Ready | BigQuery implies GCP cloud footprint. Processing 50K transactions/day indicates API-based architecture with reasonable scale. No evidence of MLOps pipeline, model registry, or experiment tracking. Rule-based fraud system suggests no ML serving infrastructure. |
| Talent | 20% | 2 | Emerging | Engineering team of 40, but only 3 have ML experience. Two engineers maintain fraud rules. No dedicated data science team. No evidence of AI training programs or hiring pipeline for AI roles. |
| Governance | 20% | 1 | None | No AI governance policy. SOC2 compliant but no AI-specific compliance consideration. No model risk management framework. No ethical guidelines or approval process for AI initiatives. |
| Culture | 15% | 3 | Supportive | CEO is an enthusiastic executive sponsor wanting "AI everywhere." VP Engineering is engaged but skeptical (healthy skepticism, not resistance). Series B funding suggests innovation-forward culture. Skepticism is about maintenance, not about AI itself. |

## Aggregate Score

```
Aggregate = (3 * 0.25) + (3 * 0.20) + (2 * 0.20) + (1 * 0.20) + (3 * 0.15)
          = 0.75 + 0.60 + 0.40 + 0.20 + 0.45
          = 2.40
```

**Aggregate Score: 2.4 / 5.0 — Pilot-Ready Stage**

## Engagement Approach

At 2.4, PayFlow falls squarely in the **Pilot-Ready** range (2.0-2.9). The recommended engagement is:

- Identify 1-2 high-feasibility use cases with clear success metrics
- Run proof of concept to build internal confidence and prove value
- Build internal AI capability alongside initial projects
- Target 3-6 months to first demonstrated value

This means we should NOT propose "AI everywhere in 6 months" as the CEO requests. We should propose targeted, high-ROI pilots that build the foundation for broader adoption.

## Bottleneck Analysis

### Critical Bottleneck: Governance (Score 1)

Governance scores 2+ levels below the aggregate (1 vs 2.4). This is a **blocking bottleneck**.

**Impact:** PayFlow is in fintech — a regulated industry. Deploying ML models for fraud detection or customer-facing agents without AI governance will create compliance risk. SOC2 compliance does not cover AI-specific concerns like model risk management (SR 11-7 guidance), fair lending implications, or GenAI-specific risks (hallucination, data leakage).

**Mitigation:** Governance foundation work must be parallel to any pilot. This is non-negotiable for fintech.

### Secondary Bottleneck: Talent (Score 2)

Talent is below the aggregate but not critically so. With only 3 ML-experienced engineers out of 40, PayFlow will need to supplement with external expertise for any pilot and invest in upskilling.

**Pattern Match:** This is a "High infrastructure, low governance" pattern — PayFlow can deploy fast but will hit compliance walls if governance is not addressed before scaling.

## Dimension Details

### Data (Score: 3 — Defined)

**Strengths:**
- BigQuery data warehouse is in place and operational
- 3 years of historical transaction data (strong foundation for ML training)
- 50K transactions/day provides sufficient volume for pattern detection
- Centralized data storage in a modern cloud platform

**Gaps:**
- No evidence of data quality monitoring or SLAs
- No feature store for ML
- Unknown data lineage and cataloging status
- Unknown status of data sharing norms between teams

**Recommendation:** Conduct a data quality audit of transaction data before using it for ML model training. Establish data quality baselines and monitoring.

### Infrastructure (Score: 3 — Cloud-Ready)

**Strengths:**
- GCP/BigQuery indicates cloud-native infrastructure
- Transaction processing at 50K/day shows scalable architecture
- Cloud platform provides access to AI/ML services (Vertex AI, etc.)

**Gaps:**
- No MLOps pipeline
- No model registry or experiment tracking
- No evidence of model serving infrastructure
- Rule-based fraud system suggests no ML deployment experience
- Unknown status of enterprise AI tool licensing

**Recommendation:** Leverage GCP's AI/ML ecosystem (Vertex AI) to minimize infrastructure buildout. Assess whether any enterprise AI tools are already licensed.

### Talent (Score: 2 — Emerging)

**Strengths:**
- 3 engineers with ML experience provides a seed team
- 40-person engineering team has capacity to upskill members
- 2 engineers deeply familiar with fraud domain (critical domain expertise)

**Gaps:**
- No dedicated data science team
- 3/40 (7.5%) ML-experienced is below threshold for independent AI execution
- No evidence of AI training budget or programs
- No ML engineering or AI product management roles

**Recommendation:** Pair the 3 ML-experienced engineers with consulting expertise for initial pilots. Invest in upskilling program for 5-8 additional engineers. The 2 fraud rule engineers are invaluable domain experts for the fraud ML initiative.

### Governance (Score: 1 — None)

**Strengths:**
- SOC2 compliance shows the organization understands compliance frameworks
- Existing compliance culture provides a foundation to build on

**Gaps:**
- No AI governance policy of any kind
- No model risk management framework (critical for fintech)
- No AI ethics guidelines or review process
- No consideration of AI-specific compliance (model explainability, bias testing)
- No GenAI risk assessment (hallucination, data leakage, prompt injection)
- No audit trail requirements for AI-assisted decisions

**Recommendation:** This is the most urgent gap. Establish baseline AI governance policy before any AI deployment. For fintech, this must address model risk management, explainability requirements, and compliance with fair lending and PCI DSS for any AI touching transaction data.

### Culture (Score: 3 — Supportive)

**Strengths:**
- CEO as active executive sponsor with strong AI enthusiasm
- Series B startup culture typically embraces innovation
- VP Engineering's skepticism is healthy and maintenance-focused, not resistant

**Gaps:**
- CEO's "AI everywhere in 6 months" expectation needs calibration
- VP Engineering's concerns about maintenance are valid and need addressing
- Gap between CEO enthusiasm and VP Engineering caution could create tension
- Unknown frontline worker sentiment toward AI

**Recommendation:** Align CEO and VP Engineering on a realistic timeline with clear milestones. Use VP Engineering's maintenance concerns as design requirements (build for operability from day one). Early pilot success will convert healthy skepticism into informed advocacy.

# AI Maturity Assessment: PayFlow

**Date:** March 2026
**Engagement Stage:** Post-Discovery Assessment

---

## Dimension Scores

| Dimension | Score | Stage Name | Weight | Weighted Score |
| --- | --- | --- | --- | --- |
| Data | 3 | Defined | 25% | 0.75 |
| Infrastructure | 2 | Transitioning | 20% | 0.40 |
| Talent | 2 | Emerging | 20% | 0.40 |
| Governance | 1 | None | 20% | 0.20 |
| Culture | 3 | Supportive | 15% | 0.45 |
| **Aggregate** | | | **100%** | **2.20** |

**Overall Stage: Pilot-Ready (2.0 - 2.9)**

---

## Dimension Details

### Dimension 1: Data — Score: 3 (Defined)

**Evidence:**
- BigQuery data warehouse in place with 3 years of transaction data
- Processing 50,000 transactions/day indicates functioning data pipelines
- Sufficient data volume and history for ML model training
- Transaction data is structured and queryable

**Gaps:**
- Unknown data quality standards or monitoring
- No evidence of a data catalog or metadata management
- No mention of data governance ownership or quality SLAs
- Cross-team data sharing norms unclear

**Recommendation:** Establish data quality monitoring and documentation for the BigQuery warehouse before using it as ML training data. Audit data completeness and labeling for fraud cases specifically.

---

### Dimension 2: Infrastructure — Score: 2 (Transitioning)

**Evidence:**
- BigQuery indicates GCP cloud presence
- Processing 50K transactions/day means some API and pipeline infrastructure exists
- Rule-based fraud detection is in production (basic model serving capability)

**Gaps:**
- No MLOps pipeline, model registry, or experiment tracking
- No evidence of GPU/TPU access for model training
- No model monitoring or A/B testing infrastructure
- Fraud detection is rule-based, not ML — no ML serving capability demonstrated
- No mention of enterprise AI tools already licensed

**Recommendation:** Build an ML experimentation environment on GCP (Vertex AI or equivalent) before attempting production ML. Start with a training and evaluation pipeline for the fraud detection use case.

---

### Dimension 3: Talent — Score: 2 (Emerging)

**Evidence:**
- Engineering team of 40 total
- 3 engineers with ML experience (7.5% of engineering)
- 2 engineers currently maintaining fraud detection rules

**Gaps:**
- No dedicated data science team
- 3 ML-experienced engineers is thin for any production ML initiative
- No mention of AI training budget or upskilling programs
- No ML engineering, MLOps, or AI product management roles
- No hiring pipeline for AI roles

**Recommendation:** The 3 ML-experienced engineers are a starting point but insufficient for production ML. Plan to either hire 2-3 dedicated ML engineers or engage an external partner for the first initiative while building internal capability. Budget for AI upskilling across the broader engineering team.

---

### Dimension 4: Governance — Score: 1 (None)

**Evidence:**
- No AI governance policy exists
- SOC2 compliant but no AI-specific compliance considerations
- No mention of model risk management framework
- No ethical AI guidelines or review process
- No model documentation requirements

**Gaps:**
- Complete absence of AI governance is a critical gap for a fintech company
- No model approval process
- No bias detection or fairness monitoring
- No audit trail planning for AI-assisted decisions
- PCI DSS implications for AI touching payment data not addressed
- No framework for managing GenAI-specific risks (hallucination, data leakage)

**Recommendation:** This is the most critical bottleneck. Before deploying any ML model for fraud detection or customer-facing AI, PayFlow must establish: (1) an AI use policy, (2) a model approval and review process, (3) a model risk management framework aligned with fintech regulatory expectations, and (4) a GenAI risk assessment covering hallucination, data leakage, and prompt injection.

---

### Dimension 5: Culture — Score: 3 (Supportive)

**Evidence:**
- CEO actively sponsors AI ("AI everywhere within 6 months") — strong executive support
- Series B funding provides budget capacity for investment
- Willingness to engage external consultants signals openness

**Gaps:**
- VP of Engineering is skeptical — key technical leader resistance
- CEO's 6-month "AI everywhere" timeline is unrealistic and signals misaligned expectations
- No evidence of broader organizational AI experimentation
- Gap between executive enthusiasm and engineering caution suggests potential friction

**Recommendation:** The CEO sponsorship is a strong positive signal, but the VP Engineering's skepticism must be addressed constructively. Frame the first initiative as risk reduction (fraud detection saves money and reduces exposure) to align with the VP's concerns about maintenance burden. Unrealistic timeline expectations need to be reset with industry benchmarks.

---

## Bottleneck Analysis

The maturity model flags dimensions that are 2+ levels below the aggregate as bottlenecks. With an aggregate of 2.20:

**Critical Bottleneck: Governance (Score: 1 — 1.2+ levels below aggregate)**

Governance at Level 1 while the aggregate is 2.20 represents the single biggest risk to PayFlow's AI ambitions. In fintech specifically:

- Any ML model used for fraud decisions may need explainability for regulatory purposes
- SOC2 compliance does not cover AI-specific risks
- PCI DSS applies to any AI touching payment card data
- No model risk management framework means no path to production ML in a compliant way

**Pattern Match: "High culture, low governance"** — The organization has executive energy and appetite for AI but lacks the guardrails to deploy it responsibly. This pattern leads to fast starts that hit compliance walls. Governance must be built in parallel with the first pilot, not after.

**Secondary Gap: Infrastructure and Talent (both Score: 2)**

Both are at the aggregate level, but for production ML they need to advance to at least Level 3. The talent gap is particularly acute — 3 ML-experienced engineers across a 40-person team is not enough to build, deploy, and maintain production ML systems while also maintaining existing fraud rules.

---

## Aggregate Score Interpretation

**Score 2.20 = Pilot-Ready Stage**

Recommended engagement approach:
- Identify 1-2 high-feasibility use cases with clear success metrics
- Run a proof of concept that delivers measurable value in 3-6 months
- Build internal ML capability alongside the pilot (don't just build the model — build the muscle)
- Establish governance foundations in parallel — not as a Phase 2 afterthought
- Use quick wins to build credibility and justify investment in infrastructure and talent

The CEO's 6-month "AI everywhere" timeline is incompatible with a maturity score of 2.20. Reset expectations: in 6 months, PayFlow can realistically have one production ML model (fraud detection) and foundational governance in place. "AI everywhere" is a 18-24 month journey from this starting point.

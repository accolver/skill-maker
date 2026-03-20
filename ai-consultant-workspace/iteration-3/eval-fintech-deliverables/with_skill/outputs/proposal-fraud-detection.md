# Proposal: ML-Based Fraud Detection System

**Prepared for:** PayFlow | **Prepared by:** AI Consulting Team | **Date:** March 2026

---

## The Challenge

PayFlow's fraud rate of 2.1% is more than four times the fintech industry average of 0.5%. At 50,000 transactions per day, this means approximately 1,050 fraudulent transactions are slipping through or being caught only after causing damage — compared to an expected 250 at industry-standard detection rates. The current rule-based system, maintained by two engineers, cannot adapt to evolving fraud patterns at the speed required. Every day this gap persists, PayFlow loses money to fraud, incurs chargeback costs, and risks eroding customer trust.

## Our Understanding

Based on our discovery engagement, we understand that:

- PayFlow processes 50K transactions/day through a rule-based fraud detection system
- The fraud rate (2.1%) has likely grown as fraud patterns evolve faster than manual rules can be updated
- Two engineers maintain the rules — they have deep domain expertise in fraud patterns but are bottlenecked by the manual nature of rule creation and tuning
- Three years of historical transaction data sits in BigQuery, including labeled fraud/legitimate outcomes — this is an excellent ML training dataset
- The engineering team of 40 includes 3 engineers with ML experience, providing a seed team
- PayFlow is SOC2 compliant but has no AI-specific governance or model risk management
- The CEO wants rapid AI adoption; the VP of Engineering wants maintainability and operational confidence
- PayFlow is on GCP (BigQuery), which provides a natural path to Vertex AI for ML workloads

## Proposed Solution

We propose building a custom ML-based fraud detection system on Google Vertex AI that replaces the rule-based system with a machine learning model trained on PayFlow's 3 years of transaction data. The system will score every transaction in real-time, flagging high-risk transactions for review and automatically blocking clearly fraudulent ones.

### Approach

**Phase 1: Data Preparation & Model Development (Weeks 1-6)**
- Audit transaction data quality in BigQuery (completeness, label accuracy, feature availability)
- Engineer features with the 2 fraud domain experts (their rule logic becomes feature inputs)
- Train and evaluate multiple model architectures (gradient boosted trees as baseline, neural network as comparison)
- Establish model performance baselines: precision, recall, F1, false positive rate
- Document model methodology for compliance

**Phase 2: Validation & Governance (Weeks 5-8)**
- Shadow-mode deployment: model scores transactions alongside existing rules without taking action
- Compare model decisions to rule-based decisions and actual fraud outcomes
- Conduct bias testing across transaction types, amounts, and customer demographics
- Establish model monitoring framework (drift detection, performance degradation alerting)
- Compliance review and sign-off for production deployment

**Phase 3: Production Deployment & Transition (Weeks 7-12)**
- Deploy model to production with graduated rollout (10% -> 25% -> 50% -> 100% of traffic)
- Implement human-in-the-loop review for borderline scores during ramp-up
- Build operational dashboards and alerting
- Create runbooks for model incidents and retraining triggers
- Knowledge transfer to PayFlow engineering team
- Decommission legacy rules (or retain as fallback layer)

### Why This Approach

1. **Custom model over vendor solution:** PayFlow's 3 years of proprietary transaction data is a competitive advantage. A custom model trained on PayFlow-specific patterns will outperform generic vendor models. However, we recommend a parallel vendor evaluation (Stripe Radar, Featurespace) as a risk mitigation — if the custom model underperforms, a vendor solution provides a fallback.

2. **Traditional ML over GenAI:** Fraud detection is a classification problem on structured data. Gradient boosted models and neural networks are the proven, industry-standard approach. They provide sub-100ms inference, explainability, and regulatory-compatible model documentation. GenAI is not appropriate for this use case.

3. **Vertex AI on GCP:** PayFlow's data is already in BigQuery on GCP. Vertex AI provides managed model training, serving, monitoring, and a model registry — avoiding the need to build MLOps infrastructure from scratch. This directly addresses the VP of Engineering's maintenance concerns.

4. **Shadow-mode before production:** Fintech fraud models cannot be deployed with a "move fast and break things" approach. Shadow-mode validation provides evidence of model performance before any customer impact, satisfies compliance requirements, and builds engineering team confidence.

5. **Fraud engineers as collaborators, not bystanders:** The 2 engineers maintaining current rules have irreplaceable domain knowledge. Their fraud pattern expertise becomes ML feature engineering input. Their rules become baseline comparisons. They transition from rule maintainers to model operators — a career growth opportunity.

## What You Get

| Deliverable | Description |
| --- | --- |
| Trained fraud detection model | Production-ready ML model with documented architecture, training data, and performance metrics |
| Real-time scoring API | Sub-100ms transaction scoring endpoint deployed on Vertex AI |
| Model monitoring dashboard | Real-time performance metrics, drift detection, and alerting |
| Shadow-mode validation report | Evidence of model performance vs. existing rules, compliance documentation |
| Operational runbooks | Incident response, retraining procedures, escalation workflows |
| Knowledge transfer | Training for PayFlow engineers on model operation, monitoring, and retraining |
| AI governance artifacts | Model card, bias testing results, explainability documentation, approval workflow |

## Timeline

| Week | Phase | Key Milestones |
| --- | --- | --- |
| 1-2 | Data Preparation | Data quality audit complete. Feature engineering plan approved. |
| 3-4 | Model Development | Baseline model trained. Initial performance metrics available. |
| 5-6 | Model Refinement | Final model selected. Shadow-mode deployment ready. |
| 5-7 | Governance | Bias testing complete. Model documentation submitted for compliance review. |
| 7-8 | Shadow Validation | 2-week shadow mode. Performance comparison report generated. |
| 8-9 | Compliance | Compliance review and sign-off. Production deployment approved. |
| 9-12 | Production Rollout | Graduated rollout (10% -> 100%). Monitoring active. Knowledge transfer. |

## Team

| Role | Allocation | Responsibilities |
| --- | --- | --- |
| Lead ML Engineer (Consultant) | 100% | Model architecture, training, deployment, monitoring setup |
| Senior ML Engineer (Consultant) | 75% | Feature engineering, data pipeline, shadow-mode infrastructure |
| AI Governance Specialist (Consultant) | 25% | Model documentation, bias testing, compliance liaison |
| Project Lead (Consultant) | 25% | Stakeholder alignment, milestone tracking, risk management |
| Fraud Domain Experts (PayFlow) | 50% each (2 engineers) | Feature engineering input, rule logic documentation, validation |
| ML Engineers (PayFlow) | 25% each (2-3 engineers) | Knowledge transfer recipients, co-development |
| VP Engineering (PayFlow) | 10% | Architecture review, operational requirements, approval gates |
| Compliance Lead (PayFlow) | 10% | Regulatory review, compliance sign-off |

## Investment

| Option | Scope | Investment | Timeline | Staff Engineer Hours |
| --- | --- | --- | --- | --- |
| Essential | Fraud detection model + basic monitoring. No governance artifacts. Limited knowledge transfer. | $120K-$180K | 8 weeks | 312-480 hrs |
| Recommended | Fraud detection model + full monitoring + governance artifacts + knowledge transfer + shadow validation. | $200K-$320K | 12 weeks | 520-830 hrs |
| Comprehensive | Recommended + vendor evaluation + model retraining automation + advanced explainability + fraud investigation dashboard. | $300K-$480K | 14 weeks | 780-1,250 hrs |

### Estimation Basis
- Base estimate: 240-600 Staff Engineer hours (Predictive Model, single use case per pricing guide)
- Multiplier applied: 1.3x for regulated fintech industry (compliance documentation, audit trails, approval gates)
- Non-engineering overhead: +25% for stakeholder alignment, change management, knowledge transfer

### Estimation Multipliers Applied
| Factor | Multiplier | Rationale |
| --- | --- | --- |
| Regulated industry (fintech, SOC2, PCI-adjacent) | 1.3x | Compliance documentation, model risk management artifacts, audit trail requirements, approval gates |
| First AI/ML project for the org | 1.3x | Extra time for governance setup, process establishment, organizational learning |
| Existing cloud platform (GCP/BigQuery) | 0.8x | Reduces infrastructure buildout — data already accessible, Vertex AI available |
| **Net multiplier** | **~1.35x** | Regulatory and first-project overhead partially offset by existing cloud infrastructure |

## Expected ROI

**Conservative estimate (reducing fraud rate from 2.1% to 1.0%):**
- Fraudulent transactions reduced by ~550/day (from 1,050 to 500)
- At average fraud loss of $50-$200 per transaction: **$10M-$40M annual savings**
- Even at the very conservative end ($25 average fraud cost): **$5M annual savings**

**Realistic estimate (reducing fraud rate to 0.5-0.8%, matching industry average):**
- Fraudulent transactions reduced by ~650-800/day
- Annual savings of **$12M-$58M** depending on average transaction value and fraud cost

**Payback period:** Even at minimum estimates, the Recommended tier ($200-$320K) pays for itself within the first month of production deployment.

**Non-quantifiable benefits:**
- Reduced customer churn from fraud-related account friction
- Reduced chargeback processing costs and penalties
- Engineering time freed from manual rule maintenance
- Foundation for broader ML capabilities (risk scoring, AML)
- Competitive positioning — ML fraud detection is table stakes for modern fintech

## Why Us

- Proven experience deploying ML fraud detection in fintech environments
- Deep understanding of fintech regulatory requirements and model risk management
- Structured methodology that addresses both technical delivery and governance
- Approach designed for VP Engineering's operability requirements — not just model accuracy
- Knowledge transfer focus ensures PayFlow's team can operate and evolve the system independently

## Next Steps

1. **Week 1:** Executive alignment session — review proposal, select tier, confirm timeline and resource commitments
2. **Week 1:** Sign SOW and schedule kickoff
3. **Week 2:** Data access provisioned, fraud domain experts allocated, kickoff meeting
4. **Week 2:** Begin data quality audit and feature engineering planning
5. **Week 4:** First model results checkpoint — review initial performance, adjust approach if needed

# Proposal: ML-Based Fraud Detection System for PayFlow

**Prepared for:** PayFlow | **Date:** March 2026

---

## The Challenge

PayFlow processes 50,000 transactions per day with a fraud rate of 2.1% — more than four times the industry average of 0.5%. The current fraud detection system is rule-based, maintained by 2 engineers, and cannot adapt to evolving fraud patterns. Every day this gap persists, PayFlow loses an estimated $36,500 more than it would at industry-average fraud rates. Beyond direct financial losses, high fraud rates erode customer trust, increase chargeback costs, and consume engineering resources on reactive rule maintenance.

## Our Understanding

Based on discovery, PayFlow has several advantages that make this initiative highly viable:

- **Data asset:** 3 years of transaction data in BigQuery, labeled with fraud outcomes — this is the foundation for supervised ML
- **Domain expertise:** 2 engineers who maintain fraud rules have deep knowledge of fraud patterns and edge cases — their input is critical for feature engineering
- **Infrastructure starting point:** GCP/BigQuery presence means the ML infrastructure can be built on the same cloud platform
- **Clear success metric:** Fraud rate is measurable daily, making it straightforward to demonstrate impact

The challenge is that PayFlow has no ML infrastructure, limited ML talent (3 engineers with ML experience), no AI governance framework, and a VP of Engineering who is rightly concerned about the maintenance burden of new AI systems. Our approach addresses all of these directly.

## Proposed Solution

Build a custom ML fraud detection model trained on PayFlow's 3-year transaction history, deployed as a scoring service that evaluates every transaction in near-real-time.

### Approach

**Phase 1: Foundation & Model Development (Weeks 1-6)**
- Data audit and feature engineering using BigQuery transaction data
- Collaborative feature design sessions with the 2 fraud rules engineers
- Model training: gradient boosted trees (XGBoost/LightGBM) as baseline, with neural network comparison
- Evaluation framework: precision, recall, F1, and false positive rate benchmarks
- Establish AI governance minimum: model documentation template, approval process, monitoring requirements

**Phase 2: Pilot Deployment (Weeks 7-10)**
- Shadow mode deployment: model scores transactions alongside existing rules without blocking
- Performance comparison: ML model vs. rule-based system on the same live traffic
- False positive analysis and threshold tuning
- Compliance documentation: model card, data lineage, audit trail design

**Phase 3: Production Cutover (Weeks 11-14)**
- Gradual traffic migration from rules to ML model (10% -> 50% -> 100%)
- Monitoring dashboard: model performance, drift detection, false positive rates
- Runbook for model retraining and incident response
- Knowledge transfer to PayFlow engineering team

### Why This Approach

1. **Custom ML over vendor solution:** PayFlow's 3 years of proprietary transaction data is a competitive advantage. A custom model trained on PayFlow-specific fraud patterns will outperform generic vendor models. Vendor solutions (Featurespace, Feedzai) cost $200K-$500K+/year and create dependency without building internal capability.

2. **Gradient boosted trees as baseline:** Industry-proven for tabular fraud detection. Interpretable enough to satisfy regulatory requirements for model explainability. Fast inference for near-real-time scoring.

3. **Shadow mode before cutover:** Eliminates risk of the new model causing false positives that block legitimate transactions. Gives engineering team confidence in the system before it affects customers.

4. **Governance built in, not bolted on:** The AI governance framework is built as part of this project, not as a separate initiative. This means governance is practical and grounded in a real use case rather than theoretical.

## What You Get

| Deliverable | Description |
| --- | --- |
| Trained fraud detection model | Custom ML model with documented performance metrics |
| Model serving infrastructure | GCP-based scoring service integrated with transaction pipeline |
| Monitoring dashboard | Real-time model performance, drift detection, alert thresholds |
| AI governance framework | AI use policy, model approval process, model card template |
| Model documentation | Model card, data lineage, feature documentation, bias analysis |
| Retraining pipeline | Automated pipeline for periodic model retraining on new data |
| Runbooks | Operational runbooks for monitoring, retraining, incident response |
| Knowledge transfer | Training sessions for PayFlow ML and engineering teams |

## Timeline

| Phase | Weeks | Key Milestones |
| --- | --- | --- |
| **Phase 1: Foundation & Model Dev** | 1-6 | Data audit complete (W2), Feature engineering done (W4), Model trained and evaluated (W6) |
| **Phase 2: Pilot (Shadow Mode)** | 7-10 | Shadow deployment live (W7), 4-week performance comparison complete (W10), Compliance docs drafted (W10) |
| **Phase 3: Production Cutover** | 11-14 | Gradual rollout begins (W11), Full production (W13), Knowledge transfer complete (W14) |

**Total duration: 14 weeks (3.5 months)**

## Team

| Role | Allocation | Responsibilities |
| --- | --- | --- |
| Lead ML Engineer | 100% | Model architecture, training, evaluation, deployment |
| ML Engineer | 100% | Data pipeline, feature engineering, monitoring infrastructure |
| AI Governance Consultant | 25% | AI policy drafting, compliance guidance, model documentation standards |
| Project Lead | 25% | Stakeholder management, milestone tracking, risk management |

**Client team required:**
- 2 fraud rules engineers: 25% allocation for domain knowledge, feature design, and evaluation
- 1 data engineer: 25% allocation for BigQuery access, data pipeline support
- VP Engineering: weekly 30-minute check-in for technical decision alignment
- Legal/Compliance: 2-3 sessions for governance framework review

## Investment

| Option | Scope | Investment | Timeline |
| --- | --- | --- | --- |
| **Essential** | Fraud detection model + shadow mode pilot + basic monitoring | $180K-$280K | 10 weeks |
| **Recommended** | Essential + production deployment + governance framework + retraining pipeline + knowledge transfer | $280K-$420K | 14 weeks |
| **Comprehensive** | Recommended + real-time feature store foundation + advanced monitoring + A/B testing infrastructure (prepares for Phase 2 risk scoring) | $400K-$580K | 16 weeks |

### Effort Breakdown (Recommended Option)

| Phase | Staff Engineer Hours | Calendar Duration |
| --- | --- | --- |
| Phase 1: Foundation & Model Dev | 300-450 hrs | 6 weeks |
| Phase 2: Pilot (Shadow Mode) | 150-250 hrs | 4 weeks |
| Phase 3: Production Cutover | 120-200 hrs | 4 weeks |
| **Total** | **570-900 hrs** | **14 weeks** |

### Estimation Multipliers Applied

| Factor | Multiplier | Rationale |
| --- | --- | --- |
| Regulated industry (SOC2, PCI DSS) | 1.3x | Compliance documentation, audit trails, approval gates |
| First AI project for the org | 1.3x | Extra time for education, governance setup, change management |
| Existing BigQuery data platform | 0.9x | Data is already consolidated and queryable, reduces data engineering effort |
| **Net effective multiplier** | **~1.5x** | Applied to base estimate of 240-600 hrs for predictive model |

## Expected ROI

| Metric | Conservative | Base Case | Optimistic |
| --- | --- | --- | --- |
| Fraud rate reduction | 2.1% to 1.2% (43% reduction) | 2.1% to 0.7% (67% reduction) | 2.1% to 0.5% (76% reduction) |
| Annual fraud savings | $4.7M | $8.5M | $10.2M |
| Investment (Recommended) | $420K | $350K | $280K |
| Payback period | 5 weeks | 3 weeks | 2 weeks |
| Year 1 ROI | 1,019% | 2,329% | 3,543% |

*Assumptions: $50 average transaction value, 50K transactions/day, 365 days/year. Fraud savings = (current fraud rate - projected fraud rate) x daily transaction volume x avg transaction value x 365. Does not include secondary benefits (reduced chargebacks, customer trust, lower support volume for fraud-related inquiries).*

### Sensitivity Analysis

| Scenario | Fraud Rate After ML | Annual Savings | Payback (Recommended) | 1-Year ROI |
| --- | --- | --- | --- | --- |
| Conservative (50% of projected benefit) | 1.4% | $4.2M | 5 weeks | 1,100% |
| Base Case | 0.7% | $8.5M | 3 weeks | 2,329% |
| Optimistic (150% of projected benefit) | 0.5% | $10.2M | 2 weeks | 2,814% |

### Risks to ROI

- Model performance may take 2-3 retraining cycles to reach optimal accuracy
- False positive rate must be managed — blocking legitimate transactions has its own cost
- Fraud patterns evolve; model requires ongoing monitoring and retraining
- Regulatory requirements may extend compliance documentation timeline

## Why This Initiative First

1. **Highest financial impact:** The fraud rate gap is PayFlow's most expensive problem. Every week of delay costs ~$255K in excess fraud losses.
2. **Builds ML muscle:** This project establishes PayFlow's first ML infrastructure, governance framework, and operational patterns. Everything built here is reusable for future initiatives.
3. **Aligns skeptics:** The VP of Engineering's concern about maintenance is valid. This project explicitly includes monitoring, retraining pipelines, and runbooks. Success here builds confidence for future AI investments.
4. **Proves the model:** Quick, measurable results justify Phase 2 investment and reset the "AI everywhere" conversation with evidence.

## Next Steps

1. **Week 1:** Sign SOW and schedule kickoff
2. **Week 1:** Arrange BigQuery data access and identify fraud rules engineer participation
3. **Week 1-2:** Schedule VP Engineering working session to align on technical approach
4. **Week 2:** Brief legal/compliance on AI governance plan
5. **Week 2:** Begin data audit and feature engineering

---

## Statement of Work: ML Fraud Detection System

**Client:** PayFlow
**Date:** March 2026
**Version:** 1.0

### 1. Background & Objectives

PayFlow processes 50,000 transactions daily with a 2.1% fraud rate — 4.2x the industry average. The current rule-based fraud detection system is maintained by 2 engineers and cannot adapt to evolving fraud patterns. This project will replace the rule-based system with a custom ML fraud detection model, establish PayFlow's AI governance framework, and build foundational ML infrastructure for future initiatives.

**Objectives:**
- Reduce fraud rate from 2.1% to below 1.0% within 6 months of production deployment
- Establish AI governance framework compliant with fintech regulatory expectations
- Build reusable ML infrastructure (training pipeline, model serving, monitoring)
- Transfer knowledge to PayFlow engineering team for ongoing maintenance

### 2. Scope of Work

#### In Scope

- Data audit of BigQuery transaction data for ML readiness (completeness, labeling quality, bias assessment)
- Feature engineering in collaboration with PayFlow fraud domain experts
- Training and evaluation of ML fraud detection model(s) using historical transaction data
- Model serving infrastructure on GCP for near-real-time transaction scoring
- Shadow mode deployment for 4-week parallel evaluation against existing rules
- Gradual production cutover with rollback capability
- Model monitoring dashboard (performance metrics, drift detection, alerting)
- Automated model retraining pipeline
- AI governance framework: AI use policy, model approval process, model documentation template (model card)
- Compliance documentation: model card, data lineage, audit trail design
- Operational runbooks for monitoring, retraining, and incident response
- Knowledge transfer sessions (4 sessions, 2 hours each) for PayFlow engineering team
- Project management and weekly stakeholder updates

#### Out of Scope

- Modification of PayFlow's existing transaction processing pipeline (integration points only)
- Real-time feature store implementation (foundation-level only in Comprehensive option)
- Customer-facing fraud notification or dispute resolution workflows
- Fraud investigation tooling or case management
- Changes to PayFlow's existing rule-based system (maintained in parallel during pilot)
- Hardware or cloud infrastructure procurement (assumed PayFlow provides GCP environment)
- Ongoing model monitoring and maintenance after knowledge transfer period
- Legal review or regulatory filing for AI systems
- PCI DSS audit or certification updates
- Other AI initiatives (customer service, KYC, etc.)

### 3. Deliverables

| # | Deliverable | Description | Due |
| --- | --- | --- | --- |
| 1 | Data Audit Report | Assessment of BigQuery data quality, completeness, labeling, and bias | Week 2 |
| 2 | Feature Engineering Spec | Documented features with rationale, data sources, and computation logic | Week 4 |
| 3 | Trained Model + Evaluation Report | ML model with documented performance metrics (precision, recall, F1, AUC, false positive rate) | Week 6 |
| 4 | AI Governance Framework | AI use policy, model approval process, model card template | Week 6 |
| 5 | Shadow Mode Deployment | Model scoring in parallel with production rules, comparison dashboard | Week 7 |
| 6 | Shadow Mode Results Report | 4-week performance comparison with recommendation for cutover thresholds | Week 10 |
| 7 | Production Deployment | Model serving in production with gradual rollout capability | Week 13 |
| 8 | Monitoring Dashboard | Real-time performance metrics, drift detection, alerting | Week 13 |
| 9 | Retraining Pipeline | Automated pipeline for periodic model retraining | Week 13 |
| 10 | Operational Runbooks | Monitoring, retraining, incident response, rollback procedures | Week 14 |
| 11 | Knowledge Transfer | 4 x 2-hour training sessions for PayFlow team | Week 14 |
| 12 | Final Project Report | Summary of results, lessons learned, recommendations for Phase 2 | Week 14 |

### 4. Approach & Methodology

**Methodology:** Agile delivery with 2-week sprints. Weekly stakeholder check-ins. Phase-gated approach with go/no-go decisions at Phase 1 and Phase 2 completion.

- **Sprint 1-3 (Weeks 1-6):** Data audit, feature engineering, model training and evaluation, governance framework
- **Sprint 4-5 (Weeks 7-10):** Shadow mode deployment, performance comparison, compliance documentation
- **Sprint 6-7 (Weeks 11-14):** Production cutover, monitoring, retraining pipeline, knowledge transfer

**Decision Gates:**
- End of Week 6: Model evaluation results reviewed. Proceed to shadow mode only if model outperforms rules on key metrics.
- End of Week 10: Shadow mode results reviewed. Proceed to production only if false positive rate is within acceptable thresholds.

### 5. Timeline

| Phase | Start | End | Key Milestones |
| --- | --- | --- | --- |
| Phase 1: Foundation | Week 1 | Week 6 | Data audit (W2), Features complete (W4), Model trained (W6), Governance framework (W6) |
| Phase 2: Pilot | Week 7 | Week 10 | Shadow deployment (W7), 4-week comparison complete (W10) |
| Phase 3: Production | Week 11 | Week 14 | Gradual rollout (W11-13), Knowledge transfer (W14), Project close (W14) |

### 6. Team & Resources

#### Consultant Team

| Role | Allocation | Responsibilities |
| --- | --- | --- |
| Lead ML Engineer | 100% (14 weeks) | Architecture, model development, deployment, technical leadership |
| ML Engineer | 100% (14 weeks) | Data pipeline, feature engineering, monitoring, retraining pipeline |
| AI Governance Consultant | 25% (14 weeks) | Policy drafting, compliance guidance, documentation standards |
| Project Lead | 25% (14 weeks) | Stakeholder management, sprint planning, risk management, reporting |

#### Client Resources Required

| Role | Allocation | Purpose |
| --- | --- | --- |
| Fraud Rules Engineers (2) | 25% each | Domain knowledge, feature design, evaluation, shadow mode analysis |
| Data Engineer | 25% | BigQuery access, data pipeline support, infrastructure provisioning |
| VP Engineering | 1 hr/week | Technical alignment, architecture decisions, production readiness review |
| Legal/Compliance | 2-3 sessions (total ~6 hrs) | Governance framework review, compliance requirements input |
| Executive Sponsor (CEO or CTO) | Bi-weekly 30-min update | Strategic alignment, escalation path, go/no-go decisions |

### 7. Assumptions

1. PayFlow will provide GCP environment access with sufficient BigQuery quota and compute resources within Week 1
2. Historical transaction data in BigQuery includes fraud labels (confirmed fraud vs. legitimate) for supervised learning
3. PayFlow's fraud rules engineers are available at 25% allocation for the full 14-week engagement
4. VP Engineering and executive sponsor are available for scheduled check-ins
5. Legal/compliance team is available for 2-3 governance review sessions during Weeks 4-6
6. PayFlow's existing transaction processing pipeline has an integration point where a scoring service can be called (API or message queue)
7. No major changes to PayFlow's transaction volume or fraud patterns during the engagement
8. PayFlow is responsible for ongoing cloud infrastructure costs (GCP compute, storage, serving)
9. The AI governance framework covers PayFlow's AI initiatives broadly but is scoped to fraud detection specifics for this engagement
10. Production deployment uses PayFlow's existing deployment processes (CI/CD, change management)

### 8. Effort Estimate & Resourcing

#### Effort Breakdown

| Phase | Staff Engineer Hours | Team Composition | Calendar Duration |
| --- | --- | --- | --- |
| Phase 1: Foundation & Model Dev | 300-450 hrs | Lead ML Eng (200-300) + ML Eng (100-150) | 6 weeks |
| Phase 2: Pilot (Shadow Mode) | 150-250 hrs | Lead ML Eng (80-130) + ML Eng (70-120) | 4 weeks |
| Phase 3: Production Cutover | 120-200 hrs | Lead ML Eng (60-100) + ML Eng (60-100) | 4 weeks |
| Governance & Project Mgmt | 70-100 hrs | Governance Consultant (35-50) + Project Lead (35-50) | 14 weeks |
| **Total** | **640-1,000 hrs** | | **14 weeks** |

#### Estimation Multipliers Applied

| Factor | Multiplier | Rationale |
| --- | --- | --- |
| Regulated industry (SOC2, PCI DSS context) | 1.3x | Additional compliance documentation, audit trail design, approval gates |
| First AI project for PayFlow | 1.3x | Extra time for education, governance setup, change management, VP Engineering alignment |
| Existing BigQuery data platform | 0.9x | Data consolidation already done; reduces data engineering effort |
| **Net multiplier** | **~1.5x** | Applied to base estimate of 240-600 hrs (Predictive Model, single use case from pricing guide) |

#### Client Resource Commitments

| Resource | Weekly Hours | Duration | Total Hours |
| --- | --- | --- | --- |
| Fraud Rules Engineers (2 x 10 hrs) | 20 hrs combined | 14 weeks | 280 hrs |
| Data Engineer | 10 hrs | 14 weeks | 140 hrs |
| VP Engineering | 1 hr | 14 weeks | 14 hrs |
| Legal/Compliance | As needed | 3 sessions | ~6 hrs |
| Executive Sponsor | 0.5 hr | Bi-weekly | ~4 hrs |

### 9. Acceptance Criteria

| Deliverable | Acceptance Criteria |
| --- | --- |
| Trained Model | Precision >= 90% at recall >= 80% on held-out test set; false positive rate < 0.5%; AUC > 0.95; documented evaluation on PayFlow-representative data distribution |
| Shadow Mode Results | 4 consecutive weeks of shadow scoring with < 0.1% scoring failures; documented comparison showing ML model outperforms rules on precision, recall, and false positive rate |
| Production Deployment | Model scoring 100% of transactions with < 200ms p99 latency; rollback tested and documented; monitoring alerts verified |
| Monitoring Dashboard | Displays model performance metrics updated within 1 hour; drift detection alerts configured and tested; accessible to PayFlow engineering team |
| Retraining Pipeline | Successfully executed end-to-end on historical data; documented trigger criteria for retraining; PayFlow team can execute independently |
| AI Governance Framework | Reviewed and approved by PayFlow legal/compliance; covers model approval, documentation, monitoring, and retirement processes |
| Knowledge Transfer | PayFlow team can independently: retrain the model, deploy updates, interpret monitoring dashboards, execute incident runbooks. Verified through hands-on exercises in final sessions. |

### 10. Exclusions

1. This SOW does not include ongoing model monitoring, maintenance, or retraining after the 14-week engagement. A separate retainer or support agreement can be scoped.
2. This SOW does not include modifications to PayFlow's core transaction processing system. Integration is via API/message queue only.
3. PCI DSS audit, certification, or compliance filing is not included. Compliance documentation is provided but regulatory submission is PayFlow's responsibility.
4. This SOW does not cover other AI initiatives (customer service, KYC, risk scoring). These are scoped separately.
5. Cloud infrastructure costs (GCP compute, BigQuery, model serving) are PayFlow's responsibility and not included in project investment.
6. Hiring, recruiting, or staffing of PayFlow's internal ML team is not included. Recommendations may be provided as part of knowledge transfer.

### 11. Change Management

- Scope changes must be requested in writing via the project lead
- Impact assessment (timeline, cost, risk) provided within 3 business days
- Changes require written approval from both PayFlow executive sponsor and consultant project lead
- Approved changes documented in a Change Log appendix to this SOW
- Changes that affect deliverable acceptance criteria require updated criteria to be agreed before work begins
- Emergency changes (e.g., production incident during cutover) follow an expedited 24-hour approval process

### 12. Terms & Conditions

Per master consulting agreement. Key terms:

- **Intellectual Property:** Custom model trained on PayFlow data is owned by PayFlow. Framework code, tooling, and reusable components retain consultant ownership with perpetual license to PayFlow.
- **Confidentiality:** All PayFlow data, business processes, and findings are confidential. NDA applies.
- **Termination:** Either party may terminate with 2 weeks written notice. PayFlow pays for work completed through termination date.
- **Liability:** Consultant liability limited to fees paid. Consultant is not liable for fraud losses during or after the engagement.
- **Payment Terms:** Monthly invoicing based on hours worked, net 30 days.

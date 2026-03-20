# Statement of Work: ML-Based Fraud Detection System

**Client:** PayFlow
**Consultant:** AI Consulting Team
**Date:** March 2026
**Version:** 1.0

---

## 1. Background & Objectives

PayFlow processes 50,000 financial transactions per day with a current fraud rate of 2.1%, which is 4.2x the industry average of 0.5%. The existing rule-based fraud detection system, maintained by two engineers, cannot adapt to evolving fraud patterns at the speed required to protect PayFlow's customers and revenue.

**Objectives:**
- Reduce PayFlow's fraud rate from 2.1% to 0.5-0.8% (industry average range)
- Deploy a production ML fraud detection model with real-time transaction scoring
- Establish foundational AI governance practices for PayFlow's first ML production system
- Transfer operational knowledge to PayFlow's engineering team for ongoing model management

## 2. Scope of Work

### In Scope

- Data quality assessment of historical transaction data in BigQuery (3 years)
- Feature engineering in collaboration with PayFlow's fraud domain experts
- ML model training, evaluation, and selection (gradient boosted trees and neural network architectures evaluated)
- Shadow-mode deployment alongside existing rule-based system for 2-week validation period
- Production deployment on Google Vertex AI with graduated traffic rollout
- Real-time transaction scoring API (sub-100ms latency target)
- Model monitoring dashboard with drift detection and performance alerting
- Bias testing across transaction types, amounts, and customer demographics
- Model documentation (model card, training data description, performance metrics, limitations)
- Operational runbooks for model incidents, retraining, and escalation
- Knowledge transfer sessions for PayFlow engineering team (3 sessions, 2 hours each)
- AI governance artifacts: model approval workflow, documentation standards, bias testing protocol
- Compliance liaison support during PayFlow's internal compliance review

### Out of Scope

- Changes to PayFlow's core transaction processing system or payment infrastructure
- Customer-facing UI changes or customer notification system modifications
- Development of a fraud investigation dashboard or case management system (available in Comprehensive tier)
- Automated model retraining pipeline (available in Comprehensive tier; manual retraining process documented)
- AML (Anti-Money Laundering) detection or compliance
- Credit risk scoring or underwriting models
- Integration with third-party fraud detection vendors (parallel vendor evaluation available in Comprehensive tier)
- PCI DSS audit or certification work
- Ongoing model monitoring or maintenance after the 12-week engagement (available as retainer)
- Training data labeling or annotation — assumes existing labels in BigQuery are usable
- Infrastructure provisioning beyond Vertex AI — assumes GCP project with billing is available
- Legal or regulatory advice — consultant provides technical compliance artifacts, not legal counsel

## 3. Deliverables

| # | Deliverable | Description | Due Date |
| --- | --- | --- | --- |
| 1 | Data Quality Assessment Report | Audit of transaction data completeness, label accuracy, feature availability, and readiness for ML training | Week 2 |
| 2 | Feature Engineering Plan | Documented feature set with business rationale, data sources, and engineering approach. Co-developed with PayFlow fraud experts. | Week 3 |
| 3 | Model Evaluation Report | Comparison of trained model architectures with performance metrics (precision, recall, F1, false positive rate, AUC-ROC) against baseline rule-based system | Week 6 |
| 4 | Shadow-Mode Validation Report | 2-week shadow deployment results comparing ML model decisions to rule-based decisions and actual fraud outcomes | Week 8 |
| 5 | Bias Testing Report | Analysis of model performance across transaction types, amounts, customer demographics, and geographic segments | Week 7 |
| 6 | Model Card & Documentation | Comprehensive model documentation: architecture, training data, performance, limitations, intended use, ethical considerations | Week 7 |
| 7 | AI Governance Package | Model approval workflow, documentation standards template, bias testing protocol, retraining trigger criteria | Week 8 |
| 8 | Production Scoring API | Deployed real-time transaction scoring endpoint on Vertex AI with sub-100ms latency | Week 10 |
| 9 | Monitoring Dashboard | Real-time model performance dashboard with drift detection, alerting, and operational metrics | Week 10 |
| 10 | Operational Runbooks | Incident response procedures, retraining process, escalation workflows, rollback procedures | Week 11 |
| 11 | Knowledge Transfer Package | 3 sessions (2 hrs each) covering model operation, monitoring, retraining, and troubleshooting. Recorded for future reference. | Week 11-12 |
| 12 | Engagement Summary Report | Final report with results, recommendations, and roadmap for next phase (risk scoring, agent evolution) | Week 12 |

## 4. Approach & Methodology

### Phase 1: Data Preparation & Model Development (Weeks 1-6)

**Week 1-2: Data Audit & Feature Planning**
- Access BigQuery transaction data
- Assess data quality, completeness, and label reliability
- Identify and document data gaps or quality issues
- Collaborate with fraud domain experts to translate rule logic into ML features
- Produce Data Quality Assessment Report and Feature Engineering Plan

**Week 3-5: Model Training & Evaluation**
- Engineer features and build training pipeline
- Train gradient boosted tree models (XGBoost/LightGBM) as baseline
- Train neural network architectures for comparison
- Evaluate models against performance criteria and existing rule-based system
- Select final model architecture based on performance, latency, and explainability

**Week 5-6: Model Refinement & Documentation**
- Optimize selected model (hyperparameter tuning, feature selection)
- Conduct bias testing across protected dimensions
- Produce Model Evaluation Report, Bias Testing Report, and Model Card

### Phase 2: Validation & Governance (Weeks 5-8)

**Week 5-7: Governance Setup**
- Draft AI governance artifacts (model approval workflow, documentation standards)
- Submit model documentation for PayFlow compliance review
- Iterate based on compliance team feedback

**Week 7-8: Shadow-Mode Validation**
- Deploy model in shadow mode alongside existing rules
- Collect 2 weeks of parallel scoring data
- Analyze model performance vs. rules vs. actual outcomes
- Produce Shadow-Mode Validation Report
- Obtain compliance sign-off for production deployment

### Phase 3: Production Deployment & Knowledge Transfer (Weeks 9-12)

**Week 9-10: Graduated Rollout**
- Deploy scoring API on Vertex AI
- Rollout: 10% traffic (Week 9) -> 50% (Week 9.5) -> 100% (Week 10)
- Deploy monitoring dashboard and alerting
- Human review of borderline scores during ramp-up

**Week 11-12: Operational Handoff**
- Deliver operational runbooks
- Conduct 3 knowledge transfer sessions with PayFlow team
- Final performance assessment at full production traffic
- Produce Engagement Summary Report with next-phase recommendations

## 5. Timeline

| Phase | Start | End | Key Milestones |
| --- | --- | --- | --- |
| Phase 1: Data & Model | Week 1 | Week 6 | Data audit (W2), Feature plan (W3), Model evaluation (W6) |
| Phase 2: Validation | Week 5 | Week 8 | Bias testing (W7), Shadow validation (W8), Compliance sign-off (W8) |
| Phase 3: Production | Week 9 | Week 12 | API deployed (W10), Knowledge transfer (W11-12), Final report (W12) |

**Total duration:** 12 weeks

**Decision gates:**
- **Week 2 gate:** Data quality sufficient for ML training? If critical gaps found, scope adjustment discussion.
- **Week 6 gate:** Model performance meets minimum thresholds (precision >90%, recall >80%, false positive rate <2%)? If not, adjust approach or evaluate vendor alternative.
- **Week 8 gate:** Shadow-mode validation confirms production readiness? Compliance sign-off obtained? If not, extend shadow mode.

## 6. Team & Resources

### Consultant Team

| Role | Name | Allocation | Responsibilities |
| --- | --- | --- | --- |
| Lead ML Engineer | TBD | 100% (12 weeks) | Model architecture, training, deployment, monitoring, technical lead |
| Senior ML Engineer | TBD | 75% (12 weeks) | Feature engineering, data pipeline, shadow-mode infrastructure, API deployment |
| AI Governance Specialist | TBD | 25% (Weeks 5-12) | Model documentation, bias testing, governance artifacts, compliance liaison |
| Project Lead | TBD | 25% (12 weeks) | Stakeholder management, milestone tracking, risk management, reporting |

### Client Resources Required

| Resource | Allocation | Purpose |
| --- | --- | --- |
| Fraud Domain Expert Engineers (2) | 50% each, Weeks 1-6; 25% Weeks 7-12 | Feature engineering input, rule documentation, validation, knowledge transfer recipients |
| ML-Experienced Engineers (2-3) | 25% each, Weeks 3-12 | Co-development, knowledge transfer recipients, future model operators |
| VP Engineering | 10%, full engagement | Architecture review, operational requirements, approval gates |
| Compliance/Legal Lead | 10%, Weeks 5-9 | Regulatory review, compliance sign-off |
| GCP Admin | 5%, Weeks 1-3 | Vertex AI project setup, IAM, networking, billing |

**Client must provide:**
- Read access to BigQuery transaction data (3 years historical)
- GCP project with Vertex AI enabled and appropriate billing limits
- Access to fraud rule documentation and logic
- Compliance team availability for review cycles (2-week turnaround for reviews)
- Meeting rooms / video conferencing for knowledge transfer sessions

## 7. Assumptions

1. PayFlow's historical transaction data in BigQuery includes reliable fraud/legitimate labels sufficient for supervised ML training. If labels are incomplete or unreliable, additional data preparation effort will be required (scope change).
2. GCP project with Vertex AI is available or can be provisioned within Week 1. Billing limits are set to accommodate model training compute costs (estimated $2K-$10K for training experimentation).
3. The 2 fraud domain expert engineers will be available at 50% allocation for the first 6 weeks. Their domain knowledge is critical for feature engineering quality.
4. PayFlow's compliance team can complete model documentation review within 2 weeks of submission (Weeks 7-8).
5. The existing rule-based system will remain operational throughout the engagement as a fallback. No downtime or migration of the existing system is required during shadow mode.
6. Transaction data contains sufficient feature diversity (transaction amount, time, location, merchant category, user behavioral data) for effective ML model training.
7. PayFlow's transaction scoring latency budget is 100ms or greater (sufficient for Vertex AI online prediction).
8. No changes to PayFlow's core transaction processing pipeline are required — the ML model will be invoked as an additional scoring step, not a replacement of the transaction flow.
9. PayFlow does not currently have enterprise AI licenses (Copilot, etc.) that could be repurposed for this use case. If discovered, scope adjustment may reduce effort.
10. The engagement operates under PayFlow's existing SOC2 compliance framework. No new compliance certifications are required as a result of this project.

## 8. Effort Estimate & Resourcing

### Effort Breakdown

| Phase | Staff Engineer Hours | Team Composition | Calendar Duration |
| --- | --- | --- | --- |
| Phase 1: Data & Model | 280-440 hrs | Lead ML (240 hrs) + Senior ML (180 hrs) + Project Lead (30 hrs) | 6 weeks |
| Phase 2: Validation & Governance | 120-200 hrs | Lead ML (60 hrs) + Senior ML (45 hrs) + Governance (60 hrs) + Project Lead (20 hrs) | 4 weeks (overlaps Phase 1) |
| Phase 3: Production & Transfer | 120-190 hrs | Lead ML (80 hrs) + Senior ML (60 hrs) + Governance (20 hrs) + Project Lead (25 hrs) | 4 weeks |
| **Total** | **520-830 hrs** | | **12 weeks** |

### Estimation Multipliers Applied

| Factor | Multiplier | Rationale |
| --- | --- | --- |
| Regulated industry (fintech) | 1.3x | Compliance documentation, audit trail, model risk management artifacts, approval gates |
| First AI/ML project for org | 1.3x | Governance framework creation, process establishment, additional change management |
| Existing GCP/BigQuery infrastructure | 0.8x | Data accessible, Vertex AI available, reduces infrastructure setup |
| **Net multiplier** | **~1.35x** | Applied to base estimate of 240-600 hours for Predictive Model (single use case) |

### Client Resource Commitments

| Role | Total Hours (12 weeks) | Weekly Average |
| --- | --- | --- |
| Fraud Domain Experts (2) | 240-360 hrs combined | ~10-15 hrs/week each (Weeks 1-6), ~5 hrs/week each (Weeks 7-12) |
| ML Engineers (2-3) | 180-270 hrs combined | ~5-7.5 hrs/week each |
| VP Engineering | 48 hrs | ~4 hrs/week |
| Compliance Lead | 40 hrs | ~5 hrs/week (Weeks 5-9 only) |
| GCP Admin | 10 hrs | ~3 hrs/week (Weeks 1-3 only) |

## 9. Acceptance Criteria

### Deliverable Acceptance

Each deliverable is subject to PayFlow review and acceptance:

1. **Data Quality Assessment Report:** Accepted when PayFlow VP Engineering confirms findings are accurate and actionable.
2. **Feature Engineering Plan:** Accepted when fraud domain experts and VP Engineering approve the feature set.
3. **Model Evaluation Report:** Accepted when model meets minimum performance thresholds:
   - Precision: > 90% (minimize false positives that block legitimate transactions)
   - Recall: > 80% (catch the majority of actual fraud)
   - False Positive Rate: < 2% of legitimate transactions incorrectly flagged
   - AUC-ROC: > 0.95
   - Latency: < 100ms p95 inference time
4. **Shadow-Mode Validation Report:** Accepted when ML model demonstrates statistically significant improvement over rule-based system on the same 2-week transaction set.
5. **Bias Testing Report:** Accepted when no statistically significant performance disparities are found across protected dimensions, or identified disparities have documented mitigation plans approved by compliance.
6. **Production Scoring API:** Accepted when operating at 100% traffic for 5 consecutive business days with:
   - Latency < 100ms p95
   - Availability > 99.9%
   - Fraud detection rate improvement over baseline
7. **Knowledge Transfer:** Accepted when PayFlow's designated engineers can independently demonstrate model monitoring review, alert triage, and retraining initiation.
8. **Engagement Summary Report:** Accepted when VP Engineering and compliance lead confirm completeness.

### Review Process
- Deliverables submitted via shared document repository
- PayFlow has 5 business days to review each deliverable
- Feedback provided in writing; consultant addresses within 3 business days
- Maximum 2 review cycles per deliverable before escalation to project sponsors

## 10. Change Management

### Scope Change Process
1. Either party identifies a potential scope change
2. Consultant documents the change request: description, rationale, impact on timeline, impact on effort/cost
3. PayFlow project sponsor reviews and approves or rejects within 5 business days
4. Approved changes are documented as SOW amendments with updated timeline and pricing
5. No work on changed scope begins until written approval is received

### Change Triggers
- Data quality issues requiring additional preparation work
- Model performance not meeting thresholds requiring architectural changes
- Compliance requirements discovered during review that require additional governance work
- PayFlow resource availability changes affecting project timeline

### Pricing for Changes
- Additional work priced at Staff Engineer rate consistent with original engagement pricing
- Timeline impact assessed on case-by-case basis
- Changes reducing scope result in proportional fee reduction

## 11. Terms & Conditions

### Intellectual Property
- ML model trained on PayFlow's data is PayFlow's property
- Consultant retains rights to general methodologies, frameworks, and tools not specific to PayFlow
- AI governance templates are licensed to PayFlow for internal use

### Confidentiality
- All PayFlow data, business information, and engagement details are confidential
- Consultant team members sign individual NDAs before data access
- No PayFlow data leaves PayFlow's GCP environment — all model training and evaluation occurs within PayFlow's infrastructure

### Termination
- Either party may terminate with 2 weeks written notice
- PayFlow pays for work completed through termination date
- All deliverables completed to date are transferred to PayFlow upon termination

### Liability
- Consultant liability limited to fees paid under this SOW
- Consultant does not guarantee specific fraud rate reduction — model performance depends on data quality and fraud pattern characteristics
- PayFlow is responsible for compliance decisions — consultant provides technical artifacts and recommendations, not legal or regulatory advice

### Payment Terms
- Reference master services agreement for standard payment terms
- Milestone-based billing: 30% at kickoff, 30% at Phase 2 completion (Week 8), 40% at final acceptance

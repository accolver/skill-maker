# Phase 1 Initiative Proposal: ML-Based Fraud Detection System

**Prepared for:** PayFlow Executive Leadership Team
**Date:** March 19, 2026
**Initiative Code:** PF-AI-001
**Classification:** Confidential

---

## 1. Problem Statement

PayFlow processes 50,000 transactions per day with a fraud rate of 2.1%, more than four times the industry average of 0.5%. The current rule-based detection system is maintained by 2 engineers and can only catch fraud patterns that have been previously identified and manually encoded as rules.

This gap represents approximately 800 excess fraudulent transactions per day (1,050 actual vs. ~250 at industry average). Assuming an average fraudulent transaction value of $75-$200, this translates to **$2.2M-$5.8M in annualized excess fraud losses**.

Beyond direct financial losses, the elevated fraud rate creates:
- Increased chargeback fees and processor penalties
- Customer trust erosion and account closures
- Disproportionate manual review workload for the fraud team
- Regulatory scrutiny as the company scales

The rule-based system cannot be incrementally improved to close this gap. Rules are inherently reactive (they detect known patterns) and brittle (they generate false positives as transaction patterns shift). A machine learning approach is required to detect novel fraud patterns, adapt to evolving tactics, and operate at the precision levels needed to reach industry-standard performance.

## 2. Proposed Solution

### 2.1 Solution Architecture

Deploy a real-time ML fraud scoring system that evaluates every transaction at processing time, assigns a risk score (0-100), and routes transactions through appropriate handling paths based on score thresholds.

```
Transaction Ingress
        |
        v
+-------------------+
| Feature Pipeline  |  <-- Real-time feature computation
| (Streaming)       |      - Transaction attributes
+-------------------+      - User behavioral features
        |                  - Merchant risk signals
        v                  - Velocity/pattern features
+-------------------+
| ML Model Service  |  <-- Inference endpoint
| (Real-time)       |      - Score: 0-100
+-------------------+      - Latency target: <50ms p99
        |
        v
+-------------------+
| Decision Engine   |  <-- Threshold-based routing
+-------------------+
   |        |        |
   v        v        v
 ALLOW    REVIEW    BLOCK
(0-30)   (31-70)   (71-100)
```

### 2.2 Model Approach

**Primary Model:** Gradient-boosted decision tree ensemble (XGBoost or LightGBM)
- Well-suited for tabular transaction data
- Fast inference (<5ms per prediction)
- Interpretable feature importance for compliance
- Strong baseline performance on fraud detection benchmarks

**Feature Categories:**

| Category | Examples | Source |
|----------|---------|--------|
| Transaction attributes | Amount, currency, merchant category, channel, time of day | Transaction record |
| User behavioral features | Average transaction amount (7d/30d/90d), transaction frequency, typical merchants | BigQuery (computed) |
| Velocity features | Transaction count in last 1h/6h/24h, amount in last 1h/6h/24h, unique merchants in 24h | Streaming computation |
| Merchant risk signals | Merchant fraud rate history, merchant age, merchant category risk score | BigQuery (computed) |
| Device/session features | Device fingerprint, IP geolocation, session duration, login method | Application logs |
| Network features | Shared device/IP across accounts, connection to known fraud accounts | Graph computation (Phase 1b) |

**Training Data:** 3 years of transaction data in BigQuery with fraud labels (chargebacks, manual flags, rule-based catches). Estimated training set: ~55M transactions with ~1.15M positive (fraud) labels.

**Evaluation Metrics:**

| Metric | Target | Rationale |
|--------|--------|-----------|
| Precision at 90% recall | >80% | Catch 90% of fraud while keeping false positives manageable |
| AUC-ROC | >0.95 | Strong discrimination between fraud and legitimate transactions |
| False positive rate | <1.0% | Minimize customer friction from blocked legitimate transactions |
| Inference latency (p99) | <50ms | No perceptible impact on transaction processing time |

### 2.3 MLOps Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Feature Store | Feast on BigQuery | Consistent feature computation for training and serving |
| Model Training | Vertex AI / SageMaker | Managed training pipelines with experiment tracking |
| Model Registry | MLflow | Version control, stage management, lineage tracking |
| Model Serving | Vertex AI Endpoints / SageMaker Endpoints | Real-time inference with auto-scaling |
| Monitoring | Evidently AI + custom dashboards | Data drift, prediction drift, model performance |
| Orchestration | Apache Airflow / Vertex AI Pipelines | Automated retraining and deployment pipelines |

### 2.4 Deployment Strategy: Shadow Mode First

The system will be deployed in three stages to minimize risk:

**Stage 1 -- Shadow Mode (Weeks 8-12):**
- Model scores every transaction but does not affect processing
- Scores are logged alongside actual fraud outcomes
- Fraud analysts review model predictions vs. actual outcomes
- Threshold calibration based on real production data
- Goal: Validate model performance on live traffic without any customer impact

**Stage 2 -- Assisted Mode (Weeks 12-16):**
- High-confidence fraud predictions (score >85) are flagged for expedited human review
- Medium-risk transactions (score 50-85) are added to review queue with model explanation
- Low-risk transactions pass through unchanged
- Goal: Build analyst confidence in model predictions; measure human+model performance

**Stage 3 -- Autonomous Mode (Weeks 16-24):**
- Model autonomously blocks highest-risk transactions (score >90, tuned based on Stage 2 data)
- Medium-risk transactions routed to human review
- Low-risk transactions approved automatically
- Human override always available
- Goal: Full production deployment with measurable fraud rate reduction

## 3. Implementation Plan

### 3.1 Timeline

| Phase | Weeks | Activities | Deliverables |
|-------|-------|-----------|-------------|
| **Discovery & Data Audit** | 1-2 | Audit BigQuery transaction data quality and labeling; identify feature engineering requirements; assess data pipeline latency; document current rule-based system logic | Data quality report; feature engineering plan; current system documentation |
| **Infrastructure Setup** | 2-4 | Deploy feature store, model training pipeline, experiment tracking; set up CI/CD for ML; establish monitoring framework | MLOps infrastructure operational; training pipeline tested with sample data |
| **Feature Engineering** | 3-6 | Build batch feature pipelines (historical aggregates); build streaming feature pipelines (real-time velocity); validate feature distributions and quality | Feature store populated; feature documentation; data validation tests |
| **Model Development** | 5-8 | Train baseline model; iterate on features and hyperparameters; evaluate on held-out test set; bias and fairness testing; explainability analysis | Trained model meeting target metrics; evaluation report; bias assessment |
| **Shadow Deployment** | 8-12 | Deploy model to production in shadow mode; log predictions; compare with actual outcomes; calibrate thresholds | Shadow mode performance report; calibrated thresholds; monitoring dashboards |
| **Assisted Deployment** | 12-16 | Enable analyst-assisted mode; measure combined human+model performance; iterate on thresholds and model | Assisted mode performance metrics; analyst feedback; model v2 if needed |
| **Full Deployment** | 16-20 | Enable autonomous blocking for high-confidence predictions; monitor false positive rate; customer impact assessment | Production system operational; fraud rate reduction metrics |
| **Optimization & Handoff** | 20-24 | Performance optimization; documentation; team training; handoff to internal team; establish retraining cadence | Operations runbook; trained team; retraining pipeline automated |

### 3.2 Team Requirements

| Role | Count | Source | Responsibilities |
|------|-------|--------|-----------------|
| ML Engineer (Senior) | 1 | **Hire** | Model development, feature engineering, training pipeline |
| ML Engineer | 1 | **Hire** | MLOps infrastructure, model serving, monitoring |
| Data Engineer | 1 | Internal (existing) | Feature pipelines, data quality, BigQuery optimization |
| Backend Engineer | 1 | Internal (existing) | Integration with transaction processing system |
| Fraud Analyst | 1 | Internal (existing) | Domain expertise, labeling review, threshold calibration |
| Engineering Manager | 0.5 | Internal (existing) | Project oversight, cross-team coordination |
| AI Consultant | 1 | External (this engagement) | Architecture guidance, implementation support, governance |

**Note on hiring:** ML engineer hiring should begin immediately. The 2-3 month hiring lead time for qualified ML engineers is the single biggest schedule risk. If hiring takes longer than expected, the external consulting engagement can be expanded to bridge the gap, though this is more expensive and less sustainable.

### 3.3 Stakeholder RACI

| Activity | CEO | VP Engineering | ML Lead | Fraud Team | Compliance | External Consultant |
|----------|-----|---------------|---------|-----------|------------|---------------------|
| Strategy & prioritization | A | R | C | C | C | C |
| Architecture decisions | I | A | R | C | C | R |
| Model development | I | I | R/A | C | I | C |
| Threshold calibration | I | I | C | R/A | C | C |
| Compliance review | I | C | C | C | R/A | C |
| Go/no-go decisions | A | R | C | C | C | C |
| Production monitoring | I | A | R | R | I | C |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*

## 4. Investment & ROI

### 4.1 Cost Breakdown

| Category | One-Time | Annual Recurring | Notes |
|----------|---------|-----------------|-------|
| ML Engineer Hires (2 FTE) | $40K (recruiting) | $400K-$500K | Salary + benefits, major metro market |
| Cloud Infrastructure (MLOps) | $20K (setup) | $80K-$120K | Vertex AI/SageMaker, compute, storage |
| External Consulting | $150K-$250K | -- | Architecture, implementation support, governance framework |
| Upskilling (existing engineers) | $15K | $10K/year | Training courses, conference attendance |
| Tooling & Licensing | $10K | $20K-$30K | MLflow, monitoring tools, experiment tracking |
| **Total** | **$235K-$335K** | **$510K-$660K** | |
| **Year 1 Total** | | **$745K-$995K** | |

### 4.2 Expected Returns

**Fraud Rate Reduction Scenarios:**

| Scenario | Fraud Rate Achieved | Daily Fraudulent Txns Prevented | Annual Savings (at $100 avg) | ROI |
|----------|--------------------|---------------------------------|------------------------------|-----|
| Conservative | 1.2% (from 2.1%) | 450 | $1.64M | 1.6-2.2x |
| Expected | 0.8% (from 2.1%) | 650 | $2.37M | 2.4-3.2x |
| Optimistic | 0.5% (from 2.1%) | 800 | $2.92M | 2.9-3.9x |

**Additional quantifiable benefits:**
- Reduced chargeback processing fees: $100K-$200K/year
- Reduced manual review workload: Frees fraud analysts for strategic work
- Lower processor penalty risk: Avoidance of elevated interchange rates

**Non-quantifiable benefits:**
- Improved customer trust and retention
- Foundation infrastructure (MLOps, governance) supports all future AI initiatives
- Internal ML capability development (3 existing + 2 new ML engineers)

### 4.3 Break-Even Analysis

At the conservative estimate ($1.64M savings against ~$870K Year 1 cost), the initiative breaks even within **7 months** of full production deployment, or approximately **13 months** from project kickoff.

## 5. Risk Management

### 5.1 Technical Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| **Data quality issues in historical labels** | Medium | High | Week 1-2 data audit; manual labeling review for ambiguous cases; conservative use of uncertain labels | ML Lead |
| **Model underperforms in production vs. offline evaluation** | Medium | Medium | Shadow mode validates production performance before any automated decisions; A/B testing framework | ML Lead |
| **Inference latency exceeds 50ms target** | Low | Medium | Model optimization (quantization, pruning); infrastructure right-sizing; feature computation optimization | ML Engineer |
| **Feature pipeline reliability issues** | Medium | High | Graceful degradation (fall back to rule-based system if features unavailable); feature availability monitoring | Data Engineer |
| **Model drift degrades performance over time** | High | Medium | Automated drift detection; monthly retraining pipeline; performance alerting | ML Engineer |

### 5.2 Organizational Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| **ML hiring takes >3 months** | Medium | High | Begin hiring immediately; use consulting engagement to bridge; consider contract-to-hire | VP Engineering |
| **Fraud team resistance to automated decisions** | Low | Medium | Involve fraud analysts from Day 1; shadow mode builds trust; human override always available | Engineering Manager |
| **Scope creep (adding features beyond fraud detection)** | Medium | Medium | Strict scope governance; defer enhancements to Phase 1b; change request process | VP Engineering |
| **Key person dependency on 2 current fraud system engineers** | Medium | High | Knowledge transfer sessions in Weeks 1-2; document current system; cross-train team members | Engineering Manager |

### 5.3 Compliance & Regulatory Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| **Regulatory challenge to automated fraud decisions** | Low | High | Explainability layer (SHAP values for every decision); complete audit trail; human override; decision appeal process | Compliance |
| **Bias in fraud detection (demographic disparities)** | Medium | High | Bias testing across protected classes during model development; ongoing fairness monitoring; regular bias audits | ML Lead + Compliance |
| **SOC2 audit questions about AI systems** | Medium | Medium | AI governance framework documents model risk management; extend SOC2 controls to ML systems; maintain model documentation | Compliance |
| **PCI-DSS implications of ML processing** | Low | Medium | ML system inherits existing PCI-DSS controls; no additional cardholder data exposure; security review of ML infrastructure | Compliance + Security |

## 6. Governance & Compliance Framework

### 6.1 AI Governance Requirements (to be established in parallel)

This initiative requires the following governance elements, which should be drafted in Months 1-2 alongside the technical implementation:

**Model Risk Management Policy:**
- Model approval process (development, validation, deployment, monitoring, retirement)
- Model risk tiering (fraud detection = Tier 1 / High Risk)
- Independent model validation requirements
- Model inventory and documentation standards

**Responsible AI Standards:**
- Fairness and bias testing requirements and thresholds
- Explainability requirements for automated decisions
- Human oversight and override mechanisms
- Customer notification and appeal processes for automated fraud decisions

**Data Governance for ML:**
- Training data lineage and quality standards
- Feature store access controls and audit logging
- Data retention policies for model training data
- Privacy impact assessment for behavioral features

**Operational Standards:**
- Model monitoring and alerting requirements
- Drift detection and retraining triggers
- Incident response procedures for model failures
- Performance reporting cadence and stakeholders

### 6.2 Extending SOC2 for AI

PayFlow's existing SOC2 compliance should be extended to cover the ML system:

| SOC2 Control Area | AI Extension |
|-------------------|-------------|
| Access Controls | Model registry access controls; feature store permissions; inference endpoint authentication |
| Change Management | Model versioning; A/B deployment procedures; rollback capability |
| Monitoring | Model performance monitoring; drift detection; prediction logging |
| Incident Response | Model failure procedures; fallback to rule-based system; false positive escalation |
| Data Protection | Training data handling; feature store encryption; prediction log retention |

## 7. Success Criteria

### 7.1 Phase Gates

| Gate | Timing | Criteria | Decision |
|------|--------|----------|----------|
| **G1: Data Readiness** | Week 2 | Data audit complete; training data quality >90%; feature engineering plan approved | Proceed / Remediate data |
| **G2: Model Performance** | Week 8 | Offline metrics meet targets (AUC >0.95, precision >80% at 90% recall); bias assessment passed | Proceed to shadow / Iterate model |
| **G3: Shadow Validation** | Week 12 | Shadow mode performance within 5% of offline metrics; latency <50ms p99; no production incidents | Proceed to assisted / Extend shadow |
| **G4: Assisted Performance** | Week 16 | Combined human+model performance exceeds rule-based system by >50%; false positive rate <1% | Proceed to autonomous / Adjust thresholds |
| **G5: Full Production** | Week 20 | Fraud rate <1.0%; false positive rate <0.5%; monitoring and alerting operational; operations runbook complete | Declare success / Optimize |

### 7.2 KPIs (Post-Deployment)

| KPI | Baseline (Current) | Target (Month 6) | Target (Month 12) |
|-----|-------------------|-------------------|-------------------|
| Fraud rate | 2.1% | <1.0% | <0.7% |
| False positive rate | Unknown (rule-based) | <1.0% | <0.5% |
| Fraud detection latency | Rule evaluation time | <50ms p99 | <30ms p99 |
| Manual review volume | All flagged transactions | 50% reduction | 70% reduction |
| Model inference availability | N/A | 99.9% | 99.95% |
| Time to detect new fraud pattern | Days-weeks (manual rule creation) | Hours (model retraining) | Hours |

## 8. Decision Points for Leadership

### 8.1 Immediate Decisions Required

1. **Approve initiative and budget** -- Authorize $745K-$995K Year 1 investment
2. **Begin ML engineering hiring** -- Authorize 2 ML engineer positions immediately (hiring lead time is the critical path)
3. **Assign internal team members** -- Allocate 1 data engineer, 1 backend engineer, 1 fraud analyst, 0.5 engineering manager
4. **Approve external consulting engagement** -- Scope and authorize consulting support for architecture, implementation, and governance

### 8.2 Decisions at Phase Gates

- **Week 2 (G1):** Confirm data quality supports the initiative, or approve remediation plan
- **Week 8 (G2):** Review model performance and bias assessment; approve shadow deployment
- **Week 12 (G3):** Review shadow mode results; approve move to assisted mode
- **Week 16 (G4):** Review assisted mode performance; approve autonomous deployment
- **Week 20 (G5):** Confirm production readiness; approve team handoff

### 8.3 Addressing Stakeholder Concerns

**To the CEO ("AI everywhere in 6 months"):**
This initiative puts a high-impact AI system into production within 6 months, proving the technology works at PayFlow's scale. More importantly, it builds the infrastructure (MLOps, governance, team) that makes "AI everywhere" achievable. The fraud detection system's infrastructure directly supports Opportunities 3-6 in the matrix, meaning subsequent AI deployments will be faster and cheaper.

**To the VP of Engineering ("worried about maintaining new systems"):**
The system is designed with maintainability as a first-class requirement:
- Automated retraining pipeline reduces manual ML operations to threshold reviews and incident response
- Monitoring and alerting provides early warning of any degradation
- Fallback to the existing rule-based system is always available (graceful degradation, not hard cutover)
- Operations runbook and team training ensure the internal team can own the system independently
- The 2 new ML engineering hires are dedicated to this and future ML systems -- this is not dumped on the existing team

---

## Appendix A: Competitive Benchmarks

| Company (Public Data) | Fraud Detection Approach | Reported Fraud Rate | Notes |
|----------------------|-------------------------|-------------------|-------|
| Stripe | ML-based (Radar) | ~0.1% | Massive training data advantage; dedicated ML team |
| Square | ML + rules hybrid | ~0.3% | Significant investment in ML infrastructure |
| Industry Average | Varies | 0.5% | Per Nilson Report and industry benchmarks |
| PayFlow (current) | Rule-based | 2.1% | Opportunity for 4x improvement |

## Appendix B: Technology Options Considered

| Option | Pros | Cons | Recommendation |
|--------|------|------|---------------|
| **XGBoost/LightGBM (recommended)** | Fast inference; interpretable; strong tabular performance; mature ecosystem | Requires feature engineering; less automatic than deep learning | **Selected** -- Best fit for structured transaction data with explainability requirements |
| Deep learning (neural network) | Automatic feature learning; handles complex patterns | Slower inference; harder to explain; requires more data prep; overkill for tabular data | Not recommended for Phase 1; consider for Phase 1b graph-based features |
| Vendor solution (Featurespace, Feedzai) | Fast deployment; pre-built models; managed service | Expensive ($500K-$1M+/year); less customization; vendor lock-in; no internal capability building | Not recommended -- Cost exceeds build option and doesn't develop internal capability |
| Enhanced rule-based system | Low risk; familiar to team | Fundamental limitation: cannot detect novel patterns; diminishing returns on rule complexity | Not recommended -- Addresses symptoms, not root cause |

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| AUC-ROC | Area Under the Receiver Operating Characteristic Curve -- measures model's ability to distinguish between fraud and legitimate transactions |
| Feature Store | Centralized repository for computing, storing, and serving ML features consistently across training and production |
| Model Drift | Degradation of model performance over time as real-world data patterns shift away from training data |
| Shadow Mode | Deployment pattern where the model scores transactions but does not affect processing, allowing validation without risk |
| SHAP Values | SHapley Additive exPlanations -- method for explaining individual model predictions |
| MLOps | Machine Learning Operations -- practices for deploying and maintaining ML models in production |
| p99 Latency | 99th percentile latency -- 99% of requests complete faster than this threshold |

---

*This document is part of a three-deliverable set. See also: Executive Summary and Opportunity Matrix.*

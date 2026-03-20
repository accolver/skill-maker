# Proposal: ML-Powered Fraud Detection System

**PayFlow Series B -- Priority Initiative**
**Prepared for:** PayFlow VP of Engineering, CEO, Head of Fraud Operations
**Date:** March 19, 2026
**Classification:** Confidential

---

## 1. Problem Statement

PayFlow processes 50,000 transactions per day with a fraud rate of 2.1%. The industry average is 0.5%. This 4.2x excess fraud rate represents a material financial and reputational risk.

**Quantified Impact of Current State:**

| Metric | Value |
|--------|-------|
| Daily transactions | 50,000 |
| Current fraud rate | 2.1% (1,050 fraudulent transactions/day) |
| Industry average fraud rate | 0.5% (250 fraudulent transactions/day at PayFlow's volume) |
| Excess fraudulent transactions | ~800/day |
| Estimated annual excess fraud loss (at $50 avg) | $14.6M |
| Estimated annual excess fraud loss (at $200 avg) | $58.4M |
| Current detection system | Rule-based, maintained by 2 engineers |
| Rules maintenance burden | Reactive; new rules added after fraud is discovered |
| False positive rate (estimated) | 5-8% (industry rule-based systems) |

**Root Causes of High Fraud Rate:**

1. **Static rules cannot adapt.** Fraud patterns evolve continuously. Rules encode yesterday's attacks. New attack vectors pass through until manually identified and codified.
2. **Limited coverage.** Two engineers cannot maintain rules for all fraud typologies. They prioritize high-frequency patterns and miss long-tail fraud.
3. **No behavioral modeling.** Rules evaluate individual transactions in isolation. They cannot detect account-level behavioral anomalies or network-level fraud rings.
4. **High false positives create noise.** When false positive rates are high, the team becomes desensitized to alerts, and legitimate fraud signals are missed.

---

## 2. Proposed Solution

### Architecture Overview

Replace the rule-based fraud detection system with a **hybrid ML system** that combines supervised classification with unsupervised anomaly detection, while retaining the ability to inject business rules as hard constraints.

```
Transaction Flow:

  Transaction --> Feature       --> ML Ensemble --> Decision    --> Action
  Ingestion      Engineering       (scoring)       Engine         (approve/
                                                                   review/
                 - Real-time       - XGBoost        - Score        decline)
                   features          (supervised)    threshold
                 - Historical      - Isolation       mapping
                   aggregates        Forest         - Business
                 - Behavioral        (unsupervised)  rule
                   patterns        - Neural net       overrides
                 - Network           (deep           - Confidence
                   features          learning)        routing

                                    |                     |
                                    v                     v
                              Model Monitor         Human Review
                              - Drift detection     - Edge cases
                              - Performance         - High-value
                                tracking              transactions
                              - Retraining          - Appeals
                                triggers
```

### Model Architecture

**Layer 1: Gradient Boosted Trees (XGBoost)**
- Primary classification model trained on 3 years of labeled transaction data
- Handles structured features: transaction amount, merchant category, time of day, device fingerprint, geolocation, velocity metrics
- Provides calibrated probability scores with feature importance explanations
- Target: 90%+ recall on known fraud patterns with <2% false positive rate

**Layer 2: Isolation Forest (Anomaly Detection)**
- Unsupervised model that detects transactions deviating from normal behavioral patterns
- Catches novel fraud patterns that supervised models have never seen
- Operates on behavioral features: spending pattern deviations, unusual merchant sequences, geographic impossibilities
- Target: Detect 30-50% of novel fraud patterns within first 30 days

**Layer 3: Neural Network (Deep Learning)**
- Sequence model (LSTM or Transformer) that processes transaction sequences per account
- Captures temporal patterns and account-level behavioral shifts
- Higher computational cost; runs asynchronously for post-transaction scoring
- Target: Improve overall ensemble precision by 10-15% over gradient boosted trees alone

**Ensemble Strategy:**
- Weighted voting across all three models
- Calibrated probability output (0.0 to 1.0 fraud likelihood)
- Decision thresholds set per transaction tier (amount, customer risk profile)
- Human review queue for medium-confidence range (0.4-0.7)

### Feature Engineering

| Feature Category | Examples | Source |
|-----------------|----------|--------|
| Transaction | Amount, currency, merchant category, payment method | Real-time event |
| Velocity | Transactions in last 1h/24h/7d, amount in last 24h | BigQuery aggregates |
| Behavioral | Deviation from typical spend pattern, new merchant flag, unusual time | BigQuery + real-time |
| Device | Device fingerprint, IP geolocation, browser/app version | Real-time event |
| Network | Shared device across accounts, merchant risk score, recipient history | BigQuery graph features |
| Historical | Account age, dispute history, previous fraud flags, lifetime value | BigQuery |

**Feature Store Architecture:**
- **Online store:** Redis-based, sub-10ms feature serving for real-time scoring
- **Offline store:** BigQuery-based, batch feature computation for model training
- **Feature pipeline:** Apache Beam (Dataflow) for streaming feature computation

---

## 3. Implementation Plan

### Phase 1A: Foundation (Weeks 1-4)

| Week | Deliverables |
|------|-------------|
| 1 | Data quality audit: validate BigQuery transaction data completeness, label accuracy, and coverage. Identify data gaps. Establish ground truth definition for "fraud" (chargebacks, manual flags, rule-based catches). |
| 2 | Feature engineering specification: define all features, data sources, computation logic, and latency requirements. Design feature store schema. |
| 3 | ML infrastructure setup: training pipeline (Vertex AI or SageMaker), experiment tracking (MLflow), feature store (Feast + Redis + BigQuery), model registry. |
| 4 | Baseline model: train initial XGBoost model on historical data. Establish baseline metrics. Compare against current rule-based system on historical data. |

**Exit Criteria:** Baseline model achieves >85% recall and <5% false positive rate on holdout test set. Feature store serves features in <10ms.

### Phase 1B: Model Development (Weeks 5-10)

| Week | Deliverables |
|------|-------------|
| 5-6 | Feature engineering iteration: build and validate all feature categories. Conduct feature importance analysis. Remove low-signal features. Add domain-expert features from fraud team. |
| 7-8 | Ensemble development: train Isolation Forest and neural network models. Build ensemble scoring logic. Calibrate probability outputs. Optimize decision thresholds per transaction tier. |
| 9 | Bias and fairness audit: test model performance across customer demographics, geographies, and transaction types. Ensure no discriminatory patterns. Document findings for governance review. |
| 10 | Model validation: comprehensive testing on holdout data, adversarial testing, stress testing with synthetic fraud patterns. Performance comparison against rule-based system. |

**Exit Criteria:** Ensemble achieves >92% recall, <2% false positive rate, and passes fairness audit. Documented model card with performance metrics, limitations, and intended use.

### Phase 1C: Production Deployment (Weeks 11-16)

| Week | Deliverables |
|------|-------------|
| 11-12 | Shadow mode deployment: ML system scores all transactions in parallel with rule-based system. No impact on actual decisions. Collect performance data comparing both systems. |
| 13 | A/B test design and launch: route 10% of transactions through ML decisioning. Monitor fraud rate, false positive rate, customer impact, and system latency. |
| 14 | Gradual rollout: increase ML traffic to 25%, then 50%, based on A/B test results. Human review queue operational for medium-confidence scores. |
| 15 | Full rollout: ML system handles 100% of transaction scoring. Rule-based system retained as fallback. Alert and monitoring dashboards operational. |
| 16 | Hardening: performance optimization, documentation, runbook creation, on-call rotation setup, retraining pipeline automation. |

**Exit Criteria:** Fraud rate below 1.2% (from 2.1%). False positive rate below 2% (from estimated 5-8%). P99 scoring latency below 50ms. Automated retraining pipeline operational. Monitoring dashboards live.

---

## 4. Team Structure

### Required Team

| Role | Count | Responsibility | Source |
|------|-------|---------------|--------|
| ML Engineer (Senior) | 1 | Model architecture, training, optimization | New hire |
| ML Engineer | 1 | Feature engineering, model development | New hire |
| MLOps Engineer | 1 | Infrastructure, deployment, monitoring, retraining pipelines | New hire |
| Fraud Domain Expert | 1 | Feature design, label validation, business rules, edge case review | Existing (from 2-person fraud rule team) |
| Backend Engineer | 1 | API integration, feature store, real-time pipeline | Existing (internal allocation) |
| Data Engineer | 0.5 | BigQuery pipeline optimization, data quality | Existing (part-time allocation) |
| Project Lead | 1 | Coordination, stakeholder communication, risk management | Engagement consultant or internal |

### Existing Team Transition Plan

The 2 engineers currently maintaining the rule-based system are critical assets. They have deep domain knowledge of PayFlow's fraud patterns:

- **Engineer A** transitions to Fraud Domain Expert role: validates training labels, designs domain-informed features, reviews model decisions, manages the human review queue
- **Engineer B** transitions to rule maintenance + ML integration: maintains the rule-based fallback system, builds business rule overrides for the ML system, participates in model validation

Neither engineer is displaced. Their domain expertise becomes more valuable in the ML context than in the rule-based context.

---

## 5. Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Feature Store (offline) | BigQuery | Already in use; no migration needed |
| Feature Store (online) | Redis (Cloud Memorystore) | Sub-ms latency for real-time feature serving |
| Feature Pipeline | Apache Beam on Dataflow | Unified batch + streaming feature computation |
| Model Training | Vertex AI | GCP-native; integrates with BigQuery |
| Experiment Tracking | MLflow | Open-source, vendor-neutral, team familiarity |
| Model Serving | Vertex AI Endpoints | Auto-scaling, A/B testing support, GCP-native |
| Monitoring | Evidently AI + custom dashboards | Model drift, performance degradation, data quality |
| Orchestration | Cloud Composer (Airflow) | Retraining pipelines, feature pipeline scheduling |
| Model Registry | Vertex AI Model Registry | Versioning, lineage, deployment management |

**GCP-native stack chosen because:** PayFlow already uses BigQuery. Staying within GCP minimizes data movement, simplifies networking, and leverages existing IAM and security configurations.

---

## 6. Success Metrics

### Primary KPIs

| Metric | Current | 3-Month Target | 6-Month Target |
|--------|---------|----------------|----------------|
| Fraud rate | 2.1% | 1.5% | <1.0% |
| False positive rate | ~5-8% (est.) | 3% | <2% |
| Fraud detection recall | ~60% (est.) | 85% | >92% |
| Scoring latency (P99) | N/A (rule-based) | <100ms | <50ms |
| Novel fraud detection | 0% (rules miss new patterns) | 20% | 40% |

### Secondary KPIs

| Metric | Target |
|--------|--------|
| Model retraining frequency | Automated weekly; triggered on drift detection |
| Human review queue volume | <5% of transactions require human review |
| Time to detect new fraud pattern | <48 hours (vs. weeks for rule updates) |
| System availability | 99.95% uptime |
| Customer friction score | 30% reduction in legitimate transaction blocks |

### Financial KPIs

| Metric | 6-Month Target | 12-Month Target |
|--------|----------------|-----------------|
| Fraud loss reduction | $4M-$16M annualized | $8M-$32M annualized |
| Operational cost change | +$300K (team + infra) | +$400K (steady state) |
| Net annual impact | $3.6M-$15.6M | $7.6M-$31.6M |
| ROI | 10x-45x | 15x-55x |

---

## 7. Risk Analysis and Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data quality issues in BigQuery | Medium | High | Week 1 data audit; data quality pipeline with automated validation |
| Model performance below targets | Low | High | Ensemble approach provides redundancy; iterative improvement with weekly retraining |
| Latency exceeds requirements | Medium | Medium | Feature store pre-computation; model optimization; fallback to lighter model |
| Adversarial attacks on model | Low | High | Regular adversarial testing; rule-based hard constraints retained; human review for edge cases |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Hiring delays (ML engineers) | Medium | High | Begin hiring immediately; contract ML consultants as bridge; upskill existing 3 ML-experienced engineers |
| Team capacity constraints | Medium | Medium | Phased approach; clear scope boundaries; dedicated team allocation |
| Model drift in production | High | Medium | Automated drift detection; weekly retraining; performance alerting |
| Over-reliance on ML (rule system atrophied) | Low | High | Retain rule-based system as fallback; maintain rule update capability |

### Regulatory Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Regulatory scrutiny of automated decisioning | Medium | High | Phase 0 governance framework; explainable models; human review layer; audit trail |
| Bias in fraud scoring | Low | High | Fairness audit in Week 9; ongoing bias monitoring; demographic performance dashboards |
| SOC2 audit concerns re: ML systems | Medium | Medium | Document ML system in SOC2 controls; model risk management policy; access controls on model and data |

---

## 8. Governance Requirements

This initiative requires the following governance artifacts (produced in Phase 0):

1. **Model Risk Management Policy:** Defines model development standards, validation requirements, deployment approvals, and monitoring obligations.
2. **AI Ethics Guidelines:** Establishes principles for fairness, transparency, and accountability in automated fraud decisioning.
3. **Model Card:** Documents model purpose, training data, performance metrics, known limitations, intended use, and prohibited use.
4. **Incident Response Plan:** Defines procedures for model failures, unexpected behavior, and adversarial attacks.
5. **Audit Trail Requirements:** Specifies logging standards for model inputs, outputs, and decisions to support regulatory audits.
6. **Human Override Protocol:** Defines when and how human operators can override model decisions, and escalation procedures.

---

## 9. Budget Summary

### Year 1 Costs

| Category | Cost |
|----------|------|
| **Personnel** | |
| ML Engineer (Senior) -- new hire | $180K-$220K (salary + benefits) |
| ML Engineer -- new hire | $150K-$180K |
| MLOps Engineer -- new hire | $160K-$200K |
| Internal team allocation (0.5 data eng + 1 backend eng) | $120K-$150K (allocated cost) |
| **Infrastructure** | |
| Vertex AI (training + serving) | $40K-$60K/year |
| Redis (Cloud Memorystore) | $15K-$25K/year |
| Dataflow (feature pipeline) | $20K-$30K/year |
| Monitoring tools (Evidently + dashboards) | $10K-$15K/year |
| **Consulting / External** | |
| Engagement consulting (Phase 0 + oversight) | $80K-$120K |
| **Total Year 1** | **$775K-$1.0M** |

### Ongoing Annual Costs (Year 2+)

| Category | Cost |
|----------|------|
| Personnel (3 new hires, steady state) | $490K-$600K |
| Infrastructure | $85K-$130K |
| **Total Annual (Year 2+)** | **$575K-$730K** |

### Return on Investment

| Scenario | Fraud Reduction | Annual Savings | Year 1 Net | Year 2+ Net |
|----------|----------------|----------------|------------|-------------|
| Conservative (avg tx $50) | 2.1% to 1.0% | $8M | $7.0M-$7.2M | $7.3M-$7.4M |
| Moderate (avg tx $100) | 2.1% to 0.8% | $19M | $18.0M-$18.2M | $18.3M-$18.4M |
| Optimistic (avg tx $200) | 2.1% to 0.6% | $44M | $43.0M-$43.2M | $43.3M-$43.4M |

Even the most conservative scenario produces a 7x-9x ROI in Year 1.

---

## 10. Decision and Next Steps

### Approval Requested

1. **Budget approval** for Phase 0 ($80K-$120K) and Phase 1 ($400K-$600K personnel + infrastructure)
2. **Hiring authorization** for 3 positions: Senior ML Engineer, ML Engineer, MLOps Engineer
3. **Team allocation** of 1 backend engineer (full-time) and 1 data engineer (half-time) for 16 weeks
4. **Executive sponsor** designation (recommended: VP of Engineering)

### Immediate Actions (Upon Approval)

| Action | Owner | Timeline |
|--------|-------|----------|
| Post ML Engineer and MLOps job requisitions | Hiring manager + recruiting | Week 1 |
| Begin BigQuery data quality audit | Data engineering team | Week 1 |
| Kick off AI Governance framework (Phase 0) | Engagement consultant + compliance | Week 1 |
| Set up ML infrastructure (Vertex AI, MLflow) | Existing ML-experienced engineers | Week 2 |
| Transition fraud team engineers to new roles | VP of Engineering | Week 2 |
| Schedule weekly stakeholder check-ins | Project lead | Week 1 |

### Decision Timeline

We recommend an approval decision by **April 2, 2026** to maintain the proposed timeline. Each week of delay extends the timeline for fraud rate reduction, with an estimated cost of **$150K-$600K per week** in continued excess fraud losses.

---

*This proposal accompanies the Executive Summary and Opportunity Matrix deliverables.*

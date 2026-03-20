# Industry Playbooks

High-level AI opportunity patterns by vertical. Use these to inform discovery
hypotheses and validate opportunities against industry precedent.

## Fintech

### Common AI Opportunities

| Opportunity | Category | Typical Impact | Complexity |
| --- | --- | --- | --- |
| Fraud detection and prevention | Traditional ML | High — reduces fraud losses 30-60% | Medium |
| Credit risk scoring and underwriting | Traditional ML | High — faster decisions, better risk stratification | Medium-High |
| Document processing (KYC, onboarding) | GenAI | High — 60-80% reduction in manual review time | Medium |
| Customer service agents | GenAI/Agents | Medium-High — handles 40-70% of Tier 1 inquiries | Medium |
| Regulatory compliance monitoring | GenAI | Medium — reduces manual compliance review burden | Medium |
| Personalized financial advice | GenAI | Medium — improves engagement and cross-sell | High |
| Anti-money laundering (AML) | Traditional ML | High — reduces false positives 50%+ | High |
| Market sentiment analysis | GenAI | Medium — informs trading and risk decisions | Low-Medium |

### Key Regulatory Constraints

- **Fair lending laws**: Models must be explainable for credit decisions. Black
  box models are a regulatory risk. Plan for model interpretability.
- **SOX compliance**: Financial reporting processes involving AI need audit trails.
- **PCI DSS**: Any AI touching payment card data must meet PCI requirements.
- **GDPR/CCPA**: Customer data used for AI training needs consent frameworks.
- **Model risk management (SR 11-7)**: Banks must have model validation
  processes for any AI/ML models used in decision-making.

### Fintech-Specific Red Flags

- No model risk management framework
- Compliance team not involved in AI planning
- Using AI for lending decisions without explainability strategy
- PII in training data without proper anonymization
- No audit trail for AI-assisted decisions

### GenAI-Specific Opportunities in Fintech

- **Document intelligence**: Extract and validate data from financial documents
  (loan applications, tax returns, statements) with structured output
- **Compliance co-pilot**: Agent that monitors regulatory changes and flags
  impact on current policies
- **Customer onboarding agent**: Guided KYC/AML workflow with document
  verification and risk assessment

---

## Healthcare

### Common AI Opportunities

| Opportunity | Category | Typical Impact | Complexity |
| --- | --- | --- | --- |
| Clinical documentation (ambient scribe) | GenAI | High — saves 2-3 hours/day per clinician | Medium |
| Medical coding and billing | GenAI | High — reduces coding errors 30-50% | Medium |
| Patient engagement and communication | GenAI/Agents | Medium — reduces no-shows, improves adherence | Low-Medium |
| Diagnostic imaging assistance | Traditional ML | High — improves detection rates | Very High |
| Operational optimization (scheduling, staffing) | Traditional ML | Medium — reduces wait times, improves utilization | Medium |
| Drug interaction checking | Traditional ML/GenAI | High — improves patient safety | Medium |
| Prior authorization automation | GenAI/Agents | Medium-High — reduces administrative burden 40-60% | Medium |
| Clinical trial matching | GenAI | Medium — accelerates recruitment | Medium-High |

### Key Regulatory Constraints

- **HIPAA**: All AI systems touching PHI must comply. This affects data storage,
  transmission, model training, and vendor selection. BAAs required for all
  third-party AI services.
- **FDA**: AI/ML used in clinical decision support may require FDA clearance
  (especially if it's intended to diagnose, treat, or prevent disease).
- **Clinical validation**: AI recommendations in clinical settings need evidence
  of safety and efficacy. Pilot carefully.
- **Consent**: Patient data use for AI training may require specific consent
  beyond treatment consent.
- **21st Century Cures Act**: Information blocking rules affect how AI systems
  share health data.

### Healthcare-Specific Red Flags

- No HIPAA compliance program or unclear BAA status with cloud providers
- Planning to use patient data for training without consent framework
- No clinical validation plan for diagnostic AI
- Expecting to replace clinical judgment rather than augment it
- No physician champion for clinical AI initiatives

### GenAI-Specific Opportunities in Healthcare

- **Ambient clinical documentation**: Record and summarize patient encounters
  into structured notes, reducing clinician documentation burden
- **Patient communication agent**: Handle appointment scheduling, pre-visit
  intake, post-visit follow-up, and medication reminders
- **Prior auth agent**: Automate prior authorization submissions with clinical
  evidence extraction from medical records

---

## Manufacturing

### Common AI Opportunities

| Opportunity | Category | Typical Impact | Complexity |
| --- | --- | --- | --- |
| Predictive maintenance | Traditional ML | High — reduces unplanned downtime 30-50% | Medium |
| Quality control (visual inspection) | Traditional ML | High — catches defects humans miss, 24/7 | Medium-High |
| Demand forecasting | Traditional ML | Medium-High — reduces inventory costs 15-30% | Medium |
| Supply chain optimization | Traditional ML/GenAI | Medium-High — reduces lead times and costs | High |
| Energy optimization | Traditional ML | Medium — reduces energy costs 10-20% | Medium |
| Safety monitoring | Traditional ML | High — reduces workplace incidents | Medium |
| Process optimization | Traditional ML | Medium — improves yield and throughput | Medium-High |
| Maintenance documentation | GenAI | Medium — knowledge capture and retrieval | Low-Medium |

### Key Constraints

- **OT/IT convergence**: Manufacturing AI often bridges operational technology
  (OT) and information technology (IT). These are different cultures with
  different security requirements.
- **Real-time requirements**: Production line AI often needs sub-second
  inference. Edge deployment may be necessary.
- **Safety-critical systems**: AI controlling or monitoring safety-critical
  processes needs extensive validation and fail-safe design.
- **Legacy equipment**: Older machines may lack sensors or connectivity.
  Retrofitting may be needed before AI can help.
- **Downtime sensitivity**: Any AI deployment that requires production line
  downtime must be carefully scheduled.

### Manufacturing-Specific Red Flags

- No sensor data collection on critical equipment
- OT network completely isolated with no path to data extraction
- Safety team not involved in AI planning for production processes
- No digital twin or simulation capability for testing AI before production
- Expecting AI to work with unreliable or sparse data from legacy equipment

### GenAI-Specific Opportunities in Manufacturing

- **Maintenance knowledge base**: Agent that helps technicians diagnose
  equipment issues using historical maintenance records and equipment manuals
- **Quality report generation**: Automated quality reports from inspection data
  with root cause analysis narratives
- **Supplier communication agent**: Automate routine supplier communications,
  order tracking, and issue escalation

---

## General Framework for Unlisted Industries

When working in a vertical without a specific playbook:

1. **Web search** for "AI in [industry]" to find analyst reports and case studies
2. **Identify the industry's version** of these universal AI opportunities:
   - Document processing and extraction
   - Customer/client communication automation
   - Predictive analytics (demand, risk, maintenance)
   - Quality assurance and anomaly detection
   - Knowledge management and retrieval
   - Process automation and workflow optimization
3. **Research regulatory landscape** — every industry has constraints
4. **Find competitor AI initiatives** — what are industry leaders doing?
5. **Identify the industry's data assets** — what data is uniquely generated in
   this vertical that could fuel AI?

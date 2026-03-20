# Opportunity Matrix: MedTech Solutions

## Scoring Methodology

Each opportunity scored on two axes (1-5):

**Business Impact**: Revenue potential/cost savings, strategic alignment, number
of people/processes affected, customer experience improvement.

**Feasibility**: Data readiness, technical complexity, integration difficulty,
organizational readiness, time to first value.

Every opportunity includes: Build vs Buy vs Already Licensed, GenAI vs
Traditional ML, and Agent Potential assessments.

---

## Impact-Feasibility Quadrant

```
                        HIGH FEASIBILITY                LOW FEASIBILITY
                   ┌─────────────────────────┬─────────────────────────┐
                   │                         │                         │
    HIGH           │     QUICK WINS          │    STRATEGIC BETS       │
    IMPACT         │                         │                         │
                   │  1. Patient Intake       │  4. Ambient Clinical    │
                   │     Digitization + AI    │     Documentation       │
                   │  2. AI-Assisted Medical  │  5. Prior Auth          │
                   │     Coding               │     Automation Agent    │
                   │                         │                         │
                   ├─────────────────────────┼─────────────────────────┤
                   │                         │                         │
    LOW            │     FILL-INS            │    DEPRIORITIZE         │
    IMPACT         │                         │                         │
                   │  3. Patient Comms &      │  7. Diagnostic Imaging  │
                   │     Scheduling Agent     │     AI                  │
                   │  6. Internal Knowledge   │  8. Predictive          │
                   │     Base / AI Assistant  │     Staffing Model      │
                   │                         │                         │
                   └─────────────────────────┴─────────────────────────┘
```

---

## Detailed Opportunity Scoring

### QUICK WINS (High Impact, High Feasibility) — Do These First

---

#### 1. Patient Intake Digitization with AI-Assisted Data Capture

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **4/5** |
| **Feasibility** | **4/5** |
| Quadrant | Quick Win |

**Description**: Replace paper intake forms with digital intake (tablet/mobile)
enhanced by AI for intelligent form completion, insurance verification, and
data validation. Captures structured data that feeds all downstream processes.

**Impact Rationale**:
- Eliminates the paper bottleneck that blocks every other AI initiative
- Reduces intake errors (insurance, demographics, medical history)
- Improves patient experience (pre-visit digital intake)
- Scales across all clinic locations
- Generates structured data for future AI use cases
- Estimated 50-70% reduction in intake processing time

**Feasibility Rationale**:
- Mature SaaS solutions exist (Phreesia, Clearwave, Yosi Health)
- AWS infrastructure can support cloud-based intake tools
- Low integration complexity for standalone MVP
- Can pilot at one clinic before rolling out
- 30-60 day time to first value

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY** — This is a solved problem. Multiple healthcare-specific
  SaaS vendors offer digital intake with AI features. Building custom is
  unjustified. Vendors include Phreesia (market leader), Clearwave, Yosi Health,
  Formstack for Healthcare.
- Cost estimate: $30K-$80K/year depending on patient volume and features.
- Engineering hours if customization needed: 80-160 hrs for EHR integration.

**GenAI vs Traditional ML**:
- **Hybrid** — Core intake digitization is traditional software. AI-assisted
  features (insurance verification, medical history summarization, form
  pre-population from referral documents) can leverage GenAI for document
  understanding and NLP. Traditional rules-based validation for data quality.

**Agent Potential**:
- **Medium** — A patient intake agent could guide patients through pre-visit
  questionnaires conversationally, ask follow-up questions based on responses,
  and flag incomplete or inconsistent information for staff review. Not the
  first implementation, but a natural Phase 2 enhancement.

---

#### 2. AI-Assisted Medical Coding and Billing

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **5/5** |
| **Feasibility** | **3.5/5** |
| Quadrant | Quick Win (borderline Strategic Bet) |

**Description**: AI-powered coding assistance that suggests ICD-10, CPT, and
HCPCS codes from clinical documentation. Reduces coding errors, accelerates
billing cycles, and decreases claim denial rates.

**Impact Rationale**:
- Direct, measurable revenue impact — coding errors cause 5-25% claim denial
  rates in specialty clinics
- Specialty coding is complex and error-prone (higher impact than primary care)
- Reduces days in A/R (accounts receivable) by accelerating clean claims
- Estimated 30-50% reduction in coding errors per industry benchmarks
- At $80M revenue, even a 2-3% reduction in denials = $1.6M-$2.4M annual impact

**Feasibility Rationale**:
- Depends on data readiness — requires digitized clinical notes (may need to
  solve intake/documentation first)
- Several proven vendor solutions exist for healthcare AI coding
- Integration with existing billing systems needed
- Organizational readiness is moderate — coders will need training and trust-building
- 60-90 day time to first value after data prerequisites are met

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY** — Proven SaaS vendors: Nym Health, 3M/Solventum
  CodeAssist, Fathom (acquired by Talkdesk), Medicomp Systems. Healthcare
  coding AI requires extensive medical ontology training that custom-building
  is not practical.
- Cost estimate: $50K-$200K/year depending on volume and vendor.
- Engineering hours: 120-240 hrs for integration and workflow customization.
- Estimation multiplier: 1.3-1.5x for HIPAA compliance requirements.

**GenAI vs Traditional ML**:
- **GenAI primary** — Modern coding AI uses LLMs trained on medical literature
  and coding guidelines to understand clinical narratives and suggest codes.
  Traditional ML for pattern matching on historical claim data. GenAI excels
  at understanding the clinical context that drives code selection.

**Agent Potential**:
- **High** — A coding agent could: (1) read clinical notes, (2) suggest codes
  with confidence scores, (3) flag documentation gaps that would cause denials,
  (4) auto-populate claim forms, (5) learn from coder corrections. This is a
  natural autonomous workflow with human-in-the-loop review.

---

### STRATEGIC BETS (High Impact, Lower Feasibility) — Plan Carefully

---

#### 4. Ambient Clinical Documentation (AI Scribe)

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **5/5** |
| **Feasibility** | **2.5/5** |
| Quadrant | Strategic Bet |

**Description**: AI-powered ambient listening that records patient-clinician
conversations and generates structured clinical notes, reducing documentation
burden by 2-3 hours per clinician per day.

**Impact Rationale**:
- Highest-impact GenAI use case in healthcare today
- Clinician burnout is the #1 workforce challenge in specialty medicine
- Saves 2-3 hours/day per clinician (industry benchmarks)
- Improves note quality and completeness
- Directly improves patient experience (clinician is present, not typing)
- Competitive differentiator for clinician recruitment and retention
- At $80M revenue with specialty clinicians, documentation time = significant
  lost clinical capacity

**Feasibility Rationale**:
- Requires mature EHR integration (current state unclear)
- HIPAA compliance is complex for ambient AI (audio recording, PHI in transit)
- Clinical validation needed for specialty-specific documentation
- Significant change management with clinicians
- Vendor solutions exist but require infrastructure readiness
- 3-6 month time to first value at pilot scale

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY** — Established vendors: Microsoft DAX Copilot
  (Nuance), Abridge, Nabla, DeepScribe, Suki. The ambient scribe market is
  mature with HIPAA-compliant solutions. Custom building would take 12+ months
  and require significant clinical AI expertise.
- Cost estimate: $200-$500/clinician/month. At 50 clinicians: $120K-$300K/year.
- Engineering hours: 200-400 hrs for EHR integration, pilot setup, and workflow
  customization.
- Estimation multipliers: 1.5x for HIPAA compliance + 1.3x for first AI project
  = effectively 1.9x on base hours.

**GenAI vs Traditional ML**:
- **GenAI** — This is fundamentally a generative AI use case. LLMs for speech-
  to-text, clinical note generation, and structured data extraction. No
  traditional ML alternative can generate clinical documentation.

**Agent Potential**:
- **Very High** — An ambient documentation agent operates autonomously during
  patient encounters: listens, extracts clinical entities, generates structured
  notes, populates EHR fields, creates follow-up task lists, and flags orders.
  This is one of the most developed AI agent workflows in healthcare.

---

#### 5. Prior Authorization Automation Agent

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **4/5** |
| **Feasibility** | **2.5/5** |
| Quadrant | Strategic Bet |

**Description**: AI agent that automates prior authorization submissions by
extracting clinical evidence from medical records, matching to payer
requirements, and submitting/tracking authorizations.

**Impact Rationale**:
- Specialty clinics face heavy prior auth burden (50-100+ per week typical)
- Each prior auth takes 15-45 minutes of staff time
- Delays harm patient access and clinic revenue
- Industry estimates: 40-60% reduction in administrative burden
- Improves patient satisfaction by reducing appointment delays

**Feasibility Rationale**:
- Requires access to structured clinical data (EHR integration)
- Payer-specific rules and submission formats vary widely
- Integration with payer portals is technically complex
- Requires clinical data extraction capabilities
- Regulatory sensitivity (clinical evidence must be accurate)
- 4-6 month time to first value

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY** — Emerging vendor solutions: Cohere Health, Infinitus
  Health, Rhyme Health, Olive AI (prior auth module). Market is less mature
  than coding or documentation AI, but viable solutions exist for specialty
  care.
- Cost estimate: $100K-$300K/year depending on authorization volume.
- Engineering hours if custom: 500-1,000 hrs (not recommended).
- Engineering hours for vendor integration: 200-400 hrs.

**GenAI vs Traditional ML**:
- **GenAI + Traditional ML hybrid** — GenAI for clinical evidence extraction
  from unstructured notes and for generating authorization narratives.
  Traditional ML for payer requirement matching and submission routing.
  Rules-based automation for form completion and tracking.

**Agent Potential**:
- **Very High** — This is a natural AI agent workflow: receive auth request,
  extract clinical evidence from patient record, match to payer requirements,
  generate submission, submit to payer portal, track status, escalate denials
  to staff. End-to-end autonomous with human oversight for exceptions.

---

### FILL-INS (Lower Impact, High Feasibility) — If Resources Allow

---

#### 3. Patient Communication and Scheduling Agent

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **3/5** |
| **Feasibility** | **4/5** |
| Quadrant | Fill-in |

**Description**: AI-powered patient communication for appointment scheduling,
reminders, pre-visit instructions, post-visit follow-up, and basic FAQ
responses across SMS, voice, and patient portal.

**Impact Rationale**:
- Reduces no-show rates (industry average 5-15% reduction with AI reminders)
- Frees front desk staff from phone-heavy scheduling work
- Improves patient access and satisfaction
- Lower strategic impact than revenue cycle or clinical documentation

**Feasibility Rationale**:
- Mature SaaS market with healthcare-specific solutions
- Can operate independently of EHR for basic communication
- Low technical complexity for MVP
- Quick deployment (30-60 days)
- Low organizational change management

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY** — Vendors: Hyro, Luma Health, Artera (formerly WELL
  Health), Klara. Mature market. Many EHR vendors also offer built-in patient
  communication modules — check if current EHR has this.
- Cost estimate: $20K-$60K/year.
- Engineering hours: 40-120 hrs for setup and integration.

**GenAI vs Traditional ML**:
- **Hybrid** — Rule-based automation for scheduling logic. GenAI for
  conversational patient interactions, FAQ responses, and natural language
  understanding of patient messages. Traditional ML for no-show prediction.

**Agent Potential**:
- **High** — Scheduling agent handles: appointment requests, insurance
  verification, pre-visit reminders with prep instructions, post-visit
  follow-up scheduling, prescription refill coordination. Natural multi-step
  agent workflow.

---

#### 6. Internal Knowledge Base / AI Assistant

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **2.5/5** |
| **Feasibility** | **3.5/5** |
| Quadrant | Fill-in |

**Description**: RAG-based AI assistant for staff to query internal policies,
clinical protocols, insurance requirements, and operational procedures.

**Impact Rationale**:
- Reduces time staff spend searching for information
- Improves consistency of answers across clinic locations
- Captures and scales institutional knowledge
- Relatively low direct revenue impact

**Feasibility Rationale**:
- Requires digitized documentation (policies, protocols, procedures)
- RAG architecture is well-understood and mature
- AWS infrastructure supports deployment
- Moderate change management (staff adoption)

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUILD or BUY** — Could use an off-the-shelf knowledge
  management AI (Guru, Notion AI, Glean) or build a custom RAG system on
  AWS (Bedrock + OpenSearch). Build makes sense if they want to integrate
  clinical protocols and insurance payer rules into a single searchable
  system.
- Buy cost: $15K-$50K/year for SaaS knowledge platform.
- Build cost: 200-400 hrs for custom RAG system.

**GenAI vs Traditional ML**:
- **GenAI** — RAG (retrieval augmented generation) with LLM is the standard
  approach. Requires document ingestion, vector embeddings, and generative
  response synthesis.

**Agent Potential**:
- **Medium** — Could evolve into an agent that not only answers questions but
  takes actions (e.g., "What's our policy on X?" followed by "Submit form Y
  for me"). Initial deployment is Q&A focused.

---

### DEPRIORITIZE (Low Impact, Low Feasibility) — Not Now

---

#### 7. Diagnostic Imaging AI

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **3/5** |
| **Feasibility** | **1.5/5** |
| Quadrant | Deprioritize |

**Description**: AI-assisted analysis of diagnostic images (radiology, pathology)
for detection and measurement.

**Impact Rationale**:
- Could improve diagnostic accuracy and speed
- Depends heavily on which specialties MedTech Solutions operates
- High regulatory burden (FDA clearance required)

**Feasibility Rationale**:
- Requires FDA clearance — significant regulatory timeline and cost
- Requires PACS integration and DICOM handling
- Clinical validation requirements are extensive
- Organization's maturity level cannot support this complexity
- 12-24 month time to first value minimum

**Build vs Buy vs Already Licensed**:
- **BUY only if applicable** — FDA-cleared solutions exist (Aidoc, Viz.ai,
  Tempus) but only for specific imaging modalities. Very expensive and
  requires radiology workflow integration.
- Not recommended for current maturity level.

**GenAI vs Traditional ML**:
- **Traditional ML / Deep Learning** — Medical imaging AI uses convolutional
  neural networks and specialized architectures, not generative AI.

**Agent Potential**:
- **Low** — Imaging AI is a point solution (inference on images), not an agent
  workflow.

---

#### 8. Predictive Staffing Model

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **2.5/5** |
| **Feasibility** | **2/5** |
| Quadrant | Deprioritize |

**Description**: ML model predicting patient volume and staffing needs by
location, day, and specialty.

**Impact Rationale**:
- Could reduce overstaffing costs and understaffing patient impacts
- Moderate operational value but not transformative
- Depends on having digitized scheduling and staffing data

**Feasibility Rationale**:
- Requires 12+ months of digitized scheduling and volume data
- No current ML capability to build or maintain models
- Benefits are incremental, not transformative
- Better suited for Phase 3 after data foundations exist

**Build vs Buy vs Already Licensed**:
- **BUY (later)** — Vendors like LeanTaaS and Qventus offer healthcare
  operational optimization. Requires data infrastructure first.
- Not recommended until data maturity reaches level 3+.

**GenAI vs Traditional ML**:
- **Traditional ML** — Time-series forecasting and optimization. No GenAI
  needed.

**Agent Potential**:
- **Low** — Prediction model, not an agent workflow. Could feed into a
  scheduling agent in the future.

---

## Priority Ranking Summary

| Rank | Opportunity | Impact | Feasibility | Quadrant | Recommended Phase |
| --- | --- | --- | --- | --- | --- |
| 1 | Patient Intake Digitization + AI | 4 | 4 | Quick Win | Phase 1 (Month 1-3) |
| 2 | AI-Assisted Medical Coding | 5 | 3.5 | Quick Win | Phase 1-2 (Month 2-4) |
| 3 | Patient Communication Agent | 3 | 4 | Fill-in | Phase 1 (Month 1-2) |
| 4 | Ambient Clinical Documentation | 5 | 2.5 | Strategic Bet | Phase 2 (Month 4-9) |
| 5 | Prior Auth Automation Agent | 4 | 2.5 | Strategic Bet | Phase 2-3 (Month 6-12) |
| 6 | Internal Knowledge Base | 2.5 | 3.5 | Fill-in | Phase 2 (Month 4-6) |
| 7 | Diagnostic Imaging AI | 3 | 1.5 | Deprioritize | Not recommended now |
| 8 | Predictive Staffing Model | 2.5 | 2 | Deprioritize | Not recommended now |

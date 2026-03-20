# Opportunity Matrix: MedTech Solutions

## Scoring Methodology

Each opportunity is scored on two axes (1-5 each):

**Business Impact** (1-5): Revenue potential/cost savings, strategic alignment, number of people/processes affected, customer experience improvement.

**Feasibility** (1-5): Data readiness, technical complexity, integration difficulty, organizational readiness, time to first value.

Every opportunity includes: Build vs Buy vs Already Licensed, GenAI vs Traditional ML, and Agent Potential assessments.

---

## Impact-Feasibility Quadrant

### Quick Wins (High Impact, High Feasibility)

---

#### Opportunity 1: Digital Patient Intake with AI Data Extraction

**Business Impact: 5** | **Feasibility: 4** | **Quadrant: Quick Win**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Eliminates manual data entry (estimated 2-4 FTE equivalent across clinics), reduces transcription errors that cause billing issues, improves patient throughput |
| Strategic alignment | Directly addresses CEO's stated goal; foundational for all downstream AI |
| People affected | Every patient, every front desk staff member, every clinician (reads intake data) |
| Customer experience | Patients get modern digital intake; faster check-in; fewer repeat questions |
| Data readiness | Creates new digital data; does not depend on existing data quality |
| Technical complexity | Low-medium; proven solutions exist in market |
| Integration difficulty | Medium; must integrate with EHR (API-dependent) |
| Organizational readiness | High motivation (everyone hates paper); moderate change management needed |
| Time to first value | 30-60 days for pilot at one clinic |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY**
- Off-the-shelf digital intake platforms exist: Phreesia ($2-5/patient visit), Yosi Health, Intake.me, OhMD
- Many include AI features (form auto-population, insurance verification, data extraction)
- EHR vendors often have native digital intake modules (check EHR first)
- Custom build not justified given mature market solutions
- Estimated effort if buying: 80-160 hours for vendor selection, configuration, EHR integration, training
- Estimation multiplier: 1.3x for HIPAA compliance = 104-208 hours

**GenAI vs Traditional ML**:
- **Primarily traditional/rules-based** for form digitization and data mapping
- **GenAI component** for: extracting data from insurance cards (OCR + LLM), interpreting free-text responses, auto-populating from prior visit data
- Hybrid approach -- the buy solutions increasingly embed GenAI features

**Agent Potential: Low-Medium**
- Not a strong agent use case in its core form (intake is largely form-based)
- Agent potential increases if combined with a pre-visit communication workflow: an agent could proactively reach out to patients before appointments, collect intake information conversationally, verify insurance, and push structured data to the EHR
- Phase 2 opportunity to add agent layer on top of digital intake platform

---

#### Opportunity 2: Ambient Clinical Documentation (AI Scribe)

**Business Impact: 5** | **Feasibility: 4** | **Quadrant: Quick Win**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Saves clinicians 2-3 hours/day on documentation; at even 20 clinicians that's 40-60 hours/day returned to patient care or additional appointments |
| Strategic alignment | High-visibility AI win; directly improves clinician experience |
| People affected | Every clinician across all clinics |
| Customer experience | More face time with clinicians; less "doctor staring at computer" |
| Data readiness | Audio from patient encounters; no pre-existing data dependency |
| Technical complexity | Low -- mature SaaS solutions available |
| Integration difficulty | Medium -- needs EHR integration for note insertion |
| Organizational readiness | Clinicians are typically enthusiastic about documentation relief |
| Time to first value | 30-60 days for pilot with 3-5 clinicians |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY**
- Mature market: Nuance DAX (Microsoft, ~$200-300/clinician/month), Abridge (~$150-250/clinician/month), Nabla (~$100-200/clinician/month), DeepScribe
- All major players are HIPAA-compliant with BAAs
- Custom build absolutely not justified -- this would be 1,000-2,500+ hours to replicate
- Estimated effort if buying: 80-120 hours for vendor evaluation, pilot setup, EHR integration, clinician training
- Estimation multiplier: 1.3x for HIPAA = 104-156 hours

**GenAI vs Traditional ML**:
- **GenAI (mandatory)** -- this is fundamentally a generative AI use case. LLMs transcribe, understand clinical context, and generate structured notes. Traditional ML alone cannot do this.

**Agent Potential: Medium**
- Current ambient scribes are largely passive (listen and generate notes)
- Agent potential: post-visit agent that generates notes AND triggers follow-up actions (order follow-up labs, schedule referral, send patient instructions) based on encounter content
- This is a Phase 2/3 enhancement -- start with basic ambient documentation first

---

#### Opportunity 3: Patient Communication Automation

**Business Impact: 4** | **Feasibility: 4** | **Quadrant: Quick Win**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Reduces no-shows (typically 5-15% reduction), reduces staff phone time (estimated 1-2 hours/day per front desk), improves appointment utilization |
| Strategic alignment | Modernizes patient experience; visible to CEO |
| People affected | All patients, all front desk staff, scheduling coordinators |
| Customer experience | Patients get timely reminders, easy rescheduling, pre-visit info |
| Data readiness | Scheduling data exists in EHR/PM system |
| Technical complexity | Low -- proven solutions |
| Integration difficulty | Low-Medium -- most EHR systems have scheduling API or vendor partnerships |
| Organizational readiness | Low friction -- augments rather than replaces existing workflow |
| Time to first value | 30-45 days |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY**
- Solutions: Luma Health ($3-8/provider/month), Relatient, Artera (formerly Well Health), Klara
- Many EHR vendors include basic messaging/reminders (check current EHR capabilities first)
- May already be partially licensed as part of EHR contract -- VERIFY BEFORE RECOMMENDING
- Estimated effort if buying: 40-80 hours for configuration, integration, workflow design
- Estimation multiplier: 1.3x for HIPAA = 52-104 hours

**GenAI vs Traditional ML**:
- **Primarily rules-based / traditional ML** for appointment reminders and scheduling
- **GenAI enhancement**: Conversational AI for patient interactions (rescheduling, answering common questions, pre-visit prep instructions customized by specialty/procedure)
- Start with rules-based; add GenAI in Phase 2

**Agent Potential: High**
- Strong agent use case. A patient communication agent could:
  - Send appointment reminders with intelligent timing
  - Handle rescheduling requests conversationally
  - Send pre-visit preparation instructions customized to the procedure and specialty
  - Collect pre-visit intake information (ties to Opportunity 1)
  - Handle post-visit follow-up (medication reminders, follow-up scheduling)
  - Answer common patient questions (office hours, directions, insurance accepted)
- Agent architecture: orchestrates across scheduling, EHR, and messaging systems
- Phase 2 enhancement after basic communication automation is in place

---

### Strategic Bets (High Impact, Lower Feasibility)

---

#### Opportunity 4: Automated Medical Coding and Billing

**Business Impact: 5** | **Feasibility: 3** | **Quadrant: Strategic Bet**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Reduces coding errors 30-50% (per industry benchmarks); accelerates claim submission; reduces denials; could recover 2-5% of revenue from missed charges |
| Strategic alignment | Directly impacts revenue; high CFO appeal |
| People affected | Billing/coding team, clinicians (documentation quality feedback), finance |
| Customer experience | Indirect -- faster, more accurate billing reduces patient billing disputes |
| Data readiness | Depends on clinical documentation quality; paper-based intake is a blocker for intake-dependent codes |
| Technical complexity | Medium -- mature solutions but require clinical documentation integration |
| Integration difficulty | Medium-High -- needs deep EHR integration and clinical documentation access |
| Organizational readiness | Medium -- coding team needs training; clinicians need documentation quality feedback |
| Time to first value | 3-6 months (after digital intake and documentation improvements) |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY**
- Solutions: Fathom (ambient coding), Codametrix, 3M CodeAssist (now part of Solventum), Nym Health
- Some EHR vendors include coding assistance modules -- CHECK FIRST
- Custom build not justified for a 500-employee company
- Estimated effort if buying: 160-320 hours for vendor selection, integration, validation, training
- Estimation multiplier: 1.3x HIPAA + 1.3x first AI project (if first clinical AI) = approx 1.5x = 240-480 hours

**GenAI vs Traditional ML**:
- **Hybrid**: Traditional ML for code suggestion (pattern matching on structured data), GenAI for understanding clinical narrative and extracting codeable elements from unstructured notes
- Newer solutions (Fathom, Nym) use GenAI heavily; established solutions (3M) use more traditional approaches

**Agent Potential: Medium-High**
- Agent could: review clinical documentation, suggest codes, flag missing documentation, auto-submit claims for straightforward cases, route complex cases to human coders, learn from coder corrections
- True autonomous coding agent is a Phase 3 aspiration; start with AI-assisted coding (human reviews AI suggestions)

---

#### Opportunity 5: Prior Authorization Automation

**Business Impact: 4** | **Feasibility: 3** | **Quadrant: Strategic Bet**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Prior auth is a massive admin burden in specialty clinics; automating 40-60% of PA submissions saves significant staff time and reduces delays in patient care |
| Strategic alignment | Reduces admin burden -- aligns with modernization goal |
| People affected | Auth coordinators, clinicians (delayed care), patients (waiting for approvals) |
| Customer experience | Faster approvals mean faster treatment |
| Data readiness | Requires access to clinical records, payer requirements databases, and submission portals |
| Technical complexity | Medium-High -- must understand payer-specific rules and generate clinical evidence |
| Integration difficulty | High -- requires EHR integration plus payer portal integration (varied across payers) |
| Organizational readiness | Medium -- auth team would welcome automation; payer variability is the constraint |
| Time to first value | 3-6 months |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY**
- Solutions: Cohere Health, Infinitus Health, Olive AI, Rhyme
- EHR vendors increasingly building PA workflows -- CHECK CURRENT EHR
- Custom build not recommended due to payer integration complexity
- Estimated effort if buying: 160-400 hours for vendor selection, integration, payer-specific configuration
- Estimation multiplier: 1.5x (HIPAA + integration complexity) = 240-600 hours

**GenAI vs Traditional ML**:
- **GenAI**: Core use case is extracting relevant clinical evidence from patient records and generating PA submissions that match payer requirements -- this is a generative task
- **Traditional ML**: Rules engine for payer requirement matching, outcome prediction (approval likelihood)
- Hybrid approach is standard in this space

**Agent Potential: High**
- One of the strongest agent use cases in healthcare. A prior auth agent could:
  - Detect when a prior auth is needed (from order entry)
  - Extract relevant clinical evidence from the patient's record
  - Generate a PA submission matching payer-specific requirements
  - Submit electronically to the payer
  - Monitor status and escalate if delayed
  - Handle payer requests for additional information
  - Learn from approval/denial patterns to improve submissions
- Truly autonomous agent workflow with human oversight for exceptions

---

#### Opportunity 6: Scheduling and Capacity Optimization

**Business Impact: 3** | **Feasibility: 3** | **Quadrant: Strategic Bet (borderline Fill-in)**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Improves provider utilization 10-20%; reduces patient wait times; better capacity planning |
| Strategic alignment | Operational efficiency aligns with modernization |
| People affected | Schedulers, providers, patients |
| Customer experience | Shorter wait times, better availability |
| Data readiness | Scheduling data exists but quality unknown; needs historical appointment data |
| Technical complexity | Medium -- predictive modeling for demand and optimization |
| Integration difficulty | Medium -- EHR/PM scheduling integration |
| Organizational readiness | Medium -- requires workflow changes |
| Time to first value | 3-6 months |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY**
- Solutions: Qventus, LeanTaaS (iQueue), some EHR-native scheduling optimization
- Check EHR scheduling module capabilities first
- Estimated effort if buying: 120-240 hours
- Estimation multiplier: 1.3x HIPAA = 156-312 hours

**GenAI vs Traditional ML**:
- **Traditional ML**: Demand forecasting, no-show prediction, optimal scheduling algorithms -- these are classic ML use cases
- **GenAI**: Not the primary approach, but could enhance natural language scheduling interactions
- Recommend traditional ML approach

**Agent Potential: Low-Medium**
- Limited agent potential for core scheduling optimization (it's a prediction/optimization problem)
- Some agent potential in a patient-facing scheduling assistant that handles complex multi-appointment booking across specialties
- Not a primary agent opportunity

---

### Fill-ins (Lower Impact, High Feasibility)

---

#### Opportunity 7: Quality Reporting Automation

**Business Impact: 2** | **Feasibility: 4** | **Quadrant: Fill-in**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Saves quality reporting staff time; reduces reporting errors; avoids MIPS penalties |
| Strategic alignment | Moderate -- operational efficiency |
| People affected | Quality/compliance team, clinicians (measure tracking) |
| Customer experience | Indirect |
| Data readiness | EHR data plus quality measure definitions |
| Technical complexity | Low-Medium |
| Integration difficulty | Medium -- EHR data extraction |
| Organizational readiness | High -- quality team welcomes automation |
| Time to first value | 60-90 days |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY / CHECK ALREADY LICENSED**
- Many EHR systems include quality reporting modules (may be underutilized)
- Specialized solutions: Medisolv, Arcadia, some BI tools with healthcare templates
- Check existing EHR capabilities and licenses FIRST
- Estimated effort if already licensed: 40-80 hours for configuration and optimization
- Estimated effort if buying new: 80-160 hours

**GenAI vs Traditional ML**:
- **Primarily rules-based / traditional analytics**: Quality measures are well-defined with specific criteria; this is a data extraction and aggregation problem
- **GenAI**: Could help with narrative quality improvement reports or gap analysis explanations
- Traditional approach is appropriate

**Agent Potential: Low**
- Not a strong agent use case -- this is batch processing and reporting, not interactive workflow
- Minor agent potential for real-time quality measure monitoring and clinician nudges

---

#### Opportunity 8: Internal Knowledge Base / Clinical Decision Support

**Business Impact: 3** | **Feasibility: 3** | **Quadrant: Fill-in (borderline Strategic Bet)**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Reduces time clinicians spend looking up protocols, formularies, referral procedures; standardizes care across clinics |
| Strategic alignment | Moderate -- supports clinician productivity |
| People affected | All clinicians and clinical support staff |
| Customer experience | Indirect -- more consistent care |
| Data readiness | Requires aggregating internal protocols, procedures, formularies -- may not be digitized |
| Technical complexity | Medium -- RAG-based Q&A system |
| Integration difficulty | Medium -- content ingestion, potentially EHR integration for contextual answers |
| Organizational readiness | Medium -- clinicians must trust and adopt it |
| Time to first value | 3-4 months |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUILD or BUY (evaluate)**
- Buy options: UpToDate (Wolters Kluwer) for general clinical reference, but internal knowledge (clinic-specific protocols, referral procedures) requires custom build or customizable platform
- Build option: RAG pipeline over internal documents using AWS Bedrock -- estimated 200-500 hours
- Estimation multiplier: 1.5x (HIPAA + first AI project) = 300-750 hours if building
- Could start with a simpler approach: digitize protocols into a searchable wiki first

**GenAI vs Traditional ML**:
- **GenAI**: Core use case is RAG -- retrieve internal documents and generate contextual answers. This is fundamentally a GenAI application.
- Traditional search could be a lighter-weight first step

**Agent Potential: Medium**
- Agent could: answer clinician questions about internal protocols, provide drug interaction checks in context, suggest referral pathways based on patient and specialty, surface relevant clinical guidelines during documentation
- Requires careful clinical validation before deployment
- Phase 3 opportunity

---

### Deprioritize (Low Impact, Low Feasibility)

---

#### Opportunity 9: Diagnostic Imaging AI

**Business Impact: 3** | **Feasibility: 1** | **Quadrant: Deprioritize**

| Factor | Assessment |
| --- | --- |
| Revenue/cost savings | Depends on specialty; could improve detection rates |
| Strategic alignment | Low -- not aligned with "modernize operations" goal |
| People affected | Radiologists/imaging specialists only (if applicable) |
| Data readiness | Requires PACS integration, large imaging datasets |
| Technical complexity | Very High -- FDA regulatory pathway required |
| Integration difficulty | Very High -- PACS, EHR, clinical workflow integration |
| Organizational readiness | Low -- requires significant clinical validation and change management |
| Time to first value | 12-18+ months |

**Build vs Buy vs Already Licensed**:
- **Recommendation: BUY only if/when relevant** (Aidoc, Viz.ai, etc.)
- Not recommended for current engagement scope
- Estimated effort: 400-800+ hours for integration and clinical validation

**GenAI vs Traditional ML**:
- **Traditional ML**: Computer vision models for imaging analysis
- GenAI is secondary (report generation from imaging findings)

**Agent Potential: Low**
- Not an agent use case; this is model inference on images

**Reason for deprioritization**: Extremely high complexity, FDA regulatory burden, long time to value, and only relevant if the specialty clinics do significant imaging. Does not align with the CEO's operational modernization goal. Revisit in Phase 3 if relevant specialties exist.

---

## Opportunity Summary Matrix

| # | Opportunity | Impact | Feasibility | Quadrant | Build/Buy | GenAI vs ML | Agent Potential | Recommended Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Digital Patient Intake | 5 | 4 | Quick Win | Buy | Hybrid | Low-Medium | Phase 1 |
| 2 | Ambient Clinical Documentation | 5 | 4 | Quick Win | Buy | GenAI | Medium | Phase 1 |
| 3 | Patient Communication Automation | 4 | 4 | Quick Win | Buy | Rules + GenAI | High | Phase 1 |
| 4 | Automated Medical Coding | 5 | 3 | Strategic Bet | Buy | Hybrid | Medium-High | Phase 2 |
| 5 | Prior Authorization Automation | 4 | 3 | Strategic Bet | Buy | Hybrid (GenAI-heavy) | High | Phase 2 |
| 6 | Scheduling Optimization | 3 | 3 | Strategic Bet | Buy | Traditional ML | Low-Medium | Phase 2/3 |
| 7 | Quality Reporting Automation | 2 | 4 | Fill-in | Buy/Check Licensed | Rules/Traditional | Low | Phase 1 (if EHR has it) |
| 8 | Clinical Knowledge Base | 3 | 3 | Fill-in | Build or Buy | GenAI (RAG) | Medium | Phase 3 |
| 9 | Diagnostic Imaging AI | 3 | 1 | Deprioritize | Buy (if ever) | Traditional ML | Low | Not in scope |

## Visual Quadrant

```
                        HIGH FEASIBILITY                    LOW FEASIBILITY
                 ┌──────────────────────────────┬──────────────────────────────┐
                 │                              │                              │
  HIGH           │  QUICK WINS                  │  STRATEGIC BETS              │
  IMPACT         │                              │                              │
                 │  1. Digital Patient Intake    │  4. Automated Coding (5,3)   │
                 │     (5,4)                     │  5. Prior Auth Auto (4,3)    │
                 │  2. Ambient Documentation     │                              │
                 │     (5,4)                     │                              │
                 │  3. Patient Communication     │                              │
                 │     (4,4)                     │                              │
                 │                              │                              │
                 ├──────────────────────────────┼──────────────────────────────┤
                 │                              │                              │
  LOW            │  FILL-INS                    │  DEPRIORITIZE                │
  IMPACT         │                              │                              │
                 │  7. Quality Reporting (2,4)   │  9. Diagnostic Imaging (3,1) │
                 │  8. Clinical Knowledge (3,3)  │                              │
                 │  6. Scheduling Opt (3,3)      │                              │
                 │                              │                              │
                 └──────────────────────────────┴──────────────────────────────┘
```

## Recommended Approach

Based on the maturity score (1.75 -- Foundation stage) and the opportunity analysis:

**Phase 1 (Month 1-3): Quick Wins + Foundation**
- Deploy Digital Patient Intake (Opportunity 1) -- foundational and visible
- Pilot Ambient Clinical Documentation (Opportunity 2) -- high clinician impact
- Deploy Patient Communication Automation (Opportunity 3) -- fast win
- Establish AI governance framework
- If EHR has quality reporting module, configure it (Opportunity 7)

**Phase 2 (Month 3-6): Strategic Bets**
- Expand digital intake and documentation across all clinics
- Begin Automated Coding pilot (Opportunity 4)
- Evaluate Prior Authorization Automation vendors (Opportunity 5)
- Build internal AI capability (training, possible hire)

**Phase 3 (Month 6-12): Scale and Expand**
- Scale coding and prior auth automation
- Deploy Scheduling Optimization (Opportunity 6)
- Evaluate Clinical Knowledge Base (Opportunity 8)
- Add agent layers to existing deployments (patient communication agent, prior auth agent)

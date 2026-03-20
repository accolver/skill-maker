# AI Maturity Assessment: MedTech Solutions

## Assessment Methodology

Each dimension is scored 1-5 using the 5-dimension weighted maturity model. Scores are based on evidence available from the engagement brief. Where evidence is incomplete, scores reflect reasonable inference with conservative assumptions. All scores should be validated during stakeholder discovery interviews.

## Dimension Scores

### Dimension 1: Data (Weight: 25%)

**Score: 1.5 -- Ad Hoc / Early Managed**
**Stage: Ad Hoc with pockets of Managed**

| Indicator | Evidence | Assessment |
| --- | --- | --- |
| Data storage | Paper-based patient intake confirmed; likely paper and fragmented digital | Ad Hoc (1) |
| Data catalog | No evidence of data catalog; paper processes suggest none | Ad Hoc (1) |
| Data quality standards | Paper processes inherently lack quality controls (illegible handwriting, missing fields) | Ad Hoc (1) |
| Cross-team data sharing | Unknown, but paper-based intake suggests significant silos | Ad Hoc (1) |
| EHR data | Likely have structured data in EHR system, which provides some managed data | Managed (2) |
| Analytics | Unknown -- may have basic reporting from EHR/PM system | Ad Hoc-Managed (1.5) |

**Evidence**: Paper-based patient intake is a strong signal that data management is immature. Patient data likely exists in multiple disconnected formats: paper forms, EHR (once manually entered), billing system, scheduling system. This creates significant data quality issues -- transcription errors, incomplete records, inability to run analytics across patient populations.

**Recommendations**:
- Digitize patient intake as first priority -- this is both an AI opportunity and a data foundation requirement
- Inventory all data sources and create a basic data map
- Assess EHR data quality and completeness
- Establish data governance ownership within IT team

---

### Dimension 2: Infrastructure (Weight: 20%)

**Score: 2.0 -- Transitioning**
**Stage: Transitioning**

| Indicator | Evidence | Assessment |
| --- | --- | --- |
| Cloud adoption | Mix of on-prem and AWS (confirmed) | Transitioning (2) |
| API architecture | Unknown; hybrid suggests partial modernization | Transitioning (2) |
| CI/CD | Unknown; 12-person IT team may have basic pipelines | Transitioning (2) |
| Compute elasticity | AWS presence suggests some elasticity | Transitioning (2) |
| MLOps | No evidence of ML infrastructure | Legacy (1) |
| Enterprise AI tools | No evidence of enterprise AI licensing | Legacy (1) |

**Evidence**: The hybrid on-prem/AWS setup indicates they have begun cloud migration but are not fully cloud-native. A 12-person IT team for a 500-person healthcare company is adequate for operations but likely fully consumed by day-to-day support (EHR maintenance, network, helpdesk, security/compliance). There is unlikely to be dedicated capacity for AI/ML infrastructure. The AWS presence is positive -- it means HIPAA-eligible cloud infrastructure is already in place, reducing a major barrier.

**Recommendations**:
- Assess current AWS footprint: what services, what workloads, BAA status
- Determine EHR API capabilities (FHIR R4 support, HL7 interfaces)
- Evaluate whether existing AWS setup can support AI workloads without major infrastructure investment
- Identify integration constraints before recommending AI solutions

---

### Dimension 3: Talent (Weight: 20%)

**Score: 1.5 -- No AI Skills / Early Emerging**
**Stage: No AI Skills with some Emerging potential**

| Indicator | Evidence | Assessment |
| --- | --- | --- |
| Data scientists / ML engineers | No evidence; 12-person IT team unlikely to include | No AI Skills (1) |
| Analytics capability | Unknown; may have basic BI/reporting staff | Emerging (2) |
| AI training budget | No evidence | No AI Skills (1) |
| AI tool usage | No evidence of enterprise AI; possible shadow AI | Emerging (2) |
| Willingness to upskill | CEO interest in AI suggests top-down support for learning | Emerging (2) |

**Evidence**: A 12-person IT team in a healthcare company this size is typically composed of: IT director/manager, system administrators (2-3), network/security (1-2), helpdesk (2-3), EHR analyst(s) (1-2), and possibly a reporting analyst. There are almost certainly zero data scientists or ML engineers. The CEO's interest in AI is a positive signal for willingness to invest in capability, but current AI talent is likely zero.

**Recommendations**:
- Assess current team skill profiles during CTO interview
- Identify potential internal champions who could upskill (e.g., EHR analysts, reporting staff)
- Plan for external partnership or staff augmentation for initial AI projects
- Include training/upskilling in any engagement proposal

---

### Dimension 4: Governance (Weight: 20%)

**Score: 1.5 -- None / Early Reactive**
**Stage: None with some Reactive elements from healthcare compliance**

| Indicator | Evidence | Assessment |
| --- | --- | --- |
| AI use policy | No evidence; likely none | None (1) |
| Ethics review | No evidence | None (1) |
| Model review process | No ML models to review | None (1) |
| Compliance consideration for AI | HIPAA compliance likely exists for general IT; AI-specific compliance unknown | Reactive (2) |
| Approval process for new AI tools | Unknown; given paper processes, likely no formal AI approval | None (1) |

**Evidence**: As a healthcare company, MedTech Solutions almost certainly has HIPAA compliance processes, BAAs with vendors, and some data security governance. However, AI-specific governance (use policies, ethics framework, model review) is almost certainly nonexistent. This is normal for a company at this maturity level. The good news is that healthcare compliance muscle means the organization understands regulatory governance -- they just need to extend it to AI.

**Recommendations**:
- Develop AI use policy before deploying any AI tools (especially GenAI -- hallucination and data leakage risks)
- Extend existing HIPAA compliance framework to cover AI-specific risks
- Establish an AI approval process (even lightweight) before first deployment
- Address shadow AI risk -- employees may already be pasting patient info into ChatGPT

---

### Dimension 5: Culture (Weight: 15%)

**Score: 2.5 -- Curious / Early Supportive**
**Stage: Curious trending Supportive**

| Indicator | Evidence | Assessment |
| --- | --- | --- |
| Executive interest | CEO actively requesting AI modernization (confirmed) | Supportive (3) |
| Budget willingness | CEO "has budget" (confirmed, though vague) | Supportive (3) |
| Organizational change tolerance | Paper-based processes suggest conservative culture | Curious-Resistant (1.5) |
| Employee AI attitudes | Unknown | Curious (2) |
| Previous AI initiatives | Unknown | Neutral (2) |
| Innovation culture | Paper-based processes in 2026 suggest slow technology adoption | Curious (2) |

**Evidence**: There is a meaningful tension here. The CEO is actively seeking AI modernization, which is a strong positive signal. Budget availability compounds this. However, a company still using paper-based patient intake in 2026 suggests an organization that has been slow to adopt technology. This could indicate: (a) previous failed digitization efforts, (b) clinician resistance to change, (c) leadership that talks about innovation but doesn't execute, or (d) simply not having prioritized it until now. The CTO call should probe which of these is true, because the answer significantly affects engagement strategy.

**Recommendations**:
- Validate CEO commitment beyond verbal interest (budget allocation, willingness to champion change)
- Assess clinician and frontline staff attitudes toward technology change
- Identify internal champions at department level
- Plan for significant change management -- moving from paper to digital is a bigger culture shift than adding AI to existing digital processes

---

## Aggregate Score Calculation

```
Aggregate = (Data * 0.25) + (Infrastructure * 0.20) + (Talent * 0.20) + (Governance * 0.20) + (Culture * 0.15)

Aggregate = (1.5 * 0.25) + (2.0 * 0.20) + (1.5 * 0.20) + (1.5 * 0.20) + (2.5 * 0.15)

Aggregate = 0.375 + 0.400 + 0.300 + 0.300 + 0.375

Aggregate = 1.75
```

## Overall Maturity: 1.75 / 5.0 -- Foundation Stage

### Engagement Approach

At a score of 1.75, MedTech Solutions is firmly in the **Foundation** stage (1.0-1.9). The recommended engagement approach is:

**Foundation-building engagement** -- Focus on data strategy, infrastructure readiness, and executive education. 6-12 month horizon before meaningful AI production deployments. Build the case and the foundations first.

This does NOT mean "no AI for a year." It means:
1. Start with digitization (patient intake) which is a prerequisite for AI and delivers immediate value
2. Deploy buy-not-build AI tools that require minimal infrastructure (e.g., ambient clinical documentation from a SaaS vendor)
3. Build data foundations in parallel with quick-win deployments
4. Establish governance before scaling

---

## Bottleneck Analysis

Dimensions 2+ levels below the highest score represent bottlenecks that will block AI initiatives.

| Dimension | Score | Gap from Highest (Culture: 2.5) | Bottleneck? |
| --- | --- | --- | --- |
| Data | 1.5 | 1.0 | Emerging bottleneck |
| Infrastructure | 2.0 | 0.5 | No |
| Talent | 1.5 | 1.0 | Emerging bottleneck |
| Governance | 1.5 | 1.0 | Emerging bottleneck |
| Culture | 2.5 | -- | Highest dimension |

### Bottleneck Pattern: High Culture, Low Everything Else

The organization's leadership wants AI (culture is the highest dimension) but lacks the foundations to execute. This maps to the pattern: **"High culture, low talent/data"** -- the organization wants AI but can't execute. The solution is to hire or partner, fix data first, and build governance.

**Critical bottleneck**: Data is the most heavily weighted dimension (25%) and scores lowest. Paper-based processes mean the most valuable data (patient intake information) is not machine-readable. This must be addressed before any AI initiative that depends on patient data.

**Talent bottleneck**: No AI/ML capability on staff. Every AI initiative will require external support initially. The engagement must include a capability-building component or ongoing partnership model.

**Governance bottleneck**: No AI-specific governance. In healthcare, this is especially risky because of HIPAA. Deploying AI tools that touch PHI without proper governance could create regulatory exposure.

---

## Score Validation Checklist

The following should be validated during stakeholder discovery to refine scores:

- [ ] Confirm EHR system and data architecture (may adjust Data score)
- [ ] Assess actual AWS utilization and maturity (may adjust Infrastructure score)
- [ ] Inventory any existing AI tool usage, including shadow AI (may adjust Talent, Governance)
- [ ] Confirm HIPAA compliance program maturity (may adjust Governance score)
- [ ] Interview frontline staff on technology attitudes (may adjust Culture score)
- [ ] Check for previous automation or digitization initiatives (may adjust multiple dimensions)
- [ ] Confirm budget specifics with CEO/CFO (affects feasibility of all recommendations)

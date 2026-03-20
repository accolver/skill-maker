# AI Maturity Assessment: MedTech Solutions

**Status:** Preliminary (pre-discovery)
**Confidence:** Low-Medium — based on limited information. Must be validated during stakeholder interviews.

---

## Dimension Scores (Estimated)

| Dimension | Estimated Score | Confidence | Rationale |
| --- | --- | --- | --- |
| Data | 1.5 | Medium | Paper-based intake is a strong signal of ad-hoc data practices. Some digital data exists (EHR, billing systems) but likely siloed. No evidence of data warehouse or analytics platform. |
| Infrastructure | 2.0 | Medium | Hybrid on-prem/AWS is a positive signal, but paper processes suggest clinical workflow layer is not modernized. Likely transitioning but not cloud-ready for AI workloads. |
| Talent | 1.5 | Low | 12-person IT team for 500 employees suggests focus on IT operations, not innovation. No evidence of data science or ML capability. Need to verify during CTO call. |
| Governance | 1.5 | Low | As a healthcare company, likely has HIPAA compliance controls, but no evidence of AI-specific governance, ethics framework, or model review processes. |
| Culture | 2.5 | Medium | CEO proactively seeking AI modernization is a positive signal of executive sponsorship. Score tempered by the fact that paper processes have persisted, suggesting organizational inertia. |

## Aggregate Score

```
Aggregate = (1.5 * 0.25) + (2.0 * 0.20) + (1.5 * 0.20) + (1.5 * 0.20) + (2.5 * 0.15)
          = 0.375 + 0.40 + 0.30 + 0.30 + 0.375
          = 1.75
```

**Estimated Aggregate: 1.75 / 5.0 — Foundation Stage**

## Interpretation

A score of 1.75 places MedTech Solutions firmly in the **Foundation** stage. This means:

- **Do NOT propose an ambitious AI agent fleet or advanced GenAI platform.** The client is not ready.
- **The right engagement is foundation-building** with one carefully chosen quick win to demonstrate value.
- **Primary recommendations should focus on**: data strategy, digital workflow modernization, infrastructure readiness, and a single high-visibility pilot.
- **Expected timeline to meaningful AI**: 6-12 months for foundation work, with a quick win possible in 2-3 months if scoped tightly.

## Dimension-Level Analysis

### Data (Score: 1.5) — BOTTLENECK

**Evidence:**
- Paper-based patient intake is a primary indicator of immature data practices
- Data likely exists in EHR and billing systems but is not integrated or accessible for analytics
- No evidence of a data warehouse, data lake, or self-service analytics

**Gaps to Address:**
- Digitize paper workflows to create structured data capture
- Assess EHR data export/API capabilities
- Determine if a data integration layer exists or needs to be built
- Evaluate data quality in existing digital systems

**Recommendations:**
- Digitization of intake is both an operational improvement AND a data foundation investment
- Assess EHR API/FHIR capabilities for data extraction
- Begin planning a clinical data warehouse or analytics layer

### Infrastructure (Score: 2.0)

**Evidence:**
- AWS presence shows cloud adoption has begun
- On-prem components suggest not fully cloud-ready
- Paper processes indicate clinical workflow layer has not been modernized

**Gaps to Address:**
- Determine what is on AWS vs. on-prem and why
- Assess API architecture and integration capabilities
- Evaluate CI/CD maturity
- Determine HIPAA compliance status of AWS environment (BAAs, encryption, etc.)

**Recommendations:**
- Validate AWS is configured for HIPAA compliance (this is non-negotiable for any AI touching PHI)
- Map integration points between EHR, billing, scheduling, and any analytics
- Assess compute capacity for potential AI workloads

### Talent (Score: 1.5)

**Evidence:**
- 12-person IT team is likely focused on operations (help desk, infrastructure, EHR administration)
- No evidence of data science, ML, or analytics specialization
- Company size and revenue suggest limited budget for specialized AI hires

**Gaps to Address:**
- Confirm team composition and skills during CTO call
- Determine if anyone on the team has ML/data science exposure
- Assess willingness to train existing staff vs. hire vs. outsource

**Recommendations:**
- For foundation stage, external partnership (consulting) fills the capability gap
- Identify 1-2 internal champions who could grow into AI-adjacent roles
- Budget for training existing IT staff on data engineering and AI concepts
- Consider whether a fractional data science leader is appropriate for this stage

### Governance (Score: 1.5)

**Evidence:**
- Healthcare company should have HIPAA compliance infrastructure
- No evidence of AI-specific policy, ethics review, or model governance
- At this maturity stage, governance gap is expected and not unusual

**Gaps to Address:**
- Confirm HIPAA compliance program maturity
- Determine if legal/compliance has been consulted about AI plans
- Assess vendor review process (critical for any AI SaaS procurement)

**Recommendations:**
- Do not let governance gaps block foundation work — build governance alongside initial pilots
- Ensure legal/compliance is looped into AI planning from day one
- Draft a lightweight AI use policy as part of any engagement
- Ensure BAAs are in place for any cloud AI services

### Culture (Score: 2.5) — RELATIVE STRENGTH

**Evidence:**
- CEO proactively seeking AI modernization is a strong positive signal
- Executive sponsorship is the #1 predictor of AI initiative success
- However, paper processes persisting suggests organizational inertia or competing priorities
- Unknown: CTO's appetite for change, department heads' readiness, frontline staff sentiment

**Gaps to Address:**
- Confirm CTO alignment with CEO's AI vision
- Assess department heads' readiness for change
- Understand why paper processes have persisted (budget? resistance? competing priorities?)
- Gauge frontline staff's appetite for new technology

**Recommendations:**
- Leverage CEO sponsorship as the engagement's north star
- Identify additional champions at the CTO and department head levels
- Address the paper persistence question directly — the answer reveals organizational dynamics
- Plan for change management from day one of any initiative

## Bottleneck Analysis

The **Data** dimension (1.5) is the primary bottleneck. Even if every other dimension improves, the lack of digitized, integrated data will block any meaningful AI initiative.

This confirms that the first engagement priority must include digitizing core workflows (starting with patient intake), which simultaneously:
1. Solves an immediate operational pain point
2. Creates the data foundation for future AI initiatives
3. Demonstrates value quickly to maintain executive sponsorship

## Validation Plan

During stakeholder discovery, validate or update each score using the key questions from the maturity model framework:

| Dimension | Priority Validation Questions |
| --- | --- |
| Data | Where does your most valuable data live? How do teams access data for decisions? Is there a data catalog? |
| Infrastructure | What is on AWS vs. on-prem? Do you have CI/CD? What does your API architecture look like? |
| Talent | How many people work on data/analytics? What tools does the team use? Is there training budget for AI? |
| Governance | Do you have an AI use policy? How would a new AI project get approved? Who handles AI ethics/risk? |
| Culture | How does leadership talk about AI? Have there been previous initiatives? How does the org handle change? |

# AI Maturity Assessment: MedTech Solutions

**Date:** March 2026
**Status:** Pre-engagement estimate (to be validated during discovery)
**Methodology:** 5-dimension AI Maturity Model, scored 1-5 per dimension

---

## Summary

| Dimension | Score | Stage |
| --- | --- | --- |
| Data | 1.5 | Ad Hoc / Managed |
| Infrastructure | 2.0 | Transitioning |
| Talent | 1.5 | No AI Skills / Emerging |
| Governance | 1.5 | None / Reactive |
| Culture | 2.5 | Curious / Supportive |
| **Aggregate** | **1.8** | **Foundation** |

**Aggregate Calculation:**
(1.5 x 0.25) + (2.0 x 0.20) + (1.5 x 0.20) + (1.5 x 0.20) + (2.5 x 0.15) = 0.375 + 0.40 + 0.30 + 0.30 + 0.375 = **1.75 (rounded to 1.8)**

**Engagement Approach:** Foundation-building with targeted quick wins. MedTech Solutions falls in the **Foundation-to-Pilot-Ready** range. The strategy should combine foundational improvements (digitization, data capture) with 1-2 quick wins that use off-the-shelf solutions and don't require internal AI capability.

---

## Dimension 1: Data — Score: 1.5

**Evidence:**
- Patient intake is paper-based, meaning significant patient data exists only in physical form or scanned images
- Likely relying on an EHR for some structured clinical data, but completeness is uncertain
- No indication of a data warehouse, data lake, or analytics infrastructure
- Multi-site operations likely create data silos across clinic locations
- Billing/claims data is probably the most structured dataset available

**Key Gaps:**
- No unified data strategy
- Paper processes prevent structured data capture at point of origin
- Cross-site data likely inconsistent and fragmented
- Unknown quality standards or data governance

**Recommendations:**
- Digitize patient intake as a data capture prerequisite (Phase 1 priority)
- Inventory existing data assets across all clinic locations and systems
- Establish basic data quality standards and ownership
- Assess EHR data completeness and accessibility

**Validation Questions for CTO:**
- Where does your most valuable data live today?
- How do teams currently access data for decision-making?
- Is there a data catalog or inventory?
- What data quality issues have you encountered?

---

## Dimension 2: Infrastructure — Score: 2.0

**Evidence:**
- Hybrid infrastructure (on-prem + AWS) indicates partial cloud migration
- The mix suggests they are in transition rather than cloud-native
- 12-person IT team managing hybrid environment implies operational focus, not innovation
- No indication of API-first architecture, containerization, or CI/CD maturity
- AWS usage level unknown -- could range from basic EC2/S3 to managed services

**Key Gaps:**
- No MLOps pipeline or ML-specific infrastructure
- API architecture maturity unknown
- Likely no GPU/TPU compute for AI workloads
- Unknown CI/CD maturity

**Recommendations:**
- Assess current AWS services in use and cloud migration status
- For initial AI initiatives, leverage vendor SaaS solutions to avoid infrastructure burden
- Plan infrastructure investments to support future AI workloads as part of Phase 2/3

**Validation Questions for CTO:**
- What's your current AWS footprint? What services are you using?
- Do you have CI/CD pipelines?
- What does your API architecture look like?
- What EHR system are you running, and is it cloud or on-prem?

---

## Dimension 3: Talent — Score: 1.5

**Evidence:**
- 12-person IT team for a 500-person company is lean
- No indication of data scientists, ML engineers, or AI specialists on staff
- Team is likely consumed by infrastructure operations, help desk, and EHR support
- No evidence of AI training programs or upskilling initiatives

**Key Gaps:**
- No internal AI/ML capability
- No data science or analytics team
- IT team likely has no bandwidth for AI projects without additional resources
- Unknown level of data literacy in clinical and operational staff

**Recommendations:**
- Initial AI projects should use buy/vendor solutions that don't require internal AI skills
- Budget for external consulting/implementation support for first 12 months
- Identify 1-2 IT team members with interest in AI for upskilling as internal champions
- Consider AI CoE buildout as a Phase 3 initiative

**Validation Questions for CTO:**
- How many people on the IT team work on data or analytics vs. operations?
- What AI/ML tools or frameworks does anyone on the team use?
- Are any teams using GenAI tools (Copilot, ChatGPT, etc.) today?
- Is there a training budget for AI skills?

---

## Dimension 4: Governance — Score: 1.5

**Evidence:**
- No indication of an AI use policy
- Healthcare regulatory environment (HIPAA) means some compliance infrastructure exists, but likely not AI-specific
- No evidence of an ethics review process for AI
- No model monitoring, bias testing, or AI audit processes

**Key Gaps:**
- No AI-specific governance framework
- HIPAA compliance exists but may not extend to AI use cases (BAAs, PHI in training data, etc.)
- No model risk management framework
- No approval process for AI tools or vendors

**Recommendations:**
- Establish an AI use policy before deploying any AI systems
- Extend HIPAA compliance program to cover AI-specific scenarios (vendor BAAs, PHI in AI systems)
- Create a lightweight AI approval process for evaluating new tools
- Address patient consent requirements for any data use beyond treatment

**Validation Questions for CTO:**
- Do you have an AI use policy or guidelines?
- How would a new AI project get approved today?
- What's your current HIPAA compliance posture with cloud vendors?
- Who reviews vendor security and compliance?

---

## Dimension 5: Culture — Score: 2.5

**Evidence:**
- CEO is actively interested in AI ("use AI to modernize operations") -- executive sponsorship exists
- CEO has budget, indicating willingness to invest
- The vagueness of "use AI" suggests enthusiasm without deep understanding
- Unknown whether there is broader organizational buy-in or resistance
- Unknown whether clinicians are open to AI tools or skeptical

**Key Gaps:**
- CEO interest may not translate to physician/clinician buy-in
- Staff may fear job displacement from AI/automation
- No evidence of prior AI experimentation or innovation culture
- Change management capability unknown

**Recommendations:**
- Identify a physician champion for clinical AI initiatives
- Plan change management as part of any AI deployment
- Frame AI as augmenting staff (reducing paperwork burden) rather than replacing roles
- Celebrate early wins publicly to build organizational momentum

**Validation Questions for CTO:**
- How does the broader leadership team feel about AI?
- How does the organization typically handle technology change?
- Have there been any previous AI or automation initiatives? What happened?
- Are employees using AI tools independently?

---

## Dimension Gap Analysis

All dimensions are relatively close (1.5-2.5), which is common for organizations just beginning their AI journey. There are no extreme gaps. However:

- **Culture (2.5) is the strongest dimension.** Executive interest exists but needs to be channeled into realistic expectations and sustained commitment.
- **Data (1.5) is the most critical bottleneck.** Paper-based processes fundamentally limit what AI can accomplish. Digitization must be Phase 1.
- **Talent (1.5) and Governance (1.5) are tied bottlenecks.** The lack of internal AI skills means a buy-first strategy, and governance gaps must be addressed before deploying AI on patient data.

**Bottleneck Pattern:** High culture, low data -- "Has the organizational will but lacks the raw material." This is a favorable pattern because the biggest barrier (organizational resistance) is not present. The fix is executing on data foundations, which is a solvable, well-understood problem.

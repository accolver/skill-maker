# Company Briefing: MedTech Solutions

## Company Overview

| Field | Detail |
| --- | --- |
| Company | MedTech Solutions |
| Industry | Healthcare -- specialty clinic chain |
| Size | ~500 employees |
| Revenue | ~$80M annually |
| IT Team | 12 people |
| Infrastructure | Mix of on-premises and AWS |
| Engagement Trigger | CEO wants to "use AI to modernize operations" |

## Industry Position

MedTech Solutions operates as a mid-size healthcare provider running a chain of specialty clinics. At $80M revenue and 500 employees, they sit in the mid-market tier -- large enough to have meaningful operational complexity and IT resources, but small enough that every technology investment must show clear ROI. Specialty clinic chains in this segment typically face margin pressure from payer negotiations, rising labor costs, and increasing patient expectations for digital experiences.

## Likely Pain Points Based on Industry Patterns

1. **Paper-based patient intake** (confirmed by CEO) -- manual data entry, transcription errors, slow check-in, patient frustration, compliance risk from physical document handling
2. **Clinical documentation burden** -- clinicians spending 2-3 hours/day on notes and charting instead of patient care
3. **Revenue cycle inefficiency** -- medical coding errors, claim denials, delayed reimbursements, prior authorization bottlenecks
4. **Scheduling and capacity optimization** -- suboptimal provider utilization, patient no-shows, long wait times
5. **Staff recruitment and retention** -- burnout from administrative burden, especially among clinical staff
6. **Referral management** -- tracking referrals across specialties within their own chain and external providers
7. **Quality reporting** -- manual compilation of quality metrics for payer programs (MIPS, HEDIS)

## Known or Suspected Technology Stack

- **Infrastructure**: Hybrid on-prem/AWS (confirmed). Likely using AWS for some workloads but core clinical systems may still be on-prem.
- **EHR/EMR**: Unknown -- need to confirm. Likely one of: Epic, Cerner (Oracle Health), athenahealth, eClinicalWorks, or NextGen. Specialty clinics at this size often use athenahealth or eClinicalWorks. The EHR choice significantly constrains or enables AI integration.
- **Practice Management**: Likely bundled with EHR or separate (Kareo, AdvancedMD)
- **Enterprise AI Tools**: Unknown -- need to inventory. Possible Microsoft 365 Copilot, but given paper-based intake this seems unlikely to be widely deployed.
- **Communication**: Unknown -- need to confirm if using patient portal, telehealth platform

**Action item**: Research job postings for MedTech Solutions to identify specific technologies before CTO call.

## Estimated AI Tool Utilization

Given paper-based patient intake as the starting point, AI tool adoption is likely minimal to nonexistent at the enterprise level. There may be individual employees using ChatGPT or similar tools informally (shadow AI), which is a compliance concern in healthcare.

## Competitor AI Initiatives

Healthcare specialty chains increasingly adopting:
- **Ambient clinical documentation**: Companies like Nuance DAX (Microsoft), Abridge, and Nabla are being deployed across clinic chains to auto-generate clinical notes from patient encounters
- **AI-assisted patient intake**: Digital intake platforms (Phreesia, Yosi Health) with increasing AI capabilities
- **Automated coding**: Products like Fathom, Codametrix gaining traction in specialty practices
- **Patient communication**: AI chatbots for scheduling, FAQs, pre-visit prep (Hyro, Hippocratic AI for clinical)
- **Prior authorization automation**: Cohere Health, Infinitus, and others automating PA workflows

Competitors who have already digitized intake and moved to AI-assisted documentation will have meaningful advantages in clinician productivity and patient throughput.

## Regulatory Considerations

| Regulation | Relevance | Impact on AI |
| --- | --- | --- |
| HIPAA | Critical -- governs all PHI | Every AI system touching patient data needs BAAs, encryption in transit/at rest, access controls, audit trails. Cloud AI services must be HIPAA-eligible. |
| HITECH Act | High | Breach notification requirements. AI systems that process PHI create additional attack surface. |
| 21st Century Cures Act | High | Information blocking rules. AI systems must not impede patient data access/sharing. |
| FDA | Medium | If any AI tool makes clinical diagnostic or treatment recommendations, may require FDA clearance. Non-clinical operational AI (scheduling, coding, intake) generally does not. |
| State regulations | Variable | Some states have additional health data privacy laws (e.g., California CCPA/CMIA, Washington My Health My Data Act). Need to know which states clinics operate in. |
| MIPS/Quality Programs | Medium | AI could help or hinder compliance with quality reporting programs depending on implementation. |

## Preliminary Hypotheses -- Where AI Could Help

1. **Digital patient intake with AI extraction** -- Replace paper forms with digital intake, use AI to extract/structure data and push to EHR. High impact, moderate feasibility.
2. **Ambient clinical documentation** -- AI scribe for clinical encounters. High impact on clinician satisfaction and productivity. Buy opportunity.
3. **Automated medical coding** -- AI-assisted coding to reduce errors and speed billing. Directly impacts revenue.
4. **Patient communication agent** -- AI-powered appointment reminders, pre-visit instructions, post-visit follow-up, scheduling. Reduces no-shows and staff burden.
5. **Prior authorization automation** -- Agent workflow to handle PA submissions. Reduces admin burden.
6. **Scheduling optimization** -- ML-based scheduling to improve provider utilization and reduce patient wait times.

## Questions to Confirm Before CTO Call

- What EHR/EMR system are they using? Version?
- Which states/regions do the clinics operate in?
- How many clinic locations?
- What specialties do they cover?
- Is there a CISO or dedicated security function?
- Have they had any previous AI or automation initiatives?
- What's the CEO's actual budget range?
- Are they under any payer quality programs (ACO, value-based care)?

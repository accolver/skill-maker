# Company Briefing: MedTech Solutions

## Company Overview

| Attribute | Detail |
| --- | --- |
| Company | MedTech Solutions |
| Industry | Healthcare — Specialty Clinic Chain |
| Size | ~500 employees |
| Revenue | ~$80M annually |
| Operations | Chain of specialty clinics |
| IT Team | 12 people |
| Infrastructure | Hybrid — on-premises + AWS |
| Engagement Trigger | CEO wants to "use AI to modernize operations" |

## Industry Context

MedTech Solutions operates in a segment (multi-site specialty clinics) that is
historically behind in digital transformation. Specialty clinic chains typically
face pressure from:

- Rising administrative burden (documentation, coding, prior auth)
- Clinician burnout driving retention issues
- Patient experience expectations set by retail healthcare (CVS, One Medical)
- Payer complexity and reimbursement delays
- Staffing shortages across clinical and administrative roles

## Likely Pain Points (Based on Industry Patterns)

1. **Paper-based patient intake** — confirmed by CEO. This signals broader
   digitization gaps. If intake is on paper, downstream processes (scheduling,
   billing, clinical documentation) likely have manual handoffs.
2. **Clinical documentation burden** — specialty clinics generate complex notes;
   clinicians likely spend significant time on documentation after hours.
3. **Medical coding and billing errors** — manual processes with paper intake
   increase coding error rates, leading to claim denials and revenue leakage.
4. **Prior authorization delays** — specialty care requires frequent prior auths;
   manual processes create bottlenecks and patient wait times.
5. **Scheduling inefficiency** — multi-site specialty scheduling with referral
   management is typically complex and under-optimized.
6. **Siloed data across clinic locations** — each clinic may run its own systems
   or paper processes with limited centralized visibility.

## Known or Suspected Technology Stack

- **Infrastructure**: Hybrid on-prem + AWS (confirmed)
- **EHR/EMR**: Unknown — critical to determine. Could be Epic, Cerner/Oracle
  Health, athenahealth, eClinicalWorks, or a specialty-specific system. Paper
  intake suggests either no EHR, a legacy EHR, or poor EHR adoption.
- **Enterprise AI Tools**: Likely none given paper-based processes, but must
  confirm. Check for any Microsoft 365 licensing (potential Copilot path).
- **Shadow AI**: Possible — individual clinicians or staff may be using ChatGPT
  for drafting notes, letters, or summaries without IT oversight.

## Competitor AI Initiatives (Healthcare Sector)

- **Ambient clinical documentation**: Major health systems deploying DAX Copilot
  (Microsoft/Nuance), Abridge, Nabla. This is the most adopted GenAI use case
  in healthcare today.
- **Patient engagement**: Conversational AI for scheduling, intake, follow-up
  (Hyro, Hippocratic AI, health system custom builds).
- **Revenue cycle automation**: AI-powered coding (Nym Health, 3M/Solventum),
  prior auth automation (Olive AI, Infinitus).
- **Operational optimization**: Predictive scheduling, staffing optimization
  (LeanTaaS, Qventus).

## Regulatory Considerations

| Regulation | Relevance | Impact |
| --- | --- | --- |
| HIPAA | Critical | All AI touching PHI requires compliance. BAAs needed for every third-party AI service. Affects data storage, model training, vendor selection. |
| FDA | Medium | Clinical decision support AI may require FDA clearance if it diagnoses, treats, or prevents disease. Ambient documentation is generally exempt. |
| 21st Century Cures Act | Medium | Information blocking rules affect how AI systems share health data across providers. |
| State Privacy Laws | Variable | State-specific health data protections may exceed HIPAA in some jurisdictions. |
| Patient Consent | High | AI use of patient data for training may require consent beyond treatment consent. |

## Preliminary Hypotheses

1. **Immediate digitization need**: Paper intake must be digitized before or
   alongside AI. AI on top of paper processes is a non-starter.
2. **Quick win potential**: Patient intake digitization with AI-assisted data
   capture could show fast value and fund larger initiatives.
3. **Clinical documentation is the high-value opportunity**: If clinicians
   are spending 2+ hours/day on notes, ambient scribe technology could be
   transformative for retention and satisfaction.
4. **Revenue cycle has quantifiable ROI**: Coding errors and claim denials
   are directly measurable, making AI-assisted coding an easy business case.
5. **Maturity is likely low (1-2 range)**: Paper processes, 12-person IT team,
   and vague CEO direction suggest early-stage readiness.

## Key Information Gaps (To Resolve on CTO Call)

- What EHR/EMR system(s) are in use? What's the adoption level?
- Is patient data digitized anywhere, or is it truly all paper?
- What's on AWS vs. on-prem? What drove the cloud adoption so far?
- Any existing AI tools licensed or in use (even informally)?
- Has the CTO or IT team evaluated any AI solutions already?
- What's the IT team's composition (developers, sysadmins, data people)?
- Budget range — even a rough bracket
- Any previous technology modernization attempts and outcomes
- HIPAA compliance posture — do they have a compliance officer?
- EHR vendor relationship — is the vendor offering AI add-ons?

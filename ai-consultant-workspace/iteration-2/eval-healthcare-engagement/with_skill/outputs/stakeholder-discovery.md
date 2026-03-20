# Stakeholder Discovery: MedTech Solutions

**Date:** March 2026
**Status:** Pre-engagement interview planning (discovery not yet conducted)

This document serves two purposes:
1. Interview guide and question selection for each stakeholder tier
2. Framework for capturing findings during discovery

---

## Interview Sequence and Schedule

| Priority | Role | Person | Purpose | Duration | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | CTO | TBD (call next week) | Strategic vision, technical landscape, data architecture, budget signals | 60-90 min | Scheduled |
| 2 | CEO | Known contact | Validate strategic vision, budget authority, success metrics, timeline | 45-60 min | To schedule |
| 3 | Clinic Operations Lead | TBD | Patient intake workflow, multi-site operations, staffing challenges | 60 min | To schedule |
| 4 | Revenue Cycle / Billing Manager | TBD | Coding, claims, denials, A/R processes | 45-60 min | To schedule |
| 5 | IT Team Lead / Senior Engineer | TBD | Infrastructure details, EHR integration, security posture | 45-60 min | To schedule |
| 6 | Clinic Manager (1-2 sites) | TBD | Frontline operations, patient flow, staff pain points | 30-45 min | To schedule |
| 7 | Lead Clinician / Physician | TBD | Clinical documentation burden, care delivery workflows | 30-45 min | To schedule |

---

## Interview 1: CTO (Next Week's Call)

### Objectives
- Understand the technical landscape and constraints
- Validate AI maturity estimates from pre-engagement research
- Get budget signals
- Identify quick wins the CTO already sees
- Understand the CTO's relationship with the CEO's AI vision

### Selected Questions (10 questions)

**Strategic Context:**
1. The CEO mentioned wanting to "use AI to modernize operations." How do you interpret that vision, and what does a successful AI initiative look like from your perspective?
2. What are your top 3 technology priorities for this year? Where does AI fit?
3. What's driving the urgency to explore AI now? Is there competitive pressure, board direction, or operational pain?

**Infrastructure & Data:**
4. You're running a mix of on-prem and AWS. What's your cloud strategy -- are you actively migrating, or is hybrid the long-term plan?
5. What EHR system are you using, and how does data flow between the EHR and other systems?
6. Describe your data architecture -- where does patient and operational data live, and how do people access it for reporting or analysis?

**Budget & Commitment:**
7. Is there a budget allocated for AI initiatives, or are we building the business case? What investment range is the organization comfortable with for a first initiative?
8. Who has final approval authority for AI spend -- is that the CEO, a committee, or does it go to the board?

**Team & Readiness:**
9. How is your 12-person IT team currently allocated? What capacity exists for new projects without additional hires?
10. Have you had any previous automation or AI initiatives? What happened, and what would you do differently?

### Research-Informed Questions (show preparation)
- "I noticed specialty clinics are increasingly adopting ambient clinical documentation tools like Nuance DAX and Abridge. Has your clinical team expressed interest in anything like that?"
- "Paper-based patient intake is one of the first things that jumped out to me. Have you evaluated digital intake platforms like Phreesia or Yosi Health?"

### Listening For
- **Budget signals**: Any numbers, ranges, or comparisons that indicate budget scale
- **CTO vs CEO alignment**: Does the CTO share the CEO's enthusiasm, or is there tension?
- **Previous failures**: Any past attempts that failed -- need to understand why
- **Quick win candidates**: What does the CTO think would be the easiest first project?
- **Blockers**: Anything about EHR vendor lock-in, legacy systems, or political dynamics
- **Data readiness**: How much structured data actually exists
- **Team capacity**: Whether the IT team can support AI projects or is already overwhelmed

---

## Interview 2: CEO

### Objectives
- Confirm strategic vision and business drivers
- Understand board/investor expectations around AI
- Get explicit budget commitment or range
- Understand timeline expectations
- Identify any organizational politics or dynamics

### Selected Questions (8 questions)

1. What are your top 3 business priorities for this year, and how does AI fit into them?
2. What would a successful AI initiative look like in 12 months? What would you be able to point to?
3. What concerns you most about AI adoption -- is it cost, disruption, risk, or something else?
4. What investment range are you comfortable with for a first AI initiative? Are we talking tens of thousands or hundreds of thousands?
5. How do you define ROI for technology investments? What metrics matter to you?
6. Who are the key stakeholders who need to be bought in for this to succeed?
7. Are there any internal dynamics or sensitivities I should be aware of?
8. What's your timeline expectation -- when do you want to see first results?

---

## Interview 3: Clinic Operations Lead

### Objectives
- Map the patient intake workflow end-to-end
- Understand multi-site operational challenges
- Identify highest-impact manual processes
- Gauge frontline appetite for change

### Selected Questions (10 questions)

1. Walk me through a patient's journey from scheduling to check-out -- what happens at each step?
2. What are the most time-consuming manual processes in clinic operations?
3. How does the paper-based intake process work today? How long does it take per patient? What errors occur?
4. How do you manage scheduling across multiple clinic locations?
5. Where do staffing challenges create the biggest operational bottlenecks?
6. What information do you wish you had but currently don't?
7. How do you handle referral tracking and follow-up?
8. What happens during peak periods -- what breaks or slows down first?
9. If you could automate one thing tomorrow, what would it be?
10. How do you currently measure clinic performance? What reports do you produce regularly?

---

## Interview 4: Revenue Cycle / Billing Manager

### Objectives
- Understand the billing and coding workflow
- Quantify claim denial rates and A/R aging
- Identify revenue leakage points
- Assess data quality in billing systems

### Selected Questions (8 questions)

1. Walk me through the billing process from encounter to payment -- what are the major steps?
2. What's your current claim denial rate? What are the top denial reasons?
3. How does the paper-based intake affect billing accuracy?
4. What medical coding tools does your team use? How much of coding is manual?
5. What's your average A/R aging? How much revenue is tied up in outstanding claims?
6. How much time does your team spend on prior authorizations per day/week?
7. Where do errors or quality issues most frequently occur in the revenue cycle?
8. Have you evaluated any AI-powered coding or billing tools?

---

## Interview 5: IT Team Lead / Senior Engineer

### Objectives
- Deep dive into technical architecture
- Understand EHR integration capabilities and limitations
- Assess security and compliance posture for AI
- Understand team skills and capacity

### Selected Questions (10 questions)

1. What's your current AWS footprint? What services are you using?
2. What's your EHR system, and what APIs or integration points does it expose?
3. Do you have a data warehouse or data lake, or is reporting done directly against operational databases?
4. What's the state of your data quality? Any known issues?
5. Do you have CI/CD pipelines? Container orchestration?
6. What are your data security requirements? How do you handle PHI?
7. What compliance frameworks do you operate under? (HIPAA, SOC2, HITRUST?)
8. What are the critical systems that any new solution would need to integrate with?
9. What's your approach to third-party vendor security review?
10. What's the typical integration timeline for new tools?

---

## Interview 6-7: Clinic Manager & Lead Clinician

### Objectives
- Understand daily frontline experience
- Identify undocumented processes and tribal knowledge
- Gauge attitudes toward AI and technology change
- Find specific quantifiable pain points

### Selected Questions (8 questions each)

**Clinic Manager:**
1. Walk me through a typical day at your clinic -- what tasks take the most time?
2. What's the most frustrating part of the paper intake process for your staff?
3. How do you handle patient no-shows and last-minute cancellations?
4. Where do handoffs between staff members cause problems?
5. What quality checks or reviews do you perform manually?
6. Are there undocumented processes that only certain people know how to do?
7. Have you or your staff used any AI tools like ChatGPT?
8. If AI could help with one thing in your daily work, what would it be?

**Lead Clinician:**
1. How much time per day do you spend on documentation vs. patient care?
2. What parts of documentation feel most repetitive or low-value?
3. How do you currently handle prior authorizations for specialty procedures?
4. What clinical decision support tools do you use today?
5. Have you tried any AI documentation tools (ambient scribes, etc.)?
6. What concerns you about AI in clinical settings?
7. Would you champion an AI pilot if it could save you 1-2 hours of documentation per day?
8. What information do you frequently have to look up or ask someone about?

---

## Findings Capture Template

For each completed interview, document:

### [Role] — [Name] — [Date]

**Current-State Process Description:**
[Summary of how things work today]

**Pain Points (Ranked by Business Impact):**
1. [Pain point] — Impact: High/Medium/Low — Estimated cost/hours
2. [Pain point] — Impact: High/Medium/Low — Estimated cost/hours
3. [Pain point] — Impact: High/Medium/Low — Estimated cost/hours

**Data Sources and Accessibility:**
- [System/source] — Structured/Unstructured — Accessible? Y/N
- [System/source] — Structured/Unstructured — Accessible? Y/N

**Appetite for Change:** [1-5 scale with evidence]

**Specific AI Ideas Already Considered:**
- [Idea and context]

**Red Flags Identified:**
- [Any concerns, resistance, or blockers surfaced]

**Key Quotes:**
- "[Verbatim quote that captures a pain point or insight]"

**Cross-Reference Notes:**
- [Contradictions or confirmations from other interviews]

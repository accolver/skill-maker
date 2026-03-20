# Stakeholder Discovery: MedTech Solutions

## Overview

This document provides the interview plan and question guides for MedTech Solutions stakeholder discovery. Since interviews have not yet occurred, this is a preparation document for the upcoming CTO call and subsequent interviews.

## Interview Sequence

### Interview 1: CTO (Scheduled -- Next Week)

**Priority**: This is the first technical stakeholder and the gateway to understanding the real state of technology at MedTech Solutions.

**Selected Questions (10 questions, adapted from question bank):**

**Strategic context:**
1. What are your top 3 technology priorities for this year, and where does AI fit relative to other initiatives?
2. The CEO mentioned wanting to "use AI to modernize operations" -- how do you interpret that vision, and what does success look like from your perspective?
3. What's driving the urgency to explore AI now? Has something changed in the competitive landscape or internally?

**Infrastructure and technical landscape:**
4. What EHR/EMR system are you running, and what version? How satisfied is the clinical staff with it?
5. Walk me through your current architecture -- what's on-prem, what's in AWS, and what's the migration trajectory?
6. What does your API landscape look like? Does the EHR expose FHIR R4 or HL7 APIs? What integration patterns do you use?

**AI readiness and existing tools:**
7. Has anyone on your team or in the clinics experimented with AI tools -- formally or informally? Are you aware of any shadow AI usage (staff using ChatGPT or similar with patient data)?
8. Are any enterprise AI tools currently licensed (Microsoft Copilot, GitHub Copilot, etc.)?

**Data and compliance:**
9. What's the state of your data -- do you have a data warehouse, any analytics infrastructure, or is reporting primarily through the EHR's built-in tools?
10. Walk me through your HIPAA compliance program -- who owns it, and how would you evaluate a new AI vendor for HIPAA compliance?

**Capture targets for this interview:**
- [ ] EHR system, version, and satisfaction level
- [ ] Exact AWS services in use and BAA status
- [ ] API architecture and integration capabilities
- [ ] Team composition and skills within the 12-person IT group
- [ ] Any existing AI/ML tools or shadow AI
- [ ] Data architecture and analytics capabilities
- [ ] HIPAA compliance maturity and vendor review process
- [ ] CTO's personal vision vs CEO's stated vision (watch for alignment/divergence)
- [ ] Budget awareness -- does CTO know what CEO has in mind?
- [ ] Political dynamics -- who are allies, who might resist?

---

### Interview 2: CEO (Schedule after CTO call)

**Priority**: Validate strategic commitment, clarify budget, understand expectations.

**Selected Questions (8 questions):**

1. What are your top 3 business priorities for MedTech Solutions this year?
2. When you say "use AI to modernize operations," what does that look like in your mind? What outcome would make you say this was a success in 12 months?
3. Is there budget allocated for AI initiatives, or are we building the business case? What investment range are you comfortable with for a first initiative?
4. Who has final approval authority for technology spend at this level?
5. Have you had previous attempts to digitize or automate processes (including the paper intake)? What happened?
6. What concerns you most about AI adoption -- cost, risk, employee resistance, patient safety, something else?
7. How do you define ROI for technology investments? Is it cost savings, revenue growth, clinician satisfaction, patient experience?
8. Are there any internal dynamics or stakeholder concerns I should be aware of as we scope this?

**Capture targets:**
- [ ] Concrete budget range (even a rough bracket)
- [ ] Timeline expectations (realistic vs aspirational)
- [ ] Success metrics in CEO's own words
- [ ] History of previous digitization efforts
- [ ] Political landscape and potential blockers
- [ ] Whether CEO will personally champion the initiative

---

### Interview 3: Operations / Clinic Manager(s)

**Priority**: Understand day-to-day pain points and the reality of paper-based processes.

**Selected Questions (10 questions):**

1. Walk me through a patient's journey from arrival to checkout -- every step and every form they touch.
2. How long does patient intake currently take? What's the bottleneck?
3. What happens to the paper forms after intake? Who enters the data into the EHR, and how long does that take?
4. What are the most common errors in the intake process? How often do they cause downstream problems (billing errors, clinical issues)?
5. How do you handle patients who are seen across multiple specialties within your chain? How does information flow between clinics?
6. What's your no-show rate? How do you currently handle appointment reminders and follow-ups?
7. Walk me through the prior authorization process -- how many hours per week does your team spend on it?
8. What scheduling challenges do you face? Provider utilization, patient wait times, capacity planning?
9. If you could automate one thing tomorrow, what would it be?
10. How do your frontline staff feel about technology changes? What's their biggest frustration with current tools?

**Capture targets:**
- [ ] Detailed intake workflow with time estimates per step
- [ ] Error rates and downstream impact
- [ ] Staff time spent on administrative vs. patient-facing tasks
- [ ] No-show rates and current mitigation
- [ ] Prior authorization volume and time burden
- [ ] Cross-clinic information flow challenges
- [ ] Staff attitudes toward change
- [ ] Specific numbers wherever possible (hours/week, errors/month, etc.)

---

### Interview 4: Revenue Cycle / Billing Manager

**Priority**: Understand coding, billing, and revenue cycle pain points.

**Selected Questions (8 questions):**

1. What's your claim denial rate? What are the top reasons for denials?
2. How do you currently handle medical coding -- manual, assisted by software, outsourced?
3. What's the average time from patient encounter to claim submission?
4. How much revenue do you estimate is lost to coding errors or missed charges annually?
5. Walk me through the prior authorization workflow from your perspective.
6. What reports do you produce for quality programs (MIPS, HEDIS)? How much manual effort goes into them?
7. Are there specific payer contracts that create more administrative burden than others?
8. What data do you wish you had better access to for revenue cycle optimization?

**Capture targets:**
- [ ] Denial rate and top denial reasons (quantified)
- [ ] Coding accuracy metrics
- [ ] Time-to-claim metrics
- [ ] Estimated revenue leakage
- [ ] Prior auth volume and effort
- [ ] Quality reporting burden

---

### Interview 5: Frontline Clinical Staff (2-3 clinicians + 2-3 front desk)

**Priority**: Ground truth on daily workflows, attitudes toward change, shadow AI usage.

**Selected Questions (8 questions for clinicians, 6 for front desk):**

**Clinicians:**
1. Walk me through your typical day -- where do you spend the most time outside of direct patient care?
2. How much time per day do you estimate you spend on documentation and charting?
3. What's the most frustrating part of your documentation workflow?
4. Have you used any AI tools for clinical documentation or other tasks (even personally)?
5. If AI could help with one thing in your daily work, what would it be?
6. What concerns you about AI in healthcare?
7. Are there undocumented processes or "tribal knowledge" in your specialty that only certain people know?
8. When a colleague is out sick, what breaks or slows down?

**Front desk:**
1. Walk me through patient check-in from arrival to when they see the provider.
2. What percentage of patients arrive with completed intake forms vs. filling them out on arrival?
3. What are the most common issues with paper intake forms (illegible writing, missing info, wrong forms)?
4. How long does it take to enter intake data into the system after the patient completes the form?
5. Have you used any AI tools or wish you had access to one for your work?
6. If one thing could be automated about your job, what would it be?

---

## Cross-Interview Analysis Framework

After all interviews, synthesize across these dimensions:

| Theme | Executive View | Operations View | Clinical View | IT View |
| --- | --- | --- | --- | --- |
| Top priority | | | | |
| Biggest pain point | | | | |
| AI expectations | | | | |
| Change readiness | | | | |
| Budget/resource awareness | | | | |

**Watch for contradictions**: What leadership says the problems are vs. what frontline staff actually experience. These gaps often reveal the highest-value opportunities.

## Pre-Interview Preparation Checklist

- [ ] Review company briefing before each interview
- [ ] Prepare 1-2 MedTech-specific questions based on prior research
- [ ] Prepare 1-2 questions based on findings from previous interviews
- [ ] Set up note-taking template with capture targets
- [ ] Confirm interview duration (recommend 45-60 min for execs, 30-45 for others)
- [ ] Brief interviewees on purpose: "understanding current state and identifying opportunities" -- not "evaluating performance"

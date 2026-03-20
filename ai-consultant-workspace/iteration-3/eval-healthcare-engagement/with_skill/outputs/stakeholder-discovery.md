# Stakeholder Discovery Plan: MedTech Solutions

## Interview Sequence and Preparation

Per the skill's workflow, interviews follow this order: executive sponsor first
(strategic context), then department heads (pain points), then IT/data team
(technical landscape), then frontline workers (daily reality).

Since we have not yet conducted interviews, this document serves as a structured
interview plan for the engagement, with the CTO call as the first interview.

---

## Interview 1: CTO (Next Week) — Combined Executive Sponsor + IT/Data Lead

The CTO call is the most critical interview because this person bridges both
the executive sponsor and IT leadership roles. Select 10-12 questions from
both categories.

### Recommended Questions for CTO Call

**Strategic Context (Executive Sponsor Questions)**

1. What are MedTech Solutions' top 3 business priorities this year?
   _Rationale: Anchors AI recommendations to actual business goals._

2. When the CEO says "use AI to modernize operations," what does that mean to
   you specifically? What would success look like in 12 months?
   _Rationale: Tests whether CTO has a more concrete vision than the CEO's
   vague statement. Validates or dismisses the expectations red flag._

3. What's driving the urgency to explore AI now? Is there a competitive threat,
   a board directive, or an operational crisis?
   _Rationale: Understanding the "why now" reveals real motivation and timeline
   pressure._

4. Is there budget allocated for AI initiatives, or are we building the business
   case? Can you share a rough investment range?
   _Rationale: Directly addresses the budget red flag. Frame as calibration,
   not nosiness._

5. Who has final approval authority for AI spend? Is there a procurement process?
   _Rationale: Understand decision-making dynamics before proposal stage._

**Technical Landscape (IT/Data Team Questions)**

6. What EHR/EMR system(s) do you use across clinics? What's the adoption level?
   _Rationale: The EHR is the center of healthcare data. Everything depends on
   this answer. If they have a modern EHR with good adoption, the data score
   may improve significantly._

7. Walk me through the patient data journey — from intake through billing. Where
   is data digital, and where is it still paper?
   _Rationale: Maps the actual data landscape beyond the "paper intake" signal._

8. What's on AWS vs. on-prem? What workloads have you migrated?
   _Rationale: Assesses infrastructure maturity and cloud-readiness for AI
   workloads._

9. What enterprise software tools are you using? Any AI capabilities included?
   (Microsoft 365, Salesforce, etc.)
   _Rationale: Checks for existing licensed AI tools that might be underutilized._

10. Are you aware of any staff using AI tools like ChatGPT or similar in their
    work today — approved or not?
    _Rationale: Shadow AI assessment. Direct but non-judgmental framing._

11. Has your compliance officer been involved in this AI conversation?
    _Rationale: Addresses the compliance red flag directly._

12. Have you attempted any technology modernization projects before? What
    happened?
    _Rationale: Past technology change experiences predict future AI adoption
    success or failure._

### Information to Capture During CTO Call

| Category | Specific Data Points |
| --- | --- |
| Current-state process | End-to-end patient data workflow, digital vs. paper touchpoints |
| Pain points | CTO's top 3 operational pain points, ranked by business impact |
| Data sources | EHR system, data warehousing, analytics tools, reporting |
| Existing AI tools | Licensed tools, utilization rates, shadow AI awareness |
| Appetite for change | 1-5 scale based on conversation tone and specifics |
| AI ideas considered | Any solutions the CTO has already researched or demoed |
| Budget signals | Range, approval process, timeline for procurement |
| Team composition | IT team skills breakdown (dev, ops, data, security) |

---

## Interview 2: CEO (Schedule After CTO Call)

Even though the CEO initiated the engagement, a structured interview is needed
to align on expectations, budget, and success metrics.

### Recommended Questions

1. What are your top 3 business priorities this year?
2. What triggered your interest in AI specifically?
3. What would a successful AI initiative look like in 12 months? How would you
   know it worked?
4. What's the investment range you're comfortable with for a first initiative?
5. Who are the key stakeholders who need to be on board for this to succeed?
6. How does the organization typically handle technology change? Any past
   experiences that inform your expectations?
7. What concerns you most about AI adoption?
8. Are there any internal dynamics I should be aware of?

---

## Interview 3: Department Heads (Operations, Clinic Directors, Billing/Finance)

### Operations / Clinic Director(s)

Focus areas: Clinic workflows, patient flow, staffing, scheduling, bottlenecks.

1. Walk me through a patient's journey from scheduling to checkout
2. What are the most time-consuming manual processes across your clinics?
3. Where do errors or delays most frequently occur?
4. What are your biggest staffing challenges?
5. How do you currently handle patient intake across clinics? Is it consistent?
6. What tools and systems does your clinical staff use daily?
7. Has your team experimented with any AI tools?
8. If you could automate one thing tomorrow, what would it be?

### Billing/Revenue Cycle Manager

Focus areas: Coding accuracy, claim denials, prior auth, revenue leakage.

1. What's your current claim denial rate? What are the top denial reasons?
2. Walk me through the coding process — who codes, what tools do they use?
3. How much time does your team spend on prior authorizations?
4. What's the average time from service to payment?
5. Where does your team spend the most time on rework?
6. What reporting do you produce regularly?
7. What data do you wish you had but currently don't?

---

## Interview 4: Frontline Workers (Clinical Staff, Intake Coordinators, Schedulers)

### Clinical Staff (Physicians, NPs, PAs)

1. Walk me through your typical patient encounter — before, during, and after
2. How much time do you spend on documentation per day?
3. What parts of your job feel repetitive or tedious?
4. Have you used any AI tools for clinical work (note drafting, research, etc.)?
5. What excites or concerns you about AI in your work?
6. If AI could help with one thing in your daily work, what would it be?

### Intake Coordinators / Front Desk Staff

1. Walk me through the intake process for a new patient
2. How long does intake take per patient? What slows it down?
3. What happens to the paper forms after a patient fills them out?
4. What errors or issues come up most often with patient information?
5. What tools do you wish you had?

---

## Cross-Interview Analysis Plan

After each interview, cross-reference for:

- **Contradictions**: What executives say vs. what frontline describes
- **Recurring pain points**: Issues mentioned by 3+ people signal high priority
- **Data availability**: Which processes generate usable digital data vs. paper
- **Change readiness**: Enthusiasm vs. resistance patterns across levels
- **Quick win candidates**: High-pain, high-frequency, digitally-adjacent processes

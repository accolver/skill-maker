# CTO Interview Guide: MedTech Solutions

**Meeting:** First call with CTO
**Duration:** Target 45-60 minutes
**Objective:** Validate hypotheses, assess CTO alignment, get budget signals, map technical landscape, identify quick wins

---

## Pre-Call Reminders

- This is a LISTENING call, not a pitching call. Ratio should be 70% them, 30% you.
- Do NOT present solutions. Gather information.
- Take notes on emotional intensity — strong frustration signals high-value opportunities.
- Capture specific numbers whenever possible (hours, dollars, error rates, headcount).
- Watch for alignment or misalignment between CEO's vision and CTO's reality.

---

## Opening (5 minutes)

Frame the CTO as the expert. Do not start with "the CEO told me..."

> *"Thanks for making time. I've done some background research on MedTech Solutions and the specialty clinic space, but I'd love to hear directly from you. You know this organization better than anyone on the tech side, and I want to make sure any recommendations we make are grounded in your reality, not theoretical."*

Transition question:
> *"Before we dive into AI specifically — what are the top 2-3 technology priorities you're focused on right now?"*

**Why this matters:** This reveals whether AI is already on the CTO's radar or if it is purely a CEO-driven mandate. It also surfaces competing priorities that could affect AI initiative resourcing.

---

## Section 1: Strategic Alignment (10 minutes)

**Goal:** Understand the CTO's perspective on AI, validate CEO alignment, assess genuine buy-in.

Select 4-5 of these questions based on how the conversation flows:

1. *"Where does AI fit in your technology roadmap right now?"*
   - Listen for: genuine enthusiasm vs. obligation

2. *"When [CEO] talks about using AI to modernize operations, what does that mean to you? Where do you see the biggest opportunity?"*
   - Listen for: alignment with CEO vision, specific vs. vague answers

3. *"What would a successful AI initiative look like for you in 12 months?"*
   - Listen for: realistic vs. unrealistic expectations

4. *"Have you looked at any AI solutions or vendors already? What caught your attention?"*
   - Listen for: level of research done, vendor bias, informed vs. uninformed

5. *"What concerns you most about AI adoption in a healthcare environment?"*
   - Listen for: HIPAA awareness, practical concerns vs. abstract fears

6. *"What's driving the urgency to explore AI now? Was there a triggering event?"*
   - Listen for: competitive pressure, board directive, patient complaints, operational crisis

**RED FLAG CHECK:** If the CTO seems disengaged or says things like "CEO wants this, so here we are" — note this. Revisit Red Flag #3.

---

## Section 2: Current Operations & Pain Points (15 minutes)

**Goal:** Map the operational landscape, validate paper-intake hypothesis, find high-impact pain points.

7. *"Walk me through the patient journey from scheduling to post-visit. Where are the biggest bottlenecks?"*
   - Listen for: specific process steps, handoff points, manual work

8. *"You mentioned paper-based intake — help me understand that process. How does patient information get from the paper form into your clinical systems?"*
   - Listen for: data entry workflow, error rates, time cost, staff frustration

9. *"Has the company looked at digitizing intake before? What happened?"*
   - Listen for: previous attempts, why they failed, budget vs. resistance vs. priority
   - **CRITICAL:** This answer informs Red Flag #5

10. *"What are your clinicians' biggest complaints about their daily workflow?"*
    - Listen for: documentation burden, system usability, information access

11. *"Where do errors or quality issues most frequently occur in your operations?"*
    - Listen for: coding errors, scheduling issues, documentation gaps

12. *"What are the most time-consuming administrative processes across your clinics?"*
    - Listen for: prior authorization, coding, scheduling, referral management

**CAPTURE NUMBERS:** For each pain point, try to get quantification:
- "How many patient encounters per week across all clinics?"
- "How much time does data entry from paper forms take per patient?"
- "What's your no-show rate?"
- "How many hours per week does your team spend on prior authorizations?"

---

## Section 3: Technical Infrastructure (10 minutes)

**Goal:** Map the technology stack, validate infrastructure maturity score, identify integration constraints.

13. *"What EHR system are you using?"*
    - Follow-up: "How happy are you with it? What are its limitations?"
    - Follow-up: "Does it have API access? Are you using FHIR endpoints?"

14. *"What's on AWS versus on-prem, and what drove that split?"*
    - Listen for: strategic cloud migration vs. ad-hoc, cost vs. compliance reasons

15. *"Describe your data architecture — where does data live and how does it flow between systems?"*
    - Listen for: integration maturity, data warehouse existence, ETL processes

16. *"Do you have any analytics or reporting infrastructure beyond what your EHR provides?"*
    - Listen for: BI tools, data warehouse, self-service analytics — or lack thereof

17. *"What are the critical systems any new solution would need to integrate with?"*
    - Listen for: EHR, billing/PM system, scheduling, patient portal, lab systems

18. *"How does your team handle HIPAA compliance for cloud services? Do you have BAAs in place with AWS?"*
    - Listen for: compliance maturity, awareness level
    - **RED FLAG CHECK:** If unclear on BAA status, note for Red Flag #4

---

## Section 4: Team & Talent (5 minutes)

**Goal:** Understand IT team composition and capability for AI initiatives.

19. *"Tell me about your IT team — what roles do you have and what do they focus on?"*
    - Listen for: operations-heavy vs. development capability

20. *"Does anyone on your team have experience with data science, ML, or AI?"*
    - Listen for: hidden talent, interest level, training history

21. *"Are any of your teams using AI tools today — even informally? ChatGPT, Copilot, anything like that?"*
    - Listen for: organic adoption signals, shadow AI usage

---

## Section 5: Budget & Timeline (5 minutes)

**Goal:** Get budget signals without being pushy. Resolve Red Flag #1.

22. *"What investment range is your leadership comfortable with for a first initiative?"*
    - If deflected: *"I ask because AI projects range widely — from $25K assessments to $500K+ implementations. Understanding your range helps me tailor recommendations that are realistic for you."*
    - If still no answer: *"Companies your size typically start with a $50K-$150K first initiative. Does that feel like the right ballpark?"*

23. *"What's your ideal timeline for seeing initial results?"*
    - Listen for: realistic (3-6 months) vs. unrealistic (weeks)

24. *"Is there a specific budget cycle or approval process we should be aware of?"*
    - Listen for: fiscal year timing, board approval requirements, procurement process

---

## Section 6: Stakeholder Mapping (5 minutes)

**Goal:** Identify who else needs to be interviewed and who the decision-makers are.

25. *"Beyond yourself, who are the key stakeholders who should be part of this conversation?"*
    - Listen for: department heads, compliance officer, clinical leadership, operations

26. *"Who would be the day-to-day champion for an AI initiative on your side?"*
    - Listen for: whether the CTO sees this as his initiative or is delegating

27. *"Is there anyone who might have concerns about AI that we should engage early?"*
    - Listen for: political dynamics, resistance points, union considerations

---

## Closing (5 minutes)

Summarize what you heard (demonstrates active listening, lets them correct misunderstandings):

> *"Let me play back what I heard to make sure I have it right..."*
> [Summarize 3-4 key points]

Propose next steps:

> *"Based on this conversation, I think the logical next step is [choose one based on how the call went]:*
> - **If high alignment and clear scope:** *"...for us to put together a targeted proposal for a discovery engagement that would map your AI opportunities and give you a prioritized roadmap."*
> - **If more discovery needed:** *"...for me to speak with a few more stakeholders — your [compliance lead, ops director, clinical director] — so we can map the full landscape before making recommendations."*
> - **If red flags surfaced:** *"...to address [specific concern] before we move forward. I'd rather get this right than rush into something."*

> *"What questions do you have for me?"*

---

## Post-Call Checklist

Immediately after the call (within 2 hours), document:

- [ ] CTO alignment assessment (champion / neutral / blocker)
- [ ] Budget range obtained (or strategy for next attempt)
- [ ] EHR system and key technology stack details
- [ ] Top 3 pain points identified (with any numbers captured)
- [ ] Red flags confirmed, mitigated, or newly discovered
- [ ] Stakeholder list for additional interviews
- [ ] Agreed next steps and timeline
- [ ] Updated AI maturity scores based on new information
- [ ] Any surprises or contradictions with pre-call hypotheses

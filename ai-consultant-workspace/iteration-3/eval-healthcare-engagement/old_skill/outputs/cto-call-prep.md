# CTO Call Preparation: MedTech Solutions

## Call Objectives

1. **Validate technical landscape**: EHR system, AWS footprint, API capabilities, data architecture
2. **Assess AI readiness**: Existing tools, team skills, infrastructure maturity
3. **Gauge CTO-CEO alignment**: Does the CTO share the CEO's AI vision? Was CTO involved in the decision to engage a consultant?
4. **Identify red flags or accelerators**: Previous failed initiatives, political dynamics, hidden constraints or hidden assets
5. **Build relationship**: Establish credibility and trust as a prepared, competent consultant

## Pre-Call Checklist

- [ ] Review company-briefing.md (this engagement's research)
- [ ] Search recent MedTech Solutions job postings for technology stack clues
- [ ] Check LinkedIn for CTO background and tenure
- [ ] Prepare 1-2 company-specific observations to demonstrate preparation
- [ ] Have question list printed/accessible (do not read from it robotically)

## Recommended Question Sequence (60-minute call)

### Opening (5 minutes)
- Brief introduction and framing: "I've done initial research on MedTech Solutions and the healthcare AI landscape. My goal for this call is to understand your technical environment and your perspective on where AI can have the most impact. I want to make sure any recommendations we make are grounded in your reality, not generic."
- This signals: I did my homework, I respect your technical judgment, I'm not here to sell you a solution.

### Strategic Context (10 minutes)

1. **"The CEO mentioned wanting to use AI to modernize operations. How do you interpret that vision, and how does it align with your technology roadmap?"**
   - Listen for: alignment vs tension, CTO's own priorities, whether CTO was consulted or informed
   - Red flag: if CTO seems surprised or resistant

2. **"What are your top 3 technology priorities for this year, independent of the AI conversation?"**
   - Listen for: competing priorities, resource constraints, migration projects that might conflict or synergize

3. **"What's driving the urgency to explore AI now? Has something changed competitively or internally?"**
   - Listen for: competitive pressure, board pressure, specific incidents, or just general FOMO

### Technical Landscape (15 minutes)

4. **"What EHR/EMR system are you running, and what version? How satisfied are the clinical staff with it?"**
   - This is the most important technical question. The EHR determines integration paths for every AI opportunity.
   - Follow up: "Does it expose FHIR R4 APIs? HL7 interfaces?"

5. **"Walk me through your current architecture -- what's on-prem, what's in AWS, and what's the migration trajectory?"**
   - Listen for: specific AWS services, BAA status, what's driving the hybrid model (choice vs constraint)
   - Follow up: "Do you have a BAA with AWS?"

6. **"What does your data landscape look like? Do you have a data warehouse, any analytics infrastructure, or is reporting primarily through the EHR?"**
   - Listen for: data maturity signals that validate or adjust our score of 1.5

7. **"Tell me about your team -- the 12 people, how are they allocated? What skills are represented?"**
   - Listen for: capacity constraints, hidden capabilities, any data/analytics talent

### AI Readiness (15 minutes)

8. **"Has anyone on your team or in the clinics experimented with AI tools -- formally or informally?"**
   - Follow up: "Are you aware of employees using ChatGPT, Copilot, or similar tools with patient data?" (shadow AI probe)
   - Listen for: casual mentions that reveal more adoption than expected, or concerning shadow AI usage

9. **"Are any enterprise AI tools currently licensed -- Microsoft Copilot, GitHub Copilot, any AI features in your EHR?"**
   - Listen for: underutilized licenses (quick win: activate what you already pay for)

10. **"Have there been any previous attempts to automate or digitize processes -- including the paper intake? What happened?"**
    - This is the most important cultural question. Listen carefully.
    - If yes: "What went wrong?" / "What would you do differently?"
    - If no: "What prevented it?"

### Compliance and Governance (10 minutes)

11. **"Walk me through your HIPAA compliance program -- who owns it, and how would you evaluate a new AI vendor?"**
    - Listen for: maturity of compliance processes, whether there's a compliance officer, vendor review capability

12. **"What are your biggest concerns about deploying AI tools in a clinical environment?"**
    - Listen for: thoughtful risk awareness (positive) vs dismissiveness (concerning) or paralysis (needs education)

### Wrap-Up (5 minutes)

13. **"Based on what you've seen in the industry, where do you think AI could have the biggest impact at MedTech Solutions?"**
    - Listen for: CTO's own vision and priorities -- these should be incorporated into recommendations

14. **"Who else should I be talking to? Who are the key stakeholders for an initiative like this?"**
    - Listen for: political dynamics, allies, potential blockers

15. **"Is there anything you want to make sure I understand about MedTech Solutions before I go further?"**
    - Open-ended; often surfaces the most valuable information

## What to Listen For

### Positive Signals
- CTO is enthusiastic and aligned with CEO
- Team has some analytics capability even if not ML
- EHR has modern APIs (FHIR R4)
- AWS footprint is meaningful with BAA in place
- Previous technology changes were successful
- CTO has specific ideas about where AI could help
- Compliance program is mature

### Warning Signs
- CTO seems blindsided by the AI initiative
- "We've tried this before and it didn't work" without clear learning
- EHR is very old version with no API
- IT team is overwhelmed just keeping things running
- Political tension between CTO and other leaders
- Dismissive attitude toward AI risks
- No HIPAA compliance ownership
- "We don't really have budget for infrastructure changes"

## After the Call

- [ ] Document all findings within 24 hours
- [ ] Update company-briefing.md with confirmed information
- [ ] Refine AI maturity scores based on new evidence
- [ ] Update red flags assessment
- [ ] Identify any new opportunities or revised priorities
- [ ] Plan next stakeholder interviews based on CTO guidance
- [ ] Send CTO a brief follow-up email thanking them and confirming next steps

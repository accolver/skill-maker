# Validation Thesis

HVAC missed-call recovery is worth pursuing only if warm-access owners will
commit to a real pilot within 7 days, not just agree that missed calls are a
problem. The biggest unknown is willingness to pay for a narrow concierge
outcome: recovering booked jobs from missed inbound calls after hours, during
busy dispatch periods, or when technicians are on-site.

# Key Unknowns

- Primary unknown: willingness-to-pay risk. If owners will not commit to a paid
  pilot or defined implementation slot, the idea is not validated.
- Secondary unknown: workflow-repeatability risk. A concierge service only works
  if missed-call handling can be inserted into normal call flow without custom
  chaos for each shop.
- Secondary unknown: urgency risk. Owners may admit the problem exists but not
  view it as painful enough to act this week.
- Secondary unknown: buyer-access risk is low because there is warm owner access
  through a family member.

# Validation Motion

Use `warm intros + paid pilot` with a concierge delivery framing.

Offer statement:

`I will handle missed inbound calls and text/callback follow-up for your shop for 14 days, using a simple agreed script and scheduling handoff. If I recover at least 3 qualified booking opportunities or clearly prove call leakage is low, you pay a $250 pilot fee up front to reserve the slot.`

Strongest feasible commitment signal:

- Best: collected $250 pilot deposit before starting.
- Acceptable fallback: signed implementation slot with a scheduled kickoff
  inside 7 days if the owner requires invoicing.

# Why Not The Lower-Signal Alternative

Owner interviews alone are too weak here because the user already has warm
access and a service that can be manually delivered immediately. If real buyers
are reachable now, the right test is whether they will commit money or a defined
start date, not whether they say missed calls are frustrating.

# 7-Day Plan

## Day 1

- Get 8 to 12 warm HVAC owner leads through the family connection, prioritizing
  companies with 3 to 20 techs and active inbound call volume.
- Prepare one-page offer, short ROI framing, and a simple pilot agreement.
- Define the pilot rules: call types covered, response window, escalation path,
  booking handoff, and what counts as a qualified recovered opportunity.

## Day 2

- Reach out to 8 to 12 owners for a 15-minute conversation.
- Goal: book at least 5 qualified conversations.
- In each conversation, confirm current missed-call pain, after-hours coverage,
  dispatcher overload, and rough value of one booked service call.
- Ask directly for the paid 14-day pilot at the end of the call.

## Day 3

- Run the remaining conversations.
- Handle objections live and refine the pilot wording only if objections repeat.
- Try to close 1 to 2 pilot commitments the same day.

## Day 4

- Follow up every interested owner with a clear start date, pilot terms, and
  payment link or invoice.
- Push for deposit collection or signed kickoff slot.
- If nobody commits, narrow the wedge rather than broadening it: focus on
  after-hours only or weekend overflow only.

## Day 5

- Start pilot onboarding for any committed shop.
- Capture baseline details: current missed-call handling, estimated lost calls
  per week, average ticket size, and staff coverage windows.
- If no one has committed, run 3 more targeted warm intros using the revised
  wedge.

## Day 6

- For committed pilots, show the owner live evidence: response logs, recovered
  conversations, booking attempts, and operational friction.
- For non-committed prospects, make a final close attempt with the narrowed
  offer.

## Day 7

- Decide `go`, `revise`, or `kill` strictly from commitment signals.
- Summarize objections, who paid, who asked for a start date, and where the
  service broke operationally.

# Success Criteria

- `Go`: 5 or more qualified owner conversations and at least 2 paid pilot
  deposits, or 1 paid deposit plus 1 signed implementation slot with kickoff
  scheduled inside 7 days.
- `Revise`: 5 or more qualified owner conversations and exactly 1 strong
  commitment, with a clear repeated objection that suggests a narrower wedge,
  lower-risk offer, or different pricing structure.
- Supporting signal: at least 3 owners independently describe missed calls as a
  weekly revenue leak worth fixing now.

Why these numbers:

- Warm intros should produce 5 to 10 conversations in a week if access is real.
- The metrics reference suggests 5 to 10 qualified interviews and 1 to 3 paid
  pilots as decision-grade thresholds.
- Because this is a high-trust warm-access test with a manually deliverable
  service, fewer than 2 strong commitments is not enough to call the wedge
  validated.

# Kill Criteria

- Fewer than 5 qualified owner conversations from 8 to 12 warm outreaches.
- Zero owners will pay a deposit or reserve a kickoff slot within 7 days.
- Most interested owners demand custom call-center breadth beyond the narrow
  wedge.
- Operational setup appears too custom across shops to run even one pilot
  without heavy manual reinvention.

# Evidence To Capture

- Number of warm intros requested, made, and replied to.
- Number of qualified owner conversations completed.
- Number of direct pilot asks made.
- Number of deposits collected.
- Number of signed kickoff slots scheduled.
- Common objections, especially around trust, pricing, and workflow fit.
- For any pilot started: recovered opportunities, bookings attempted, bookings
  completed, and owner time required.

# Structured Plan

```json
{
  "validation_thesis": "HVAC missed-call recovery is worth pursuing only if warm-access HVAC owners will commit within 7 days to a paid or clearly scheduled pilot for a narrow concierge service that recovers booked jobs from missed inbound calls.",
  "key_unknowns": [
    "Primary: willingness-to-pay risk. Owners may acknowledge missed calls but refuse to commit money or a defined start date.",
    "Secondary: workflow-repeatability risk. The service may require too much shop-specific customization to be a viable wedge.",
    "Secondary: urgency risk. Owners may not see missed-call recovery as urgent enough to act this week.",
    "Secondary: buyer-access risk is relatively low because the user has warm owner access through a family member."
  ],
  "motion": "Warm intros plus paid concierge pilot for HVAC owners, using a 14-day missed-call recovery offer and asking for a $250 deposit or a scheduled implementation slot.",
  "day_by_day_plan": [
    "Day 1: Source 8-12 warm HVAC owner leads, prepare one-page offer, and define pilot rules.",
    "Day 2: Reach out to 8-12 owners, book at least 5 qualified conversations, and ask for the pilot on each call.",
    "Day 3: Complete conversations, refine wording only if objections repeat, and try to close 1-2 pilot commitments.",
    "Day 4: Send follow-up terms and payment link or invoice, push for deposit or kickoff date, and narrow the wedge if nobody commits.",
    "Day 5: Onboard committed pilots and capture baseline data, or run 3 more targeted warm intros if no one committed.",
    "Day 6: Show live evidence for active pilots and make final close attempts with narrowed positioning.",
    "Day 7: Decide go, revise, or kill from commitment signals and summarize objections plus operational friction."
  ],
  "success_criteria": [
    "Go: at least 5 qualified owner conversations and at least 2 paid pilot deposits, or 1 paid deposit plus 1 signed implementation slot with kickoff scheduled inside 7 days.",
    "Revise: at least 5 qualified owner conversations and exactly 1 strong commitment, with a repeated objection that indicates a narrower wedge or pricing change.",
    "At least 3 owners independently describe missed calls as a weekly revenue leak worth fixing now."
  ],
  "kill_criteria": [
    "Fewer than 5 qualified owner conversations from 8-12 warm outreaches.",
    "Zero owners will pay a deposit or reserve a kickoff slot within 7 days.",
    "Interested owners require broad custom call-center work beyond the narrow wedge.",
    "Operational setup is too custom across shops to run even one pilot without heavy manual reinvention."
  ],
  "evidence_to_capture": [
    "Warm intros requested, made, and replied to.",
    "Qualified owner conversations completed.",
    "Direct pilot asks made.",
    "Deposits collected.",
    "Signed kickoff slots scheduled.",
    "Common objections around trust, pricing, and workflow fit.",
    "If a pilot starts: recovered opportunities, booking attempts, completed bookings, and owner time required."
  ]
}
```

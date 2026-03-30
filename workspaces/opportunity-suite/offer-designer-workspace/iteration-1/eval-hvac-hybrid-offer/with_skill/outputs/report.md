# Offer Thesis

The first sellable offer should be a concierge hybrid service, not software: an
AI-assisted missed-call recovery layer for HVAC owners who already know calls
are leaking revenue but do not want to buy, learn, or trust a standalone tool
yet. The wedge is narrow and urgent because every missed inbound call can
represent an emergency repair, replacement estimate, or maintenance booking that
is time-sensitive and high value.

# ICP

- Buyer: owner or operator of a small-to-mid-sized HVAC service business with
  authority to change call handling and follow-up
- Segment: HVAC companies with live inbound demand, inconsistent after-hours
  coverage, or front-desk gaps that lead to missed calls and slow callback times
- Why now: peak-season call spikes, technician shortages, and expensive lead
  generation make dropped calls feel more painful than abstract efficiency
  problems

# Offer Design

- Primary offer shape: concierge hybrid that can later productize
- Why this shape wins: it fits low-trust buyers better than software-first
  tooling because the user can sell an outcome immediately using a mix of manual
  service, lightweight AI assistance, and clear operating rules before any
  platform exists
- Painful job to be done: recover revenue from missed inbound calls without
  asking the HVAC owner to redesign their office workflow first
- Core outcome: more missed calls turned into booked callbacks, appointments, or
  quoted opportunities within a defined response window

## Deliverables

- missed-call recovery workflow tailored to the HVAC shop's hours, service area,
  and call types
- AI-assisted response and callback handling layer for missed inbound calls,
  especially after-hours and overflow periods
- call triage rules separating emergency service, standard service, new install
  leads, maintenance, spam, and non-service inquiries
- callback and text scripts tuned for HVAC context, including urgency,
  seasonality, and homeowner objections
- daily or weekly recovery report showing missed calls, contact attempts,
  conversations started, and booked next steps
- owner handoff rules for edge cases such as financing questions, complex
  install quoting, or regulated claims the service should not make

## Scope Boundaries

- focused only on missed inbound-call recovery, not full CSR replacement
- does not promise 24/7 dispatch operations for every job type unless explicitly
  staffed and sold that way
- does not guarantee booked revenue, only a measurable recovery process and
  response standard
- does not provide licensed HVAC advice, rebate guidance, financing decisions,
  or regulated claims on behalf of the business
- does not require custom software in version one; delivery can be powered by
  existing phone logs, texting tools, AI drafting, and manual concierge
  execution

# Pricing Hypothesis

- Primary model: setup fee plus monthly retainer
- Hypothesis: `$1,500-$3,500` setup and `$2,000-$5,000` per month for one
  location
- Pricing rationale: the offer touches live revenue recovery, can be deployed
  quickly, and saves owner attention during high-value missed-call windows;
  pricing should stay anchored to one location, call volume, hours covered, and
  whether after-hours handling is included
- Evidence that would adjust price:
  - weekly missed-call volume
  - average job value and close rate
  - required coverage window, especially nights and weekends
  - how much manual concierge handling is needed before the workflow is stable

# Rejected Framings

- Software-first missed-call SaaS: wrong first step because trust is still
  unproven and the buyer wants recovered jobs, not another tool to configure
- Broad "AI for home services" agency offer: too vague to sell and too easy to
  compare with generic automation freelancers
- Full virtual dispatcher promise: risks operational overreach and sets
  expectations beyond the narrow wedge of missed-call recovery
- Anything implying licensed technical advice or deceptive customer
  representation: unsafe and unnecessary for the first offer

# Structured Offer

```json
{
  "offer_thesis": "A concierge hybrid missed-call recovery service for HVAC owners that uses AI-assisted triage, texting, and callback workflows to recover lost inbound opportunities before building software.",
  "icp": {
    "buyer": "Owner or operator of a small-to-mid-sized HVAC service business",
    "segment": "HVAC companies with meaningful inbound call volume, missed-call leakage, and weak after-hours or overflow follow-up",
    "why_now": "Peak-season demand, staffing gaps, and high lead costs make missed calls feel like immediate lost revenue."
  },
  "offer_shape": "Concierge hybrid that can later productize",
  "deliverables": [
    "Missed-call recovery workflow tailored to hours, geography, and call types",
    "AI-assisted triage, text follow-up, and callback handling for missed inbound calls",
    "HVAC-specific scripts for emergency, service, install, and maintenance inquiries",
    "Daily or weekly recovery reporting with booked next steps and unresolved cases",
    "Escalation rules for owner or office handoff on edge cases"
  ],
  "scope_boundaries": [
    "Missed inbound-call recovery only, not full dispatch or CSR replacement",
    "No guarantee of revenue outcomes",
    "No licensed HVAC advice, financing decisions, or regulated claims",
    "No custom software required in version one"
  ],
  "pricing_hypothesis": {
    "model": "Setup fee plus monthly retainer",
    "range_or_price": "$1,500-$3,500 setup and $2,000-$5,000 per month per location",
    "pricing_rationale": "Pricing should reflect speed to deploy, live revenue impact, location count, missed-call volume, and coverage window rather than pretend product-style precision."
  },
  "rejected_framings": [
    "Software-first missed-call SaaS",
    "Broad AI agency for home services",
    "Full virtual dispatcher promise",
    "Any offer implying licensed technical or regulated-role overreach"
  ],
  "open_questions": [
    "How many missed calls per week does the target HVAC shop currently lose?",
    "What is the typical revenue value of a recovered service call, maintenance booking, or install lead?",
    "How much after-hours and weekend coverage must be included in the first version?",
    "Will the business allow texting from its main number or require a separate workflow?"
  ]
}
```

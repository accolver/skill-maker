# Software Decision Scope: Therapist Benchmark/Template Offer

## Readiness Verdict

`stay_manual_for_now`

The audience is real and there is at least some paid demand because a
benchmark/template product already sells. That is a meaningful validation
signal. But the evidence described here is still weak for software
productization because there is not yet clear proof that the same
software-suitable workflow is repeatedly painful across many buyers.

Why this is the right decision now:

- Paid demand exists for information and templates, not yet clearly for an app.
- Buyer access exists through the niche therapist audience.
- Repetition is not strong enough yet: the prompt says there is little evidence
  that a workflow is repeatedly painful.
- Implementation risk is high relative to certainty, because software would
  likely guess at the pain before it has been observed enough times.

## Product Wedge

If software later becomes justified, the narrowest credible wedge is:

- Primary user: solo or small-practice therapist who already bought or used the
  benchmark/template offer.
- One narrow job: turn a benchmark/template into a customized practice decision
  or action plan faster.
- One core workflow: therapist enters a few practice facts, the system applies
  the benchmark/template logic, and produces a tailored recommendation or filled
  draft.
- Productization trigger: repeated evidence that buyers ask for the same
  customization, interpretation, or update step often enough that manual
  fulfillment becomes slow, error-prone, or hard to scale.

## Manual vs Automated

What remains manual now:

- Selling the benchmark/template product.
- Collecting customer questions during onboarding, email, or calls.
- Helping users interpret the benchmark for their specific practice.
- Delivering custom examples, recommendations, or template tweaks by hand.
- Tracking which requests recur most often.

What gets automated first if the trigger appears:

- A guided intake form for the therapist's key practice inputs.
- Auto-generation of one standardized output: a filled benchmark summary,
  recommended target, or action-plan draft.
- Simple rules-based recommendations based on common therapist scenarios.
- Human escalation when the case falls outside known patterns.

What not to build yet:

- Broad practice management software.
- Scheduling, billing, EHR, CRM, or multi-integration features.
- Team workflows or admin dashboards.
- Marketplace/community features.
- AI copilots for open-ended clinical or business advice.

## MVP Boundary

Keep any future MVP narrower than "software for therapists".

- One user role: the therapist buyer.
- One core workflow: input practice details -> receive one benchmark-driven
  output.
- One key input: a short structured questionnaire.
- One key output: a single tailored benchmark report or draft action plan.
- One escalation trigger: unusual practice situation or missing data routes to
  manual review.

## Do Not Build Yet

- Multi-sided platforms.
- Broad dashboards with analytics for everything.
- Integrations before the core workflow is proven.
- Admin-heavy configuration systems.
- Generic template libraries without proof that automation is the real
  bottleneck.

## Structured Scope

```json
{
  "readiness_verdict": "stay_manual_for_now",
  "product_wedge": {
    "primary_user": "Solo or small-practice therapist who already values benchmark/template guidance",
    "job_to_be_done": "Turn a benchmark/template into a tailored practice recommendation or draft faster",
    "core_workflow": "Therapist submits a few structured practice inputs and receives one benchmark-driven output"
  },
  "manual_work": [
    "Sell the benchmark/template product",
    "Collect recurring customer questions and requests",
    "Interpret results for the therapist's specific situation",
    "Deliver custom examples or template tweaks by hand",
    "Track whether the same requests repeat often enough to justify software"
  ],
  "automated_first": [
    "Guided intake form for structured practice inputs",
    "Auto-generated benchmark summary or action-plan draft",
    "Rules-based recommendations for common scenarios",
    "Human escalation for edge cases"
  ],
  "mvp_boundary": [
    "One user role: therapist buyer",
    "One workflow: structured input to one tailored output",
    "One key input: short questionnaire",
    "One key output: benchmark-driven report or draft",
    "One escalation path to manual review"
  ],
  "productization_trigger": "Build only after the same customization or interpretation workflow repeatedly appears across enough therapist customers that manual delivery becomes a clear bottleneck",
  "do_not_build_yet": [
    "Practice management platform features",
    "Scheduling, billing, EHR, or CRM integrations",
    "Broad dashboards",
    "Team/admin workflows",
    "Marketplace or community features",
    "Open-ended AI advisor features"
  ]
}
```

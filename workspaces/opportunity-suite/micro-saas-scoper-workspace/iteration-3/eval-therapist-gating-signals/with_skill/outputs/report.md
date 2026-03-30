# Readiness Verdict

`stay_manual_for_now`

The opportunity has two meaningful positives: a niche therapist audience and an
existing paid benchmark/template product, which suggest buyer access and some
willingness to pay. But the key productization signal is still weak: there is
little evidence yet that one therapist workflow is repeatedly painful in the
same way across customers.

That matters because software should be earned by repetition, not by the
existence of content or templates alone. Right now the strongest validated asset
appears to be a paid information/productized-service artifact, not a clearly
repeated operational workflow with consistent inputs, outputs, and escalation
points.

## Why This Verdict

- Validation evidence: positive but incomplete, because paid demand exists for
  templates/benchmarks but not yet for a repeat software workflow.
- Buyer access: strong enough, since there is already a niche therapist
  audience.
- Repetition: weak, because the prompt does not show that the same operational
  pain appears often enough across buyers.
- Implementation risk: moderate to high, because therapist workflows often vary
  by practice style, compliance posture, niche, and client process.

# Product Wedge

If software becomes justified later, the narrowest credible wedge is:

- One narrow job: turn a therapist's raw practice inputs into a benchmarked
  practice-planning output.
- One primary user: solo or small-practice therapist owner.
- One core workflow: therapist enters a small set of practice metrics and
  receives a benchmark/template-guided recommendation or output.
- One productization trigger: the same input-to-output workflow is repeatedly
  requested and delivered with only minor variation.

This is still only a candidate wedge, not a v1 commitment yet.

# Manual vs Automated

What remains manual:

- Interview therapists to identify which recurring workflow is painful enough to
  pay to remove.
- Deliver benchmark interpretation and template customization by hand.
- Validate whether the same inputs and outputs recur across multiple therapist
  customers.

What gets automated first:

- A single structured intake form for the benchmark/template workflow.
- A rules-based generation step that produces one standardized output.
- A clear human-escalation flag when the case falls outside the standard
  pattern.

What not to build yet:

- A therapist practice operating system or broad back-office platform.
- Multi-step workflow automation across intake, analytics, follow-up, and CRM.
- Integrations with EHR, billing, scheduling, or email tools.

# MVP Boundary

Keep any future MVP narrower than the user's first instinct:

- One user role: therapist owner only.
- One core workflow: structured intake to one benchmarked output.
- One key input: a fixed set of practice metrics.
- One key output: one recommendation/template package.
- One escalation trigger: incomplete or atypical practice data.

# Do Not Build Yet

- Broad dashboards covering many practice KPIs.
- Team collaboration, permissions, or admin tooling.
- Marketplace, community, or multi-sided network features.
- Integrations before the core value is proven.
- AI-heavy personalization that depends on messy bespoke data.

# Gating Signals

The verdict should flip only when at least these signals appear:

- At least several therapist customers independently request help with the same
  workflow, not just the same topic area.
- The manual delivery process repeatedly uses the same core inputs and produces
  the same core output with limited customization.
- Customers show willingness to pay specifically for speed, consistency, or
  self-serve completion of that workflow rather than for advisory help alone.

# Structured Scope

```json
{
  "readiness_verdict": "stay_manual_for_now",
  "product_wedge": {
    "primary_user": "Solo or small-practice therapist owner",
    "job_to_be_done": "Turn a therapist's raw practice inputs into a benchmarked practice-planning output",
    "core_workflow": "Therapist submits a fixed set of practice metrics and receives one benchmark/template-guided recommendation or output"
  },
  "manual_work": [
    "Interview therapists to identify which recurring workflow is painful enough to pay to remove",
    "Deliver benchmark interpretation and template customization by hand",
    "Validate whether the same inputs and outputs recur across multiple therapist customers"
  ],
  "automated_first": [
    "A single structured intake form for the benchmark/template workflow",
    "A rules-based generation step that produces one standardized output",
    "A clear human-escalation flag when the case falls outside the standard pattern"
  ],
  "mvp_boundary": [
    "One user role: therapist owner only",
    "One core workflow: structured intake to one benchmarked output",
    "One key input: a fixed set of practice metrics",
    "One key output: one recommendation/template package",
    "One escalation trigger: incomplete or atypical practice data"
  ],
  "productization_trigger": "The same input-to-output workflow is repeatedly requested and delivered with only minor variation",
  "do_not_build_yet": [
    "A therapist practice operating system or broad back-office platform",
    "Multi-step workflow automation across intake, analytics, follow-up, and CRM",
    "Integrations with EHR, billing, scheduling, or email tools",
    "Broad dashboards covering many practice KPIs",
    "Team collaboration, permissions, or admin tooling"
  ]
}
```

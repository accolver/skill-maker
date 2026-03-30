# Readiness Verdict

`stay_manual_for_now`

The audience is real and reachable because there is already a niche therapist
buyer and a paid benchmark/template product. That is meaningful validation of
demand for expertise and packaged guidance.

The missing signal is repeated workflow pain that is consistent enough to
compress into software. The current evidence points to therapists paying for
templates and benchmarks, not clearly paying to remove the same recurring
operational task over and over. Based on the skill's productization signals,
this is not yet strong evidence for a software build.

## Product Wedge

If software becomes justified later, the narrowest wedge is:

- One narrow job: turn therapist practice inputs into a benchmarked practice
  snapshot with recommended template outputs.
- One primary user: a solo or small-practice therapist owner.
- One core workflow: submit practice data, compare against benchmark ranges,
  receive a tailored summary plus recommended template next steps.
- One productization trigger: repeated proof that therapists consistently
  struggle to assemble, benchmark, and update this snapshot manually and will
  pay to save time on that exact workflow.

## Manual vs Automated

What remains manual:

- Collect therapist pain points through interviews, sales calls, and product
  support.
- Deliver benchmark interpretation and edge-case recommendations manually.
- Adapt templates for unusual practice structures or specialty-specific needs.
- Validate whether the same data fields and output format recur across
  customers.

What gets automated first:

- Intake form that standardizes the benchmark inputs.
- Rules-based generation of a benchmark summary from common inputs.
- Template recommendation based on a small number of practice characteristics.

## MVP Boundary

If a build is later justified, keep v1 to a single therapist-facing workflow:

- One user role: therapist owner.
- One key input: a short standardized set of business or practice metrics.
- One key output: a benchmark summary with the next best template/action.
- One escalation trigger: any incomplete, unusual, or out-of-range practice
  profile routes to manual review.

## Do Not Build Yet

- A broad practice-management platform.
- Multi-user collaboration for staff, consultants, and admins.
- EHR, billing, scheduling, or CRM integrations.
- Large benchmarking dashboards and analytics suites.
- Marketplace, community, or directory features.
- AI-generated advisory features beyond narrow template selection and summary
  drafting.

## Structured Scope

```json
{
  "readiness_verdict": "stay_manual_for_now",
  "product_wedge": {
    "primary_user": "Solo or small-practice therapist owner",
    "job_to_be_done": "Turn practice inputs into a benchmarked practice snapshot with recommended template next steps",
    "core_workflow": "The therapist submits a standardized set of practice data, receives a benchmark comparison, and gets a recommended template or next action"
  },
  "manual_work": [
    "Collect therapist pain points through interviews, sales calls, and support",
    "Interpret benchmark results for edge cases and unusual practices",
    "Adapt templates for specialty-specific or non-standard situations",
    "Verify that the same input fields and outputs recur across customers"
  ],
  "automated_first": [
    "Standardized intake form for benchmark inputs",
    "Rules-based benchmark summary generation",
    "Basic template recommendation based on a few practice characteristics"
  ],
  "mvp_boundary": [
    "One user role: therapist owner",
    "One core workflow: intake to benchmark summary to template recommendation",
    "One key input: standardized practice metrics",
    "One key output: benchmark summary with next best template/action",
    "One human escalation trigger for incomplete, unusual, or out-of-range cases"
  ],
  "productization_trigger": "Evidence that many therapists repeatedly struggle with the same benchmarking-and-template workflow, use the same inputs and outputs, and will pay specifically to automate that repeated task",
  "do_not_build_yet": [
    "Broad practice-management platform",
    "Multi-user collaboration and admin tooling",
    "EHR, billing, scheduling, or CRM integrations",
    "Broad dashboards and analytics suites",
    "Marketplace or community features",
    "Open-ended AI advisory functionality"
  ]
}
```

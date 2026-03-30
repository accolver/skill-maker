# Readiness Verdict

`conditional_build`

This recruiting concierge has real productization signals: repeat clients, a
repeated workflow, and clear operational steps around sourcing, screening,
outreach, scheduling, and reporting. But the core value inflection point,
deciding whether a fractional CFO is truly a strong match for a client, still
depends heavily on human judgment and is likely too bespoke to trust to software
as the core product today.

Software is justified now only if the first version is constrained to compress
the repetitive operating work around placements while keeping the final match
recommendation human-reviewed.

# Product Wedge

- Primary user: the recruiting operator or founder running searches for
  fractional CFO roles
- One narrow job: turn an intake and candidate pool into an organized,
  human-reviewed shortlist pipeline for repeat CFO searches
- One core workflow: intake -> source/import candidates -> AI-assisted screening
  summaries -> outreach tracking -> interview scheduling -> client status report
- Productization trigger: the same search operations repeat across enough
  searches that saving operator time and improving throughput matters more than
  inventing a fully automated matching engine

# Manual vs Automated

## What remains manual

- Final candidate-client match judgment, especially around nuance like
  leadership style, stakeholder fit, stage fit, and credibility with founders or
  boards
- Approval of shortlist recommendations before candidates are shown to clients
- Handling exceptions in outreach, such as high-value candidates, sensitive
  compensation conversations, or unusual search constraints
- Calibration calls with repeat clients when the brief is underspecified or has
  changed since prior searches

## What gets automated first

- Converting client intake notes into a structured search brief with required
  and preferred attributes
- Aggregating sourced candidates from spreadsheets, LinkedIn exports, email
  threads, and ATS notes into one pipeline record
- Generating AI-assisted screening summaries from resumes, profiles, and notes
- Drafting personalized outreach and follow-up sequences for operator approval
- Coordinating scheduling logistics and reminders once a candidate reaches the
  interview stage
- Producing client-ready weekly status reports showing funnel progress,
  candidate movement, and blockers

# MVP Boundary

- One user role: internal recruiting operator only
- One key input: a client search brief for a fractional CFO placement
- One key output: a human-reviewed shortlist pipeline plus a client status
  report
- One escalation trigger: any candidate recommendation or rejection that depends
  on soft-fit judgment or conflicting evidence goes to human review
- Single workflow only: manage one retained or repeat-search process from intake
  through reporting
- Human approval required before outreach send, shortlist share, or
  client-facing recommendation

# Do Not Build Yet

- Fully automated candidate-client matching or ranking without mandatory human
  review
- A two-sided marketplace for clients and CFO candidates
- Broad analytics dashboards beyond the client report needed to run the current
  search
- Deep integrations with every ATS, CRM, and scheduling tool before the core
  operator workflow proves value
- Candidate self-serve portals or complex client collaboration workspaces in v1
- Automated compensation benchmarking or assessment products outside the
  placement workflow

# Structured Scope

```json
{
  "readiness_verdict": "conditional_build",
  "product_wedge": {
    "primary_user": "Recruiting operator running fractional CFO searches for repeat clients",
    "job_to_be_done": "Turn a client intake and candidate pool into an organized, human-reviewed shortlist pipeline for fractional CFO placements.",
    "core_workflow": "Intake structured search brief, ingest candidates, generate AI-assisted screening summaries, manage outreach and scheduling, and produce client status reports for human-reviewed shortlist decisions."
  },
  "manual_work": [
    "Make the final candidate-client fit judgment based on nuanced leadership, stage, and stakeholder-fit factors.",
    "Approve shortlist recommendations before anything is sent to clients.",
    "Handle exception outreach and sensitive candidate conversations.",
    "Run calibration with clients when briefs are ambiguous or changing."
  ],
  "automated_first": [
    "Convert intake notes into a structured search brief.",
    "Aggregate sourced candidates and notes into one search pipeline.",
    "Generate AI-assisted screening summaries and highlight gaps.",
    "Draft outreach and follow-up messages for approval.",
    "Coordinate scheduling and reminders.",
    "Generate recurring client status reports."
  ],
  "mvp_boundary": [
    "Internal recruiting operator is the only primary user.",
    "The product handles one workflow: intake to client reporting for a single search.",
    "The main input is a fractional CFO search brief.",
    "The main output is a human-reviewed shortlist pipeline and status report.",
    "Human escalation is required whenever soft-fit judgment determines the decision.",
    "Human approval is required before outreach, shortlist sharing, or recommendations."
  ],
  "productization_trigger": "Repeat fractional CFO searches create enough repeated operational work that reducing operator time in sourcing-to-reporting matters, even while match judgment stays human-led.",
  "do_not_build_yet": [
    "Fully automated matching or ranking without human review.",
    "A two-sided client-candidate marketplace.",
    "Broad dashboards beyond immediate search reporting.",
    "Large integration surface area before workflow value is proven.",
    "Candidate or client self-serve portals in v1.",
    "Adjacent products like compensation benchmarking or assessments."
  ]
}
```

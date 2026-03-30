# Readiness Verdict

`conditional_build`

This operation has real productization signals, but only for a narrow internal
tool, not for a full recruiting automation platform yet.

- Strong signals: the business has repeat clients, paid demand already exists,
  and sourcing/screening/reporting happen repeatedly across searches.
- Weak signals: the core match decision still depends heavily on human judgment,
  which means the highest-value step is not yet cleanly compressible into
  software.
- Conclusion: build software only around the most repeatable pre-judgment
  workflow and keep final matching, outreach nuance, and client calibration
  human-led.

Gating signals that would flip this toward `build_now` for a larger product
surface:

- At least 70 percent of shortlisted candidates can be accepted or rejected
  using the same explicit scorecard without major recruiter reinterpretation.
- The team runs enough similar fractional CFO searches each month that the same
  intake-to-triage packet is reused with minimal customization.
- Clients consistently accept AI-prepared shortlist rationale and status updates
  with only light edits from the recruiting team.

# Product Wedge

- Primary user: the recruiting operator or search lead running a fractional CFO
  search.
- One narrow job: turn raw candidate profiles into a structured first-pass
  shortlist packet for human review.
- One core workflow: ingest the client brief and candidate inputs, extract
  evidence against a search scorecard, rank candidates by fit confidence, and
  escalate uncertain cases for human judgment.
- Productization trigger: the same scorecard-based shortlist packet is being
  produced repeatedly for similar CFO searches across repeat clients.

# Manual vs Automated

Manual work:

- Calibrating the search brief with the client, especially around soft factors
  like executive presence, board readiness, and chemistry.
- Making the final match judgment when a candidate's narrative, context, or
  tradeoffs are ambiguous.
- Personalizing high-stakes outreach to top candidates and handling
  back-and-forth that depends on relationship context.
- Running client conversations about tradeoffs, compensation expectations, and
  why one candidate is stronger than another.

Automated first:

- Normalize resumes, LinkedIn exports, and notes into one candidate profile
  format.
- Extract evidence for explicit criteria such as industry exposure, stage fit,
  finance leadership scope, and availability.
- Generate a recruiter-facing ranked review queue with confidence flags and
  missing-data alerts.
- Draft a client-ready shortlist summary that the recruiter can edit before
  sending.

# MVP Boundary

- Build for one user role only: the internal recruiting operator, not candidates
  and not clients.
- Support one core workflow only: search-specific candidate triage into a review
  packet.
- Use one key input: search brief plus candidate profile data.
- Produce one key output: a structured shortlist packet with ranked candidates,
  rationale, and escalation flags.
- Include one human escalation trigger: low-confidence matches or incomplete
  evidence must be reviewed manually.

# Do Not Build Yet

- End-to-end sourcing automation across multiple channels.
- Autonomous candidate outreach sequences sent without recruiter approval.
- Self-serve client dashboards with broad reporting and collaboration features.
- Interview scheduling orchestration as a core product surface.
- A two-sided marketplace matching clients directly to CFO talent.
- Deep integrations before the shortlist workflow proves value.

# Structured Scope

```json
{
  "readiness_verdict": "conditional_build",
  "product_wedge": {
    "primary_user": "Recruiting operator or search lead for fractional CFO placements",
    "job_to_be_done": "Turn raw candidate profiles into a structured first-pass shortlist packet for human review",
    "core_workflow": "Ingest a client brief and candidate inputs, extract evidence against a search scorecard, rank candidates by fit confidence, and escalate uncertain cases for human judgment"
  },
  "manual_work": [
    "Calibrating the search brief with the client around soft factors like executive presence, board readiness, and chemistry",
    "Making the final match judgment when a candidate's narrative, context, or tradeoffs are ambiguous",
    "Personalizing high-stakes outreach to top candidates and handling relationship-driven follow-up",
    "Running client conversations about candidate tradeoffs, compensation expectations, and final recommendations"
  ],
  "automated_first": [
    "Normalize resumes, LinkedIn exports, and notes into one candidate profile format",
    "Extract evidence for explicit criteria such as industry exposure, stage fit, finance leadership scope, and availability",
    "Generate a recruiter-facing ranked review queue with confidence flags and missing-data alerts",
    "Draft a client-ready shortlist summary that the recruiter can edit before sending"
  ],
  "mvp_boundary": [
    "One user role: the internal recruiting operator",
    "One core workflow: search-specific candidate triage into a review packet",
    "One key input: search brief plus candidate profile data",
    "One key output: structured shortlist packet with ranked candidates, rationale, and escalation flags",
    "One escalation trigger: low-confidence matches or incomplete evidence require manual review"
  ],
  "productization_trigger": "The same scorecard-based shortlist packet is being produced repeatedly for similar fractional CFO searches across repeat clients",
  "do_not_build_yet": [
    "End-to-end sourcing automation across multiple channels",
    "Autonomous candidate outreach sequences sent without recruiter approval",
    "Self-serve client dashboards with broad reporting and collaboration features",
    "Interview scheduling orchestration as a core product surface",
    "A two-sided marketplace matching clients directly to CFO talent",
    "Deep integrations before the shortlist workflow proves value"
  ]
}
```

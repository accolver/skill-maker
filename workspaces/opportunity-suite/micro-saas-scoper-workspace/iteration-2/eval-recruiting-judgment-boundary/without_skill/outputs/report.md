# Recruiting Automation Scope Decision

## Executive Summary

This business should not start by building a fully autonomous recruiting
platform for fractional CFO placements. The workflow has many automatable steps,
but final matching quality appears to depend on nuanced human judgment about
credibility, communication style, stakeholder fit, change-stage fit, and
client-specific context. That means the right software decision is a
judgment-amplifying concierge system, not an end-to-end replacement system.

The best immediate product scope is an internal operator platform that automates
sourcing, enrichment, first-pass screening, outreach drafting, scheduling
coordination, and client reporting, while keeping humans in control of shortlist
approval and match recommendation. This can produce near-term ROI quickly
because the current business already has repeat demand and repeatable process
steps, even if the final recommendation still needs a human.

## Core Decision

Build a vertical AI copilot for the recruiting operator, not a fully self-serve
marketplace or fully autonomous agent.

## Why

1. There is clear operational pain in sourcing, screening, outreach, scheduling,
   and reporting.
2. These steps are repetitive enough to automate immediately.
3. Final candidate-client matching is still judgment-bound, which makes full
   automation risky.
4. Repeat clients create an opportunity to accumulate structured preference data
   over time.
5. An internal-first system can ship faster, improve margins, and generate
   proprietary matching data before any client-facing product expansion.

## Judgment Boundary

### Good AI automation candidates now

1. Candidate sourcing from LinkedIn, resume databases, referrals, and prior
   pipeline.
2. Resume parsing and profile normalization.
3. Experience extraction: company stage, industry, finance systems, fundraising,
   M&A, turnaround, board exposure, PE-backed experience.
4. Candidate outreach personalization.
5. Inbox triage and response classification.
6. Screening questionnaire generation and answer summarization.
7. Interview scheduling and reminder handling.
8. Client status updates and pipeline reporting.
9. Draft shortlist memos and candidate summaries.
10. CRM/ATS data entry and deduplication.

### Human-owned decisions that should remain manual initially

1. Whether a candidate is truly credible beyond resume keywords.
2. Whether communication style matches founder or investor expectations.
3. Whether a fractional CFO can operate at the client’s actual stage and chaos
   level.
4. Whether the role should be reframed before search starts.
5. Whether tradeoffs between price, availability, and quality are acceptable.
6. Final shortlist approval.
7. Final match recommendation.

### Signals that are hard to model early

1. Executive presence.
2. Ability to influence founders without overbuilding finance.
3. Appetite for messy, part-time, ambiguous environments.
4. Context-specific chemistry with the client.
5. Pattern recognition from prior successful placements.

## Recommended Product Scope

## Phase 1: Internal operator console

Ship the smallest system that helps a human recruiter complete searches faster
and more consistently.

### Core modules

1. Search intake Capture role requirements, company stage, industry, budget,
   urgency, investor context, and "must-not-have" constraints.
2. Candidate knowledge base Store structured candidate histories, notes,
   transcripts, outreach history, and placement outcomes.
3. AI screening layer Score candidates against explicit criteria, generate
   gaps/questions, and flag unclear claims.
4. Outreach and follow-up automation Draft personalized emails and LinkedIn
   messages, track replies, and sequence nudges.
5. Scheduling coordinator Propose times, confirm interviews, and handle
   reschedules.
6. Client reporting Auto-generate weekly pipeline reports, shortlist packets,
   and rationale summaries.
7. Human decision workspace Let operators adjust scores, override rankings,
   record reasoning, and approve every shortlist.

## Phase 2: Learning system for repeat clients

Once the operator workflow is stable, layer in preference memory.

### Additions

1. Client preference profiles derived from prior placements and feedback.
2. Outcome tracking: interview requested, shortlist accepted, placement won,
   retention, satisfaction.
3. Recommendation tuning based on prior operator overrides.
4. Search templates for repeatable client archetypes.

This is the point where matching becomes more defensible, because the system has
observed decisions and outcomes instead of relying only on generic LLM
reasoning.

## Phase 3: Limited client-facing features

Only after internal operations are strong.

### Safe external features

1. Client portal with search status.
2. Interview scheduling visibility.
3. Candidate packet delivery.
4. Structured feedback capture after interviews.

Avoid exposing autonomous matching claims too early.

## Build vs Buy

### Recommendation

Use a hybrid approach: buy commodity workflow components and build the judgment
capture layer.

### Buy

1. CRM/ATS foundations.
2. Email sequencing infrastructure.
3. Calendar scheduling.
4. Transcript capture.
5. Basic enrichment providers.

### Build

1. Role intake schema for fractional CFO searches.
2. Candidate scoring rubric specific to this niche.
3. Match explanation interface.
4. Operator override workflow.
5. Client preference memory.
6. Placement outcome feedback loop.

The proprietary value is not generic automation. It is the structured capture of
recruiter judgment in a narrow, high-value category.

## Product Thesis

The winning product is not "AI recruits CFOs by itself." The winning product is
"AI turns a human recruiting concierge into a faster, more scalable, more
consistent search operation, while learning from every placement."

## Risks

1. Over-automating match decisions too early will reduce trust and placement
   quality.
2. Candidate data quality may be fragmented across notes, inboxes, and memory.
3. If operators do not consistently record override reasons, the system will not
   learn useful judgment patterns.
4. Repeat clients may still have highly variable needs by company stage or board
   pressure.
5. A broad "recruiting automation" product will be too generic and weakly
   differentiated.

## What Success Looks Like in 90 Days

1. Time to produce first viable shortlist drops materially.
2. More candidate conversations are handled per operator per week.
3. Client updates are generated with near-zero manual formatting.
4. Every rejection and override is captured in structured form.
5. The operator trusts the system for preparation and prioritization, but not
   blind final selection.

## Recommendation in One Line

Proceed, but scope it as an internal AI-assisted recruiting operating system
with humans owning final matching judgment.

# Differentiated Opportunity Suite Plan

## Goal

Turn `differentiated-opportunity-engine` into the front door of a connected
skill suite that can:

1. Understand the user's edge
2. Rank credible monetization paths
3. Validate the best one
4. Design the offer or product wedge
5. Build the internal tools and go-to-market assets needed to execute

## Shared architecture

All skills should pass a shared JSON contract so outputs can chain without
re-interviewing the user.

Core shared objects:

- `user_profile`
- `feasibility_verdict`
- `binding_constraints`
- `opportunities[]`
- `best_bet`
- `rejected_paths[]`
- `validation_plan[]`
- `build_spec[]`

## Build order

### 1. edge-profiler

Purpose:

- Turn messy user background into a reusable, structured founder-edge profile.

Input:

- Raw user conversation

Output:

- Clean `user_profile` JSON
- Gaps and follow-up questions
- Edge summary and weak spots

Why next:

- It reduces repeated intake and improves all later skills.

Key eval cases:

- Strong domain knowledge but weak buyer access
- Large audience but weak buyer quality
- Employer-confidentiality edge that should not be treated as usable
- User with flattering but vague self-description that needs grounding

### 2. validation-planner

Purpose:

- Convert a chosen opportunity into a fast, falsifiable demand test.

Input:

- `user_profile`
- `best_bet`

Output:

- 7-day or 14-day validation plan
- Numeric success metrics
- Stop/pivot criteria
- Data to capture during validation

Why next:

- This is the cleanest downstream handoff from the current skill.

Key eval cases:

- Service-first wedge
- Product-first wedge
- Audience-led wedge
- `no_go` case where the plan should be constraint change, not validation
  theater

### 3. offer-designer

Purpose:

- Turn the chosen path into a concrete commercial offer.

Input:

- `user_profile`
- `best_bet`
- Validation findings if available

Output:

- ICP
- Offer statement
- Deliverables
- Pricing hypothesis
- Risk reversal or guarantee ideas
- Rejected offer framings

Why next:

- Many opportunities fail because they never become a clear sellable offer.

Key eval cases:

- Tight fixed-scope service offer
- Productized diagnostic
- Template/data/info offer
- Offer that must avoid legal or regulated-role overreach

### 4. clean-room-risk-screen

Purpose:

- Check whether a proposed business or asset relies on employer IP, regulated
  authority, sensitive data, or unsafe claims.

Input:

- `user_profile`
- `best_bet`
- Draft offer or product scope

Output:

- Risk memo
- Clean-room guidance
- Disallowed data/sources/actions
- Safer adjacent paths

Why next:

- The current hardening work showed this is a recurring failure mode.

Key eval cases:

- Employer templates and pricing logic
- PHI or healthcare workflow temptations
- Compliance/legal delegation creep
- Public-data alternative versus insider-data misuse

### 5. micro-saas-scoper

Purpose:

- Decide whether and how a validated wedge should become software.

Input:

- `user_profile`
- `best_bet`
- Validation evidence
- Offer details

Output:

- Product wedge recommendation
- What to keep manual versus automate
- MVP feature boundary
- Productization trigger
- What not to build yet

Why next:

- This is where service-to-software and audience-to-product transitions get made
  explicitly.

Key eval cases:

- Service should stay a service for now
- One repeated workflow is ready to become software
- Audience-led product should stay templates/data before SaaS
- Tempting broad platform idea that should be cut to one job

### 6. automation-builder

Purpose:

- Turn the `build_spec` into internal tooling, operator workflows, or
  lightweight apps.

Input:

- `build_spec`
- Product or service scope

Output:

- Technical implementation plan
- Internal ops tooling spec
- Minimal app/workflow architecture

Why next:

- This skill begins actual execution and tool creation.

Key eval cases:

- Concierge workflow with human-in-loop AI
- Internal dashboard before customer-facing app
- Minimal self-serve utility
- Data-safe workflow in a regulated-adjacent space

### 7. distribution-ops

Purpose:

- Build the channel-specific go-to-market plan after the opportunity and offer
  are chosen.

Input:

- `user_profile`
- `best_bet`
- Offer or product scope

Output:

- Channel plan
- Outreach or audience plan
- Asset checklist
- Metrics and channel kill criteria

Why next:

- Distribution should be grounded in the chosen path, not brainstormed in the
  abstract.

Key eval cases:

- Warm-intro niche sales
- Community/newsletter launch
- Marketplace or directory distribution
- Weak-distribution user who needs buyer-access building before launch

### 8. experiment-tracker

Purpose:

- Maintain continuity across validation cycles.

Input:

- Validation logs
- Offer tests
- Product experiments

Output:

- What was tested
- What passed or failed
- Recommended next experiment
- Evidence for productization or pivot

Why last:

- It becomes the operating memory of the whole suite.

Key eval cases:

- Contradictory user feedback
- False-positive interest without payment
- Multiple channels with conflicting data
- Deciding whether to persist, narrow, or kill

## Recommended milestones

### Milestone 1: Foundation

- Finalize shared JSON schema
- Ship `edge-profiler`
- Ship `validation-planner`

Success condition:

- A user can move from raw background to a ranked opportunity and a quantified
  validation plan without re-explaining themselves.

### Milestone 2: Commercialization

- Ship `offer-designer`
- Ship `clean-room-risk-screen`

Success condition:

- The suite can turn a good idea into a legal, tightly scoped, sellable offer.

### Milestone 3: Productization

- Ship `micro-saas-scoper`
- Ship `automation-builder`

Success condition:

- The suite can decide whether to keep work manual, productize it, or build
  internal tooling first.

### Milestone 4: Growth Loop

- Ship `distribution-ops`
- Ship `experiment-tracker`

Success condition:

- The suite can run repeated test cycles without losing context or drifting into
  generic advice.

## Cross-skill rules

- Every skill must preserve `why this user can win`.
- Every skill must keep legal/confidentiality constraints visible.
- Every downstream skill must respect `feasibility_verdict` and
  `binding_constraints`.
- No skill should silently upgrade a `no_go` into a `go` without new evidence.
- Productization must be earned by validation evidence, not user preference
  alone.

## Immediate next implementation recommendation

Build `edge-profiler` first, then `validation-planner`.

Reason:

- They are the cleanest handoffs from the current skill.
- They improve quality across the whole suite.
- They create the reusable memory layer needed before branching into offer
  design and tooling.

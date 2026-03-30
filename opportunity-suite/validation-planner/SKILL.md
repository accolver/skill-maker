---
name: validation-planner
description: Converts a chosen opportunity into a fast, falsifiable validation plan with numeric targets, success criteria, and kill thresholds. Use when a user has a selected opportunity, best bet, offer, or product wedge and needs to test demand before building or scaling.
compatibility: Works best when the input already includes a chosen path, user constraints, and some idea of target buyers.
metadata:
  author: opencode
  version: "0.1"
---

# Validation Planner

## Overview

This skill turns a chosen opportunity into a real demand test. The goal is not
to produce activity. The goal is to create a short validation plan with numeric
targets that can prove, narrow, or kill the idea quickly.

The plan should focus on the single biggest unknown, not on validating
everything at once.

Load `references/experiment-patterns.md` when selecting the right validation
motion. Load `references/validation-metrics.md` when defining thresholds.

## When to use

- When a user already has a best bet or chosen opportunity
- When an idea needs validation before building, scaling, or quitting a path
- When a service-first, audience-first, or product-first wedge needs concrete
  testing steps

**Do NOT use when:**

- The user still needs help choosing the opportunity itself
- The problem is purely implementation and demand is already proven

## Workflow

### 1. Identify the real unknowns

Name the key risks behind the idea, such as:

- demand risk
- buyer-access risk
- willingness-to-pay risk
- workflow-repeatability risk
- legal-scope risk

Then choose the **single biggest unknown**. Name it explicitly and explain why
it matters more than the others right now.

### 2. Choose the right validation motion

Pick a test that matches the opportunity:

- Warm outreach and paid pilot
- Marketplace or directory test
- Audience pre-sell or waitlist
- Async product test
- Constraint-change plan for `no_go` opportunities

Use the strongest available commitment signal the user can realistically ask
for, such as:

- deposit
- paid pilot
- pre-order
- signed implementation slot
- completed checkout

Do not stop at interviews, clicks, opens, or waitlist signups when a stronger
signal is feasible.

### 3. Define numeric success and failure criteria

Every plan should include numbers where possible:

- outreach count
- interview count
- conversion target
- payment target
- activation target
- stop or pivot threshold

Use decision-grade thresholds:

- `go`
- `revise`
- `kill`

Briefly justify the numbers based on channel quality, audience size, price
point, access level, or sales cycle. Avoid fake precision.

### 4. Produce the plan

Return both:

- a readable validation plan
- a JSON block using `assets/validation-plan-template.json`

Default sections:

- `Validation Thesis`
- `Key Unknowns`
- `7-Day Plan`
- `Success Criteria`
- `Kill Criteria`
- `Structured Plan`

Also include a brief `Why Not The Lower-Signal Alternative` explanation when
there is an obvious weaker motion, such as interviews instead of paid pilots.

## Checklist

- [ ] The plan is testing the biggest unknown, not generic activity
- [ ] Numeric success and failure thresholds are explicit
- [ ] The motion matches the opportunity and the user's constraints
- [ ] The strongest feasible commitment signal is used
- [ ] The plan isolates one primary unknown instead of many
- [ ] The response includes readable plan and structured JSON

## Examples

**Example:**

Input: Best bet is an HVAC missed-call recovery service with warm owner access.

Output: A 7-day plan with owner interview counts, pilot target counts, an offer
statement, and kill criteria tied to urgency and willingness to pay.

## Common mistakes

| Mistake                                            | Fix                                                   |
| -------------------------------------------------- | ----------------------------------------------------- |
| Writing generic activity lists                     | Tie the plan to a specific unknown and numeric target |
| Validating everything at once                      | Choose the single biggest risk first                  |
| No stop condition                                  | Add clear pivot or kill thresholds                    |
| Using weak signals when stronger ones are feasible | Ask for money, commitments, or defined next steps     |

## Quick reference

| Operation     | How                                                                                     |
| ------------- | --------------------------------------------------------------------------------------- |
| Pick motion   | Match the test to the opportunity and buyer access                                      |
| Set targets   | Use numeric thresholds from `references/validation-metrics.md` and justify them briefly |
| Format result | Human-readable plan plus JSON using `assets/validation-plan-template.json`              |

## Key principles

1. **Test the real risk** — Validate the biggest uncertainty, not the easiest
   activity.
2. **Numbers beat vibes** — Use thresholds, counts, and time windows.
3. **Use the strongest available signal** — If money or commitment can be asked
   for, do not hide behind soft interest metrics.
4. **Kill fast when needed** — A weak idea should be narrowed or stopped, not
   endlessly studied.

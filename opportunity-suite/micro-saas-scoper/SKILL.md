---
name: micro-saas-scoper
description: Decides whether a validated wedge should become software, defines the narrow product wedge, and separates what stays manual versus automated. Use when a service, workflow, or audience-driven opportunity may be ready for micro-SaaS scoping or when a user is tempted to build software too early.
compatibility: Works best when the input includes a chosen wedge, some validation evidence, and user constraints.
metadata:
  author: opencode
  version: "0.1"
---

# Micro-SaaS Scoper

## Overview

This skill decides whether a wedge should become software now, later, or not at
all. The goal is to protect against premature product building and to force a
narrow MVP when software is justified.

Load `references/productization-signals.md` when deciding readiness. Load
`references/mvp-boundaries.md` when narrowing the scope.

## When to use

- When a service or workflow may be ready to productize
- When a user wants a micro-SaaS and needs the product wedge defined
- When there is tension between manual delivery and automation

**Do NOT use when:**

- The opportunity itself is still unknown
- There is no evidence or wedge to scope yet

## Workflow

### 1. Decide readiness

Output one of:

- `build_now`
- `stay_manual_for_now`
- `conditional_build`

Use those exact values in prose and JSON.

Justify with validation evidence, buyer access, repetition, and implementation
risk.

### 2. Define the product wedge

If software is justified, define:

- one narrow job
- one primary user
- one core workflow
- one productization trigger

For the first software slice, choose only one automation wedge. Do not automate
multiple adjacent funnel stages in v1 unless the prompt gives unusually strong
evidence that the whole chain is already standardized.

### 3. Separate manual from automated work

State clearly:

- what remains manual
- what gets automated first
- what not to build yet

Aim for at least 3 items in the manual, automated, and not-yet lists when the
context supports it.

If the verdict is `stay_manual_for_now` or `conditional_build`, list 3 distinct
gating signals that would flip the verdict later. Each gating signal should be a
separate bullet, not one compound sentence.

### 4. Produce the scope

Return both:

- a readable product scope
- a JSON block using `assets/micro-saas-scope-template.json`

Use the template field names exactly.

Default sections:

- `Readiness Verdict`
- `Product Wedge`
- `Manual vs Automated`
- `MVP Boundary`
- `Do Not Build Yet`
- `Structured Scope`

## Checklist

- [ ] A readiness verdict is explicit
- [ ] The wedge is one job, one user, one workflow
- [ ] Manual and automated parts are clearly separated
- [ ] The MVP boundary is narrower than the user's first instinct
- [ ] Readable scope and structured JSON are both present

## Key principles

1. **Software must be earned** — Validation evidence beats product preference.
2. **One job first** — Narrow workflow software beats broad platform ambition.
3. **Keep some work manual if needed** — Human-in-the-loop is often the right
   intermediate step.

---
name: offer-designer
description: Turns a chosen opportunity into a concrete sellable offer with ICP, scope, deliverables, pricing hypothesis, and rejected framings. Use when a user has a best bet or validated direction and needs a clear commercial offer before selling or building.
compatibility: Works best when the input already includes a chosen opportunity, user profile, and core constraints.
metadata:
  author: opencode
  version: "0.1"
---

# Offer Designer

## Overview

This skill turns an opportunity into a clear commercial offer. The goal is to
make the offer narrow, legible, and sellable. Avoid broad consulting language,
premature pricing theater, or offers that quietly cross legal or role
boundaries.

Load `references/offer-shapes.md` when choosing offer type. Load
`references/pricing-guidelines.md` when setting a pricing hypothesis.

## When to use

- When a user has a chosen opportunity and needs a concrete offer
- When validation requires a real pitch, not generic business advice
- When a service, diagnostic, template, data, or hybrid offer needs scoping

**Do NOT use when:**

- The opportunity itself is not chosen yet
- The task is purely technical build planning with no commercial design needed

## Workflow

### 1. Identify the commercial wedge

Pick one narrow wedge, not a category-sized promise.

Define:

- ICP
- painful job to be done
- deliverable or outcome
- scope boundary

### 2. Choose the right offer shape

Use one primary shape:

- Fixed-scope service
- Diagnostic or audit
- Done-with-you sprint
- Template or benchmark product
- Concierge hybrid that can later productize

State why this shape is better than the most obvious alternative. Use one
primary shape only.

### 3. Price as a hypothesis, not fiction

Set a pricing hypothesis tied to scope, urgency, and buyer value. If pricing is
uncertain, say what needs to be learned rather than inventing precision.

### 4. Reject weak or unsafe framings

Include at least one rejected framing, such as:

- broad consulting
- software-first
- illegal or regulated-role overreach
- generic AI services

### 5. Produce the offer package

Return both:

- a readable offer package
- a JSON block using `assets/offer-template.json`

Use the template field names exactly.

Default sections:

- `Offer Thesis`
- `ICP`
- `Offer Design`
- `Pricing Hypothesis`
- `Rejected Framings`
- `Structured Offer`

## Checklist

- [ ] The ICP is narrow and buyer-relevant
- [ ] The offer has a clear outcome or deliverable
- [ ] Scope boundaries are explicit
- [ ] Pricing is a testable hypothesis, not fake precision
- [ ] At least one weak framing is rejected explicitly
- [ ] Readable offer and structured JSON are both present
- [ ] One primary offer shape is chosen and defended against the closest
      alternative

## Common mistakes

| Mistake                      | Fix                                           |
| ---------------------------- | --------------------------------------------- |
| Broad consulting offer       | Narrow to one painful job and one deliverable |
| Software-first temptation    | Start with the narrowest sellable wedge       |
| Pricing pulled from thin air | Tie price to scope and state the uncertainty  |
| Quiet legal overreach        | Reject unsafe framing explicitly              |

## Key principles

1. **Narrow sells** — Specific buyer and specific pain beat generic capability.
2. **Scope before price** — Price only makes sense after the offer boundary is
   clear.
3. **Reject weak framings** — A good offer is easier to see when bad versions
   are named and discarded.

---
name: distribution-ops
description: Designs channel-specific go-to-market plans, asset checklists, sequencing, and kill criteria for a chosen offer or product. Use when the opportunity and offer are already chosen and the next question is how to reach buyers through the right channels instead of generic marketing advice.
compatibility: Works best when the input already includes a chosen path, offer shape, and some information about buyer access or audience.
metadata:
  author: opencode
  version: "0.1"
---

# Distribution Ops

## Overview

This skill turns a chosen path into a channel-specific go-to-market sequence.
The goal is to choose the strongest realistic channel, not to create a laundry
list of generic marketing ideas.

Load `references/channel-patterns.md` when selecting channels. Load
`references/channel-metrics.md` when defining thresholds.

## When to use

- When the user has a chosen offer or product and needs go-to-market sequencing
- When warm intros, audience, partnerships, or directories must be translated
  into a real plan
- When channel choice is a bottleneck

**Do NOT use when:**

- The offer or opportunity is still unclear
- The user needs opportunity selection rather than channel execution

## Workflow

### 1. Choose the strongest starting channel

Pick one primary channel first, based on:

- trust
- access
- conversion plausibility
- speed to signal

### 2. Sequence supporting channels

Only add supporting channels if they help the main one.

### 3. Define assets and metrics

For the primary channel, define:

- assets needed
- outreach or content sequence
- success metrics
- kill criteria

### 4. Produce the plan

Return both:

- a readable channel plan
- a JSON block using `assets/distribution-plan-template.json`

Default sections:

- `Channel Thesis`
- `Primary Channel`
- `Supporting Channels`
- `Asset Checklist`
- `Metrics And Kill Criteria`
- `Structured Plan`

## Checklist

- [ ] One primary channel is clearly chosen
- [ ] The choice matches the user's actual access, not generic advice
- [ ] Metrics and kill criteria are explicit
- [ ] Supporting channels help the primary one rather than distracting from it
- [ ] Readable plan and structured JSON are both present

## Key principles

1. **Start where trust already exists** — Warm access or trusted audience beats
   clever tactics.
2. **One channel first** — Strong sequencing beats multi-channel thrash.
3. **Kill weak channels quickly** — A bad channel should be cut, not
   rationalized.

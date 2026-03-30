---
name: experiment-tracker
description: Synthesizes validation experiments, weighs signal quality, identifies what actually changed, and recommends the next best experiment or decision. Use when a user has run multiple tests, has messy mixed evidence, or needs continuity across validation cycles instead of rethinking everything from scratch.
compatibility: Works best when the input includes experiment history, metrics, or observed outcomes.
metadata:
  author: opencode
  version: "0.1"
---

# Experiment Tracker

## Overview

This skill turns messy validation history into a usable decision state. The goal
is to track what was actually learned, separate strong from weak signals, and
recommend the next best experiment.

Load `references/signal-quality.md` when weighing evidence. Load
`references/decision-states.md` when deciding whether to continue, narrow,
pivot, or stop.

## When to use

- When multiple validation tests have been run
- When the user has conflicting or noisy evidence
- When a next experiment should build on prior evidence rather than restarting

**Do NOT use when:**

- No experiments or observed outcomes exist yet

## Workflow

### 1. Summarize what was tested

List experiments, outcomes, and what each result really means.

### 2. Grade signal quality

Distinguish:

- strong signal
- weak signal
- vanity signal
- contradictory signal

Use those labels explicitly when the evidence supports them.

### 3. Set the decision state

Choose one:

- `continue`
- `narrow`
- `pivot`
- `stop`

Use those exact values in prose and JSON.

### 4. Recommend the next experiment

Pick one next experiment that best resolves the biggest remaining uncertainty.
Make it singular.

### 5. Produce the tracker output

Return both:

- a readable experiment summary
- a JSON block using `assets/experiment-log-template.json`

Use the template field names exactly.

Default sections:

- `Experiment Summary`
- `Signal Quality`
- `Decision State`
- `Next Experiment`
- `Structured Log`

## Checklist

- [ ] Prior experiments are summarized accurately
- [ ] Signal quality is differentiated, not flattened
- [ ] A clear decision state is chosen
- [ ] The next experiment addresses the biggest remaining uncertainty
- [ ] Readable summary and structured JSON are both present

## Key principles

1. **Signal quality beats raw activity** — Not all data points deserve equal
   weight.
2. **One next experiment** — Choose the best next step, not a buffet of ideas.
3. **Let evidence change the path** — Continue, narrow, pivot, or stop based on
   what was learned.

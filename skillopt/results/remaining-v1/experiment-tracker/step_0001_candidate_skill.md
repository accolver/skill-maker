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

## Optimization Notes

- Preserve the user's requested output shape exactly and do not substitute generic advice for concrete artifacts.
- Include exact commands, code structures, protocol fields, tags, parameters, file paths, or deliverable sections when the task asks for them.
- Make safety gates explicit before irreversible, destructive, externally visible, or compliance-sensitive actions.
- For multi-step work, present steps in execution order and include validation or rollback checks where relevant.
- Avoid overfitting to a single eval example: express lessons as reusable rules, not as task-specific answers.

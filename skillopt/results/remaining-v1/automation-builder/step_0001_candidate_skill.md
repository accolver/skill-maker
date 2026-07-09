# Automation Builder

## Overview

This skill converts a chosen workflow or product wedge into a minimal technical
implementation plan. The goal is to build the smallest reliable system that fits
the chosen wedge, not a future-proof platform.

Load `references/system-patterns.md` when choosing architecture shape. Load
`references/human-loop-rules.md` when deciding what stays manual.

## When to use

- When a build spec already exists
- When a concierge workflow or internal tool needs technical planning
- When a validated wedge is ready for a lightweight app or automation

**Do NOT use when:**

- The business wedge is still unclear
- The task is still opportunity selection rather than implementation planning

## Workflow

### 1. Define the system objective

Name:

- primary user
- primary trigger
- primary output
- human escalation point

### 2. Choose minimal architecture

Prefer the simplest architecture that can ship.

Define:

- components
- data inputs
- outputs
- storage
- integrations

### 3. Keep human-in-the-loop where needed

Be explicit about:

- what stays manual
- what is reviewed by a human
- what is safe to automate now

### 4. Produce the build plan

Return both:

- a readable build plan
- a JSON block using `assets/build-plan-template.json`

Use the template field names exactly. Populate `system_objective.primary_user`,
`system_objective.trigger`, `system_objective.output`, and
`system_objective.human_escalation` explicitly.

Default sections:

- `System Objective`
- `Architecture`
- `Human Loop`
- `Milestones`
- `Out Of Scope`
- `Structured Build Plan`

## Checklist

- [ ] The plan is minimal, not platform-shaped
- [ ] Human escalation is explicit where needed
- [ ] Inputs, outputs, and components are concrete
- [ ] Milestones are sequenceable
- [ ] Readable plan and structured JSON are both present
- [ ] At least one manual step, one automated step, and one escalation reason
      are explicit

## Key principles

1. **Minimal architecture first** — Build for the wedge, not the imagined
   company.
2. **Safety before full automation** — Human review belongs anywhere the
   workflow is high-risk or still ambiguous.
3. **Out-of-scope matters** — What not to build is part of the plan.

## Optimization Notes

- Preserve the user's requested output shape exactly and do not substitute generic advice for concrete artifacts.
- Include exact commands, code structures, protocol fields, tags, parameters, file paths, or deliverable sections when the task asks for them.
- Make safety gates explicit before irreversible, destructive, externally visible, or compliance-sensitive actions.
- For multi-step work, present steps in execution order and include validation or rollback checks where relevant.
- Avoid overfitting to a single eval example: express lessons as reusable rules, not as task-specific answers.

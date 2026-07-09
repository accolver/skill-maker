---
name: telos-guardian
description: "Guards a project's telos/purpose hierarchy before scope, architecture, dependency, integration, roadmap, or implementation decisions. Use when the user asks should we build this?, does this fit?, where should this live?, what design aligns?, or when work may change product purpose, user experience, contracts, modules, or tests. Reads TELOS.md, telos/TELOS.md, telos/specs, and @telos annotations; initializes missing Telos context; evaluates L4 Purpose, L3 Experience, L2 Contract, and L1 Function before implementation."
---

# Telos Guardian

## Overview

Guard a project's purpose before implementation. Telos means the reason the
project exists; this skill ensures proposed work traces from that reason down to
user experience, system contracts, and code-level implementation.

Use this as a lightweight Telos/Logos checkpoint, not a heavy planning process:
identify the relevant telos context, scan enough of the codebase to understand
fit, then recommend whether to proceed, reshape, or reject the proposal.

If the user asks to implement, plan, or choose a design without explicitly
asking for alignment, still run a brief Telos checkpoint first when the change
affects scope, architecture, contracts, integrations, dependencies, or
user-visible behavior. Do not proceed directly to implementation until you have
classified the fit and named the smallest aligned scope.

## When to use

Use this skill when the user is:

- Adding, expanding, cutting, or prioritizing a feature
- Making an architectural decision, dependency choice, integration choice, or
  module-boundary decision
- Asking "should we build this?", "does this belong?", "where should this
  live?", "what approach fits?", or "is this aligned?"
- Planning roadmap work, scope changes, rewrites, migrations, or new systems
- Starting a project or repository that lacks Telos context
- Working in a Telos project with `telos/TELOS.md`, `telos/specs/`,
  `TELOS.md`, or `@telos` annotations

**Do NOT use when:**

- The task is a small bug fix, typo, formatting change, or mechanical refactor
  that does not affect scope, contracts, or architecture
- The user explicitly says to skip alignment/product/architecture checks
- The user is asking for post-implementation code review rather than
  pre-implementation fit

## Telos model

Evaluate across four levels:

| Level | Name | Question | Typical artifacts |
| --- | --- | --- | --- |
| L4 | Purpose | Why does this project exist? | `telos/specs/L4-purpose/*`, purpose, metrics, constraints |
| L3 | Experience | What should users experience? | Journeys, UX principles, feedback loops |
| L2 | Contract | What boundaries and interfaces hold? | APIs, components, data contracts, integrations |
| L1 | Function | What code/test behavior implements it? | Modules, functions, tests, `@telos` annotations |

Prefer the full Telos framework layout when present: a `telos` directory with
`TELOS.md`, `.telosrc.json`, and specs directories named `L4-purpose`,
`L3-experience`, `L2-contract`, and `L1-function`.

If the project only has a root `TELOS.md`, use that. If no Telos context exists,
initialize the smallest useful version and note whether the user may want the
full `npx telos-framework init` workflow later.

## Response format

Always structure final responses with these sections:

1. **Summary** — task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — classification, assumptions, and chosen path.
3. **Artifacts** — deliverables, proposed spec changes, or files produced.
4. **Validation** — checks performed, risks, caveats, unresolved questions.
5. **Next steps** — concrete actions, or `None`.

Keep the response concise. The goal is a decision-quality checkpoint, not a long
strategy memo.

## Workflow

### Step 0: Detect context and mode

Look for Telos artifacts in this order:

1. `telos/TELOS.md` and `telos/specs/` — full Telos framework project
2. `TELOS.md` — lightweight project telos
3. `@telos`, `@telos-test`, or `@telos-scenario` annotations in code/tests
4. No Telos context

Choose one mode:

- **Mode A: Init** — no Telos context exists, or the user asks to establish it
- **Mode B: Assess work** — a feature/scope change/roadmap item is proposed
- **Mode C: Assess architecture** — an architecture, dependency, integration,
  boundary, migration, or implementation approach is proposed
- **Mode D: Update telos/specs** — current telos is stale or the decision
  requires changing it

---

## Mode A: Init — capture telos

Ask questions one at a time. Start by scanning existing docs and source layout so
your first question is informed rather than generic.

### A1. L4 Purpose

Capture:

- The concrete problem and beneficiary
- Why the project should exist instead of alternatives
- Success metrics or observable outcomes
- Hard constraints: technical, business, ethical, regulatory, timeline, budget

Reject vague answers like "help users" or "make things easier." Ask "why?" until
the purpose can reject misaligned features.

### A2. L3 Experience

Capture:

- 2-3 critical user journeys
- Experience principles and tradeoffs: speed vs polish, simplicity vs power,
  privacy vs personalization, automation vs control
- Feedback loops: analytics, user signals, support signals, operational signals

### A3. L2 Contract

Capture:

- Major APIs, components, services, or module boundaries
- External integrations and ownership boundaries
- Data shapes, invariants, validation rules, and compatibility promises

Mark uncertain early-stage items as `TBD` rather than inventing certainty.

### A4. L1 Function

Capture:

- Core modules and responsibilities
- Existing or intended architecture patterns
- Testing strategy and scenario format
- Whether code should use `@telos`, `@telos-test`, or `@telos-scenario`
  annotations

### A5. Write the smallest useful artifact

For a full Telos project, create or update the framework shape: the `TELOS.md`
entrypoint inside the `telos` directory plus L4/L3/L2/L1 spec files under the
Telos specs directory.

For a lightweight project, write `TELOS.md` with these sections:

```markdown
# TELOS — [Project Name]

> [One-sentence purpose statement]

## L4: Purpose

## L3: Experience

## L2: Contract

## L1: Function
```

Show the draft and ask for confirmation before treating it as authoritative.

---

## Mode B: Assess work — feature/scope fit

### B1. Load telos context

Read the available Telos artifacts. For full Telos projects, include relevant
files under `telos/specs/`, not just `telos/TELOS.md`.

### B2. Understand the proposal

Clarify only what is needed to judge fit:

- What changes for the user?
- Who benefits?
- What problem does it solve?
- What is explicitly out of scope?

### B3. Architecture scan

Scan enough of the codebase to understand feasibility:

- Relevant directories, modules, tests, and ownership boundaries
- Existing architecture, dependency, and naming patterns
- Nearby contracts, APIs, schemas, migrations, or UI flows
- Existing `@telos` annotations or missing traceability

Do not perform a full code review.

### B4. Evaluate all levels

- **L4 Purpose:** Does this directly advance purpose, metrics, and constraints?
- **L3 Experience:** Does it improve or complicate key journeys and principles?
- **L2 Contract:** Does it fit current interfaces and boundaries, or require new
  contracts?
- **L1 Function:** Does implementation fit existing modules, tests, and patterns?

### B5. Recommend

Choose exactly one:

- **Proceed** — aligned and naturally feasible
- **Proceed with caveats** — aligned, but scope, sequencing, contracts, or tests
  must be tightened first
- **Reframe** — valuable idea, but should be reshaped to better serve the telos
- **Reconsider** — misaligned, too costly, or purpose-diluting

Name the smallest version that preserves the telos. Do not reinterpret vague
purpose statements to make the proposal fit. If the proposal only fits after
changing L4 or core L3 principles, classify it as **Reframe** or **Reconsider**
and ask for explicit confirmation before updating Telos.

---

## Mode C: Assess architecture — design fit

Use this mode when the proposal is about architecture rather than user-facing
scope: frameworks, libraries, service boundaries, data models, infrastructure,
migrations, or where code should live.

Evaluate:

1. **Purpose pressure:** What L4/L3 need is driving this decision? If none,
   challenge the change.
2. **Boundary fit:** Which L2 contracts change? What invariants must be
   preserved?
3. **Implementation fit:** Which L1 modules/tests change? Does this match local
   patterns?
4. **Tradeoffs:** Complexity, reversibility, migration risk, operational burden,
   learning curve, lock-in, performance, security, and testability.
5. **Decision record:** State the chosen option, rejected alternatives, and the
   telos reason.

Prefer reversible, minimal architecture that keeps future purpose-aligned work
easy. Do not approve architectural novelty unless it clearly serves the telos.

---

## Mode D: Update telos/specs

If the current telos is stale, incomplete, or contradicted by a deliberate new
strategy:

1. Identify which level changes: L4, L3, L2, or L1.
2. Ask whether the user intends to change the project's purpose or merely add a
   derived requirement.
3. Update the smallest affected spec/artifact.
4. Record why the change is legitimate, not accidental scope drift.
5. Suggest validation: `telos validate`, tests, or manual review as appropriate.

Do not silently rewrite purpose to justify a feature. Purpose changes require
explicit user confirmation.

## Checklist

- [ ] Detected `telos/TELOS.md`, `telos/specs/`, root `TELOS.md`, or missing
      Telos context
- [ ] Read the relevant L4/L3/L2/L1 context before judging
- [ ] Clarified the proposal only as much as needed
- [ ] Scanned codebase architecture and nearby contracts/tests
- [ ] Evaluated purpose, experience, contract, and function fit
- [ ] Gave one recommendation: proceed / caveats / reframe / reconsider
- [ ] Named smallest aligned scope and any spec updates needed
- [ ] Avoided turning this into a broad code review or strategy memo

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Looking only for root `TELOS.md` | Prefer `telos/TELOS.md` and `telos/specs/` when present. |
| Rubber-stamping every feature | Challenge work that does not clearly serve L4 purpose. |
| Treating architecture as purely technical | Tie architecture decisions back to L4/L3 pressure and L2 boundaries. |
| Rewriting purpose to fit a desired feature | Require explicit confirmation for purpose changes. |
| Producing a long plan when a checkpoint is enough | Keep it slim: decision, rationale, smallest aligned next step. |
| Skipping codebase scan | Feasibility requires local architecture context. |
| Jumping into implementation when scope or architecture changes | Run a brief Telos checkpoint first, then proceed only if fit is clear. |

## Quick reference

| Situation | Action |
| --- | --- |
| No Telos context | Run Mode A and write the smallest useful telos artifact. |
| Full Telos project | Read `telos/TELOS.md` plus relevant `telos/specs/`. |
| New feature or scope expansion | Run Mode B before implementation. |
| Architecture/dependency/boundary decision | Run Mode C before implementation. |
| Telos is stale | Run Mode D and update the smallest affected level. |
| User wants implementation immediately | Give a brief alignment checkpoint first, then proceed if aligned. |

## Key principles

1. **Purpose rejects work** — A telos that cannot say "no" is not specific
   enough.
2. **Trace downward** — Good work connects L4 purpose to L3 experience, L2
   contracts, and L1 functions/tests.
3. **Validate upward** — Implementations should prove they satisfy specs and do
   not create orphaned behavior.
4. **Architecture serves purpose** — Technical decisions are justified by the
   product's telos, not by novelty or preference.
5. **Smallest aligned change** — Prefer the narrowest feature or design that
   advances the purpose and preserves future coherence.

## Optimization Notes

- Preserve the user's requested output shape exactly and do not substitute generic advice for concrete artifacts.
- Include exact commands, code structures, protocol fields, tags, parameters, file paths, or deliverable sections when the task asks for them.
- Make safety gates explicit before irreversible, destructive, externally visible, or compliance-sensitive actions.
- For multi-step work, present steps in execution order and include validation or rollback checks where relevant.
- Avoid overfitting to a single eval example: express lessons as reusable rules, not as task-specific answers.

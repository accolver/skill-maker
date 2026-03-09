---
name: telos-guardian
description: Captures and guards a project's purpose hierarchy (telos). On first use, interviews the user through 4 levels (L4 Purpose, L3 Experience, L2 Contract, L1 Function) and writes a TELOS.md at the project root. On subsequent uses, reads the existing TELOS.md and assesses whether a proposed feature aligns with the project's purpose and is practically feasible given the codebase. Use when a new feature is proposed, when planning work, when someone says "let's add", "I want to build", "new feature", "should we implement", or when starting a new project that lacks a TELOS.md.
---

# Telos Guardian

## Overview

Guard a project's purpose by ensuring every proposed feature aligns with the
project's reason for existing (its telos) and is practically achievable given
the current codebase. This skill operates in two modes: **Init** (capture the
telos) and **Assess** (evaluate feature alignment).

## When to use

- When a new feature, enhancement, or significant change is proposed
- When the user says "I want to add...", "let's build...", "new feature:", or
  "should we implement..."
- When planning or scoping work on a project
- When starting a new project that has no `TELOS.md`
- When an agent detects no `TELOS.md` exists at the project root

**Do NOT use when:**

- The change is a bug fix, typo, or mechanical refactor that doesn't alter
  feature scope
- The project already has a `TELOS.md` and the user is asking about an existing,
  already-aligned feature
- The user explicitly says they want to skip alignment checks

## Workflow

### Step 0: Detect mode

Check if a `TELOS.md` file exists at the project root.

- **If NO `TELOS.md` exists** -> go to **Mode A: Init**
- **If `TELOS.md` exists** -> go to **Mode B: Assess**

---

### Mode A: Init (Capture the Telos)

Guide the user through a structured interview to capture the project's purpose
hierarchy across all 4 levels. Ask questions **one at a time**, not in batches.
Prefer multiple-choice when appropriate, but open-ended is fine for vision
questions.

#### A1. L4 Purpose — Why does this project exist?

Ask the user:

1. **What is the ultimate purpose of this project?** What problem does it solve,
   and for whom? Push for specificity — reject generic answers like "help users"
   or "make things easier." Ask "why?" until you reach a concrete, meaningful
   purpose.
2. **Who are the beneficiaries?** Primary users, secondary stakeholders,
   ecosystem participants.
3. **What does success look like?** Concrete, measurable success metrics. Not
   "lots of users" but "1000 monthly active users within 6 months" or "reduce
   deployment time from 2 hours to 10 minutes."
4. **What constraints exist?** Technical (must run on X), business (budget,
   timeline), philosophical (open source, privacy-first), regulatory.

#### A2. L3 Experience — What should it feel like?

Ask the user:

1. **What are the key user journeys?** Walk through 2-3 critical paths a user
   takes from start to goal. Be concrete: "User opens the app, sees X, clicks Y,
   gets Z."
2. **What experience principles matter?** Speed over polish? Simplicity over
   power? What trade-offs define the product personality?
3. **What feedback loops exist?** How will you know users are succeeding? What
   analytics, feedback mechanisms, or signals matter?

#### A3. L2 Contract — What are the boundaries?

Ask the user:

1. **What are the major interfaces?** APIs, component boundaries, service
   contracts, data models. What talks to what?
2. **What external systems integrate?** Databases, third-party APIs, auth
   providers, payment systems.
3. **What data contracts exist?** Key data shapes, validation rules, invariants
   that must hold.

If the project is early-stage and these don't exist yet, capture what the user
envisions. Mark uncertain items as "TBD" in the output.

#### A4. L1 Function — What does the code look like?

Ask the user:

1. **What are the core modules?** The main functional areas of the codebase.
2. **What patterns does the codebase follow?** Architecture style (MVC,
   hexagonal, microservices), language conventions, state management approach.
3. **What is the testing strategy?** Unit tests, integration tests, E2E? What
   framework? What coverage expectations?

If the project doesn't exist yet, capture the intended patterns.

#### A5. Write TELOS.md

Produce a `TELOS.md` file at the project root using this format:

```markdown
# TELOS — [Project Name]

> [One-sentence purpose statement]

## L4: Purpose

**Why this project exists:** [Specific, concrete purpose — not generic]

**Beneficiaries:**

- [Primary]: [who and why]
- [Secondary]: [who and why]

**Success metrics:**

-
-

**Constraints:**

- [Constraint 1]
- [Constraint 2]

## L3: Experience

**Key user journeys:**

### Journey 1: [Name]

[Step-by-step description]

### Journey 2: [Name]

[Step-by-step description]

**Experience principles:**

- [Principle 1]
- [Principle 2]

**Feedback loops:**

- [Loop 1]
- [Loop 2]

## L2: Contract

**Major interfaces:**

-
-

**Integration points:**

- [System 1]: [how it connects]

**Data contracts:**

- [Contract 1]: [shape and invariants]

## L1: Function

**Core modules:**

-
-

**Patterns:**

- Architecture: [style]
- Language: [conventions]
- State management: [approach]

**Testing strategy:**

- [Framework]: [coverage expectations]
```

Save this file and confirm with the user that it captures their intent. Make
adjustments as needed until the user is satisfied.

---

### Mode B: Assess (Feature Alignment)

When a feature is proposed and `TELOS.md` exists, assess alignment and
feasibility through conversation.

#### B1. Read the TELOS.md

Load the project's `TELOS.md`. Internalize all 4 levels — you need the full
context to evaluate alignment.

#### B2. Understand the proposed feature

If the user hasn't fully described the feature, ask clarifying questions until
you understand:

- What the feature does
- Who it's for
- What problem it solves

#### B3. Scan the codebase

Examine the project structure to understand:

- Key directories and modules
- Dependencies and frameworks in use
- Existing patterns (architecture style, naming conventions, testing approach)
- Related code that the feature would interact with or extend

This is an architecture scan, not a deep code review. Focus on whether the
feature fits naturally into the existing structure or would require significant
refactoring.

#### B4. Assess alignment at each level

Walk through each level conversationally:

**L4 Purpose alignment:**

- Does this feature serve the stated ultimate purpose?
- Does it support the defined success metrics?
- Does it respect the stated constraints?
- Could it undermine or distract from the core purpose?

**L3 Experience alignment:**

- Which user journeys does this feature affect?
- Does it align with the stated experience principles?
- Does it introduce new journeys that complement or conflict with existing ones?

**L2 Contract alignment:**

- How does this feature interact with existing interfaces?
- Does it require new contracts, or extend existing ones?
- Does it respect current system boundaries?

**L1 Function feasibility:**

- Does the codebase architecture support this feature naturally?
- What modules would need to change?
- Does it fit the existing patterns, or would it require introducing new ones?
- Are the necessary dependencies available?

#### B5. Deliver your assessment

Provide a clear, conversational assessment covering:

1. **Purpose alignment** — how well the feature serves the telos
2. **Practical feasibility** — how naturally it fits the codebase
3. **Recommendation** — one of:
   - **Proceed** — strongly aligned and feasible
   - **Proceed with caveats** — aligned but has considerations to address first
   - **Reconsider** — misaligned with purpose, or would require rethinking the
     approach

If recommending "proceed with caveats" or "reconsider," explain specifically
what the concerns are and what would need to change.

---

## Checklist

- [ ] Checked for existing `TELOS.md` at project root
- [ ] (Init) Asked L4 questions — purpose, beneficiaries, metrics, constraints
- [ ] (Init) Asked L3 questions — journeys, experience principles, feedback
- [ ] (Init) Asked L2 questions — interfaces, integrations, data contracts
- [ ] (Init) Asked L1 questions — modules, patterns, testing
- [ ] (Init) Wrote `TELOS.md` to project root and confirmed with user
- [ ] (Assess) Read existing `TELOS.md`
- [ ] (Assess) Understood the proposed feature
- [ ] (Assess) Scanned codebase architecture
- [ ] (Assess) Evaluated alignment at all 4 levels (L4, L3, L2, L1)
- [ ] (Assess) Delivered clear recommendation (proceed / caveats / reconsider)

## Example

### Mode A: Init — New SaaS project

**User:** "I want to start building an invoice management tool for freelancers."

**Agent interview (abbreviated):**

> **L4 Purpose:** "Why does this need to exist? What's broken about current
> invoicing for freelancers?"
>
> User: "Freelancers waste 3-4 hours/week on invoicing. Existing tools are
> bloated and expensive. We want something minimal that gets invoices sent in
> under 60 seconds."
>
> **L4 Success metrics:** "How will you measure success?"
>
> User: "Time to send first invoice under 60 seconds, 80% of users send at least
> 1 invoice/week within 30 days."
>
> [Agent continues through L3, L2, L1...]

**Output `TELOS.md` (excerpt):**

```markdown
# TELOS — QuickBill

> Eliminate invoicing friction for freelancers so they spend time on billable
> work, not admin.

## L4: Purpose

**Why this project exists:** Freelancers waste 3-4 hours per week on invoicing.
Existing tools (FreshBooks, Wave) are over-featured and slow. QuickBill gets an
invoice sent in under 60 seconds.

**Beneficiaries:**

- Primary: Solo freelancers (designers, developers, writers)
- Secondary: Small agencies (2-5 people) who need simple shared invoicing

**Success metrics:**

- Time to send first invoice: < 60 seconds
- Weekly active invoicing rate: 80% of users within 30 days
- User retention at 90 days: > 60%

**Constraints:**

- Must work offline (freelancers on unreliable connections)
- No monthly fees (one-time purchase or freemium)
- GDPR compliant (European freelancer market)
```

### Mode B: Assess — Feature proposal against existing telos

**User:** "I want to add a built-in time tracker to QuickBill."

**Agent assessment:**

> **L4 Purpose alignment:** QuickBill's purpose is to eliminate invoicing
> friction. A time tracker is adjacent — it could feed tracked hours directly
> into invoices, reducing friction further. However, the constraint says "must
> work offline" and real-time tracking adds sync complexity. The constraint also
> emphasizes minimalism — adding time tracking risks the "over-featured" problem
> you're trying to solve.
>
> **L3 Experience alignment:** Your key journey is "open app, create invoice,
> send in 60 seconds." A time tracker introduces a separate workflow (start
> timer, track, stop, then invoice). This could complicate the primary journey
> unless it's deeply integrated.
>
> **L2 Contract alignment:** Currently your data model has Invoice and LineItem
> entities. A time tracker would need TimeEntry, Project, and potentially Client
> entities. This roughly doubles your data model surface area.
>
> **L1 Function feasibility:** Your codebase is a simple React app with local
> storage. Adding real-time tracking would need background workers or service
> workers for offline tracking, which is a significant architecture addition.
>
> **Recommendation: Proceed with caveats.** The feature could serve the purpose
> if scoped tightly — "convert tracked time to invoice line items in one click."
> But if it becomes a full time-tracking app, it risks purpose drift. Suggest:
> start with a minimal "quick log hours" feature that populates invoice line
> items, not a real-time timer.

## Common mistakes

| Mistake                                             | Fix                                                                                                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic TELOS.md ("we want to build good software") | Push for specificity. Ask "why?" repeatedly. Reject vague purpose statements.                                                                                    |
| Skipping the codebase scan during assessment        | The feasibility check is essential. Always examine project structure before delivering a recommendation.                                                         |
| Rubber-stamping features as "aligned"               | Genuinely challenge features. If a feature doesn't clearly serve the purpose, say so. The skill's value is in the features it catches, not the ones it approves. |
| Asking all questions at once in Init mode           | Ask one question at a time. Let the user think and respond before moving to the next.                                                                            |
| Treating this as code review                        | This is pre-implementation alignment, not post-implementation review. Focus on purpose and architecture fit, not code quality.                                   |
| Writing TELOS.md without user confirmation          | Always show the draft and ask if it captures their intent before saving.                                                                                         |

## Quick reference

| Situation                          | Action                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| No TELOS.md exists                 | Run Mode A: Init interview (L4 -> L3 -> L2 -> L1), write TELOS.md       |
| TELOS.md exists + feature proposed | Run Mode B: Read telos, scan codebase, assess alignment at all 4 levels |
| Feature clearly aligned            | Recommend "proceed" with brief rationale                                |
| Feature partially aligned          | Recommend "proceed with caveats" and explain what to address            |
| Feature misaligned with purpose    | Recommend "reconsider" and explain the conflict                         |
| User wants to update the telos     | Re-run relevant sections of Mode A, update TELOS.md                     |

## Key principles

1. **Purpose over features** — Every feature must serve the project's reason for
   existing. A feature that doesn't align with the telos is waste, regardless of
   how technically interesting it is.

2. **Specificity over generality** — Vague purpose statements ("help users,"
   "improve productivity") are useless for alignment checks. The skill must push
   for concrete, falsifiable statements about why the project exists and what
   success looks like.

3. **Honest assessment over approval** — The skill's value comes from catching
   misaligned features before they're built. If a feature doesn't serve the
   purpose, say so clearly. False agreement wastes the user's time and budget.

4. **Practical feasibility matters** — Purpose alignment alone isn't enough. A
   feature can serve the telos beautifully but be impractical given the current
   codebase. Always scan the architecture before recommending.

5. **One question at a time** — During Init, don't overwhelm the user. Ask a
   single focused question, wait for the answer, then proceed. This produces
   better, more thoughtful answers.

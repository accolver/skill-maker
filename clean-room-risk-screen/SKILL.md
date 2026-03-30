---
name: clean-room-risk-screen
description: Screens business ideas, offers, and product plans for employer IP, confidentiality, regulatory overreach, sensitive-data misuse, and unsafe claims, then proposes safer clean-room alternatives. Use when a user's edge may depend on employer information, regulated workflows, customer data, or legally sensitive positioning.
compatibility: Works best when the input includes the proposed business idea, offer, or product scope plus any known employer or regulatory constraints.
metadata:
  author: opencode
  version: "0.1"
---

# Clean-Room Risk Screen

## Overview

This skill checks whether a proposed path relies on employer-confidential
materials, sensitive data, restricted customer access, or unsafe regulated-role
framing. The goal is not to provide legal advice. The goal is to separate
allowed behavior from risky behavior and propose safer adjacent paths.

Load `references/risk-categories.md` when classifying risk. Load
`references/safer-alternatives.md` when the original path is unsafe.

## When to use

- When a user wants to monetize domain knowledge tied to a job or employer
- When an offer may drift into legal, compliance, healthcare, tax, or similar
  regulated-role overreach
- When a product plan may depend on PHI, employer data, customer data, or
  unclear IP ownership

**Do NOT use when:**

- There is no meaningful IP, data, or role-boundary risk in the plan

## Workflow

### 1. Identify risk category

Classify risk across:

- employer IP/confidentiality
- customer access rights
- sensitive or regulated data
- licensed or regulated authority
- unsafe claims or positioning

### 2. Decide allowed, conditional, and blocked actions

Produce three buckets:

- `allowed`
- `conditional`
- `blocked`

Be concrete. Do not hide behind vague warnings.

Do not allow paraphrasing or recreating employer-confidential materials from
memory as a fake clean-room workaround.

### 3. Propose a clean-room path

If the original path is risky, propose a safer adjacent route based on:

- public data
- independent firsthand knowledge
- newly created original assets
- generalized workflow understanding
- human-in-the-loop support instead of delegated judgment

### 4. Produce the memo

Return both:

- a readable risk memo
- a JSON block using `assets/risk-screen-template.json`

Use the template field names exactly.

Default sections:

- `Risk Summary`
- `Allowed`
- `Conditional`
- `Blocked`
- `Safer Path`
- `Structured Risk Screen`

## Checklist

- [ ] Specific risks are named, not implied
- [ ] Allowed, conditional, and blocked actions are concrete
- [ ] A safer adjacent path is offered when needed
- [ ] The response avoids pretending to give formal legal advice
- [ ] Readable memo and structured JSON are both present

## Common mistakes

| Mistake                                         | Fix                                                  |
| ----------------------------------------------- | ---------------------------------------------------- |
| Vague legal warning                             | Name exact blocked behaviors                         |
| Treating generalized knowledge as fully blocked | Preserve lawful generalized knowledge where possible |
| Missing safer path                              | Offer a clean-room alternative, not just a stop sign |

## Key principles

1. **Specificity matters** — Name exactly what is blocked, conditional, and
   allowed.
2. **Clean-room beats temptation** — Safer adjacent paths matter more than
   clever justifications.
3. **Generalized knowledge can remain usable** — Restrict confidential assets,
   not lawful judgment itself.

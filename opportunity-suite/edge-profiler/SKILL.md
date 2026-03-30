---
name: edge-profiler
description: Extracts and structures a user's skills, assets, access, constraints, credibility, and usable versus restricted edge into a reusable founder profile. Use when planning businesses, ranking opportunities, validating founder-market fit, or whenever later skills need a clean profile instead of raw conversation.
compatibility: Works best with read/search tools and benefits from conversational follow-up when user context is thin.
metadata:
  author: opencode
  version: "0.1"
---

# Edge Profiler

## Overview

This skill turns messy user background into a reusable founder-edge profile. The
goal is not to flatter the user. The goal is to separate real edge from weak,
restricted, or unusable edge so later skills can reason from something solid.

Treat edge as four different things, not one bucket:

- `usable_edge`
- `restricted_or_unusable_edge`
- `fake_or_overstated_edge`
- `missing_edge`

Load `references/profile-dimensions.md` when filling the profile in detail. Load
`references/intake-questions.md` when the user context is thin or vague.

## When to use

- When a user wants business ideas, monetization paths, or opportunity ranking
- When a later skill needs a clean profile instead of raw conversation history
- When the user gives a long background and the important advantages need to be
  extracted cleanly
- When founder-market fit, distribution quality, or constraint realism are
  central to the task

**Do NOT use when:**

- The user already has a clean structured profile and only needs execution on a
  chosen idea
- The task is purely implementation and the user's background is irrelevant

## Workflow

### 1. Extract evidence from the conversation

Pull concrete evidence from what the user actually said. Do not invent stronger
credentials, access, or buyer trust than the prompt supports.

Capture at least:

- Skills
- Domain experience
- Assets
- Distribution
- Network access
- Constraints
- Credibility signals
- Unfair advantages

### 2. Distinguish usable edge from restricted edge

Separate the profile into:

- `usable_edge`
- `restricted_or_unusable_edge`

Restricted or unusable edge includes things like:

- Employer-confidential information
- Customer access the user cannot legally monetize
- Regulated authority the user does not control
- Weak signals dressed up as strong edge

If the user's only apparent moat is restricted, say so plainly.

### 3. Identify fake or overstated edge

Some signals sound impressive but do not create commercial leverage by
themselves.

Common examples:

- follower count without buyer quality
- employer-mediated access that is not independently owned
- prestige brands or smart peers without route to customers
- broad market familiarity without trust, access, or distribution

Do not inflate these into moat. Put them under `fake_or_overstated_edge` or
`weak_spots`.

### 4. Fill gaps without flattering

If the profile is incomplete, ask up to 5 short follow-up questions.

If niche, buyer access, or distribution quality is weak or unclear, spend most
of those questions on wedge discovery before concluding what the user's real
usable edge is. Do not default to assumptions when the missing information is
the route to customers.

Only proceed with assumptions when follow-up is genuinely impossible or the user
explicitly declines more questions. In that case, state clearly that the profile
is provisional and that any opportunity recommendation should be treated as
lower confidence.

Do not confuse:

- follower count with buyer quality
- industry familiarity with permission to act
- technical skill with distribution
- interest with edge
- prestige with buyer access
- introductions with durable distribution

For every claimed edge, pressure-test it with these questions:

- Is it owned?
- Is it legal to use?
- Is it buyer-relevant?
- Is it repeatable?
- Is it independent of the user's employer?

Mandatory deeper intake trigger:

If the user has strong skills but weak or unclear niche, buyer access, or
distribution, ask targeted follow-up in these categories before finalizing the
profile:

- reachable buyer segment
- repeated painful workflow
- prior trust, referrals, or pull signals
- owned distribution or warm-path quality
- clean-room-safe relationships and assets
- willingness to start with a service or concierge wedge

Keep this to 3-5 total questions, but make them decision-critical. Prefer
questions that collapse uncertainty about who the first buyer is, why they would
care, and how the user can reach them legally and independently.

### 5. Produce the reusable profile

Return both:

- a human-readable profile summary
- a JSON block using `assets/profile-template.json`

Use the template field names exactly. This skill is meant to feed later skills,
so schema consistency matters.

Default human-readable sections:

- `Profile Summary`
- `Usable Edge`
- `Restricted Edge`
- `Fake or Overstated Edge`
- `Weak Spots`
- `Follow-Up Questions`
- `Structured Profile`

Substance requirements:

- Identify at least one real advantage or say the edge is weak
- Identify restricted edge when it exists
- Be explicit about buyer/distribution quality, not just audience size
- Name the top missing information if it materially affects later decisions
- If something sounds impressive but is not monetizable, call that out directly
- Keep restricted materials out of `user_profile.assets`; put them only in
  `restricted_or_unusable_edge`
- Keep fake or overstated edge out of `usable_edge` and `unfair_advantages`

## Checklist

- [ ] The profile uses concrete evidence from the user, not flattering guesses
- [ ] Usable edge and restricted edge are separated clearly
- [ ] Fake or overstated edge is called out when present
- [ ] Distribution quality is assessed, not just reach or follower count
- [ ] The user's constraints are explicit
- [ ] If niche or distribution was weak, follow-up questions probed for a
      reachable buyer and repeated pain before concluding on usable edge
- [ ] The response includes both readable summary and structured JSON

## Examples

**Example:**

Input: I run a 20k newsletter for private practice accountants. People trust me,
but most readers are operators, not owners. I know their workflow pain well. I
also have internal templates from my employer, but I cannot reuse them.

Output: A profile that marks the newsletter as a real distribution asset but
buyer quality as mixed, records workflow knowledge as usable edge, marks the
employer templates as restricted edge, and asks follow-up questions about owner
reach and paid buyer access.

```json
{
  "user_profile": {
    "skills": ["editorial packaging", "workflow analysis"],
    "distribution": ["20k niche newsletter"],
    "constraints": ["cannot reuse employer templates"]
  },
  "usable_edge": [
    "Niche audience trust",
    "Real workflow familiarity"
  ],
  "restricted_or_unusable_edge": [
    "Employer-owned templates"
  ],
  "fake_or_overstated_edge": []
}
```

## Common mistakes

| Mistake                                  | Fix                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Treating industry familiarity as a moat  | Ask whether the user has real access, trust, or distribution            |
| Treating employer access as usable edge  | Move it to `restricted_or_unusable_edge` unless clearly usable          |
| Treating follower count as buyer quality | Separate reach from monetizable trust and buyer access                  |
| Treating prestige or smart peers as moat | Put it under `fake_or_overstated_edge` unless it creates buyer leverage |
| Filling gaps with flattering assumptions | Name uncertainty and ask targeted follow-up                             |

## Quick reference

| Operation           | How                                                              |
| ------------------- | ---------------------------------------------------------------- |
| Extract profile     | Pull concrete evidence across the core profile dimensions        |
| Separate edge types | Split into usable, restricted, fake/overstated, and missing edge |
| Handle gaps         | Ask short follow-ups or proceed with explicit assumptions        |
| Format result       | Human summary plus JSON using `assets/profile-template.json`     |

## Key principles

1. **Evidence over vibes** — Profile from what the user actually said, not from
   optimistic projection.
2. **Restricted edge is not usable edge** — Employer, legal, or confidentiality
   limits must stay visible.
3. **Distribution quality matters** — Reach without buyer trust is not the same
   as monetizable access.
4. **Do not inflate** — Prestige, introductions, and vague familiarity do not
   become moat without evidence.
5. **Weak edge is a valid conclusion** — Say it when true instead of forcing a
   stronger story.

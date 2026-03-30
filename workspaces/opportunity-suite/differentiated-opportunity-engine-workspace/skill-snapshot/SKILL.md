---
name: differentiated-opportunity-engine
description: Identifies differentiated money-making opportunities for skilled solo operators, ranks them across cash-now, asset-later, and hybrid paths, and produces validation plans plus tool/build specs. Use when a user wants business ideas, monetization strategies, micro-SaaS wedges, service-to-software paths, or AI-leveraged opportunities matched to their skills, assets, access, credibility, and constraints.
compatibility: Works best in environments with read/search tools and optional web access for market checks.
metadata:
  author: opencode
  version: "0.1"
---

# Differentiated Opportunity Engine

## Overview

This skill finds money-making opportunities that fit the specific user instead
of producing generic hustle lists. The core principle is to rank opportunities
by founder edge first, then by speed to revenue, durability, and AI leverage.

Load `references/scoring-rubric.md` when scoring or comparing opportunities in
detail. Load `references/opportunity-patterns.md` when the opportunity set needs
widening.

## When to use

- When the user wants help finding business ideas, monetization paths, or
  side-income opportunities
- When the user wants AI-leveraged opportunities matched to their skills,
  assets, access, or network
- When the user wants to decide between services, micro-SaaS, automations, data
  products, or content-supported businesses
- When the user has multiple possible paths and needs a ranked recommendation
  with validation steps
- When the user wants a plan for how to exploit a niche advantage legally and
  practically

**Do NOT use when:**

- The user already chose an opportunity and only needs implementation details
  for a specific app, workflow, or campaign
- The request depends on illegal tactics, fraud, impersonation, IP theft,
  unlawful spam, or obvious platform abuse

## Workflow

### 1. Build the differentiation profile

Extract the user's edge before brainstorming. Focus on skills, domain
experience, assets, distribution, network access, credibility, capital/time
constraints, and risk tolerance. Interests matter only as a tiebreaker unless
the user makes them central.

If key data is missing, ask up to 5 short intake questions. If follow-up is not
practical, proceed with explicit assumptions instead of stalling.

Output a concise `Differentiation Profile` section with:

- Skills and domain experience
- Assets and access advantages
- Distribution and network leverage
- Constraints
- Credibility signals
- Unfair advantages

### 2. Generate opportunity candidates

Create a broad but realistic set of candidates using
`references/opportunity-patterns.md`. Always consider:

- Cash-now options
- Asset-later options
- Hybrid ladders such as `service -> automation -> product`

Prefer opportunities that can exploit the user's existing edge quickly. Do not
default to pure content businesses. Treat content as a support layer unless the
user has unusually strong distribution.

Discard candidates that are generic, legally risky, highly platform-dependent,
or impossible to validate with the user's current resources.

### 3. Score and rank opportunities

Score each candidate using the rubric in `references/scoring-rubric.md`. Every
opportunity must answer:

`Why does this user have an advantage over a random competent person with ChatGPT?`

If that answer is weak, lower the rank even if the market is large.

For each serious candidate, include:

- `Why this user can win`
- `Cash-now / asset-later / hybrid` classification
- A short thesis
- A compact scorecard

Split the ranked list into:

- `Cash Now`
- `Asset Later`
- `Hybrid Ladder`

### 4. Recommend one path and pressure-test it

Pick the best near-term path, not the most glamorous one. Default preference
order:

1. Hybrid ladders
2. Strong-edge service or micro-SaaS plays
3. Content-supported businesses
4. Pure content/media plays only when the distribution edge is unusually strong

Pressure-test the top recommendation with:

- Demand clarity
- Distribution fit
- Execution difficulty
- Compliance and platform risk
- Whether a service-first wedge should come before software

If a service-first path improves odds of a later micro-SaaS, say that
explicitly.

### 5. Produce execution outputs

Always return both a human-readable report and a machine-readable JSON block.
Use the template in `assets/opportunity-analysis-template.json` as the default
shape.

The human-readable report must include these exact section headers:

- `Differentiation Profile`
- `Top Opportunities`
- `Best Bet`
- `7-Day Validation Plan`
- `Build Spec`
- `Kill Criteria`

The JSON should capture the same result so later tools can consume it.

## Checklist

- [ ] The user's edge is explicit, not implied
- [ ] Opportunities are split across cash-now, asset-later, and hybrid paths
- [ ] Every serious recommendation explains why this user can win
- [ ] The best bet includes a 7-day validation plan, build spec, and kill
      criteria
- [ ] The response includes both human-readable sections and a JSON block

## Examples

**Example:**

Input: A staff data engineer with 8 years in logistics has relationships with 15
freight brokers, no audience, and 10 hours a week. They want a legal AI business
and are open to services before software.

Output: A report that avoids generic AI content plays, ranks a broker-reporting
automation service and a shipment-exception micro-SaaS highly, explains the
user's logistics access advantage, recommends a hybrid ladder, gives a 7-day
validation plan based on broker interviews and a concierge pilot, and ends with
a JSON block containing the ranked opportunities and best bet.

```json
{
  "user_profile": {
    "skills": ["data engineering", "workflow automation"],
    "network_access": ["15 freight brokers"],
    "constraints": ["10 hours/week"]
  },
  "opportunities": [
    {
      "id": "opp_broker_reporting",
      "category": "hybrid",
      "title": "Broker reporting concierge to workflow SaaS",
      "why_user_can_win": "Existing freight relationships and domain fluency reduce discovery and sales friction.",
      "scores": {
        "edge_fit": 9,
        "speed_to_revenue": 8,
        "durability": 7,
        "distribution_fit": 8,
        "ai_leverage": 6,
        "defensibility": 7,
        "execution_difficulty": 5,
        "compliance_platform_risk": 2
      }
    }
  ],
  "best_bet": "opp_broker_reporting"
}
```

## Common mistakes

| Mistake                                       | Fix                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Ranking generic AI wrappers highly            | Penalize weak founder edge and weak distribution advantages                         |
| Defaulting to pure content/media businesses   | Only keep content-first paths when the user's distribution edge is unusually strong |
| Treating interests as the main differentiator | Weight skills, assets, access, and credibility ahead of interests                   |
| Recommending software before validation       | Prefer a service or concierge wedge when it improves learning speed                 |
| Giving ideas without kill criteria            | State the signal that would cause the user to stop or pivot                         |

## Quick reference

| Operation           | How                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Profile the user    | Extract skills, assets, access, credibility, constraints, then summarize them plainly        |
| Score opportunities | Use `references/scoring-rubric.md` and rank by edge first, then revenue speed and durability |
| Expand candidates   | Use `references/opportunity-patterns.md` to widen beyond the first obvious idea              |
| Format output       | Human-readable sections plus JSON using `assets/opportunity-analysis-template.json`          |

## Key principles

1. **Edge first** — The skill exists to find opportunities the user can win, not
   attractive markets in the abstract.
2. **Legal and practical** — Reject illegal, deceptive, or obviously
   platform-abusive paths even if they look lucrative.
3. **Validation before build** — A fast paid pilot, concierge workflow, or
   manual test beats speculative product building.
4. **Hybrid bias** — Prefer paths that can make money soon and compound into an
   asset over time.
5. **Structured output** — Always produce both decision-ready prose and
   machine-readable JSON so downstream tools can act on the result.

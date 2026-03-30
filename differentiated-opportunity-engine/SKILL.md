---
name: differentiated-opportunity-engine
description: Identifies differentiated money-making opportunities for skilled solo operators, ranks them across cash-now, asset-later, and hybrid paths, and produces validation plans plus tool/build specs. Use when a user wants business ideas, monetization strategies, micro-SaaS wedges, service-to-software paths, or AI-leveraged opportunities matched to their skills, assets, access, credibility, constraints, and legal boundaries.
compatibility: Works best in environments with read/search tools and optional web access for market checks.
metadata:
  author: opencode
  version: "0.3"
---

# Differentiated Opportunity Engine

## Overview

This skill finds money-making opportunities that fit the specific user instead
of producing generic hustle lists. The core principle is to rank opportunities
by founder edge first, then by speed to revenue, durability, and AI leverage,
while being willing to say `not yet` when the user's constraints make the goal
unrealistic.

Load `references/scoring-rubric.md` when scoring or comparing opportunities in
detail. Load `references/opportunity-patterns.md` when the opportunity set needs
widening. Load `references/adversarial-checks.md` when the user's preference,
constraints, or legal situation make the obvious answer suspicious.

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

If key data is missing, ask up to 5 short intake questions.

When the user's niche, buyer access, or distribution is weak or unclear, do not
rank opportunities yet. First use 3-5 targeted questions to identify the
narrowest credible wedge.

Only proceed with assumptions if the user cannot answer or explicitly wants a
provisional answer. If you proceed without wedge clarity, mark the result as
provisional and downgrade confidence.

Output a concise `Differentiation Profile` section with:

- Skills and domain experience
- Assets and access advantages
- Distribution and network leverage
- Constraints
- Credibility signals
- Unfair advantages

If distribution is weak, the intake must focus less on abstract interests and
more on:

- who the user can reach now
- what repeated painful workflow they know best
- what prior work created trust or pull
- whether there is a clean-room-safe warm path
- whether a service-first wedge is acceptable

Recommendation gate for weak distribution:

If the user lacks a clear niche or owned distribution, do not jump directly from
broad capability to a market recommendation. First identify a plausible initial
wedge: a narrow buyer, one urgent workflow, one credible path to first
conversations, and one legally usable trust asset.

If that cannot be identified after concise follow-up, the primary recommendation
should usually be an edge-building or wedge-finding plan, not a fully specified
business pick.

### 2. Run the feasibility and legality screen

Before ideating, test whether the user's requested outcome is credible under the
current constraints.

Check for:

- Impossible bundles such as
  `fast money + no selling + no content + no service + no audience + very little time`
- Employer confidentiality, customer-data rights, IP restrictions, licensing,
  procurement conflicts, and regulated-workflow boundaries
- Whether the user's stated preference conflicts with the evidence

Important: if the user's only apparent edge comes from employer-confidential
information, proprietary customer access, or regulated authority they do not
legally control, treat that as **no usable edge** until proven otherwise.

Set a `feasibility_verdict` mentally as one of:

- `go`
- `conditional`
- `no_go`

If the right answer is `conditional` or `no_go`, say so plainly. Do not invent a
glamorous path to satisfy the user's original preference.

### 3. Generate opportunity candidates

Create a broad but realistic set of candidates using
`references/opportunity-patterns.md`. Always consider:

- Cash-now options
- Asset-later options
- Hybrid ladders such as `service -> automation -> product`

Also include at least one non-default candidate when it is relevant, such as:

- Audience or community-led products
- Data or benchmark subscriptions
- Templates or info products
- Partnerships, reseller, or licensing wedges
- `No-go for now` with an edge-building plan

When distribution is weak, always include at least one candidate explicitly
optimized for that weakness, such as partner-channel, white-label, reseller,
embedded specialist, or selling through someone who already owns buyer trust.

Prefer opportunities that can exploit the user's existing edge quickly. Do not
default to pure content businesses. Treat content as a support layer unless the
user has unusually strong distribution, audience trust, or direct demand
capture.

Apply a platform-specificity penalty. Do not anchor on GCP, AWS, React, or any
other ecosystem unless one of these is true:

- the user has independently owned buyer access in that ecosystem
- the platform creates a truly distinct pain
- early validation shows that the platform-specific version converts better than
  the platform-neutral version

Discard candidates that are generic, legally risky, highly platform-dependent,
or impossible to validate with the user's current resources.

### 4. Score and rank opportunities

Score each candidate using the rubric in `references/scoring-rubric.md`. Every
opportunity must answer:

`Why does this user have an advantage over a random competent person with ChatGPT?`

If that answer is weak, lower the rank even if the market is large.

If the answer depends mostly on generic skill or broad market familiarity, stop
and ask follow-up instead of forcing a ranking.

If the user's preferred path scores poorly, include it anyway and explain why it
loses.

For each serious candidate, include:

- `Why this user can win`
- `Why this could fail`
- `Cash-now / asset-later / hybrid` classification
- A short thesis
- A compact scorecard

Split the ranked list into:

- `Cash Now`
- `Asset Later`
- `Hybrid Ladder`

### 5. Recommend one path and pressure-test it

Pick the best near-term path, not the most glamorous one. Use this preference
order only when the evidence is close:

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
- Why the obvious alternative loses
- What would change the recommendation

Also include one strongest alternative that tries to beat the winner. Do not use
a token rejected path. State:

- why it might actually be better
- what assumption keeps the current winner ahead
- what evidence would flip the recommendation

If a service-first path improves odds of a later micro-SaaS, say that
explicitly.

If you recommend service-first, specify all of these:

- A concrete first offer
- A narrow ICP
- One measurable pain or outcome metric
- A clear productization trigger

If you recommend content-led or audience-led monetization, justify it with the
user's actual distribution strength and name monetization paths beyond ads.

If the correct answer is `conditional` or `no_go`, state the binding
constraints, explain why the preferred path is not credible now, and give the
shortest realistic path to improve the odds.

If the verdict is `no_go`, the main recommendation should usually be a
constraint-change or edge-building plan, not a disguised product pick. You may
mention the least-bad fallback path, but do not present it as realistic near-
term income if the evidence does not support that.

### 6. Produce execution outputs

Always return both a human-readable report and a machine-readable JSON block.
Use the template in `assets/opportunity-analysis-template.json` as the default
shape.

Use these section headers by default unless a `conditional` or `no_go` answer
needs a slight wording change:

- `Differentiation Profile`
- `Top Opportunities`
- `Best Bet`
- `7-Day Validation Plan`
- `Build Spec`
- `Kill Criteria`

The JSON should capture the same result so later tools can consume it.

Requirements for substance, not just formatting:

- The best bet in prose and the best bet in JSON must match.
- The 7-day validation plan must include numeric targets where possible.
- Kill criteria must be falsifiable, preferably with counts, dates, or threshold
  conditions.
- Include at least one rejected path with a concrete reason.

## Checklist

- [ ] The user's edge is explicit, not implied
- [ ] Feasibility, legality, and confidentiality have been screened
- [ ] Opportunities are split across cash-now, asset-later, and hybrid paths
- [ ] Every serious recommendation explains why this user can win
- [ ] The response explains why the best bet beats the obvious alternative
- [ ] If niche or distribution was weak, the skill asked wedge-finding questions
      before ranking opportunities
- [ ] The final recommendation names a narrow buyer, urgent workflow, and
      credible first channel or explicitly states that those are still unproven
- [ ] The best bet includes a 7-day validation plan, build spec, and kill
      criteria
- [ ] Validation targets and kill criteria are concrete, not generic
- [ ] The response includes both human-readable sections and a JSON block

## Examples

**Example:**

Input: A staff data engineer with 8 years in logistics has relationships with 15
freight brokers, no audience, and 10 hours a week. They want a legal AI business
and are open to services before software.

Output: A report that avoids generic AI content plays, ranks a broker-reporting
automation service and a shipment-exception micro-SaaS highly, explains the
user's logistics access advantage, recommends a hybrid ladder, says why a pure
micro-SaaS-first path loses today, gives a 7-day validation plan with numeric
targets based on broker interviews and a concierge pilot, includes falsifiable
kill criteria, and ends with JSON containing the ranked opportunities and best
bet.

```json
{
  "user_profile": {
    "skills": ["data engineering", "workflow automation"],
    "network_access": ["15 freight brokers"],
    "constraints": ["10 hours/week"]
  },
  "feasibility_verdict": "go",
  "binding_constraints": [],
  "opportunities": [
    {
      "id": "opp_broker_reporting",
      "category": "hybrid",
      "title": "Broker reporting concierge to workflow SaaS",
      "why_user_can_win": "Existing freight relationships and domain fluency reduce discovery and sales friction.",
      "why_this_could_fail": "If brokers refuse to share workflow data or the problem is too bespoke to standardize.",
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
  "rejected_paths": [
    {
      "title": "Generic freight AI dashboard",
      "reason": "Too broad and weakly differentiated for the user's current distribution."
    }
  ],
  "best_bet": "opp_broker_reporting"
}
```

## Common mistakes

| Mistake                                              | Fix                                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Ranking generic AI wrappers highly                   | Penalize weak founder edge and weak distribution advantages                         |
| Defaulting to pure content/media businesses          | Only keep content-first paths when the user's distribution edge is unusually strong |
| Treating interests as the main differentiator        | Weight skills, assets, access, and credibility ahead of interests                   |
| Recommending software before validation              | Prefer a service or concierge wedge when it improves learning speed                 |
| Giving ideas without kill criteria                   | State the signal that would cause the user to stop or pivot                         |
| Treating impossible constraints as compatible        | Say the path is conditional or no-go and name what must change                      |
| Confusing domain familiarity with legal right to act | Screen for confidentiality, licensing, IP, and regulated-work boundaries            |

## Quick reference

| Operation            | How                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Profile the user     | Extract skills, assets, access, credibility, constraints, then summarize them plainly        |
| Run feasibility gate | Check constraint realism, legality, confidentiality, and whether the preference is credible  |
| Score opportunities  | Use `references/scoring-rubric.md` and rank by edge first, then revenue speed and durability |
| Expand candidates    | Use `references/opportunity-patterns.md` to widen beyond the first obvious idea              |
| Format output        | Human-readable sections plus JSON using `assets/opportunity-analysis-template.json`          |

## Key principles

1. **Edge first** — The skill exists to find opportunities the user can win, not
   attractive markets in the abstract.
2. **Legal and practical** — Reject illegal, deceptive, or obviously
   platform-abusive paths even if they look lucrative.
3. **Validation before build** — A fast paid pilot, concierge workflow, or
   manual test beats speculative product building.
4. **Feasibility honesty** — Say `not yet` when the user's constraint bundle or
   legal situation makes the desired path unrealistic.
5. **Structured output** — Always produce both decision-ready prose and
   machine-readable JSON so downstream tools can act on the result.

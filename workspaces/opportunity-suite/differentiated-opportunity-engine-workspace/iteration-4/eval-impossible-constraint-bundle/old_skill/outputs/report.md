# Differentiation Profile

- Skills and domain experience: Junior full-stack developer. Generalist web app
  capability, but no stated niche domain depth, buyer fluency, or proprietary
  workflow knowledge.
- Assets and access advantages: No niche audience, no special domain access, no
  budget.
- Distribution and network leverage: No existing distribution channel. User
  refuses sales calls, content creation, and cold outreach, which removes the
  normal early-customer paths.
- Constraints: Only 2 hours per week, 30-day timeline, wants $3000 MRR, wants AI
  micro-SaaS specifically, refuses services.
- Credibility signals: Can build software, but no stated brand, testimonials,
  case studies, or domain authority.
- Unfair advantages: Very limited. The main advantage is the ability to ship a
  small product without outside help.

This is an impossible-constraint bundle for the stated goal. A random competent
developer with ChatGPT is in almost the same position, which means founder edge
is weak and distribution is the main blocker.

# Top Opportunities

## Cash Now

### 1. Asynchronous AI audit productized service

- Why this user can win: It fits a junior builder who can package one narrow
  deliverable quickly.
- Why it still fails the brief: It is a service, which the user refuses.
- Classification: Cash-now
- Thesis: The fastest legal path to revenue would usually be a narrow async
  service sold through platforms, but this conflicts directly with the user's
  constraints.
- Scorecard: Edge fit 3, Speed to revenue 6, Durability 3, Distribution fit 4,
  AI leverage 6, Defensibility 2, Execution difficulty 3, Compliance/platform
  risk 2.

## Asset Later

### 2. Marketplace-first micro-SaaS for a search-driven pain

- Why this user can win: This is the only path that partially substitutes for
  missing audience and outreach by borrowing distribution from an app store or
  marketplace.
- Classification: Asset-later
- Thesis: Build a tiny painkiller where buyers already search, such as a Chrome
  extension, Shopify app, or Slack utility for a repetitive workflow. The app
  store becomes the acquisition channel.
- Scorecard: Edge fit 2, Speed to revenue 3, Durability 6, Distribution fit 4,
  AI leverage 6, Defensibility 2, Execution difficulty 5, Compliance/platform
  risk 3.

### 3. Template-plus-AI subscription for a broad persona

- Why this user can win: Low build complexity.
- Why it is weak: No niche, no distribution, easy to copy, and content is
  normally required to acquire users.
- Classification: Asset-later
- Thesis: Sell a subscription around AI-assisted templates or workflows for job
  seekers, freelancers, or small teams, but this is a generic wrapper risk.
- Scorecard: Edge fit 1, Speed to revenue 3, Durability 3, Distribution fit 2,
  AI leverage 5, Defensibility 1, Execution difficulty 2, Compliance/platform
  risk 2.

## Hybrid Ladder

### 4. Concierge workflow to micro-SaaS

- Why this user can win: This would normally be the best path because it creates
  customer insight and revenue before product build.
- Why it still fails the brief: It requires services and direct customer work,
  which the user refuses.
- Classification: Hybrid ladder
- Thesis: In a realistic version of this plan, the user would manually solve one
  painful workflow for a niche and then productize the repeated steps.
- Scorecard: Edge fit 4, Speed to revenue 7, Durability 7, Distribution fit 3,
  AI leverage 7, Defensibility 4, Execution difficulty 4, Compliance/platform
  risk 2.

## Ranking Summary

1. Marketplace-first micro-SaaS for a search-driven pain
2. Concierge workflow to micro-SaaS
3. Asynchronous AI audit productized service
4. Template-plus-AI subscription for a broad persona

Important: The top-ranked option is only the least-bad fit under the user's
self-imposed constraints. It is not a credible path to $3000 MRR in 30 days.

# Best Bet

The correct answer is to change at least one constraint.

If the user refuses to change any constraint, the least-bad move is:

Build one marketplace-first micro-SaaS with a painfully narrow use case, and
treat the next 30 days as a validation sprint for first revenue, not a realistic
sprint to $3000 MRR.

Recommended wedge:

- Pick a platform with built-in search demand and simple install flow: Chrome
  Web Store first, Shopify second, Slack third.
- Target a repetitive, keyword-searchable pain where AI helps but is not the
  whole value.
- Example shape: a Chrome extension that reads a page the user is already on and
  generates a structured output they can use immediately.
- Good wedge criteria: one persona, one page context, one job to be done, one
  obvious before/after outcome.

Pressure test:

- Demand clarity: Medium at best. Search demand may exist, but niche selection
  quality matters.
- Distribution fit: Weak but non-zero because marketplace search replaces some
  missing outreach.
- Execution difficulty: Manageable only if the feature set stays tiny.
- Compliance and platform risk: Acceptable if the app avoids scraping abuse,
  spam, or regulated claims.
- Service-first wedge: Yes, it would improve odds materially, but it conflicts
  with the user's stated refusal.

Hard truth:

- With 8 total hours available in 30 days, no audience, no niche access, no
  outbound, and no services, $3000 MRR is not a responsible expectation.
- The realistic target is first 1 to 5 paying users or proof that a marketplace
  search channel can produce installs and conversions.

# 7-Day Validation Plan

Day 1:

- Choose one marketplace only.
- Collect 20 search terms from that marketplace and adjacent review sites.
- Pick one wedge where existing tools have complaints about speed, quality, or
  missing edge-case support.

Day 2:

- Read 30 one-star to three-star reviews for competing tools.
- Write down repeated complaints and ignored feature requests.
- Reject the idea if complaints are vague or mostly about price.

Day 3:

- Build a fake-door landing page and marketplace listing draft with one core
  promise.
- Include pricing, screenshots or mockups, and a waitlist or checkout interest
  capture.

Day 4:

- Build the smallest usable prototype for the core outcome only.
- Do not build team features, billing sophistication, dashboards, or settings
  pages unless essential.

Day 5:

- Publish the listing or a demo page anywhere the marketplace allows.
- Measure impressions, click-through rate, installs or signups, and activation.

Day 6:

- Tighten onboarding and rename the offer based on the search terms and
  complaints.
- Remove any feature not tied directly to activation.

Day 7:

- Decide using hard numbers.
- Continue only if there is evidence of discovery plus activation plus at least
  one strong buying signal.

# Build Spec

- Product type: Marketplace-first micro-SaaS, ideally a Chrome extension backed
  by a minimal API.
- User: One narrow persona already searching for tools in a marketplace.
- Core workflow: Input is the current page context or pasted text. Output is one
  structured artifact the user can immediately copy, export, or apply.
- Must-have features:
- Single clear use case
- Fast onboarding with no manual setup
- One high-quality AI transformation
- Usage cap or free trial
- Basic analytics for impression to install to activation tracking
- Nice-to-have features to avoid in v1:
- Teams
- Large settings surface
- Multi-persona support
- Broad dashboard productization
- Suggested stack:
- Frontend: existing JS or TS stack the user already knows
- Backend: one simple API route for AI calls and metering
- Storage: lightweight hosted database only if needed
- Billing: Stripe payment link or the marketplace's native billing if available
- Analytics: simple events for install, activate, convert
- Positioning rule: Sell the outcome, not generic AI. Example: "Turn page X into
  artifact Y in 10 seconds."

# Kill Criteria

- Stop if the user refuses to relax any constraint and also expects the plan to
  be high-probability.
- Stop if 30 competitor reviews do not reveal a repeated complaint pattern.
- Stop if the value proposition cannot be described as one persona plus one
  workflow plus one outcome.
- Stop if a fake-door page gets near-zero interest from marketplace traffic.
- Stop if the prototype cannot be built to a usable state within the user's 8
  total hours for the month.
- Stop if no one reaches activation or no one shows willingness to pay.
- Pivot only if a different wedge on the same marketplace has clearer
  complaint-driven demand.

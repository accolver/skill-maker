# Differentiation Profile

Assumptions used because no follow-up was available: you can build and deploy a
basic web app or extension, handle async text support, and use existing
marketplaces/directories, but you will not do sales calls, services, cold
outreach, or ongoing content.

- Skills and domain experience: junior full-stack development, basic product
  implementation, API integration, UI/backend shipping, AI-assisted coding.
- Assets and access advantages: none stated beyond general coding ability and
  access to commodity AI tools.
- Distribution and network leverage: no audience, no niche community, no special
  domain access, no warm buyer channel.
- Constraints: no budget, 2 hours per week, wants $3000 MRR in 30 days, refuses
  sales calls, services, content creation, and cold outreach.
- Credibility signals: can build software, but no stated operator reputation or
  domain authority.
- Unfair advantages: very limited. The only real edge is being able to build a
  narrow tool quickly without paying contractors.

Constraint reality check: the requested outcome is not realistic as stated. A
random competent builder with the same tools can copy generic AI micro-SaaS
ideas, and your constraints remove the usual ways to get fast demand. Under this
bundle, the correct target is not $3000 MRR in 30 days. The correct target is
first proof of pull: 3-10 paying users or one clear repeatable acquisition
channel.

# Top Opportunities

## 1. Review-mined marketplace micro-tool

- Classification: Hybrid Ladder
- Thesis: Find a painful, repeated complaint inside an app marketplace with
  built-in buyer intent, then ship the narrowest possible fix as a self-serve
  tool.
- Why this user can win: this is the only path that partially compensates for
  having no audience or sales motion. You can piggyback on existing demand in
  Chrome Web Store, Shopify App Store, Google Workspace Marketplace, or a niche
  SaaS integration directory.
- Best shape: pick one workflow tied to an existing platform, not a general AI
  assistant.
- Example wedge: "summarize and label support tickets from Zendesk export CSVs
  inside Google Sheets" or "turn LinkedIn job posts into a structured tracker in
  Sheets".
- Scorecard: edge fit 3, speed to revenue 4, durability 6, distribution fit 4,
  ai leverage 7, defensibility 3, execution difficulty 4, compliance/platform
  risk 3.

## 2. Tiny async B2B utility with self-serve checkout

- Classification: Asset Later
- Thesis: Build a single-purpose AI utility for one repetitive back-office task
  and sell it directly with Stripe, aiming for a few niche users rather than
  broad adoption.
- Why this user can win: coding ability lets you ship cheaply, but with no niche
  access or distribution the acquisition path is weak.
- Best shape: a Google Sheets add-on, Slack bot, or email triage tool with one
  obvious job and a low monthly price.
- Scorecard: edge fit 2, speed to revenue 3, durability 5, distribution fit 2,
  ai leverage 7, defensibility 2, execution difficulty 3, compliance/platform
  risk 2.

## 3. Programmatic SEO or content-led AI tool

- Classification: Cash Now
- Thesis: publish targeted pages around a narrow pain point to pull users into a
  tool.
- Why this user can win: weak. This normally needs sustained content work, which
  you explicitly refuse.
- Verdict: discard for this user because it conflicts directly with the
  constraint bundle.
- Scorecard: edge fit 1, speed to revenue 1, durability 4, distribution fit 1,
  ai leverage 5, defensibility 1, execution difficulty 5, compliance/platform
  risk 1.

Ranking summary:

1. Review-mined marketplace micro-tool
2. Tiny async B2B utility with self-serve checkout
3. Programmatic SEO or content-led AI tool

# Best Bet

The best available path is:

Build one review-mined marketplace micro-tool, but change the success metric.

Do not optimize for $3000 MRR in 30 days. With 2 hours a week and no
distribution engine, that target is fantasy. Optimize for one tiny tool that can
get installed and paid for without talking to anyone.

What to do:

1. Choose one marketplace with built-in search intent: Chrome Web Store, Shopify
   App Store, or Google Workspace Marketplace.
2. Read 50-100 recent 1-star to 3-star reviews across competing apps.
3. Look for a repeated complaint that is narrow, boring, and easy to explain in
   one sentence.
4. Ship the smallest self-serve fix for that complaint.
5. Price it at $9-$29 per month or a $49-$99 one-time launch price.

Selection rules:

- The problem must already have buyers searching for it.
- The fix must be understandable in one screenshot and one sentence.
- The first version must fit in roughly 6-10 total build hours.
- The tool must avoid heavy integrations, team workflows, and enterprise
  compliance.

If you refuse to relax any constraint, this is the only path worth attempting.
If you are willing to relax exactly one constraint, relax time first. Moving
from 2 hours to 5 hours a week improves the odds more than any other single
change.

# 7-Day Validation Plan

This plan assumes only about 2 hours total.

Day 1:

- Pick one marketplace only.
- Collect 30 review snippets from competing tools.

Day 2:

- Group the complaints into repeated jobs-to-be-done.
- Keep only problems that appear at least 5 times.

Day 3:

- Choose one wedge with a simple before/after outcome.
- Write a one-sentence promise and a three-bullet landing page.

Day 4:

- Build a no-frills landing page with email capture or Stripe prepay.
- Include one screenshot or mockup.

Day 5:

- Publish the page and the marketplace listing draft.
- If possible, add a waitlist or pre-order button.

Day 6:

- Check whether strangers are finding the listing or page through marketplace
  search, directory traffic, or direct keyword intent.
- If there is no realistic discoverability route, stop.

Day 7:

- Build only the smallest usable version if at least one of these is true: you
  get 3+ waitlist signups, 1 prepay, or clear evidence that the keyword/review
  pain is active and under-served.

Important note: without outreach, your validation relies mostly on existing
marketplace demand signals, not on direct user conversations. That is weaker
than a normal validation loop, which is why the goal must be smaller.

# Build Spec

Recommended product shape:

- Frontend: one landing page plus one minimal app screen or extension popup.
- Backend: Supabase or Firebase for auth and data.
- Payments: Stripe payment links or the marketplace billing system if the
  platform supports it.
- AI layer: one task-specific prompt flow, not a general chatbot.
- Analytics: simple event tracking for visits, installs, activations, and paid
  conversions.

Required features only:

- Single clear input
- Single valuable output
- One sample workflow
- Self-serve signup and payment
- Basic error handling

Avoid:

- Multi-user collaboration
- Custom dashboards
- Broad feature sets
- Multiple models
- Any feature that depends on enterprise trust or manual onboarding

Build heuristic:

- If the MVP cannot be described as "input X, get output Y" in one sentence, the
  wedge is too broad.

# Kill Criteria

Stop or pivot if any of these happen:

- You cannot find one repeated complaint in marketplace reviews with clear
  buying intent.
- The wedge needs more than 6-10 build hours for a usable first version.
- The tool needs active outreach to get first users.
- The promise sounds generic enough that a random AI wrapper could copy it
  immediately.
- After the first listing/landing page is live, there is no sign of installs,
  waitlist signups, or prepay interest.

Bottom line: under your current constraints, do not chase $3000 MRR in 30 days.
Build a marketplace-distributed micro-tool only if you are willing to treat
month one as a proof-of-demand sprint. Otherwise, the correct move is to change
the constraint bundle before building anything.

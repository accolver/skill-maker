# Final Benchmark — pr-description

## Overview

The **pr-description** skill guides agents through generating structured pull
request descriptions with motivation, conceptual change summaries,
copy-pasteable testing instructions, rollback plans, and reviewer guidance. It
was evaluated across 3 iterations with 3 eval cases covering a feature addition
(OAuth2 login), a bugfix (race condition), and a large refactor (database
layer).

**Plateau reached at iteration 2** (confirmed over iterations 2-3 with 0%
improvement).

## Results Summary

| Iteration | With Skill | Without Skill | Delta  | Notes                                                   |
| --------- | ---------- | ------------- | ------ | ------------------------------------------------------- |
| 1         | 91.7%      | 20.8%         | +70.9% | Edge case instructions and perf thresholds not concrete |
| 2         | 100%       | 20.8%         | +79.2% | Fixed: concrete edge case steps and perf thresholds     |
| 3         | 100%       | 20.8%         | +79.2% | Plateau confirmed (2nd consecutive) — stopped           |

## Per-Eval Breakdown (Final Iteration)

| Eval Case               | With Skill | Without Skill | Delta  |
| ----------------------- | ---------- | ------------- | ------ |
| feature-auth-flow       | 100% (8/8) | 12.5% (1/8)   | +87.5% |
| bugfix-race-condition   | 100% (8/8) | 37.5% (3/8)   | +62.5% |
| refactor-database-layer | 100% (8/8) | 12.5% (1/8)   | +87.5% |

## What the Skill Adds

The without-skill baseline consistently fails on these assertion categories:

| Assertion Type                         | With Skill    | Without Skill | Why Without-Skill Fails                                                         |
| -------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------- |
| Motivation section (WHY not just WHAT) | Always passes | Always fails  | Agents describe what changed but skip why — no problem statement or context     |
| Conceptual change grouping             | Always passes | Always fails  | Agents list files one-by-one instead of grouping by feature area or concept     |
| Copy-pasteable testing instructions    | Always passes | Always fails  | Agents write "run the tests" instead of numbered steps with exact commands      |
| Rollback plan                          | Always passes | Always fails  | Agents never include rollback plans — not part of default PR description habits |
| Reviewer guidance                      | Always passes | Always fails  | Agents don't flag security-sensitive or complex areas for reviewer attention    |
| Edge case testing                      | Always passes | Always fails  | Agents skip error paths and boundary conditions in testing instructions         |

The without-skill baseline consistently passes on:

| Assertion Type                                   | Notes                                                    |
| ------------------------------------------------ | -------------------------------------------------------- |
| Summary mentioning the change type               | Agents write a basic summary of what the PR does         |
| Root cause explanation (when provided in prompt) | Agents echo back root cause info from the user's message |
| Performance numbers (when provided in prompt)    | Agents include numbers the user explicitly mentioned     |

## Timing and Token Usage

| Metric         | With Skill (avg) | Without Skill (avg) | Delta          |
| -------------- | ---------------- | ------------------- | -------------- |
| Time (seconds) | 29.8             | 8.3                 | +21.5s (+259%) |
| Tokens         | 7,160            | 2,117               | +5,043 (+238%) |

The skill adds ~21.5 seconds and ~5,000 tokens per description. This is a
significant overhead in relative terms (3.6x more time, 3.4x more tokens), but
the absolute cost is modest (~30 seconds and ~7,000 tokens for a comprehensive
PR description). The additional tokens go toward structured sections, detailed
testing instructions, rollback plans, and reviewer guidance — all of which are
absent without the skill.

## Skill Improvements Made

### Iteration 1 → 2

- **Problem 1**: Edge case testing instructions in the feature eval said "deny
  consent on the Google screen" without specifying how to trigger this in a dev
  environment — not truly copy-pasteable.
- **Fix**: Strengthened the testing instructions principle to emphasize that
  edge case steps must be as concrete as happy-path steps, with specific UI
  actions and expected error messages.
- **Problem 2**: Performance verification in the refactor eval said "compare
  against baseline" without a concrete threshold.
- **Fix**: Added guidance that performance verification must include specific
  pass/fail thresholds (e.g., "expect < 15ms" not "compare against baseline").
- **Result**: 91.7% → 100% pass rate

### Iterations 2-3

- No further changes needed — skill plateaued at 100%

## Key Findings

1. **The skill's biggest value is structure and completeness.** Without-skill
   agents write 3-5 line PR descriptions that tell reviewers what files changed.
   With-skill agents produce comprehensive descriptions with 6 structured
   sections. The delta is not about knowledge — agents know what a good PR
   description looks like — it's about consistently producing all required
   sections.

2. **Rollback plans are the highest-value addition.** No without-skill run ever
   included a rollback plan. This is the section most likely to prevent
   production incidents, and agents never produce it without explicit guidance.

3. **Testing instructions quality is the biggest differentiator.** Without-skill
   agents write "run npm test." With-skill agents write 10-16 numbered steps
   with exact commands, expected outputs, and edge cases. This is the difference
   between a reviewer who tests and one who rubber-stamps.

4. **The bugfix eval has the smallest delta** (+62.5%) because the user's prompt
   already contains the root cause and ticket references, which the agent echoes
   back. For features and refactors where the agent must synthesize motivation,
   the delta is much larger (+87.5%).

5. **The cost is justified.** 3.6x more time for 3.8x more quality (79.2% delta)
   is an excellent trade-off for PR descriptions, which are read by multiple
   reviewers and referenced during incident response.

## Final Skill Validation

```
$ bun run scripts/validate-skill.ts examples/pr-description
{
  "valid": true,
  "skill_name": "pr-description",
  "errors": [],
  "warnings": [],
  "info": {
    "name": "pr-description",
    "body_lines": 277,
    "estimated_tokens": 2203
  }
}
```

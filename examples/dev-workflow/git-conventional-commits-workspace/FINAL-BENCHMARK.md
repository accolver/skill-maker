# git-conventional-commits: Final Benchmark Report

**Status:** PLATEAU (stopped at iteration 3) **Plateau condition:** with_skill
pass_rate stable at 100% for 3 consecutive iterations; without_skill baseline
improving but skill delta remains strong **Final with_skill pass_rate:** 100.0%
**Final without_skill pass_rate:** 72.3% **Final delta:** +27.7%

## Iteration Summary

| Iter | with_skill | without_skill | Delta  | Key Change                                                        |
| ---- | ---------- | ------------- | ------ | ----------------------------------------------------------------- |
| 1    | 100.0%     | 50.5%         | +49.5% | Baseline — without_skill misses scope, mood, case, BREAKING       |
| 2    | 100.0%     | 64.0%         | +36.0% | Added explicit char-count instruction; baseline slightly better   |
| 3    | 100.0%     | 72.3%         | +27.7% | Added verify-before-output tip; baseline improving but plateauing |

## Per-Eval Breakdown (Final — Iteration 3)

| Eval                 | with_skill | without_skill | Delta |
| -------------------- | ---------- | ------------- | ----- |
| simple-feature       | 100%       | 71%           | +29%  |
| bugfix-with-breaking | 100%       | 75%           | +25%  |
| multi-file-refactor  | 100%       | 71%           | +29%  |

## Key Observations

1. **BREAKING CHANGE footer is the strongest differentiator.** Without the
   skill, agents consistently fail to add the `BREAKING CHANGE:` footer even
   when the diff clearly shows a public API signature change. The skill's
   explicit detection rules and footer format instructions close this gap
   completely.

2. **Scope and lowercase-after-colon are consistent without-skill failures.**
   Agents without the skill default to omitting scope and capitalizing the first
   word after the colon. These are convention-specific rules that agents don't
   internalize from general training data.

3. **Imperative mood improved across iterations without the skill.** By
   iteration 3, the without-skill baseline started getting imperative mood right
   more often (likely due to the prompt phrasing "write a commit message"
   priming the agent). However, it still occasionally uses past tense.

4. **The skill costs ~2x more tokens but produces perfect results.** With-skill
   runs average ~5,060 tokens vs ~3,143 without. The extra tokens come from
   reading the SKILL.md and producing the structured analysis.json. This is a
   worthwhile tradeoff for 100% correctness.

5. **Subject line length is rarely a problem.** Both with-skill and
   without-skill runs generally stay under 50 characters. The skill's explicit
   counting instruction helps avoid edge cases (iteration 1 had a 50-char-exact
   subject; iteration 3 shortened to 46).

## Failure Pattern Analysis

| Failure Pattern          | without_skill frequency    | with_skill frequency | Root Cause                                              |
| ------------------------ | -------------------------- | -------------------- | ------------------------------------------------------- |
| Missing scope            | 7/9 runs (78%)             | 0/9 runs (0%)        | Agents don't know scope conventions without instruction |
| Capitalized first letter | 6/9 runs (67%)             | 0/9 runs (0%)        | English grammar instinct overrides convention           |
| Missing BREAKING CHANGE  | 3/3 applicable runs (100%) | 0/3 runs (0%)        | Agents don't know the footer format or detection rules  |
| Past tense / wrong mood  | 3/9 runs (33%)             | 0/9 runs (0%)        | Agents default to descriptive rather than imperative    |
| Subject over 50 chars    | 1/9 runs (11%)             | 0/9 runs (0%)        | Agents don't count characters without instruction       |

## Validation

```
valid: true
errors: 0
warnings: 0
missing files: 0
body_lines: 279
estimated_tokens: 1960
```

## Skill Location

```
examples/git-conventional-commits/
├── SKILL.md
├── evals/
│   └── evals.json
├── scripts/
├── references/
└── assets/
```

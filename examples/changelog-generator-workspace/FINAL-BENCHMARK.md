# Final Benchmark: changelog-generator

## Summary

| Metric                        | Value               |
| ----------------------------- | ------------------- |
| Skill Name                    | changelog-generator |
| Total Iterations              | 3                   |
| Final With-Skill Pass Rate    | 100.0%              |
| Final Without-Skill Pass Rate | 20.8%               |
| Final Delta                   | +79.2%              |
| Plateau Iteration             | 3                   |
| Avg Time With Skill (s)       | 31.4                |
| Avg Time Without Skill (s)    | 13.5                |
| Avg Tokens With Skill         | 14,577              |
| Avg Tokens Without Skill      | 6,450               |

## Iteration History

| Iteration | With Skill | Without Skill | Delta  | Improvement |
| --------- | ---------- | ------------- | ------ | ----------- |
| 1         | 79.2%      | 16.7%         | +62.5% | -           |
| 2         | 95.8%      | 16.7%         | +79.1% | +16.6%      |
| 3         | 100.0%     | 20.8%         | +79.2% | +4.2%       |

## Per-Eval Final Results (Iteration 3)

| Eval                   | With Skill | Without Skill | Delta  |
| ---------------------- | ---------- | ------------- | ------ |
| minor-release          | 100.0%     | 25.0%         | +75.0% |
| major-breaking-release | 100.0%     | 12.5%         | +87.5% |
| patch-security-fix     | 100.0%     | 25.0%         | +75.0% |

## What the Skill Adds

The without-skill baseline consistently fails on these dimensions:

1. **SemVer classification** — Without the skill, agents produce changelogs with
   version numbers but never classify the release as major/minor/patch or
   explain why. The skill requires explicit SemVer reasoning based on the
   highest-impact commit.

2. **Grouped categories** — Baseline outputs are flat bullet lists or use
   minimal grouping (just "Added" and "Fixed"). The skill enforces 6+ category
   headings: Breaking Changes, Features, Bug Fixes, Performance, Security,
   Dependencies.

3. **Breaking change migration guides** — Without the skill, breaking changes
   are one-line bullet points with no migration steps, no before/after code, and
   no explanation of why the change was made. The skill requires numbered
   migration steps and diff code blocks for every breaking change.

4. **Security advisory language** — Baseline treats security fixes as regular
   bug fixes. No severity levels, no CVSS scores, no affected version ranges, no
   upgrade urgency. The skill enforces advisory-style language with all
   metadata.

5. **Clickable PR/issue links** — Without the skill, PR numbers appear as raw
   text (#123). The skill formats them as clickable Markdown links pointing to
   the repository.

6. **Compare links and metadata** — Baseline omits compare URLs, release dates,
   and contributor lists. The skill includes a footer with the full diff link.

7. **Internal commit filtering** — Without the skill, test, CI, and docs commits
   appear alongside user-facing changes. The skill filters these out of the
   changelog output.

## Skill Improvements Across Iterations

### Iteration 1 -> 2 (79.2% -> 95.8%)

- Added explicit instruction to format PR links as clickable Markdown:
  `[#NNN](https://github.com/org/repo/pull/NNN)`
- Strengthened breaking change section to require before/after code examples
  using diff blocks, not just prose migration steps
- Added instruction to always include compare link footer
- Added urgency language requirement for security advisories

### Iteration 2 -> 3 (95.8% -> 100.0%)

- Added explicit instruction to exclude test, CI, and docs commits from
  user-facing changelog output (they are internal changes)
- Clarified that security patches should open with upgrade urgency statement
  before the detailed advisory

## Cost Analysis

The skill increases token usage by ~2.3x (14,577 vs 6,450) and time by ~2.3x
(31.4s vs 13.5s). This overhead comes from:

- Classifying each commit by SemVer impact
- Writing grouped category sections instead of flat lists
- Generating migration guides with code examples for breaking changes
- Formatting PR links and compare URLs
- Writing security advisory language with metadata

The additional cost is justified by the 79.2% improvement in changelog quality.
The major-breaking-release eval shows the largest delta (+87.5%) because
migration guides and before/after code examples require significant additional
output that agents never produce without guidance.

## Plateau Detection

Pass rate reached 100% at iteration 3 with a +4.2% improvement from iteration 2.
The without-skill baseline is stable at ~20.8% (slight variance from different
baseline runs attempting minimal grouping). The skill has reached maximum
effectiveness on these eval cases. Further iterations would not improve the
with-skill pass rate.

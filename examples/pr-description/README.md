# pr-description

> **Status:** Complete

Generate structured PR descriptions from branch diffs with context, motivation,
testing instructions, rollback plan, and reviewer guidance.

## Results

| Metric                | Value  |
| --------------------- | ------ |
| Final pass rate       | 100%   |
| Without-skill rate    | 20.8%  |
| Delta                 | +79.2% |
| Iterations            | 3      |
| Plateau at            | 2      |
| Eval cases            | 3      |
| Total assertions      | 24     |
| Avg time (with skill) | 29.8s  |
| Avg tokens (with)     | 7,160  |

## What the skill adds

Agents without the skill write 3-5 line PR descriptions listing files changed.
With the skill, agents produce comprehensive descriptions with:

- **Motivation section** — WHY the change was made, not just WHAT changed
- **Conceptual change grouping** — changes organized by feature area, not
  file-by-file
- **Copy-pasteable testing instructions** — numbered steps with exact commands
  and expected outputs
- **Rollback plan** — how to revert safely, including migration reversal and
  data impact
- **Reviewer guidance** — flags security-sensitive, performance-critical, and
  uncertain areas

## Eval cases

1. **feature-auth-flow** — OAuth2 login with 8 changed files, database
   migration, security-sensitive auth code
2. **bugfix-race-condition** — Race condition fix with 2 files, support ticket
   references, payment processing implications
3. **refactor-database-layer** — 18-file refactor to repository pattern with
   connection pooling and performance improvement

# pr-description

> **Status:** Planned

Generate structured PR descriptions from branch diffs with context, motivation,
testing instructions, rollback plan, and reviewer guidance.

## When built, this skill will

- Analyze the full branch diff to summarize what changed and why
- Write a structured description with context, motivation, and approach sections
- Generate testing instructions reviewers can follow to verify the change
- Include a rollback plan for production deployments
- Flag areas that need careful review (security, performance, breaking changes)
- Link related issues, tickets, or prior PRs

## Predicted delta: +60-70%

Agents currently write "updated X, Y, Z" summaries that tell reviewers what
files changed but not why, how to test, or how to revert.

## Getting started

```
Create a skill for writing structured PR descriptions with testing instructions and rollback plans
```

# database-migration

> **Status:** Planned

Write safe, reversible database migrations with rollback plans, data backup
steps, zero-downtime deployment notes, and index impact analysis.

## When built, this skill will

- Generate migration files with both `up` and `down` operations
- Include pre-migration data backup commands
- Analyze index impact on write-heavy tables
- Flag operations that require table locks and suggest zero-downtime
  alternatives
- Add deployment runbook notes (maintenance windows, feature flags, backfill
  steps)
- Produce a rollback plan with verification queries

## Predicted delta: +70-80%

Agents currently produce bare ALTER TABLE statements with no rollback plan, no
data safety checks, and no awareness of production deployment constraints.

## Getting started

```
Create a skill for writing safe database migrations with rollback plans and zero-downtime awareness
```

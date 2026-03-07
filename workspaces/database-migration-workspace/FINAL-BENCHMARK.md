# Final Benchmark — database-migration

## Overview

The **database-migration** skill guides agents through writing safe, reversible
database migrations with rollback plans, data backup commands, lock impact
analysis, verification queries, and deployment runbooks. It was evaluated across
3 iterations with 3 eval cases covering adding columns with defaults on large
tables, renaming columns safely in production, and adding indexes on
high-throughput tables.

**Plateau reached at iteration 2** (confirmed over iterations 2-3 with 0%
improvement).

## Results Summary

| Iteration | With Skill | Without Skill | Delta  | Notes                                                    |
| --------- | ---------- | ------------- | ------ | -------------------------------------------------------- |
| 1         | 87.5%      | 4.2%          | +83.3% | Minor gaps in pre-flight checks and consumer enumeration |
| 2         | 100%       | 4.2%          | +95.8% | Fixed: blocking transaction checks, consumer listing     |
| 3         | 100%       | 4.2%          | +95.8% | Plateau confirmed (2nd consecutive) — stopped            |

## Per-Eval Breakdown (Final Iteration)

| Eval Case                | With Skill | Without Skill | Delta  |
| ------------------------ | ---------- | ------------- | ------ |
| add-column-with-default  | 100% (8/8) | 0% (0/8)      | +100%  |
| rename-column-safely     | 100% (8/8) | 12.5% (1/8)   | +87.5% |
| add-index-on-large-table | 100% (8/8) | 0% (0/8)      | +100%  |

## What the Skill Adds

The without-skill baseline consistently fails on these assertion categories:

| Assertion Type                       | With Skill    | Without Skill | Why Without-Skill Fails                                                        |
| ------------------------------------ | ------------- | ------------- | ------------------------------------------------------------------------------ |
| Rollback migration                   | Always passes | Always fails  | Agents write forward migrations only; never produce rollback SQL               |
| Data backup commands                 | Always passes | Always fails  | Agents don't consider data safety before destructive operations                |
| Lock impact analysis                 | Always passes | Always fails  | Agents don't analyze ACCESS EXCLUSIVE vs SHARE UPDATE EXCLUSIVE implications   |
| Verification queries                 | Always passes | Always fails  | Agents assume "no errors = success" without post-migration verification        |
| Deployment runbook                   | Always passes | Always fails  | Agents produce SQL files only, not operational runbooks                        |
| Batched backfill strategy            | Always passes | Always fails  | Agents use single ALTER TABLE for large tables, risking extended locks         |
| CONCURRENTLY for large table indexes | Always passes | Always fails  | Agents use regular CREATE INDEX, blocking writes for the entire build duration |
| Dual-write for column renames        | Always passes | Always fails  | Agents use bare RENAME COLUMN, breaking all application references instantly   |

The without-skill baseline consistently passes on:

| Assertion Type                             | Notes                                                     |
| ------------------------------------------ | --------------------------------------------------------- |
| Mentioning need to update application code | Agents note this in comments (rename eval only, 1/8 pass) |

## Timing and Token Usage

| Metric         | With Skill (avg) | Without Skill (avg) | Delta          |
| -------------- | ---------------- | ------------------- | -------------- |
| Time (seconds) | 33.8             | 6.0                 | +27.8s (+463%) |
| Tokens         | 8,110            | 1,373               | +6,737 (+491%) |

The skill adds ~28 seconds and ~6,700 tokens per migration. This is a
significant overhead but justified by the quality improvement — the additional
tokens produce rollback migrations, backup commands, verification queries, lock
analysis, and deployment runbooks that agents never generate without guidance.

## Skill Improvements Made

### Iteration 1 → 2

- **Problem 1**: Runbook pre-flight didn't check for long-running transactions
  that could block ALTER TABLE
- **Fix**: Added guidance to include `pg_stat_activity` query in pre-flight
  checks
- **Problem 2**: Rename migration didn't explicitly enumerate all affected
  consumers (background jobs, reporting queries, API contracts)
- **Fix**: Strengthened workflow step 1 to require listing all consumers before
  starting
- **Problem 3**: Off-peak scheduling guidance was vague ("schedule during
  off-peak")
- **Fix**: Added example query to identify lowest-traffic hours from recent data
- **Result**: 87.5% → 100% pass rate

### Iterations 2-3

- No further changes needed — skill plateaued at 100%

## Key Findings

1. **The skill's biggest value is operational safety.** Without-skill agents
   produce syntactically correct SQL that would cause production incidents —
   table locks on 50M+ row tables, broken application references from bare
   RENAME, write-blocking index builds on high-throughput tables. The skill
   enforces the safety practices that experienced DBAs know but agents don't
   apply.

2. **The delta is the largest observed across all skills.** At +95.8%, this
   skill shows the biggest improvement over baseline of any skill built so far.
   This makes sense: database migrations are high-stakes operations where the
   gap between "correct SQL" and "safe production migration" is enormous.

3. **Without-skill agents are dangerous for migrations.** A 4.2% baseline pass
   rate means agents produce migrations that would cause incidents in virtually
   every case. The only assertion they occasionally pass is mentioning the need
   to update application code — and even that is just a comment, not a strategy.

4. **The cost is justified.** ~5x more tokens for ~24x better pass rate is an
   excellent trade-off, especially for database migrations where a bad migration
   can cause hours of downtime and data loss.

5. **Three patterns account for most failures.** Without-skill agents
   consistently make the same three mistakes: (1) no rollback, (2) no
   CONCURRENTLY for large indexes, (3) bare RENAME instead of dual-write. The
   skill's common mistakes table and safe/unsafe pattern comparisons directly
   address these.

## Final Skill Validation

```
$ bun run scripts/validate-skill.ts examples/database-migration
{
  "valid": true,
  "skill_name": "database-migration",
  "errors": [],
  "warnings": [],
  "info": {
    "name": "database-migration",
    "body_lines": 307,
    "estimated_tokens": 2253
  }
}
```

---
name: database-migration
description: >-
  Write safe, reversible database migrations with rollback plans, lock analysis,
  and zero-downtime deployment runbooks. Use when creating ALTER TABLE statements,
  adding or removing columns, creating indexes, changing constraints, renaming
  columns, backfilling data, or any schema change that touches a production
  database. Also use when reviewing existing migrations for safety, planning
  deployment order for dependent migrations, or when someone asks how to make a
  database change without downtime.
version: 1.0.0
---

# Database Migration Skill

Write production-safe database migrations that can be reversed without data
loss. Every migration you produce includes a rollback plan, lock impact
analysis, data backup commands, verification queries, and a deployment runbook.

The core principle: **if you can't reverse it safely, don't ship it.**

Databases are the hardest part of a deployment to recover from. A bad
application deploy can be rolled back in seconds. A bad migration can corrupt
data, lock tables for minutes, or require hours of manual recovery. This skill
exists because the cost of getting migrations wrong is disproportionately high.

## Workflow

### 1. Assess the Change

Before writing any SQL, answer these questions:

- What tables are affected and how large are they? (Row count matters for lock
  duration.)
- Is this additive (new column, new index) or destructive (drop column, change
  type)?
- Does the application need to work with both the old and new schema
  simultaneously during deployment?
- What is the rollback path if something goes wrong mid-migration?

If you don't know the table size, ask. A migration that's safe on a 10K-row
table can take down production on a 100M-row table.

### 2. Write the Migration

Structure every migration file with these sections in order:

```sql
-- Migration: <short description>
-- Author: <name>
-- Date: <date>
-- Estimated duration: <estimate based on table size>
-- Lock impact: <what locks are acquired and for how long>
-- Rollback: <one-line summary of reversal strategy>

-- ============================================================
-- PRE-MIGRATION CHECKS
-- ============================================================
-- Verification queries to confirm preconditions

-- ============================================================
-- BACKUP COMMANDS
-- ============================================================
-- Commands to snapshot affected data before changes

-- ============================================================
-- FORWARD MIGRATION
-- ============================================================
-- The actual schema changes

-- ============================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================
-- Queries to confirm the migration succeeded

-- ============================================================
-- ROLLBACK
-- ============================================================
-- Exact SQL to reverse the migration
```

### 3. Analyze Lock Impact

Every `ALTER TABLE` acquires a lock. The type and duration of that lock
determines whether your migration causes downtime. Include a lock analysis for
each statement.

| Operation                            | Lock Type (PostgreSQL)     | Blocks Reads? | Blocks Writes? | Duration                         |
| ------------------------------------ | -------------------------- | ------------- | -------------- | -------------------------------- |
| `ADD COLUMN` (nullable, no default)  | `AccessExclusiveLock`      | Yes           | Yes            | Instant (metadata only)          |
| `ADD COLUMN` with `DEFAULT` (PG 11+) | `AccessExclusiveLock`      | Yes           | Yes            | Instant (metadata only)          |
| `ADD COLUMN` with `DEFAULT` (PG <11) | `AccessExclusiveLock`      | Yes           | Yes            | Full table rewrite               |
| `DROP COLUMN`                        | `AccessExclusiveLock`      | Yes           | Yes            | Instant (metadata only)          |
| `ALTER COLUMN SET NOT NULL`          | `AccessExclusiveLock`      | Yes           | Yes            | Full table scan                  |
| `CREATE INDEX`                       | `ShareLock`                | No            | Yes            | Proportional to table size       |
| `CREATE INDEX CONCURRENTLY`          | None significant           | No            | No             | 2-3x slower but non-blocking     |
| `ADD CONSTRAINT` (FK)                | `ShareRowExclusiveLock`    | No            | Yes            | Full table scan for validation   |
| `ADD CONSTRAINT ... NOT VALID`       | `ShareRowExclusiveLock`    | No            | Yes            | Instant                          |
| `VALIDATE CONSTRAINT`                | `ShareUpdateExclusiveLock` | No            | No             | Full table scan but non-blocking |

The key insight: "instant" means the lock is held for milliseconds regardless of
table size. "Full table scan/rewrite" means the lock is held for the entire
duration of the scan, which scales with table size.

### 4. Write the Rollback Plan

Every migration needs a corresponding rollback. The rollback should:

- Reverse the schema change exactly
- Preserve any data that was in the new structure (when possible)
- Be tested before the forward migration ships
- Include its own verification queries

If a migration cannot be safely rolled back (e.g., dropping a column with data),
the migration must include a data backup step and the rollback must restore from
that backup.

### 5. Write Verification Queries

Include queries that confirm:

- The schema change was applied correctly (column exists, type is correct,
  constraint is present)
- Existing data was not corrupted
- Application queries still work (test critical queries against the new schema)
- Performance has not degraded (compare `EXPLAIN ANALYZE` before and after)

### 6. Write the Deployment Runbook

Provide step-by-step deployment instructions including:

1. Pre-deployment checks (disk space, replication lag, active connections)
2. Backup commands
3. Migration execution with expected duration
4. Verification steps
5. Rollback trigger criteria ("roll back if X")
6. Rollback execution steps
7. Post-deployment monitoring

## Safe Patterns for Common Operations

### Adding a NOT NULL Column

Never add a `NOT NULL` column with a default in a single statement on large
tables (pre-PG 11). Instead, use the three-step pattern:

```sql
-- Step 1: Add nullable column (instant, minimal lock)
ALTER TABLE orders ADD COLUMN status text;

-- Step 2: Backfill in batches (no lock, application keeps running)
UPDATE orders SET status = 'pending' WHERE status IS NULL AND id BETWEEN 1 AND 100000;
UPDATE orders SET status = 'pending' WHERE status IS NULL AND id BETWEEN 100001 AND 200000;
-- ... continue in batches

-- Step 3: Add NOT NULL constraint (requires full scan but data is already populated)
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
```

On PostgreSQL 11+, `ADD COLUMN ... DEFAULT 'value' NOT NULL` is metadata-only
and safe even on large tables. But the three-step pattern remains useful when
the default value depends on other columns or requires computation.

**Rollback:**

```sql
ALTER TABLE orders ALTER COLUMN status DROP NOT NULL;
-- or if removing entirely:
ALTER TABLE orders DROP COLUMN status;
```

### Creating Indexes

Always use `CONCURRENTLY` for indexes on tables that receive traffic:

```sql
-- Safe: non-blocking, takes longer but no downtime
CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);

-- Unsafe: blocks all writes for the duration of index creation
CREATE INDEX idx_orders_status ON orders (status);
```

Important caveats with `CONCURRENTLY`:

- Cannot run inside a transaction block
- If it fails, it leaves an `INVALID` index that must be dropped and recreated
- Takes 2-3x longer than a regular `CREATE INDEX`
- Requires two table scans instead of one

**Rollback:**

```sql
DROP INDEX CONCURRENTLY idx_orders_status;
```

**Verification:**

```sql
-- Check index is valid (not left in INVALID state from a failed CONCURRENTLY)
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE indexrelid = 'idx_orders_status'::regclass;
```

### Renaming a Column

Column renames break application code that references the old name. Use a
dual-write strategy to achieve zero downtime:

```sql
-- Phase 1: Add new column, start dual-writing
ALTER TABLE users ADD COLUMN full_name text;
UPDATE users SET full_name = name WHERE full_name IS NULL; -- backfill in batches

-- Phase 2: Deploy application code that reads from new column, writes to both
-- (application change, not a migration)

-- Phase 3: Stop writing to old column, drop it
ALTER TABLE users DROP COLUMN name;
```

Each phase is a separate migration deployed with an application change between
them. This is slower but guarantees zero downtime and safe rollback at every
step.

**Rollback for Phase 1:**

```sql
ALTER TABLE users DROP COLUMN full_name;
```

**Rollback for Phase 3:**

```sql
ALTER TABLE users ADD COLUMN name text;
UPDATE users SET name = full_name WHERE name IS NULL;
```

### Adding a Foreign Key Constraint

Foreign key validation scans the entire table while holding a lock that blocks
writes. Split it into two steps:

```sql
-- Step 1: Add constraint without validation (instant, blocks writes briefly)
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  NOT VALID;

-- Step 2: Validate separately (full scan but non-blocking)
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_customer;
```

**Rollback:**

```sql
ALTER TABLE orders DROP CONSTRAINT fk_orders_customer;
```

### Dropping a Column

Dropping a column is instant in PostgreSQL (it marks the column as invisible),
but the data is gone. Always back up first:

```sql
-- Backup
CREATE TABLE _backup_users_avatar AS SELECT id, avatar_url FROM users;

-- Drop
ALTER TABLE users DROP COLUMN avatar_url;
```

**Rollback:**

```sql
ALTER TABLE users ADD COLUMN avatar_url text;
UPDATE users u SET avatar_url = b.avatar_url FROM _backup_users_avatar b WHERE u.id = b.id;
DROP TABLE _backup_users_avatar;
```

### Changing a Column Type

Type changes often require a full table rewrite. Use the dual-column strategy:

```sql
-- Step 1: Add new column with desired type
ALTER TABLE events ADD COLUMN started_at timestamptz;

-- Step 2: Backfill (in batches for large tables)
UPDATE events SET started_at = start_date::timestamptz
WHERE started_at IS NULL AND id BETWEEN 1 AND 100000;

-- Step 3: Swap in application code (read from new, write to both)

-- Step 4: Drop old column
ALTER TABLE events DROP COLUMN start_date;

-- Step 5 (optional): Rename new column
ALTER TABLE events RENAME COLUMN started_at TO start_date;
```

### Batched Backfills for Large Tables

When updating millions of rows, never run a single `UPDATE` — it creates a
massive transaction, bloats the table, and can exhaust disk space for WAL.

```sql
-- Pattern: loop in batches with a small pause between
DO $$
DECLARE
  batch_size INT := 50000;
  max_id BIGINT;
  current_id BIGINT := 0;
BEGIN
  SELECT MAX(id) INTO max_id FROM orders;
  WHILE current_id < max_id LOOP
    UPDATE orders
    SET status = 'pending'
    WHERE status IS NULL
      AND id > current_id
      AND id <= current_id + batch_size;
    current_id := current_id + batch_size;
    COMMIT;
    PERFORM pg_sleep(0.1); -- brief pause to let replicas catch up
  END LOOP;
END $$;
```

Adjust `batch_size` based on table width and server capacity. Monitor
replication lag during execution — if lag grows, increase the sleep interval.

## Deployment Runbook Template

```markdown
## Migration: <description>

### Pre-deployment

- [ ] Confirm table row count: `SELECT count(*) FROM <table>;`
- [ ] Check disk space:
      `SELECT pg_size_pretty(pg_database_size(current_database()));`
- [ ] Check replication lag: `SELECT now() - pg_last_xact_replay_timestamp();`
- [ ] Check active locks:
      `SELECT * FROM pg_locks WHERE relation = '<table>'::regclass;`
- [ ] Notify on-call team

### Execution

- [ ] Run pre-migration verification queries
- [ ] Execute backup commands
- [ ] Run forward migration
- [ ] Expected duration: <estimate>
- [ ] Run post-migration verification queries

### Rollback Criteria

Roll back immediately if:

- Migration exceeds 2x expected duration
- Replication lag exceeds <threshold>
- Error rate increases above baseline
- Lock wait timeout errors appear in application logs

### Rollback Steps

- [ ] Execute rollback SQL
- [ ] Verify rollback with verification queries
- [ ] Restore from backup table if needed
- [ ] Notify team of rollback

### Post-deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Check query performance (compare EXPLAIN ANALYZE)
- [ ] Verify replication is caught up
- [ ] Clean up backup tables after 7 days
```

## Common Mistakes

| Mistake                                                     | Why It's Dangerous                                 | What to Do Instead                                               |
| ----------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT` on PG <11 | Rewrites entire table while holding exclusive lock | Three-step: add nullable → backfill → set NOT NULL               |
| `CREATE INDEX` without `CONCURRENTLY`                       | Blocks all writes for duration of index build      | Always use `CREATE INDEX CONCURRENTLY` on live tables            |
| Single large `UPDATE` for backfills                         | One huge transaction, WAL bloat, replication lag   | Batch in chunks of 10K-100K rows with pauses                     |
| Renaming a column in one step                               | Breaks all application code referencing old name   | Dual-write: add new → migrate reads → drop old                   |
| Adding FK without `NOT VALID`                               | Validates entire table while blocking writes       | `ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT`        |
| No rollback plan                                            | Stuck if migration fails halfway                   | Write and test rollback before shipping forward migration        |
| No verification queries                                     | Silent data corruption goes unnoticed              | Check schema, data integrity, and query performance              |
| Running migrations during peak traffic                      | Lock contention amplified by high concurrency      | Schedule during low-traffic windows or use non-blocking patterns |
| Forgetting to check for `INVALID` indexes                   | Failed `CONCURRENTLY` leaves unusable index        | Query `pg_index.indisvalid` after concurrent index creation      |
| Dropping a column without backup                            | Data is unrecoverable                              | `CREATE TABLE _backup_... AS SELECT` before dropping             |

## Adapting to Other Database Engines

The patterns in this skill are PostgreSQL-focused but the principles apply
broadly:

- **MySQL/MariaDB:** Use `pt-online-schema-change` or `gh-ost` for large table
  ALTERs. MySQL's `ALTER TABLE` often requires a full table copy.
  `ALGORITHM=INPLACE` and `LOCK=NONE` hints help when available.
- **SQLite:** Migrations are simpler (often requires creating a new table and
  copying data). No concurrent access concerns for most use cases.
- **SQL Server:** Use `WITH (ONLINE = ON)` for index operations.
  `ALTER TABLE ... ADD` with defaults is metadata-only in recent versions.

The universal rules remain: always have a rollback, always verify, always
consider lock impact, and always batch large data changes.

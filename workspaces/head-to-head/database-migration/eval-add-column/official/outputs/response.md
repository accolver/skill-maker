# Database Migration: Add `status` Column to `orders` Table

---

## 1. Change Assessment

### Questions Answered

| Question                                                                           | Answer                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What tables are affected and how large are they?**                               | `orders` — approximately 50 million rows. This is a large table; lock duration and backfill strategy matter.                                                                            |
| **Is this additive or destructive?**                                               | Additive. We are adding a new column; no existing data is modified or removed.                                                                                                          |
| **Does the application need to work with both old and new schema simultaneously?** | Yes. During the deployment window the application will be running against the database. Reads and writes are active. The column must be added without breaking existing queries.        |
| **What is the rollback path?**                                                     | Drop the column. Since this is a new column with no pre-existing data, rollback is straightforward — `ALTER TABLE orders DROP COLUMN status;` is instant in PostgreSQL (metadata-only). |

### PostgreSQL Version Consideration

We are on **PostgreSQL 15**. This is critical because:

- **PG 11+ behavior:** `ALTER TABLE ... ADD COLUMN ... DEFAULT 'value' NOT NULL`
  is a **metadata-only** operation. PostgreSQL stores the default value in the
  catalog and returns it for existing rows without rewriting the table.
- This means we can safely add a `NOT NULL` column with a `DEFAULT` in a
  **single statement** — even on a 50-million-row table — and it will complete
  in milliseconds.
- The `AccessExclusiveLock` is held only for the brief catalog update, not for a
  full table rewrite.

**Decision:** Use the single-statement approach. The three-step pattern (add
nullable → backfill → set NOT NULL) is unnecessary on PG 15 and would actually
be _worse_ because Step 3 (`ALTER COLUMN SET NOT NULL`) requires a full table
scan to verify no NULLs exist, which would hold `AccessExclusiveLock` for the
duration of that scan on 50M rows.

---

## 2. Migration SQL

```sql
-- Migration: Add status column to orders table
-- Author: DBA Team
-- Date: 2026-03-09
-- Estimated duration: < 1 second (metadata-only on PG 15)
-- Lock impact: AccessExclusiveLock held for milliseconds (catalog update only)
-- Rollback: ALTER TABLE orders DROP COLUMN status;

-- ============================================================
-- PRE-MIGRATION CHECKS
-- ============================================================

-- 1. Confirm the orders table exists and check row count estimate
--    (Use pg_class for a fast estimate; exact count on 50M rows is slow)
SELECT relname, reltuples::bigint AS estimated_row_count
FROM pg_class
WHERE relname = 'orders';

-- 2. Confirm the 'status' column does NOT already exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: 0 rows (column should not exist yet)

-- 3. Check current disk space
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- 4. Check replication lag (if applicable)
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- 5. Check for active locks on the orders table
SELECT locktype, mode, granted, pid, pg_blocking_pids(pid) AS blocked_by
FROM pg_locks
WHERE relation = 'orders'::regclass;

-- 6. Check active long-running queries against orders
SELECT pid, now() - query_start AS duration, state, query
FROM pg_stat_activity
WHERE query ILIKE '%orders%'
  AND state != 'idle'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;

-- 7. Confirm PostgreSQL version is 11+ (metadata-only ADD COLUMN with DEFAULT)
SELECT version();
-- Expected: PostgreSQL 15.x

-- ============================================================
-- BACKUP COMMANDS
-- ============================================================

-- No data backup is required for this migration because:
-- 1. We are ADDING a column, not modifying or dropping existing data.
-- 2. The rollback (DROP COLUMN) is instant and safe.
-- 3. No existing column values are being altered.
--
-- However, if you want a safety snapshot of the table schema:
-- pg_dump --schema-only --table=orders <database_name> > orders_schema_backup_20260309.sql

-- ============================================================
-- FORWARD MIGRATION
-- ============================================================

-- Single-statement add: safe on PG 11+ (metadata-only, no table rewrite)
ALTER TABLE orders
  ADD COLUMN status varchar(50) NOT NULL DEFAULT 'pending';

-- ============================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================

-- 1. Confirm the column exists with correct type, nullability, and default
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: status | character varying | 50 | NO | 'pending'::character varying

-- 2. Verify a sample of existing rows have the default value
SELECT status, count(*) FROM orders TABLESAMPLE SYSTEM(0.01) GROUP BY status;
-- Expected: all rows show 'pending'

-- 3. Verify new inserts work without specifying status (uses default)
-- (Run in a test transaction)
BEGIN;
INSERT INTO orders (/* existing required columns */) VALUES (/* test values */)
  RETURNING id, status;
-- Expected: status = 'pending'
ROLLBACK;

-- 4. Verify new inserts work WITH an explicit status value
BEGIN;
INSERT INTO orders (/* existing required columns */, status) VALUES (/* test values */, 'shipped')
  RETURNING id, status;
-- Expected: status = 'shipped'
ROLLBACK;

-- 5. Verify no table bloat or unexpected size increase
SELECT pg_size_pretty(pg_total_relation_size('orders')) AS total_size;

-- 6. Check that existing queries still perform well
-- (Run EXPLAIN ANALYZE on your most critical order queries)
-- EXPLAIN ANALYZE SELECT * FROM orders WHERE id = <some_id>;

-- ============================================================
-- ROLLBACK
-- ============================================================

-- Rollback: Drop the status column
-- This is instant in PostgreSQL (marks column as dropped in catalog).
-- No data loss risk because this column was just added.
ALTER TABLE orders DROP COLUMN status;

-- Rollback verification:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: 0 rows (column no longer exists)
```

---

## 3. Lock Impact Analysis

| Statement                                                                     | Lock Type             | Blocks Reads? | Blocks Writes? | Duration                                  | Notes                                                                                                                                                         |
| ----------------------------------------------------------------------------- | --------------------- | ------------- | -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALTER TABLE orders ADD COLUMN status varchar(50) NOT NULL DEFAULT 'pending'` | `AccessExclusiveLock` | Yes           | Yes            | **Milliseconds** (metadata-only on PG 15) | PG 11+ stores the default in the catalog. No table rewrite. The lock is held only for the brief catalog update. On a 50M-row table this completes in < 100ms. |
| `ALTER TABLE orders DROP COLUMN status` (rollback)                            | `AccessExclusiveLock` | Yes           | Yes            | **Milliseconds** (metadata-only)          | PostgreSQL marks the column as dropped in the catalog without rewriting the table. Instant regardless of table size.                                          |

### Why This Is Safe

On PostgreSQL 15, `ADD COLUMN ... DEFAULT ... NOT NULL` does **not** rewrite the
table. The mechanism:

1. PostgreSQL acquires `AccessExclusiveLock` on the table.
2. It adds the column metadata to `pg_attribute`.
3. It stores the default value in `pg_attrdef`.
4. It records that existing rows should return this default for the new column
   (via `atthasmissing` / `attmissingval` in `pg_attribute`).
5. It releases the lock.

The entire operation touches only system catalog rows, not the 50 million data
rows. The lock is held for the duration of the catalog update — typically
single-digit milliseconds.

**Risk:** The only risk is if there are long-running transactions holding
conflicting locks on the `orders` table. The `ALTER TABLE` will wait for those
to complete before it can acquire `AccessExclusiveLock`. This is why the
pre-migration checks include a query for active locks and long-running queries.

**Mitigation:** Set a `lock_timeout` to avoid waiting indefinitely:

```sql
SET lock_timeout = '5s';
ALTER TABLE orders ADD COLUMN status varchar(50) NOT NULL DEFAULT 'pending';
RESET lock_timeout;
```

If the lock cannot be acquired within 5 seconds, the statement fails cleanly and
can be retried.

---

## 4. Rollback Plan

### Rollback SQL

```sql
-- ============================================================
-- ROLLBACK: Remove status column from orders
-- ============================================================

-- Step 1: Drop the column (instant, metadata-only)
ALTER TABLE orders DROP COLUMN status;

-- Step 2: Verify the column is gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: 0 rows

-- Step 3: Verify table is still functional
SELECT count(*) FROM orders LIMIT 1;
-- Expected: returns successfully
```

### Rollback Characteristics

| Property                     | Value                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reversible?**              | Yes — fully reversible                                                                                                                                                                                                                       |
| **Data loss?**               | Only the `status` column data is lost. Since this is a brand-new column with only default values, there is no meaningful data loss. If the application has already written non-default status values, those values will be lost on rollback. |
| **Duration**                 | Milliseconds (metadata-only)                                                                                                                                                                                                                 |
| **Lock impact**              | `AccessExclusiveLock` for milliseconds                                                                                                                                                                                                       |
| **Requires backup restore?** | No                                                                                                                                                                                                                                           |

### When to Roll Back

Roll back if any of the following occur after migration:

- Application errors referencing the `status` column (e.g., ORM mapping
  failures)
- Unexpected query performance degradation
- The migration was applied to the wrong environment
- Business decision to delay the feature

---

## 5. Deployment Runbook

### Migration: Add `status` column (varchar(50), NOT NULL, default 'pending') to `orders`

---

### Pre-deployment

- [ ] **Confirm PostgreSQL version is 15:**
  ```sql
  SELECT version();
  ```

- [ ] **Confirm table row count (fast estimate):**
  ```sql
  SELECT reltuples::bigint AS estimated_rows FROM pg_class WHERE relname = 'orders';
  ```
  Expected: ~50,000,000

- [ ] **Check disk space:**
  ```sql
  SELECT pg_size_pretty(pg_database_size(current_database()));
  ```

- [ ] **Check replication lag:**
  ```sql
  SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
  ```
  Proceed only if lag < 10 seconds.

- [ ] **Check for active locks on orders:**
  ```sql
  SELECT locktype, mode, granted, pid, pg_blocking_pids(pid) AS blocked_by
  FROM pg_locks WHERE relation = 'orders'::regclass;
  ```
  Proceed only if no `AccessExclusiveLock` is held.

- [ ] **Check for long-running queries on orders:**
  ```sql
  SELECT pid, now() - query_start AS duration, state, query
  FROM pg_stat_activity
  WHERE query ILIKE '%orders%' AND state != 'idle'
    AND now() - query_start > interval '30 seconds'
  ORDER BY duration DESC;
  ```
  If long-running queries exist, wait for them to complete or coordinate
  cancellation.

- [ ] **Confirm `status` column does not already exist:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'status';
  ```
  Expected: 0 rows.

- [ ] **Notify on-call team** that a migration is about to run.

- [ ] **Take schema backup:**
  ```bash
  pg_dump --schema-only --table=orders <database_name> > orders_schema_backup_20260309.sql
  ```

---

### Execution

- [ ] **Set lock timeout** (prevents indefinite waiting):
  ```sql
  SET lock_timeout = '5s';
  ```

- [ ] **Run forward migration:**
  ```sql
  ALTER TABLE orders
    ADD COLUMN status varchar(50) NOT NULL DEFAULT 'pending';
  ```
  **Expected duration:** < 1 second.

- [ ] **Reset lock timeout:**
  ```sql
  RESET lock_timeout;
  ```

- [ ] **If the statement fails with a lock timeout error:**
  - Check what is holding the lock:
    `SELECT * FROM pg_locks WHERE relation = 'orders'::regclass;`
  - Wait for the blocking transaction to complete, or coordinate with the team.
  - Retry the migration.

---

### Post-migration Verification

- [ ] **Confirm column exists with correct definition:**
  ```sql
  SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'status';
  ```
  Expected:
  `status | character varying | 50 | NO | 'pending'::character varying`

- [ ] **Spot-check existing rows:**
  ```sql
  SELECT status, count(*) FROM orders TABLESAMPLE SYSTEM(0.01) GROUP BY status;
  ```
  Expected: all sampled rows show `status = 'pending'`.

- [ ] **Verify inserts work (in a test transaction):**
  ```sql
  BEGIN;
  INSERT INTO orders (/* required columns */) VALUES (/* test values */) RETURNING id, status;
  -- Expected: status = 'pending'
  ROLLBACK;
  ```

- [ ] **Check table size (no unexpected bloat):**
  ```sql
  SELECT pg_size_pretty(pg_total_relation_size('orders'));
  ```

- [ ] **Run EXPLAIN ANALYZE on critical queries:**
  ```sql
  EXPLAIN ANALYZE SELECT * FROM orders WHERE id = <sample_id>;
  ```
  Compare with pre-migration baseline. No significant regression expected.

- [ ] **Check replication lag has not increased:**
  ```sql
  SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
  ```

---

### Rollback Criteria

Roll back **immediately** if:

- The `ALTER TABLE` statement takes longer than 10 seconds (indicates unexpected
  table rewrite — should not happen on PG 15, but be safe).
- Application error rates increase above baseline after migration.
- Lock wait timeout errors appear in application logs.
- Replication lag exceeds 30 seconds after migration.
- The column was created with the wrong type, default, or nullability.

---

### Rollback Steps

- [ ] **Execute rollback SQL:**
  ```sql
  SET lock_timeout = '5s';
  ALTER TABLE orders DROP COLUMN status;
  RESET lock_timeout;
  ```

- [ ] **Verify rollback:**
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'status';
  ```
  Expected: 0 rows.

- [ ] **Verify table is functional:**
  ```sql
  SELECT count(*) FROM orders LIMIT 1;
  ```

- [ ] **Notify team** that rollback was executed and why.

---

### Post-deployment Monitoring

- [ ] Monitor application error rates for **30 minutes** after migration.
- [ ] Monitor query latency on `orders` table for **30 minutes**.
- [ ] Verify replication is caught up and stable.
- [ ] After **7 days**, confirm the column is being used correctly by the
      application and clean up the schema backup file.

---

## 6. Summary

| Property                     | Value                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Migration**                | `ALTER TABLE orders ADD COLUMN status varchar(50) NOT NULL DEFAULT 'pending'` |
| **PostgreSQL version**       | 15 (PG 11+ metadata-only ADD COLUMN with DEFAULT)                             |
| **Table size**               | ~50 million rows                                                              |
| **Lock type**                | `AccessExclusiveLock`                                                         |
| **Lock duration**            | Milliseconds (metadata-only, no table rewrite)                                |
| **Blocks reads?**            | Yes, but only for milliseconds                                                |
| **Blocks writes?**           | Yes, but only for milliseconds                                                |
| **Estimated total duration** | < 1 second                                                                    |
| **Rollback**                 | `ALTER TABLE orders DROP COLUMN status` (instant)                             |
| **Data backup needed?**      | No (additive change, no existing data modified)                               |
| **Downtime required?**       | No                                                                            |
| **Backfill needed?**         | No (PG 15 handles default via catalog)                                        |

### Why Not the Three-Step Pattern?

The skill documents a three-step pattern (add nullable → backfill in batches →
set NOT NULL) for adding NOT NULL columns. This pattern exists for **pre-PG 11**
databases where `ADD COLUMN ... DEFAULT ... NOT NULL` triggers a full table
rewrite.

On PostgreSQL 15, the single-statement approach is **strictly superior**:

1. **Faster:** One instant catalog update vs. three separate operations (one of
   which scans 50M rows).
2. **Safer:** The three-step pattern's Step 3 (`ALTER COLUMN SET NOT NULL`)
   requires a full table scan holding `AccessExclusiveLock` — on 50M rows this
   could take minutes and block all reads and writes.
3. **Simpler:** One statement, one rollback, no batching logic, no intermediate
   states where the column exists but is nullable.
4. **Atomic:** The column is never visible in a partially-configured state
   (nullable without the NOT NULL constraint).

The skill itself notes: _"On PostgreSQL 11+,
`ADD COLUMN ... DEFAULT 'value' NOT NULL` is metadata-only and safe even on
large tables."_

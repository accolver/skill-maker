# Database Migration: Composite Index on events(customer_id, created_at)

## 1. Change Assessment

| Question                      | Answer                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Table affected**            | `events`                                                                                                        |
| **Table size**                | ~100 million rows                                                                                               |
| **Write throughput**          | ~5,000 inserts/second at peak                                                                                   |
| **Change type**               | Additive (new index, no schema alteration)                                                                      |
| **Dual-schema compatibility** | Yes — adding an index is transparent to the application. No code changes required for the index to take effect. |
| **Rollback path**             | `DROP INDEX CONCURRENTLY` — instant metadata operation, non-blocking.                                           |
| **Database engine**           | PostgreSQL 16                                                                                                   |

### Risk Analysis

Creating a regular `CREATE INDEX` on a 100M-row table acquires a `ShareLock`,
which **blocks all writes** (INSERT, UPDATE, DELETE) for the entire duration of
the index build. At 5,000 inserts/second, even a 5-minute index build would
queue 1.5 million write operations, causing cascading timeouts, connection pool
exhaustion, and likely application-level failures.

**Conclusion:** `CREATE INDEX CONCURRENTLY` is mandatory. It avoids blocking
writes at the cost of taking 2–3x longer and requiring two table scans instead
of one. On a 100M-row table, expect 10–30 minutes depending on hardware, I/O
throughput, and concurrent load.

---

## 2. Migration SQL

```sql
-- Migration: Add composite index on events(customer_id, created_at)
-- Author: DBA Team
-- Date: 2026-03-09
-- Estimated duration: 10-30 minutes (100M rows, CONCURRENTLY, depends on I/O)
-- Lock impact: No significant locks — CONCURRENTLY avoids ShareLock
-- Rollback: DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;

-- ============================================================
-- PRE-MIGRATION CHECKS
-- ============================================================

-- 1. Confirm table exists and check row count (approximate, fast)
SELECT relname, reltuples::bigint AS approximate_row_count
FROM pg_class
WHERE relname = 'events';

-- 2. Confirm the index does not already exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';
-- Expected: 0 rows

-- 3. Confirm the columns exist and check their types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('customer_id', 'created_at')
ORDER BY column_name;
-- Expected: 2 rows showing customer_id and created_at with their types

-- 4. Check for existing indexes that might already cover this query pattern
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND (indexdef LIKE '%customer_id%' OR indexdef LIKE '%created_at%');

-- 5. Check current disk space (index will consume additional space)
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;
SELECT pg_size_pretty(pg_total_relation_size('events')) AS total_events_size;
SELECT pg_size_pretty(pg_relation_size('events')) AS events_table_size;

-- 6. Estimate index size (rough: ~30-50 bytes per row for a 2-column btree)
-- 100M rows * ~40 bytes = ~4 GB estimated index size
-- Ensure at least 8 GB free disk space (2x for CONCURRENTLY build + safety margin)
SELECT pg_size_pretty(
  (SELECT setting::bigint * pg_size_bytes('1 kB')
   FROM pg_settings WHERE name = 'temp_file_limit')
) AS temp_file_limit;

-- 7. Check replication lag (if applicable)
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_is_in_recovery() AS is_replica;

-- 8. Check active locks on the events table
SELECT locktype, mode, granted, pid, pg_blocking_pids(pid) AS blocked_by
FROM pg_locks
WHERE relation = 'events'::regclass;

-- 9. Check for any long-running transactions that could block CONCURRENTLY
SELECT pid, now() - xact_start AS duration, state, query
FROM pg_stat_activity
WHERE state != 'idle'
  AND xact_start < now() - interval '5 minutes'
ORDER BY xact_start;

-- ============================================================
-- BACKUP COMMANDS
-- ============================================================

-- Index creation is purely additive — no data is modified, so no data backup
-- is required. The rollback is simply dropping the index.
--
-- However, capture the current query plan for the target query pattern
-- so we can compare performance before and after:

-- Save baseline EXPLAIN ANALYZE for the query this index optimizes:
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM events
WHERE customer_id = 12345
  AND created_at >= '2026-01-01'
  AND created_at < '2026-02-01'
ORDER BY created_at DESC;

-- Save the output of this EXPLAIN to compare after migration.

-- ============================================================
-- FORWARD MIGRATION
-- ============================================================

-- IMPORTANT: This statement CANNOT be run inside a transaction block.
-- If using a migration framework, ensure it does NOT wrap this in BEGIN/COMMIT.
-- In psql, ensure you are NOT inside a transaction (\q and reconnect if needed).

CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
ON events (customer_id, created_at);

-- Notes:
-- 1. CONCURRENTLY performs two table scans and does not block writes.
-- 2. If this statement fails or is interrupted, it will leave an INVALID index.
--    You MUST check for this (see post-migration verification) and drop/recreate
--    if it happened.
-- 3. The index uses the default btree method, which is optimal for equality
--    (customer_id = X) and range (created_at >= Y) queries.
-- 4. Column order matters: customer_id first because it's the equality predicate,
--    created_at second because it's the range predicate. This order allows the
--    planner to do an index scan with a single range on created_at per customer_id.

-- ============================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================

-- 1. Confirm the index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';
-- Expected: 1 row with the correct index definition

-- 2. CRITICAL: Check that the index is VALID (not left in INVALID state)
SELECT
  indexrelid::regclass AS index_name,
  indisvalid AS is_valid,
  indisready AS is_ready,
  indislive AS is_live
FROM pg_index
WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;
-- Expected: indisvalid = true, indisready = true, indislive = true
-- If indisvalid = false, the CONCURRENTLY build failed. Drop and retry:
--   DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;
--   Then re-run the CREATE INDEX CONCURRENTLY.

-- 3. Check index size
SELECT pg_size_pretty(pg_relation_size('idx_events_customer_id_created_at')) AS index_size;

-- 4. Verify the query planner uses the new index
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM events
WHERE customer_id = 12345
  AND created_at >= '2026-01-01'
  AND created_at < '2026-02-01'
ORDER BY created_at DESC;
-- Expected: "Index Scan" or "Index Only Scan" using idx_events_customer_id_created_at
-- Compare execution time and buffer hits against the pre-migration baseline.

-- 5. Verify no data corruption (spot check)
SELECT count(*) FROM events WHERE customer_id IS NOT NULL;
-- Should match approximate row count from pre-migration check.

-- 6. Check replication lag hasn't spiked
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- ============================================================
-- ROLLBACK
-- ============================================================

-- Rollback is straightforward: drop the index.
-- Use CONCURRENTLY to avoid blocking writes during the drop.

DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;

-- Rollback verification:
SELECT indexname
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';
-- Expected: 0 rows
```

---

## 3. Lock Impact Analysis

| Statement                                                                                          | Lock Type                                                                    | Blocks Reads? | Blocks Writes? | Duration                                          | Impact at 5K inserts/sec                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------- | -------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at ON events (customer_id, created_at);` | No significant lock (only brief `ShareUpdateExclusiveLock` at start and end) | No            | No             | 10–30 minutes (two full table scans of 100M rows) | **Zero impact on writes.** Inserts, updates, and deletes continue unblocked throughout the build. Minor additional I/O load from the two table scans. |
| `DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;` (rollback)                            | No significant lock                                                          | No            | No             | Near-instant (metadata operation)                 | **Zero impact.**                                                                                                                                      |

### Why CONCURRENTLY is mandatory here

A regular `CREATE INDEX` acquires a `ShareLock` on the table, which blocks all
INSERT, UPDATE, and DELETE operations for the entire duration of the index
build. On a 100M-row table:

- **Build time estimate:** 5–15 minutes (single scan, faster than CONCURRENTLY)
- **Writes blocked:** 5,000 inserts/sec x 300–900 seconds = **1.5M–4.5M queued
  writes**
- **Consequence:** Connection pool exhaustion, application timeouts, cascading
  failures, potential data loss if clients retry with idempotency issues

With `CONCURRENTLY`:

- **Build time estimate:** 10–30 minutes (two scans, slower)
- **Writes blocked:** None
- **Trade-off:** Longer build time, cannot run inside a transaction, risk of
  INVALID index if interrupted

The trade-off is overwhelmingly in favor of `CONCURRENTLY`.

### Additional considerations for 5K inserts/sec

- The concurrent index build must keep up with ongoing writes. PostgreSQL
  handles this by doing a second scan to pick up rows inserted during the first
  scan. At 5K inserts/sec over a 15-minute build, that's ~4.5M new rows to
  reconcile — well within PostgreSQL's capability.
- Monitor `pg_stat_progress_create_index` during the build to track progress:

```sql
SELECT
  phase,
  blocks_total,
  blocks_done,
  tuples_total,
  tuples_done,
  CASE WHEN blocks_total > 0
    THEN round(100.0 * blocks_done / blocks_total, 1)
    ELSE 0
  END AS pct_complete
FROM pg_stat_progress_create_index;
```

---

## 4. Rollback Plan

### Rollback Strategy

The rollback for an index addition is simple and safe: drop the index. No data
is modified by index creation, so no data backup or restoration is needed.

### Rollback SQL

```sql
-- Drop the index without blocking writes
DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;
```

### Rollback Verification

```sql
-- Confirm the index no longer exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';
-- Expected: 0 rows

-- Confirm no orphaned invalid indexes remain
SELECT indexrelid::regclass, indisvalid
FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indexrelid
WHERE pg_class.relname LIKE 'idx_events_customer%';
-- Expected: 0 rows (or only other valid indexes)
```

### Handling a Failed CONCURRENTLY Build

If `CREATE INDEX CONCURRENTLY` fails or is interrupted (e.g., by a server
restart, cancellation, or deadlock), it leaves behind an **INVALID** index. This
index:

- Consumes disk space
- Is not used by the query planner
- Must be explicitly dropped before retrying

```sql
-- Check for invalid index
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;

-- If indisvalid = false:
DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;

-- Then retry the CREATE INDEX CONCURRENTLY
```

---

## 5. Verification Queries

### Pre-Migration Verification

```sql
-- 1. Table exists and approximate size
SELECT relname, reltuples::bigint AS approx_rows
FROM pg_class WHERE relname = 'events';

-- 2. Target columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events'
  AND column_name IN ('customer_id', 'created_at');

-- 3. Index does not already exist
SELECT count(*) AS existing_index_count
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';
-- Expected: 0

-- 4. Baseline query plan (save this output)
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM events
WHERE customer_id = 12345
  AND created_at >= '2026-01-01'
  AND created_at < '2026-02-01'
ORDER BY created_at DESC;
```

### Post-Migration Verification

```sql
-- 1. Index exists with correct definition
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';
-- Expected: CREATE INDEX idx_events_customer_id_created_at ON public.events
--           USING btree (customer_id, created_at)

-- 2. Index is valid (CRITICAL after CONCURRENTLY)
SELECT indisvalid FROM pg_index
WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;
-- Expected: true

-- 3. Query planner uses the index
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM events
WHERE customer_id = 12345
  AND created_at >= '2026-01-01'
  AND created_at < '2026-02-01'
ORDER BY created_at DESC;
-- Expected: Index Scan (or Index Only Scan) using idx_events_customer_id_created_at
-- Compare execution time to baseline — should be significantly faster

-- 4. Index size is reasonable
SELECT pg_size_pretty(pg_relation_size('idx_events_customer_id_created_at'));
-- Expected: ~2-5 GB depending on data types of customer_id and created_at

-- 5. Table data integrity (spot check)
SELECT count(*) FROM events;
-- Should match pre-migration approximate count (within margin of ongoing inserts)
```

---

## 6. Deployment Runbook

### Migration: Add composite index on events(customer_id, created_at)

**Purpose:** Optimize queries that filter by `customer_id` and sort/filter by
`created_at`. **Estimated duration:** 10–30 minutes **Risk level:** Low
(additive, non-blocking with CONCURRENTLY) **Rollback time:** Near-instant

---

### Pre-deployment

- [ ] Confirm table row count:
  ```sql
  SELECT reltuples::bigint FROM pg_class WHERE relname = 'events';
  ```
- [ ] Check disk space (need at least 8 GB free for index build + temp files):
  ```sql
  SELECT pg_size_pretty(pg_database_size(current_database()));
  ```
- [ ] Check replication lag (should be < 1 second):
  ```sql
  SELECT now() - pg_last_xact_replay_timestamp();
  ```
- [ ] Check for active locks on the events table:
  ```sql
  SELECT * FROM pg_locks WHERE relation = 'events'::regclass;
  ```
- [ ] Check for long-running transactions (these can block CONCURRENTLY):
  ```sql
  SELECT pid, now() - xact_start AS duration, state, query
  FROM pg_stat_activity
  WHERE state != 'idle'
    AND xact_start < now() - interval '5 minutes';
  ```
  **If any long-running transactions exist, wait for them to complete or
  terminate them before proceeding.** `CREATE INDEX CONCURRENTLY` must wait for
  all pre-existing transactions to finish before it can complete.
- [ ] Confirm `maintenance_work_mem` is set appropriately for the index build
      (higher = faster):
  ```sql
  SHOW maintenance_work_mem;
  -- Consider temporarily increasing for this session:
  -- SET maintenance_work_mem = '2GB';
  ```
- [ ] Notify on-call team that index creation is starting
- [ ] Confirm you are NOT inside a transaction block (`\echo :AUTOCOMMIT` should
      show `on` in psql)

### Execution

- [ ] Run pre-migration verification queries (Section 5 above)
- [ ] Save baseline EXPLAIN ANALYZE output for the target query
- [ ] Optionally increase `maintenance_work_mem` for this session:
  ```sql
  SET maintenance_work_mem = '2GB';
  ```
- [ ] Execute the forward migration:
  ```sql
  CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
  ON events (customer_id, created_at);
  ```
- [ ] Monitor progress during the build:
  ```sql
  SELECT phase, blocks_total, blocks_done,
         round(100.0 * blocks_done / NULLIF(blocks_total, 0), 1) AS pct_complete
  FROM pg_stat_progress_create_index;
  ```
- [ ] Expected duration: **10–30 minutes**
- [ ] Run post-migration verification queries (Section 5 above)
- [ ] **CRITICAL:** Verify `indisvalid = true` — if false, the build failed
      silently

### Rollback Criteria

Roll back immediately if:

- The `CREATE INDEX CONCURRENTLY` fails or is interrupted (check for INVALID
  index)
- Replication lag exceeds 30 seconds during the build
- Application error rate increases above baseline during the build
- Lock wait timeout errors appear in application logs
- The index build exceeds 60 minutes (2x upper estimate)

### Rollback Steps

- [ ] Execute rollback SQL:
  ```sql
  DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;
  ```
- [ ] Verify the index is gone:
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'events'
    AND indexname = 'idx_events_customer_id_created_at';
  -- Expected: 0 rows
  ```
- [ ] Check for any remaining INVALID indexes:
  ```sql
  SELECT indexrelid::regclass, indisvalid
  FROM pg_index
  JOIN pg_class ON pg_class.oid = pg_index.indexrelid
  WHERE pg_class.relname LIKE 'idx_events_customer%';
  ```
- [ ] Notify team of rollback and reason

### Post-deployment

- [ ] Monitor application error rates for 30 minutes
- [ ] Compare EXPLAIN ANALYZE output to baseline — confirm the index is being
      used and query performance improved
- [ ] Verify replication is caught up:
  ```sql
  SELECT now() - pg_last_xact_replay_timestamp();
  ```
- [ ] Monitor insert throughput — confirm no degradation from the new index
      overhead:
  ```sql
  SELECT count(*) FROM events
  WHERE created_at > now() - interval '1 minute';
  -- Compare to expected ~5,000/sec * 60 = ~300,000
  ```
- [ ] Reset `maintenance_work_mem` if it was changed:
  ```sql
  RESET maintenance_work_mem;
  ```
- [ ] No backup tables to clean up (index creation is non-destructive)
- [ ] Document the migration as complete

---

## 7. Index Design Rationale

### Column Order: (customer_id, created_at)

The column order `(customer_id, created_at)` is chosen deliberately:

1. **customer_id first** — This is the equality predicate
   (`WHERE customer_id = X`). Placing the equality column first allows the
   B-tree to navigate directly to the leaf pages for a specific customer.

2. **created_at second** — This is the range predicate
   (`AND created_at >= Y AND created_at < Z`) and/or the sort column
   (`ORDER BY created_at DESC`). With `customer_id` as the leading column, all
   rows for a given customer are grouped together in the index, and within that
   group, they're sorted by `created_at`. This means:
   - Range scans on `created_at` within a customer are a single contiguous index
     range scan
   - `ORDER BY created_at` is satisfied by the index order — no separate sort
     step needed
   - The query planner can use an **Index Only Scan** if the query only needs
     `customer_id` and `created_at`

### Queries This Index Optimizes

```sql
-- Primary target: customer events in a date range
SELECT * FROM events
WHERE customer_id = ? AND created_at >= ? AND created_at < ?
ORDER BY created_at DESC;

-- Also benefits: latest events for a customer
SELECT * FROM events
WHERE customer_id = ?
ORDER BY created_at DESC
LIMIT 10;

-- Also benefits: count events per customer in a period
SELECT count(*) FROM events
WHERE customer_id = ? AND created_at >= ? AND created_at < ?;
```

### Queries This Index Does NOT Optimize

```sql
-- Range on created_at without customer_id (index can't skip leading column)
SELECT * FROM events WHERE created_at >= '2026-01-01';

-- Equality on created_at only
SELECT * FROM events WHERE created_at = '2026-01-15';
```

If those query patterns are also needed, a separate index on `(created_at)`
would be required.

### Write Overhead

Adding this index introduces a small overhead on every INSERT, UPDATE (of
customer_id or created_at), and DELETE:

- **INSERT:** One additional B-tree insertion per row. At 5,000 inserts/sec,
  this is well within PostgreSQL's capability. Expect < 1% increase in insert
  latency.
- **UPDATE:** Only affected if `customer_id` or `created_at` is modified. If
  these columns are immutable (common for event tables), there is zero update
  overhead.
- **DELETE:** One additional B-tree deletion per row. Negligible overhead.
- **Disk space:** Approximately 2–5 GB for 100M rows (depends on data types).
- **Vacuum:** Additional index pages to vacuum, but this is handled
  automatically by autovacuum.

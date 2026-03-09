# Database Migration: Composite Index on `events(customer_id, created_at)`

---

## Step 1: Classify the Change

**Risk Tier: Medium**

**Rationale:**

- Adding an index is a non-destructive, additive schema change — no data is
  modified or removed.
- However, the `events` table has ~100 million rows and sustains ~5,000
  inserts/second at peak. A standard `CREATE INDEX` would acquire a `SHARE`
  lock, blocking all writes for the duration of the build (potentially 10–30+
  minutes on a table this size). This would cause a production outage.
- Using `CREATE INDEX CONCURRENTLY` mitigates the write-blocking risk but
  introduces the possibility of a silently invalid index if the build fails
  partway through.
- **Review needed:** Peer review required before deployment.

---

## Step 2: UP Migration (`up.sql`)

```sql
-- up.sql
-- Migration: Add composite index on (customer_id, created_at) to events table
-- Purpose: Optimize queries that filter by customer_id and sort/filter by created_at
-- Risk tier: Medium
-- PostgreSQL version: 16
--
-- IMPORTANT: This statement CANNOT run inside a transaction block.
-- If using a migration framework, disable transaction wrapping:
--   Rails: disable_ddl_transaction!
--   Django: atomic = False
--   Flyway: Run as a separate non-transactional migration
--   Liquibase: Use <sql splitStatements="false"> outside a changeSet transaction

-- Create the index concurrently to avoid blocking writes.
-- SHARE UPDATE EXCLUSIVE lock is acquired — does NOT block reads or writes.
-- Build time will be proportional to table size (~100M rows); expect 10–30 minutes
-- depending on hardware, I/O throughput, and concurrent write load.
CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
  ON events (customer_id, created_at);
```

### Why this pattern?

| Approach                    | Lock type                | Blocks writes?                                | Safe for 5K inserts/sec?                                                                  |
| --------------------------- | ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `CREATE INDEX`              | `SHARE`                  | **Yes** — all writes blocked for entire build | **No** — would queue thousands of inserts, likely causing timeouts and cascading failures |
| `CREATE INDEX CONCURRENTLY` | `SHARE UPDATE EXCLUSIVE` | **No** — writes continue normally             | **Yes** — the recommended approach                                                        |

### Index design notes

- **Column order `(customer_id, created_at)`** is correct for queries like
  `WHERE customer_id = ? ORDER BY created_at` or
  `WHERE customer_id = ? AND created_at BETWEEN ? AND ?`. The leading column
  (`customer_id`) is the equality filter; the trailing column (`created_at`)
  supports range scans and sort elimination.
- A B-tree index (the default) is the correct index type for this composite key
  pattern.
- On PostgreSQL 16, `CREATE INDEX CONCURRENTLY` performs two table scans and one
  sort. For 100M rows, expect significant I/O. Schedule during off-peak if
  possible.

---

## Step 3: DOWN Migration (`down.sql`)

```sql
-- down.sql
-- Rollback: Remove the composite index on events(customer_id, created_at)
--
-- This is safe and instant — dropping an index only removes metadata and frees disk.
-- No data is lost. Queries that relied on this index will fall back to sequential
-- scans or other available indexes.
--
-- CONCURRENTLY is used to avoid blocking concurrent queries during the drop.
-- Like CREATE INDEX CONCURRENTLY, this cannot run inside a transaction block.

DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;
```

### Rollback characteristics

- **Data loss:** None. Indexes contain no unique data; they are derived from
  table data.
- **Duration:** Near-instant (metadata removal only).
- **Lock:** `SHARE UPDATE EXCLUSIVE` when using `CONCURRENTLY` — does not block
  reads or writes.
- **Post-rollback impact:** Queries that were optimized by this index will
  revert to their previous execution plans. Monitor query latency after
  rollback.

---

## Step 4: Lock Impact Analysis

| Statement                                                                                         | Lock acquired            | Blocks reads? | Blocks writes? | Duration                                  | Impact on 5K inserts/sec                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------ | ------------- | -------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at ON events (customer_id, created_at)` | `SHARE UPDATE EXCLUSIVE` | No            | No             | 10–30 minutes (proportional to 100M rows) | **Minimal.** Inserts continue normally. Slight increase in I/O due to concurrent index build. May see 5–15% throughput reduction during build due to I/O contention. |
| `DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at`                             | `SHARE UPDATE EXCLUSIVE` | No            | No             | Near-instant                              | **None.**                                                                                                                                                            |

### Lock compatibility matrix for `SHARE UPDATE EXCLUSIVE`

| Concurrent operation                  | Allowed?   |
| ------------------------------------- | ---------- |
| `SELECT` (reads)                      | ✅ Yes     |
| `INSERT`                              | ✅ Yes     |
| `UPDATE`                              | ✅ Yes     |
| `DELETE`                              | ✅ Yes     |
| `VACUUM`                              | ❌ Blocked |
| `CREATE INDEX CONCURRENTLY` (another) | ❌ Blocked |
| `ALTER TABLE`                         | ❌ Blocked |

### Important caveats

1. **`CREATE INDEX CONCURRENTLY` cannot run inside a transaction block.** If
   your migration framework wraps migrations in `BEGIN`/`COMMIT`, you must
   disable this. Attempting to run it in a transaction will produce:
   `ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.

2. **The build can fail silently.** If the concurrent build encounters a problem
   (e.g., deadlock, unique violation for unique indexes, or the session is
   interrupted), PostgreSQL will leave behind an **invalid index**. The index
   will exist in `pg_index` but with `indisvalid = false`. It will consume disk
   space and slow down writes (because PostgreSQL still tries to maintain it)
   but will never be used for queries. **Always verify index validity after the
   build.**

3. **Two table scans required.** `CREATE INDEX CONCURRENTLY` performs two passes
   over the table. During the second pass, it incorporates any rows that were
   inserted/updated during the first pass. This means the build takes roughly 2x
   longer than a regular `CREATE INDEX`, but it doesn't block writes.

4. **WAL generation.** Building an index on 100M rows generates significant WAL.
   Ensure your WAL archiving and replication can handle the burst. On a
   streaming replica setup, the replica may lag during the build.

---

## Step 5: Verification Queries (`verify.sql`)

```sql
-- verify.sql
-- Run these queries after the UP migration to confirm success,
-- and after the DOWN migration to confirm clean rollback.

-- ============================================================
-- AFTER UP: Verify index exists and is VALID
-- ============================================================

-- 1. Check the index exists and inspect its definition
-- Expected: One row with indexdef showing the composite index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';

-- Expected result:
-- indexname                            | indexdef
-- -------------------------------------+------------------------------------------------------------------
-- idx_events_customer_id_created_at    | CREATE INDEX idx_events_customer_id_created_at ON public.events
--                                      |   USING btree (customer_id, created_at)

-- 2. Verify the index is valid (critical after CONCURRENTLY build)
-- Expected: indisvalid = true
SELECT indexrelid::regclass AS index_name,
       indisvalid AS is_valid,
       indisready AS is_ready
FROM pg_index
WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;

-- Expected result:
-- index_name                           | is_valid | is_ready
-- -------------------------------------+----------+----------
-- idx_events_customer_id_created_at    | t        | t

-- 3. Check for ANY invalid indexes on the events table (catch-all safety check)
-- Expected: Zero rows (no invalid indexes)
SELECT indexrelid::regclass AS index_name,
       indisvalid AS is_valid
FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indrelid
WHERE pg_class.relname = 'events'
  AND NOT pg_index.indisvalid;

-- Expected result: (0 rows)

-- 4. Verify the index is being used by the query planner
-- Expected: Index Scan or Index Only Scan using idx_events_customer_id_created_at
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM events
WHERE customer_id = 12345
ORDER BY created_at DESC
LIMIT 100;

-- Look for: "Index Scan Backward using idx_events_customer_id_created_at"
-- or "Index Only Scan Backward using idx_events_customer_id_created_at"

-- 5. Check index size (informational — helps estimate disk impact)
SELECT pg_size_pretty(pg_relation_size('idx_events_customer_id_created_at')) AS index_size;

-- ============================================================
-- AFTER DOWN: Verify index has been removed
-- ============================================================

-- 6. Confirm the index no longer exists
-- Expected: Zero rows
SELECT indexname FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';

-- Expected result: (0 rows)

-- 7. Confirm no invalid indexes were left behind
-- Expected: Zero rows
SELECT indexrelid::regclass AS index_name, indisvalid
FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indrelid
WHERE pg_class.relname = 'events'
  AND NOT pg_index.indisvalid;

-- Expected result: (0 rows)
```

---

## Step 6: Data Backup Commands (`backup.sh`)

```bash
#!/usr/bin/env bash
# backup.sh
# Pre-migration backup for the events table index change
#
# Risk tier: Medium — index creation is non-destructive, so a full data backup
# is not strictly required. However, we back up the table schema (including
# existing indexes) so we can verify the rollback restores the original state.

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/events_index_migration_${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

echo "=== Pre-migration backup for events table ==="
echo "Timestamp: ${TIMESTAMP}"
echo "Backup directory: ${BACKUP_DIR}"

# 1. Backup the table schema (DDL only, including indexes and constraints)
echo "[1/3] Backing up table schema..."
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  -t events --schema-only \
  -f "${BACKUP_DIR}/events_schema_${TIMESTAMP}.sql"
echo "  -> Schema saved to ${BACKUP_DIR}/events_schema_${TIMESTAMP}.sql"

# 2. Record current indexes on the events table (for comparison after migration)
echo "[2/3] Recording current index state..."
psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'events' ORDER BY indexname;" \
  > "${BACKUP_DIR}/events_indexes_before_${TIMESTAMP}.txt"
echo "  -> Index listing saved to ${BACKUP_DIR}/events_indexes_before_${TIMESTAMP}.txt"

# 3. Record table size and row count estimate (for post-migration comparison)
echo "[3/3] Recording table statistics..."
psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
  -c "SELECT
        pg_size_pretty(pg_total_relation_size('events')) AS total_size,
        pg_size_pretty(pg_relation_size('events')) AS table_size,
        pg_size_pretty(pg_indexes_size('events')) AS indexes_size,
        reltuples::bigint AS estimated_rows
      FROM pg_class WHERE relname = 'events';" \
  > "${BACKUP_DIR}/events_stats_before_${TIMESTAMP}.txt"
echo "  -> Table stats saved to ${BACKUP_DIR}/events_stats_before_${TIMESTAMP}.txt"

echo ""
echo "=== Backup complete ==="
echo "NOTE: Full data backup is not required for this migration (index creation"
echo "is non-destructive). Schema and index state have been captured for rollback"
echo "verification."
```

---

## Step 7: Deployment Runbook (`runbook.md`)

## Migration: Add composite index on `events(customer_id, created_at)`

**Risk tier:** Medium **Estimated duration:** 10–30 minutes (index build on
~100M rows) **Rollback time:** Near-instant (< 1 second) **PostgreSQL version:**
16 **Table:** `events` (~100M rows, ~5,000 inserts/sec peak)

---

### Pre-deployment checklist

- [ ] Schema backup taken and verified (`backup.sh` executed successfully)
- [ ] Current index state recorded (for rollback comparison)
- [ ] Migration tested on staging with production-scale data (~100M rows)
- [ ] Rollback tested on staging — `DROP INDEX CONCURRENTLY` verified
- [ ] Lock impact reviewed — `SHARE UPDATE EXCLUSIVE` does NOT block reads or
      writes
- [ ] Confirmed migration framework transaction wrapping is disabled for this
      migration
- [ ] Sufficient disk space available for new index (estimate: 2–4 GB for 100M
      rows with two integer/timestamp columns)
- [ ] WAL archiving and replication lag monitoring in place
- [ ] Monitoring dashboards open:
  - [ ] Query latency (p50, p95, p99)
  - [ ] Lock waits (`pg_stat_activity` where `wait_event_type = 'Lock'`)
  - [ ] Replication lag
  - [ ] Disk I/O utilization
  - [ ] Insert throughput on `events` table
  - [ ] Error rates in application logs
- [ ] Deployment scheduled during off-peak hours if possible (reduces I/O
      contention)
- [ ] No other `ALTER TABLE` or `CREATE INDEX CONCURRENTLY` operations running
      on `events`

---

### Execution steps

**1. Run the pre-migration backup**

```bash
export DB_HOST="your-db-host"
export DB_USER="your-db-user"
export DB_NAME="your-db-name"
bash backup.sh
```

Verify the backup files were created in `./backups/`.

**2. Open a monitoring session**

In a separate terminal, monitor for lock contention during the build:

```sql
-- Watch for lock waits on the events table
SELECT pid, age(clock_timestamp(), query_start) AS duration,
       wait_event_type, wait_event, state, query
FROM pg_stat_activity
WHERE query ILIKE '%events%'
  AND state != 'idle'
ORDER BY query_start;
```

**3. Execute the UP migration**

Connect to the database directly (not through a migration framework
transaction):

```sql
-- MUST NOT be inside a transaction block
-- If using psql, ensure you are NOT in a BEGIN block
CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
  ON events (customer_id, created_at);
```

**Expected behavior:**

- The command will take 10–30 minutes depending on hardware and I/O load.
- Reads and writes continue normally throughout.
- You may observe a 5–15% increase in I/O utilization during the build.
- Replication lag may increase temporarily due to WAL generation.

**4. Verify the index is valid**

**This step is critical.** `CREATE INDEX CONCURRENTLY` can fail silently,
leaving an invalid index.

```sql
-- Must return indisvalid = true
SELECT indexrelid::regclass AS index_name,
       indisvalid AS is_valid,
       indisready AS is_ready
FROM pg_index
WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;
```

**If `indisvalid = false`:**

```sql
-- Drop the invalid index and retry
DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;
-- Wait a moment, then re-run the CREATE INDEX CONCURRENTLY
CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
  ON events (customer_id, created_at);
```

**5. Verify the query planner uses the new index**

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM events
WHERE customer_id = 12345
ORDER BY created_at DESC
LIMIT 100;
```

Look for: `Index Scan Backward using idx_events_customer_id_created_at` or
`Index Only Scan Backward using idx_events_customer_id_created_at`.

**6. Check index size and table statistics**

```sql
SELECT pg_size_pretty(pg_relation_size('idx_events_customer_id_created_at')) AS index_size;

SELECT pg_size_pretty(pg_total_relation_size('events')) AS total_size,
       pg_size_pretty(pg_indexes_size('events')) AS all_indexes_size;
```

---

### Verification

Run the full `verify.sql` script after the migration:

| Query                             | Expected result                          |
| --------------------------------- | ---------------------------------------- |
| Index exists in `pg_indexes`      | 1 row with correct `indexdef`            |
| `indisvalid = true` in `pg_index` | `t` (true)                               |
| No invalid indexes on `events`    | 0 rows                                   |
| `EXPLAIN ANALYZE` on target query | Uses `idx_events_customer_id_created_at` |
| Index size                        | 2–4 GB (reasonable for 100M rows)        |

---

### Rollback procedure

**When to rollback:**

- `indisvalid` is `false` after repeated attempts
- Significant query performance degradation observed after index creation
- Unexpected disk space consumption
- Application errors related to the `events` table

**Rollback steps:**

```sql
-- Step 1: Drop the index (non-blocking with CONCURRENTLY)
-- Cannot be inside a transaction block
DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;
```

```sql
-- Step 2: Verify the index is gone
SELECT indexname FROM pg_indexes
WHERE tablename = 'events'
  AND indexname = 'idx_events_customer_id_created_at';
-- Expected: 0 rows

-- Step 3: Verify no invalid indexes remain
SELECT indexrelid::regclass, indisvalid
FROM pg_index
JOIN pg_class ON pg_class.oid = pg_index.indrelid
WHERE pg_class.relname = 'events'
  AND NOT pg_index.indisvalid;
-- Expected: 0 rows
```

**Rollback duration:** Near-instant (< 1 second). **Rollback risk:** None.
Dropping an index is a metadata-only operation. No data is lost.

---

### Post-deployment

- [ ] Monitor query latency for queries on
      `events WHERE customer_id = ? ORDER BY created_at` — expect significant
      improvement
- [ ] Monitor insert throughput on `events` — expect negligible impact (slight
      overhead for maintaining the new index, typically < 1%)
- [ ] Monitor disk usage — the new index adds ~2–4 GB
- [ ] Run `ANALYZE events` if the query planner doesn't immediately pick up the
      new index (usually automatic via autovacuum, but can be forced)
- [ ] Update documentation to reflect the new index
- [ ] Inform the team that the index is live and queries can leverage it
- [ ] After 24–48 hours bake period, confirm no negative performance impact on
      write-heavy workloads

---

## Summary of All Artifacts

| # | Artifact         | Contents                                                                                                                                     |
| - | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **`up.sql`**     | `CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at ON events (customer_id, created_at);`                                           |
| 2 | **`down.sql`**   | `DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;`                                                                       |
| 3 | **`verify.sql`** | 7 verification queries covering: index existence, validity, invalid index check, EXPLAIN ANALYZE, index size, and post-rollback verification |
| 4 | **`runbook.md`** | Full deployment runbook with pre-deployment checklist, execution steps, verification, rollback procedure, and post-deployment tasks          |
| 5 | **`backup.sh`**  | Schema backup, index state recording, and table statistics capture                                                                           |

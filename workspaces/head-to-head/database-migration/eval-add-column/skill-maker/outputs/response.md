# Database Migration: Add `status` Column to `orders` Table

## 1. Change Classification

**Risk Tier: High**

| Factor           | Assessment                                                                           |
| ---------------- | ------------------------------------------------------------------------------------ |
| Table size       | ~50 million rows — large table                                                       |
| Column type      | `VARCHAR(50) NOT NULL DEFAULT 'pending'` — non-nullable with default                 |
| Table activity   | Actively used for reads and writes in production                                     |
| Database         | PostgreSQL 15                                                                        |
| Lock concern     | Adding NOT NULL column naively causes full table rewrite under ACCESS EXCLUSIVE lock |
| Backfill concern | 50M rows must be populated — single UPDATE would bloat WAL and hold locks            |

**Why High:** Although PostgreSQL 11+ makes `ADD COLUMN ... DEFAULT` instant for
metadata, we still need a multi-step approach because: (1) we must backfill 50M
existing rows, (2) adding the NOT NULL constraint requires validation across all
rows, and (3) the table is under active production load. A single-statement
approach risks extended lock hold times during constraint validation on 50M
rows.

**Review needed:** Team review + staged rollout

---

## 2. Migration SQL (UP) — Multi-Step Sequence

### `001_add_column_up.sql`

```sql
-- Migration 001: Add nullable status column with default
-- Lock: ACCESS EXCLUSIVE (instant — metadata-only change on PG 11+)
-- Impact: Blocks reads and writes for milliseconds only
-- The DEFAULT is stored in pg_attrdef, not written to existing rows.
-- New rows inserted after this migration will get 'pending' automatically.
-- Existing rows will read NULL until backfilled.

BEGIN;

ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';

COMMIT;
```

### `002_backfill.sql`

```sql
-- Migration 002: Backfill existing rows in batches
-- Lock: ROW-level locks only (per-batch), no schema lock
-- Impact: Minimal — each batch locks ~5000 rows briefly
-- Duration: ~50,000 batches x ~50ms each ≈ 40-60 minutes
-- 
-- IMPORTANT: Run this as a standalone script, NOT inside a migration
-- framework transaction. Monitor replication lag during execution.
-- If replication lag exceeds acceptable threshold, increase pg_sleep.

DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
  total_updated BIGINT := 0;
  batch_count INT := 0;
BEGIN
  LOOP
    UPDATE orders
    SET status = 'pending'
    WHERE id IN (
      SELECT id FROM orders
      WHERE status IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;
    batch_count := batch_count + 1;

    EXIT WHEN rows_updated = 0;

    -- Brief pause to reduce load on production and let replicas catch up
    PERFORM pg_sleep(0.1);

    -- Progress logging every 100 batches (~500k rows)
    IF batch_count % 100 = 0 THEN
      RAISE NOTICE 'Backfill progress: % rows updated across % batches', total_updated, batch_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % total rows updated in % batches', total_updated, batch_count;
END $$;
```

### `003_add_constraint_up.sql`

```sql
-- Migration 003: Add NOT NULL constraint safely (2-phase approach)
-- Phase A: Add CHECK constraint as NOT VALID
--   Lock: ACCESS EXCLUSIVE (instant — does not scan existing rows)
--   Impact: Blocks reads/writes for milliseconds only
-- Phase B: Validate the constraint
--   Lock: SHARE UPDATE EXCLUSIVE (does NOT block reads or writes)
--   Impact: Full table scan but non-blocking; duration proportional to table size
--   Duration: ~2-10 minutes for 50M rows depending on I/O

-- Phase A: Add the constraint without validating existing rows
ALTER TABLE orders ADD CONSTRAINT orders_status_not_null
  CHECK (status IS NOT NULL) NOT VALID;

-- Phase B: Validate the constraint (non-blocking scan)
-- This acquires SHARE UPDATE EXCLUSIVE which allows reads AND writes to continue
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_not_null;

-- Phase C: Convert to a true NOT NULL column constraint
-- On PG 12+, this is instant if a valid CHECK (IS NOT NULL) constraint exists
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- Phase D: Clean up the now-redundant CHECK constraint
ALTER TABLE orders DROP CONSTRAINT orders_status_not_null;
```

> **Note:** Phases A-D can be run as separate statements (not in a single
> transaction) to minimize lock duration. Phase B is the longest-running step
> but does not block production traffic.

---

## 3. Rollback SQL (DOWN)

### `001_add_column_down.sql`

```sql
-- Rollback for Migration 001: Remove the status column entirely
-- Lock: ACCESS EXCLUSIVE (instant — metadata-only on PG 11+)
-- Impact: Blocks reads/writes for milliseconds
-- Data loss: YES — all status values written after Migration 001 will be lost.
--            Ensure backup is taken before executing rollback.

BEGIN;

ALTER TABLE orders DROP COLUMN IF EXISTS status;

COMMIT;
```

### `002_backfill_down.sql`

```sql
-- Rollback for Migration 002: No-op
-- The backfill set NULL values to 'pending'. Rolling back the backfill
-- is not necessary because:
--   1. If we're rolling back further to 001_down, the column is dropped entirely
--   2. If we're only rolling back the backfill, NULLs are acceptable
--      since the column is still nullable at this point
--
-- No action required.
```

### `003_add_constraint_down.sql`

```sql
-- Rollback for Migration 003: Remove the NOT NULL constraint
-- Lock: ACCESS EXCLUSIVE (instant — metadata only)
-- Impact: Blocks reads/writes for milliseconds

-- Drop the true NOT NULL constraint
ALTER TABLE orders ALTER COLUMN status DROP NOT NULL;

-- Drop the CHECK constraint if it still exists (idempotent)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_not_null;
```

### Full rollback (all steps, reverse order)

```sql
-- Complete rollback: reverse all 3 migrations in order
-- Run this if you need to fully undo the entire migration sequence

-- Step 1: Remove NOT NULL constraint
ALTER TABLE orders ALTER COLUMN status DROP NOT NULL;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_not_null;

-- Step 2: Backfill rollback is a no-op (column will be dropped next)

-- Step 3: Drop the column
ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

---

## 4. Lock Impact Analysis

| Step | SQL Statement                                                        | Lock Type                   | Blocks Reads? | Blocks Writes?          | Duration                                                                              | Risk                                                      |
| ---- | -------------------------------------------------------------------- | --------------------------- | ------------- | ----------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 001  | `ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending'` | `ACCESS EXCLUSIVE`          | Yes           | Yes                     | **Instant** (metadata-only on PG 11+; default stored in catalog, not written to rows) | **Low** — milliseconds                                    |
| 002  | `UPDATE orders SET status = 'pending' WHERE ...` (batched)           | `ROW EXCLUSIVE` (per batch) | No            | No (except locked rows) | **40-60 minutes** total (5000 rows/batch, ~50k batches, 100ms pause)                  | **Low per-batch** — each batch locks ~5000 rows for <50ms |
| 003a | `ADD CONSTRAINT ... CHECK (status IS NOT NULL) NOT VALID`            | `ACCESS EXCLUSIVE`          | Yes           | Yes                     | **Instant** (no row scan)                                                             | **Low** — milliseconds                                    |
| 003b | `VALIDATE CONSTRAINT orders_status_not_null`                         | `SHARE UPDATE EXCLUSIVE`    | **No**        | **No**                  | **2-10 minutes** (full table scan, but non-blocking)                                  | **Low** — does not block production traffic               |
| 003c | `ALTER COLUMN status SET NOT NULL`                                   | `ACCESS EXCLUSIVE`          | Yes           | Yes                     | **Instant** (PG 12+ recognizes existing valid CHECK constraint)                       | **Low** — milliseconds                                    |
| 003d | `DROP CONSTRAINT orders_status_not_null`                             | `ACCESS EXCLUSIVE`          | Yes           | Yes                     | **Instant** (metadata only)                                                           | **Low** — milliseconds                                    |

**Summary:** No step holds a long-duration blocking lock. The longest operation
(backfill) uses row-level locks only. The constraint validation scans the full
table but under `SHARE UPDATE EXCLUSIVE`, which allows concurrent reads and
writes.

---

## 5. Verification Queries (`verify.sql`)

### After Migration 001 (column added)

```sql
-- Verify the status column exists with correct type and default
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: status | character varying | 50 | YES | 'pending'::character varying

-- Verify new rows get the default
INSERT INTO orders (...) VALUES (...) RETURNING status;
-- Expected: 'pending'
-- (Use a test row and delete it, or verify via application)
```

### After Migration 002 (backfill complete)

```sql
-- Verify no NULL values remain
SELECT COUNT(*) AS null_count FROM orders WHERE status IS NULL;
-- Expected: 0

-- Verify all existing rows have 'pending'
SELECT status, COUNT(*) FROM orders GROUP BY status;
-- Expected: 'pending' | 50000000 (approximately, plus any new rows)

-- Spot-check a sample
SELECT id, status FROM orders ORDER BY id LIMIT 10;
-- Expected: all rows show status = 'pending'
```

### After Migration 003 (NOT NULL constraint applied)

```sql
-- Verify the column is now NOT NULL
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: status | NO

-- Verify the CHECK constraint was cleaned up (should not exist)
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND conname = 'orders_status_not_null';
-- Expected: 0 rows (constraint was dropped after SET NOT NULL)

-- Verify no invalid indexes were created (general health check)
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE indrelid = 'orders'::regclass AND NOT indisvalid;
-- Expected: 0 rows

-- Verify INSERT without status still works (default applied)
-- and INSERT with NULL status is rejected
-- (test in a transaction and rollback)
BEGIN;
  INSERT INTO orders (..., status) VALUES (..., NULL);
  -- Expected: ERROR: new row for relation "orders" violates not-null constraint
ROLLBACK;
```

### After Rollback

```sql
-- Verify the status column no longer exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: 0 rows

-- Verify no orphaned constraints remain
SELECT conname FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND conname LIKE '%status%';
-- Expected: 0 rows
```

---

## 6. Data Backup Commands (`backup.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-production}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/migrations}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== Pre-Migration Backup for orders.status ==="
echo "Timestamp: ${TIMESTAMP}"
echo "Target: ${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Full table backup (schema + data) using custom format for fast restore
echo "[1/3] Full table backup (pg_dump)..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  -t orders --data-only -F c \
  -f "${BACKUP_DIR}/backup_orders_${TIMESTAMP}.dump"

echo "  Saved: ${BACKUP_DIR}/backup_orders_${TIMESTAMP}.dump"

# Schema-only backup for reference
echo "[2/3] Schema-only backup..."
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  -t orders --schema-only \
  -f "${BACKUP_DIR}/backup_orders_schema_${TIMESTAMP}.sql"

echo "  Saved: ${BACKUP_DIR}/backup_orders_schema_${TIMESTAMP}.sql"

# Row count snapshot for verification
echo "[3/3] Row count snapshot..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
  -c "SELECT COUNT(*) AS row_count FROM orders;" \
  -o "${BACKUP_DIR}/backup_orders_rowcount_${TIMESTAMP}.txt"

echo "  Saved: ${BACKUP_DIR}/backup_orders_rowcount_${TIMESTAMP}.txt"

# Verify backup file sizes
echo ""
echo "=== Backup Verification ==="
ls -lh "${BACKUP_DIR}/backup_orders_"*"${TIMESTAMP}"*
echo ""
echo "Backup complete. To restore:"
echo "  pg_restore -h \${DB_HOST} -U \${DB_USER} -d \${DB_NAME} --data-only ${BACKUP_DIR}/backup_orders_${TIMESTAMP}.dump"
```

---

## 7. Deployment Runbook (`runbook.md`)

## Migration: Add non-nullable `status` column (VARCHAR(50), default 'pending') to `orders` table

**Risk tier:** High **Estimated duration:** 45-75 minutes (dominated by backfill
of 50M rows) **Rollback time:** < 1 minute (instant DDL operations)
**Database:** PostgreSQL 15 **Table:** `orders` (~50 million rows, active
production reads/writes)

### Pre-deployment checklist

- [ ] Backup taken and verified (`backup.sh` executed, file sizes confirmed)
- [ ] Migration tested on staging with production-scale data (~50M rows)
- [ ] Rollback tested on staging
- [ ] Lock impact reviewed — no long-held exclusive locks on hot tables
      (confirmed: all ACCESS EXCLUSIVE locks are instant/metadata-only)
- [ ] Application code deployed that handles both old schema (no `status`
      column) and new schema (`status` column present)
- [ ] Application code handles `status` being NULL during backfill window
- [ ] Monitoring dashboards open:
  - [ ] Query latency (p50, p95, p99)
  - [ ] Lock waits (`pg_stat_activity` WHERE `wait_event_type = 'Lock'`)
  - [ ] Replication lag (if replicas exist)
  - [ ] Error rates in application
  - [ ] WAL generation rate
  - [ ] Disk space (backfill generates WAL and dead tuples)
- [ ] Maintenance window communicated (if applicable)
- [ ] VACUUM scheduled after backfill to reclaim dead tuples

### Execution steps

**Step 1: Take backup** (5-15 minutes depending on table size)

```bash
./backup.sh
```

Verify backup files exist and have reasonable sizes.

**Step 2: Run Migration 001 — Add column** (< 1 second)

```sql
ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
```

Verify:

```sql
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: status | character varying | 50 | YES | 'pending'::character varying
```

**Step 3: Run Migration 002 — Backfill** (40-60 minutes)

```sql
-- Run the backfill script from 002_backfill.sql
-- Monitor progress via RAISE NOTICE output
-- Monitor replication lag during execution
```

During backfill, monitor:

```sql
-- Check replication lag (if applicable)
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
       (extract(epoch FROM now()) - extract(epoch FROM replay_lag))::int AS lag_seconds
FROM pg_stat_replication;

-- Check for lock contention
SELECT pid, wait_event_type, wait_event, state, query
FROM pg_stat_activity
WHERE wait_event_type = 'Lock' AND datname = current_database();

-- Check remaining NULLs (progress indicator)
SELECT COUNT(*) FROM orders WHERE status IS NULL;
```

**If replication lag exceeds 30 seconds:** Increase `pg_sleep` in the backfill
script from 0.1 to 0.5 or 1.0 seconds.

**If lock contention is observed:** Reduce `batch_size` from 5000 to 1000.

Verify backfill complete:

```sql
SELECT COUNT(*) AS null_count FROM orders WHERE status IS NULL;
-- Expected: 0
```

**Step 4: Run Migration 003 — Add NOT NULL constraint** (2-10 minutes)

```sql
-- Phase A: Add CHECK constraint NOT VALID (instant)
ALTER TABLE orders ADD CONSTRAINT orders_status_not_null
  CHECK (status IS NOT NULL) NOT VALID;

-- Phase B: Validate constraint (non-blocking scan, 2-10 min)
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_not_null;

-- Phase C: Set true NOT NULL (instant on PG 12+)
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- Phase D: Drop redundant CHECK constraint (instant)
ALTER TABLE orders DROP CONSTRAINT orders_status_not_null;
```

**Step 5: Final verification**

```sql
-- Column is NOT NULL with correct type
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: status | character varying | 50 | NO | 'pending'::character varying

-- No NULL values exist
SELECT COUNT(*) FROM orders WHERE status IS NULL;
-- Expected: 0

-- No invalid indexes
SELECT indexrelid::regclass, indisvalid
FROM pg_index WHERE indrelid = 'orders'::regclass AND NOT indisvalid;
-- Expected: 0 rows
```

**Step 6: Schedule VACUUM** (run during low-traffic period)

```sql
-- The backfill created ~50M dead tuples. VACUUM reclaims this space.
VACUUM (VERBOSE) orders;
```

### Verification

| Check                   | Query                                                                                                                           | Expected Result                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Column exists           | `SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='status'`                         | 1 row                          |
| Correct type            | `SELECT data_type, character_maximum_length FROM information_schema.columns WHERE table_name='orders' AND column_name='status'` | `character varying`, `50`      |
| NOT NULL                | `SELECT is_nullable FROM information_schema.columns WHERE table_name='orders' AND column_name='status'`                         | `NO`                           |
| Default set             | `SELECT column_default FROM information_schema.columns WHERE table_name='orders' AND column_name='status'`                      | `'pending'::character varying` |
| No NULLs                | `SELECT COUNT(*) FROM orders WHERE status IS NULL`                                                                              | `0`                            |
| No orphaned constraints | `SELECT conname FROM pg_constraint WHERE conrelid='orders'::regclass AND conname LIKE '%status%'`                               | 0 rows                         |

### Rollback procedure

**If failure occurs during or after Step 2 (column added, no backfill yet):**

```sql
ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

**If failure occurs during Step 3 (backfill in progress):**

```sql
-- Backfill can be safely interrupted — partial backfill is harmless
-- since the column is still nullable. Just drop the column.
ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

**If failure occurs during Step 4 (constraint being added):**

```sql
-- Remove constraint (if partially applied)
ALTER TABLE orders ALTER COLUMN status DROP NOT NULL;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_not_null;
-- Then drop the column
ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

**If failure occurs after Step 5 (fully deployed, issues found later):**

```sql
-- Full rollback — removes NOT NULL, then drops column
ALTER TABLE orders ALTER COLUMN status DROP NOT NULL;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_not_null;
ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

**Rollback time estimate:** < 1 minute (all operations are instant metadata
changes)

### Post-deployment

- [ ] Monitor application error rates for 24 hours (bake period)
- [ ] Remove old-schema compatibility code from application (after bake period)
- [ ] Run `VACUUM (VERBOSE) orders` during next maintenance window to reclaim
      dead tuples from backfill
- [ ] Update application documentation to reflect new `status` column
- [ ] Update API documentation if `status` is exposed
- [ ] Update database schema documentation / ERD
- [ ] Verify replicas have the new column and constraint
- [ ] Consider adding an index on `status` if queries will filter by it (use
      `CREATE INDEX CONCURRENTLY`)

# Migration: Rename `email` to `email_address` on `users` table

## 1. Change Classification

**Risk Tier: HIGH**

Rationale:

- **Column rename** — directly renaming a column breaks all running application
  code, queries, and background jobs that reference `users.email` instantly.
- **5 million rows** — backfill requires batched processing to avoid lock
  contention and WAL bloat.
- **Zero-downtime requirement** — demands a multi-phase dual-write strategy
  deployed across multiple releases.
- **Wide reference surface** — column is referenced throughout application code
  and in several background jobs, increasing the blast radius of a direct
  rename.

**Review needed:** Team review + staged rollout

---

## 2. Strategy: Dual-Write Column Rename (4 Phases)

Never rename a column directly —
`ALTER TABLE users RENAME COLUMN email TO email_address` would cause every query
using `users.email` to fail instantly. Instead, use the dual-write strategy
across 4 separate deployment phases:

| Phase   | Action                                              | Deployment                   |
| ------- | --------------------------------------------------- | ---------------------------- |
| Phase 1 | Add new `email_address` column                      | Migration deploy             |
| Phase 2 | Deploy dual-write app code + backfill existing data | App deploy + backfill script |
| Phase 3 | Switch reads to `email_address`, keep dual-write    | App deploy                   |
| Phase 4 | Drop old `email` column (after bake period)         | Migration deploy             |

Each phase is a separate deployment with its own migration and rollback.

---

## 3. Migration Files

### `001_add_column_up.sql` — Phase 1: Add new column

```sql
-- Phase 1: Add the new email_address column (nullable)
-- Lock: ACCESS EXCLUSIVE — but instant (metadata-only change, no table rewrite)
-- Impact: Momentary lock, no blocking on 5M row table
-- Safe on PostgreSQL 14

BEGIN;

ALTER TABLE users ADD COLUMN email_address TEXT;

-- Add a comment documenting the migration purpose
COMMENT ON COLUMN users.email_address IS 'Replacement for email column. Dual-write in progress — do not drop email until Phase 4.';

COMMIT;
```

### `001_add_column_down.sql` — Phase 1 Rollback

```sql
-- Rollback Phase 1: Remove the new column
-- Safe: no data loss since email_address was just added and may only have
-- dual-written data that also exists in the email column

BEGIN;

ALTER TABLE users DROP COLUMN IF EXISTS email_address;

COMMIT;
```

### `002_backfill.sql` — Phase 2: Backfill existing data

```sql
-- Phase 2: Backfill email_address from email for all existing rows
-- Run as a SCRIPT, not inside a migration transaction, because it processes
-- 5 million rows in batches and may take 10-30 minutes.
--
-- Lock: ROW-level locks only (no schema lock), batched to avoid long-held locks
-- Impact: Minimal — each batch locks only 5,000 rows briefly
--
-- IMPORTANT: Deploy dual-write application code BEFORE running this backfill.
-- The app must write to BOTH email and email_address on every INSERT/UPDATE
-- so no rows are missed between backfill completion and read switchover.

DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
  total_updated BIGINT := 0;
  batch_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of users.email_address from users.email...';
  RAISE NOTICE 'Table has approximately 5,000,000 rows. Batch size: %', batch_size;

  LOOP
    UPDATE users
    SET email_address = email
    WHERE id IN (
      SELECT id FROM users
      WHERE email_address IS NULL
        AND email IS NOT NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;
    batch_count := batch_count + 1;

    EXIT WHEN rows_updated = 0;

    -- Brief pause to reduce load on replicas and avoid WAL bloat
    PERFORM pg_sleep(0.1);

    -- Progress logging every 50 batches (~250,000 rows)
    IF batch_count % 50 = 0 THEN
      RAISE NOTICE 'Progress: % rows backfilled in % batches', total_updated, batch_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % total rows updated in % batches', total_updated, batch_count;
END $$;
```

### `002_backfill_down.sql` — Phase 2 Rollback

```sql
-- Rollback Phase 2: Clear backfilled data from email_address
-- This is effectively a no-op in terms of safety — the email column still
-- has all the data. But if you need to cleanly reverse Phase 2:

DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET email_address = NULL
    WHERE id IN (
      SELECT id FROM users
      WHERE email_address IS NOT NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

### `003_add_constraints_up.sql` — Phase 2b: Copy constraints and indexes

```sql
-- Phase 2b: Replicate indexes and constraints from email to email_address
-- Run AFTER backfill is complete and verified
--
-- IMPORTANT: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Disable transaction wrapping in your migration framework:
--   Rails: disable_ddl_transaction!
--   Django: atomic = False
--   Knex: use raw queries outside transaction

-- Create index concurrently (does NOT block reads or writes)
-- Lock: SHARE UPDATE EXCLUSIVE — allows concurrent reads and writes
-- Duration: Proportional to table size (~5M rows), expect 2-10 minutes
CREATE INDEX CONCURRENTLY idx_users_email_address ON users(email_address);

-- If the original email column had a unique constraint, add one on email_address:
-- (Using NOT VALID + VALIDATE to minimize lock duration)
ALTER TABLE users ADD CONSTRAINT users_email_address_unique
  UNIQUE USING INDEX idx_users_email_address;

-- If there was a NOT NULL constraint on email, add it to email_address:
-- Step 1: Add CHECK constraint as NOT VALID (instant, brief ACCESS EXCLUSIVE lock)
ALTER TABLE users ADD CONSTRAINT users_email_address_not_null
  CHECK (email_address IS NOT NULL) NOT VALID;

-- Step 2: Validate the constraint (SHARE UPDATE EXCLUSIVE — does NOT block writes)
ALTER TABLE users VALIDATE CONSTRAINT users_email_address_not_null;
```

### `003_add_constraints_down.sql` — Phase 2b Rollback

```sql
-- Rollback Phase 2b: Remove constraints and indexes on email_address

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_address_not_null;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_address_unique;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_address;
```

### `004_drop_old_column_up.sql` — Phase 4: Drop old column

```sql
-- Phase 4: Drop the old email column
-- ONLY run this after:
--   1. All application code reads exclusively from email_address
--   2. All background jobs have been updated and deployed
--   3. A bake period of at least 1-2 weeks has passed with no issues
--   4. Data backup has been taken (see backup.sh)
--
-- Lock: ACCESS EXCLUSIVE — instant (metadata-only, no table rewrite)
-- Impact: Momentary lock

BEGIN;

-- Drop any indexes on the old column first
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;
-- Note: DROP INDEX CONCURRENTLY cannot be in a transaction block.
-- Run the above line separately before this transaction.

COMMIT;

BEGIN;

ALTER TABLE users DROP COLUMN email;

COMMIT;
```

### `004_drop_old_column_down.sql` — Phase 4 Rollback

```sql
-- Rollback Phase 4: Restore the email column from email_address
-- WARNING: This is a partial rollback. The original email column data
-- must be restored from backup if any rows were modified after Phase 4.

BEGIN;

-- Re-add the column
ALTER TABLE users ADD COLUMN email TEXT;

COMMIT;

-- Backfill from email_address (batched)
DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET email = email_address
    WHERE id IN (
      SELECT id FROM users
      WHERE email IS NULL
        AND email_address IS NOT NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Restore index on email column
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

---

## 4. Lock Impact Analysis

| Phase    | Operation                                        | Lock Type                   | Blocks Reads? | Blocks Writes?        | Duration                    | Impact on 5M Row Table                                   |
| -------- | ------------------------------------------------ | --------------------------- | ------------- | --------------------- | --------------------------- | -------------------------------------------------------- |
| Phase 1  | `ALTER TABLE ADD COLUMN email_address TEXT`      | `ACCESS EXCLUSIVE`          | Yes           | Yes                   | **Instant** (metadata only) | Momentary — sub-millisecond lock                         |
| Phase 2  | `UPDATE ... SET email_address = email` (batched) | `ROW EXCLUSIVE` (per batch) | No            | No (only locked rows) | ~10-30 min total            | 5,000 rows locked at a time, 100ms pause between batches |
| Phase 2b | `CREATE INDEX CONCURRENTLY`                      | `SHARE UPDATE EXCLUSIVE`    | No            | No                    | ~2-10 min                   | No blocking — concurrent reads and writes allowed        |
| Phase 2b | `ADD CONSTRAINT ... NOT VALID`                   | `ACCESS EXCLUSIVE`          | Yes           | Yes                   | **Instant**                 | Momentary — no table scan                                |
| Phase 2b | `VALIDATE CONSTRAINT`                            | `SHARE UPDATE EXCLUSIVE`    | No            | No                    | ~1-5 min                    | Full table scan but does NOT block writes                |
| Phase 4  | `ALTER TABLE DROP COLUMN email`                  | `ACCESS EXCLUSIVE`          | Yes           | Yes                   | **Instant** (metadata only) | Momentary — sub-millisecond lock                         |

**Summary:** No operation in this plan holds a long-duration exclusive lock. The
longest operations (backfill, index creation, constraint validation) all use
non-blocking lock modes. Zero-downtime requirement is satisfied.

---

## 5. Verification Queries — `verify.sql`

```sql
-- ============================================================
-- VERIFICATION QUERIES
-- Run after each phase to confirm success
-- ============================================================

-- ============================================================
-- AFTER PHASE 1: Verify email_address column exists
-- ============================================================

-- Check column exists with correct type
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- EXPECTED: one row with data_type = 'text', is_nullable = 'YES'

-- Verify both columns exist side by side
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('email', 'email_address')
ORDER BY column_name;
-- EXPECTED: two rows — email and email_address

-- ============================================================
-- AFTER PHASE 2: Verify backfill completed
-- ============================================================

-- Count rows where email_address is still NULL but email is not
SELECT COUNT(*) AS unbackfilled_rows
FROM users
WHERE email_address IS NULL AND email IS NOT NULL;
-- EXPECTED: 0

-- Verify data consistency between columns
SELECT COUNT(*) AS mismatched_rows
FROM users
WHERE email IS DISTINCT FROM email_address;
-- EXPECTED: 0 (immediately after backfill; may diverge once dual-write is active)

-- Spot-check a sample of rows
SELECT id, email, email_address
FROM users
ORDER BY id
LIMIT 10;
-- EXPECTED: email and email_address values match for each row

-- ============================================================
-- AFTER PHASE 2b: Verify constraints and indexes
-- ============================================================

-- Verify index exists and is valid
SELECT indexrelid::regclass AS index_name, indisvalid
FROM pg_index
WHERE indexrelid = 'idx_users_email_address'::regclass;
-- EXPECTED: indisvalid = true

-- Check for any invalid indexes (failed CONCURRENTLY builds)
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE NOT indisvalid;
-- EXPECTED: no rows

-- Verify constraints exist
SELECT conname, contype, convalidated
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname IN ('users_email_address_unique', 'users_email_address_not_null');
-- EXPECTED: both constraints present, convalidated = true

-- ============================================================
-- AFTER PHASE 4: Verify old column is gone
-- ============================================================

-- Confirm email column no longer exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email';
-- EXPECTED: no rows

-- Confirm email_address is the only email-related column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- EXPECTED: one row

-- ============================================================
-- ROLLBACK VERIFICATION (run after any DOWN migration)
-- ============================================================

-- After Phase 1 rollback: email_address should not exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- EXPECTED: no rows

-- After Phase 4 rollback: email column should be restored
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email';
-- EXPECTED: one row with data_type = 'text'
```

---

## 6. Data Backup Commands — `backup.sh`

```bash
#!/usr/bin/env bash
# ============================================================
# backup.sh — Data backup for users.email column rename
# Run BEFORE Phase 4 (dropping the old email column)
# ============================================================

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/users_email_rename_${TIMESTAMP}"

# Database connection — set these or use environment variables
DB_HOST="${DB_HOST:?Set DB_HOST}"
DB_USER="${DB_USER:?Set DB_USER}"
DB_NAME="${DB_NAME:?Set DB_NAME}"

echo "=== Users Email Column Rename — Backup ==="
echo "Timestamp: ${TIMESTAMP}"
echo "Backup directory: ${BACKUP_DIR}"

mkdir -p "${BACKUP_DIR}"

# 1. Full table backup (custom format for efficient restore)
echo "[1/3] Backing up full users table..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -t users --data-only -F c \
  -f "${BACKUP_DIR}/users_full_${TIMESTAMP}.dump"
echo "  -> Saved to ${BACKUP_DIR}/users_full_${TIMESTAMP}.dump"

# 2. Column-specific backup (CSV for easy inspection)
echo "[2/3] Backing up email column data to CSV..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -c "\COPY (SELECT id, email, email_address FROM users) TO '${BACKUP_DIR}/users_email_columns_${TIMESTAMP}.csv' CSV HEADER"
echo "  -> Saved to ${BACKUP_DIR}/users_email_columns_${TIMESTAMP}.csv"

# 3. Row count for verification
echo "[3/3] Recording row counts..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT
        COUNT(*) AS total_rows,
        COUNT(email) AS rows_with_email,
        COUNT(email_address) AS rows_with_email_address,
        COUNT(*) FILTER (WHERE email IS DISTINCT FROM email_address) AS mismatched_rows
      FROM users;" \
  | tee "${BACKUP_DIR}/row_counts_${TIMESTAMP}.txt"

echo ""
echo "=== Backup complete ==="
echo "Files:"
ls -lh "${BACKUP_DIR}/"
echo ""
echo "To restore the full table from backup:"
echo "  pg_restore -h \$DB_HOST -U \$DB_USER -d \$DB_NAME --data-only ${BACKUP_DIR}/users_full_${TIMESTAMP}.dump"
echo ""
echo "To restore just the email column from CSV:"
echo "  1. ALTER TABLE users ADD COLUMN email TEXT;"
echo "  2. Create a temp table, COPY CSV into it, then UPDATE users from temp table"
```

---

## 7. Deployment Runbook — `runbook.md`

````markdown
## Migration: Rename `email` to `email_address` on `users` table

**Risk tier:** HIGH **Estimated total duration:** 2-4 weeks (across all phases)
**Rollback time:** < 5 minutes per phase

---

### Pre-deployment checklist

- [ ] Backup taken and verified (run `backup.sh`)
- [ ] All 4 phases tested on staging with production-scale data (5M+ rows)
- [ ] Rollback tested on staging for each phase
- [ ] Lock impact reviewed — no long-held exclusive locks on the users table
- [ ] Application code changes prepared for dual-write (Phase 2)
- [ ] Application code changes prepared for read switchover (Phase 3)
- [ ] All background jobs identified that reference `users.email`
- [ ] Monitoring dashboards open:
  - [ ] Query latency (p50, p95, p99)
  - [ ] Lock wait events (`pg_stat_activity` where `wait_event_type = 'Lock'`)
  - [ ] Error rates (application logs)
  - [ ] Replication lag
- [ ] On-call engineer aware of migration schedule
- [ ] Rollback plan reviewed by team

---

### Phase 1: Add new column (Day 1)

**Duration:** < 1 minute **Risk:** Low (instant metadata change)

#### Execution steps

1. Open monitoring dashboards (query latency, lock waits, error rates)

2. Run the Phase 1 UP migration:
   ```sql
   -- 001_add_column_up.sql
   BEGIN;
   ALTER TABLE users ADD COLUMN email_address TEXT;
   COMMENT ON COLUMN users.email_address IS 'Replacement for email column. Dual-write in progress.';
   COMMIT;
   ```
````

3. Verify:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'email_address';
   -- EXPECTED: one row, data_type = 'text', is_nullable = 'YES'
   ```

4. Monitor for 5 minutes — check for any unexpected errors

#### Rollback (if needed)

```sql
ALTER TABLE users DROP COLUMN IF EXISTS email_address;
```

---

### Phase 2: Deploy dual-write code + backfill (Day 1-2)

**Duration:** App deploy ~normal; backfill ~10-30 minutes **Risk:** Medium
(batched writes, no schema locks)

#### Execution steps

1. **Deploy application code** that writes to BOTH `email` and `email_address`
   on every INSERT and UPDATE to the `users` table. All background jobs that
   write to `email` must also write to `email_address`.

2. Verify dual-write is working:
   ```sql
   -- Check recent rows have both columns populated
   SELECT id, email, email_address
   FROM users
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

3. Run the backfill script (NOT inside a migration transaction):
   ```sql
   -- 002_backfill.sql (run directly, not in a migration framework)
   DO $$
   DECLARE
     batch_size INT := 5000;
     rows_updated INT;
     total_updated BIGINT := 0;
     batch_count INT := 0;
   BEGIN
     LOOP
       UPDATE users
       SET email_address = email
       WHERE id IN (
         SELECT id FROM users
         WHERE email_address IS NULL AND email IS NOT NULL
         LIMIT batch_size
         FOR UPDATE SKIP LOCKED
       );
       GET DIAGNOSTICS rows_updated = ROW_COUNT;
       total_updated := total_updated + rows_updated;
       batch_count := batch_count + 1;
       EXIT WHEN rows_updated = 0;
       PERFORM pg_sleep(0.1);
       IF batch_count % 50 = 0 THEN
         RAISE NOTICE 'Progress: % rows backfilled in % batches', total_updated, batch_count;
       END IF;
     END LOOP;
     RAISE NOTICE 'Backfill complete: % total rows updated in % batches', total_updated, batch_count;
   END $$;
   ```

4. Verify backfill completed:
   ```sql
   SELECT COUNT(*) AS unbackfilled FROM users
   WHERE email_address IS NULL AND email IS NOT NULL;
   -- EXPECTED: 0
   ```

5. Add constraints and indexes (disable transaction wrapping in your migration
   framework):
   ```sql
   -- 003_add_constraints_up.sql
   CREATE INDEX CONCURRENTLY idx_users_email_address ON users(email_address);

   -- Verify index is valid
   SELECT indexrelid::regclass, indisvalid
   FROM pg_index WHERE indexrelid = 'idx_users_email_address'::regclass;
   -- EXPECTED: indisvalid = true

   ALTER TABLE users ADD CONSTRAINT users_email_address_unique
     UNIQUE USING INDEX idx_users_email_address;

   ALTER TABLE users ADD CONSTRAINT users_email_address_not_null
     CHECK (email_address IS NOT NULL) NOT VALID;
   ALTER TABLE users VALIDATE CONSTRAINT users_email_address_not_null;
   ```

6. Monitor for 24 hours — watch for:
   - Increased query latency
   - Lock wait events
   - Replication lag spikes during backfill

#### Rollback (if needed)

```sql
-- Reverse constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_address_not_null;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_address_unique;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_address;
-- Reverse backfill (optional — nulls are safe)
-- Redeploy app code without dual-write
```

---

### Phase 3: Switch reads to new column (Day 3-7)

**Duration:** App deploy only (no SQL migration) **Risk:** Medium (application
behavior change)

#### Execution steps

1. **Deploy application code** that reads from `email_address` instead of
   `email`. Keep dual-write active.

2. Update all background jobs to read from `email_address`.

3. Verify reads are working:
   ```sql
   -- Confirm data consistency
   SELECT COUNT(*) FROM users
   WHERE email IS DISTINCT FROM email_address;
   -- EXPECTED: 0 (or very small number from in-flight writes)
   ```

4. Monitor for 1-2 weeks (bake period):
   - Application error rates
   - Background job success rates
   - Any queries still referencing `email` column

#### Rollback (if needed)

- Redeploy previous application code that reads from `email`
- No SQL changes needed — both columns still exist and are in sync

---

### Phase 4: Drop old column (Day 14-21, after bake period)

**Duration:** < 5 minutes **Risk:** High (irreversible data removal — backup
required)

#### Execution steps

1. **Run backup** (MANDATORY):
   ```bash
   ./backup.sh
   ```

2. Verify backup files exist and contain data:
   ```bash
   ls -lh backups/users_email_rename_*/
   ```

3. Final consistency check:
   ```sql
   SELECT COUNT(*) FROM users WHERE email IS DISTINCT FROM email_address;
   -- EXPECTED: 0
   ```

4. Remove dual-write from application code — deploy code that only writes to
   `email_address`.

5. Drop the old column:
   ```sql
   -- Drop index on old column first (outside transaction)
   DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;

   -- Then drop the column
   BEGIN;
   ALTER TABLE users DROP COLUMN email;
   COMMIT;
   ```

6. Verify:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'email';
   -- EXPECTED: no rows

   SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'email_address';
   -- EXPECTED: one row
   ```

#### Rollback (if needed)

```sql
-- Re-add the column
ALTER TABLE users ADD COLUMN email TEXT;

-- Restore from email_address
DO $$
DECLARE batch_size INT := 5000; rows_updated INT;
BEGIN
  LOOP
    UPDATE users SET email = email_address
    WHERE id IN (
      SELECT id FROM users WHERE email IS NULL AND email_address IS NOT NULL
      LIMIT batch_size FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

**Note:** If rows were modified after Phase 4, restore from the backup taken in
step 1.

---

### Post-deployment

- [ ] Remove old-schema compatibility code (dual-write logic)
- [ ] Update API documentation to reference `email_address`
- [ ] Update database documentation / ERD diagrams
- [ ] Clean up any ORM model aliases (e.g., `email` → `email_address`)
- [ ] Notify downstream teams / API consumers of the column name change
- [ ] Archive backup files after 30-day retention period
- [ ] Close the migration tracking ticket

```
---

## 8. Application Code Change Checklist

This migration requires coordinated application code changes. Here is a checklist of what to update at each phase:

### Phase 2 — Dual-write code changes
- [ ] ORM model: add `email_address` field/attribute
- [ ] All INSERT queries: write to both `email` and `email_address`
- [ ] All UPDATE queries that touch `email`: also update `email_address`
- [ ] Background jobs that write to `email`: also write to `email_address`
- [ ] API endpoints that accept email input: write to both columns
- [ ] User registration flow: write to both columns
- [ ] Email change/update flow: write to both columns

### Phase 3 — Read switchover code changes
- [ ] All SELECT queries: read from `email_address` instead of `email`
- [ ] Background jobs that read `email`: switch to `email_address`
- [ ] API response serializers: return `email_address` (or alias to `email` in API response for backward compatibility)
- [ ] Search/filter queries: use `email_address`
- [ ] Unique validation checks: validate against `email_address`
- [ ] Authentication queries (login by email): use `email_address`

### Phase 4 — Cleanup code changes
- [ ] Remove all dual-write logic
- [ ] Remove `email` field from ORM model
- [ ] Remove any `email` → `email_address` aliases
- [ ] Update API documentation

---

## Summary

| Artifact | File |
|----------|------|
| Phase 1 UP migration | `001_add_column_up.sql` |
| Phase 1 DOWN migration | `001_add_column_down.sql` |
| Phase 2 backfill script | `002_backfill.sql` |
| Phase 2 backfill rollback | `002_backfill_down.sql` |
| Phase 2b constraints UP | `003_add_constraints_up.sql` |
| Phase 2b constraints DOWN | `003_add_constraints_down.sql` |
| Phase 4 drop column UP | `004_drop_old_column_up.sql` |
| Phase 4 drop column DOWN | `004_drop_old_column_down.sql` |
| Verification queries | `verify.sql` |
| Data backup commands | `backup.sh` |
| Deployment runbook | `runbook.md` |

**Total estimated timeline:** 2-4 weeks across all phases, with the majority being bake time between Phase 3 and Phase 4. Actual SQL execution time is under 1 hour total. Zero downtime is maintained throughout — no operation holds a long-duration exclusive lock on the `users` table.
```

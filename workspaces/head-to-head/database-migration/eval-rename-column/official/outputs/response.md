# Renaming `email` to `email_address` on `users` Table

## Assessment

Before writing any SQL, here are the answers to the required assessment
questions:

- **What tables are affected and how large are they?** The `users` table with
  approximately 5 million rows. This is a medium-large table — most
  metadata-only operations will be instant, but any full table scan or rewrite
  will take seconds to minutes depending on hardware.
- **Is this additive or destructive?** This is a **destructive rename**. A
  direct `ALTER TABLE ... RENAME COLUMN` would instantly break every application
  query, background job, and ORM mapping that references `email`. We must treat
  this as destructive.
- **Does the application need to work with both the old and new schema
  simultaneously during deployment?** **Yes.** The column is referenced
  throughout application code and in several background jobs. During the
  transition, both the old name (`email`) and the new name (`email_address`)
  must work. Background jobs may be in-flight or enqueued with code referencing
  the old column name.
- **What is the rollback path if something goes wrong mid-migration?** Each
  phase has its own independent rollback. Phase 1 (add column + backfill) rolls
  back by dropping the new column. Phase 2 is an application-only deploy that
  rolls back by redeploying the previous application version. Phase 3 (drop old
  column) rolls back by re-adding the old column and backfilling from the new
  one.

**Key risk:** A single-step
`ALTER TABLE users RENAME COLUMN email TO email_address` is instant and
non-blocking at the database level, but it **immediately breaks every query
referencing `email`**. With code references throughout the application and in
background jobs, this guarantees downtime. We must use the **dual-write /
expand-contract** strategy.

---

## Migration Plan: Three-Phase Expand-Contract

This rename is split into **three separate migrations**, each deployed with a
corresponding application change. Each phase is independently reversible.

| Phase   | Migration                                                                     | Application Change                                                      | Rollback                                             |
| ------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Phase 1 | Add `email_address` column, backfill from `email`, add trigger for dual-write | Deploy code that writes to **both** columns, reads from `email`         | Drop column `email_address`, drop trigger            |
| Phase 2 | _(no migration)_                                                              | Deploy code that reads from `email_address`, writes to **both** columns | Redeploy previous application version                |
| Phase 3 | Drop column `email`, drop trigger                                             | Deploy code that only references `email_address`                        | Re-add `email` column, backfill from `email_address` |

---

## Phase 1 Migration: Add New Column + Backfill + Dual-Write Trigger

```sql
-- Migration: Rename email to email_address (Phase 1 — add new column)
-- Author: DBA Team
-- Date: 2026-03-09
-- Estimated duration: ~2-5 minutes (backfill of 5M rows in batches)
-- Lock impact: AccessExclusiveLock for ADD COLUMN — held for milliseconds (metadata-only).
--              No lock during batched backfill. AccessExclusiveLock for CREATE TRIGGER — milliseconds.
-- Rollback: DROP COLUMN email_address, DROP TRIGGER, DROP FUNCTION

-- ============================================================
-- PRE-MIGRATION CHECKS
-- ============================================================

-- Verify the table exists and confirm row count
SELECT count(*) AS row_count FROM users;
-- Expected: ~5,000,000

-- Verify the source column exists
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email';
-- Expected: 1 row returned

-- Verify the target column does NOT already exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- Expected: 0 rows

-- Check for indexes on the email column (we'll need to recreate them)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexdef LIKE '%email%';
-- Record these — we'll create matching indexes on email_address

-- Check for foreign key constraints referencing this column
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (kcu.column_name = 'email' OR ccu.column_name = 'email')
    AND (kcu.table_name = 'users' OR ccu.table_name = 'users');
-- Record any FK constraints — they'll need to be recreated

-- Check for CHECK constraints on the email column
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass
    AND pg_get_constraintdef(oid) LIKE '%email%';
-- Record these for recreation

-- Check current disk space
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;

-- Check replication lag
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- Check active locks on users table
SELECT mode, granted, pid, pg_blocking_pids(pid) AS blocked_by
FROM pg_locks
WHERE relation = 'users'::regclass;

-- ============================================================
-- BACKUP COMMANDS
-- ============================================================

-- Back up the email column data (for safety, even though we're not dropping it in this phase)
CREATE TABLE _backup_users_email AS
SELECT id, email FROM users;

-- Verify backup row count matches
SELECT count(*) FROM _backup_users_email;
-- Expected: ~5,000,000 (should match users table count)

-- ============================================================
-- FORWARD MIGRATION
-- ============================================================

-- Step 1: Add the new column (instant, metadata-only on PG 14)
-- Lock: AccessExclusiveLock, held for milliseconds
ALTER TABLE users ADD COLUMN email_address text;

-- Step 2: Copy any indexes from email to email_address
-- (Adjust these based on what the pre-migration check found)
-- Example: if there's a unique index on email, create one on email_address
CREATE UNIQUE INDEX CONCURRENTLY idx_users_email_address ON users (email_address);
-- Note: CONCURRENTLY cannot run inside a transaction block.
-- If this fails, check for and drop any INVALID index before retrying:
--   DROP INDEX CONCURRENTLY idx_users_email_address;

-- Step 3: Backfill in batches (no locks, application keeps running)
DO $$
DECLARE
    batch_size INT := 50000;
    max_id BIGINT;
    current_id BIGINT := 0;
    rows_updated BIGINT;
BEGIN
    SELECT MAX(id) INTO max_id FROM users;
    RAISE NOTICE 'Backfilling email_address for % rows (max_id: %)', max_id, max_id;

    WHILE current_id < max_id LOOP
        UPDATE users
        SET email_address = email
        WHERE email_address IS NULL
            AND id > current_id
            AND id <= current_id + batch_size;

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        RAISE NOTICE 'Batch %–%: updated % rows',
            current_id + 1, current_id + batch_size, rows_updated;

        current_id := current_id + batch_size;
        COMMIT;
        PERFORM pg_sleep(0.1);  -- pause to let replicas catch up
    END LOOP;

    RAISE NOTICE 'Backfill complete.';
END $$;

-- Step 4: Create a trigger to keep both columns in sync during the transition
-- This ensures any writes to `email` also update `email_address` and vice versa
CREATE OR REPLACE FUNCTION sync_email_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- If email was updated but email_address was not (or is being set to old value)
    IF TG_OP = 'INSERT' THEN
        IF NEW.email_address IS NULL AND NEW.email IS NOT NULL THEN
            NEW.email_address := NEW.email;
        ELSIF NEW.email IS NULL AND NEW.email_address IS NOT NULL THEN
            NEW.email := NEW.email_address;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email_address IS NOT DISTINCT FROM OLD.email_address THEN
            NEW.email_address := NEW.email;
        ELSIF NEW.email_address IS DISTINCT FROM OLD.email_address AND NEW.email IS NOT DISTINCT FROM OLD.email THEN
            NEW.email := NEW.email_address;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_email_columns
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_email_columns();

-- Step 5: Replicate any NOT NULL constraint
-- Check if email has NOT NULL, and if so, add it to email_address
-- (Only do this AFTER backfill is complete and trigger is in place)
-- First verify no NULLs remain:
SELECT count(*) FROM users WHERE email_address IS NULL;
-- Expected: 0

-- If email has NOT NULL:
ALTER TABLE users ALTER COLUMN email_address SET NOT NULL;
-- Lock: AccessExclusiveLock, but since all rows already have values,
-- the validation scan completes quickly on PG 14.

-- Step 6: Replicate any CHECK constraints
-- Example: if email had a CHECK (email ~* '^.+@.+\..+$'):
-- ALTER TABLE users ADD CONSTRAINT chk_email_address_format
--     CHECK (email_address ~* '^.+@.+\..+$') NOT VALID;
-- ALTER TABLE users VALIDATE CONSTRAINT chk_email_address_format;

-- ============================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================

-- Verify new column exists with correct type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- Expected: email_address | text (or varchar) | NO

-- Verify all data was copied correctly (spot check)
SELECT count(*) FROM users WHERE email IS DISTINCT FROM email_address;
-- Expected: 0

-- Verify no NULLs in new column
SELECT count(*) FROM users WHERE email_address IS NULL;
-- Expected: 0

-- Verify the index is valid
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE indexrelid = 'idx_users_email_address'::regclass;
-- Expected: idx_users_email_address | t

-- Verify the trigger exists
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND tgname = 'trg_sync_email_columns';
-- Expected: trg_sync_email_columns | O (enabled)

-- Verify sync trigger works (test with a throwaway update, then revert)
-- In a test environment:
-- UPDATE users SET email = 'test-sync@example.com' WHERE id = 1;
-- SELECT email, email_address FROM users WHERE id = 1;
-- Expected: both columns show 'test-sync@example.com'

-- Compare query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email_address = 'test@example.com';
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
-- Expected: similar execution plans and timing

-- ============================================================
-- ROLLBACK (Phase 1)
-- ============================================================

-- Drop the trigger and function
DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;
DROP FUNCTION IF EXISTS sync_email_columns();

-- Drop the index
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_address;

-- Drop the new column
ALTER TABLE users DROP COLUMN IF EXISTS email_address;

-- Verify rollback
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- Expected: 0 rows

-- Clean up backup table (only after confirming rollback is complete)
-- DROP TABLE IF EXISTS _backup_users_email;
```

---

## Phase 2: Application Code Cutover (No Migration)

This phase is an **application-only deployment** — no database migration is run.

### What to change in application code:

1. **All read queries:** Change from reading `email` to reading `email_address`
2. **All write queries:** Continue writing to **both** `email` and
   `email_address` (the trigger handles sync, but explicit dual-write is safer
   and makes the code's intent clear)
3. **Background jobs:** Update all job classes that reference `email` to use
   `email_address`
4. **ORM models:** Update column mappings / attribute names
5. **API serializers:** Update any response payloads that expose `email`
   (consider keeping `email` as an alias in the API for backward compatibility)
6. **Validation logic:** Ensure uniqueness checks and format validations
   reference `email_address`

### Rollback for Phase 2:

Redeploy the previous application version. The dual-write trigger ensures both
columns stay in sync regardless of which column the application writes to, so
rolling back the application code is safe.

### Verification for Phase 2:

```sql
-- After deploying the new application code, verify writes go to email_address
-- Check recent updates are populating email_address
SELECT id, email, email_address, updated_at
FROM users
ORDER BY updated_at DESC
LIMIT 10;
-- Expected: email and email_address match for recently updated rows

-- Monitor for any queries still hitting the old column exclusively
-- (Check application logs / query monitoring for SELECT ... email FROM users patterns)
```

---

## Phase 3 Migration: Drop Old Column

**Deploy this only after Phase 2 has been running successfully for a sufficient
bake period (recommended: at least 1 week).** Ensure all background jobs from
before Phase 2 have completed — check job queues for any enqueued jobs that
reference the old `email` column.

```sql
-- Migration: Rename email to email_address (Phase 3 — drop old column)
-- Author: DBA Team
-- Date: <date, at least 1 week after Phase 2>
-- Estimated duration: Instant (metadata-only DROP COLUMN in PostgreSQL)
-- Lock impact: AccessExclusiveLock for DROP COLUMN — held for milliseconds
-- Rollback: Re-add email column, backfill from email_address

-- ============================================================
-- PRE-MIGRATION CHECKS
-- ============================================================

-- Verify both columns exist and are in sync
SELECT count(*) FROM users WHERE email IS DISTINCT FROM email_address;
-- Expected: 0

-- Verify no application code is still reading from `email`
-- (Check application logs, slow query logs, pg_stat_statements)
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%users%' AND query LIKE '%email%' AND query NOT LIKE '%email_address%'
ORDER BY calls DESC
LIMIT 20;
-- Expected: 0 rows (no queries referencing `email` without `email_address`)

-- Verify all background jobs from pre-Phase-2 have completed
-- (Application-specific check — verify job queues are clear of old code)

-- Check replication lag
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

-- ============================================================
-- BACKUP COMMANDS
-- ============================================================

-- Back up the old column (even though data is duplicated in email_address)
CREATE TABLE _backup_users_email_phase3 AS
SELECT id, email FROM users;

-- Verify backup
SELECT count(*) FROM _backup_users_email_phase3;

-- ============================================================
-- FORWARD MIGRATION
-- ============================================================

-- Step 1: Drop the sync trigger (no longer needed)
DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;
DROP FUNCTION IF EXISTS sync_email_columns();

-- Step 2: Drop indexes on the old column
-- (Adjust based on what exists — check pg_indexes first)
-- Example:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;
-- DROP INDEX CONCURRENTLY IF EXISTS users_email_key;  -- unique constraint index

-- Step 3: Drop any constraints on the old column
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Step 4: Drop the old column (instant, metadata-only in PostgreSQL)
ALTER TABLE users DROP COLUMN email;

-- ============================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================

-- Verify old column is gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email';
-- Expected: 0 rows

-- Verify new column is intact
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- Expected: email_address | text | NO

-- Verify data is intact
SELECT count(*) FROM users WHERE email_address IS NULL;
-- Expected: 0

-- Verify index on email_address is valid
SELECT indexrelid::regclass, indisvalid
FROM pg_index
WHERE indexrelid = 'idx_users_email_address'::regclass;
-- Expected: idx_users_email_address | t

-- Verify trigger is gone
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'users'::regclass AND tgname = 'trg_sync_email_columns';
-- Expected: 0 rows

-- Test a critical application query
EXPLAIN ANALYZE SELECT * FROM users WHERE email_address = 'test@example.com';
-- Expected: Index scan using idx_users_email_address

-- ============================================================
-- ROLLBACK (Phase 3)
-- ============================================================

-- Re-add the old column
ALTER TABLE users ADD COLUMN email text;

-- Backfill from the new column (in batches for 5M rows)
DO $$
DECLARE
    batch_size INT := 50000;
    max_id BIGINT;
    current_id BIGINT := 0;
BEGIN
    SELECT MAX(id) INTO max_id FROM users;
    WHILE current_id < max_id LOOP
        UPDATE users
        SET email = email_address
        WHERE email IS NULL
            AND id > current_id
            AND id <= current_id + batch_size;
        current_id := current_id + batch_size;
        COMMIT;
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Recreate the sync trigger
CREATE OR REPLACE FUNCTION sync_email_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.email_address IS NULL AND NEW.email IS NOT NULL THEN
            NEW.email_address := NEW.email;
        ELSIF NEW.email IS NULL AND NEW.email_address IS NOT NULL THEN
            NEW.email := NEW.email_address;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email_address IS NOT DISTINCT FROM OLD.email_address THEN
            NEW.email_address := NEW.email;
        ELSIF NEW.email_address IS DISTINCT FROM OLD.email_address AND NEW.email IS NOT DISTINCT FROM OLD.email THEN
            NEW.email := NEW.email_address;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_email_columns
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_email_columns();

-- Recreate indexes on old column
-- CREATE UNIQUE INDEX CONCURRENTLY idx_users_email ON users (email);

-- Redeploy Phase 2 application code (reads from email_address, writes to both)

-- Verify rollback
SELECT count(*) FROM users WHERE email IS DISTINCT FROM email_address;
-- Expected: 0
```

---

## Lock Impact Analysis

| Phase | Statement                                                  | Lock Type                    | Blocks Reads? | Blocks Writes?    | Duration                                                |
| ----- | ---------------------------------------------------------- | ---------------------------- | ------------- | ----------------- | ------------------------------------------------------- |
| 1     | `ALTER TABLE users ADD COLUMN email_address text`          | `AccessExclusiveLock`        | Yes           | Yes               | **Milliseconds** (metadata-only, PG 14)                 |
| 1     | `CREATE UNIQUE INDEX CONCURRENTLY idx_users_email_address` | None significant             | No            | No                | **2-5 minutes** (non-blocking, 5M rows)                 |
| 1     | Batched `UPDATE` (backfill)                                | `RowExclusiveLock` (per row) | No            | No (per-row only) | **2-5 minutes** total (50K batches with 100ms pauses)   |
| 1     | `CREATE TRIGGER`                                           | `ShareRowExclusiveLock`      | No            | Yes               | **Milliseconds**                                        |
| 1     | `ALTER COLUMN email_address SET NOT NULL`                  | `AccessExclusiveLock`        | Yes           | Yes               | **Seconds** (full scan, but all rows already populated) |
| 3     | `DROP TRIGGER`                                             | `AccessExclusiveLock`        | Yes           | Yes               | **Milliseconds**                                        |
| 3     | `DROP INDEX CONCURRENTLY`                                  | None significant             | No            | No                | **Seconds** (non-blocking)                              |
| 3     | `ALTER TABLE users DROP COLUMN email`                      | `AccessExclusiveLock`        | Yes           | Yes               | **Milliseconds** (metadata-only in PostgreSQL)          |

**Summary:** The only operations that block reads and writes are metadata-only
changes that complete in milliseconds. The long-running operations (index
creation, backfill) are non-blocking. **Zero downtime is achieved.**

---

## Deployment Runbook

### Phase 1 Runbook: Add Column + Backfill + Trigger

#### Pre-deployment

- [ ] Confirm table row count: `SELECT count(*) FROM users;` — expected
      ~5,000,000
- [ ] Check disk space:
      `SELECT pg_size_pretty(pg_database_size(current_database()));` — need at
      least 2x the `users` table size free for backfill WAL + backup table
- [ ] Check replication lag: `SELECT now() - pg_last_xact_replay_timestamp();` —
      should be < 1 second
- [ ] Check active locks:
      `SELECT * FROM pg_locks WHERE relation = 'users'::regclass;` — should be
      no `AccessExclusiveLock`
- [ ] Record existing indexes on `email`:
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users' AND indexdef LIKE '%email%';`
- [ ] Record existing constraints on `email` column
- [ ] Notify on-call team
- [ ] Schedule during low-traffic window (recommended, though all operations are
      non-blocking)

#### Execution

- [ ] Run pre-migration verification queries (confirm column doesn't already
      exist)
- [ ] Execute backup:
      `CREATE TABLE _backup_users_email AS SELECT id, email FROM users;`
- [ ] Verify backup row count matches users table
- [ ] Add column: `ALTER TABLE users ADD COLUMN email_address text;` —
      **expected: instant**
- [ ] Create index:
      `CREATE UNIQUE INDEX CONCURRENTLY idx_users_email_address ON users (email_address);`
      — **expected: 2-5 minutes**
- [ ] Verify index is valid (check `pg_index.indisvalid`)
- [ ] Run backfill script — **expected: 2-5 minutes**
- [ ] Monitor replication lag during backfill — pause if lag > 5 seconds
- [ ] Create sync trigger
- [ ] Verify no NULLs remain:
      `SELECT count(*) FROM users WHERE email_address IS NULL;`
- [ ] Add NOT NULL constraint:
      `ALTER TABLE users ALTER COLUMN email_address SET NOT NULL;`
- [ ] Run post-migration verification queries

#### Rollback Criteria

Roll back immediately if:

- Index creation fails (check for INVALID index state)
- Backfill exceeds 15 minutes (3x expected duration)
- Replication lag exceeds 30 seconds during backfill
- Error rate increases above baseline in application monitoring
- Lock wait timeout errors appear in application logs

#### Rollback Steps

- [ ] `DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;`
- [ ] `DROP FUNCTION IF EXISTS sync_email_columns();`
- [ ] `DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_address;`
- [ ] `ALTER TABLE users DROP COLUMN IF EXISTS email_address;`
- [ ] Verify rollback: confirm `email_address` column no longer exists
- [ ] Notify team of rollback

#### Post-deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Verify trigger is syncing correctly (update a test row, check both
      columns)
- [ ] Check query performance:
      `EXPLAIN ANALYZE SELECT * FROM users WHERE email_address = 'test@example.com';`
- [ ] Verify replication is caught up
- [ ] Deploy Phase 2 application code (reads from `email_address`, writes to
      both)

---

### Phase 2 Runbook: Application Code Cutover

#### Pre-deployment

- [ ] Confirm Phase 1 migration is complete and verified
- [ ] Confirm sync trigger is working correctly
- [ ] Confirm all data is in sync:
      `SELECT count(*) FROM users WHERE email IS DISTINCT FROM email_address;` —
      expected 0

#### Execution

- [ ] Deploy application code that reads from `email_address` and writes to both
      columns
- [ ] Monitor application error rates
- [ ] Verify recent writes populate `email_address` correctly

#### Rollback Criteria

Roll back immediately if:

- Application errors referencing `email_address` column
- Any 500 errors related to user queries
- Background job failures referencing column names

#### Rollback Steps

- [ ] Redeploy previous application version (reads from `email`, writes to
      `email`)
- [ ] The sync trigger ensures `email_address` stays populated for the next
      attempt
- [ ] Notify team of rollback

#### Post-deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Verify background jobs are completing successfully
- [ ] Check that new user registrations have both columns populated
- [ ] **Wait at least 1 week** before proceeding to Phase 3
- [ ] Ensure all pre-Phase-2 background jobs have drained from queues

---

### Phase 3 Runbook: Drop Old Column

#### Pre-deployment

- [ ] Confirm Phase 2 has been running successfully for at least 1 week
- [ ] Confirm all background job queues are clear of pre-Phase-2 jobs
- [ ] Verify no application code references `email` without `email_address`:
      check `pg_stat_statements`
- [ ] Check replication lag: should be < 1 second
- [ ] Notify on-call team

#### Execution

- [ ] Execute backup:
      `CREATE TABLE _backup_users_email_phase3 AS SELECT id, email FROM users;`
- [ ] Verify backup row count
- [ ] Drop trigger: `DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;`
- [ ] Drop trigger function: `DROP FUNCTION IF EXISTS sync_email_columns();`
- [ ] Drop old indexes on `email` column (use `CONCURRENTLY`)
- [ ] Drop old column: `ALTER TABLE users DROP COLUMN email;` — **expected:
      instant**
- [ ] Run post-migration verification queries

#### Rollback Criteria

Roll back immediately if:

- Application errors after column drop
- Any queries fail with "column email does not exist"

#### Rollback Steps

- [ ] `ALTER TABLE users ADD COLUMN email text;`
- [ ] Run batched backfill: copy `email_address` → `email`
- [ ] Recreate sync trigger
- [ ] Recreate indexes on `email`
- [ ] Redeploy Phase 2 application code
- [ ] Notify team of rollback

#### Post-deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Check query performance on `email_address` column
- [ ] Verify replication is caught up
- [ ] Clean up backup tables after 7 days:
  - `DROP TABLE IF EXISTS _backup_users_email;`
  - `DROP TABLE IF EXISTS _backup_users_email_phase3;`
- [ ] Update documentation to reflect the new column name
- [ ] Celebrate the zero-downtime rename

---

## Timeline Summary

| Day     | Action                                                                     |
| ------- | -------------------------------------------------------------------------- |
| Day 1   | Deploy Phase 1 migration (add column, backfill, trigger)                   |
| Day 1   | Deploy Phase 2 application code (read from `email_address`, write to both) |
| Day 1–7 | Bake period — monitor, let background jobs drain                           |
| Day 8+  | Deploy Phase 3 migration (drop old `email` column)                         |
| Day 15+ | Clean up backup tables                                                     |

## Common Mistakes to Avoid

| Mistake                                                  | Why It's Dangerous                                                            | What We Do Instead                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `ALTER TABLE users RENAME COLUMN email TO email_address` | Instantly breaks all application code and background jobs referencing `email` | Three-phase expand-contract with dual-write trigger                  |
| Single large `UPDATE` for 5M row backfill                | One huge transaction, WAL bloat, replication lag                              | Batch in 50K-row chunks with 100ms pauses                            |
| Skipping the bake period between Phase 2 and Phase 3     | Background jobs enqueued before Phase 2 may still reference `email`           | Wait at least 1 week; verify job queues are drained                  |
| No backup before dropping the old column                 | Data is unrecoverable if rollback is needed                                   | `CREATE TABLE _backup_... AS SELECT` before every destructive change |
| Creating index without `CONCURRENTLY`                    | Blocks all writes for duration of index build on 5M rows                      | `CREATE UNIQUE INDEX CONCURRENTLY`                                   |
| Forgetting to check for INVALID indexes                  | Failed `CONCURRENTLY` leaves unusable index                                   | Query `pg_index.indisvalid` after index creation                     |

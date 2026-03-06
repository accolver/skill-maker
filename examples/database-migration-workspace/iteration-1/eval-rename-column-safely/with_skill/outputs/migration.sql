-- Migration: Rename email → email_address on users table
-- Table: users (~5M rows, PostgreSQL 14)
-- Strategy: Dual-write / copy-column approach for zero-downtime
-- This migration is Phase 1 of a multi-phase process.

-- Impact Analysis:
-- A bare RENAME COLUMN would be instant but would break all application code,
-- background jobs, and queries referencing 'email' simultaneously.
-- Instead, we add a new column and migrate gradually.

-- ============================================================
-- PHASE 1: Add new column and backfill (this migration)
-- ============================================================

BEGIN;

SET lock_timeout = '5s';

-- Step 1: Add new column (instant, no table rewrite)
ALTER TABLE users ADD COLUMN email_address varchar(255);

COMMIT;

-- Step 2: Backfill existing data in batches
-- Run outside transaction to avoid long-held locks.

UPDATE users SET email_address = email WHERE email_address IS NULL AND id BETWEEN 1 AND 50000;
UPDATE users SET email_address = email WHERE email_address IS NULL AND id BETWEEN 50001 AND 100000;
-- Continue in increments of 50,000 until all rows are backfilled.
-- Automated version:
--
-- DO $$
-- DECLARE
--   batch_start bigint := 1;
--   batch_size bigint := 50000;
--   max_id bigint;
-- BEGIN
--   SELECT max(id) INTO max_id FROM users;
--   WHILE batch_start <= max_id LOOP
--     UPDATE users
--       SET email_address = email
--       WHERE email_address IS NULL
--         AND id >= batch_start
--         AND id < batch_start + batch_size;
--     batch_start := batch_start + batch_size;
--     PERFORM pg_sleep(0.1);
--   END LOOP;
-- END $$;

-- Step 3: Add trigger for dual-write (keeps columns in sync during transition)
CREATE OR REPLACE FUNCTION sync_email_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      NEW.email_address := NEW.email;
    END IF;
    IF NEW.email_address IS DISTINCT FROM OLD.email_address THEN
      NEW.email := NEW.email_address;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_email_columns
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION sync_email_columns();

-- ============================================================
-- PHASE 2: Deploy application code changes (manual step)
-- ============================================================
-- 1. Update all application code to write to BOTH email and email_address
-- 2. Switch reads from email → email_address
-- 3. Deploy and verify

-- ============================================================
-- PHASE 3: Drop old column (separate migration, after soak period)
-- ============================================================
-- BEGIN;
-- SET lock_timeout = '5s';
-- DROP TRIGGER trg_sync_email_columns ON users;
-- DROP FUNCTION sync_email_columns();
-- ALTER TABLE users DROP COLUMN email;
-- COMMIT;

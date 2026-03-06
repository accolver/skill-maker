-- Migration: Rename email → email_address on users table (Phase 1)
-- Table: users (~5M rows, PostgreSQL 14)
-- Strategy: Dual-write for zero-downtime

-- IMPORTANT: Identify ALL consumers before starting:
-- - Application code (grep for 'email' in models, controllers, views)
-- - Background jobs (check job definitions referencing users.email)
-- - Reporting queries and dashboards
-- - External API contracts that expose the email field

BEGIN;
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN email_address varchar(255);
COMMIT;

-- Backfill in batches
DO $$
DECLARE
  batch_start bigint := 1;
  batch_size bigint := 50000;
  max_id bigint;
BEGIN
  SELECT max(id) INTO max_id FROM users;
  WHILE batch_start <= max_id LOOP
    UPDATE users SET email_address = email
      WHERE email_address IS NULL
        AND id >= batch_start AND id < batch_start + batch_size;
    batch_start := batch_start + batch_size;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Sync trigger for dual-write
CREATE OR REPLACE FUNCTION sync_email_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    NEW.email_address := NEW.email;
  END IF;
  IF NEW.email_address IS DISTINCT FROM OLD.email_address THEN
    NEW.email := NEW.email_address;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_email_columns
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION sync_email_columns();

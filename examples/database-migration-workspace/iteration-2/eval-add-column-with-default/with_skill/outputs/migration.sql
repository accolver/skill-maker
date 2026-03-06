-- Migration: Add status column to orders table
-- Table: orders (~50M rows, PostgreSQL 15)
-- Strategy: Three-step safe migration (add nullable → backfill → add constraint)
-- Lock Impact: ACCESS EXCLUSIVE lock for ALTER TABLE, but instant (no table rewrite
-- for nullable column addition). Backfill runs outside DDL transaction.

BEGIN;
SET lock_timeout = '5s';

-- Step 1: Add column as nullable (instant, no table rewrite)
ALTER TABLE orders ADD COLUMN status varchar(50);

COMMIT;

-- Step 2: Backfill in batches of 50,000 rows
-- Run outside a transaction to avoid long-held locks.
DO $$
DECLARE
  batch_start bigint := 1;
  batch_size bigint := 50000;
  max_id bigint;
BEGIN
  SELECT max(id) INTO max_id FROM orders;
  WHILE batch_start <= max_id LOOP
    UPDATE orders
      SET status = 'pending'
      WHERE status IS NULL
        AND id >= batch_start
        AND id < batch_start + batch_size;
    batch_start := batch_start + batch_size;
    PERFORM pg_sleep(0.1);
    RAISE NOTICE 'Backfilled up to id %', batch_start;
  END LOOP;
END $$;

-- Step 3: Add NOT NULL constraint and default
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
COMMIT;

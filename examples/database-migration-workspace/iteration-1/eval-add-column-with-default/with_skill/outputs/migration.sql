-- Migration: Add status column to orders table
-- Table: orders (~50M rows, PostgreSQL 15)
-- Strategy: Three-step safe migration (add nullable → backfill → add constraint)

-- Impact Analysis:
-- ACCESS EXCLUSIVE lock acquired for ALTER TABLE, but operation is instant
-- (adding a nullable column with no default does not rewrite the table).
-- Backfill runs outside the DDL transaction to avoid holding locks.

BEGIN;

SET lock_timeout = '5s';

-- Step 1: Add column as nullable (instant, no table rewrite)
ALTER TABLE orders ADD COLUMN status varchar(50);

COMMIT;

-- Step 2: Backfill in batches of 50,000 rows
-- Run these outside a transaction to avoid long-held locks.
-- Adjust batch size based on observed lock contention and replication lag.

UPDATE orders SET status = 'pending' WHERE status IS NULL AND id BETWEEN 1 AND 50000;
UPDATE orders SET status = 'pending' WHERE status IS NULL AND id BETWEEN 50001 AND 100000;
-- Continue in increments of 50,000 until all rows are backfilled.
-- For automation, use a loop:
--
-- DO $$
-- DECLARE
--   batch_start bigint := 1;
--   batch_size bigint := 50000;
--   max_id bigint;
-- BEGIN
--   SELECT max(id) INTO max_id FROM orders;
--   WHILE batch_start <= max_id LOOP
--     UPDATE orders
--       SET status = 'pending'
--       WHERE status IS NULL
--         AND id >= batch_start
--         AND id < batch_start + batch_size;
--     batch_start := batch_start + batch_size;
--     PERFORM pg_sleep(0.1);  -- Brief pause to reduce replication lag
--     RAISE NOTICE 'Backfilled up to id %', batch_start;
--   END LOOP;
-- END $$;

-- Step 3: Add NOT NULL constraint and default (after backfill is complete)
BEGIN;

SET lock_timeout = '5s';

ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

COMMIT;

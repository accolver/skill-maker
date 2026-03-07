-- Migration: Add status column to orders table
-- Table: orders (~50M rows, PostgreSQL 15)
-- Lock: ACCESS EXCLUSIVE (instant for nullable column add, no table rewrite)

BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ADD COLUMN status varchar(50);
COMMIT;

-- Backfill in batches (outside transaction)
DO $$
DECLARE
  batch_start bigint := 1;
  batch_size bigint := 50000;
  max_id bigint;
BEGIN
  SELECT max(id) INTO max_id FROM orders;
  WHILE batch_start <= max_id LOOP
    UPDATE orders SET status = 'pending'
      WHERE status IS NULL AND id >= batch_start AND id < batch_start + batch_size;
    batch_start := batch_start + batch_size;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Add constraint after backfill
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
COMMIT;

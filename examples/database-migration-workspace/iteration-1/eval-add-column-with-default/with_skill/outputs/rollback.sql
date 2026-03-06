-- Rollback: Remove status column from orders table
-- WARNING: This will permanently delete all data in the status column.
-- Ensure backup exists before running.

BEGIN;

SET lock_timeout = '5s';

-- Drop the default first, then the column
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders DROP COLUMN status;

COMMIT;

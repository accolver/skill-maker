-- Rollback: Remove status column from orders table
-- WARNING: This will permanently delete all data in the status column.
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders DROP COLUMN status;
COMMIT;

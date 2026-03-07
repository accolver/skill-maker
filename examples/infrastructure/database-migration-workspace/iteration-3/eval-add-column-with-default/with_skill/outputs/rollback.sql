-- Rollback: Remove status column
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders DROP COLUMN status;
COMMIT;

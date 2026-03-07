-- Rollback Phase 1
BEGIN;
SET lock_timeout = '5s';
DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;
DROP FUNCTION IF EXISTS sync_email_columns();
ALTER TABLE users DROP COLUMN IF EXISTS email_address;
COMMIT;

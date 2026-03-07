-- Rollback: Remove email_address column and sync trigger from users table
-- This reverses Phase 1 of the email → email_address migration.

BEGIN;

SET lock_timeout = '5s';

-- Remove the sync trigger first
DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;
DROP FUNCTION IF EXISTS sync_email_columns();

-- Drop the new column (original email column remains intact)
ALTER TABLE users DROP COLUMN IF EXISTS email_address;

COMMIT;

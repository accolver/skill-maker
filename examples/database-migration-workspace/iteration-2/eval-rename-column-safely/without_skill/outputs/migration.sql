-- Rename email to email_address
ALTER TABLE users RENAME COLUMN email TO email_address;

-- Update indexes
ALTER INDEX IF EXISTS idx_users_email RENAME TO idx_users_email_address;

-- Rename email column to email_address on users table

ALTER TABLE users RENAME COLUMN email TO email_address;

-- You'll need to update your application code to reference the new column name.
-- Also update any indexes that reference the old column name:
-- ALTER INDEX idx_users_email RENAME TO idx_users_email_address;

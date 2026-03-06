-- Add status column with default value
ALTER TABLE orders ADD COLUMN status varchar(50) NOT NULL DEFAULT 'pending';

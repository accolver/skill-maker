-- Add composite index on events table for query optimization

CREATE INDEX idx_events_customer_id_created_at ON events (customer_id, created_at);

-- This index will speed up queries that filter by customer_id and created_at.
-- The composite index supports queries filtering on customer_id alone,
-- or on both customer_id and created_at together.

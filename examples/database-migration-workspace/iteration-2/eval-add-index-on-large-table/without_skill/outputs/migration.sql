-- Add composite index for query optimization
CREATE INDEX idx_events_customer_id_created_at ON events (customer_id, created_at);

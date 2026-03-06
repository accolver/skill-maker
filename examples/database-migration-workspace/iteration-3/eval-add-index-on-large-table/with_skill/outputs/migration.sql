-- Add index on events(customer_id, created_at) — CONCURRENTLY
-- Lock: SHARE UPDATE EXCLUSIVE (non-blocking)
-- Duration: ~30-60 min on 100M rows
-- Write overhead: ~5-15% insert latency after build
-- CANNOT run inside a transaction block

SET statement_timeout = '120min';
CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at ON events (customer_id, created_at);
RESET statement_timeout;

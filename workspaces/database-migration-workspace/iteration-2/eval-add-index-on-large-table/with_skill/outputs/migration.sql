-- Migration: Add composite index on events(customer_id, created_at)
-- Table: events (~100M rows, ~5,000 inserts/sec peak, PostgreSQL 16)
-- Lock: SHARE UPDATE EXCLUSIVE (non-blocking, allows concurrent reads/writes)
-- Estimated duration: 30-60 minutes on 100M rows
-- Write impact: ~5-15% insert latency overhead after index built

-- CONCURRENTLY cannot run inside a transaction block
SET statement_timeout = '120min';

CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
  ON events (customer_id, created_at);

RESET statement_timeout;

-- Rollback: Drop the composite index on events table
-- Uses CONCURRENTLY to avoid blocking writes during drop.
-- Cannot run inside a transaction block.

DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;

-- Rollback: Drop composite index
DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;

-- Migration: Add composite index on (customer_id, created_at) to events table
-- Table: events (~100M rows, ~5,000 inserts/sec peak, PostgreSQL 16)
-- Strategy: CREATE INDEX CONCURRENTLY to avoid blocking writes

-- Impact Analysis:
-- Regular CREATE INDEX acquires a SHARE lock, blocking all writes for the
-- duration of the index build (potentially 20-40 minutes on 100M rows).
-- CREATE INDEX CONCURRENTLY acquires only a SHARE UPDATE EXCLUSIVE lock,
-- which allows concurrent reads AND writes. It takes longer (estimated
-- 30-60 minutes on 100M rows) but does not block production traffic.
--
-- Write performance impact: After index creation, each INSERT must also
-- update the new index. For a B-tree on (customer_id, created_at), expect
-- ~5-15% overhead on insert latency. At 5,000 inserts/sec this is
-- typically negligible but should be monitored.
--
-- IMPORTANT: CONCURRENTLY cannot run inside a transaction block.
-- Do NOT wrap this in BEGIN/COMMIT.

-- Step 1: Set a statement timeout to prevent runaway builds
SET statement_timeout = '120min';

-- Step 2: Create the index concurrently
CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
  ON events (customer_id, created_at);

-- Reset timeout
RESET statement_timeout;

-- Note: If the index build fails or is cancelled, it will leave an INVALID
-- index behind. Check with:
--   SELECT indexrelid::regclass, indisvalid
--   FROM pg_index WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;
--
-- If invalid, drop it and retry:
--   DROP INDEX CONCURRENTLY idx_events_customer_id_created_at;

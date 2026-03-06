# Migration Runbook: Add composite index on `events(customer_id, created_at)`

## Summary

- **Table**: `events` (~100M rows, ~5,000 inserts/sec peak)
- **Change**: Add composite B-tree index on (customer_id, created_at)
- **Strategy**: CREATE INDEX CONCURRENTLY (non-blocking)
- **Lock Impact**: SHARE UPDATE EXCLUSIVE lock — allows concurrent reads and
  writes. Does NOT block production traffic.
- **Estimated Duration**: 30-60 minutes for 100M rows (depends on I/O, CPU, and
  concurrent load)
- **Write Impact**: ~5-15% insert latency overhead after index is built

## Pre-flight

- [ ] Confirm sufficient disk space (~2-3x index size, estimated 3-8 GB for 100M
      rows)
- [ ] Schedule during off-peak hours (recommended: lowest traffic window)
- [ ] Verify no other long-running transactions that could block CONCURRENTLY
- [ ] Monitoring dashboards open (insert latency, disk I/O, replication lag)
- [ ] Backup not strictly required (index creation is non-destructive) but
      verify recent backup exists

## Backup Commands

```sql
-- Index creation is non-destructive (no data changes), but verify a recent
-- backup exists in case of broader issues:
-- pg_dump --format=custom -f events_backup_20260306.dump -t events mydb

-- Verify table row count for post-migration comparison:
SELECT count(*) FROM events;
-- Record this number: ___________
```

## Execute

### Step 1: Verify no conflicting transactions

```sql
-- Check for long-running transactions that could block CONCURRENTLY
SELECT pid, now() - xact_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND xact_start < now() - interval '5 minutes';
```

### Step 2: Create the index

```sql
-- IMPORTANT: Do NOT wrap in BEGIN/COMMIT — CONCURRENTLY cannot run in a transaction
SET statement_timeout = '120min';

CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at
  ON events (customer_id, created_at);

RESET statement_timeout;
```

**Monitor during build**:

```sql
-- Check progress (PostgreSQL 12+)
SELECT phase, blocks_total, blocks_done,
       round(100.0 * blocks_done / NULLIF(blocks_total, 0), 1) AS pct_done
FROM pg_stat_progress_create_index;
```

### Step 3: Verify index is valid

```sql
-- Check index exists and is valid
SELECT indexrelid::regclass AS index_name, indisvalid
FROM pg_index
WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;
-- Expected: idx_events_customer_id_created_at | true

-- Check index size
SELECT pg_size_pretty(pg_relation_size('idx_events_customer_id_created_at'));

-- Verify the index is being used by the target query
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM events
WHERE customer_id = 12345
  AND created_at > now() - interval '30 days';
-- Should show: Index Scan using idx_events_customer_id_created_at
```

### Step 4: Monitor write performance

```sql
-- Check insert latency hasn't degraded significantly
-- Compare with pre-migration baseline
SELECT count(*) FROM events WHERE created_at > now() - interval '5 minutes';
```

- Watch insert latency for 15 minutes
- Acceptable overhead: up to 15% increase in insert latency
- If overhead exceeds 20%, consider dropping the index and investigating

## Rollback (if needed)

```sql
-- Drop the index without blocking writes
DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;
```

**If index is in INVALID state** (from a failed build):

```sql
-- Must drop the invalid index before retrying
DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;
```

**Verify rollback**:

```sql
SELECT indexrelid::regclass FROM pg_index
WHERE indexrelid::regclass::text = 'idx_events_customer_id_created_at';
-- Expected: 0 rows
```

## Post-migration

- [ ] Verify query performance improvement on target queries
- [ ] Monitor insert latency for 24 hours
- [ ] Update query documentation to note the new index
- [ ] Close migration ticket

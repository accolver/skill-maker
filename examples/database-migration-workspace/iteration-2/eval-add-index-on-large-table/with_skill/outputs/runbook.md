# Migration Runbook: Add index on events(customer_id, created_at)

## Summary

- **Table**: events (~100M rows, ~5,000 inserts/sec peak)
- **Lock**: SHARE UPDATE EXCLUSIVE (non-blocking)
- **Duration**: 30-60 minutes estimated
- **Write impact**: ~5-15% insert latency overhead

## Pre-flight

- [ ] Sufficient disk space (~3-8 GB for index)
- [ ] Schedule during off-peak hours (check traffic patterns:
      `SELECT date_trunc('hour', created_at), count(*) FROM events WHERE created_at > now() - interval '7 days' GROUP BY 1 ORDER BY 2 ASC LIMIT 5;`)
- [ ] No long-running transactions blocking CONCURRENTLY
- [ ] Monitoring dashboards open

## Execute

```sql
SET statement_timeout = '120min';
CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at ON events (customer_id, created_at);
RESET statement_timeout;
```

Monitor progress:

```sql
SELECT phase, blocks_total, blocks_done,
       round(100.0 * blocks_done / NULLIF(blocks_total, 0), 1) AS pct_done
FROM pg_stat_progress_create_index;
```

## Verify

```sql
SELECT indexrelid::regclass, indisvalid FROM pg_index
WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;
-- Expected: true

SELECT pg_size_pretty(pg_relation_size('idx_events_customer_id_created_at'));
```

## Rollback

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;
```

## Post-migration

- [ ] Monitor insert latency for 24 hours
- [ ] Verify query plans use new index

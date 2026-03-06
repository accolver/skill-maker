# Runbook: Add index on events(customer_id, created_at)

## Pre-flight

- [ ] Disk space: ~3-8 GB needed
- [ ] Off-peak:
      `SELECT date_trunc('hour', created_at), count(*) FROM events WHERE created_at > now()-'7d'::interval GROUP BY 1 ORDER BY 2 LIMIT 5;`
- [ ] No blocking long transactions

## Execute

```sql
SET statement_timeout = '120min';
CREATE INDEX CONCURRENTLY idx_events_customer_id_created_at ON events (customer_id, created_at);
RESET statement_timeout;
```

## Verify

```sql
SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE indexrelid = 'idx_events_customer_id_created_at'::regclass;
```

## Rollback

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_events_customer_id_created_at;
```

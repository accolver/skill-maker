# Migration Runbook: Add `status` column to `orders` table

## Summary

- **Table**: `orders` (~50M rows)
- **Change**: Add non-nullable `status` column (varchar(50), default 'pending')
- **Strategy**: Three-step — add nullable → batch backfill → add NOT NULL
  constraint
- **Lock Impact**: ACCESS EXCLUSIVE lock for ALTER TABLE (instant). Backfill
  holds no DDL locks.

## Pre-flight

- [ ] Backup executed and verified
- [ ] Check for long-running transactions that could block ALTER TABLE:
  ```sql
  SELECT pid, now() - xact_start AS duration, query
  FROM pg_stat_activity
  WHERE state = 'active' AND xact_start < now() - interval '5 minutes';
  ```
- [ ] Confirmed off-peak deployment window
- [ ] `lock_timeout` set to 5s
- [ ] Monitoring dashboards open (error rates, query latency, replication lag)

## Backup Commands

```sql
CREATE TABLE orders_pre_status_backup_20260306 AS SELECT id FROM orders;
SELECT (SELECT count(*) FROM orders) AS original,
       (SELECT count(*) FROM orders_pre_status_backup_20260306) AS backup;
```

## Execute

1. Run Step 1 from migration.sql (add nullable column)
2. Verify column exists:
   `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='orders' AND column_name='status';`
3. Run Step 2 (backfill) — monitor replication lag between batches
4. Verify backfill: `SELECT count(*) FROM orders WHERE status IS NULL;`
   (expect 0)
5. Run Step 3 (add NOT NULL + default)
6. Verify:
   `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name='orders' AND column_name='status';`
7. Monitor error rates for 15 minutes

## Rollback

```sql
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders DROP COLUMN status;
COMMIT;
```

## Post-migration

- [ ] Remove NULL-handling transition code
- [ ] Drop backup table after 7-day soak
- [ ] Close migration ticket

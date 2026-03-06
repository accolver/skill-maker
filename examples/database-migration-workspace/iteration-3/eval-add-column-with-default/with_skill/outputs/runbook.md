# Migration Runbook: Add `status` to `orders`

## Pre-flight

- [ ] Backup verified
- [ ] No blocking transactions:
      `SELECT pid, now()-xact_start FROM pg_stat_activity WHERE state='active' AND xact_start < now()-interval '5 min';`
- [ ] Off-peak confirmed
- [ ] lock_timeout = 5s

## Backup

```sql
CREATE TABLE orders_backup_20260306 AS SELECT id FROM orders;
```

## Execute

1. Add nullable column → verify with information_schema
2. Backfill in 50k batches → monitor replication lag
3. Add NOT NULL + default → verify constraints

## Verification

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_name='orders' AND column_name='status';
```

## Rollback

```sql
BEGIN; SET lock_timeout='5s';
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders DROP COLUMN status;
COMMIT;
```

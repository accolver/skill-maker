# Migration Runbook: Add `status` column to `orders` table

## Summary

- **Table**: `orders` (~50M rows)
- **Change**: Add non-nullable `status` column (varchar(50), default 'pending')
- **Strategy**: Three-step — add nullable column → batch backfill → add NOT NULL
  constraint
- **Lock Impact**: ACCESS EXCLUSIVE lock for ALTER TABLE, but instant (no table
  rewrite). Backfill runs without holding DDL locks.
- **Estimated Duration**: ALTER TABLE instant; backfill ~15-30 minutes depending
  on I/O; constraint addition instant after backfill.

## Pre-flight

- [ ] Backup executed and verified (see backup commands below)
- [ ] Confirmed off-peak deployment window
- [ ] Application code ready to handle NULL status values during backfill
- [ ] `lock_timeout` will be set to 5s to fail fast if locks can't be acquired
- [ ] Monitoring dashboards open (error rates, query latency, replication lag)

## Backup Commands

```sql
-- Option 1: Lightweight backup of orders table IDs (for verification)
CREATE TABLE orders_pre_status_backup_20260306 AS
  SELECT id FROM orders;

-- Verify backup count matches
SELECT
  (SELECT count(*) FROM orders) AS original,
  (SELECT count(*) FROM orders_pre_status_backup_20260306) AS backup;

-- Option 2: Full table backup (if disk space allows — ~50M rows is large)
-- pg_dump -t orders --format=custom -f orders_backup_20260306.dump mydb
```

## Execute

### Step 1: Add nullable column (instant)

```sql
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ADD COLUMN status varchar(50);
COMMIT;
```

**Verify**: Column exists and is nullable:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: status | character varying | YES | NULL
```

### Step 2: Backfill in batches

Run the backfill script (outside a transaction):

```sql
-- Batch size: 50,000 rows. Adjust based on replication lag.
UPDATE orders SET status = 'pending' WHERE status IS NULL AND id BETWEEN 1 AND 50000;
-- Continue in increments...
```

**Monitor**: Check replication lag between batches. Pause if lag exceeds 30s.

**Verify progress**:

```sql
SELECT count(*) FROM orders WHERE status IS NULL;
-- Should decrease toward 0
```

### Step 3: Add NOT NULL constraint

```sql
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
COMMIT;
```

**Verify**: Column is NOT NULL with default:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: status | character varying | NO | 'pending'::character varying
```

### Step 4: Monitor

- Watch error rates for 15 minutes
- Check query latency on orders table
- Verify new inserts get default 'pending' status

## Rollback (if needed)

```sql
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders DROP COLUMN status;
COMMIT;
```

**Verify rollback**:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';
-- Expected: 0 rows (column gone)
```

## Post-migration

- [ ] Remove any NULL-handling code added for the transition period
- [ ] Update application documentation
- [ ] Drop backup table after soak period (7 days recommended)
- [ ] Close migration ticket

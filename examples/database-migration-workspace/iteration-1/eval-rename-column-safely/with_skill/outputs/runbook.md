# Migration Runbook: Rename `email` → `email_address` on `users` table

## Summary

- **Table**: `users` (~5M rows)
- **Change**: Rename `email` column to `email_address` using dual-write strategy
- **Strategy**: Multi-phase — add column → backfill → dual-write trigger →
  deploy app changes → drop old column
- **Lock Impact**: ACCESS EXCLUSIVE for ALTER TABLE (instant). Backfill runs
  without DDL locks.
- **Zero-Downtime**: Yes — both columns coexist during the entire transition
  period.

## Pre-flight

- [ ] Backup executed and verified
- [ ] Application code changes prepared (dual-write, then switch reads)
- [ ] Background jobs identified that reference `email` column
- [ ] Off-peak deployment window confirmed
- [ ] Monitoring dashboards open

## Backup Commands

```sql
-- Backup email column data
CREATE TABLE users_email_backup_20260306 AS
  SELECT id, email FROM users;

-- Verify backup
SELECT
  (SELECT count(*) FROM users) AS original,
  (SELECT count(*) FROM users_email_backup_20260306) AS backup;
```

## Execute

### Phase 1: Add column, backfill, and create sync trigger

```sql
-- Add new column
BEGIN;
SET lock_timeout = '5s';
ALTER TABLE users ADD COLUMN email_address varchar(255);
COMMIT;

-- Backfill in batches
UPDATE users SET email_address = email WHERE email_address IS NULL AND id BETWEEN 1 AND 50000;
-- ... continue in batches of 50,000
```

**Verify backfill complete**:

```sql
SELECT count(*) FROM users WHERE email_address IS NULL;
-- Expected: 0

SELECT count(*) FROM users WHERE email != email_address;
-- Expected: 0 (all values match)
```

Create the sync trigger:

```sql
-- See migration.sql for trigger definition
```

### Phase 2: Deploy application code changes

1. Deploy code that writes to BOTH `email` and `email_address`
2. Verify dual-write is working:

```sql
-- Insert a test row and verify both columns are populated
SELECT email, email_address FROM users ORDER BY id DESC LIMIT 5;
```

3. Switch reads from `email` → `email_address`
4. Monitor error rates for 24 hours

### Phase 3: Drop old column (separate migration, after soak period)

```sql
BEGIN;
SET lock_timeout = '5s';
DROP TRIGGER trg_sync_email_columns ON users;
DROP FUNCTION sync_email_columns();
ALTER TABLE users DROP COLUMN email;
COMMIT;
```

## Rollback (if needed)

### Rollback Phase 1 (before app code deployed):

```sql
BEGIN;
SET lock_timeout = '5s';
DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;
DROP FUNCTION IF EXISTS sync_email_columns();
ALTER TABLE users DROP COLUMN IF EXISTS email_address;
COMMIT;
```

**Verify rollback**:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email_address';
-- Expected: 0 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email';
-- Expected: 1 row (original column intact)
```

### Rollback Phase 3 (if old column was dropped):

Restore from backup:

```sql
ALTER TABLE users ADD COLUMN email varchar(255);
UPDATE users u SET email = b.email
  FROM users_email_backup_20260306 b
  WHERE u.id = b.id;
```

## Post-migration

- [ ] Drop backup table after 7-day soak period
- [ ] Remove dual-write code from application
- [ ] Update all background jobs to use `email_address`
- [ ] Update documentation and API schemas
- [ ] Close migration ticket

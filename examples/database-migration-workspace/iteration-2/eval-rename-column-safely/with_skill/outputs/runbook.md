# Migration Runbook: Rename `email` → `email_address` on `users`

## Summary

- **Table**: `users` (~5M rows)
- **Strategy**: Dual-write (add → backfill → sync trigger → deploy app → drop
  old)
- **Zero-Downtime**: Yes

## Pre-flight

- [ ] Backup executed
- [ ] Identified ALL consumers: app code, background jobs, reporting queries,
      API contracts
- [ ] Application code changes prepared for dual-write
- [ ] Off-peak window confirmed

## Backup

```sql
CREATE TABLE users_email_backup_20260306 AS SELECT id, email FROM users;
SELECT (SELECT count(*) FROM users) AS original,
       (SELECT count(*) FROM users_email_backup_20260306) AS backup;
```

## Phase 1: Add column + backfill + trigger

Run migration.sql. Verify:

```sql
SELECT count(*) FROM users WHERE email_address IS NULL; -- expect 0
SELECT count(*) FROM users WHERE email != email_address; -- expect 0
```

## Phase 2: Deploy app changes

1. Deploy code writing to BOTH email and email_address
2. Switch reads to email_address
3. Update background jobs to use email_address
4. Monitor for 24 hours

## Phase 3: Drop old column (separate migration)

```sql
BEGIN;
DROP TRIGGER trg_sync_email_columns ON users;
DROP FUNCTION sync_email_columns();
ALTER TABLE users DROP COLUMN email;
COMMIT;
```

## Rollback

```sql
BEGIN;
DROP TRIGGER IF EXISTS trg_sync_email_columns ON users;
DROP FUNCTION IF EXISTS sync_email_columns();
ALTER TABLE users DROP COLUMN IF EXISTS email_address;
COMMIT;
```

## Post-migration

- [ ] Drop backup after 7-day soak
- [ ] Remove dual-write code
- [ ] Update docs and API schemas

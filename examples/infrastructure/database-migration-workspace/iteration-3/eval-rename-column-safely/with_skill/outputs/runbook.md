# Runbook: Rename email → email_address

## Pre-flight

- [ ] Backup: `CREATE TABLE users_email_backup AS SELECT id, email FROM users;`
- [ ] All consumers identified (app, jobs, reports, APIs)
- [ ] App code changes ready for dual-write

## Execute Phase 1

Run migration.sql → verify:
`SELECT count(*) FROM users WHERE email_address IS NULL;` (expect 0)

## Execute Phase 2

Deploy app writing to both columns → switch reads → monitor 24h

## Execute Phase 3 (later)

Drop old column: `ALTER TABLE users DROP COLUMN email;`

## Rollback

```sql
DROP TRIGGER IF EXISTS trg_sync_email ON users;
DROP FUNCTION IF EXISTS sync_email_columns();
ALTER TABLE users DROP COLUMN IF EXISTS email_address;
```

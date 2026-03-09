---
name: database-migration
description: >-
  Generate safe, reversible database migration files with rollback plans, lock impact analysis, data backup commands, verification queries, and deployment runbooks. Use when writing ALTER TABLE, CREATE INDEX, adding/removing/renaming columns, changing constraints, or any schema change that touches production data. Also use when reviewing existing migrations for safety.
version: 0.1.0
---

# Database Migration Safety

Write production-safe database migrations that won't cause downtime, data loss,
or irreversible damage. Every migration ships with a rollback plan because **if
you can't reverse it safely, don't ship it.**

## Workflow

Follow these steps for every migration. Skip nothing — the steps you skip are
the ones that cause outages.

### 1. Classify the change

Determine the risk tier before writing any SQL:

| Tier       | Description                                      | Examples                                        | Review needed                |
| ---------- | ------------------------------------------------ | ----------------------------------------------- | ---------------------------- |
| **Low**    | Additive, no locks on existing data              | Add nullable column, create new table           | Self-review                  |
| **Medium** | Brief locks or backfills needed                  | Add index, add constraint, small backfill       | Peer review                  |
| **High**   | Long locks, data transformation, or irreversible | Rename/drop column, change type, large backfill | Team review + staged rollout |

### 2. Write the UP migration

Follow the safe patterns in the Quick Reference below. Key principles:

- **Add columns as nullable first** — adding a `NOT NULL` column without a
  default takes an `ACCESS EXCLUSIVE` lock while it rewrites the entire table.
  Add nullable, backfill, then add the constraint.
- **Create indexes concurrently** — `CREATE INDEX` takes a `SHARE` lock that
  blocks all writes. Use `CREATE INDEX CONCURRENTLY` to avoid this (it takes
  longer but doesn't block).
- **Never rename columns directly** — a column rename breaks all running
  application code instantly. Use the dual-write strategy instead.
- **Batch large backfills** — updating millions of rows in one transaction holds
  locks and bloats WAL. Process in batches of 1,000–10,000 rows with brief
  pauses.

### 3. Write the DOWN migration (rollback)

Every UP gets a corresponding DOWN. The rollback must:

- Reverse the schema change completely
- Not lose data that was written after the UP ran
- Be tested before the UP is deployed

If a migration is truly irreversible (e.g., dropping a column with data),
document this explicitly and add a data backup step.

### 4. Analyze lock impact

For every `ALTER TABLE` statement, document which lock it acquires and how long
it holds it. Use this reference:

| Operation                           | Lock type                                        | Blocks reads?  | Blocks writes? | Duration                             |
| ----------------------------------- | ------------------------------------------------ | -------------- | -------------- | ------------------------------------ |
| Add nullable column                 | `ACCESS EXCLUSIVE`                               | Yes            | Yes            | Instant (metadata only)              |
| Add column with DEFAULT (PG 11+)    | `ACCESS EXCLUSIVE`                               | Yes            | Yes            | Instant (metadata only)              |
| Add NOT NULL column without default | `ACCESS EXCLUSIVE`                               | Yes            | Yes            | **Full table rewrite**               |
| Drop column                         | `ACCESS EXCLUSIVE`                               | Yes            | Yes            | Instant (metadata only)              |
| Add index                           | `SHARE`                                          | No             | **Yes**        | Proportional to table size           |
| Add index concurrently              | `SHARE UPDATE EXCLUSIVE`                         | No             | No             | Proportional to table size           |
| Add foreign key constraint          | `SHARE ROW EXCLUSIVE`                            | No             | **Yes**        | **Full table scan for validation**   |
| Add CHECK constraint                | `ACCESS EXCLUSIVE`                               | Yes            | Yes            | **Full table scan**                  |
| Add CHECK NOT VALID + VALIDATE      | `ACCESS EXCLUSIVE` then `SHARE UPDATE EXCLUSIVE` | Brief, then no | Brief, then no | Instant + full scan without blocking |

### 5. Write verification queries

Create queries that confirm the migration succeeded. Run these after UP and
after DOWN:

```sql
-- After UP: verify the new column exists and has expected properties
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'target_table' AND column_name = 'new_column';

-- After UP: verify data backfill completed (no nulls remaining)
SELECT COUNT(*) FROM target_table WHERE new_column IS NULL;

-- After UP: verify index exists and is valid
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'target_table' AND indexname = 'idx_target_new_column';

-- Check for invalid indexes (failed CONCURRENTLY builds)
SELECT indexrelid::regclass, indisvalid
FROM pg_index WHERE NOT indisvalid;
```

### 6. Write data backup commands

Before any destructive operation, include backup commands:

```bash
# Backup the specific table before migration
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -t target_table --data-only -F c \
  -f "backup_target_table_$(date +%Y%m%d_%H%M%S).dump"

# For column drops: backup just the column data
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "\COPY (SELECT id, column_to_drop FROM target_table) TO 'column_backup.csv' CSV HEADER"
```

### 7. Assemble the deployment runbook

Produce a runbook with these sections:

```markdown
## Migration: [description]

**Risk tier:** [Low/Medium/High] **Estimated duration:** [time] **Rollback
time:** [time]

### Pre-deployment checklist

- [ ] Backup taken and verified
- [ ] Migration tested on staging with production-scale data
- [ ] Rollback tested on staging
- [ ] Lock impact reviewed — no long-held exclusive locks on hot tables
- [ ] Application code deployed that handles both old and new schema
- [ ] Monitoring dashboards open (query latency, lock waits, error rates)

### Execution steps

1. [Ordered steps with exact commands]

### Verification

1. [Verification queries with expected results]

### Rollback procedure

1. [Exact rollback steps if something goes wrong]

### Post-deployment

- [ ] Remove old-schema compatibility code (after bake period)
- [ ] Update documentation
- [ ] Clean up temporary columns/tables (if dual-write)
```

## Safe Patterns

### Adding a NOT NULL column

Never do this:

```sql
-- DANGEROUS: acquires ACCESS EXCLUSIVE lock for full table rewrite
ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
-- On PG 11+ the DEFAULT is instant, but if you need to backfill
-- existing rows with non-default values, you still have a problem.
```

Do this instead (3-migration sequence):

```sql
-- Migration 1: Add nullable column (instant, minimal lock)
ALTER TABLE orders ADD COLUMN status TEXT;

-- Migration 2: Backfill in batches (no schema lock)
-- Run as a script, not a migration, because it may take hours on large tables
DO $$
DECLARE
  batch_size INT := 5000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE orders
    SET status = 'pending'
    WHERE id IN (
      SELECT id FROM orders
      WHERE status IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    PERFORM pg_sleep(0.1);  -- Brief pause to reduce load
    RAISE NOTICE 'Updated % rows', rows_updated;
  END LOOP;
END $$;

-- Migration 3: Add NOT NULL constraint without full lock (PG 12+)
ALTER TABLE orders ADD CONSTRAINT orders_status_not_null
  CHECK (status IS NOT NULL) NOT VALID;
-- Then validate separately (takes SHARE UPDATE EXCLUSIVE, not ACCESS EXCLUSIVE)
ALTER TABLE orders VALIDATE CONSTRAINT orders_status_not_null;
-- Optionally convert to true NOT NULL after validation:
-- ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
-- (This is instant if a valid CHECK constraint already exists on PG 12+)
```

**Rollback for each step:**

```sql
-- Rollback Migration 3:
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_not_null;
-- Rollback Migration 2: (no-op, nulls are acceptable)
-- Rollback Migration 1:
ALTER TABLE orders DROP COLUMN IF EXISTS status;
```

### Renaming a column (dual-write strategy)

Never rename directly — it breaks all running queries instantly. Use a 4-phase
approach:

```sql
-- Phase 1: Add new column
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Phase 2: Deploy app code that writes to BOTH old and new columns
-- Backfill existing data:
UPDATE users SET display_name = username WHERE display_name IS NULL;
-- (batch this for large tables)

-- Phase 3: Switch reads to new column, keep dual-write
-- Deploy app code that reads from display_name

-- Phase 4: Drop old column (after bake period)
ALTER TABLE users DROP COLUMN username;
```

Each phase is a separate deployment with its own migration and rollback.

### Creating an index on a large table

```sql
-- WRONG: blocks all writes for the duration of index creation
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- RIGHT: doesn't block writes (but takes longer and can fail)
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders(customer_id);
```

**Important:** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction
block. Most migration frameworks wrap each migration in a transaction — you must
disable this for concurrent index creation. In Rails:
`disable_ddl_transaction!`. In Django: set `atomic = False` on the migration.

After creating an index concurrently, always verify it's valid:

```sql
SELECT indexrelid::regclass, indisvalid FROM pg_index
WHERE indexrelid = 'idx_orders_customer'::regclass;
```

If `indisvalid` is `false`, drop the invalid index and retry.

### Adding a foreign key constraint

```sql
-- WRONG: validates all existing rows while holding SHARE ROW EXCLUSIVE lock
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id);

-- RIGHT: add without validation, then validate separately
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id) NOT VALID;
-- Validation takes a weaker lock and doesn't block writes
ALTER TABLE orders VALIDATE CONSTRAINT fk_orders_customer;
```

## Common Mistakes

| Mistake                                                      | Why it fails                                                       | Fix                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| Adding NOT NULL without default on large table               | Full table rewrite under ACCESS EXCLUSIVE lock — blocks everything | Add nullable → backfill → add CHECK NOT VALID → validate   |
| `CREATE INDEX` without `CONCURRENTLY`                        | Blocks all writes for minutes/hours on large tables                | Always use `CONCURRENTLY` and disable transaction wrapping |
| Renaming a column in one step                                | Every query using the old name fails instantly                     | Use dual-write: add new → copy → switch reads → drop old   |
| Backfilling millions of rows in one UPDATE                   | Holds row locks, bloats WAL, can cause OOM on replicas             | Batch in 1,000–10,000 rows with `pg_sleep` pauses          |
| No rollback migration                                        | When the deploy fails at 2 AM, you have no recovery path           | Write and test DOWN for every UP                           |
| Running `DROP COLUMN` without data backup                    | Data is gone permanently — no undo                                 | Always `pg_dump` or `\COPY` the column data first          |
| Forgetting to verify index validity                          | `CONCURRENTLY` can silently fail, leaving an invalid index         | Always check `pg_index.indisvalid` after concurrent builds |
| Adding CHECK constraint without NOT VALID                    | Full table scan under ACCESS EXCLUSIVE lock                        | Use `NOT VALID` then `VALIDATE CONSTRAINT` separately      |
| Testing migrations on empty tables                           | Locks and performance issues only appear at scale                  | Test on staging with production-scale data volume          |
| Deploying schema change before app code handles both schemas | Brief window where app expects old schema but gets new             | Deploy backward-compatible app code first, then migrate    |

## Output Format

When generating a migration, produce these files:

1. **`up.sql`** — The forward migration SQL
2. **`down.sql`** — The rollback SQL
3. **`verify.sql`** — Verification queries with expected results
4. **`runbook.md`** — Deployment runbook following the template in Step 7
5. **`backup.sh`** — Data backup commands (for Medium/High tier changes)

For multi-step migrations (like the NOT NULL pattern), number them:
`001_add_column_up.sql`, `001_add_column_down.sql`, `002_backfill.sql`,
`003_add_constraint_up.sql`, etc.

## Summary

Fixes a race condition in the job queue processor where two workers could
acquire the same job simultaneously, causing duplicate processing. This was
causing duplicate customer emails and affects payment processing jobs.

## Motivation

Three customers reported receiving duplicate emails this week (SUPPORT-891,
SUPPORT-894, SUPPORT-897). Investigation revealed a race condition in
`acquireJob`: it reads the job status with a SELECT, then updates it with a
separate UPDATE. Between these two queries, another worker can read the same
"pending" status and acquire the same job.

This is a data integrity issue — the same race condition affects payment
processing jobs, where duplicate processing could result in double charges.

## Changes

- **Atomic job acquisition** (`src/workers/job-processor.ts`): Replaced the
  two-step SELECT + UPDATE with a single
  `UPDATE...RETURNING WHERE status='pending'` query. This is atomic at the
  database level — only one worker can successfully update a pending job. Added
  a UUID-based processing lock as a secondary safeguard.
- **Regression tests** (`tests/workers/job-processor.test.ts`): 8 new tests
  including a concurrent acquisition stress test that spawns 10 workers
  competing for the same job and verifies exactly one acquires it.

## Testing Instructions

1. Run the new regression tests:
   ```bash
   npm test -- tests/workers/job-processor.test.ts
   ```
2. Verify all 8 tests pass, paying special attention to:
   - `"should acquire job atomically when multiple workers compete"`
   - `"should not process the same job twice under concurrent load"`
3. Run the full test suite to verify no regressions: `npm test`
4. Manual verification in staging:
   ```bash
   # Insert a test job
   psql -c "INSERT INTO jobs (type, status, payload) VALUES ('email', 'pending', '{\"to\": \"test@example.com\"}')"
   # Start 3 workers simultaneously
   for i in 1 2 3; do node src/workers/start.js & done
   # Wait and check
   sleep 5 && psql -c "SELECT id, status, processed_by, processed_at FROM jobs ORDER BY id DESC LIMIT 1"
   # Verify exactly one worker processed the job
   ```

### Automated Tests

- `job-processor.test.ts`: Atomic acquisition, concurrent worker stress test,
  UUID lock uniqueness, idempotent processing, status transitions, error
  recovery

## Rollback Plan

1. Revert this PR: `git revert <merge-sha>`
2. No database migrations to reverse — purely application-level
3. **Risk of reverting**: Race condition returns. Mitigate by temporarily
   reducing worker concurrency to 1 until a new fix is deployed.
4. No data cleanup needed

## Reviewer Notes

- **`src/workers/job-processor.ts:23-31`** (atomic query): Core fix — verify
  `UPDATE...RETURNING WHERE status='pending'` is correct and PostgreSQL
  guarantees atomicity via row-level locking.
- **Payment processing**: Same `acquireJob` function handles payment jobs.
  Verify no payment-specific code paths bypass `acquireJob`.
- **UUID lock** (`job-processor.ts:35`): Belt-and-suspenders safeguard. The
  atomic UPDATE is primary protection; the lock prevents reprocessing if a
  worker crashes mid-job.

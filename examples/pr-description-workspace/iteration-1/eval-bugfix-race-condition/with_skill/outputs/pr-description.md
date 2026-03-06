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

This is a data integrity issue, not just a UX annoyance — the same race
condition affects payment processing jobs, where duplicate processing could
result in double charges.

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

1. Run the new test suite: `npm test -- tests/workers/job-processor.test.ts`
2. Verify all 8 tests pass, paying special attention to:
   - `"should acquire job atomically when multiple workers compete"` — this is
     the core regression test
   - `"should not process the same job twice under concurrent load"` — stress
     test with 10 workers
3. Run the full test suite to verify no regressions: `npm test`
4. To verify manually in staging:
   ```bash
   # Insert a test job
   psql -c "INSERT INTO jobs (type, status, payload) VALUES ('email', 'pending', '{\"to\": \"test@example.com\"}')"
   # Start 3 workers simultaneously
   for i in 1 2 3; do node src/workers/start.js & done
   # Wait 5 seconds, then check processing count
   sleep 5 && psql -c "SELECT id, status, processed_by, processed_at FROM jobs ORDER BY id DESC LIMIT 1"
   # Verify exactly one worker processed the job (one row with status='completed')
   ```

### Automated Tests

- `job-processor.test.ts`: Atomic acquisition, concurrent worker stress test (10
  workers), UUID lock uniqueness, idempotent processing verification, status
  transition validation, error recovery after failed acquisition

## Rollback Plan

1. Revert this PR: `git revert <merge-sha>`
2. No database migrations to reverse — the fix is purely application-level
3. **Risk of reverting**: The race condition will return. If reverted, consider
   temporarily reducing worker concurrency to 1 as a mitigation until a new fix
   is deployed.
4. No data cleanup needed — duplicate processing from the old code has already
   been addressed by the support team

## Reviewer Notes

- **`src/workers/job-processor.ts:23-31`** (atomic query): This is the core fix.
  Verify the `UPDATE...RETURNING WHERE status='pending'` query is correct and
  that the database engine guarantees atomicity for this pattern (PostgreSQL
  does via row-level locking).
- **Payment processing impact**: The same `acquireJob` function is used for
  payment jobs. This fix prevents duplicate payment processing, but please
  verify there are no payment-specific code paths that bypass `acquireJob`.
- **UUID lock** (`job-processor.ts:35`): The UUID lock is a belt-and-suspenders
  safeguard. The atomic UPDATE is the primary protection. The lock prevents
  reprocessing if a worker crashes mid-job and the status gets reset.

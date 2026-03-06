## Fix race condition in job processor

Fixed a bug where the job processor could pick up the same job twice when
multiple workers are running. The issue was that `acquireJob` used two separate
queries (SELECT then UPDATE) instead of an atomic operation.

### What changed

- `src/workers/job-processor.ts`: Changed the job acquisition to use
  `UPDATE...RETURNING` instead of separate SELECT and UPDATE queries. Also added
  a UUID lock for extra safety.
- `tests/workers/job-processor.test.ts`: Added 8 new tests including a
  concurrency test.

### Testing

Run `npm test` to verify everything passes. The new concurrent acquisition test
spawns 10 workers to verify only one gets the job.

Fixes SUPPORT-891, SUPPORT-894, SUPPORT-897.

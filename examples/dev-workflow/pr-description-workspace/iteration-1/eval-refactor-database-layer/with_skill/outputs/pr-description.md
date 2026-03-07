## Summary

Refactors the database access layer from raw SQL scattered across 12 service
files to a centralized repository pattern with connection pooling, reducing
average query time from 45ms to 12ms.

## Motivation

Our database access layer had three compounding problems:

1. **Inconsistent query patterns**: Each of the 12 service files wrote its own
   SQL with different styles, different error handling, and different approaches
   to parameterization. This made auditing for SQL injection nearly impossible.
2. **No connection pooling**: Every query created a new database connection and
   closed it after use. Under load, this caused connection exhaustion and
   increased latency (45ms average including connection setup).
3. **Duplicated logic**: Common WHERE clauses, pagination patterns, and soft
   delete filters were copy-pasted across services with subtle variations.

The repository pattern centralizes all SQL behind a clean interface, adds
connection pooling via pg-pool, and standardizes error handling.

## Changes

- **Repository layer** (`src/repositories/`): 6 new repository classes —
  UserRepository, OrderRepository, ProductRepository, PaymentRepository,
  ShippingRepository, InventoryRepository. Each encapsulates all SQL for its
  domain entity behind typed methods.
- **Connection pooling** (`src/db/pool.ts`): Configured pg-pool with min=5,
  max=20 connections, idle timeout of 30s. All repositories share the pool
  instead of creating per-query connections.
- **Standardized error handling**: All repositories throw typed
  `RepositoryError` with error codes (NOT_FOUND, CONSTRAINT_VIOLATION,
  CONNECTION_ERROR) instead of leaking raw pg errors to service code.
- **Service migration** (12 modified files): Replaced all raw SQL in service
  files with repository method calls. Services now depend on repository
  interfaces, not database implementation details.

## Testing Instructions

1. Run the existing test suite to verify no behavioral regression:
   ```bash
   npm test
   ```
   All existing tests should pass unchanged — the refactor preserves identical
   API responses.

2. Run the repository-specific tests:
   ```bash
   npm test -- tests/repositories/
   ```

3. Verify performance improvement in staging:
   ```bash
   # Run the load test against staging
   ab -n 1000 -c 50 https://staging.example.com/api/orders
   # Compare average response time against baseline (was ~45ms, should be ~12ms)
   ```

4. Verify connection pooling is active:
   ```bash
   # Check pool stats endpoint (added in this PR)
   curl https://staging.example.com/api/health/db
   # Expected: {"pool":{"total":20,"idle":15,"waiting":0},"avg_query_ms":12}
   ```

5. Verify error handling:
   ```bash
   # Request a non-existent resource
   curl -s https://staging.example.com/api/users/nonexistent | jq .error
   # Expected: {"code":"NOT_FOUND","message":"User not found"} (not a raw pg error)
   ```

### Automated Tests

- Existing API tests (unchanged): Verify identical responses before and after
- `tests/repositories/`: Unit tests for each repository method
- `tests/db/pool.test.ts`: Connection pool lifecycle, exhaustion handling, idle
  timeout behavior

## Rollback Plan

This is a large refactor (18 files) and must be rolled back as a single unit —
partial rollback is not possible because services depend on the repository
interfaces.

1. Revert this PR: `git revert <merge-sha>`
2. No database migrations to reverse — the refactor is purely application-level
3. **Connection pooling**: After revert, the application returns to per-query
   connections. Performance will regress to ~45ms average. This is acceptable as
   a temporary state.
4. **Error handling**: After revert, raw pg errors will surface in API responses
   again. This is a known issue (pre-existing) but worth noting.
5. **Deployment note**: Because this touches 18 files, coordinate the revert
   with the team to avoid merge conflicts with in-flight work.

## Reviewer Notes

- **Repository pattern** (`src/repositories/base-repository.ts`): Start here —
  this is the base class all repositories extend. Verify the query execution,
  error wrapping, and connection management patterns are correct.
- **Connection pool configuration** (`src/db/pool.ts`): The pool settings
  (min=5, max=20, idle=30s) are tuned for our staging load. Production may need
  different values — verify these are configurable via environment variables.
- **Error mapping** (`src/repositories/errors.ts`): Verify the pg error code →
  RepositoryError mapping is complete. Missing mappings will surface as
  unhandled errors.
- **Service files** (12 modified): These are mostly mechanical replacements (raw
  SQL → repository calls). Spot-check 2-3 services to verify the translation is
  correct, then trust the test suite for the rest.
- **Performance claim**: The 45ms → 12ms improvement is measured in staging.
  Production improvement may differ based on connection latency and pool
  contention.

## Summary

Refactors the database access layer from raw SQL scattered across 12 service
files to a centralized repository pattern with connection pooling, reducing
average query time from 45ms to 12ms (73% improvement).

## Motivation

Our database access layer had three compounding problems:

1. **Inconsistent query patterns**: Each of 12 service files wrote its own SQL
   with different styles, error handling, and parameterization. Auditing for SQL
   injection was nearly impossible.
2. **No connection pooling**: Every query created a new database connection.
   Under load, this caused connection exhaustion and 45ms average latency
   (including connection setup overhead).
3. **Duplicated logic**: Common WHERE clauses, pagination, and soft delete
   filters were copy-pasted across services with subtle variations that caused
   inconsistent behavior.

The repository pattern centralizes all SQL behind typed interfaces, adds
connection pooling via pg-pool, and standardizes error handling.

## Changes

- **Repository layer** (`src/repositories/`): 6 new repository classes —
  UserRepository, OrderRepository, ProductRepository, PaymentRepository,
  ShippingRepository, InventoryRepository. Each encapsulates all SQL for its
  domain entity behind typed methods.
- **Connection pooling** (`src/db/pool.ts`): pg-pool configured with min=5,
  max=20 connections, idle timeout 30s. All repositories share the pool.
- **Standardized error handling** (`src/repositories/errors.ts`): Typed
  `RepositoryError` with codes (NOT_FOUND, CONSTRAINT_VIOLATION,
  CONNECTION_ERROR) replaces raw pg errors leaking to service code.
- **Service migration** (12 modified files): All raw SQL replaced with
  repository method calls. Services depend on repository interfaces, not
  database implementation.

## Testing Instructions

1. Run the existing test suite to verify no behavioral regression:
   ```bash
   npm test
   ```
   All existing tests should pass unchanged — the refactor preserves identical
   API responses.

2. Run repository-specific tests:
   ```bash
   npm test -- tests/repositories/
   ```

3. Verify performance improvement in staging:
   ```bash
   # Run load test — expect average response time < 15ms (was ~45ms)
   ab -n 1000 -c 50 https://staging.example.com/api/orders
   # Check the 'Time per request' line — should be < 15ms (baseline was 45ms)
   ```

4. Verify connection pooling is active:
   ```bash
   curl https://staging.example.com/api/health/db | jq .
   # Expected: {"pool":{"total":20,"idle":15,"waiting":0},"avg_query_ms":12}
   # Verify avg_query_ms < 15 (was 45 before pooling)
   ```

5. Verify error handling:
   ```bash
   curl -s https://staging.example.com/api/users/nonexistent | jq .error
   # Expected: {"code":"NOT_FOUND","message":"User not found"}
   # Should NOT be a raw pg error like "relation does not exist"
   ```

### Automated Tests

- Existing API tests (unchanged): Verify identical responses
- `tests/repositories/`: Unit tests for each repository method
- `tests/db/pool.test.ts`: Pool lifecycle, exhaustion handling, idle timeout

## Rollback Plan

This is a large refactor (18 files) and must be rolled back as a single unit —
partial rollback is not possible because services depend on repository
interfaces.

1. Revert this PR: `git revert <merge-sha>`
2. No database migrations to reverse — purely application-level
3. **Performance regression**: After revert, query times return to ~45ms
   average. Acceptable as a temporary state but monitor for connection
   exhaustion under load.
4. **Error handling regression**: Raw pg errors will surface in API responses
   again (pre-existing issue).
5. **Coordination**: Because this touches 18 files, coordinate the revert with
   the team to avoid merge conflicts with in-flight work.

## Reviewer Notes

- **Start here** → `src/repositories/base-repository.ts`: Base class all repos
  extend. Verify query execution, error wrapping, and connection management.
- **Pool config** (`src/db/pool.ts`): Settings (min=5, max=20, idle=30s) tuned
  for staging. Verify these are configurable via environment variables for
  production.
- **Error mapping** (`src/repositories/errors.ts`): Verify pg error code →
  RepositoryError mapping is complete. Missing mappings surface as unhandled
  errors.
- **Service files** (12 modified): Mechanical replacements. Spot-check 2-3
  services, then trust the test suite for the rest.
- **Performance**: 45ms → 12ms measured in staging. Production may differ based
  on connection latency and pool contention.

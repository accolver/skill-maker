# TELOS — MigrateGuard

> Eliminate migration surprises by ensuring database migrations that pass in dev
> never fail in staging or prod.

## L4: Purpose

**Why this project exists:** Small dev teams (2-10 developers) waste hours
debugging failed database migrations in staging and production because they only
tested in dev. Schema differences, missing dependencies, and
environment-specific edge cases cause deployments to break at the worst possible
time. MigrateGuard is a CLI tool that validates migrations against real
environment schemas before they're applied, achieving zero-surprise deployments.

**Beneficiaries:**

- Primary: Backend developers who author and test migrations daily. They need
  fast, confident migration workflows that catch problems before code leaves
  their machine.
- Secondary: DevOps/SRE engineers who get paged at 2am when a migration breaks
  production. They need assurance that migrations reaching prod have already
  been validated against the target schema.

**Success metrics:**

- Zero failed migrations in production within 60 days of adoption
- Migration authoring time under 5 minutes (from `create` to `push`)

**Constraints:**

- Must be database-agnostic: PostgreSQL, MySQL, and SQLite at minimum
- Must work in CI/CD pipelines without interactive prompts (all operations
  scriptable, exit codes for pass/fail)
- MIT licensed (open source, no vendor lock-in)

## L3: Experience

**Key user journeys:**

### Journey 1: Developer creates and tests a migration locally

1. Developer runs `migrateguard create add-users-table`
2. CLI scaffolds a migration file with YAML metadata header and empty SQL body
3. Developer writes the SQL migration
4. Developer runs `migrateguard validate` against their local database
5. Validation passes — developer commits and pushes to CI

### Journey 2: CI validates migration against staging schema snapshot

1. CI pipeline triggers on push
2. CI runs `migrateguard validate --env staging` using a staging schema snapshot
   or connection string
3. Validator checks dependency ordering, schema compatibility, and destructive
   operation warnings
4. If validation fails, CI blocks the merge and outputs a clear error explaining
   what would break and why
5. If validation passes, PR is marked as safe to merge

### Journey 3: DevOps reviews and applies to production

1. DevOps engineer runs `migrateguard status --env prod` to see pending
   migrations
2. Reviews the migration diff and validation results
3. Runs `migrateguard apply --env prod` to execute the migration
4. CLI applies the migration within a transaction, reports success or rolls back
   on failure
5. If rollback is needed later, runs
   `migrateguard rollback --env prod --to <migration-id>`

**Experience principles:**

- **Safety over speed:** Every default should protect against data loss.
  Destructive operations require explicit flags. Validation is mandatory before
  apply.
- **Explicit over implicit:** No magic inference of migration order or schema
  state. Dependencies are declared in the migration header. Environment configs
  are explicit in `.migrations.yml`.
- **No magic:** The tool does exactly what you tell it. No auto-generated
  migrations, no hidden state, no surprise behaviors. What you see in the
  migration file is what gets executed.

**Feedback loops:**

- Migration success/failure logs: every `apply` and `rollback` operation
  produces structured logs (JSON or human-readable) with timestamps, affected
  tables, and row counts
- Schema drift detection alerts: `migrateguard status` compares the expected
  schema state (from migration history) against the actual database schema and
  flags any drift introduced outside the migration system

## L2: Contract

**Major interfaces:**

- **CLI with subcommands:** `create`, `validate`, `apply`, `rollback`, `status`
  — each with `--env` flag for targeting environments
- **Configuration file (`.migrations.yml`):** defines environments (connection
  strings, schema snapshot paths), migration directory location, notification
  settings
- **Migration file format:** SQL file with a YAML metadata header (delimited by
  `---`) followed by the SQL body

**Integration points:**

- **Databases:** connects via standard connection strings (PostgreSQL
  `postgres://`, MySQL `mysql://`, SQLite file paths). No ORM — raw SQL
  execution with driver-specific adapters.
- **CI/CD pipelines:** all commands return proper exit codes (0 = success, 1 =
  failure, 2 = validation error). Supports `--json` flag for machine-readable
  output.
- **Slack notifications (optional):** webhook URL configured in
  `.migrations.yml` for posting migration failure alerts to a channel.

**Data contracts:**

- **Migration file format:**
  ```
  ---
  id: 20240115-001-add-users-table
  author: jane@example.com
  depends-on: 20240114-001-create-schema
  description: Creates the users table with email and role columns
  ---
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ```
- **Invariants:**
  - `id` must be unique across all migration files
  - `depends-on` must reference an existing migration `id` (or be empty for the
    first migration)
  - Migration files are immutable once applied — modifying an applied migration
    is a validation error
  - The dependency graph must be a DAG (no circular dependencies)

## L1: Function

**Core modules:**

- **Parser:** reads migration files, extracts YAML header metadata and SQL body,
  validates file format
- **Validator:** checks dependency ordering (topological sort), verifies schema
  compatibility against target environment, detects destructive operations
  (DROP, TRUNCATE), flags circular dependencies
- **Executor:** applies migrations within database transactions, handles
  rollback on failure, records migration state in a `_migrations` tracking table
- **Reporter:** outputs results in human-readable or JSON format, generates
  Slack notification payloads, produces schema drift reports

**Patterns:**

- Architecture: Node.js CLI application, functional style (pure functions, no
  classes), composition over inheritance
- Language: TypeScript with strict mode, ESM modules
- State management: no runtime state — all state lives in the database's
  `_migrations` tracking table and the migration files on disk
- CLI framework: TBD (likely `commander` or `yargs`)

**Testing strategy:**

- **Unit tests (Vitest):** parser module (YAML header extraction, SQL body
  parsing, malformed file handling), validator module (dependency resolution,
  cycle detection, schema compatibility checks)
- **Integration tests (Vitest + Docker):** executor module against real
  PostgreSQL, MySQL, and SQLite instances running in Docker containers, testing
  apply/rollback behavior
- **E2E tests:** full migration workflows — create, validate, apply, rollback,
  status — against Docker-based databases, verifying CLI exit codes and output
  format

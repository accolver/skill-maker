# TELOS.md — Migration Guardian CLI

## Purpose

Small dev teams (2–10 developers) waste hours debugging failed migrations in
staging and production because they only tested in dev. Migration Guardian is a
CLI tool that ensures **zero-surprise deployments** by validating database
migrations across multiple environments before they reach production.

## Beneficiaries

| Audience                         | Role                                                       | Pain Point                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Backend Developers** (primary) | Author and test migrations locally                         | Migrations that pass in dev break in staging/prod due to schema drift, missing dependencies, or environment-specific differences |
| **DevOps / SRE** (secondary)     | Review and apply migrations to prod; get paged on failures | Woken up at 2 AM because a migration broke prod that was never validated against a realistic schema                              |

## Success Metrics

| Metric                          | Target              | Timeframe                  |
| ------------------------------- | ------------------- | -------------------------- |
| Failed migrations in production | **Zero**            | Within 60 days of adoption |
| Migration authoring time        | **Under 5 minutes** | Per migration              |

## Constraints

- **Database-agnostic**: Must support PostgreSQL, MySQL, and SQLite at minimum
- **CI/CD compatible**: Must work in automated pipelines without interactive
  prompts
- **License**: MIT
- **Runtime**: Node.js

## Key User Journeys

### Journey 1: Developer Creates and Tests a Migration

1. Developer runs `migration-guardian create` to scaffold a new migration file
2. Developer writes SQL in the migration body, fills in YAML metadata header
3. Developer runs `migration-guardian validate` locally to check syntax,
   dependencies, and schema compatibility
4. Developer pushes to CI

### Journey 2: CI Validates Against Staging

1. CI pipeline triggers on push
2. `migration-guardian validate --env staging` checks the migration against a
   staging schema snapshot
3. Pipeline fails fast with clear error messages if validation detects issues
4. Developer gets immediate feedback without waiting for a staging deployment

### Journey 3: DevOps Reviews and Applies to Production

1. DevOps reviews the migration and its validation results
2. `migration-guardian apply --env prod` executes the migration with safety
   checks
3. On failure, `migration-guardian rollback` reverts cleanly
4. `migration-guardian status` shows current migration state across all
   environments

## Experience Principles

1. **Safety over speed** — Every operation defaults to the safest behavior.
   Destructive actions require explicit confirmation flags.
2. **Explicit over implicit** — No hidden behavior. Every action the tool takes
   is visible and logged.
3. **No magic** — The tool does exactly what you tell it. No auto-detection, no
   clever inference, no surprises.

## Feedback Loops

| Loop                           | Mechanism                                                           | Purpose                                         |
| ------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------- |
| Migration success/failure logs | Structured output after every `apply` and `rollback`                | Immediate visibility into what happened and why |
| Schema drift detection alerts  | `migration-guardian status` detects when environments have diverged | Catch drift before it causes migration failures |

## Interfaces

### CLI Subcommands

| Command    | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `create`   | Scaffold a new migration file with YAML header template        |
| `validate` | Check migration syntax, dependencies, and schema compatibility |
| `apply`    | Execute pending migrations against a target environment        |
| `rollback` | Revert the last applied migration (or a specific migration)    |
| `status`   | Show migration state across all configured environments        |

### Configuration File

`.migrations.yml` at the project root:

```yaml
environments:
  dev:
    connection: postgres://localhost:5432/myapp_dev
  staging:
    connection: postgres://staging-host:5432/myapp_staging
  prod:
    connection: postgres://prod-host:5432/myapp_prod

notifications:
  slack:
    webhook_url: ${SLACK_WEBHOOK_URL}
    on_failure: true
```

### Migration File Format

SQL file with a YAML metadata header:

```sql
---
id: 20240115-001-add-users-table
author: jane@example.com
depends-on:
  - 20240110-001-create-schema
description: Add users table with email uniqueness constraint
---

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Integrations

| Integration           | Mechanism                                             | Required?       |
| --------------------- | ----------------------------------------------------- | --------------- |
| Database connectivity | Standard connection strings (Postgres, MySQL, SQLite) | Yes             |
| Slack notifications   | Webhook URL for failure alerts                        | Optional        |
| CI/CD pipelines       | Non-interactive CLI with exit codes                   | Yes (by design) |

## Data Contracts

### Migration File Contract

Every migration file MUST contain:

| Field         | Type     | Required | Description                                                       |
| ------------- | -------- | -------- | ----------------------------------------------------------------- |
| `id`          | string   | Yes      | Unique identifier, recommended format: `YYYYMMDD-NNN-description` |
| `author`      | string   | Yes      | Email or identifier of the migration author                       |
| `depends-on`  | string[] | No       | List of migration IDs this migration depends on                   |
| `description` | string   | Yes      | Human-readable description of what this migration does            |
| _(SQL body)_  | SQL      | Yes      | The migration SQL, separated from the header by `---`             |

## Architecture

### Core Modules

| Module        | Responsibility                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Parser**    | Reads migration files, extracts YAML header and SQL body, validates file format                                      |
| **Validator** | Checks dependency ordering, detects circular dependencies, validates schema compatibility against target environment |
| **Executor**  | Applies migrations (forward) and rolls back migrations (reverse), manages transaction boundaries                     |
| **Reporter**  | Formats and outputs results — success/failure summaries, status tables, diff reports                                 |

### Technical Patterns

- **Runtime**: Node.js
- **Style**: Functional — no classes, pure functions where possible, explicit
  data flow
- **Testing**: Vitest
  - **Unit tests**: Parser and Validator modules (fast, no external
    dependencies)
  - **Integration tests**: Executor against Docker-based databases (Postgres,
    MySQL, SQLite)
  - **E2E tests**: Full migration workflows from `create` through `apply` and
    `rollback`

## Open Questions

- Rollback strategy: auto-generate down migrations or require explicit rollback
  SQL?
- Schema snapshot format: SQL dump, JSON schema representation, or both?
- Migration locking: how to prevent concurrent migration execution in prod?
- Version compatibility: how to handle migration format changes across tool
  versions?

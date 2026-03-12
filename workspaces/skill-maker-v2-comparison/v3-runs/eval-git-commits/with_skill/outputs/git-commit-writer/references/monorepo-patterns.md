# Monorepo Scope Detection Patterns

## Detecting a Monorepo

Check for these indicators (in priority order):

1. **Workspace config files:**
   - `pnpm-workspace.yaml` — pnpm workspaces
   - `lerna.json` — Lerna monorepo
   - `package.json` with `"workspaces"` field — npm/yarn workspaces
   - `nx.json` — Nx monorepo
   - `turbo.json` — Turborepo
   - `rush.json` — Rush monorepo

2. **Directory structure:**
   - `packages/` — most common
   - `apps/` — Next.js, Turborepo convention
   - `libs/` — Nx convention
   - `modules/` — custom monorepos
   - `services/` — microservice monorepos

3. **Multiple `package.json` files** at different directory levels

## Scope Mapping Rules

### Single-package changes

When all changed files are within one package:

```
packages/auth/src/login.ts     → scope: auth
packages/auth/src/types.ts     → scope: auth
```

Result: `feat(auth): add login endpoint`

### Cross-package changes (one primary)

When changes span packages but one has the primary change:

```
packages/shared/src/errors.ts       → primary (new error class)
packages/api/src/middleware/err.ts   → secondary (uses new class)
```

Result: `fix(shared): add structured error codes` Body mentions: "Updated api
error handler to use new error codes."

### Cross-package changes (equal weight)

When changes are distributed equally:

```
packages/auth/src/config.ts    → env var change
packages/api/src/config.ts     → env var change
packages/web/src/config.ts     → env var change
```

Result: `chore: migrate to new env var naming convention` Body lists all
affected packages.

### Root-level changes

Changes to workspace-level config:

```
pnpm-workspace.yaml            → workspace config
turbo.json                     → build config
.github/workflows/ci.yml       → CI config
```

Result: `ci: update monorepo build pipeline` (no scope, or `root`)

## Common Monorepo Layouts

### Turborepo / Next.js

```
apps/
  web/           → scope: web
  docs/          → scope: docs
  admin/         → scope: admin
packages/
  ui/            → scope: ui
  config/        → scope: config
  tsconfig/      → scope: tsconfig
```

### Nx

```
apps/
  frontend/      → scope: frontend
  backend/       → scope: backend
libs/
  shared/        → scope: shared
  ui/            → scope: ui
  data-access/   → scope: data-access
```

### Lerna / pnpm

```
packages/
  core/          → scope: core
  cli/           → scope: cli
  plugin-a/      → scope: plugin-a
  plugin-b/      → scope: plugin-b
```

### Microservices

```
services/
  auth/          → scope: auth
  billing/       → scope: billing
  notifications/ → scope: notifications
shared/
  proto/         → scope: proto
  utils/         → scope: utils
```

## Edge Cases

| Scenario                                   | Scope Decision                                   |
| ------------------------------------------ | ------------------------------------------------ |
| Change only in root `package.json`         | Omit scope or use `root`                         |
| Change in `packages/foo/package.json` only | Use `foo` with type `build`                      |
| New package added                          | Use new package name with type `feat`            |
| Package renamed                            | Use new name with type `refactor`, note old name |
| Package deleted                            | Use deleted name with type `refactor` or `chore` |
| Shared types updated for one consumer      | Use the consumer's scope, not `shared`           |
| Lock file only                             | `chore: update lock file` (no scope)             |

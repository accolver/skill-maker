# Monorepo Scope Detection Guide

## Overview

In monorepos, the commit scope should reflect the **package or workspace**
affected, not the file path. This guide covers detection patterns and scope
selection strategies.

## Common Monorepo Structures

### Package-based (npm/pnpm/yarn workspaces)

```
packages/
  auth/
    package.json    → name: "@myorg/auth"
    src/
  core/
    package.json    → name: "@myorg/core"
    src/
  ui/
    package.json    → name: "@myorg/ui"
    src/
```

**Scope:** Use the package directory name (e.g., `auth`, `core`, `ui`), not the
full npm package name.

### App-based (Next.js, Turborepo)

```
apps/
  web/
    package.json
  mobile/
    package.json
packages/
  shared/
    package.json
  config/
    package.json
```

**Scope:** Use the app or package name (e.g., `web`, `mobile`, `shared`).

### Service-based (microservices)

```
services/
  user-service/
  payment-service/
  notification-service/
libs/
  common/
  database/
```

**Scope:** Use the service or lib name (e.g., `user-service`, `common`).

## Detection Patterns

The bundled `parse-diff.ts` script checks these directory patterns:

| Pattern           | Example Path                    | Extracted Scope |
| ----------------- | ------------------------------- | --------------- |
| `packages/<X>/`   | `packages/auth/src/index.ts`    | `auth`          |
| `apps/<X>/`       | `apps/web/pages/index.tsx`      | `web`           |
| `libs/<X>/`       | `libs/common/utils.ts`          | `common`        |
| `services/<X>/`   | `services/user-service/main.go` | `user-service`  |
| `modules/<X>/`    | `modules/billing/handler.ts`    | `billing`       |
| `components/<X>/` | `components/header/Header.tsx`  | `header`        |

## Scope Selection Rules

### Single package changed

Use that package's name as scope.

```
feat(auth): add OAuth2 support
```

### Multiple packages, one primary

Use the primary package (the one with the most changes or the one that
introduces the new behavior).

```
refactor(core): simplify logger API

Updated api and worker packages to use the new logger interface.
```

### Cross-cutting changes

If changes span many packages equally (e.g., a shared dependency update), omit
the scope.

```
build: upgrade TypeScript to 5.3
```

### Root-level changes

For changes to root config files (root `package.json`, `turbo.json`,
`pnpm-workspace.yaml`), omit scope or use a descriptive scope.

```
build: configure turborepo caching
chore(deps): update shared dev dependencies
```

## Package Name vs Directory Name

Prefer the directory name over the npm package name for brevity:

| package.json `name` | Directory       | Scope to use |
| ------------------- | --------------- | ------------ |
| `@myorg/auth`       | `packages/auth` | `auth`       |
| `@myorg/ui-kit`     | `packages/ui`   | `ui`         |
| `my-web-app`        | `apps/web`      | `web`        |

Exception: If the directory name is generic (e.g., `packages/lib`) but the
package name is descriptive (e.g., `@myorg/validation`), use the package name
stem: `validation`.

## Workspace Configuration Files

To programmatically detect monorepo packages, check:

- **npm/yarn:** `package.json` → `workspaces` field
- **pnpm:** `pnpm-workspace.yaml` → `packages` field
- **Turborepo:** `turbo.json` (inherits from package manager workspaces)
- **Nx:** `nx.json` + `workspace.json` or `project.json` files
- **Lerna:** `lerna.json` → `packages` field

## Examples

### Feature in one package

```
feat(auth): add JWT refresh token rotation
```

### Fix spanning two packages

```
fix(api): handle timeout in payment webhook

Also updated the payment package's retry logic to match the
new timeout configuration.
```

### Refactor across the monorepo

```
refactor: migrate from CommonJS to ESM

Updated all packages to use ESM imports. Root tsconfig now
targets ES2022 modules.

BREAKING CHANGE: All packages now use ESM. Consumers using
require() must switch to import().
```

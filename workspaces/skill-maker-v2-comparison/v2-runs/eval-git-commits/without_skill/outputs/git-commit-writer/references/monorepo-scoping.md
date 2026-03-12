# Monorepo Scope Detection Guide

## Overview

In monorepos, the commit scope should reflect the **package name**, not the
directory path. This reference covers how to detect monorepo structures and
derive correct scopes.

## Detection Strategy

### Step 1: Check for workspace configuration

Look for these files in the repository root:

| File                  | Tool      | How to read packages                     |
| --------------------- | --------- | ---------------------------------------- |
| `pnpm-workspace.yaml` | pnpm      | `packages:` array lists glob patterns    |
| Root `package.json`   | npm/yarn  | `workspaces` field (array or object)     |
| `lerna.json`          | Lerna     | `packages` array lists glob patterns     |
| `nx.json`             | Nx        | Each package has `project.json`          |
| `turbo.json`          | Turborepo | Uses npm/pnpm/yarn workspaces underneath |

### Step 2: Map file paths to packages

Given a changed file path like `packages/auth/src/middleware.ts`:

1. Match against workspace patterns (e.g., `packages/*`)
2. Extract the package directory name: `auth`
3. Optionally read the package's `package.json` for the `name` field
4. Use the package name as scope: `feat(auth): ...`

### Step 3: Handle multi-package changes

| Scenario                | Scope strategy                           |
| ----------------------- | ---------------------------------------- |
| Single package changed  | Use package name: `feat(auth): ...`      |
| Two packages changed    | List both: `feat(auth,api): ...`         |
| Three+ packages changed | Use feature name or omit: `feat: ...`    |
| Root-level files only   | Omit scope: `chore: ...`                 |
| Mix of root and package | Use package name if it's the main change |

## Common Monorepo Structures

### pnpm workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
  - "tools/*"
```

Directory layout:

```
packages/
  auth/          -> scope: auth
  database/      -> scope: database
  shared-utils/  -> scope: shared-utils
apps/
  web/           -> scope: web
  mobile/        -> scope: mobile
```

### npm/yarn workspaces

```json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

Or the object form (yarn):

```json
{
  "workspaces": {
    "packages": ["packages/*", "apps/*"],
    "nohoist": ["**/react-native"]
  }
}
```

### Nx

```
packages/
  auth/
    project.json    -> { "name": "auth" }
  api/
    project.json    -> { "name": "api" }
```

Use the `name` field from `project.json` as the scope.

### Lerna

```json
{
  "packages": ["packages/*"],
  "version": "independent"
}
```

## Edge Cases

- **Scoped npm packages** (`@myorg/auth`): Use the unscoped name as scope:
  `feat(auth): ...` not `feat(@myorg/auth): ...`
- **Nested workspaces**: Use the most specific package name
- **Shared/common packages**: Use the package name as-is:
  `fix(shared-utils): ...`
- **Root-level changes in monorepo**: Changes to root `package.json`,
  `tsconfig.base.json`, etc. should omit scope or use a descriptive scope like
  `deps` or `config`

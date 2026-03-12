# Monorepo Scope Patterns

Reference for detecting and scoping commits in monorepo structures.

## Common Directory Layouts

### npm/Yarn/pnpm Workspaces

```
packages/
├── auth/
├── api-client/
├── shared-types/
└── ui-components/
```

Scope: use the package directory name. `feat(auth): add OAuth2 flow`

### Turborepo / Nx

```
apps/
├── web/
├── mobile/
└── admin/
packages/
├── ui/
├── config/
└── tsconfig/
```

Scope: use the app or package name. `fix(web): correct hydration mismatch`

### Microservices

```
services/
├── user-service/
├── payment-service/
├── notification-service/
└── gateway/
```

Scope: use the service name. `perf(payment-service): add connection pooling`

### Shared Libraries

```
libs/
├── common/
├── auth-utils/
└── database/
```

Scope: use the library name. `refactor(auth-utils): extract token validation`

## Scope Decision Tree

```
Is the change in a single package/app/service?
├── YES → Use that name as scope
│         feat(auth-service): add login endpoint
└── NO → Do the changes share a common concern?
    ├── YES → Use the concern as scope
    │         refactor(auth): unify token handling across services
    └── NO → Are the changes related?
        ├── YES → Omit scope, explain in body
        │         chore: update shared dependencies
        │
        │         Update TypeScript to 5.3 and eslint to 8.50
        │         across all packages.
        └── NO → Split into separate commits
```

## Cross-Package Change Patterns

| Pattern                          | Scope Strategy               | Example                                   |
| -------------------------------- | ---------------------------- | ----------------------------------------- |
| Type definition moved to shared  | Use destination package      | `refactor(shared-types): centralize User` |
| Dependency bumped everywhere     | Omit scope or use `deps`     | `build(deps): bump webpack to v5`         |
| Config change affecting all pkgs | Omit scope                   | `chore: enable strict TypeScript`         |
| Feature spanning 2 packages      | Use the feature name         | `feat(search): add full-text search`      |
| Bug fix in one, test in another  | Use the package with the fix | `fix(api): handle null user response`     |

## Detection Heuristics

The `parse-diff.ts` script detects monorepos by checking file paths against
these patterns:

| Pattern                 | Monorepo Type |
| ----------------------- | ------------- |
| `packages/<name>/...`   | packages      |
| `apps/<name>/...`       | apps          |
| `libs/<name>/...`       | libs          |
| `modules/<name>/...`    | modules       |
| `services/<name>/...`   | services      |
| `plugins/<name>/...`    | plugins       |
| `components/<name>/...` | components    |

If files match multiple patterns (e.g., both `apps/` and `packages/`), the first
detected type is used. The `packages` array lists all unique package names
found.

# Monorepo Scope Detection Patterns

## Common Monorepo Structures

### Package-based (npm/pnpm/yarn workspaces)

```
my-project/
├── package.json          # { "workspaces": ["packages/*"] }
├── packages/
│   ├── auth/
│   │   ├── package.json
│   │   └── src/
│   ├── api/
│   │   ├── package.json
│   │   └── src/
│   └── shared/
│       ├── package.json
│       └── src/
```

**Scope:** Use the package directory name: `auth`, `api`, `shared`

### App + Library split

```
my-project/
├── apps/
│   ├── web/
│   ├── mobile/
│   └── admin/
├── libs/
│   ├── ui/
│   ├── utils/
│   └── config/
```

**Scope:** Use the app/lib name: `web`, `mobile`, `ui`, `utils`

### Service-oriented

```
my-project/
├── services/
│   ├── user-service/
│   ├── payment-service/
│   └── notification-service/
├── shared/
│   └── proto/
```

**Scope:** Use the service name: `user-service`, `payment-service`

### Nx workspace

```
my-project/
├── nx.json
├── apps/
│   ├── frontend/
│   └── backend/
├── libs/
│   ├── shared-types/
│   └── ui-components/
```

**Scope:** Use the project name from `project.json` or directory name

### Turborepo

```
my-project/
├── turbo.json
├── packages/
│   ├── ui/
│   ├── config/
│   └── tsconfig/
├── apps/
│   ├── web/
│   └── docs/
```

**Scope:** Use the package/app name: `ui`, `web`, `docs`

## Detection Heuristics

### Config file indicators

| File                  | Monorepo Tool | Workspace Key            |
| --------------------- | ------------- | ------------------------ |
| `package.json`        | npm/yarn/pnpm | `workspaces` array       |
| `pnpm-workspace.yaml` | pnpm          | `packages` array         |
| `lerna.json`          | Lerna         | `packages` array         |
| `nx.json`             | Nx            | `projects` or convention |
| `turbo.json`          | Turborepo     | `pipeline` keys          |
| `rush.json`           | Rush          | `projects` array         |

### Directory pattern indicators

These top-level directories strongly suggest a monorepo:

- `packages/`
- `apps/`
- `services/`
- `libs/`
- `modules/`
- `plugins/`

### Scope resolution rules

1. **All files in one package** -> Use that package name as scope
2. **Files in two packages, one dominant** -> Use the dominant package
3. **Files spread across 3+ packages** -> Omit scope (cross-cutting change)
4. **Root-level config files only** -> Omit scope or use `root`
5. **Shared + one consumer** -> Use the consumer package as scope

### Edge cases

- **Root package.json changes** (adding a workspace): `build` type, no scope
- **CI config that deploys one package**: `ci(package-name)` is acceptable
- **Shared types consumed by all packages**: `refactor(shared)` or omit scope
- **Lock file changes only**: `build` type, no scope (affects all packages)

# Conventional Commits Quick Reference

## Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type       | Description                                           |
| ---------- | ----------------------------------------------------- |
| `feat`     | A new feature                                         |
| `fix`      | A bug fix                                             |
| `docs`     | Documentation only changes                            |
| `style`    | Changes that don't affect code meaning (formatting)   |
| `refactor` | Code change that neither fixes a bug nor adds feature |
| `perf`     | Performance improvement                               |
| `test`     | Adding or correcting tests                            |
| `build`    | Changes to build system or external dependencies      |
| `ci`       | Changes to CI configuration files and scripts         |
| `chore`    | Other changes that don't modify src or test files     |

## Breaking Changes

Two ways to indicate:

1. `!` after type/scope: `feat(api)!: remove legacy endpoint`
2. Footer: `BREAKING CHANGE: description of what broke`

Both can be used together for emphasis.

## Scope

- Monorepo: use package/app name (`feat(api):`, `fix(web):`)
- Single repo: use module/area (`feat(auth):`, `fix(parser):`)
- Omit scope when changes span multiple areas

## Subject Line Rules

- Imperative mood: "add" not "added" or "adds"
- Lowercase first letter
- No period at end
- Under 72 characters total

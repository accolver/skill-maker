# Conventional Commits Reference

Quick lookup for commit types and their usage.

## Type Definitions

| Type       | SemVer Impact | Description                                 |
| ---------- | ------------- | ------------------------------------------- |
| `feat`     | MINOR         | New feature visible to users                |
| `fix`      | PATCH         | Bug fix                                     |
| `docs`     | none          | Documentation only                          |
| `style`    | none          | Formatting, whitespace (no logic change)    |
| `refactor` | none          | Code change that neither fixes nor adds     |
| `perf`     | PATCH         | Performance improvement                     |
| `test`     | none          | Adding or correcting tests                  |
| `build`    | none          | Build system or external dependencies       |
| `ci`       | none          | CI configuration and scripts                |
| `chore`    | none          | Other changes that don't modify src or test |
| `revert`   | varies        | Reverts a previous commit                   |

## Breaking Changes

Any type can include a breaking change. Signal it with:

- `!` after the type/scope: `feat(api)!: remove deprecated endpoint`
- `BREAKING CHANGE:` in the footer

Breaking changes trigger a MAJOR version bump in SemVer.

## Scope Conventions

Scopes are optional and project-specific. Common patterns:

- **Monorepo packages**: `feat(auth):`, `fix(api):`
- **Functional areas**: `feat(login):`, `fix(checkout):`
- **Layers**: `refactor(db):`, `test(e2e):`

## Format Specification

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- Description: imperative, lowercase, no period, max 72 chars on first line
- Body: free-form, wrapped at 72 chars, separated by blank line
- Footer: `token: value` or `token #value` format

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

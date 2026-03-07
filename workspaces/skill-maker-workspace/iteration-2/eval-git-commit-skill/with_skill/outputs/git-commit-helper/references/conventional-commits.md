# Conventional Commits Reference

## Format

```
<type>[optional scope][optional !]: <subject>

[optional body]

[optional footer(s)]
```

## Types

| Type       | SemVer Impact | Description                                 |
| ---------- | ------------- | ------------------------------------------- |
| `feat`     | MINOR         | New feature for the user                    |
| `fix`      | PATCH         | Bug fix for the user                        |
| `docs`     | —             | Documentation only changes                  |
| `style`    | —             | Formatting, missing semicolons, whitespace  |
| `refactor` | —             | Code change that neither fixes nor adds     |
| `perf`     | PATCH         | Performance improvement                     |
| `test`     | —             | Adding or correcting tests                  |
| `build`    | —             | Build system or external dependencies       |
| `ci`       | —             | CI configuration files and scripts          |
| `chore`    | —             | Other changes that don't modify src or test |

## Breaking Changes

Two ways to indicate:

1. `!` after type/scope: `feat(api)!: remove deprecated endpoints`
2. `BREAKING CHANGE:` footer:

```
feat(api): restructure authentication

BREAKING CHANGE: The /auth/login endpoint now requires a JSON body instead of form data.
```

Both trigger a MAJOR version bump.

## Scope Conventions

- Use the package/workspace name in monorepos: `feat(auth): ...`
- Use the module name for single-repo projects: `fix(parser): ...`
- Omit scope if changes are truly global: `chore: update dependencies`

## Examples

```
feat(auth): add OAuth2 login flow
fix(api): handle null response from payment provider
docs: update contributing guidelines
refactor(core): extract validation into shared utility
test(auth): add integration tests for token refresh
chore: upgrade typescript to 5.3
style: fix indentation in config files
perf(db): add index on users.email column
ci: add Node 20 to test matrix
build: migrate from webpack to vite
feat(api)!: change response format for /users endpoint
```

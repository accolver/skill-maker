# Conventional Commits Quick Reference

Based on the
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
specification.

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type       | Description                                           |
| ---------- | ----------------------------------------------------- |
| `feat`     | A new feature (correlates with MINOR in SemVer)       |
| `fix`      | A bug fix (correlates with PATCH in SemVer)           |
| `docs`     | Documentation only changes                            |
| `style`    | Formatting, missing semicolons, etc. (no code logic)  |
| `refactor` | Code change that neither fixes a bug nor adds feature |
| `perf`     | Performance improvement                               |
| `test`     | Adding or correcting tests                            |
| `build`    | Changes to build system or external dependencies      |
| `ci`       | Changes to CI configuration files and scripts         |
| `chore`    | Other changes that don't modify src or test files     |
| `revert`   | Reverts a previous commit                             |

## Rules

1. Type is required
2. Scope is optional, enclosed in parentheses
3. Description is required, follows colon and space
4. Body is optional, separated by blank line
5. Footer is optional, separated by blank line
6. Breaking changes indicated by `BREAKING CHANGE:` footer or `!` after
   type/scope
7. Description must be imperative mood, lowercase, no period

## Breaking Changes

Two ways to indicate:

```
feat!: remove deprecated API endpoint

feat(api): change authentication flow

BREAKING CHANGE: JWT tokens now require the 'aud' claim
```

# Conventional Commits Specification — Quick Reference

Based on
[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type       | SemVer Impact | Description                                 |
| ---------- | ------------- | ------------------------------------------- |
| `feat`     | MINOR         | New feature for the user                    |
| `fix`      | PATCH         | Bug fix for the user                        |
| `refactor` | —             | Code restructuring, no behavior change      |
| `docs`     | —             | Documentation only                          |
| `test`     | —             | Adding or correcting tests                  |
| `perf`     | PATCH         | Performance improvement                     |
| `style`    | —             | Formatting, whitespace, semicolons          |
| `build`    | —             | Build system or external dependencies       |
| `ci`       | —             | CI configuration and scripts                |
| `chore`    | —             | Other changes that don't modify src or test |

## Breaking Changes

Breaking changes trigger a MAJOR version bump. Two ways to indicate:

1. **Footer notation:**
   ```
   feat(api): change user endpoint response format

   BREAKING CHANGE: response now returns array instead of object
   ```

2. **`!` notation:**
   ```
   feat(api)!: change user endpoint response format
   ```

3. **Both together** (maximum visibility):
   ```
   feat(api)!: change user endpoint response format

   BREAKING CHANGE: response now returns array instead of object.
   Migrate by wrapping existing response handling in array check.
   ```

## Rules

1. `type` is required and must be one of the recognized types
2. `scope` is optional, in parentheses after type
3. `!` before `:` indicates breaking change
4. `description` is required, follows `:` (colon space)
5. Body is optional, separated by blank line from description
6. Footer is optional, separated by blank line from body
7. `BREAKING CHANGE:` footer must be uppercase
8. Multiple footers allowed (e.g., `BREAKING CHANGE:`, `Closes #123`)

## Scope Conventions

Scope should identify the section of the codebase:

- **Module name:** `feat(parser): add CSV support`
- **Package name:** `fix(auth-service): handle expired tokens`
- **Layer name:** `refactor(api): extract middleware`
- **Feature name:** `feat(search): add fuzzy matching`

Avoid:

- File paths: ~~`fix(src/utils/auth.ts)`~~
- Too generic: ~~`fix(code)`~~
- Too specific: ~~`fix(line-42-null-check)`~~

## Monorepo Conventions

In monorepos, scope typically maps to the package or app name:

```
feat(web-app): add dark mode toggle
fix(api-server): handle connection timeout
chore(shared-utils): update lodash dependency
refactor: migrate to shared type definitions
```

Cross-cutting changes that affect multiple packages can:

- Use a feature-level scope: `feat(auth): add SSO across all apps`
- Omit scope: `chore: update TypeScript to 5.3`
- Reference the change type: `build(deps): bump webpack to v5`

## Footer Tokens

| Token             | Purpose                               |
| ----------------- | ------------------------------------- |
| `BREAKING CHANGE` | Describes a breaking API change       |
| `Closes`          | Closes an issue: `Closes #123`        |
| `Fixes`           | Fixes an issue: `Fixes #456`          |
| `Refs`            | References: `Refs #789, #012`         |
| `Reviewed-by`     | Reviewer: `Reviewed-by: Name <email>` |
| `Co-authored-by`  | Co-author attribution                 |

## Semantic Versioning Mapping

| Commit Type          | Version Bump |
| -------------------- | ------------ |
| `fix`                | PATCH        |
| `feat`               | MINOR        |
| `BREAKING CHANGE`    | MAJOR        |
| `docs`, `style`, etc | No release   |

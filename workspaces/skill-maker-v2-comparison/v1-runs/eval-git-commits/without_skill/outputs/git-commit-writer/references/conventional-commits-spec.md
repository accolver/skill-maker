# Conventional Commits Quick Reference

Based on the
[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
specification.

## Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type       | SemVer Impact | Description                                   |
| ---------- | ------------- | --------------------------------------------- |
| `feat`     | MINOR         | New feature visible to users                  |
| `fix`      | PATCH         | Bug fix                                       |
| `refactor` | —             | Code restructuring without behavior change    |
| `docs`     | —             | Documentation only                            |
| `test`     | —             | Adding or updating tests                      |
| `perf`     | PATCH         | Performance improvement                       |
| `style`    | —             | Formatting, whitespace, semicolons (no logic) |
| `build`    | —             | Build system or dependency changes            |
| `ci`       | —             | CI/CD configuration                           |
| `chore`    | —             | Maintenance tasks                             |

## Breaking Changes

Breaking changes trigger a MAJOR version bump in semantic versioning.

Two ways to indicate:

1. **Footer notation:**
   ```
   feat(api): change user endpoint response format

   BREAKING CHANGE: response now returns array instead of object
   ```

2. **`!` notation:**
   ```
   feat(api)!: change user endpoint response format
   ```

3. **Both together** (recommended for maximum visibility):
   ```
   feat(api)!: change user endpoint response format

   BREAKING CHANGE: response now returns array instead of object.
   Migrate by wrapping existing response handling in array check.
   ```

## Subject Line Rules

1. Imperative mood: "add" not "added" or "adds"
2. Lowercase first letter after colon
3. No period at end
4. 50 characters max for the entire first line
5. Be specific: "fix null check in auth" not "fix bug"

## Body Rules

1. Separated from subject by blank line
2. Wrap at 72 characters
3. Explain WHY, not just WHAT
4. Use bullet points for multiple items

## Footer Rules

1. `BREAKING CHANGE:` must be uppercase
2. Other footers use `token: value` or `token #value` format
3. Common footers: `Refs:`, `Closes:`, `Reviewed-by:`

## Semantic Versioning Mapping

| Commit Type       | Version Bump |
| ----------------- | ------------ |
| `fix`             | PATCH        |
| `feat`            | MINOR        |
| `BREAKING CHANGE` | MAJOR        |
| All others        | No bump      |

## Examples

### Minimal

```
docs: correct typo in README
```

### With scope

```
feat(parser): add support for arrays
```

### With body

```
fix(auth): handle expired tokens gracefully

Previously, expired tokens caused a 500 error. Now returns 401
with a clear error message and refresh token hint.
```

### With breaking change

```
refactor(api)!: rename user endpoints

Rename /api/users/:id to /api/v2/users/:id for consistency
with the new API versioning scheme.

BREAKING CHANGE: All /api/users/ endpoints now require /v2/
prefix. Update client configurations accordingly.
```

### Multi-paragraph body

```
feat(search): add fuzzy matching support

Implement Levenshtein distance-based fuzzy matching for the
search endpoint. This allows users to find results even with
minor typos in their queries.

- Max edit distance configurable via SEARCH_FUZZ_DISTANCE env var
- Default distance is 2
- Only applies to text fields, not numeric or date fields

Closes #142
```

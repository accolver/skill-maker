# Conventional Commits Specification — Quick Reference

Source: https://www.conventionalcommits.org/en/v1.0.0/

## Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type       | SemVer Impact | Description                                           |
| ---------- | ------------- | ----------------------------------------------------- |
| `feat`     | MINOR         | A new feature                                         |
| `fix`      | PATCH         | A bug fix                                             |
| `docs`     | —             | Documentation only changes                            |
| `style`    | —             | Formatting, missing semi colons, etc; no code change  |
| `refactor` | —             | Code change that neither fixes a bug nor adds feature |
| `perf`     | PATCH         | A code change that improves performance               |
| `test`     | —             | Adding missing tests or correcting existing tests     |
| `build`    | —             | Changes to build system or external dependencies      |
| `ci`       | —             | Changes to CI configuration files and scripts         |
| `chore`    | —             | Other changes that don't modify src or test files     |

## Breaking Changes

Two ways to indicate:

1. **Footer notation:** `BREAKING CHANGE: <description>` (must be uppercase)
2. **Type notation:** Append `!` after type/scope: `feat(api)!: description`

Both can be used together. Any type can include a breaking change.

**SemVer impact:** MAJOR version bump.

## Scope

- Noun describing a section of the codebase
- Surrounded by parentheses: `feat(parser): add ability to parse arrays`
- Optional — omit if the change is too broad

## Subject Rules

- Imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize first letter
- No period at the end

## Body Rules

- Free-form
- Separated from subject by a blank line
- May consist of any number of newline-separated paragraphs
- Wrap at 72 characters

## Footer Rules

- One or more footers, each on its own line
- Format: `<token>: <value>` or `<token> #<value>`
- `BREAKING CHANGE` must be uppercase
- Other tokens use git trailer convention: `Reviewed-by: Name`

## Relationship to SemVer

- `fix` type → PATCH release
- `feat` type → MINOR release
- `BREAKING CHANGE` (any type) → MAJOR release

## Monorepo Conventions

Not part of the official spec, but widely adopted:

- Use the package/workspace name as scope: `feat(auth): ...`
- For cross-package changes, omit scope or use a project-level scope
- Some teams use `packages/name` format, but single-word is preferred
- Tools like `commitlint` and `semantic-release` support monorepo scopes

## Commitlint Default Config

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert"
      ]
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100]
  }
}
```

Note: commitlint's default `header-max-length` is 100, but the 50-char subject
guideline (from git best practices) is stricter and preferred for readability
across all git tooling (log --oneline, GitHub UI, etc.).

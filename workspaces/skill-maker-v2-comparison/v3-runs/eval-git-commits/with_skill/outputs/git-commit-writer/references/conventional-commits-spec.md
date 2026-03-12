# Conventional Commits Specification — Quick Reference

Based on
[Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## Format

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Structural Elements

### Type (required)

Communicates intent to consumers of the library:

| Type       | SemVer Impact | Description                                       |
| ---------- | ------------- | ------------------------------------------------- |
| `feat`     | MINOR         | New feature for the user                          |
| `fix`      | PATCH         | Bug fix for the user                              |
| `refactor` | —             | Code restructuring, no behavior change            |
| `docs`     | —             | Documentation only                                |
| `test`     | —             | Adding or correcting tests                        |
| `perf`     | PATCH         | Performance improvement                           |
| `style`    | —             | Formatting, missing semicolons, etc.              |
| `build`    | —             | Build system or external dependency changes       |
| `ci`       | —             | CI configuration files and scripts                |
| `chore`    | —             | Other changes that don't modify src or test files |

### Scope (optional)

A noun describing a section of the codebase, surrounded by parentheses:

```
feat(parser): add ability to parse arrays
fix(auth): handle expired tokens
```

### Breaking Changes

Indicated by either:

1. `!` after type/scope: `feat(api)!: remove deprecated endpoints`
2. `BREAKING CHANGE:` footer:
   `BREAKING CHANGE: environment variables now take precedence`
3. Both together for maximum visibility

Breaking changes correlate with **MAJOR** in Semantic Versioning.

### Description (required)

- Immediately follows the colon and space after type/scope
- Short summary of the code changes
- Imperative, present tense: "change" not "changed" nor "changes"
- No capitalization of first letter
- No period at the end

### Body (optional)

- Separated from description by a blank line
- Free-form, may consist of any number of newline-separated paragraphs
- Explains the motivation for the change and contrasts with previous behavior

### Footer (optional)

- Separated from body by a blank line
- Each footer is a token, separator, and value
- `BREAKING CHANGE` must be uppercase
- Other footers follow git trailer convention: `Reviewed-by: Z`, `Refs: #123`

## Examples from the Spec

### Simple feature

```
feat: allow provided config object to extend other configs
```

### Feature with scope

```
feat(lang): add Polish language
```

### Breaking change with footer

```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for
extending other config files
```

### Breaking change with `!`

```
feat!: send an email to the customer when a product is shipped
```

### Breaking change with scope and `!`

```
feat(api)!: send an email to the customer when a product is shipped
```

### Fix with multi-paragraph body and multiple footers

```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

## Monorepo Scope Conventions

In monorepos, scope typically maps to the package or workspace name:

```
feat(auth): add OAuth provider          ← packages/auth/
fix(shared): correct type export        ← packages/shared/
refactor(api): extract middleware       ← packages/api/
chore(root): update workspace config   ← root-level changes
```

### Cross-package changes

When changes span multiple packages:

1. **Primary package as scope** — Use the package where the main change occurs
2. **Feature name as scope** — If the change is a cross-cutting feature
3. **Omit scope** — If changes are truly distributed equally

Mention secondary packages in the commit body.

## Tooling Compatibility

This format is compatible with:

- **commitlint** — Validates commit messages
- **semantic-release** — Automated versioning and changelog
- **standard-version** — Changelog generation
- **lerna** — Monorepo versioning (uses conventional commits for change
  detection)
- **changesets** — Alternative monorepo versioning
- **release-please** — Google's release automation

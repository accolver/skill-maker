# Conventional Commits Specification — Quick Reference

Source: https://www.conventionalcommits.org/en/v1.0.0/

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Structural Elements

### Type (required)

Communicates intent to consumers of the library:

- **fix** — patches a bug (correlates with PATCH in SemVer)
- **feat** — introduces a new feature (correlates with MINOR in SemVer)
- Other types allowed: `build`, `chore`, `ci`, `docs`, `style`, `refactor`,
  `perf`, `test`

### Scope (optional)

A noun describing a section of the codebase, surrounded by parentheses:

```
feat(parser): add ability to parse arrays
```

### Description (required)

A short summary of the code changes. Rules:

- Immediately follows the colon and space after type/scope prefix
- Use imperative, present tense: "change" not "changed" nor "changes"

### Body (optional)

- Separated from description by a blank line
- Free-form, may consist of any number of newline-separated paragraphs
- MUST use imperative, present tense

### Footer (optional)

- One or more footers, each on a new line
- Each footer consists of a word token, `:<space>` or `<space>#`, and a value
- `BREAKING CHANGE` MUST be uppercase
- `BREAKING-CHANGE` (with hyphen) is also valid as a synonym

## Breaking Changes

A breaking change MUST be indicated by:

1. A `!` after the type/scope: `feat(api)!: send email on new product`
2. A `BREAKING CHANGE:` footer
3. Both can be used together

Breaking changes correlate with MAJOR in SemVer.

## SemVer Correlation

| Commit type       | SemVer bump |
| ----------------- | ----------- |
| `fix`             | PATCH       |
| `feat`            | MINOR       |
| `BREAKING CHANGE` | MAJOR       |
| Other types       | No bump     |

## Examples from the Spec

### Commit with description and breaking change footer

```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for
extending other config files
```

### Commit with `!` to draw attention to breaking change

```
feat!: send an email to the customer when a product is shipped
```

### Commit with both `!` and BREAKING CHANGE footer

```
chore!: drop support for Node 6

BREAKING CHANGE: use JavaScript features not available in Node 6.
```

### Commit with no body

```
docs: correct spelling of CHANGELOG
```

### Commit with scope

```
feat(lang): add Polish language
```

### Commit with multi-paragraph body and multiple footers

```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

## FAQ Highlights

- **What if a commit fits multiple types?** Go back and make multiple commits
  where possible. Part of the benefit is the ability to make more organized
  commits and PRs.
- **Does this discourage rapid development?** It encourages moving fast in an
  organized way. It helps you move fast long term across multiple projects with
  varied contributors.
- **What about revert commits?** The spec does not define revert behavior. It
  recommends using footer metadata: `Refs: <hash of reverted commit>`.

## Monorepo Conventions (Community Extension)

The spec does not define monorepo behavior, but the community convention is:

- Use the **package name** as the scope: `feat(auth): add login`
- For cross-package changes, list scopes: `feat(auth,api): add token refresh`
- For repo-wide changes, omit scope: `chore: update CI pipeline`
- Some teams use `*` for all-packages: `chore(*): bump TypeScript to 5.0`

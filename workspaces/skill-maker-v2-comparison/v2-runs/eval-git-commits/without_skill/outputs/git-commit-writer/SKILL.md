---
name: git-commit-writer
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, perf, style, build, ci), monorepo-aware scopes, imperative mood subjects, and BREAKING CHANGE footers. Includes a bundled diff parser script for structured analysis. Use when committing code, writing commit messages, preparing git commits, reviewing staged changes, or when the user says "commit this" or "write a commit message".
---

# Git Commit Writer

## Overview

Generate structured commit messages following the
[Conventional Commits](https://www.conventionalcommits.org/) specification by
analyzing staged git diffs. The format is `type(scope): description` with an
optional body and footer. This skill ensures agents produce consistent,
parseable commit messages that work with semantic versioning tools, changelogs,
and CI pipelines. It handles monorepo scopes by detecting package boundaries and
workspace structures.

## When to use

- When committing staged changes to a git repository
- When the user asks for help writing a commit message
- When preparing a commit after implementing a feature, fix, or refactor
- When the user says "commit this", "write a commit message", or similar
- When reviewing staged changes before committing
- When working in a monorepo and need package-scoped commits

**Do NOT use when:**

- The user explicitly provides their own commit message and just wants you to
  run `git commit`
- The repository uses a non-conventional commit format (check for
  `.commitlintrc`, `CONTRIBUTING.md`, or prior commit history first)
- There are no staged changes (`git diff --cached` is empty)

## Workflow

### 1. Gather the staged diff

Run these commands to understand what will be committed:

```bash
git diff --cached          # Full diff — the ground truth
git diff --cached --stat   # File-level summary for scope detection
git diff --cached --name-only  # Just file paths for monorepo detection
```

If nothing is staged, tell the user and stop. Never guess what changed — read
the diff.

### 2. Parse the diff for structured analysis

Run the bundled diff parser for structured output:

```bash
bun run scripts/parse-diff.ts
```

This reads `git diff --cached` and outputs a JSON summary with:

- Files changed (added, modified, deleted, renamed)
- Detected package/workspace scope (for monorepos)
- Change classification hints based on file paths and content patterns
- Line counts (additions, deletions) per file

Use this structured output to inform your type and scope decisions. If the
script is unavailable, fall back to manual diff analysis.

### 3. Classify the change type

Analyze the diff and select ONE primary type. Use the first matching rule:

| Type       | When to use                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| `feat`     | Adds new functionality visible to users (new endpoint, UI element, command) |
| `fix`      | Corrects a bug — something that was broken now works                        |
| `refactor` | Restructures code without changing behavior (rename, extract, reorganize)   |
| `docs`     | Only documentation changes (README, JSDoc, comments, docstrings)            |
| `test`     | Only test files changed (adding, updating, or fixing tests)                 |
| `perf`     | Performance improvement with no behavior change                             |
| `style`    | Formatting only (whitespace, semicolons, linting) — no logic changes        |
| `build`    | Build system or dependency changes (package.json, Dockerfile, Makefile)     |
| `ci`       | CI/CD configuration changes (GitHub Actions, Jenkins, CircleCI)             |
| `chore`    | Maintenance tasks that don't fit above (gitignore, editor config)           |

**Decision rules for ambiguous cases:**

- New file with a function → `feat` (new capability), not `chore`
- Bug fix that also refactors → `fix` (the primary intent matters)
- Test added alongside a feature → `feat` (the feature is the main change)
- Dependency update to fix a vulnerability → `fix`, not `build`
- Renaming a public API method → `refactor` with `BREAKING CHANGE` footer
- Lock file only changes → `chore`, not `build`

### 4. Identify the scope

The scope is the module, component, or area affected. It goes in parentheses:
`type(scope): ...`

**Standard repositories:**

- If all changes are in one directory/module → use that name (e.g., `auth`,
  `api`, `parser`)
- If changes span a single feature across files → use the feature name (e.g.,
  `login`, `search`)
- If changes are too broad to name → omit the scope: `type: description`

**Monorepo detection and scoping:**

1. Check for workspace configuration files:
   - `pnpm-workspace.yaml` → pnpm workspaces
   - Root `package.json` with `workspaces` field → npm/yarn workspaces
   - `lerna.json` → Lerna monorepo
   - `nx.json` → Nx monorepo
   - `turbo.json` → Turborepo

2. If changes are within a single package, use the package name as scope:
   - `packages/auth/src/login.ts` → scope is `auth`
   - `apps/web/components/Header.tsx` → scope is `web`

3. If changes span multiple packages, list them or use a broader scope:
   - Two packages → `feat(auth,api): add token refresh`
   - Many packages → omit scope or use the feature name

4. The diff parser script (`scripts/parse-diff.ts`) auto-detects monorepo
   boundaries and suggests scopes.

**Scope rules:**

- Single lowercase word or hyphenated phrase
- Never use file paths as scope
- Use package names from `package.json`, not directory paths

### 5. Write the subject line

The subject line is the most important part. Follow these rules strictly:

1. **Use imperative mood** — "add feature" not "added feature" or "adds
   feature". Test: "If applied, this commit will ___."
2. **50 characters or fewer** — Hard limit for the ENTIRE first line including
   `type(scope):`. Example: `feat(auth): add login endpoint` is 31 chars.
3. **No period at the end**
4. **Lowercase first letter after the colon** — `feat(auth): add login` not
   `feat(auth): Add login`
5. **Be specific** — "fix null pointer in user lookup" not "fix bug"
6. **Verify character count** — Count the full line. If close to 50, recount.

### 6. Write the body (if needed)

Add a body when the subject line alone doesn't explain WHY the change was made.
Separate from subject with a blank line.

**Include a body when:**

- The change is non-obvious (why this approach?)
- There's important context (related issue, design decision)
- The diff is large (summarize what changed and why)
- Multiple files changed (explain the relationship)

**Body rules:**

- Wrap at 72 characters per line
- Explain motivation and contrast with previous behavior
- Use bullet points for multiple related changes

**Skip the body when:**

- The change is self-explanatory (e.g., `fix(typo): correct spelling in README`)
- The subject line fully captures the intent

### 7. Add breaking change footer (if needed)

If the commit introduces a breaking change (removes/renames a public API,
changes behavior that consumers depend on), add a footer:

```
BREAKING CHANGE: <description of what breaks and migration path>
```

**Rules:**

- `BREAKING CHANGE` must be uppercase, followed by a colon and space
- Describe what breaks AND how to migrate
- Alternatively, add `!` after the type/scope: `feat(api)!: remove v1 endpoints`
- Both notations can be used together for maximum visibility

### 8. Present and confirm

Show the generated commit message to the user. If they approve, run:

```bash
git commit -m "<subject>" -m "<body>" -m "<footer>"
```

Or for simple commits without body/footer:

```bash
git commit -m "<subject>"
```

## Examples

### Example 1: Simple feature in a standard repo

**Diff summary:** New `validatePhoneNumber` function added to
`src/utils/validators.ts`

**Output:**

```
feat(validators): add phone number validation

Support E.164 format phone number validation for international
numbers. Returns false for empty strings and invalid formats.
```

### Example 2: Bug fix with breaking change

**Diff summary:** `getUser()` in `src/api/users.ts` changed from returning
`null` to throwing `NotFoundError`

**Output:**

```
fix(api): throw NotFoundError for missing users

getUser() previously returned null for missing users, which caused
silent failures downstream. Now throws NotFoundError with the user
ID for proper error handling.

BREAKING CHANGE: getUser() no longer returns null. Callers using
null checks must switch to try/catch with NotFoundError.
```

### Example 3: Monorepo feature across packages

**Diff summary:** New auth middleware in `packages/auth/src/middleware.ts` and
updated route handler in `packages/api/src/routes/protected.ts`

**Output:**

```
feat(auth,api): add JWT middleware for protected routes

Add authentication middleware to the auth package and wire it into
the API package's protected route handlers. Tokens are validated
using RS256 with key rotation support.
```

### Example 4: Monorepo single-package change

**Diff summary:** Performance fix in `packages/database/src/query-builder.ts`

**Output:**

```
perf(database): batch INSERT queries for bulk operations

Replace individual INSERT statements with batched queries using
parameterized VALUES lists. Reduces round trips from N to 1 for
bulk inserts, improving throughput by ~10x for large datasets.
```

## Common mistakes

| Mistake                                  | Fix                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Using past tense ("added feature")       | Use imperative mood ("add feature") — pretend the sentence starts with "This commit will..."  |
| Subject line over 50 characters          | Shorten aggressively. Move details to the body.                                               |
| Wrong type for ambiguous changes         | Ask: "What is the PRIMARY intent?" A fix that refactors is still a `fix`.                     |
| Using file paths as scope                | Use the module/feature name instead: `auth` not `src/middleware/auth.ts`                      |
| Missing BREAKING CHANGE footer           | Any public API change (signature, return type, removed method) needs this footer              |
| Vague subject ("fix bug", "update code") | Be specific: "fix null pointer in user lookup", "update rate limit to 100 req/s"              |
| Capitalizing first word after colon      | Lowercase: `feat: add thing` not `feat: Add thing`                                            |
| Adding a period at the end               | No period. `feat: add thing` not `feat: add thing.`                                           |
| Combining unrelated changes              | Each commit should be one logical change. Suggest splitting if the diff has unrelated changes |
| Using directory path as monorepo scope   | Use the package name from package.json, not the directory path                                |
| Missing scope in monorepo                | Always include package scope when changes are within a single monorepo package                |

## Quick reference

```
<type>(<scope>): <subject>     <- 50 chars max for full line
                                <- blank line
<body>                          <- 72 chars per line, explain WHY
                                <- blank line
<footer>                        <- BREAKING CHANGE: description
```

**Types:** `feat` | `fix` | `refactor` | `docs` | `test` | `perf` | `style` |
`build` | `ci` | `chore`

**Imperative mood test:** "If applied, this commit will `<subject>`"

**Scope:** Single lowercase word for the affected module. In monorepos, use the
package name. Omit if too broad.

**Monorepo scope detection:**

| Config file               | Tool      | Scope source                     |
| ------------------------- | --------- | -------------------------------- |
| `pnpm-workspace.yaml`     | pnpm      | Package directory name           |
| `package.json#workspaces` | npm/yarn  | Package directory name           |
| `lerna.json`              | Lerna     | Package `name` field             |
| `nx.json`                 | Nx        | Project name from `project.json` |
| `turbo.json`              | Turborepo | Package directory name           |

## Key principles

1. **The diff is the source of truth** — Always read `git diff --cached` before
   writing. Never assume what changed based on conversation context alone.
2. **Imperative mood, always** — "add", "fix", "remove", "update" — never past
   tense or third person. This matches git's own conventions (`Merge branch`,
   `Revert commit`).
3. **One logical change per commit** — If the diff contains unrelated changes,
   suggest the user split them into separate commits before writing the message.
4. **Subject line <= 50 characters** — This is a hard limit, not a guideline. It
   ensures readability across all git tooling. Move details to the body.
5. **Breaking changes must be explicit** — Any change to a public API
   (signature, return type, removed export) requires a `BREAKING CHANGE:`
   footer. This drives semantic versioning — missing it causes silent breaking
   releases.
6. **Monorepo scopes are package names** — In monorepos, always detect the
   workspace structure and use package names as scopes, not directory paths.

---
name: git-commit-helper
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, style, perf, ci, build) and optional monorepo scopes. Use when writing commit messages, committing code, preparing git commits, generating changelogs, or when the user mentions conventional commits, commit message formatting, or needs help describing staged changes.
---

# Git Commit Helper

## Overview

Generate well-structured conventional commit messages by analyzing staged git
changes. The skill parses diffs to determine the correct commit type, detects
monorepo scopes from file paths, and produces a concise message focused on the
"why" rather than the "what."

## When to use

- When writing or drafting a git commit message
- When the user asks for help describing staged changes
- When committing in a monorepo and scopes need to be detected
- When the user wants conventional commit format enforced
- When generating changelog-friendly commit messages

**Do NOT use when:**

- The user explicitly provides a complete commit message and just wants to run
  `git commit`
- The task is about git operations unrelated to commit messages (rebasing,
  merging, etc.)

## Workflow

### 1. Gather staged changes

Run the diff parsing script to analyze what is staged:

```bash
bun run scripts/parse-diff.ts --help
bun run scripts/parse-diff.ts
```

The script runs `git diff --cached --stat` and `git diff --cached` to collect:

- Files changed (added, modified, deleted)
- Diff content per file
- Detected monorepo scope from common path prefixes

If nothing is staged, inform the user and suggest `git add` first.

### 2. Determine commit type

Classify the change using these rules (check in order, first match wins):

| Type       | Signal                                                                |
| ---------- | --------------------------------------------------------------------- |
| `feat`     | New files with substantive logic, new exports, new API endpoints      |
| `fix`      | Bug-related changes — error handling, null checks, off-by-one fixes   |
| `refactor` | Restructured code with no behavior change — renames, extractions      |
| `docs`     | Only `.md`, comments, JSDoc, or documentation files changed           |
| `test`     | Only test files changed (`*.test.*`, `*.spec.*`, `__tests__/`)        |
| `style`    | Formatting-only — whitespace, semicolons, lint fixes, no logic change |
| `perf`     | Performance improvements — caching, algorithm optimization, lazy load |
| `ci`       | CI config files — `.github/workflows/`, `Jenkinsfile`, `.gitlab-ci.*` |
| `build`    | Build system — `package.json` deps, `Dockerfile`, `Makefile`, bundler |
| `chore`    | Everything else — config tweaks, gitignore, tooling, version bumps    |

When changes span multiple types, use the **most significant** type. A feat that
also updates tests is `feat`, not `test`.

### 3. Detect monorepo scope

If the repository has a `packages/`, `apps/`, `libs/`, `services/`, or
`modules/` directory structure, extract the scope from the common path prefix:

- `packages/auth/src/login.ts` → scope is `auth`
- `apps/web/pages/index.tsx` → scope is `web`
- Changes across multiple packages → omit scope or use the most significant one

The `parse-diff.ts` script outputs a `suggested_scope` field when it detects a
monorepo structure.

### 4. Compose the commit message

Format: `<type>(<scope>): <subject>`

Rules for the subject line:

- **Imperative mood** — "add feature" not "added feature" or "adds feature"
- **Lowercase first letter** — no capital after the colon
- **No period at the end**
- **Under 72 characters** total (type + scope + subject)
- **Focus on why** — "fix auth token expiry causing 401 on refresh" not "update
  token.ts"

If the change warrants a body, add it after a blank line:

```
feat(auth): add JWT refresh token rotation

Tokens now rotate on each refresh request to prevent replay attacks.
The old token is invalidated immediately after a new one is issued.

Closes #142
```

### 5. Present and confirm

Show the user:

1. The generated commit message
2. The detected type and reasoning
3. The detected scope (if any)
4. A summary of files changed

Ask if they want to adjust anything before committing.

## Checklist

- [ ] Staged changes analyzed with `parse-diff.ts`
- [ ] Commit type determined from diff content
- [ ] Monorepo scope detected (if applicable)
- [ ] Subject line is imperative, lowercase, under 72 chars, no trailing period
- [ ] Message focuses on "why" not "what"
- [ ] User confirmed or adjusted the message

## Examples

**Example: Simple feature addition**

Staged diff shows new file `src/utils/retry.ts` with an exponential backoff
retry function, plus an import added to `src/index.ts`.

Generated message:

```
feat: add exponential backoff retry utility

Provides a reusable retry wrapper with configurable max attempts
and backoff multiplier for flaky network calls.
```

**Example: Monorepo bug fix**

Staged diff shows changes to `packages/api/src/handlers/auth.ts` fixing a null
check on the user session object.

Generated message:

```
fix(api): handle null session in auth handler

The session object can be null when the Redis TTL expires before
the cookie. Added explicit null check to return 401 instead of
crashing with TypeError.
```

**Example: Multiple file types**

Staged diff shows changes to `Dockerfile`, `docker-compose.yml`, and
`.github/workflows/deploy.yml`.

Generated message:

```
ci: update deployment pipeline for multi-stage Docker builds
```

## Common mistakes

| Mistake                                                           | Fix                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Using past tense ("added feature")                                | Use imperative mood ("add feature")                                      |
| Capitalizing after the colon ("Fix: Add...")                      | Lowercase the subject ("fix: add...")                                    |
| Scope too broad ("fix(app): ...") when a specific package changed | Use the narrowest accurate scope from the file paths                     |
| Choosing `chore` for everything unclear                           | Check the type table in order — `chore` is the fallback, not the default |
| Subject describes the "what" ("update auth.ts")                   | Describe the "why" ("fix token expiry causing 401 errors")               |
| Exceeding 72 characters on the subject line                       | Move detail to the commit body after a blank line                        |
| Including a trailing period on the subject                        | Conventional commits omit the period                                     |
| Omitting scope in a monorepo                                      | Run `parse-diff.ts` — it detects scopes automatically                    |

## Quick reference

| Operation                  | How                                                            |
| -------------------------- | -------------------------------------------------------------- |
| Parse staged changes       | `bun run scripts/parse-diff.ts`                                |
| Parse with custom git dir  | `bun run scripts/parse-diff.ts --git-dir /path/to/repo`        |
| See script usage           | `bun run scripts/parse-diff.ts --help`                         |
| Conventional commit format | `<type>(<scope>): <subject>`                                   |
| Max subject length         | 72 characters                                                  |
| Allowed types              | feat, fix, refactor, docs, test, style, perf, ci, build, chore |

## Key principles

1. **Why over what** — The commit message explains the reason for the change,
   not a restatement of the diff. Agents and humans can read the diff; the
   message adds context they cannot infer.
2. **Conventional commits are a contract** — The type prefix is
   machine-parseable for changelogs and semantic versioning. Getting the type
   wrong breaks downstream tooling.
3. **Scope precision matters in monorepos** — A wrong scope pollutes changelogs
   for the wrong package. When in doubt, omit the scope rather than guess wrong.

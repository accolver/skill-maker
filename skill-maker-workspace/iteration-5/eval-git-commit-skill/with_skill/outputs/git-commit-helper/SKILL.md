---
name: git-commit-helper
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, style, perf, ci, build). Use when writing commit messages, committing code, preparing git commits, working with monorepos that need scoped commits, or when the user mentions conventional commits, commit message formatting, or changelog generation.
---

# Git Commit Helper

Generate high-quality conventional commit messages by analyzing staged git
changes. Handles monorepo scopes, breaking changes, and multi-file diffs.

## Overview

This skill analyzes `git diff --staged` output and produces a conventional
commit message following the
[Conventional Commits](https://www.conventionalcommits.org/) specification. It
determines the correct type prefix, optional scope, and writes a concise subject
line with an optional body for complex changes.

## When to use

- When committing code and you need a well-formatted commit message
- When working in a monorepo and need scoped commits (e.g., `feat(api): ...`)
- When you want consistent conventional commit formatting
- When preparing changelogs or release notes from commit history
- When the diff is large and you need to summarize changes meaningfully

**Do NOT use when:**

- There are no staged changes (`git diff --staged` is empty)
- The user explicitly provides their own commit message
- Amending a commit where the message should stay the same

## Workflow

### 1. Gather staged changes

Run `git diff --staged` to capture all staged changes. If nothing is staged,
inform the user and stop.

```bash
git diff --staged --stat   # overview of changed files
git diff --staged          # full diff for analysis
```

### 2. Analyze the diff

Use `scripts/parse-diff.ts` to extract structured information:

```bash
bun run scripts/parse-diff.ts --diff "$(git diff --staged)"
```

The script outputs JSON with file changes, detected type, and suggested scope.

### 3. Determine commit type

Select the type based on the nature of changes:

| Type       | When to use                                    |
| ---------- | ---------------------------------------------- |
| `feat`     | New feature or capability added                |
| `fix`      | Bug fix                                        |
| `chore`    | Maintenance, deps, config (no production code) |
| `refactor` | Code restructuring without behavior change     |
| `docs`     | Documentation only                             |
| `test`     | Adding or updating tests                       |
| `style`    | Formatting, whitespace, semicolons (no logic)  |
| `perf`     | Performance improvement                        |
| `ci`       | CI/CD configuration changes                    |
| `build`    | Build system or external dependency changes    |

**Priority rule:** If a diff contains both a feature and a fix, use `feat` as
the type. The most significant change wins.

### 4. Determine scope (monorepo)

For monorepos, detect the scope from the file paths:

- If all changed files are under `packages/foo/`, scope is `foo`
- If all changed files are under `apps/bar/`, scope is `bar`
- If files span multiple packages, omit the scope
- Common directories like `src/`, `lib/`, `utils/` are NOT scopes

### 5. Write the commit message

Format: `<type>(<scope>): <subject>`

Rules for the subject line:

- Lowercase first letter (no capital)
- No period at the end
- Imperative mood ("add" not "added" or "adds")
- Under 72 characters total (type + scope + subject)
- Describe WHAT changed, not HOW

Add a body (separated by blank line) when:

- The diff touches 5+ files
- There's a breaking change (prefix body with `BREAKING CHANGE:`)
- The "why" isn't obvious from the subject

### 6. Present and confirm

Show the generated message to the user. If they approve, execute:

```bash
git commit -m "<message>"
```

## Checklist

- [ ] Staged changes exist (non-empty diff)
- [ ] Diff parsed and analyzed
- [ ] Correct type prefix selected
- [ ] Scope determined (if monorepo)
- [ ] Subject line under 72 chars, imperative mood, no period
- [ ] Body added for complex changes
- [ ] Breaking changes flagged with `BREAKING CHANGE:` footer

## Examples

**Example: Simple feature addition**

Input: `git diff --staged` shows a new `UserProfile` component added

```
feat(ui): add user profile component
```

**Example: Bug fix in API package**

Input: Diff shows a null check added in `packages/api/src/auth.ts`

```
fix(api): handle null user in auth middleware

The middleware crashed when req.user was undefined for expired sessions.
Added a null check before accessing user properties.
```

**Example: Breaking change**

```
feat(api)!: change authentication to use JWT tokens

BREAKING CHANGE: The session-based auth endpoints have been removed.
Clients must now use Bearer tokens in the Authorization header.
```

## Common mistakes

| Mistake                              | Fix                                                  |
| ------------------------------------ | ---------------------------------------------------- |
| Using past tense ("added feature")   | Use imperative mood ("add feature")                  |
| Capitalizing subject ("Add feature") | Lowercase first letter ("add feature")               |
| Ending subject with period           | Remove the trailing period                           |
| Scope too broad ("feat(src): ...")   | Use package/app name, not generic dirs               |
| Type doesn't match changes           | Re-read the type table; most significant change wins |
| Subject over 72 chars                | Shorten subject, move details to body                |
| Missing BREAKING CHANGE footer       | Always add footer when public API changes            |
| Committing without staged changes    | Run `git add` first or inform user                   |

## Quick reference

| Operation           | Command                                                       |
| ------------------- | ------------------------------------------------------------- |
| Check staged files  | `git diff --staged --stat`                                    |
| Full staged diff    | `git diff --staged`                                           |
| Parse diff          | `bun run scripts/parse-diff.ts --diff "$(git diff --staged)"` |
| Commit with message | `git commit -m "type(scope): subject"`                        |
| Amend last commit   | `git commit --amend -m "new message"`                         |

## Key principles

1. **Conventional Commits spec is law** — Every message must follow
   `<type>[optional scope]: <description>`. No exceptions, no creative
   formatting.
2. **Imperative mood always** — Write "add" not "added" or "adds". The commit
   message completes the sentence "If applied, this commit will ___."
3. **Scope reflects architecture** — In monorepos, scope maps to the package or
   app directory. Never use generic directories like `src` or `lib` as scopes.
4. **Subject describes what, body explains why** — The subject line is a
   summary. Complex reasoning goes in the body, separated by a blank line.

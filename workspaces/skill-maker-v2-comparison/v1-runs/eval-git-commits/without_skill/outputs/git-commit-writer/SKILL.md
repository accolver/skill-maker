---
name: git-commit-writer
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, perf, style, build, ci), monorepo scope detection, and structured bodies. Use when committing code, writing commit messages, preparing git commits, reviewing staged changes, or when the user asks for help with commit messages. Includes a bundled diff parser script for structured analysis.
---

# Git Commit Writer

## Overview

Analyze staged git changes and generate conventional commit messages with the
correct type prefix, optional monorepo scope, imperative subject line, and
structured body. This skill includes a bundled diff parser script that extracts
structured metadata from git diffs to inform commit message generation.

## When to use

- When committing staged changes to a git repository
- When the user asks for help writing a commit message
- When preparing a commit after implementing a feature, fix, or refactor
- When the user says "commit this", "write a commit message", or similar
- When reviewing staged changes before committing
- When working in a monorepo and need proper scope detection

**Do NOT use when:**

- The user explicitly provides their own commit message
- The repository uses a non-conventional commit format (check `.commitlintrc`,
  `CONTRIBUTING.md`, or prior commit history first)
- There are no staged changes (`git diff --cached` is empty)

## Available scripts

- **`scripts/parse-diff.ts`** — Parse a git diff into structured JSON with file
  changes, change types, scope suggestions, and breaking change detection. Run
  with `bun run scripts/parse-diff.ts --help` for usage.

## Reference files

- **[references/conventional-commits-spec.md](references/conventional-commits-spec.md)**
  — Quick reference for the Conventional Commits specification and type
  definitions
- **[references/monorepo-scopes.md](references/monorepo-scopes.md)** — Guide for
  detecting and applying scopes in monorepo projects

## Workflow

### 1. Read the staged diff

Run `git diff --cached` to see exactly what will be committed. If nothing is
staged, tell the user and stop.

Also run `git diff --cached --stat` for a file-level summary.

**Why this matters:** The diff is the ground truth. Never guess what changed —
read it.

### 2. Parse the diff for structured analysis

Run the bundled diff parser to extract structured metadata:

```bash
git diff --cached | bun run scripts/parse-diff.ts
```

This produces JSON with:

- Files changed and their change types (added, modified, deleted, renamed)
- Suggested commit type based on change patterns
- Suggested scope based on common directory paths
- Breaking change indicators
- Lines added/removed per file

Use this structured output to inform your commit message, but apply judgment —
the parser's suggestions are heuristics, not rules.

### 3. Classify the change type

Select ONE primary type based on the diff analysis. Use the first matching rule:

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

### 4. Determine the scope

The scope is the module, component, or area affected. It goes in parentheses:
`type(scope): ...`

**Standard scope detection:**

- If all changes are in one directory/module → use that name (e.g., `auth`,
  `api`, `parser`)
- If changes span a single feature across files → use the feature name (e.g.,
  `login`, `search`)
- If changes are too broad to name → omit the scope: `type: description`

**Monorepo scope detection:**

In monorepos, scope should reflect the package or workspace affected:

- Check for `packages/`, `apps/`, `libs/`, `services/` directory patterns
- If all changes are within one package → use the package name as scope
- If changes span packages → use the most affected package, or omit scope
- Check `package.json` workspaces config or `pnpm-workspace.yaml` for package
  names
- Prefer the package's `name` field from its `package.json` over directory name

Scope should be a single lowercase word or hyphenated phrase. Never use file
paths as scope.

### 5. Write the subject line

The subject line is the most important part. Follow these rules strictly:

1. **Use imperative mood** — "add feature" not "added feature" or "adds
   feature". Write as if completing: "If applied, this commit will ___."
2. **50 characters or fewer** — Hard limit. Count the ENTIRE first line
   including `type(scope):`. If over 50, shorten or move details to the body.
3. **No period at the end**
4. **Lowercase first letter after the colon** — `feat(auth): add login` not
   `feat(auth): Add login`
5. **Be specific** — "fix null pointer in user lookup" not "fix bug"
6. **Verify character count** — Count before outputting. Better at 45 than
   risking over 50.

### 6. Write the body (if needed)

Add a body when the subject line alone doesn't explain WHY the change was made.
Separate from subject with a blank line.

**Include a body when:**

- The change is non-obvious (why this approach?)
- There's important context (related issue, design decision)
- The diff is large (summarize what changed and why)
- Multiple files are affected (explain the relationship)

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

### 8. Present the commit message

Output the complete commit message in a fenced code block. If the user approves,
run `git commit -m "<message>"` (or `-m` with `-m` for body/footer).

## Checklist

- [ ] Read `git diff --cached` — confirmed there are staged changes
- [ ] Ran diff parser for structured analysis
- [ ] Selected correct commit type based on primary intent
- [ ] Determined scope (or decided to omit for broad changes)
- [ ] Subject line is ≤ 50 characters total (verified by counting)
- [ ] Subject uses imperative mood, lowercase after colon, no period
- [ ] Body added if change is non-obvious (wrapped at 72 chars)
- [ ] Breaking changes have `BREAKING CHANGE:` footer with migration path
- [ ] Presented complete message for user approval

## Examples

### Example 1: Simple feature in a monorepo

**Staged diff summary:**

```
packages/auth/src/validators.ts | 12 ++++++++++++
1 file changed, 12 insertions(+)
```

**Diff:**

```diff
diff --git a/packages/auth/src/validators.ts b/packages/auth/src/validators.ts
index 1a2b3c4..5d6e7f8 100644
--- a/packages/auth/src/validators.ts
+++ b/packages/auth/src/validators.ts
@@ -15,6 +15,18 @@ export function validateEmail(email: string): boolean {
   return EMAIL_REGEX.test(email);
 }

+export function validatePhoneNumber(phone: string): boolean {
+  const E164_REGEX = /^\+[1-9]\d{6,14}$/;
+  if (!phone) return false;
+  return E164_REGEX.test(phone);
+}
```

**Output:**

```
feat(auth): add phone number validation

Support E.164 format phone number validation for international
numbers. Returns false for empty strings and invalid formats.
```

### Example 2: Bug fix with breaking change

**Diff:**

```diff
diff --git a/src/api/users.ts b/src/api/users.ts
--- a/src/api/users.ts
+++ b/src/api/users.ts
-export async function getUser(id: string): Promise<User | null> {
-  return db.users.findOne({ id });
+export async function getUser(id: string): Promise<User> {
+  const user = db.users.findOne({ id });
+  if (!user) throw new NotFoundError(`User ${id} not found`);
+  return user;
 }
```

**Output:**

```
fix(api): throw NotFoundError for missing users

getUser() previously returned null for missing users, causing
silent failures downstream. Now throws NotFoundError with the
user ID for proper error handling.

BREAKING CHANGE: getUser() no longer returns null. Callers using
null checks must switch to try/catch with NotFoundError.
```

### Example 3: Multi-package monorepo refactor

**Staged diff summary:**

```
packages/core/src/logger.ts         | 15 +++++----------
packages/api/src/middleware/log.ts   |  4 ++--
packages/worker/src/index.ts        |  2 +-
3 files changed, 8 insertions(+), 13 deletions(-)
```

**Output:**

```
refactor(core): simplify logger initialization

Replace manual log level configuration with environment-based
auto-detection. Updated API middleware and worker entry point
to use the new simplified interface.
```

## Common mistakes

| Mistake                                  | Fix                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Using past tense ("added feature")       | Use imperative mood ("add feature") — pretend: "This commit will..."                       |
| Subject line over 50 characters          | Shorten aggressively. Move details to the body.                                            |
| Wrong type for ambiguous changes         | Ask: "What is the PRIMARY intent?" A fix that refactors is still a `fix`.                  |
| Using file paths as scope                | Use the module/feature name: `auth` not `src/middleware/auth.ts`                           |
| Missing BREAKING CHANGE footer           | Any public API change (signature, return type, removed method) needs this footer           |
| Vague subject ("fix bug", "update code") | Be specific: "fix null pointer in user lookup"                                             |
| Capitalizing first word after colon      | Lowercase: `feat: add thing` not `feat: Add thing`                                         |
| Adding a period at the end               | No period. `feat: add thing` not `feat: add thing.`                                        |
| Using directory name instead of package  | In monorepos, use the package's `name` from `package.json`                                 |
| Combining unrelated changes              | Each commit should be one logical change. Suggest splitting if diff has unrelated changes. |

## Quick reference

```
<type>(<scope>): <subject>     ← 50 chars max for full line
                                ← blank line
<body>                          ← 72 chars per line, explain WHY
                                ← blank line
<footer>                        ← BREAKING CHANGE: description
```

**Types:** `feat` | `fix` | `refactor` | `docs` | `test` | `perf` | `style` |
`build` | `ci` | `chore`

**Imperative mood test:** "If applied, this commit will `<subject>`"

**Scope:** Single lowercase word for the affected module. In monorepos, use the
package name.

## Key principles

1. **The diff is the source of truth** — Always read `git diff --cached` before
   writing. Never assume what changed based on conversation context alone.
2. **Imperative mood, always** — "add", "fix", "remove", "update" — never past
   tense or third person. This matches git's own conventions.
3. **One logical change per commit** — If the diff contains unrelated changes,
   suggest the user split them into separate commits.
4. **Subject line ≤ 50 characters** — This is a hard limit, not a guideline.
   Count the ENTIRE first line including `type(scope):`.
5. **Breaking changes must be explicit** — Any change to a public API requires a
   `BREAKING CHANGE:` footer. Missing it causes silent breaking releases.
6. **Monorepo scopes reflect packages, not paths** — Use the package name from
   `package.json`, not the directory structure.

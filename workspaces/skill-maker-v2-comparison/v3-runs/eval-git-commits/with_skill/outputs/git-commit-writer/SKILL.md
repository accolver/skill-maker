---
name: git-commit-writer
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, perf, style, build, ci), monorepo-aware scopes, breaking change footers, and multi-line bodies. Includes a bundled diff parser script for structured change analysis. Use when committing code, writing commit messages, preparing git commits, reviewing staged changes, or when the user mentions commit messages, conventional commits, or asks to commit their work.
---

# Git Commit Writer

Analyze staged git changes and generate structured conventional commit messages.
Includes a bundled diff parser for programmatic change analysis, monorepo scope
detection, and multi-commit splitting recommendations.

## Overview

This skill reads `git diff --cached`, classifies changes by type and scope, and
produces commit messages following the
[Conventional Commits](https://www.conventionalcommits.org/) specification. It
handles monorepo layouts where scope must reflect the package or workspace, not
just the nearest directory. The bundled `parse-diff.ts` script extracts
structured metadata from diffs for deterministic analysis.

## When to use

- When committing staged changes to a git repository
- When the user asks for help writing a commit message
- When preparing a commit after implementing a feature, fix, or refactor
- When the user says "commit this", "write a commit message", or similar
- When working in a monorepo and scope detection matters
- When reviewing staged changes before committing
- When the user wants to split a large diff into multiple commits

**Do NOT use when:**

- The user explicitly provides their own commit message and just wants
  `git commit`
- The repository uses a non-conventional format (check `.commitlintrc`,
  `CONTRIBUTING.md`, or recent `git log --oneline -10` first)
- There are no staged changes (`git diff --cached` is empty)

## Available scripts

- **`scripts/parse-diff.ts`** — Parse a git diff into structured JSON with
  per-file change classification, scope detection, and monorepo package mapping.
  Run with `bun run scripts/parse-diff.ts --help` for usage.

## Workflow

### 1. Gather context

Run these commands to understand the staged changes:

```bash
git diff --cached --stat
git diff --cached
```

If nothing is staged, tell the user and stop. Do not guess from unstaged changes
or conversation context.

Optionally, check for monorepo indicators:

```bash
# Check for workspace config files
ls pnpm-workspace.yaml lerna.json package.json 2>/dev/null
# Check for packages/ or apps/ directories
ls -d packages/ apps/ libs/ modules/ 2>/dev/null
```

### 2. Parse the diff (optional but recommended for large diffs)

For diffs touching 3+ files or 100+ lines, use the bundled parser for structured
analysis:

```bash
git diff --cached | bun run scripts/parse-diff.ts
```

This outputs JSON with per-file metadata:

```json
{
  "files": [
    {
      "path": "packages/auth/src/login.ts",
      "status": "modified",
      "additions": 15,
      "deletions": 3,
      "package": "auth",
      "directory": "src",
      "suggestedType": "feat",
      "hasNewExports": true,
      "hasBreakingChange": false
    }
  ],
  "summary": {
    "totalFiles": 3,
    "totalAdditions": 42,
    "totalDeletions": 8,
    "packages": ["auth", "shared"],
    "suggestedType": "feat",
    "suggestedScope": "auth",
    "isMonorepo": true,
    "shouldSplit": false
  }
}
```

Use this output to inform type, scope, and splitting decisions. The script's
suggestions are heuristics — override them when your reading of the diff
disagrees.

### 3. Classify the change type

Select ONE primary type based on the diff content. Use the first matching rule:

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

**Ambiguity rules:**

- New file with a function → `feat` (new capability), not `chore`
- Bug fix that also refactors → `fix` (primary intent wins)
- Test added alongside a feature → `feat` (feature is the main change)
- Dependency update to fix a vulnerability → `fix`, not `build`
- Renaming a public API method → `refactor` with `BREAKING CHANGE` footer
- Config file for a new feature → `feat` (the feature is what matters)
- Deleting dead code → `refactor` (restructuring), not `chore`

### 4. Determine the scope

The scope identifies the affected module, component, or package.

**Monorepo scope rules (use these when a monorepo is detected):**

1. If all changes are within one package → use the package name:
   `feat(auth): add login endpoint`
2. If changes span packages but one is primary → use the primary package:
   `fix(api): correct validation, update shared types`
3. If changes are in shared/common code → use `shared` or `core`:
   `refactor(shared): extract common error types`
4. If changes span many packages equally → omit scope or use a feature name:
   `feat: add dark mode across all packages`

**Standard (non-monorepo) scope rules:**

1. All changes in one directory/module → use that name: `auth`, `api`, `parser`
2. Changes span a single feature across files → use the feature name: `login`
3. Changes too broad to name → omit scope: `type: description`

**Scope formatting:**

- Single lowercase word or hyphenated phrase
- Never use file paths as scope (`src/middleware/auth.ts` → `auth`)
- Never use multiple scopes (`auth,api` → pick the primary one)

### 5. Write the subject line

The subject line is the most critical part. Follow these rules strictly:

1. **Imperative mood** — "add feature" not "added feature" or "adds feature".
   Test: "If applied, this commit will ___."
2. **50 characters max for the full first line** — Count `type(scope):` as part
   of the limit. `feat(auth): add login endpoint` = 31 chars. If over 50,
   shorten the description or move details to the body.
3. **No period at the end**
4. **Lowercase first letter after the colon** — `feat(auth): add` not
   `feat(auth): Add`
5. **Be specific** — "fix null pointer in user lookup" not "fix bug"
6. **Verify the count** — Count characters before outputting. If close to 50,
   recount. Better at 45 than over 50.

### 6. Write the body (when needed)

Add a body when the subject line alone doesn't explain WHY. Separate from
subject with a blank line.

**Include a body when:**

- The change is non-obvious (why this approach over alternatives?)
- There's important context (related issue, design decision, trade-off)
- The diff is large (summarize what changed and why)
- Multiple files changed (explain the relationship between changes)

**Body rules:**

- Wrap at 72 characters per line
- Explain motivation and contrast with previous behavior
- Use bullet points for multiple related changes
- Reference issues with `Closes #123` or `Refs #456` in the footer

**Skip the body when:**

- The change is self-explanatory (`fix(typo): correct spelling in README`)
- The subject line fully captures the intent

### 7. Add footers (when needed)

**Breaking changes:**

If the commit changes a public API (removes/renames exports, changes function
signatures, alters return types), add:

```
BREAKING CHANGE: <what breaks and how to migrate>
```

Rules:

- `BREAKING CHANGE` must be uppercase, followed by colon and space
- Describe what breaks AND the migration path
- Optionally add `!` after type/scope: `feat(api)!: remove v1 endpoints`
- Both notations can be used together for maximum visibility

**Issue references:**

```
Closes #123
Refs #456, #789
```

### 8. Recommend splitting (when appropriate)

If the diff contains unrelated changes, recommend splitting into separate
commits. Signs that splitting is needed:

- Changes to unrelated modules with no shared purpose
- A feature addition mixed with an unrelated bug fix
- Formatting changes mixed with logic changes
- The parse-diff script sets `shouldSplit: true`

When recommending a split, suggest specific groupings:

```
I recommend splitting this into 2 commits:
1. `fix(auth): handle expired token refresh` — changes to auth.ts
2. `style(api): apply prettier formatting` — formatting in routes.ts, handlers.ts
```

## Checklist

- [ ] Read `git diff --cached` (stop if empty)
- [ ] Classify change type using the type table
- [ ] Determine scope (check for monorepo layout)
- [ ] Write subject line in imperative mood, ≤50 chars total
- [ ] Add body if change is non-obvious or multi-file
- [ ] Add `BREAKING CHANGE:` footer if public API changed
- [ ] Verify character count on subject line
- [ ] Recommend splitting if diff contains unrelated changes

## Examples

### Example 1: Monorepo feature in a single package

**Context:** Monorepo with `packages/auth/`, `packages/api/`, `packages/shared/`

**Diff:**

```diff
diff --git a/packages/auth/src/providers/github.ts b/packages/auth/src/providers/github.ts
new file mode 100644
--- /dev/null
+++ b/packages/auth/src/providers/github.ts
@@ -0,0 +1,45 @@
+import { OAuthProvider } from '../types';
+import { httpClient } from '@myapp/shared';
+
+export class GitHubProvider implements OAuthProvider {
+  readonly name = 'github';
+
+  async getAuthUrl(state: string): Promise<string> {
+    const params = new URLSearchParams({
+      client_id: process.env.GITHUB_CLIENT_ID!,
+      redirect_uri: process.env.GITHUB_REDIRECT_URI!,
+      scope: 'read:user user:email',
+      state,
+    });
+    return `https://github.com/login/oauth/authorize?${params}`;
+  }
+
+  async handleCallback(code: string): Promise<UserProfile> {
+    const token = await this.exchangeCode(code);
+    return this.fetchProfile(token);
+  }
+}

diff --git a/packages/auth/src/providers/index.ts b/packages/auth/src/providers/index.ts
--- a/packages/auth/src/providers/index.ts
+++ b/packages/auth/src/providers/index.ts
@@ -1,3 +1,4 @@
 export { GoogleProvider } from './google';
+export { GitHubProvider } from './github';
 export type { OAuthProvider } from '../types';
```

**Output:**

```
feat(auth): add GitHub OAuth provider

Implement GitHubProvider with authorization URL generation and
callback handling. Supports read:user and user:email scopes.
Follows the same OAuthProvider interface as GoogleProvider.
```

### Example 2: Cross-package fix with breaking change

**Diff (abbreviated):**

```diff
diff --git a/packages/shared/src/errors.ts b/packages/shared/src/errors.ts
--- a/packages/shared/src/errors.ts
+++ b/packages/shared/src/errors.ts
@@ -1,5 +1,12 @@
-export class AppError extends Error {
-  constructor(message: string) {
+export class AppError extends Error {
+  constructor(
+    message: string,
+    public readonly code: string,
+    public readonly statusCode: number = 500
+  ) {
     super(message);
   }
 }

diff --git a/packages/api/src/middleware/error-handler.ts b/packages/api/src/middleware/error-handler.ts
--- a/packages/api/src/middleware/error-handler.ts
+++ b/packages/api/src/middleware/error-handler.ts
@@ -3,7 +3,7 @@
 export function errorHandler(err, req, res, next) {
   if (err instanceof AppError) {
-    res.status(500).json({ error: err.message });
+    res.status(err.statusCode).json({ error: err.message, code: err.code });
   }
 }
```

**Output:**

```
fix(shared): add error code and status to AppError

AppError now requires a code string and accepts an optional
statusCode (defaults to 500). The API error handler uses these
fields to return structured error responses.

BREAKING CHANGE: AppError constructor now requires a second
argument (code: string). Update all `new AppError(msg)` calls
to `new AppError(msg, 'ERROR_CODE')`.
```

## Common mistakes

| Mistake                                    | Fix                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Using past tense ("added feature")         | Imperative mood: "add feature". Test: "This commit will ___."                     |
| Subject line over 50 characters            | Shorten aggressively. Move details to the body.                                   |
| Wrong type for ambiguous changes           | Ask: "What is the PRIMARY intent?" A fix that refactors is still a `fix`.         |
| Using file paths as scope                  | Use module/feature name: `auth` not `src/middleware/auth.ts`                      |
| Missing BREAKING CHANGE footer             | Any public API change (signature, return type, removed export) needs this footer. |
| Vague subject ("fix bug", "update code")   | Be specific: "fix null pointer in user lookup"                                    |
| Capitalizing first word after colon        | Lowercase: `feat: add thing` not `feat: Add thing`                                |
| Period at end of subject                   | No period. `feat: add thing` not `feat: add thing.`                               |
| Using package path as monorepo scope       | Use package name: `auth` not `packages/auth`                                      |
| Combining unrelated changes in one commit  | Recommend splitting. Each commit = one logical change.                            |
| Multiple scopes like `feat(auth,api):`     | Pick the primary scope. Mention others in the body.                               |
| Guessing changes from conversation context | Always read `git diff --cached`. The diff is the source of truth.                 |

## Quick reference

```
<type>(<scope>): <subject>     ← 50 chars max for full line
                                ← blank line
<body>                          ← 72 chars per line, explain WHY
                                ← blank line
<footer>                        ← BREAKING CHANGE: what + migration
                                ← Closes #123
```

**Types:** `feat` | `fix` | `refactor` | `docs` | `test` | `perf` | `style` |
`build` | `ci` | `chore`

**Imperative mood test:** "If applied, this commit will `<subject>`"

**Scope:** Single lowercase word for the affected module/package. Omit if broad.

**Monorepo scope:** Use the package name from `packages/<name>/` or
`apps/<name>/`, not the full path.

## Key principles

1. **The diff is the source of truth** — Always read `git diff --cached` before
   writing. Never assume what changed based on conversation context alone. The
   diff tells you what happened; the body explains why.
2. **Imperative mood, always** — "add", "fix", "remove", "update" — never past
   tense or third person. This matches git's own conventions (`Merge branch`,
   `Revert commit`).
3. **One logical change per commit** — If the diff contains unrelated changes,
   recommend splitting before writing the message. Mixed commits make bisecting,
   reverting, and changelog generation unreliable.
4. **Subject line ≤ 50 characters** — This is a hard limit, not a guideline.
   Count the full line including `type(scope):`. It ensures readability in
   `git log --oneline`, GitHub PR lists, and terminal UIs.
5. **Breaking changes must be explicit** — Any change to a public API
   (signature, return type, removed export) requires a `BREAKING CHANGE:`
   footer. This drives semantic versioning — missing it causes silent breaking
   releases.

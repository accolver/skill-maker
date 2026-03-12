---
name: git-commit-writer
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, perf, style, build, ci), monorepo-aware scopes, and optional body/footer. Includes a bundled diff parser script. Use when committing code, writing commit messages, staging changes, preparing git commits, or when the user mentions commit messages, conventional commits, changelogs, or semantic versioning.
---

# Git Commit Writer

## Overview

Generate high-quality conventional commit messages by analyzing staged git
diffs. This skill reads the actual diff, classifies the change type, detects
monorepo scopes from directory structure, and composes a structured message
following the [Conventional Commits](https://www.conventionalcommits.org/) spec.
It bundles a diff parser script that extracts structured metadata from
`git diff --cached` output to assist with type classification and scope
detection.

## When to use

- When committing staged changes to any git repository
- When the user asks for help writing a commit message
- When preparing a commit after implementing a feature, fix, or refactor
- When working in a monorepo and needing package/workspace-aware scopes
- When the user says "commit this", "write a commit", or similar
- When reviewing staged changes before committing

**Do NOT use when:**

- The user provides their own commit message verbatim
- The repository uses a non-conventional format (check `.commitlintrc`,
  `CONTRIBUTING.md`, or recent `git log --oneline -10` first)
- There are no staged changes (`git diff --cached` is empty)

## Workflow

### 1. Gather the diff

Run the bundled diff parser to get structured metadata:

```bash
bun run scripts/parse-diff.ts
```

This outputs JSON with file-level changes, detected scope candidates, and
heuristic type signals. If the script is unavailable, fall back to:

```bash
git diff --cached
git diff --cached --stat
```

**Why this matters:** The diff is the single source of truth. Never infer
changes from conversation context — always read the actual staged diff.

### 2. Detect monorepo scope

If the repository has a monorepo structure (e.g., `packages/`, `apps/`,
`services/`, `libs/`), detect the scope from the changed file paths:

1. Check if all changed files share a common monorepo package prefix
2. If yes, use the package name as scope (e.g., `packages/auth` -> `auth`)
3. If files span multiple packages, either:
   - Omit scope if changes are truly cross-cutting
   - Use the primary package (the one with the most substantive changes)
4. If not a monorepo, fall back to module/directory-based scope detection

**Monorepo indicators:**

- `package.json` with `workspaces` field
- `pnpm-workspace.yaml`
- `lerna.json`
- `nx.json` or `project.json` files
- `turbo.json`
- Directory patterns: `packages/*/`, `apps/*/`, `services/*/`, `libs/*/`

**Scope rules:**

- Single lowercase word or hyphenated phrase
- Never use file paths as scope (`auth` not `src/middleware/auth.ts`)
- Omit scope if changes are too broad to name meaningfully
- For monorepos, prefer the package name over internal module names

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

**Ambiguous case rules:**

- New file with a function -> `feat` (new capability), not `chore`
- Bug fix that also refactors -> `fix` (primary intent wins)
- Test added alongside a feature -> `feat` (feature is the main change)
- Dependency update for vulnerability -> `fix`, not `build`
- Renaming a public API method -> `refactor` with `BREAKING CHANGE` footer
- Config file for a new feature -> `feat` (the feature is what matters)
- Deleting dead code -> `refactor` (restructuring), not `chore`

### 4. Compose the subject line

The subject line is the most critical part. Follow these rules strictly:

1. **Imperative mood** — "add feature" not "added feature" or "adds feature".
   Test: "If applied, this commit will ___."
2. **50 characters max** — Count the ENTIRE first line including `type(scope):`.
   Example: `feat(auth): add login endpoint` = 31 chars.
3. **No period at the end**
4. **Lowercase first letter after colon-space** — `feat: add thing` not
   `feat: Add thing`
5. **Be specific** — "fix null pointer in user lookup" not "fix bug"
6. **Verify character count** — Count before outputting. If close to 50,
   recount. Better to be at 45 than risk going over.

### 5. Write the body (when needed)

Add a body when the subject alone doesn't explain WHY. Separate from subject
with a blank line.

**Include a body when:**

- The change is non-obvious (why this approach over alternatives?)
- There's important context (related issue, design decision, tradeoff)
- The diff is large (summarize what changed across files)
- Multiple files changed in a monorepo package

**Body rules:**

- Wrap at 72 characters per line
- Explain motivation and contrast with previous behavior
- Use bullet points for multiple related changes
- Reference issue numbers if mentioned by the user

**Skip the body when:**

- The change is self-explanatory (`fix(typo): correct spelling in README`)
- The subject line fully captures the intent

### 6. Add footer (when needed)

**Breaking changes:**

```
BREAKING CHANGE: <what breaks and how to migrate>
```

- `BREAKING CHANGE` must be uppercase, followed by colon and space
- Describe what breaks AND the migration path
- Can also use `!` after type/scope: `feat(api)!: remove v1 endpoints`

**Issue references:**

```
Closes #123
Refs #456, #789
```

### 7. Validate and present

Before presenting the commit message:

- [ ] Subject line is 50 chars or fewer (count the full line)
- [ ] Imperative mood used
- [ ] Type is correct for the primary change
- [ ] Scope matches the affected module/package (or omitted if too broad)
- [ ] No period at end of subject
- [ ] Lowercase after colon-space
- [ ] Body wrapped at 72 chars (if present)
- [ ] BREAKING CHANGE footer included if public API changed
- [ ] Single logical change (suggest splitting if diff has unrelated changes)

Present the message in a fenced code block. If the user approves, run:

```bash
git commit -m "<subject>" -m "<body>" -m "<footer>"
```

Or for simple commits without body:

```bash
git commit -m "<subject>"
```

## Available scripts

### `scripts/parse-diff.ts`

Parses `git diff --cached` output and returns structured JSON metadata.

```bash
bun run scripts/parse-diff.ts [--help] [--diff-input <file>]
```

**Output format:**

```json
{
  "files": [
    {
      "path": "packages/auth/src/login.ts",
      "status": "modified",
      "additions": 15,
      "deletions": 3,
      "is_new": false,
      "is_deleted": false,
      "is_renamed": false
    }
  ],
  "summary": {
    "total_files": 3,
    "total_additions": 42,
    "total_deletions": 10
  },
  "scope_candidates": ["auth"],
  "monorepo_detected": true,
  "monorepo_type": "packages",
  "type_signals": {
    "has_test_files": false,
    "has_doc_files": false,
    "has_ci_files": false,
    "has_build_files": false,
    "has_new_exports": true,
    "has_deleted_exports": false,
    "primary_language": "typescript"
  }
}
```

Use this metadata to inform type classification and scope detection, but always
read the full diff for the final decision — the script provides heuristics, not
definitive answers.

## Examples

### Example 1: Monorepo feature addition

**Context:** Working in a monorepo with `packages/` structure.

**Diff (`git diff --cached --stat`):**

```
packages/auth/src/providers/oauth.ts  | 45 +++++++++++++++
packages/auth/src/providers/index.ts  |  3 ++
packages/auth/tests/oauth.test.ts     | 28 ++++++++++
3 files changed, 76 insertions(+)
```

**Output:**

```
feat(auth): add OAuth provider support

Implement OAuth 2.0 authorization code flow with PKCE for
third-party authentication. Includes Google and GitHub providers
with extensible base class for adding more.
```

### Example 2: Cross-package monorepo fix

**Diff (`git diff --cached --stat`):**

```
packages/api/src/middleware/cors.ts    |  5 +++--
packages/shared/src/config/defaults.ts |  2 +-
packages/web/src/api/client.ts         |  3 ++-
3 files changed, 6 insertions(+), 4 deletions(-)
```

**Output:**

```
fix: align CORS origin config across packages

The API, shared config, and web client each had different CORS
origin values causing cross-origin failures in staging. Unified
to use the shared config defaults.
```

Note: scope omitted because changes span three packages with no clear primary.

### Example 3: Breaking change with migration

**Diff:**

```diff
diff --git a/src/api/v2/users.ts b/src/api/v2/users.ts
--- a/src/api/v2/users.ts
+++ b/src/api/v2/users.ts
@@ -12,8 +12,10 @@
-export async function getUsers(page: number): Promise<User[]> {
+export async function getUsers(options: PaginationOptions): Promise<PaginatedResponse<User>> {
+  const { page, limit = 20, cursor } = options;
   // ...
```

**Output:**

```
feat(api)!: add cursor-based pagination to getUsers

Replace positional page parameter with PaginationOptions object
supporting both offset and cursor-based pagination. Response now
includes total count and next cursor.

BREAKING CHANGE: getUsers() signature changed from (page: number)
to (options: PaginationOptions). Return type changed from User[]
to PaginatedResponse<User>. Update all callers to pass an options
object and handle the wrapped response.
```

## Common mistakes

| Mistake                                   | Fix                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| Using past tense ("added feature")        | Imperative mood: "add feature". Test: "This commit will ___."                     |
| Subject line over 50 characters           | Shorten aggressively. Move details to body.                                       |
| Using file paths as scope                 | Use module/package name: `auth` not `packages/auth/src/login.ts`                  |
| Missing BREAKING CHANGE footer            | Any public API change (signature, return type, removed export) needs this footer. |
| Vague subject ("fix bug", "update code")  | Be specific: "fix null pointer in user lookup"                                    |
| Capitalizing after colon                  | Lowercase: `feat: add thing` not `feat: Add thing`                                |
| Period at end of subject                  | No period. `feat: add thing` not `feat: add thing.`                               |
| Wrong type for ambiguous changes          | Ask: "What is the PRIMARY intent?" Fix that refactors is still `fix`.             |
| Combining unrelated changes               | Suggest splitting into separate commits.                                          |
| Monorepo scope too specific               | Use package name (`auth`) not internal path (`auth/providers`)                    |
| Monorepo scope when changes span packages | Omit scope for cross-cutting changes rather than picking an arbitrary package.    |
| Not reading the diff                      | Always run `git diff --cached`. Never guess from conversation.                    |

## Quick reference

```
<type>(<scope>): <subject>     <- 50 chars max for full line
                                <- blank line
<body>                          <- 72 chars per line, explain WHY
                                <- blank line
<footer>                        <- BREAKING CHANGE: description
                                <- Closes #123
```

**Types:** `feat` | `fix` | `refactor` | `docs` | `test` | `perf` | `style` |
`build` | `ci` | `chore`

**Imperative mood test:** "If applied, this commit will `<subject>`"

**Monorepo scope:** Use the package/workspace name, not internal paths.

## Key principles

1. **The diff is the source of truth** — Always read `git diff --cached` before
   writing. Never assume what changed based on conversation context alone. Run
   the parse-diff script when available for structured metadata.
2. **Imperative mood, always** — "add", "fix", "remove", "update" — never past
   tense or third person. This matches git's own conventions (`Merge branch`,
   `Revert commit`).
3. **One logical change per commit** — If the diff contains unrelated changes,
   suggest the user split them into separate commits before writing the message.
4. **Subject line <= 50 characters** — This is a hard limit, not a guideline.
   Count the ENTIRE line including `type(scope):`. Move details to the body.
5. **Monorepo awareness** — Detect workspace structure and use package names as
   scopes. Omit scope for cross-cutting changes rather than picking arbitrarily.
6. **Breaking changes must be explicit** — Any change to a public API requires a
   `BREAKING CHANGE:` footer. This drives semantic versioning — missing it
   causes silent breaking releases.

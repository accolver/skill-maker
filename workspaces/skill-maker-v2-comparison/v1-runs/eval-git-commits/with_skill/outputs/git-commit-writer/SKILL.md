---
name: git-commit-writer
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, perf, style, build, ci), monorepo-aware scoping, and optional body/footer. Includes a bundled diff parser script. Use when committing code, writing commit messages, preparing git commits, staging changes, or when the user mentions commit messages, conventional commits, or monorepo commits.
---

# Git Commit Writer

## Overview

Analyze staged git diffs and generate conventional commit messages with the
correct type prefix, monorepo-aware scope, imperative subject line, and
structured body/footer. Bundles a diff parser script that extracts structured
change metadata from `git diff --cached` output to drive accurate type
classification and scope detection.

## When to use

- When committing staged changes to any git repository
- When the user asks for help writing a commit message
- When working in a monorepo and need package/workspace-scoped commits
- When preparing a commit after implementing a feature, fix, or refactor
- When the user says "commit this", "write a commit", or similar

**Do NOT use when:**

- The user provides their own commit message verbatim
- The repository uses a non-conventional format (check `.commitlintrc`,
  `CONTRIBUTING.md`, or recent `git log --oneline -10` first)
- There are no staged changes (`git diff --cached` is empty)

## Available scripts

- **`scripts/parse-diff.ts`** — Parse `git diff --cached` output into structured
  JSON with file classifications, scope detection, and change statistics. Run
  with `bun run scripts/parse-diff.ts` or pipe diff input via stdin.

## Workflow

### 1. Gather staged changes

Run the diff parser to get structured change data:

```bash
git diff --cached | bun run scripts/parse-diff.ts
```

If no diff is available or the script can't run, fall back to manual analysis:

```bash
git diff --cached --stat
git diff --cached
```

**Why a script:** Raw diffs are noisy. The parser extracts file paths, change
types, line counts, and detects monorepo package boundaries — giving you
structured data to reason about instead of raw text.

### 2. Classify the change type

Use the parser output's `suggested_type` field, or classify manually using the
first matching rule:

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

- New file with a function → `feat` (new capability)
- Bug fix that also refactors → `fix` (primary intent wins)
- Test added alongside a feature → `feat` (feature is the main change)
- Dependency update for a vulnerability → `fix`, not `build`
- Renaming a public API method → `refactor` with `BREAKING CHANGE` footer

### 3. Determine scope (monorepo-aware)

The scope identifies the affected module or package. The parser detects monorepo
boundaries automatically.

**Monorepo detection:**

The parser looks for common monorepo patterns:

- `packages/<name>/` — npm/yarn workspaces
- `apps/<name>/` — Turborepo, Nx app directories
- `libs/<name>/` or `modules/<name>/` — shared library directories
- `services/<name>/` — microservice directories

If all changes are within one package, use that package name as scope:
`feat(auth-service): add OAuth2 flow`

If changes span multiple packages, consider:

1. **Shared concern** — use the feature name: `feat(oauth): add token refresh`
2. **Infrastructure** — use `monorepo` or omit scope:
   `chore: update workspace deps`
3. **Split the commit** — suggest splitting if changes are truly unrelated

**Single-repo scope rules:**

- All changes in one directory/module → use that name (`auth`, `api`, `parser`)
- Changes span a single feature → use the feature name (`login`, `search`)
- Changes too broad → omit scope: `type: description`
- Never use file paths as scope — `auth` not `src/middleware/auth.ts`

### 4. Write the subject line

The subject line is the most critical part. Follow these rules strictly:

1. **Imperative mood** — "add feature" not "added feature". Test: "If applied,
   this commit will ___."
2. **50 characters max** — Count the ENTIRE first line including `type(scope):`.
   If over 50, shorten or move details to body.
3. **No trailing period**
4. **Lowercase after colon** — `feat(auth): add login` not
   `feat(auth): Add login`
5. **Be specific** — "fix null pointer in user lookup" not "fix bug"

**Character counting tip:** `feat(auth):` is already 13 characters, leaving only
37 for the description. Longer scopes eat into your budget. If the scope is long
(e.g., `payment-processor`), consider abbreviating or omitting it.

### 5. Write the body (when needed)

Add a body when the subject alone doesn't explain WHY. Separate from subject
with a blank line.

**Include a body when:**

- The change is non-obvious (why this approach over alternatives?)
- Important context exists (related issue, design decision, trade-off)
- The diff is large (summarize what changed across files)
- Monorepo changes affect multiple packages (explain the cross-cutting concern)

**Body rules:**

- Wrap at 72 characters per line
- Explain motivation, not mechanics (the diff shows the what)
- Use bullet points for multiple related changes

### 6. Add footers (if needed)

**Breaking changes:**

```
BREAKING CHANGE: <what breaks and how to migrate>
```

- `BREAKING CHANGE` must be uppercase with colon and space
- Describe what breaks AND the migration path
- Can also use `!` notation: `feat(api)!: remove v1 endpoints`

**Issue references:**

```
Closes #123
Refs #456, #789
```

## Checklist

- [ ] Ran `git diff --cached` (or parser script) — confirmed changes are staged
- [ ] Selected correct type based on primary intent of the change
- [ ] Scope reflects the affected module/package (or omitted if too broad)
- [ ] Subject line is ≤ 50 characters total (including type and scope)
- [ ] Subject uses imperative mood and lowercase after colon
- [ ] Body explains WHY (if the change is non-trivial)
- [ ] BREAKING CHANGE footer present if public API changed
- [ ] Verified no unrelated changes mixed in (suggest splitting if so)

## Examples

### Example 1: Monorepo feature in a specific package

**Parser output (abbreviated):**

```json
{
  "monorepo": { "detected": true, "type": "packages" },
  "packages": ["auth-service"],
  "suggested_type": "feat",
  "suggested_scope": "auth-service",
  "files": [
    { "path": "packages/auth-service/src/oauth.ts", "status": "added" },
    {
      "path": "packages/auth-service/src/routes/callback.ts",
      "status": "added"
    }
  ]
}
```

**Output:**

```
feat(auth-service): add OAuth2 authorization flow

Implement OAuth2 authorization code flow with PKCE support.
Adds /auth/callback route and token exchange logic.
```

### Example 2: Cross-package monorepo change

**Parser output (abbreviated):**

```json
{
  "monorepo": { "detected": true, "type": "packages" },
  "packages": ["shared-types", "api-gateway", "user-service"],
  "suggested_type": "refactor",
  "suggested_scope": null,
  "files": [
    { "path": "packages/shared-types/src/user.ts", "status": "modified" },
    { "path": "packages/api-gateway/src/middleware.ts", "status": "modified" },
    { "path": "packages/user-service/src/handler.ts", "status": "modified" }
  ]
}
```

**Output:**

```
refactor: migrate user types to shared-types package

Move User and UserProfile interfaces from api-gateway and
user-service into shared-types to eliminate duplicate type
definitions across packages.

Affected packages: shared-types, api-gateway, user-service
```

### Example 3: Simple bug fix

**Diff:**

```diff
--- a/src/utils/date.ts
+++ b/src/utils/date.ts
@@ -10,7 +10,7 @@ export function formatDate(date: Date): string {
-  const month = date.getMonth();
+  const month = date.getMonth() + 1;
   return `${date.getFullYear()}-${month}-${date.getDate()}`;
```

**Output:**

```
fix(utils): correct off-by-one in month formatting

getMonth() returns 0-11 but the format string expects 1-12.
```

## Common mistakes

| Mistake                                    | Fix                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Using past tense ("added feature")         | Imperative mood: "add feature". Test: "This commit will ___."                          |
| Subject line over 50 characters            | Shorten aggressively. Move details to body. Count the full line including type(scope): |
| Wrong type for ambiguous changes           | Ask: "What is the PRIMARY intent?" Fix that refactors → `fix`.                         |
| File paths as scope                        | Use module/feature name: `auth` not `src/middleware/auth.ts`                           |
| Missing BREAKING CHANGE footer             | Any public API change (signature, return type, removed export) needs this footer       |
| Vague subject ("fix bug", "update code")   | Be specific: "fix null pointer in user lookup"                                         |
| Capitalizing after colon                   | Lowercase: `feat: add thing` not `feat: Add thing`                                     |
| Period at end of subject                   | No period: `feat: add thing` not `feat: add thing.`                                    |
| Monorepo: using root scope for pkg change  | Use the package name: `feat(auth-service):` not `feat(packages):`                      |
| Monorepo: mixing unrelated package changes | Suggest splitting into separate commits per package                                    |

## Quick reference

```
<type>(<scope>): <subject>     ← 50 chars max for full line
                                ← blank line
<body>                          ← 72 chars per line, explain WHY
                                ← blank line
<footer>                        ← BREAKING CHANGE: what breaks + migration
                                ← Closes #123
```

**Types:** `feat` | `fix` | `refactor` | `docs` | `test` | `perf` | `style` |
`build` | `ci` | `chore`

**Imperative test:** "If applied, this commit will `<subject>`"

**Monorepo scopes:** Use the package/app/service name, not the directory prefix.

## Key principles

1. **The diff is the source of truth** — Always read `git diff --cached` before
   writing. Never assume what changed based on conversation context alone. The
   parser script makes this faster and more reliable.
2. **Imperative mood, always** — "add", "fix", "remove", "update" — never past
   tense. This matches git's own conventions (`Merge branch`, `Revert commit`).
3. **One logical change per commit** — If the diff contains unrelated changes,
   suggest splitting. In monorepos, changes to unrelated packages are a strong
   signal to split.
4. **Subject line ≤ 50 characters** — Hard limit including `type(scope):`. Count
   before outputting. This ensures readability across all git tooling.
5. **Monorepo scope = package name** — In monorepos, the scope should be the
   package/app/service name, not directory prefixes like `packages` or `apps`.
   Cross-package changes should either use a feature name or omit scope.

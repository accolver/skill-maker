---
name: git-commit-helper
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, perf, ci, build, style). Handles monorepo scopes by detecting which packages or directories changed. Use when writing commit messages, committing code, generating conventional commits, or when the user asks for help with git commit messages. Also use when reviewing staged changes before committing.
---

# Git Commit Helper

Generate well-structured conventional commit messages by analyzing staged git
changes. The skill parses diffs to determine the correct commit type, scope, and
subject line — so commit messages are consistent, informative, and follow the
Conventional Commits specification.

## When to use

- When writing a commit message for staged changes
- When the user asks to commit code or generate a commit message
- When reviewing staged changes and deciding how to describe them
- When working in a monorepo and needing scoped commit messages

**Do NOT use when:**

- The user has already written their own commit message and just wants to run
  `git commit`
- The task is about git operations unrelated to commit messages (branching,
  merging, rebasing)

## Workflow

### 1. Gather staged changes

Run the bundled diff parser to get a structured summary of what changed:

```bash
bun run <skill-path>/scripts/parse-diff.ts
```

This outputs JSON to stdout with:

- Files changed (added, modified, deleted)
- Directories/packages affected
- Line counts (insertions, deletions)
- Detected change categories

If nothing is staged, inform the user and suggest `git add` first.

### 2. Determine the commit type

Select the type based on the **primary intent** of the changes, not just what
files were touched. Use this decision tree:

| Type       | When to use                                                         |
| ---------- | ------------------------------------------------------------------- |
| `feat`     | New functionality visible to users or consumers of the API          |
| `fix`      | Bug fix — something was broken, now it works                        |
| `refactor` | Code restructuring with no behavior change                          |
| `docs`     | Documentation only (README, JSDoc, comments, guides)                |
| `test`     | Adding or updating tests with no production code changes            |
| `chore`    | Maintenance (deps, configs, CI scripts, tooling) with no src change |
| `style`    | Formatting, whitespace, semicolons — no logic change                |
| `perf`     | Performance improvement with no behavior change                     |
| `ci`       | CI/CD configuration changes (GitHub Actions, Jenkins, etc.)         |
| `build`    | Build system or external dependency changes                         |
| `revert`   | Reverts a previous commit                                           |

**Key rule:** If changes span multiple types, use the type that represents the
_primary purpose_. A feat that also adds tests is `feat`, not `test`. A fix that
also refactors nearby code is `fix`.

### 3. Determine the scope (monorepo-aware)

Scope is optional but recommended. Detect it from the changed file paths:

- **Monorepo packages:** If files are under `packages/<name>/` or
  `apps/<name>/`, use the package name as scope (e.g., `feat(api): ...`)
- **Top-level directories:** If changes are concentrated in one directory like
  `src/auth/`, use that as scope (e.g., `fix(auth): ...`)
- **Multiple scopes:** If changes span multiple packages/directories, either:
  - Omit the scope if the change is truly cross-cutting
  - Use the most significant scope
- **Root-level files:** Config files at root typically don't need a scope, or
  use the tool name (e.g., `chore(eslint): ...`)

### 4. Write the subject line

Follow these rules for the subject:

- **Imperative mood:** "add feature" not "added feature" or "adds feature"
- **Lowercase first letter:** "add user auth" not "Add user auth"
- **No period at the end**
- **Under 72 characters** (type + scope + colon + space + subject)
- **Describe the what, not the how:** "add user authentication" not "add JWT
  middleware to express router"

### 5. Add body if needed

Include a body (separated by a blank line) when:

- The change is complex and the subject alone doesn't explain it
- There are breaking changes (prefix body with `BREAKING CHANGE:`)
- The "why" behind the change isn't obvious from the diff

### 6. Present the commit message

Output the final message in a code block. If there were multiple reasonable
interpretations, briefly explain why you chose the type/scope you did.

**Format:**

```
type(scope): subject line here

Optional body explaining the why, not the what.
The body wraps at 72 characters per line.

BREAKING CHANGE: description if applicable
```

## Checklist

- [ ] Ran `parse-diff.ts` or manually reviewed staged changes
- [ ] Selected commit type based on primary intent of changes
- [ ] Determined scope from file paths (or omitted if cross-cutting)
- [ ] Subject is imperative mood, lowercase, under 72 chars, no trailing period
- [ ] Body included if change is complex or has breaking changes
- [ ] Final message follows Conventional Commits format

## Examples

**Example 1: Simple feature in a monorepo**

Staged changes: New file `packages/api/src/routes/users.ts` (45 lines added),
modified `packages/api/src/index.ts` (3 lines added to register route).

```
feat(api): add user management endpoints

Adds CRUD routes for /users with input validation
and proper error responses.
```

**Example 2: Bug fix with no scope**

Staged changes: Modified `src/utils/date.ts` (2 lines changed — fixed off-by-one
in month calculation).

```
fix: correct off-by-one error in month calculation
```

**Example 3: Multiple file types, chore**

Staged changes: Modified `package.json` (dependency bump), modified
`tsconfig.json` (added strict flag), modified `eslint.config.js` (new rule).

```
chore: update tooling configs and bump dependencies

- Bump typescript to 5.4
- Enable strict mode in tsconfig
- Add no-unused-vars eslint rule
```

## Common mistakes

| Mistake                                   | Fix                                               |
| ----------------------------------------- | ------------------------------------------------- |
| Using past tense ("added feature")        | Use imperative mood ("add feature")               |
| Capitalizing subject ("Add feature")      | Lowercase first letter ("add feature")            |
| Scope too broad ("feat(src): ...")        | Use specific module/package name                  |
| Type doesn't match intent (test for feat) | Choose type by primary purpose, not file location |
| Subject over 72 chars                     | Shorten — move details to body                    |
| Missing scope in monorepo                 | Detect package from file paths                    |

## Quick reference

| Operation             | How                                                   |
| --------------------- | ----------------------------------------------------- |
| Parse staged diff     | `bun run scripts/parse-diff.ts`                       |
| Check staged files    | `git diff --cached --name-status`                     |
| Check staged stats    | `git diff --cached --stat`                            |
| View full staged diff | `git diff --cached`                                   |
| Commit with message   | `git commit -m "type(scope): subject"`                |
| Commit with body      | `git commit -m "type(scope): subject" -m "body text"` |

## Key principles

1. **Primary intent determines type** — A commit's type reflects why the change
   was made, not which files were touched. Tests added alongside a feature are
   still `feat`.

2. **Scope comes from structure** — In monorepos, scope maps to the package/app
   name. In single repos, scope maps to the most specific meaningful directory.
   When in doubt, omit scope rather than guess.

3. **Imperative mood always** — The subject completes the sentence "If applied,
   this commit will ___." This is a Conventional Commits convention that
   improves readability in git log.

4. **Atomic commits deserve atomic messages** — One commit should do one thing.
   If the message needs "and" in the subject, consider splitting the commit.

5. **The diff is the source of truth** — Always analyze the actual staged
   changes, never guess from context or conversation history alone.

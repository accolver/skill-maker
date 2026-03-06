---
name: git-commit-helper
description: Analyzes staged git changes and generates conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, style, perf, ci, build) and monorepo scopes. Use when writing commit messages, committing code, generating changelogs, asking about conventional commits, or when the user mentions git commit, commit message, staged changes, or conventional commits.
---

# Git Commit Helper

Analyze staged git changes and generate well-structured conventional commit
messages. The skill parses diffs to determine the correct commit type, optional
scope (especially for monorepos), and a concise subject line.

## Overview

Conventional commits follow the format: `type(scope): subject`. Getting the type
wrong (e.g., `feat` when it should be `fix`) or missing the scope in a monorepo
makes commit history less useful. This skill provides a systematic approach and
a bundled diff-analysis script to get it right consistently.

## When to use

- When committing staged changes and you need a well-formatted message
- When working in a monorepo and commits need package/workspace scopes
- When generating changelogs or release notes from commit history
- When the user asks for help writing or improving a commit message
- When reviewing staged changes before committing

**Do NOT use when:**

- The user has already written a complete commit message and just wants to
  commit
- The task is about git operations other than committing (rebasing, merging,
  etc.)

## Workflow

### 1. Gather staged changes

Run the bundled analysis script to parse the current staged diff:

```bash
bun run <skill-path>/scripts/analyze-diff.ts
```

This outputs a JSON object with file-level change summaries, detected type,
suggested scope, and a draft subject. If no changes are staged, it exits with
code 1 and prints an error to stderr.

If the script is unavailable or the user provides a diff directly, analyze it
manually by reading the output of `git diff --cached --stat` and
`git diff --cached`.

### 2. Determine the commit type

Use the change analysis to select the correct type. The type is determined by
the **primary intent** of the change, not just which files changed.

| Type       | When to use                                                      |
| ---------- | ---------------------------------------------------------------- |
| `feat`     | New user-facing feature or capability                            |
| `fix`      | Bug fix (something was broken, now it works)                     |
| `refactor` | Code restructuring with no behavior change                       |
| `docs`     | Documentation only (README, JSDoc, comments)                     |
| `test`     | Adding or updating tests with no production code changes         |
| `chore`    | Maintenance tasks (deps, configs, CI tweaks, tooling)            |
| `style`    | Formatting, whitespace, semicolons — no logic changes            |
| `perf`     | Performance improvement with no behavior change                  |
| `ci`       | CI/CD pipeline changes (GitHub Actions, Jenkins, etc.)           |
| `build`    | Build system or external dependency changes (webpack, npm, etc.) |

**Decision priority:** If a commit includes both a feature and a test for that
feature, the type is `feat` (the test supports the feature). If it includes a
bug fix and a refactor, the type is `fix` (the refactor supports the fix).

### 3. Determine the scope (especially for monorepos)

Scope is optional but strongly recommended in monorepos. Derive it from:

1. **Package/workspace name** — If all changes are in `packages/auth/`, scope is
   `auth`
2. **Module or component** — If changes span a single module like `api` or
   `cli`, use that
3. **Omit scope** — If changes span multiple unrelated packages, omit the scope
   rather than inventing a vague one

For monorepo detection, look for `workspaces` in `package.json`,
`pnpm-workspace.yaml`, `lerna.json`, or a `packages/` directory structure.

### 4. Write the subject line

Rules for the subject:

- **Imperative mood** — "add feature" not "added feature" or "adds feature"
- **Lowercase first letter** — "add auth middleware" not "Add auth middleware"
- **No period at the end** — "fix login redirect" not "fix login redirect."
- **Under 50 characters** — Be concise. If you can't fit it, the commit may be
  too large
- **Describe the what, not the how** — "add user avatar upload" not "add multer
  middleware and S3 integration"

### 5. Add body and footer if needed

A body is warranted when:

- The change is non-obvious and needs explanation (the "why")
- There are breaking changes (add `BREAKING CHANGE:` footer)
- The commit closes an issue (add `Closes #123` footer)

Body format:

- Blank line after subject
- Wrap at 72 characters
- Explain motivation and contrast with previous behavior

### 6. Present the commit message

Present the final message in a code block. If there are multiple reasonable
interpretations, present the best option with a brief rationale, not multiple
alternatives.

**Example:**

Given staged changes that add a new `/users/:id/avatar` endpoint in
`packages/api/`:

```
feat(api): add user avatar upload endpoint

Allow users to upload profile avatars via multipart form data.
Uploaded images are resized to 256x256 and stored in S3.

Closes #342
```

## Common mistakes

| Mistake                                                 | Fix                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Using `feat` for bug fixes because new code was written | The type reflects intent, not volume. If something was broken and is now fixed, it's `fix` |
| Scope too broad (e.g., `app` or `src`)                  | Use the most specific meaningful scope — a package name, module, or component              |
| Subject in past tense ("fixed bug")                     | Always use imperative mood ("fix bug") as if completing the sentence "This commit will..." |
| Subject over 50 characters                              | Cut implementation details. Focus on the user-visible change                               |
| Using `chore` as a catch-all                            | `chore` is for maintenance tasks. Refactors are `refactor`, test additions are `test`      |
| Multiple unrelated changes in one commit                | Suggest splitting into separate commits, each with its own type and scope                  |
| Including scope when changes span many packages         | Omit scope rather than using a vague umbrella term                                         |
| Capitalizing the first letter of the subject            | Conventional commits use lowercase after the colon                                         |

## Checklist

- [ ] Staged changes analyzed (via script or manual diff review)
- [ ] Commit type correctly identifies the primary intent of the change
- [ ] Scope matches the package/module (or is omitted if changes span multiple)
- [ ] Subject is imperative mood, lowercase, under 50 chars, no trailing period
- [ ] Body included if the change needs explanation or has breaking changes
- [ ] Footer includes issue references or `BREAKING CHANGE:` if applicable

## Available scripts

### `scripts/analyze-diff.ts`

Parses staged git changes and outputs structured analysis.

```bash
# Basic usage — analyzes current staged changes
bun run <skill-path>/scripts/analyze-diff.ts

# Analyze a specific diff file
bun run <skill-path>/scripts/analyze-diff.ts --diff-file /path/to/diff.patch

# Show help
bun run <skill-path>/scripts/analyze-diff.ts --help
```

**Output format (JSON to stdout):**

```json
{
  "type": "feat",
  "scope": "api",
  "subject": "add user avatar upload endpoint",
  "files_changed": 3,
  "insertions": 45,
  "deletions": 2,
  "files": [
    {
      "path": "packages/api/src/routes/avatar.ts",
      "status": "added",
      "insertions": 38,
      "deletions": 0
    },
    {
      "path": "packages/api/src/routes/index.ts",
      "status": "modified",
      "insertions": 5,
      "deletions": 1
    },
    {
      "path": "packages/api/tests/avatar.test.ts",
      "status": "added",
      "insertions": 2,
      "deletions": 1
    }
  ],
  "is_monorepo": true,
  "detected_scopes": ["api"],
  "breaking": false
}
```

## Key principles

1. **Intent over mechanics** — The commit type reflects WHY the change was made,
   not WHAT files were touched. A test file change that fixes a flaky CI
   pipeline is `fix`, not `test`.
2. **One commit, one purpose** — If the staged changes serve multiple unrelated
   purposes, recommend splitting them into separate commits rather than forcing
   a single type.
3. **Scope precision** — In monorepos, scope should map to a recognizable
   package or workspace name. Never invent scopes that don't correspond to
   project structure.
4. **Conciseness wins** — A 40-character subject that captures the essence beats
   a 70-character subject that includes implementation details.

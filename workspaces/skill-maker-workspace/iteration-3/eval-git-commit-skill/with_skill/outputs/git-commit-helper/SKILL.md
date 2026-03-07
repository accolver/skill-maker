---
name: git-commit-helper
description: Analyze staged git changes and generate conventional commit messages with correct type prefixes (feat, fix, chore, refactor, docs, test, style, perf, ci, build). Handles monorepo scopes by detecting package/workspace boundaries. Use when writing commit messages, committing code, preparing git commits, or when the user mentions conventional commits, commit message formatting, or needs help describing their changes for version control.
---

# Git Commit Helper

Generate precise conventional commit messages by analyzing staged git diffs. The
skill parses actual changes to determine the correct commit type, scope, and
description rather than relying on the user's summary alone.

## When to use

- When committing staged changes and needing a well-formatted message
- When working in a monorepo and needing the correct package scope
- When unsure which conventional commit type fits the changes
- When preparing a series of atomic commits from a large changeset
- When the user asks to "commit this" or "write a commit message"

**Do NOT use when:**

- The user has already written a complete commit message they're happy with
- The task is about git operations other than committing (rebasing, merging,
  etc.)

## Workflow

### 1. Gather staged changes

Run `git diff --cached --stat` first for an overview, then `git diff --cached`
for the full diff. If nothing is staged, check `git status` and inform the user
that they need to stage changes first.

```bash
git diff --cached --stat
git diff --cached
```

If the diff is very large (>500 lines), focus on the `--stat` summary and
selectively read the most important hunks rather than processing the entire
diff.

### 2. Detect monorepo scope

Look for scope signals in the changed file paths:

1. **Package directory patterns**: `packages/<name>/`, `apps/<name>/`,
   `services/<name>/`, `libs/<name>/`, `modules/<name>/`
2. **Workspace config**: Check `package.json` workspaces, `pnpm-workspace.yaml`,
   or `Cargo.toml` workspace members if present
3. **Single-scope rule**: If ALL changed files share the same package scope, use
   it. If files span multiple packages, omit the scope or use a parent scope.

Use the bundled script for automated detection:

```bash
bun run scripts/parse-diff.ts --diff "$(git diff --cached)" --detect-scope
```

### 3. Determine commit type

Analyze the nature of the changes against this priority order:

| Type       | When to use                                          |
| ---------- | ---------------------------------------------------- |
| `feat`     | New user-facing functionality or capability          |
| `fix`      | Bug fix (something was broken, now it works)         |
| `refactor` | Code restructuring with no behavior change           |
| `perf`     | Performance improvement with no behavior change      |
| `test`     | Adding or updating tests only                        |
| `docs`     | Documentation-only changes (README, JSDoc, comments) |
| `style`    | Formatting, whitespace, semicolons (no logic change) |
| `chore`    | Tooling, config, dependencies, CI scripts            |
| `ci`       | CI/CD pipeline configuration changes                 |
| `build`    | Build system or external dependency changes          |
| `revert`   | Reverting a previous commit                          |

**Decision rules:**

- If changes include BOTH new features and bug fixes, prefer separate commits.
  If forced into one, use `feat` (features are higher signal).
- If a refactor enables a new feature, use `feat` — the user cares about the
  capability, not the technique.
- Config file changes (`.eslintrc`, `tsconfig.json`, `Dockerfile`) are `chore`
  unless they directly affect the build output (`build`).
- Dependency updates (`package.json`, `Cargo.toml`) are `chore` for routine
  bumps, `fix` if fixing a vulnerability, `feat` if adding a new capability.

### 4. Write the commit message

Follow this format exactly:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Rules for the description line:**

- Lowercase first letter (no capital after the colon)
- No period at the end
- Imperative mood ("add feature" not "added feature" or "adds feature")
- Under 72 characters total for the first line
- Describe WHAT changed and WHY, not HOW

**Rules for the body (when needed):**

- Separate from description with a blank line
- Wrap at 72 characters
- Explain motivation and contrast with previous behavior
- Use body for changes that aren't obvious from the description alone

**Rules for the footer (when needed):**

- `BREAKING CHANGE: <description>` for breaking changes
- `Fixes #<issue>` or `Closes #<issue>` for issue references
- `Co-authored-by: Name <email>` for pair programming

### 5. Present and confirm

Show the generated message to the user. If they approve, execute the commit:

```bash
git commit -m "<type>(<scope>): <description>" -m "<body>" -m "<footer>"
```

For multi-line bodies, prefer writing to a temp file:

```bash
git commit -F /tmp/commit-msg.txt
```

## Checklist

- [ ] Staged changes exist (git diff --cached is non-empty)
- [ ] Commit type matches the nature of the changes
- [ ] Scope is correct for monorepo (or omitted for root-level changes)
- [ ] Description is imperative mood, lowercase, no period, under 72 chars
- [ ] Breaking changes are flagged in footer if applicable
- [ ] Message presented to user for approval before committing

## Examples

**Example: Feature in a monorepo**

Staged diff shows new files in `packages/auth/src/oauth.ts` and modified
`packages/auth/src/index.ts` adding OAuth2 support.

```
feat(auth): add OAuth2 authorization code flow

Implements the authorization code grant type with PKCE support.
Token refresh is handled automatically by the existing session manager.

Closes #142
```

**Example: Bug fix at repo root**

Staged diff shows a one-line fix in `src/utils/date.ts` correcting timezone
handling.

```
fix: correct UTC offset calculation for DST transitions
```

**Example: Multiple scopes (no scope used)**

Staged diff touches `packages/api/` and `packages/web/` to update shared types.

```
refactor: align request/response types across api and web packages
```

## Common mistakes

| Mistake                                          | Fix                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| Using past tense ("added feature")               | Use imperative mood ("add feature")                                   |
| Capitalizing after the colon ("Fix: Add thing")  | Lowercase first letter after colon ("fix: add thing")                 |
| Scope too broad ("app") or too narrow ("button") | Match the package/workspace name from the monorepo structure          |
| Using `feat` for refactors with no new behavior  | Use `refactor` — feat implies user-visible new functionality          |
| Putting HOW in the description instead of WHAT   | Description says what changed; body explains how if needed            |
| Exceeding 72 chars on the first line             | Move details to the body paragraph                                    |
| Committing without checking staged changes first | Always run `git diff --cached --stat` before generating a message     |
| Using scope when changes span multiple packages  | Omit scope or use a shared parent; don't pick one package arbitrarily |

## Quick reference

| Operation              | Command                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| View staged changes    | `git diff --cached --stat`                                                   |
| Full staged diff       | `git diff --cached`                                                          |
| Parse diff with script | `bun run scripts/parse-diff.ts --diff "$(git diff --cached)"`                |
| Detect scope           | `bun run scripts/parse-diff.ts --diff "$(git diff --cached)" --detect-scope` |
| Commit with message    | `git commit -m "type(scope): description"`                                   |
| Commit from file       | `git commit -F /tmp/commit-msg.txt`                                          |

## Key principles

1. **Accuracy over speed** — Read the actual diff. Never guess the commit type
   from file names alone. A renamed file in `test/` could be a refactor, not a
   test change.
2. **Atomic commits** — If staged changes serve multiple purposes, suggest
   splitting into separate commits rather than writing one vague message.
3. **Scope reflects structure** — In monorepos, the scope must match the actual
   package/workspace directory name, not an abbreviation or alias.
4. **User confirms** — Always present the generated message for approval. Never
   auto-commit without explicit user consent.

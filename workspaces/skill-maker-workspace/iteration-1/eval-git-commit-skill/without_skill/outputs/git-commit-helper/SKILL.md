---
name: git-commit-helper
description: Analyzes staged git changes and generates conventional commit messages with proper type prefixes, monorepo scopes, and breaking change detection.
---

# Git Commit Helper

Generate well-structured
[Conventional Commits](https://www.conventionalcommits.org/) messages by
analyzing staged git changes.

## When to Use

- Before committing staged changes
- When the user asks for help writing a commit message
- When the user wants to follow conventional commit conventions

## Workflow

### 1. Gather Staged Changes

Run the bundled diff parser script to collect structured information about what
changed:

```bash
bash "${SKILL_DIR}/scripts/parse-diff.sh"
```

The script outputs a JSON object with:

- `files_changed`: list of changed files with status
  (added/modified/deleted/renamed)
- `packages`: detected monorepo packages/scopes from file paths
- `stats`: insertions, deletions, files count
- `diff_summary`: condensed diff content (truncated for large diffs)
- `has_breaking_changes`: boolean heuristic based on diff patterns

If the script is unavailable, gather the same information manually:

```bash
git diff --cached --stat
git diff --cached --name-status
git diff --cached
```

### 2. Determine the Commit Type

Analyze the changes and select **one** primary type:

| Type       | When to Use                                          |
| ---------- | ---------------------------------------------------- |
| `feat`     | A new feature or user-facing capability              |
| `fix`      | A bug fix                                            |
| `docs`     | Documentation-only changes                           |
| `style`    | Formatting, whitespace, semicolons — no logic change |
| `refactor` | Code restructuring without behavior change           |
| `perf`     | Performance improvement                              |
| `test`     | Adding or updating tests only                        |
| `build`    | Build system or external dependency changes          |
| `ci`       | CI/CD configuration changes                          |
| `chore`    | Maintenance tasks (deps, tooling, config)            |
| `revert`   | Reverting a previous commit                          |

**Selection rules:**

- If changes span multiple types, pick the **most significant** one.
- If a feature includes its own tests, use `feat` (not `test`).
- If a fix includes a doc update, use `fix` (not `docs`).
- Pure dependency bumps → `chore` or `build` depending on context.
- Lockfile-only changes → `chore(deps)`.

### 3. Determine the Scope (Monorepo Aware)

Scopes narrow the commit to a specific area. They are **optional** but
recommended.

**Monorepo detection:** The parse-diff script detects packages automatically.
Common monorepo layouts:

| Layout                | Scope Derivation |
| --------------------- | ---------------- |
| `packages/<name>/...` | scope = `<name>` |
| `apps/<name>/...`     | scope = `<name>` |
| `libs/<name>/...`     | scope = `<name>` |
| `services/<name>/...` | scope = `<name>` |
| `modules/<name>/...`  | scope = `<name>` |

**Scope rules:**

- If all files are in one package → use that package as scope.
- If files span 2 packages → use the primary one, mention the other in the body.
- If files span 3+ packages → omit scope or use a broad scope like `repo` or
  `monorepo`.
- Root-level config files (e.g., `tsconfig.json`, `.eslintrc`) → scope =
  `config` or omit.
- CI files → scope = `ci`.
- Non-monorepo projects → derive scope from top-level directory or module name.

### 4. Detect Breaking Changes

A commit has breaking changes if any of these are true:

- Public API signatures changed (parameters added/removed/reordered)
- Return types changed
- Required configuration changed
- Database schema migration required
- Environment variables added/removed
- Endpoints removed or renamed
- Default behavior changed

If breaking changes are detected:

- Add `!` after the scope: `feat(api)!: ...`
- Add a `BREAKING CHANGE:` footer in the body

### 5. Write the Subject Line

Format: `<type>(<scope>): <description>` or `<type>: <description>`

**Subject rules:**

- Use imperative mood ("add", not "added" or "adds")
- Lowercase first letter after the colon
- No period at the end
- Max 72 characters total
- Be specific: "add user avatar upload endpoint" not "update user stuff"
- Focus on **what** changed, not **how**

### 6. Write the Body (When Needed)

Include a body when:

- The "why" isn't obvious from the subject
- Multiple logical changes are grouped
- Breaking changes need explanation
- Migration steps are needed

**Body format:**

- Blank line between subject and body
- Wrap at 72 characters
- Explain **why**, not **what** (the diff shows what)
- Use bullet points for multiple items

### 7. Write Footers (When Needed)

Common footers:

```
BREAKING CHANGE: <description of what breaks and migration path>
Closes #<issue-number>
Refs #<issue-number>
Co-authored-by: Name <email>
```

### 8. Present the Message

Present the final commit message in a fenced code block:

```
type(scope): subject line here

Optional body explaining why this change was made.
- Additional detail one
- Additional detail two

BREAKING CHANGE: description if applicable
Closes #123
```

Then ask the user if they want to:

1. **Use it as-is** — run `git commit -m "..."` (or with `-m` for subject + `-m`
   for body)
2. **Edit it** — adjust wording, scope, or type
3. **Split it** — if changes should be multiple commits

## Examples

### Simple feature

```
feat(auth): add password reset via email link
```

### Bug fix with body

```
fix(api): prevent duplicate webhook deliveries

The webhook dispatcher was not checking for in-flight deliveries
before scheduling new ones, causing duplicate POST requests to
subscriber endpoints under high load.

Closes #847
```

### Breaking change

```
feat(config)!: require explicit database URL in environment

BREAKING CHANGE: The DATABASE_URL environment variable is now required.
Previously the app fell back to a SQLite file, which caused silent
data loss in production deployments. Set DATABASE_URL in your .env
file before upgrading.
```

### Monorepo with multiple packages

```
refactor(shared-utils): extract date formatting into standalone module

Also updates imports in the `web-app` and `api` packages to use
the new module path.
```

### Chore

```
chore(deps): bump eslint from 8.x to 9.x
```

## Edge Cases

- **Empty diff / no staged changes:** Warn the user that nothing is staged.
  Suggest `git add`.
- **Very large diffs (>500 lines):** Focus on the `--stat` summary and file
  names rather than line-by-line content.
- **Binary files:** Note them but don't try to interpret content.
- **Merge commits:** Suggest using the default merge message unless the user
  wants a custom one.
- **Generated files (lockfiles, compiled output):** Mention them but don't let
  them drive the commit type.

## Quality Checklist

Before presenting the message, verify:

- [ ] Type accurately reflects the primary change
- [ ] Scope is correct (or intentionally omitted)
- [ ] Subject is imperative mood, lowercase, no period, ≤72 chars
- [ ] Body explains "why" if the change isn't self-evident
- [ ] Breaking changes are flagged with `!` and `BREAKING CHANGE:` footer
- [ ] No secrets, tokens, or sensitive data in the message

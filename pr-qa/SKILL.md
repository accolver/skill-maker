---
name: pr-qa
description: Run end-to-end pull-request QA—draft PR creation, security scanning, multi-persona review, Greptile loops, and comment resolution—when a branch is being prepared for merge.
---

# PR QA Orchestrator

End-to-end pull request quality assurance. Takes a developer's changes from
local branch through to a merge-ready PR by automating creation, multi-persona
review, secrets/CVE scanning, Greptile-driven feedback loops, and systematic
comment resolution.

## When to Use

- The task is preparing a branch for merge with full pull-request QA, not just writing the PR description.
- The workflow needs PR creation, scans, review loops, comment handling, or merge-readiness checks.
- The user wants end-to-end assurance across security, architecture, dependency risk, and review feedback.
- The branch is owned or controlled by the user and is intended for a real PR workflow.

**Do NOT use when:**

- The task is only to summarize changes into a PR body.
- The user wants a lightweight code review with no PR orchestration.
- The request concerns someone else’s PR where you should review rather than operate the full workflow.


## Response format

Always structure the final response with these top-level sections, in this order:

1. **Summary** — state the task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — state the key classification, assumptions, or chosen path.
3. **Artifacts** — provide the primary deliverable(s) for this skill. Use clear subheadings for multiple files, commands, JSON payloads, queries, or documents.
4. **Validation** — state checks performed, important risks, caveats, or unresolved questions.
5. **Next steps** — list concrete follow-up actions, or write `None` if nothing remains.

Rules:
- Do not omit a section; write `None` when a section does not apply.
- If files are produced, list each file path under **Artifacts** before its contents.
- If commands, JSON, SQL, YAML, or code are produced, put each artifact in fenced code blocks with the correct language tag when possible.
- Keep section names exactly as written above so output stays predictable across skills.

## Workflow

### Phase 1: Pre-flight Checks

Verify the environment is ready before any work begins.

```bash
# Verify gh CLI is authenticated
gh auth status

# Verify current branch has a remote tracking branch
git status -sb

# Check for uncommitted changes
git diff --stat
git diff --cached --stat

# Identify base branch (usually main or master)
git remote show origin | grep 'HEAD branch'
```

If there are uncommitted changes, warn the user and ask whether to commit them
first or proceed with what's already committed.

Detect the project ecosystem by checking for: `package.json` (Node),
`requirements.txt`/`pyproject.toml` (Python), `go.mod` (Go), `Cargo.toml`
(Rust), `pom.xml`/`build.gradle` (Java). This determines which CVE scanner to
use in Phase 2.

### Phase 2: Security and Dependency Scan

#### Secrets Scanning

Run gitleaks scoped to the PR diff only:

```bash
gitleaks detect --source . --log-opts "origin/main..HEAD" --report-format json --report-path /tmp/gitleaks-report.json
```

If gitleaks is not installed, prompt the user to install it. Try these in order:

1. `bun add -g gitleaks` (preferred)
2. `pnpm add -g gitleaks`
3. `npm install -g gitleaks`
4. `brew install gitleaks` (macOS)

**HARD GATE: If critical secrets are found (API keys, passwords, private keys,
tokens), STOP and alert the user. Do NOT create the PR until secrets are removed
from the diff and git history.**

#### CVE Audit

Run the ecosystem-appropriate vulnerability scanner on dependency changes:

| Ecosystem | Command                                     | Scope                     |
| --------- | ------------------------------------------- | ------------------------- |
| Node.js   | `npm audit --json` or `pnpm audit --json`   | package-lock.json changes |
| Python    | `pip audit --format json` or `uv pip audit` | requirements changes      |
| Go        | `govulncheck ./...`                         | go.sum changes            |
| Rust      | `cargo audit --json`                        | Cargo.lock changes        |

Flag any **critical** or **high** severity CVEs introduced by the PR's
dependency changes. Medium/low CVEs are informational only.

### Phase 3: Deep Self-Review

Perform a comprehensive review of the diff from four expert perspectives. Before
reviewing, scan the repo root for architectural guidance documents:

```bash
# Look for design docs that define how the codebase should be architected
ls -la README.md ARCHITECTURE.md PRD.md DESIGN.md docs/*.md docs/plans/*.md 2>/dev/null
```

Read any found design documents to inform the review.

#### Security Engineer Perspective

- Input validation on all user-facing endpoints
- Authentication/authorization checks on protected resources
- SQL injection, XSS, CSRF, SSRF, path traversal risks
- Cryptographic misuse (weak algorithms, hardcoded keys, missing salts)
- Sensitive data exposure in logs, errors, or responses
- Race conditions in concurrent operations

#### Application Architect Perspective

- Consistency with existing codebase patterns and abstractions
- Proper use of existing utilities (no reinventing what exists)
- Separation of concerns and appropriate layering
- Error handling strategy (consistent with project conventions)
- Configuration management (no hardcoded values that should be configurable)
- Missing or inadequate tests for new functionality
- Adherence to project design docs (README, PRD, ARCHITECTURE.md)

#### Network Engineer Perspective

- API endpoint design (RESTful conventions, proper status codes)
- Timeout and retry configuration
- Connection pooling and resource cleanup
- TLS/certificate handling
- DNS and service discovery patterns

#### Scalability Engineer Perspective

- N+1 query patterns in database access
- Missing pagination on list endpoints
- Unbounded memory growth (loading full datasets)
- Missing caching where appropriate
- Blocking operations in async contexts
- Missing indexes for new query patterns

Produce structured findings with severity levels:

| Severity     | Meaning                                  | Action                 |
| ------------ | ---------------------------------------- | ---------------------- |
| **critical** | Security vulnerability or data loss risk | Must fix before PR     |
| **high**     | Bug or significant design issue          | Should fix before PR   |
| **medium**   | Code quality or minor design concern     | Fix if straightforward |
| **low**      | Style or minor improvement               | Optional               |
| **info**     | Observation or suggestion                | No action required     |

For each finding, provide:

1. File and line location
2. Description of the issue
3. Why it matters (which persona flagged it)
4. Concrete fix with a diff snippet

**Auto-fix boundary:** Automatically fix formatting, linting issues, obvious
null checks, missing error handling, and trivial bugs. Present fixes for
business logic, API contracts, database changes, or architectural decisions to
the user for approval.

### Phase 4: Create Draft PR

Generate a structured PR description:

```markdown
## Summary

[1-2 sentence overview of what this PR does]

## Motivation

[Why this change is needed — link to issue if applicable]

## Changes

[Group by concept, not file-by-file. Each group has a heading and explanation]

### [Concept 1]

- What changed and why

### [Concept 2]

- What changed and why

## Testing Instructions

[Copy-pasteable steps to verify the change works]

## Rollback Plan

[How to revert if something goes wrong]

## Reviewer Notes

[Areas that need careful review, known limitations, follow-up work]
```

Create the draft PR:

```bash
# Push any auto-fix commits first
git push origin HEAD

# Create draft PR
gh pr create --draft --title "<concise title>" --body "<structured description>"
```

Capture the PR number from the output — it's needed for all subsequent phases.

### Phase 5: Greptile Review Loop

This phase runs up to 5 cycles. Each cycle:

#### Step 1: Request Greptile Review

```bash
# Comment @greptile on the PR to trigger review
gh pr comment <PR_NUMBER> --body "@greptile"
```

#### Step 2: Poll for Greptile Response

Greptile responds with an eyes emoji when it starts reviewing (~10 minutes to
complete). Poll every 20 seconds:

```bash
# Get the comment ID of the @greptile comment
COMMENT_ID=$(gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments --jq '.[-1].id')

# Check reactions on the comment (eyes = reviewing, thumbs-up = done clean)
gh api repos/{owner}/{repo}/issues/comments/$COMMENT_ID/reactions --jq '.[].content'

# Check for new review comments from Greptile
gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]'

# Also check issue-level comments
gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]'
```

**Polling strategy:**

- Check every 20 seconds
- Timeout after 15 minutes per cycle
- If timeout: warn user and ask whether to continue waiting or proceed

#### Step 3: Process Greptile Findings

When Greptile responds with findings:

1. **Fetch PR-level comments** (general review comments):
   ```bash
   gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments
   ```

2. **Fetch ALL inline code comments** (file-specific review comments):
   ```bash
   gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]'
   ```

   **IMPORTANT:** Greptile often leaves multiple inline comments across different
   files. You MUST iterate over every inline comment individually — do not stop
   after reading the first one. Each comment targets a specific file and line
   range, and each must be addressed on its own merits.

3. **For EACH inline comment**, extract:
   - `id` — the comment ID (needed for replying and resolving)
   - `path` — the file the comment targets
   - `line` / `original_line` — the line number
   - `body` — the suggestion or finding text
   - `diff_hunk` — surrounding diff context

4. Categorize each finding by severity and addressability

5. Address **every** finding individually:
   - **Code fix needed**: Make the change, commit with message referencing the
     finding
   - **Explanation needed**: Reply to the comment explaining why the current
     approach is correct
   - **Dismiss with justification**: Reply explaining why the suggestion doesn't
     apply

6. **Reply to each inline comment** to create a paper trail:
   ```bash
   # Reply to an inline review comment
   gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments/<COMMENT_ID>/replies \
     -f body="Fixed — <brief description of what was changed>"
   ```

7. **Resolve each addressed comment thread** using GraphQL:
   ```bash
   # First, get the GraphQL node ID for the review thread
   # Each pull request review comment belongs to a thread that can be resolved
   gh api graphql -f query='
     query($owner: String!, $repo: String!, $pr: Int!) {
       repository(owner: $owner, name: $repo) {
         pullRequest(number: $pr) {
           reviewThreads(first: 100) {
             nodes {
               id
               isResolved
               comments(first: 1) {
                 nodes {
                   databaseId
                 }
               }
             }
           }
         }
       }
     }
   ' -f owner="{owner}" -f repo="{repo}" -F pr=<PR_NUMBER>

   # Then resolve the thread by its GraphQL node ID
   gh api graphql -f query='
     mutation($threadId: ID!) {
       resolveReviewThread(input: {threadId: $threadId}) {
         thread {
           isResolved
         }
       }
     }
   ' -f threadId="<THREAD_NODE_ID>"
   ```

   **Map comment IDs to thread IDs:** The GraphQL query returns threads with
   their first comment's `databaseId`. Match this against the REST API comment
   `id` to find the correct thread to resolve. Only resolve threads you have
   actually addressed — do not bulk-resolve without processing each one.

8. Push all fixes:
   ```bash
   git add -A && git commit -m "address Greptile review findings (cycle N)" && git push origin HEAD
   ```

9. If this is cycle < 5 and there were code changes: go to Step 1 for next cycle
10. If Greptile returned thumbs-up with no findings: Greptile loop is complete

#### Step 4: Escalation (after 5 cycles)

If 5 cycles complete without a clean Greptile review:

- Present all remaining unresolved findings to the user
- Ask for manual decision on each: fix, dismiss, or defer to post-merge

### Phase 6: Comment Resolution

Fetch ALL open review conversations, not just Greptile:

```bash
# Get all PR review comments (inline)
gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments

# Get all issue-level comments (top-level)
gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments

# Get review threads with resolution status via GraphQL
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 10) {
              nodes {
                databaseId
                body
                author { login }
                path
                line
              }
            }
          }
        }
      }
    }
  }
' -f owner="{owner}" -f repo="{repo}" -F pr=<PR_NUMBER>
```

**Use the GraphQL response as the source of truth** for which threads are still
unresolved (`isResolved: false`). This catches threads from Greptile, human
reviewers, and any other bot.

For each **unresolved** thread:

1. Read ALL comments in the thread (not just the first) to understand the full
   conversation context
2. If it requires a code change: make the fix, push, reply confirming the fix
3. If it's a question: reply with the answer
4. If it's resolved by a previous commit: reply linking to the commit
5. **Mark the thread as resolved** after addressing it:
   ```bash
   gh api graphql -f query='
     mutation($threadId: ID!) {
       resolveReviewThread(input: {threadId: $threadId}) {
         thread { isResolved }
       }
     }
   ' -f threadId="<THREAD_NODE_ID>"
   ```

**Do NOT resolve threads you haven't addressed.** Each resolution must follow a
reply that demonstrates the finding was handled — either by a code fix, an
explanation, or a justified dismissal.

### Phase 7: Final Verification

Re-run all checks on the final state:

```bash
# Re-run secrets scan
gitleaks detect --source . --log-opts "origin/main..HEAD"

# Check CI status
gh pr checks <PR_NUMBER>

# Verify no unresolved review threads
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100) {
          nodes { isResolved }
        }
      }
    }
  }
' -f owner="{owner}" -f repo="{repo}" -F pr=<PR_NUMBER> --jq '.data.repository.pullRequest.reviewThreads.nodes | map(select(.isResolved == false)) | length'

# Verify branch is up to date
git fetch origin && git log HEAD..origin/main --oneline
```

If the base branch has moved ahead, rebase and re-push:

```bash
git fetch origin main && git rebase origin/main && git push origin HEAD --force-with-lease
```

### Phase 8: Mark Ready for Review

```bash
gh pr ready <PR_NUMBER>
```

Present a summary to the user:

- Total findings discovered across all review phases
- Findings fixed automatically vs. fixed with approval vs. deferred
- Greptile cycles completed
- CI check status
- Any remaining items that need manual attention

## Checklist

- [ ] `gh auth status` confirms authentication
- [ ] Branch is pushed with commits ahead of base
- [ ] Secrets scan completed with no critical findings
- [ ] CVE audit completed, critical/high CVEs addressed
- [ ] Self-review completed from all four perspectives
- [ ] Auto-fixes committed and pushed
- [ ] Draft PR created via `gh pr create --draft`
- [ ] Greptile review requested via `@greptile` comment
- [ ] ALL Greptile inline comments individually addressed (not just the first)
- [ ] Greptile findings fixed or escalated after 5 cycles
- [ ] All PR comment threads resolved via GraphQL `resolveReviewThread`
- [ ] Final secrets re-scan clean
- [ ] CI checks passing
- [ ] Branch up to date with base
- [ ] PR marked ready via `gh pr ready`

## Example

**Input:** Developer on branch `feature/add-rate-limiting` with 3 commits adding
rate limiting middleware to an Express API.

**Phase 2 output (secrets scan):**

```
gitleaks: 1 finding
  File: src/config.ts:15
  Rule: generic-api-key
  Match: RATE_LIMIT_API_KEY = "sk-proj-abc123..."
  
ACTION REQUIRED: Remove hardcoded API key before PR creation.
  Fix: Move to environment variable, add to .env.example
```

**Phase 3 output (self-review findings):**

```
[CRITICAL] Security: Rate limiter uses client IP from X-Forwarded-For without validation
  File: src/middleware/rateLimiter.ts:23
  Persona: Security Engineer
  Fix: Validate X-Forwarded-For against trusted proxy list
  
[HIGH] Architecture: Rate limit config is hardcoded, should use existing ConfigService
  File: src/middleware/rateLimiter.ts:5-8
  Persona: Application Architect  
  Fix: Inject ConfigService, move values to config/rate-limiting.yaml

[MEDIUM] Scalability: In-memory rate limit store won't work with multiple instances
  File: src/middleware/rateLimiter.ts:12
  Persona: Scalability Engineer
  Fix: Use Redis store (project already has Redis dependency)
```

**Phase 5 output (Greptile cycle 1):**

```
Greptile review requested... polling every 20s
[20s] Checking... eyes reaction detected, review in progress
[40s] Checking... still reviewing
...
[200s] Greptile review complete. 2 inline findings:

1. src/middleware/rateLimiter.ts:45 - "Consider using sliding window instead 
   of fixed window for smoother rate limiting behavior"
   -> Addressing: switching to sliding window algorithm
   
2. src/routes/api.ts:12 - "Rate limiter should be applied after auth middleware,
   not before"
   -> Addressing: reordering middleware chain

Pushing fixes... requesting Greptile cycle 2...
[cycle 2] Greptile returned thumbs-up. No findings.
```

## Common Mistakes

| Mistake                                         | Fix                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Creating PR as ready instead of draft           | Always use `--draft` flag. Only `gh pr ready` after all checks pass.                                                 |
| Running gitleaks on full repo history           | Scope to PR diff: `--log-opts "origin/main..HEAD"`                                                                   |
| Only reading the first inline comment            | Greptile leaves multiple inline comments across files. Iterate over ALL of them — each has a distinct file, line, and finding. |
| Not resolving comment threads after addressing   | After replying to a comment, use the GraphQL `resolveReviewThread` mutation to mark the thread resolved. Unresolved threads block merge readiness. |
| Force-pushing without lease                     | Always use `--force-with-lease` to avoid overwriting others' changes.                                                |
| Auto-fixing business logic                      | Only auto-fix formatting, linting, null checks. Present business logic changes for user approval.                    |
| Polling too aggressively for Greptile           | Use 20-second intervals. More frequent polling wastes API calls and may hit rate limits.                             |
| Ignoring design docs during architecture review | Always check for README.md, ARCHITECTURE.md, PRD.md, docs/ before reviewing.                                         |
| Not re-scanning after fixes                     | Re-run secrets scan after all changes. Fixes can introduce new issues.                                               |

## Quick Reference

| Operation            | Command                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Check gh auth        | `gh auth status`                                                                             |
| Create draft PR      | `gh pr create --draft --title "..." --body "..."`                                            |
| Comment on PR        | `gh pr comment <N> --body "@greptile"`                                                       |
| Fetch PR comments    | `gh api repos/{owner}/{repo}/pulls/<N>/comments`                                             |
| Fetch issue comments | `gh api repos/{owner}/{repo}/issues/<N>/comments`                                            |
| Check reactions      | `gh api repos/{owner}/{repo}/issues/comments/<ID>/reactions`                                 |
| Check CI status      | `gh pr checks <N>`                                                                           |
| Mark ready           | `gh pr ready <N>`                                                                            |
| Resolve thread       | `gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id="<THREAD_ID>"` |
| Secrets scan         | `gitleaks detect --source . --log-opts "origin/main..HEAD"`                                  |
| Rebase on base       | `git fetch origin main && git rebase origin/main && git push origin HEAD --force-with-lease` |

## Key Principles

1. **Draft-first, always** — Never create a PR as ready-for-review. The draft
   state is your working space for QA. Only mark ready after ALL checks pass.
   This prevents premature review notifications and wasted reviewer time.

2. **Block on secrets, warn on everything else** — A leaked secret is
   irreversible. Stop immediately if gitleaks finds credentials. For all other
   findings (CVEs, architecture issues, style), present them ranked by severity
   but let the workflow continue.

3. **Fix forward, don't suppress** — When Greptile or self-review finds an
   issue, fix the code. Don't dismiss findings without a concrete justification.
   If a finding is genuinely a false positive, reply to the comment explaining
   why — don't just ignore it.

4. **Scope scans to the PR diff** — Run gitleaks on `origin/main..HEAD`, not the
   full repo. Run CVE audits on changed dependencies, not the full lockfile.
   This keeps results relevant and fast.

5. **Exhaust automation before asking the human** — Run all scans, do the
   self-review, go through Greptile cycles. Only escalate to the user for
   decisions that require business context (architectural trade-offs, feature
   scope, intentional risk acceptance).

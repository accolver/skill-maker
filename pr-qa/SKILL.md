---
name: pr-qa
description: Use when preparing, submitting, finishing, or cleaning up a pull request, especially when draft PRs, Greptile feedback, review comments, or merge-readiness work need end-to-end handling.
---

# PR QA Orchestrator

End-to-end pull request quality assurance. Takes a developer's branch or
existing PR through to a merge-ready state by automating creation, multi-persona
review, secrets/CVE scanning, Greptile-driven feedback loops, and systematic
comment resolution.

## When to Use

- The task is to submit a PR, finish PR QA, get a PR merge-ready, or clean up
  review feedback end to end.
- The workflow needs PR creation, scans, Greptile or review-bot loops, comment
  handling, or final merge-readiness checks.
- The request may start from a local branch, an existing draft PR, or an open PR
  with unresolved comments.
- The user wants end-to-end assurance across security, architecture, dependency
  risk, review feedback, and thread resolution.

**Do NOT use when:**

- The task is only to summarize changes into a PR body.
- The user wants a lightweight code review with no PR orchestration.
- The request concerns someone else’s PR where you should review rather than
  operate the full workflow.

## Response format

Always structure the final response with these top-level sections, in this
order:

1. **Summary** — state the task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — state the key classification, assumptions, or
   chosen path.
3. **Artifacts** — provide the primary deliverable(s) for this skill. Use clear
   subheadings for multiple files, commands, JSON payloads, queries, or
   documents.
4. **Validation** — state checks performed, important risks, caveats, or
   unresolved questions.
5. **Next steps** — list concrete follow-up actions, or write `None` if nothing
   remains.

Rules:

- Do not omit a section; write `None` when a section does not apply.
- If files are produced, list each file path under **Artifacts** before its
  contents.
- If commands, JSON, SQL, YAML, or code are produced, put each artifact in
  fenced code blocks with the correct language tag when possible.
- Keep section names exactly as written above so output stays predictable across
  skills.

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

### Phase 4: Create Or Reuse PR

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

Determine the current PR state before acting:

1. **No PR exists yet** — push the branch and create a draft PR
2. **A draft PR already exists** — reuse it and keep it draft through the QA
   loop
3. **An open non-draft PR already exists** — reuse it, skip draft creation, and
   only call `gh pr ready` later if the PR is actually in draft state

If no PR exists yet, create the draft PR:

```bash
# Push any auto-fix commits first
git push origin HEAD

# Create draft PR
gh pr create --draft --title "<concise title>" --body "<structured description>"
```

If a PR already exists, capture its PR number from `gh pr view` or the user
input and reuse it for all subsequent phases.

### Phase 5: Greptile Review Loop

This phase runs up to 5 cycles. Each cycle:

Treat this phase as a required loop, not a one-time check. After every code fix
push that is meant to satisfy Greptile, request Greptile again and restart the
polling step from the beginning. Do not leave Phase 5 until the **latest**
Greptile round has been polled to completion and either returned clean or hit
the cycle limit.

#### Step 1: Request Greptile Review

```bash
# Comment @greptile on the PR to trigger review and capture the exact comment ID
COMMENT_ID=$(gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments -f body='@greptile' --jq '.id')
```

#### Step 2: Poll for Greptile Response

Greptile responds with an eyes emoji when it starts reviewing (~10 minutes to
complete). Poll every 20 seconds and compare against the state that existed
before the current `@greptile` request:

```bash
# Snapshot existing Greptile comment IDs before starting this cycle
INLINE_BEFORE=$(gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]") | .id]')
ISSUE_BEFORE=$(gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]") | .id]')

# Check reactions on the comment (eyes = reviewing, thumbs-up = done clean)
gh api repos/{owner}/{repo}/issues/comments/$COMMENT_ID/reactions --jq '.[].content'

# Check for new review comments from Greptile
gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]'

# Also check issue-level comments
gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]'

# Check current review-thread state for Greptile-authored comments
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
                author { login }
              }
            }
          }
        }
      }
    }
  }
' -f owner="{owner}" -f repo="{repo}" -F pr=<PR_NUMBER>
```

**Polling strategy:**

- Check every 20 seconds
- Timeout after 15 minutes per cycle
- Capture the Greptile comment IDs that existed before the cycle and keep
  polling until the **current** cycle produces new Greptile output or an
  explicit clean signal
- One empty poll is never success; lack of change means keep waiting
- If you push fixes for this cycle, return to Step 1 and restart this entire
  polling step for the next cycle
- If timeout: warn user and ask whether to continue waiting or proceed

#### Step 3: Process Greptile Findings

When Greptile responds with findings:

1. **Fetch PR-level comments** (general review comments):

   ```bash
   gh api repos/{owner}/{repo}/issues/<PR_NUMBER>/comments
   ```

   These are useful for Greptile summary comments and status updates, but they
   are **not** review threads and cannot be closed with `resolveReviewThread`.

2. **Fetch ALL inline code comments** (file-specific review comments):

   ```bash
   gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]'
   ```

   **IMPORTANT:** Greptile often leaves multiple inline comments across
   different files. You MUST iterate over every inline comment individually — do
   not stop after reading the first one. Each comment targets a specific file
   and line range, and each must be addressed on its own merits.

3. **Fetch review threads** so comment IDs can be mapped to thread IDs and
   resolution state:

   ```bash
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

4. **For EACH inline comment**, extract:
   - `id` — the comment ID (needed for replying and resolving)
   - `path` — the file the comment targets
   - `line` / `original_line` — the line number
   - `body` — the suggestion or finding text
   - `diff_hunk` — surrounding diff context

5. Categorize each finding by severity and addressability

6. Address **every** finding individually:
   - **Code fix needed**: Make the change, commit with message referencing the
     finding
   - **Explanation needed**: Reply to the comment explaining why the current
     approach is correct
   - **Dismiss with justification**: Reply explaining why the suggestion doesn't
     apply

7. **Reply to each inline comment** to create a paper trail:

   ```bash
   # Reply to an inline review comment
   gh api repos/{owner}/{repo}/pulls/<PR_NUMBER>/comments/<COMMENT_ID>/replies \
     -f body="Fixed — <brief description of what was changed>"
   ```

8. **Resolve each addressed comment thread** using GraphQL:

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

   **Verify the close actually stuck:** After each `resolveReviewThread`
   mutation, re-fetch `reviewThreads` and confirm the targeted thread now shows
   `isResolved: true`. If it is still `false`, treat the thread as unresolved
   and keep it in the next processing pass.

9. **Acknowledge Greptile issue-level summary comments** with a follow-up PR
   comment describing what was fixed or why no change was needed. These summary
   comments cannot be resolved via GraphQL, so do not mistake them for closed
   review threads.

10. Push all fixes:

```bash
git add -A && git commit -m "address Greptile review findings (cycle N)" && git push origin HEAD
```

11. If this is cycle < 5 and there were code changes, new Greptile findings, or
    any Greptile thread remained unresolved: go to Step 1 for the next cycle
12. If the **latest** Greptile cycle returned thumbs-up or no findings and all
    Greptile review threads from that cycle are resolved: the Greptile loop is
    complete

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

6. Immediately re-query `reviewThreads` and confirm the same thread now reports
   `isResolved: true`. If not, leave it on the unresolved list and keep working
   it in the next pass.

For issue-level Greptile comments:

- Post a follow-up PR comment summarizing the fix, explanation, or dismissal
- Do not treat issue-level comments as resolvable review threads
- Consider them closed only after the follow-up is posted and the next Greptile
  cycle returns clean

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

If the PR is already open and not in draft state, skip `gh pr ready` and simply
report that it remains open after QA completion. Only run `gh pr ready` when the
current PR is actually draft.

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
- [ ] Draft PR created via `gh pr create --draft` when no PR already existed
- [ ] Existing draft or open PR reused when the request started from an existing
      PR
- [ ] Greptile review requested via `@greptile` comment
- [ ] Greptile re-requested and re-polled after every fix push until the latest
      round completed
- [ ] ALL Greptile inline comments individually addressed (not just the first)
- [ ] Greptile findings fixed or escalated after 5 cycles
- [ ] Each addressed Greptile thread verified resolved via GraphQL
      `resolveReviewThread` and `isResolved: true`
- [ ] Greptile issue-level summary comments acknowledged with follow-up comments
- [ ] Final secrets re-scan clean
- [ ] CI checks passing
- [ ] Branch up to date with base
- [ ] PR marked ready via `gh pr ready` if the PR was draft
- [ ] Existing open non-draft PR left open without forcing `gh pr ready`

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
[cycle 2] Re-checking reviewThreads... all targeted Greptile threads now show isResolved=true.
```

## Common Mistakes

| Mistake                                                      | Fix                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Creating PR as ready instead of draft                        | Always use `--draft` flag. Only `gh pr ready` after all checks pass.                                                           |
| Running gitleaks on full repo history                        | Scope to PR diff: `--log-opts "origin/main..HEAD"`                                                                             |
| Stopping after the first Greptile poll                       | Treat each fix push as a new Greptile cycle. Re-request Greptile and restart polling until the **latest** round completes.     |
| Only reading the first inline comment                        | Greptile leaves multiple inline comments across files. Iterate over ALL of them — each has a distinct file, line, and finding. |
| Replying to a thread without verifying closure               | After `resolveReviewThread`, re-query `reviewThreads` and confirm `isResolved: true` for that exact thread.                    |
| Treating issue-level Greptile comments as resolvable threads | Post a follow-up PR comment for summary comments. Only inline review threads can be closed with `resolveReviewThread`.         |
| Force-pushing without lease                                  | Always use `--force-with-lease` to avoid overwriting others' changes.                                                          |
| Auto-fixing business logic                                   | Only auto-fix formatting, linting, null checks. Present business logic changes for user approval.                              |
| Polling too aggressively for Greptile                        | Use 20-second intervals. More frequent polling wastes API calls and may hit rate limits.                                       |
| Ignoring design docs during architecture review              | Always check for README.md, ARCHITECTURE.md, PRD.md, docs/ before reviewing.                                                   |
| Not re-scanning after fixes                                  | Re-run secrets scan after all changes. Fixes can introduce new issues.                                                         |

## Quick Reference

| Operation            | Command                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check gh auth        | `gh auth status`                                                                                                                                                                                                                                                                         |
| Create draft PR      | `gh pr create --draft --title "..." --body "..."`                                                                                                                                                                                                                                        |
| Request Greptile     | `gh pr comment <N> --body "@greptile"`                                                                                                                                                                                                                                                   |
| Fetch PR comments    | `gh api repos/{owner}/{repo}/pulls/<N>/comments`                                                                                                                                                                                                                                         |
| Fetch issue comments | `gh api repos/{owner}/{repo}/issues/<N>/comments`                                                                                                                                                                                                                                        |
| Check reactions      | `gh api repos/{owner}/{repo}/issues/comments/<ID>/reactions`                                                                                                                                                                                                                             |
| Check review threads | `gh api graphql -f query='query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reviewThreads(first:100){nodes{id isResolved comments(first:10){nodes{databaseId author{login}}}}}}}}' -f owner="{owner}" -f repo="{repo}" -F pr=<N>` |
| Check CI status      | `gh pr checks <N>`                                                                                                                                                                                                                                                                       |
| Mark ready           | `gh pr ready <N>`                                                                                                                                                                                                                                                                        |
| Resolve thread       | `gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id="<THREAD_ID>"`                                                                                                                                                         |
| Secrets scan         | `gitleaks detect --source . --log-opts "origin/main..HEAD"`                                                                                                                                                                                                                              |
| Rebase on base       | `git fetch origin main && git rebase origin/main && git push origin HEAD --force-with-lease`                                                                                                                                                                                             |

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

6. **Poll to the latest state, not the first response** — A Greptile cycle is
   only complete when the newest request after the newest fix push has been
   polled to completion and its addressed review threads are confirmed
   `isResolved: true`.

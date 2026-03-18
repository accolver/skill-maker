# PR QA Plan: `fix/auth-bypass` → `myorg/backend`

## Context

- **Branch:** `fix/auth-bypass`
- **Repo:** `myorg/backend`
- **Project type:** Python FastAPI with `requirements.txt`
- **Critical issue:** A `.env` file containing database credentials was
  accidentally committed 3 commits ago
- **PR purpose:** Fixes a critical authentication bypass vulnerability

---

## Phase 1: Pre-flight Checks

### Step 1.1 — Verify gh CLI authentication

```bash
gh auth status
```

**Expected output:** Logged in to github.com as `<username>`. If not
authenticated, run `gh auth login` before proceeding.

**Decision point:** If auth fails → STOP. Cannot create PR without gh
authentication.

### Step 1.2 — Check branch status and tracking

```bash
git status -sb
```

**What I'm looking for:**

- Current branch is `fix/auth-bypass`
- Whether it tracks a remote branch (e.g., `origin/fix/auth-bypass`)
- Whether it's ahead/behind the remote

If no remote tracking branch exists, we'll need to push with `-u` later.

### Step 1.3 — Check for uncommitted changes

```bash
git diff --stat
git diff --cached --stat
```

**What I'm looking for:**

- Any unstaged modifications (working tree dirty)
- Any staged but uncommitted changes

**Decision point:** If uncommitted changes exist → warn the user and ask whether
to commit them or proceed with only what's already committed. For a security
fix, we want a clean working tree.

### Step 1.4 — Identify base branch

```bash
git remote show origin | grep 'HEAD branch'
```

**Expected:** `main` or `master`. This becomes the base for all diff-scoped
scans and the PR target.

### Step 1.5 — Detect project ecosystem

```bash
ls -la requirements.txt pyproject.toml package.json go.mod Cargo.toml pom.xml build.gradle 2>/dev/null
```

**Expected:** `requirements.txt` found → Python ecosystem. This means:

- CVE scanner: `pip audit --format json`
- Dependency file to watch: `requirements.txt`

### Step 1.6 — Review commit history on this branch

```bash
git log origin/main..HEAD --oneline --stat
```

**What I'm looking for:**

- Total number of commits ahead of main
- Which files were touched in each commit
- **CRITICAL:** Confirm the `.env` file appears in the commit history (user
  reported it was committed 3 commits ago)

```bash
git log --all --oneline -- .env
```

This confirms exactly which commit(s) touched `.env`.

---

## Phase 2: Security and Dependency Scan

### Step 2.1 — Secrets Scanning with gitleaks

```bash
gitleaks detect --source . --log-opts "origin/main..HEAD" --report-format json --report-path /tmp/gitleaks-report.json
```

**What I'm looking for:**

- Any secrets, API keys, passwords, tokens, or private keys in the diff
- **Specifically:** The `.env` file with database credentials that was committed
  3 commits ago

**If gitleaks is not installed:**

```bash
brew install gitleaks
```

(macOS — the platform we're on)

#### Expected gitleaks output

Based on the scenario, gitleaks **WILL** find critical secrets:

```
gitleaks: N finding(s)
  File: .env
  Rule: generic-password / database-url / etc.
  Match: DATABASE_URL = "postgresql://user:password@host:5432/db"
  (and potentially other credentials)
```

### 🚨 HARD GATE: SECRETS FOUND — WORKFLOW BLOCKED

**Per the skill's Key Principle #2: "Block on secrets, warn on everything
else."**

> "HARD GATE: If critical secrets are found (API keys, passwords, private keys,
> tokens), STOP and alert the user. Do NOT create the PR until secrets are
> removed from the diff and git history."

**The `.env` file with database credentials is a CRITICAL secret finding. The PR
QA process STOPS HERE until this is resolved.**

### Step 2.2 — Remediation Plan for the Committed `.env` File

This is the most critical part of the entire QA process. The `.env` file with
database credentials is in the git history. Simply deleting it in a new commit
is NOT sufficient — the credentials remain in git history and would be exposed
when the PR is created on GitHub.

#### Step 2.2.1 — Assess the damage scope

```bash
# See exactly what's in the .env file
git show HEAD~2:.env 2>/dev/null || git show HEAD~3:.env 2>/dev/null
```

(Adjust the `~N` based on which commit introduced it, confirmed in Step 1.6.)

```bash
# Check if .env is in .gitignore
grep -n "\.env" .gitignore
```

**What I'm looking for:**

- Exact credentials exposed (DB host, user, password, port, database name)
- Whether `.env` is already in `.gitignore` (if not, it needs to be added)
- Whether the `.env` file still exists on disk or was deleted in a later commit

#### Step 2.2.2 — Remove `.env` from git history

**Option A: Interactive rebase (preferred if only 3 commits to rewrite)**

```bash
# Identify the commit that added .env
git log --all --diff-filter=A -- .env --format="%H %s"

# Rebase interactively to edit that commit
git rebase -i <commit-before-env-was-added>
```

In the rebase editor, mark the offending commit as `edit`, then:

```bash
git rm --cached .env
git commit --amend --no-edit
git rebase --continue
```

**Option B: git filter-repo (if rebase is complex)**

```bash
# Install if needed
pip install git-filter-repo

# Remove .env from all history
git filter-repo --invert-paths --path .env --force
```

**Option C: BFG Repo Cleaner (alternative)**

```bash
# Remove the file from history
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

#### Step 2.2.3 — Ensure `.env` is gitignored going forward

```bash
# Add .env to .gitignore if not already present
echo ".env" >> .gitignore

# Also add common variants
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
echo ".env.*.local" >> .gitignore
```

```bash
# Commit the .gitignore update
git add .gitignore
git commit -m "chore: add .env to .gitignore to prevent credential leaks"
```

#### Step 2.2.4 — Credential rotation (MANDATORY)

**Alert to user:**

> ⚠️ **CREDENTIAL ROTATION REQUIRED**
>
> The database credentials in `.env` have been committed to git history. Even
> after removing them from history, you MUST rotate these credentials
> immediately:
>
> 1. **Database password** — Change the password on the database server
> 2. **Database user** — Consider creating a new user if the old one may be
>    compromised
> 3. **Any other secrets in .env** — Rotate ALL credentials that were in that
>    file
> 4. **Check access logs** — Review database access logs for unauthorized
>    connections
>
> If this branch was ever pushed to a remote (even briefly), treat the
> credentials as fully compromised.

#### Step 2.2.5 — Force push the cleaned branch

```bash
git push origin fix/auth-bypass --force-with-lease
```

**Note:** `--force-with-lease` is used per the skill's common mistakes table to
avoid overwriting others' changes.

#### Step 2.2.6 — Re-run secrets scan to confirm clean

```bash
gitleaks detect --source . --log-opts "origin/main..HEAD" --report-format json --report-path /tmp/gitleaks-report.json
```

**Expected:** 0 findings. If any remain, repeat the remediation.

**Decision point:** Only proceed to Step 2.3 if gitleaks returns clean.

### Step 2.3 — CVE Audit (Python ecosystem)

```bash
pip audit --format json
```

**If `pip-audit` is not installed:**

```bash
pip install pip-audit
```

**What I'm looking for:**

- Critical or high severity CVEs in dependencies listed in `requirements.txt`
- Specifically any CVEs in authentication-related packages (since this PR fixes
  an auth bypass, the dependencies matter)
- Known vulnerabilities in FastAPI, Starlette, uvicorn, python-jose, passlib,
  python-multipart, or whatever auth libraries are used

**Decision point:**

- Critical/High CVEs → flag to user, recommend fixing before PR
- Medium/Low CVEs → note as informational, continue workflow

---

## Phase 3: Deep Self-Review

### Step 3.0 — Scan for architectural guidance documents

```bash
ls -la README.md ARCHITECTURE.md PRD.md DESIGN.md docs/*.md docs/plans/*.md 2>/dev/null
```

Read any found documents to inform the review. For a FastAPI app, I'd
specifically look for:

- API design conventions
- Authentication/authorization patterns
- Database access patterns
- Testing conventions

### Step 3.1 — Get the full diff for review

```bash
git diff origin/main..HEAD
```

This is the complete diff that will be reviewed from four perspectives.

### Step 3.2 — Security Engineer Perspective

**Especially critical for this PR since it fixes an authentication bypass.**

| Check                        | What to look for                                                                               | Why it matters                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Auth bypass fix completeness | Does the fix cover ALL code paths that could bypass authentication?                            | Partial fixes leave attack surface                          |
| Input validation             | Are all user inputs to auth endpoints validated (email format, password length, token format)? | Malformed inputs can bypass validation logic                |
| Token handling               | Are JWTs validated properly (signature, expiration, issuer, audience)?                         | Weak JWT validation is a common bypass vector               |
| Session management           | Are sessions invalidated properly on logout/password change?                                   | Stale sessions can be replayed                              |
| Timing attacks               | Does the auth comparison use constant-time comparison?                                         | Timing side-channels leak credential validity               |
| Error messages               | Do auth error responses avoid leaking whether a user exists?                                   | User enumeration enables targeted attacks                   |
| Rate limiting                | Are auth endpoints rate-limited to prevent brute force?                                        | Auth bypass fixes should include brute-force protection     |
| SQL injection                | Are database queries parameterized (SQLAlchemy ORM or parameterized queries)?                  | Auth queries are high-value injection targets               |
| Password hashing             | Is bcrypt/argon2 used with proper work factors?                                                | Weak hashing makes credential theft worse                   |
| CORS configuration           | Are CORS origins restricted appropriately?                                                     | Overly permissive CORS can enable cross-origin auth attacks |
| Sensitive data in logs       | Does the fix avoid logging passwords, tokens, or session IDs?                                  | Log exposure is a secondary credential leak vector          |

### Step 3.3 — Application Architect Perspective

| Check                     | What to look for                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Pattern consistency       | Does the fix follow existing FastAPI dependency injection patterns for auth?           |
| Middleware vs. dependency | Is auth implemented as a FastAPI `Depends()` dependency (preferred) or raw middleware? |
| Existing utilities        | Does the codebase already have auth utilities that should be reused?                   |
| Error handling            | Are `HTTPException` responses consistent with the rest of the API?                     |
| Test coverage             | Are there tests for the auth bypass scenario? Are there tests for the fix?             |
| Configuration             | Are auth parameters (secret keys, token expiry) in config, not hardcoded?              |
| Separation of concerns    | Is auth logic in its own module, not mixed into route handlers?                        |
| Design doc adherence      | Does the fix align with any documented auth architecture?                              |

### Step 3.4 — Network Engineer Perspective

| Check                 | What to look for                                                            |
| --------------------- | --------------------------------------------------------------------------- |
| Endpoint design       | Do auth endpoints use proper HTTP methods (POST for login, not GET)?        |
| Status codes          | 401 for unauthenticated, 403 for unauthorized, not generic 400/500?         |
| TLS enforcement       | Is the app configured to reject non-HTTPS connections for auth endpoints?   |
| Timeout configuration | Are auth-related external calls (OAuth providers, LDAP) properly timed out? |
| Connection pooling    | Are database connections for auth queries properly pooled?                  |

### Step 3.5 — Scalability Engineer Perspective

| Check               | What to look for                                                            |
| ------------------- | --------------------------------------------------------------------------- |
| Database queries    | Does the auth check use indexed columns (email, user_id)?                   |
| N+1 patterns        | Does the auth flow make multiple sequential DB calls that could be batched? |
| Caching             | Are frequently-accessed auth data (user roles, permissions) cached?         |
| Blocking operations | Are auth operations async-compatible (not blocking the event loop)?         |
| Token storage       | If using refresh tokens, is the storage mechanism scalable?                 |

### Step 3.6 — Compile findings

Produce a structured findings table:

```markdown
| #   | Severity | File:Line          | Persona   | Description   | Fix            |
| --- | -------- | ------------------ | --------- | ------------- | -------------- |
| 1   | critical | auth.py:45         | Security  | [description] | [diff snippet] |
| 2   | high     | routes/login.py:23 | Architect | [description] | [diff snippet] |
| ... | ...      | ...                | ...       | ...           | ...            |
```

**Auto-fix boundary for this PR:**

- ✅ Auto-fix: Missing null checks, error handling gaps, linting issues,
  formatting
- ❌ Present to user: Any changes to auth logic, API contracts, database
  queries, or the bypass fix itself

---

## Phase 4: Create Draft PR

### Step 4.1 — Generate PR description

````markdown
## Summary

Fixes a critical authentication bypass vulnerability that allowed
unauthenticated access to protected endpoints. Also removes accidentally
committed credentials from git history.

## Motivation

A security audit / bug report identified that [specific bypass mechanism — e.g.,
missing token validation on certain routes, JWT signature not verified, etc.]
allowed unauthenticated users to access protected resources. This is a critical
security fix.

## Changes

### Authentication Fix

- [Specific description of what was broken and how it's fixed]
- [Which endpoints/routes are affected]
- [What validation was added/corrected]

### Credential Cleanup

- Removed accidentally committed `.env` file from git history
- Added `.env` and variants to `.gitignore`

## Testing Instructions

1. Start the FastAPI app: `uvicorn main:app --reload`
2. Attempt to access a protected endpoint without authentication:
   ```bash
   curl -X GET http://localhost:8000/api/protected-resource
   ```
````

Expected: 401 Unauthorized 3. Attempt to access with an invalid/expired token:

```bash
curl -X GET http://localhost:8000/api/protected-resource \
  -H "Authorization: Bearer invalid-token"
```

Expected: 401 Unauthorized 4. Attempt to access with a valid token:

```bash
curl -X GET http://localhost:8000/api/protected-resource \
  -H "Authorization: Bearer $(get-valid-token)"
```

Expected: 200 OK with resource data 5. Run the test suite: `pytest tests/ -v`

## Rollback Plan

Revert the merge commit:

```bash
git revert -m 1 <merge-commit-sha>
```

Note: Rollback re-exposes the auth bypass. If rolled back, apply network-level
access controls (WAF rules, IP allowlisting) as a temporary mitigation.

## Reviewer Notes

- **Security-critical:** This fixes an authentication bypass. Please review auth
  logic carefully.
- **History rewrite:** Git history was rewritten to remove committed
  credentials. If you had a local copy of this branch, you'll need to re-fetch.
- **Credential rotation:** Database credentials have been rotated. The old
  credentials in git history are no longer valid.
- **Follow-up:** Consider adding automated secrets scanning to CI pipeline to
  prevent future credential commits.

````
### Step 4.2 — Push and create draft PR

```bash
# Push the branch (force-with-lease because history was rewritten)
git push origin fix/auth-bypass --force-with-lease

# Create draft PR
gh pr create \
  --draft \
  --title "fix: resolve critical authentication bypass vulnerability" \
  --body "$(cat <<'EOF'
## Summary

Fixes a critical authentication bypass vulnerability that allowed
unauthenticated access to protected endpoints. Also removes accidentally
committed credentials from git history.

## Motivation

[Specific bypass mechanism description]

## Changes

### Authentication Fix
- [Details of the fix]

### Credential Cleanup
- Removed accidentally committed .env file from git history
- Added .env and variants to .gitignore

## Testing Instructions
1. Start the app: `uvicorn main:app --reload`
2. Test unauthenticated access returns 401
3. Test invalid token returns 401
4. Test valid token returns 200
5. Run test suite: `pytest tests/ -v`

## Rollback Plan
`git revert -m 1 <merge-commit-sha>`
Note: Rollback re-exposes the bypass. Apply WAF rules as temporary mitigation.

## Reviewer Notes
- Security-critical: review auth logic carefully
- Git history was rewritten to remove credentials
- Database credentials have been rotated
- Follow-up: add secrets scanning to CI
EOF
)"
````

**Capture the PR number from output** — needed for all subsequent phases.

```bash
PR_NUMBER=$(gh pr view --json number --jq '.number')
```

---

## Phase 5: Greptile Review Loop

### Cycle 1

#### Step 5.1.1 — Request Greptile review

```bash
gh pr comment $PR_NUMBER --body "@greptile"
```

#### Step 5.1.2 — Poll for Greptile response

```bash
# Get the comment ID of the @greptile trigger comment
COMMENT_ID=$(gh api repos/myorg/backend/issues/$PR_NUMBER/comments --jq '.[-1].id')

# Poll every 20 seconds, timeout after 15 minutes (45 iterations)
for i in $(seq 1 45); do
  echo "[$(($i * 20))s] Checking for Greptile response..."

  # Check reactions (eyes = reviewing, thumbs-up = done clean)
  REACTIONS=$(gh api repos/myorg/backend/issues/comments/$COMMENT_ID/reactions --jq '.[].content')

  # Check for new review comments from Greptile
  GREPTILE_COMMENTS=$(gh api repos/myorg/backend/pulls/$PR_NUMBER/comments \
    --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]')

  GREPTILE_ISSUE_COMMENTS=$(gh api repos/myorg/backend/issues/$PR_NUMBER/comments \
    --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]')

  # If we have Greptile comments, break
  if [ "$GREPTILE_COMMENTS" != "[]" ] || [ "$GREPTILE_ISSUE_COMMENTS" != "[]" ]; then
    echo "Greptile review complete!"
    break
  fi

  # If thumbs-up reaction and no comments, it's clean
  if echo "$REACTIONS" | grep -q "+1"; then
    echo "Greptile gave thumbs-up — no findings!"
    break
  fi

  sleep 20
done
```

#### Step 5.1.3 — Process Greptile findings

```bash
# Fetch PR-level (inline) comments from Greptile
gh api repos/myorg/backend/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")] | .[] | {path: .path, line: .line, body: .body}'

# Fetch issue-level (general) comments from Greptile
gh api repos/myorg/backend/issues/$PR_NUMBER/comments \
  --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")] | .[] | {body: .body}'
```

**For each finding:**

1. Categorize by severity and addressability
2. If code fix needed → make the change
3. If explanation needed → draft a reply
4. If false positive → draft dismissal with justification

```bash
# After addressing all findings
git add -A
git commit -m "address Greptile review findings (cycle 1)"
git push origin HEAD
```

**Decision point:** If code changes were made → proceed to Cycle 2. If Greptile
returned thumbs-up with no findings → skip to Phase 6.

### Cycles 2–5

Repeat the same pattern:

1. `gh pr comment $PR_NUMBER --body "@greptile"`
2. Poll every 20s, timeout 15min
3. Process findings, fix, commit, push
4. If clean → exit loop. If cycle 5 reached with remaining findings → escalate.

### Escalation (after 5 cycles)

If 5 cycles complete without a clean review:

- Present all remaining unresolved findings to the user
- Ask for manual decision on each: **fix**, **dismiss**, or **defer to
  post-merge**

---

## Phase 6: Comment Resolution

### Step 6.1 — Fetch ALL open review conversations

```bash
# All PR review comments (inline)
gh api repos/myorg/backend/pulls/$PR_NUMBER/comments

# All issue-level comments
gh api repos/myorg/backend/issues/$PR_NUMBER/comments

# All review threads
gh api repos/myorg/backend/pulls/$PR_NUMBER/reviews
```

### Step 6.2 — Process each unresolved comment

For each comment that hasn't been replied to:

1. **Code change required** → make the fix, push, reply confirming with commit
   SHA
2. **Question** → reply with the answer
3. **Already resolved** → reply linking to the commit that addressed it

```bash
# Reply to a specific comment
gh api repos/myorg/backend/pulls/$PR_NUMBER/comments/<COMMENT_ID>/replies \
  -f body="Fixed in <commit-sha>. [explanation of the fix]"
```

---

## Phase 7: Final Verification

### Step 7.1 — Re-run secrets scan

```bash
gitleaks detect --source . --log-opts "origin/main..HEAD" --report-format json --report-path /tmp/gitleaks-final-report.json
```

**Expected:** 0 findings. This is critical because fixes in Phases 3–6 could
have introduced new secrets.

### Step 7.2 — Check CI status

```bash
gh pr checks $PR_NUMBER
```

**What I'm looking for:**

- All CI checks passing (tests, linting, type checking)
- No failing security scans in CI

### Step 7.3 — Verify no unresolved conversations

```bash
gh api repos/myorg/backend/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.in_reply_to_id == null)] | length'
```

**Expected:** 0 unresolved top-level comments.

### Step 7.4 — Verify branch is up to date with base

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

**If base branch has moved ahead:**

```bash
git fetch origin main
git rebase origin/main
git push origin HEAD --force-with-lease
```

Then re-run Steps 7.1–7.3 after rebase.

---

## Phase 8: Mark Ready for Review

```bash
gh pr ready $PR_NUMBER
```

### Final Summary to User

```
PR QA Complete: fix/auth-bypass → myorg/backend

📊 Summary:
- Total findings discovered: [N]
  - Phase 2 (secrets): 1 critical (committed .env with DB credentials)
  - Phase 2 (CVE): [N] findings
  - Phase 3 (self-review): [N] findings across 4 perspectives
  - Phase 5 (Greptile): [N] findings across [M] cycles

- Resolution:
  - ✅ Secrets remediated: .env removed from history, credentials rotated
  - ✅ Auto-fixed: [N] findings (formatting, null checks, error handling)
  - ✅ Fixed with approval: [N] findings
  - ⏳ Deferred: [N] findings (if any)

- Greptile cycles completed: [M] of 5
- CI checks: ✅ All passing
- Unresolved comments: 0
- Branch status: Up to date with main

⚠️ Action items for the user:
1. Confirm database credentials have been rotated
2. Review any deferred findings for post-merge follow-up
3. Consider adding gitleaks to CI pipeline to prevent future credential commits

PR is ready for human review: https://github.com/myorg/backend/pull/[N]
```

---

## Checklist

- [ ] `gh auth status` confirms authentication
- [ ] Branch is pushed with commits ahead of base
- [ ] Secrets scan completed — **CRITICAL: .env with DB credentials found**
- [ ] **HARD GATE TRIGGERED** — secrets must be removed before PR creation
- [ ] `.env` removed from git history (rebase or filter-repo)
- [ ] `.env` added to `.gitignore`
- [ ] User alerted to rotate database credentials
- [ ] Secrets re-scan confirms clean history
- [ ] CVE audit completed with `pip audit --format json`
- [ ] Critical/high CVEs addressed
- [ ] Self-review completed from all four perspectives:
  - [ ] Security Engineer (especially thorough for auth bypass fix)
  - [ ] Application Architect
  - [ ] Network Engineer
  - [ ] Scalability Engineer
- [ ] Auto-fixes committed and pushed
- [ ] Draft PR created via `gh pr create --draft`
- [ ] Greptile review requested via `@greptile` comment
- [ ] Greptile findings addressed (or escalated after 5 cycles)
- [ ] All PR comments and inline suggestions resolved
- [ ] Final secrets re-scan clean
- [ ] CI checks passing
- [ ] Branch up to date with base
- [ ] PR marked ready via `gh pr ready`

---

## Key Decision Points Summary

| Decision Point                 | Condition                                 | Action                                    |
| ------------------------------ | ----------------------------------------- | ----------------------------------------- |
| Uncommitted changes?           | `git diff --stat` shows changes           | Warn user, ask to commit or proceed       |
| Secrets found?                 | gitleaks reports findings                 | **HARD STOP** — remove from history first |
| .env in history?               | `git log -- .env` shows commits           | Rewrite history, force push, rotate creds |
| Critical CVEs?                 | `pip audit` shows critical/high           | Flag to user, recommend fixing            |
| Self-review critical findings? | Security issues in auth fix               | Must fix before PR creation               |
| Greptile findings?             | Code changes needed                       | Fix, commit, push, re-request review      |
| 5 Greptile cycles exhausted?   | Still unresolved findings                 | Escalate to user for manual decision      |
| Base branch moved?             | `git log HEAD..origin/main` shows commits | Rebase, re-push, re-verify                |

## Critical Path for This Specific PR

The **most important** aspect of this PR QA is the `.env` file remediation. The
workflow is:

```
1. Detect .env in gitleaks scan
         ↓
2. HARD STOP — do not create PR
         ↓
3. Remove .env from git history (rebase -i or filter-repo)
         ↓
4. Add .env to .gitignore
         ↓
5. Alert user: ROTATE ALL CREDENTIALS IMMEDIATELY
         ↓
6. Force push cleaned branch (--force-with-lease)
         ↓
7. Re-run gitleaks to confirm clean
         ↓
8. Only THEN proceed with normal PR QA flow
```

Without this remediation, creating the PR would expose the database credentials
to anyone with read access to the repository, making the security fix
counterproductive.

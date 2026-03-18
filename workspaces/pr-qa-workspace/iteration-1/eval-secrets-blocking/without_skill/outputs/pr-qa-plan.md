# PR QA Plan: fix/auth-bypass

## Overview

- **Branch:** `fix/auth-bypass`
- **Repository:** `myorg/backend`
- **Type:** Critical security fix — authentication bypass
- **Framework:** Python FastAPI with `requirements.txt`
- **Known Issue:** `.env` file with database credentials was accidentally
  committed 3 commits ago

---

## Phase 1: Initial Assessment

### 1.1 Check current branch and status

```bash
git status
git branch --show-current
git log --oneline -10
```

**Purpose:** Confirm we're on `fix/auth-bypass`, see recent commit history, and
identify any uncommitted changes.

### 1.2 Review the full diff against the base branch

```bash
git fetch origin main
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

**Purpose:** Understand the full scope of changes that will be in the PR. Look
at every file touched.

### 1.3 Check remote tracking status

```bash
git remote -v
git status -sb
```

**Purpose:** Confirm the remote is set up correctly and whether the branch has
been pushed.

---

## Phase 2: CRITICAL — Secret Detection and Remediation

> **This is a blocking issue. The PR cannot proceed until this is resolved.**

### 2.1 Confirm the .env file is in the commit history

```bash
git log --all --diff-filter=A -- ".env"
git log --oneline --all -- ".env"
```

**Purpose:** Find exactly which commit introduced the `.env` file.

### 2.2 Inspect the .env file contents to assess exposure

```bash
git show <commit-sha>:.env
```

**Purpose:** Understand what credentials were exposed (database passwords, API
keys, etc.) so we know what needs to be rotated.

### 2.3 Check if .env is in .gitignore

```bash
cat .gitignore | grep -i env
```

**Purpose:** Determine if `.gitignore` already excludes `.env` or if we need to
add it.

### 2.4 Check if the branch has already been pushed to remote

```bash
git branch -r | grep fix/auth-bypass
git log origin/fix/auth-bypass..HEAD 2>/dev/null
```

**Purpose:** This is critical. If the branch has been pushed, the credentials
are already exposed in the remote history and **must be rotated immediately**
regardless of what we do with the git history.

### 2.5 Remediation Plan — Remove .env from history

**Option A: If the branch has NOT been pushed yet (preferred)**

Rewrite history to remove the `.env` file entirely:

```bash
# Use git-filter-repo or BFG Repo Cleaner to remove .env from all commits
# Option using git rebase (since it's only 3 commits ago):
git rebase -i HEAD~4
# Mark the commit that added .env for editing
# In that commit, run: git rm --cached .env && git commit --amend
# Continue the rebase

# Alternatively, using git filter-branch (less preferred):
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  HEAD~4..HEAD
```

**Option B: If the branch HAS been pushed**

The credentials are already compromised. We must:

1. **Immediately rotate all credentials** found in the `.env` file (database
   passwords, API keys, secrets)
2. Still rewrite history to remove the file:
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env' \
     HEAD~4..HEAD
   git push --force-with-lease origin fix/auth-bypass
   ```
3. Notify the security team about the credential exposure
4. Check if any other branches or forks contain the leaked credentials

### 2.6 Ensure .env is in .gitignore

```bash
# If not already present:
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
git add .gitignore
git commit -m "fix: add .env to .gitignore to prevent future credential leaks"
```

### 2.7 Verify .env is fully removed

```bash
# Confirm .env is not in the working tree tracked files
git ls-files | grep -i "\.env"

# Confirm .env is not in any commit on this branch
git log --all --diff-filter=A -- ".env"

# Double-check the file doesn't appear in the diff
git diff origin/main...HEAD --stat | grep -i env
```

### 2.8 Scan for other secrets in the codebase

```bash
# Search for hardcoded credentials, API keys, passwords
grep -rn "password\s*=" --include="*.py" .
grep -rn "secret\s*=" --include="*.py" .
grep -rn "api_key\s*=" --include="*.py" .
grep -rn "DATABASE_URL" --include="*.py" .
grep -rn "mongodb+srv://" --include="*.py" .
grep -rn "postgres://" --include="*.py" .

# Check for other sensitive files
git ls-files | grep -iE "\.(pem|key|cert|p12|pfx|env\.local|env\.production)"

# If available, run a dedicated secret scanner
# e.g., trufflehog, gitleaks, detect-secrets
trufflehog git file://. --branch fix/auth-bypass --only-verified 2>/dev/null || true
gitleaks detect --source . 2>/dev/null || true
```

**Decision Point:** If any additional secrets are found, they must be removed
before proceeding.

---

## Phase 3: Code Review — Authentication Fix

### 3.1 Review the actual auth bypass fix

```bash
git diff origin/main...HEAD -- "*.py"
```

**Purpose:** Examine every Python file change to understand the security fix.

### 3.2 Specific checks for the auth fix

**Things to verify in the code:**

- [ ] The bypass vulnerability is actually closed (not just partially patched)
- [ ] Authentication middleware is applied to all protected routes
- [ ] Token validation is performed correctly (signature, expiration, issuer)
- [ ] No fallback to unauthenticated access on token validation failure
- [ ] Error responses don't leak sensitive information (stack traces, internal
      paths)
- [ ] Rate limiting is in place for authentication endpoints
- [ ] Session/token invalidation works correctly
- [ ] No hardcoded credentials or backdoor accounts in the fix

### 3.3 Review FastAPI-specific patterns

```bash
# Check route decorators and dependencies
grep -rn "Depends(" --include="*.py" .
grep -rn "@app\.\(get\|post\|put\|delete\|patch\)" --include="*.py" .
grep -rn "APIRouter" --include="*.py" .

# Check for routes that might be missing auth dependencies
# Look for endpoints without auth dependency injection
```

**Things to verify:**

- [ ] Auth dependencies are injected via `Depends()` on all protected routes
- [ ] No routes accidentally left unprotected
- [ ] OAuth2/JWT scheme is properly configured
- [ ] CORS settings are appropriate (not overly permissive)

### 3.4 Check for common auth vulnerabilities

- [ ] No SQL injection in auth queries (parameterized queries used)
- [ ] Password comparison uses constant-time comparison
      (`secrets.compare_digest`)
- [ ] JWT tokens use strong algorithms (not `none`, not `HS256` with weak
      secret)
- [ ] Token expiration is enforced
- [ ] Refresh token rotation is implemented if applicable
- [ ] No IDOR (Insecure Direct Object Reference) in user-scoped endpoints

---

## Phase 4: Dependency and Configuration Review

### 4.1 Check requirements.txt changes

```bash
git diff origin/main...HEAD -- requirements.txt
```

**Purpose:** See if any new dependencies were added as part of the fix.

### 4.2 Audit dependencies

```bash
# Check for known vulnerabilities
pip-audit -r requirements.txt 2>/dev/null || true
safety check -r requirements.txt 2>/dev/null || true

# Verify pinned versions (security-critical packages should be pinned)
cat requirements.txt
```

**Things to verify:**

- [ ] All dependencies are pinned to specific versions (not ranges)
- [ ] No known CVEs in current dependency versions
- [ ] Auth-related packages (PyJWT, python-jose, passlib, bcrypt) are up to date
- [ ] No unnecessary new dependencies introduced

### 4.3 Check configuration files

```bash
# Look for config changes
git diff origin/main...HEAD -- "*.yaml" "*.yml" "*.toml" "*.cfg" "*.ini" "*.json"
```

---

## Phase 5: Testing Verification

### 5.1 Check for test coverage of the fix

```bash
# Look at test file changes
git diff origin/main...HEAD -- "tests/" "test_*" "*_test.py"

# List all test files
find . -name "test_*.py" -o -name "*_test.py" | head -20
```

**Things to verify:**

- [ ] Tests exist for the specific bypass scenario (regression test)
- [ ] Tests verify that unauthenticated requests are rejected (401/403)
- [ ] Tests verify that authenticated requests still work
- [ ] Tests cover edge cases (expired tokens, malformed tokens, missing headers)
- [ ] Tests cover the specific attack vector that was exploited

### 5.2 Run the test suite

```bash
# Run all tests
pytest -v

# Run with coverage
pytest --cov=app --cov-report=term-missing

# Run specifically auth-related tests
pytest -v -k "auth" 
pytest -v tests/test_auth.py
```

### 5.3 Run linting and type checking

```bash
# Linting
ruff check . 2>/dev/null || flake8 . 2>/dev/null || true
pylint app/ 2>/dev/null || true

# Type checking
mypy app/ 2>/dev/null || true

# Formatting
black --check . 2>/dev/null || true
```

---

## Phase 6: Pre-Push Verification

### 6.1 Final secret scan

```bash
# One more pass to make sure no secrets remain
git diff origin/main...HEAD | grep -iE "(password|secret|key|token|credential)"
```

### 6.2 Verify commit history is clean

```bash
git log --oneline origin/main..HEAD
git log --format="%H %s" origin/main..HEAD

# Verify no .env in any commit
for commit in $(git rev-list origin/main..HEAD); do
  if git diff-tree --no-commit-id --name-only -r $commit | grep -q "\.env"; then
    echo "WARNING: .env found in commit $commit"
  fi
done
```

### 6.3 Verify the branch is up to date with main

```bash
git fetch origin main
git log HEAD..origin/main --oneline
```

If main has advanced, rebase:

```bash
git rebase origin/main
# Resolve any conflicts
# Re-run tests after rebase
pytest -v
```

---

## Phase 7: Push and Create PR

### 7.1 Push the branch

```bash
git push -u origin fix/auth-bypass
```

If history was rewritten (due to .env removal) and branch was previously pushed:

```bash
git push --force-with-lease origin fix/auth-bypass
```

### 7.2 Create the Pull Request

```bash
gh pr create \
  --repo myorg/backend \
  --base main \
  --head fix/auth-bypass \
  --title "fix: close critical authentication bypass vulnerability" \
  --body "$(cat <<'EOF'
## Summary

Fixes a critical authentication bypass vulnerability that allowed unauthenticated access to protected endpoints.

## Security Notes

- **Severity:** Critical
- **Impact:** Unauthenticated users could access protected API endpoints
- **Fix:** [describe the specific fix — e.g., "Added proper JWT validation middleware to all protected route groups"]

## Changes

- [List specific files and what changed]
- Added regression tests for the bypass scenario
- Added `.env` to `.gitignore`

## Testing

- [ ] All existing tests pass
- [ ] New regression test covers the specific bypass vector
- [ ] Manual testing confirms unauthenticated requests are rejected
- [ ] Manual testing confirms authenticated requests still work

## Security Checklist

- [x] No secrets or credentials in the diff
- [x] `.env` file removed from history and added to `.gitignore`
- [x] Credentials that were exposed have been rotated
- [x] Auth middleware applied to all protected routes
- [x] Token validation covers expiration, signature, and issuer
- [x] No hardcoded credentials in codebase

## Credential Rotation Status

> **IMPORTANT:** A `.env` file containing database credentials was accidentally committed and has been removed from git history. The following credentials have been / need to be rotated:
>
> - [ ] Database password
> - [ ] [Any other credentials found in the .env]
>
> Please confirm rotation is complete before merging.
EOF
)"
```

### 7.3 Request appropriate reviewers

```bash
# Request security-focused reviewers
gh pr edit <pr-number> --add-reviewer security-team-lead,senior-backend-dev

# Add labels
gh pr edit <pr-number> --add-label "security,critical,needs-credential-rotation"
```

---

## Phase 8: Post-PR Actions

### 8.1 Verify CI passes

```bash
gh pr checks <pr-number> --watch
```

### 8.2 Monitor for any issues

- Watch for CI failures
- Respond to reviewer comments promptly (this is a critical security fix)
- Ensure credential rotation is tracked and completed

### 8.3 Coordinate with security team

- Notify security team of the vulnerability and fix
- Confirm credential rotation timeline
- Discuss whether a security advisory is needed
- Determine if the vulnerability was exploited (check access logs)

---

## Decision Tree Summary

```
START
  │
  ├─ Is .env in git history? ──── YES (confirmed) ────┐
  │                                                     │
  │                                    Has branch been pushed?
  │                                    ├── YES → ROTATE CREDENTIALS IMMEDIATELY
  │                                    │         Rewrite history + force push
  │                                    └── NO  → Rewrite history (interactive rebase)
  │                                                     │
  ├─ Is .env in .gitignore? ──── Add if missing ────────┤
  │                                                     │
  ├─ Are there other secrets? ── Scan and remove ───────┤
  │                                                     │
  ├─ Does the auth fix work? ── Review code + tests ────┤
  │                                                     │
  ├─ Do tests pass? ─────────── Run pytest ─────────────┤
  │                                                     │
  ├─ Is branch up to date? ──── Rebase if needed ───────┤
  │                                                     │
  └─ All clear? ──────────────── Push + Create PR ──────┘
```

---

## Blocking Issues (Must Resolve Before PR)

| # | Issue                                           | Severity     | Status                          |
| - | ----------------------------------------------- | ------------ | ------------------------------- |
| 1 | `.env` with DB credentials in commit history    | **CRITICAL** | Must remove from history        |
| 2 | Credential rotation needed if branch was pushed | **CRITICAL** | Must rotate all exposed secrets |
| 3 | `.env` must be in `.gitignore`                  | High         | Must add before PR              |
| 4 | Secret scan of entire diff                      | High         | Must pass clean                 |

## Non-Blocking Issues (Can Address in PR Review)

| # | Issue                                    | Severity |
| - | ---------------------------------------- | -------- |
| 1 | Test coverage for auth bypass regression | Medium   |
| 2 | Dependency audit for known CVEs          | Medium   |
| 3 | Linting/formatting compliance            | Low      |

---

## Commands Quick Reference

```bash
# Phase 2: Secret remediation
git log --all --diff-filter=A -- ".env"
git rebase -i HEAD~4                          # Remove .env from history
echo ".env" >> .gitignore && git add .gitignore && git commit -m "fix: add .env to .gitignore"
git ls-files | grep -i "\.env"                # Verify removal

# Phase 3: Code review
git diff origin/main...HEAD -- "*.py"

# Phase 5: Testing
pytest -v --cov=app --cov-report=term-missing

# Phase 7: PR creation
git push -u origin fix/auth-bypass
gh pr create --repo myorg/backend --base main --head fix/auth-bypass --title "fix: close critical authentication bypass vulnerability" --body "..."
```

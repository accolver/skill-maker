# PR QA Plan: feature/add-user-search

## Context

- **Branch:** `feature/add-user-search`
- **Commits:** 4 commits adding a new search endpoint to an Express API
- **Base branch:** `main`
- **Repository:** `myorg/myapi` on GitHub
- **Key details:** Endpoint queries PostgreSQL with user-provided search terms;
  `lodash` package added for string utilities

---

## Phase 1: Pre-flight Checks

### Step 1.1 — Verify gh CLI authentication

```bash
gh auth status
```

**What I check:**

- Output confirms authentication to `github.com` as a user with push access to
  `myorg/myapi`
- If authentication fails, STOP and instruct the user to run `gh auth login`

### Step 1.2 — Verify branch state and tracking

```bash
git status -sb
```

**What I check:**

- Current branch is `feature/add-user-search`
- Branch tracks a remote (e.g., `origin/feature/add-user-search`), or if not,
  note that we need to push with `-u` flag later
- No merge conflicts in progress

### Step 1.3 — Check for uncommitted changes

```bash
git diff --stat
git diff --cached --stat
```

**What I check:**

- If there are unstaged or staged changes, WARN the user: "You have uncommitted
  changes. Should I commit them before proceeding, or proceed with only the 4
  existing commits?"
- If clean, proceed

### Step 1.4 — Confirm base branch

```bash
git remote show origin | grep 'HEAD branch'
```

**What I check:**

- Confirm the default branch is `main` (matches user's stated base branch)
- If it's `master` or something else, ask the user to confirm

### Step 1.5 — Review commit history

```bash
git log origin/main..HEAD --oneline --no-decorate
```

**What I check:**

- Exactly 4 commits are ahead of `origin/main`
- Commit messages are coherent and describe the search endpoint work
- No merge commits that might indicate a messy history

### Step 1.6 — Detect project ecosystem

```bash
ls -la package.json requirements.txt pyproject.toml go.mod Cargo.toml pom.xml build.gradle 2>/dev/null
```

**What I check:**

- `package.json` should exist (Express API = Node.js ecosystem)
- This determines we use `npm audit` for CVE scanning in Phase 2

### Step 1.7 — Review the full diff

```bash
git diff origin/main..HEAD
```

**What I check:**

- Understand the full scope of changes across all 4 commits
- Identify all files touched: route definitions, controllers, models,
  middleware, package.json, package-lock.json, tests, etc.
- Note the search endpoint implementation details for the deep review in Phase 3

**Decision point:** If uncommitted changes exist, ask user. Otherwise proceed to
Phase 2.

---

## Phase 2: Security and Dependency Scan

### Step 2.1 — Secrets scanning with gitleaks

```bash
gitleaks detect --source . --log-opts "origin/main..HEAD" --report-format json --report-path /tmp/gitleaks-report.json
```

**What I check:**

- Scan is scoped to PR diff only (`origin/main..HEAD`), NOT full repo history
- Review the JSON report for any findings

**If gitleaks is not installed:** Try in order:

1. `brew install gitleaks` (macOS — we're on darwin)
2. `npm install -g gitleaks`

**Specific things I look for in this PR:**

- Database connection strings or PostgreSQL credentials hardcoded in the search
  endpoint code
- API keys or tokens in configuration files
- Any `.env` files accidentally committed
- Hardcoded passwords in test fixtures

**HARD GATE:** If critical secrets are found (API keys, passwords, private keys,
database credentials, tokens):

- **STOP immediately**
- Alert the user with the exact file, line, and secret type
- Do NOT create the PR
- Guide the user to remove the secret from the diff AND from git history (using
  `git filter-branch` or `BFG Repo Cleaner`)
- Only proceed after re-scan is clean

**If no secrets found:** Proceed to CVE audit.

### Step 2.2 — CVE audit (Node.js ecosystem)

```bash
npm audit --json
```

**What I check:**

- Focus specifically on vulnerabilities introduced by the `lodash` addition
- Check `package-lock.json` diff to see exactly which new dependencies were
  added:
  ```bash
  git diff origin/main..HEAD -- package-lock.json | head -200
  ```
- Flag any **critical** or **high** severity CVEs in `lodash` or its transitive
  dependencies

**Known lodash concerns to specifically check:**

- Prototype pollution vulnerabilities (CVE-2020-8203, CVE-2021-23337) — these
  are fixed in lodash >= 4.17.21
- Verify the installed lodash version:
  ```bash
  node -e "console.log(require('lodash/package.json').version)"
  ```

**Severity handling:**

| Severity | Action                                                      |
| -------- | ----------------------------------------------------------- |
| Critical | Must fix before PR — upgrade dependency or find alternative |
| High     | Should fix — attempt upgrade, flag to user if not possible  |
| Medium   | Informational — note in PR description                      |
| Low      | Informational only                                          |

**Additional dependency concern:** Evaluate whether `lodash` is the right
choice. If only string utilities are needed, consider:

- Using native JS string methods (no dependency needed)
- Using `lodash-es` for tree-shaking
- Importing only needed functions: `lodash.trim`, `lodash.escape`, etc. This is
  an architectural observation for Phase 3, not a blocker.

---

## Phase 3: Deep Self-Review

### Step 3.0 — Scan for architectural guidance documents

```bash
ls -la README.md ARCHITECTURE.md PRD.md DESIGN.md docs/*.md docs/plans/*.md 2>/dev/null
```

**What I do:** Read any found design documents to understand:

- Existing API patterns and conventions
- Database access patterns (ORM vs raw queries, connection pooling)
- Authentication/authorization approach
- Error handling conventions
- Testing requirements

### Step 3.1 — Security Engineer Perspective

**Focus areas for a search endpoint querying PostgreSQL with user input:**

#### SQL Injection (CRITICAL priority)

- **Check:** How are user-provided search terms passed to PostgreSQL?
- **Look for:** Raw string concatenation in SQL queries:
  ```javascript
  // DANGEROUS — SQL injection
  const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`;

  // SAFE — parameterized query
  const query = "SELECT * FROM users WHERE name LIKE $1";
  const params = [`%${searchTerm}%`];
  ```
- **Check:** If using an ORM (Sequelize, Knex, Prisma, TypeORM), verify the
  search uses the ORM's parameterization, not raw queries
- **Check:** If using `pg` driver directly, verify all queries use parameterized
  format (`$1`, `$2`, etc.)
- **Severity:** CRITICAL if raw string interpolation is found

#### Input Validation

- **Check:** Is the search term validated before use?
  - Maximum length limit (prevent DoS via extremely long search strings)
  - Character sanitization (strip or escape special characters)
  - Type validation (ensure it's a string, not an object/array)
- **Check:** Are query parameters validated? (e.g., `limit`, `offset`, `page`,
  `sort`)
  - Numeric parameters should be parsed as integers with bounds
  - Sort fields should be whitelisted against allowed column names
- **Severity:** HIGH if no input validation exists

#### Authentication/Authorization

- **Check:** Does the search endpoint require authentication?
- **Check:** If the search returns user data, are there authorization checks to
  prevent data leakage?
- **Check:** Is there rate limiting on the search endpoint to prevent
  enumeration attacks?
- **Severity:** HIGH if endpoint is unprotected and returns sensitive data

#### Sensitive Data Exposure

- **Check:** What fields does the search return? Does it include passwords,
  tokens, SSNs, emails?
- **Check:** Are search results filtered to exclude sensitive fields?
- **Check:** Do error messages leak database schema or query details?
- **Severity:** HIGH if sensitive fields are returned without filtering

#### XSS

- **Check:** If search results are rendered in any response, are they properly
  escaped?
- **Check:** Does the search term get reflected back in the response? (reflected
  XSS risk)
- **Severity:** MEDIUM for API-only endpoints (consumers should handle), HIGH if
  any HTML rendering

### Step 3.2 — Application Architect Perspective

#### Consistency with Existing Patterns

- **Check:** How do other endpoints in the codebase handle:
  - Route definition (file structure, naming conventions)
  - Controller/handler pattern
  - Request validation (middleware? inline? schema validation library?)
  - Response formatting (envelope pattern? direct? pagination structure?)
  - Error responses (error codes, message format)
- **Check:** Does the new search endpoint follow these same patterns?
- **Severity:** MEDIUM if inconsistent

#### Lodash Usage Assessment

- **Check:** What lodash functions are actually used?
- **Check:** Do native JS equivalents exist? (e.g., `String.prototype.trim()`,
  `String.prototype.toLowerCase()`, template literals)
- **Check:** Does the project already have a string utility library?
- **Check:** Is the full `lodash` package imported, or just specific functions?
  ```javascript
  // Bad — imports entire lodash (70KB+ minified)
  import _ from "lodash";

  // Better — import specific functions
  import trim from "lodash/trim";
  import escape from "lodash/escape";
  ```
- **Severity:** MEDIUM (unnecessary dependency bloat)

#### Error Handling

- **Check:** What happens when:
  - PostgreSQL is unreachable?
  - The query times out?
  - The search term produces no results?
  - The search term causes a query error?
- **Check:** Are errors caught and returned with appropriate HTTP status codes?
- **Check:** Is error handling consistent with the project's existing pattern?
- **Severity:** HIGH if errors are unhandled or leak stack traces

#### Testing

- **Check:** Are there tests for the new search endpoint?
  - Unit tests for the search logic/query building
  - Integration tests for the endpoint (HTTP request/response)
  - Edge case tests (empty search, special characters, very long input, SQL
    injection attempts)
- **Check:** Do tests follow the project's existing test patterns?
- **Severity:** HIGH if no tests exist for new functionality

#### Separation of Concerns

- **Check:** Is the search logic in the route handler, or properly separated
  into a service/repository layer?
- **Check:** Is the SQL query building separated from the HTTP handling?
- **Severity:** MEDIUM if business logic is in the route handler

### Step 3.3 — Network Engineer Perspective

#### API Endpoint Design

- **Check:** Is the endpoint RESTful?
  - `GET /users/search?q=term` or `GET /users?search=term` (preferred for
    search)
  - NOT `POST /search` with body (unless there's a good reason)
- **Check:** Proper HTTP status codes:
  - `200` for successful search (even with 0 results)
  - `400` for invalid search parameters
  - `401`/`403` for auth failures
  - `500` for server errors (should not leak details)
  - `429` for rate limiting
- **Severity:** MEDIUM if non-RESTful

#### Timeout Configuration

- **Check:** Is there a query timeout on the PostgreSQL query?
  ```javascript
  // Should have a statement_timeout
  const result = await pool.query({
    text: 'SELECT ...',
    values: [...],
    timeout: 5000 // 5 second timeout
  });
  ```
- **Check:** Is there a request timeout on the Express route?
- **Severity:** HIGH if no query timeout (user can craft slow queries for DoS)

#### Connection Pooling

- **Check:** Is the PostgreSQL connection using a pool (e.g., `pg.Pool`), not
  creating new connections per request?
- **Check:** Is the pool properly configured with min/max connections?
- **Check:** Are connections properly released after use?
- **Severity:** HIGH if not using connection pooling

### Step 3.4 — Scalability Engineer Perspective

#### Query Performance

- **Check:** Does the search query use `LIKE '%term%'`? (full table scan, no
  index usage)
  - Better: Use PostgreSQL full-text search (`to_tsvector`, `to_tsquery`)
  - Better: Use `ILIKE` with a trigram index (`pg_trgm` extension)
  - Better: Use `LIKE 'term%'` (prefix match, can use B-tree index)
- **Check:** Is there an index on the searched column(s)?
  ```sql
  -- Check for existing indexes
  CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
  -- or for full-text search
  CREATE INDEX idx_users_search ON users USING gin (to_tsvector('english', name));
  ```
- **Severity:** HIGH if using `LIKE '%term%'` on a large table with no index

#### Pagination

- **Check:** Does the search endpoint support pagination?
  - `limit` and `offset` parameters (or cursor-based pagination)
  - Default limit if none specified (e.g., 20 or 50)
  - Maximum limit cap (e.g., 100) to prevent fetching entire table
- **Check:** Does the response include pagination metadata? (`total`, `page`,
  `hasMore`)
- **Severity:** HIGH if no pagination (unbounded result sets)

#### Unbounded Memory

- **Check:** Could the search return thousands of rows loaded into memory?
- **Check:** Is there streaming for large result sets?
- **Severity:** HIGH if results are unbounded

#### Caching

- **Check:** Are common search queries cached? (Redis, in-memory LRU)
- **Check:** Are cache headers set on the response? (`Cache-Control`, `ETag`)
- **Severity:** LOW (optimization, not a bug)

### Step 3.5 — Compile Findings

Produce a structured findings table:

```
| # | Severity | Persona | File:Line | Issue | Fix |
|---|----------|---------|-----------|-------|-----|
| 1 | CRITICAL | Security | src/routes/search.ts:XX | SQL injection via string interpolation | Use parameterized queries |
| 2 | HIGH | Security | src/routes/search.ts:XX | No input validation on search term | Add express-validator or joi schema |
| 3 | HIGH | Scalability | src/routes/search.ts:XX | No pagination on search results | Add limit/offset with defaults |
| 4 | HIGH | Scalability | src/routes/search.ts:XX | LIKE '%term%' without index | Add pg_trgm index or use full-text search |
| 5 | HIGH | Network | src/routes/search.ts:XX | No query timeout | Add statement_timeout |
| 6 | HIGH | Architect | - | No tests for search endpoint | Add unit and integration tests |
| 7 | MEDIUM | Architect | package.json | Full lodash imported for string utils | Use native methods or lodash submodules |
| 8 | MEDIUM | Architect | src/routes/search.ts:XX | Search logic in route handler | Extract to service layer |
| ... | ... | ... | ... | ... | ... |
```

### Step 3.6 — Auto-fix vs. User Approval

**Auto-fix (do immediately):**

- Add missing `try/catch` around database queries
- Add input type checking (`typeof searchTerm === 'string'`)
- Fix import style for lodash (full import → specific function imports)
- Add missing `return` statements after error responses
- Fix linting/formatting issues

**Present to user for approval:**

- Switching from string interpolation to parameterized queries (changes query
  logic)
- Adding pagination (changes API contract)
- Adding database indexes (requires migration)
- Replacing lodash with native methods (changes dependency)
- Adding authentication middleware (changes access control)
- Switching to full-text search (changes search behavior)

**Apply approved auto-fixes:**

```bash
git add -A
git commit -m "fix: address self-review findings (input validation, error handling, import optimization)"
git push origin HEAD
```

---

## Phase 4: Create Draft PR

### Step 4.1 — Push branch to remote

```bash
git push -u origin feature/add-user-search
```

(Use `-u` to set upstream tracking if not already set)

### Step 4.2 — Generate PR description

Based on the 4 commits and the diff analysis, generate a structured description:

````markdown
## Summary

Add a user search endpoint to the Express API that queries PostgreSQL with
user-provided search terms, enabling clients to find users by name or other
attributes.

## Motivation

[To be filled based on commit messages and any linked issues — e.g., "Implements
user search functionality requested in #123 to support the new frontend search
bar."]

## Changes

### Search Endpoint

- Added `GET /api/users/search` endpoint accepting query parameters for search
  terms
- Implemented PostgreSQL query with parameterized inputs to prevent SQL
  injection
- Added input validation for search parameters (length limits, type checking)
- Returns paginated results with standard response envelope

### Dependencies

- Added `lodash` for string utility functions (trim, escape, etc.)
- [Note: Consider replacing with native methods or lodash submodules in
  follow-up]

### Error Handling

- Added proper error responses for invalid input (400), auth failures (401/403),
  and server errors (500)
- Database query timeouts configured to prevent long-running queries

### Tests

- [Added unit tests for search query building]
- [Added integration tests for the search endpoint]
- [Edge cases: empty search, special characters, pagination boundaries]

## Testing Instructions

1. Start the API server: `npm run dev`
2. Ensure PostgreSQL is running with seed data
3. Test basic search:
   ```bash
   curl "http://localhost:3000/api/users/search?q=john&limit=10"
   ```
````

4. Test edge cases:
   ```bash
   # Empty search
   curl "http://localhost:3000/api/users/search?q="
   # Special characters
   curl "http://localhost:3000/api/users/search?q=O'Brien"
   # Pagination
   curl "http://localhost:3000/api/users/search?q=john&limit=5&offset=10"
   ```

## Rollback Plan

- Revert this PR's merge commit: `git revert <merge-sha>`
- No database migrations to roll back (search uses existing tables)
- Remove `lodash` from dependencies: `npm uninstall lodash`

## Reviewer Notes

- Search uses [parameterized queries / ORM methods] to prevent SQL injection —
  please verify
- Lodash was added for [specific functions] — open to replacing with native
  methods if preferred
- No database migration included; consider adding a trigram index for production
  performance
- Rate limiting on the search endpoint is deferred to [follow-up issue]

````
### Step 4.3 — Create draft PR

```bash
gh pr create --draft \
  --title "feat: add user search endpoint with PostgreSQL query" \
  --body "$(cat <<'EOF'
## Summary

Add a user search endpoint to the Express API that queries PostgreSQL with user-provided search terms, enabling clients to find users by name or other attributes.

## Motivation

[Filled based on commit messages and linked issues]

## Changes

### Search Endpoint
- Added `GET /api/users/search` endpoint with query parameter support
- Implemented parameterized PostgreSQL queries to prevent SQL injection
- Added input validation for search parameters
- Returns paginated results with standard response envelope

### Dependencies
- Added `lodash` for string utility functions

### Error Handling
- Proper error responses for invalid input (400), auth failures (401/403), server errors (500)
- Database query timeouts configured

## Testing Instructions
1. Start the API server: `npm run dev`
2. Test: `curl "http://localhost:3000/api/users/search?q=john&limit=10"`
3. Test edge cases: empty search, special characters, pagination

## Rollback Plan
- Revert merge commit: `git revert <merge-sha>`
- No database migrations to roll back

## Reviewer Notes
- Parameterized queries used for SQL injection prevention
- Lodash added for string utilities — open to alternatives
- Consider adding trigram index for production performance
EOF
)"
````

### Step 4.4 — Capture PR number

```bash
# The gh pr create command outputs the PR URL, e.g.:
# https://github.com/myorg/myapi/pull/42
# Extract PR number: 42
PR_NUMBER=42  # captured from output
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
# Get the comment ID of the @greptile comment
COMMENT_ID=$(gh api repos/myorg/myapi/issues/$PR_NUMBER/comments --jq '.[-1].id')

# Poll every 20 seconds, timeout after 15 minutes (45 iterations)
for i in $(seq 1 45); do
  echo "[$(($i * 20))s] Checking for Greptile response..."
  
  # Check reactions (eyes = reviewing, thumbs-up = done clean)
  REACTIONS=$(gh api repos/myorg/myapi/issues/comments/$COMMENT_ID/reactions --jq '.[].content')
  
  # Check for new review comments from Greptile
  GREPTILE_COMMENTS=$(gh api repos/myorg/myapi/pulls/$PR_NUMBER/comments \
    --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]')
  
  # Also check issue-level comments
  GREPTILE_ISSUE_COMMENTS=$(gh api repos/myorg/myapi/issues/$PR_NUMBER/comments \
    --jq '[.[] | select(.user.login == "greptile-inc[bot]" or .user.login == "greptile[bot]")]')
  
  # If we have Greptile comments, break
  if [ "$GREPTILE_COMMENTS" != "[]" ] || [ "$GREPTILE_ISSUE_COMMENTS" != "[]" ]; then
    echo "Greptile review complete!"
    break
  fi
  
  # If thumbs-up reaction and no comments, it's a clean review
  if echo "$REACTIONS" | grep -q "+1"; then
    echo "Greptile gave thumbs-up — clean review!"
    break
  fi
  
  sleep 20
done
```

**Timeout handling:** If 15 minutes pass with no response:

- Warn the user: "Greptile has not responded after 15 minutes. This may indicate
  Greptile is not configured for this repository."
- Ask: "Continue waiting, skip Greptile review, or proceed without it?"

#### Step 5.1.3 — Process Greptile findings

```bash
# Fetch PR-level comments (general review)
gh api repos/myorg/myapi/issues/$PR_NUMBER/comments

# Fetch inline code suggestions (file-specific)
gh api repos/myorg/myapi/pulls/$PR_NUMBER/comments
```

**For each Greptile finding, categorize and address:**

| Finding Type             | Action                                                      |
| ------------------------ | ----------------------------------------------------------- |
| Code fix needed          | Make the change, commit referencing the finding             |
| False positive           | Reply to comment explaining why current approach is correct |
| Architectural suggestion | Present to user for decision                                |
| Style/formatting         | Auto-fix                                                    |

**Expected Greptile findings for a search endpoint:**

- SQL injection concerns (if any raw queries)
- Missing input validation
- Missing error handling
- Pagination concerns
- Performance suggestions (indexing, caching)
- Lodash usage optimization

#### Step 5.1.4 — Push fixes and iterate

```bash
git add -A
git commit -m "address Greptile review findings (cycle 1)"
git push origin HEAD
```

If code changes were made, proceed to Cycle 2 (back to Step 5.1.1). If Greptile
returned thumbs-up with no findings, Greptile loop is complete.

### Cycles 2-5

Repeat the same pattern:

1. Comment `@greptile` on the PR
2. Poll every 20 seconds for up to 15 minutes
3. Process findings, fix code, reply to comments
4. Push fixes
5. If clean review or cycle 5 reached, exit loop

### Escalation (after 5 cycles)

If 5 cycles complete without a clean Greptile review:

- Present all remaining unresolved findings to the user
- For each finding, ask: **Fix**, **Dismiss with justification**, or **Defer to
  post-merge**
- Apply user decisions, push final changes

---

## Phase 6: Comment Resolution

### Step 6.1 — Fetch all open review conversations

```bash
# Get all PR review comments (inline code comments)
gh api repos/myorg/myapi/pulls/$PR_NUMBER/comments

# Get all issue-level comments (general PR comments)
gh api repos/myorg/myapi/issues/$PR_NUMBER/comments

# Get review threads (requested changes, approvals)
gh api repos/myorg/myapi/pulls/$PR_NUMBER/reviews
```

### Step 6.2 — Process each unresolved comment

For each comment that hasn't been replied to or resolved:

1. **Read the comment and thread context** — understand what's being asked
2. **If it requires a code change:**
   - Make the fix
   - Commit with a message referencing the comment
   - Reply to the comment confirming the fix with the commit SHA
3. **If it's a question:**
   - Reply with a clear answer
4. **If it's already resolved by a previous commit:**
   - Reply linking to the commit that addressed it
5. **If it's a suggestion to dismiss:**
   - Reply with concrete justification for why the current approach is correct

### Step 6.3 — Push all resolution commits

```bash
git add -A
git commit -m "resolve PR review comments"
git push origin HEAD
```

---

## Phase 7: Final Verification

### Step 7.1 — Re-run secrets scan

```bash
gitleaks detect --source . --log-opts "origin/main..HEAD" --report-format json --report-path /tmp/gitleaks-final-report.json
```

**Why re-scan:** Fixes applied during Phases 3-6 could have introduced new
secrets. This is a common mistake to skip.

**HARD GATE:** If any secrets found, STOP and fix before proceeding.

### Step 7.2 — Check CI status

```bash
gh pr checks $PR_NUMBER
```

**What I check:**

- All CI checks are passing (green)
- If any checks are failing, investigate and fix:
  - Test failures → fix tests or code
  - Lint failures → fix formatting
  - Build failures → fix compilation errors
  - Security scan failures → address findings

**If CI is still running:** Wait and re-check:

```bash
gh pr checks $PR_NUMBER --watch
```

### Step 7.3 — Verify no unresolved conversations

```bash
# Count unresolved top-level review comments
gh api repos/myorg/myapi/pulls/$PR_NUMBER/comments \
  --jq '[.[] | select(.in_reply_to_id == null)] | length'
```

**What I check:**

- All review threads have replies
- No outstanding "changes requested" reviews without resolution

### Step 7.4 — Verify branch is up to date with base

```bash
git fetch origin
git log HEAD..origin/main --oneline
```

**What I check:**

- If `origin/main` has new commits since we branched, we need to rebase:
  ```bash
  git fetch origin main
  git rebase origin/main
  git push origin HEAD --force-with-lease
  ```
- **Always use `--force-with-lease`**, never `--force`, to avoid overwriting
  others' changes
- After rebase, re-run secrets scan (Step 7.1) since the diff changed

---

## Phase 8: Mark Ready for Review

### Step 8.1 — Mark PR as ready

```bash
gh pr ready $PR_NUMBER
```

### Step 8.2 — Present summary to user

```
=== PR QA Summary: feature/add-user-search ===

PR: https://github.com/myorg/myapi/pull/$PR_NUMBER
Branch: feature/add-user-search → main

--- Security & Dependency Scan ---
Secrets scan: CLEAN (no findings)
CVE audit: [X critical, Y high, Z medium findings]
  - Critical/High: [resolved/not applicable]
  - Medium: [noted in PR description]
Lodash version: [version] — [clean / has known CVEs]

--- Self-Review Findings ---
Total findings: [N]
  - Critical: [N] (all fixed)
  - High: [N] ([N] fixed, [N] user-approved)
  - Medium: [N] ([N] fixed, [N] deferred)
  - Low/Info: [N]

Key fixes applied:
  1. [Parameterized SQL queries to prevent injection]
  2. [Added input validation with length limits]
  3. [Added pagination with default limit of 20]
  4. [Added query timeout of 5 seconds]
  5. [Optimized lodash imports to specific functions]

--- Greptile Review ---
Cycles completed: [N]
Findings addressed: [N]
Final status: [Clean / N remaining items]

--- Comment Resolution ---
Total comments: [N]
Resolved: [N]
Remaining: [N] (require manual attention)

--- Final Checks ---
Secrets re-scan: CLEAN
CI checks: ALL PASSING
Branch: Up to date with main
Unresolved conversations: 0

--- Items Requiring Manual Attention ---
[List any deferred items, e.g.:]
  - Consider adding pg_trgm index for search performance (post-merge optimization)
  - Rate limiting on search endpoint (follow-up issue recommended)
  - Evaluate replacing lodash with native methods (tech debt)

PR is marked READY FOR REVIEW.
```

---

## Checklist Verification

At the end of the workflow, verify every item:

- [x] `gh auth status` confirms authentication
- [x] Branch is pushed with commits ahead of base
- [x] Secrets scan completed with no critical findings
- [x] CVE audit completed, critical/high CVEs addressed
- [x] Self-review completed from all four perspectives (Security, Architect,
      Network, Scalability)
- [x] Auto-fixes committed and pushed
- [x] Draft PR created via `gh pr create --draft`
- [x] Greptile review requested via `@greptile` comment
- [x] Greptile findings addressed (or escalated after 5 cycles)
- [x] All PR comments and inline suggestions resolved
- [x] Final secrets re-scan clean
- [x] CI checks passing
- [x] Branch up to date with base
- [x] PR marked ready via `gh pr ready`

---

## Specific Risk Areas for This PR

Given the context (Express API, PostgreSQL search with user input, lodash
addition), these are the highest-priority items I would focus on:

### 1. SQL Injection (CRITICAL)

User-provided search terms going directly to PostgreSQL is the #1 risk. I would
verify parameterized queries are used in every single database call, with zero
exceptions. This is a hard blocker.

### 2. Missing Pagination (HIGH)

A search endpoint without pagination can return the entire users table. I would
verify `LIMIT` and `OFFSET` (or cursor-based pagination) are implemented with
sensible defaults and maximums.

### 3. Missing Input Validation (HIGH)

Search terms need length limits (prevent DoS via 10MB search strings), type
checking, and potentially character restrictions. Sort/filter parameters need
whitelisting.

### 4. Query Performance (HIGH)

`LIKE '%term%'` on a large table without an index is a production incident
waiting to happen. I would check the query pattern and recommend appropriate
indexing.

### 5. Lodash Dependency Size (MEDIUM)

Full `lodash` import adds ~70KB to the bundle. For string utilities, native JS
methods or specific lodash function imports are preferred.

### 6. Missing Query Timeout (HIGH)

Without a `statement_timeout`, a crafted search term could trigger a slow query
that holds a connection indefinitely, eventually exhausting the connection pool.

### 7. Error Information Leakage (MEDIUM)

PostgreSQL error messages can reveal table names, column names, and query
structure. Error responses must sanitize database errors before returning them
to the client.

# PR Submission & QA Plan: feature/add-user-search

## Overview

**Branch:** `feature/add-user-search` **Base:** `main` **Repo:** `myorg/myapi`
(GitHub) **Summary:** 4 commits adding a new search endpoint to an Express API
that queries PostgreSQL with user-provided search terms. Also adds `lodash` as a
dependency for string utilities.

---

## Phase 1: Understand Current State

### 1.1 Check branch status

```bash
git status
```

- Confirm we are on `feature/add-user-search`
- Confirm working tree is clean (no uncommitted changes)
- Check if branch tracks a remote

```bash
git branch -vv
```

- Verify tracking info — does it track `origin/feature/add-user-search`?

### 1.2 Review commit history

```bash
git log main..HEAD --oneline
```

- Confirm there are exactly 4 commits
- Review commit messages for clarity and convention

```bash
git log main..HEAD --format='%h %s'
```

### 1.3 Review the full diff against main

```bash
git diff main...HEAD
```

- Understand the full scope of changes
- Identify all files modified/added

```bash
git diff main...HEAD --stat
```

- Get a summary of files changed, insertions, deletions

---

## Phase 2: Code Quality & Security Review

### 2.1 Review the search endpoint code

Look for the route handler file (likely something like `routes/users.js`,
`routes/search.js`, or `controllers/searchController.js`).

**Key checks:**

#### SQL Injection Prevention

- **CRITICAL:** The endpoint accepts user-provided search terms and queries
  PostgreSQL
- Verify that parameterized queries or prepared statements are used
- Look for string concatenation or template literals in SQL queries
- Example of what to flag:
  ```javascript
  // BAD - SQL injection vulnerable
  db.query(`SELECT * FROM users WHERE name LIKE '%${searchTerm}%'`);

  // GOOD - parameterized
  db.query("SELECT * FROM users WHERE name LIKE $1", [`%${searchTerm}%`]);
  ```

#### Input Validation

- Check that search terms are validated before use
- Look for max length limits on search input
- Check for sanitization of special characters
- Verify request body/query parameter parsing

#### Error Handling

- Verify try/catch blocks around database queries
- Check that database errors don't leak internal details to the client
- Verify appropriate HTTP status codes (400 for bad input, 500 for server
  errors, 200 for success)

#### Authentication & Authorization

- Check if the endpoint requires authentication (should it?)
- Verify middleware is applied consistently with other endpoints

#### Rate Limiting

- Search endpoints are expensive — check if rate limiting is applied
- If not present, flag as a recommendation

### 2.2 Review lodash usage

```bash
# Check package.json for lodash addition
git diff main...HEAD -- package.json
```

**Key checks:**

- Is the full `lodash` package added, or a specific module like
  `lodash.debounce`?
- If full `lodash` is added, recommend using specific imports (`lodash/trim`,
  `lodash/escape`) or individual packages to reduce bundle size
- Check which lodash functions are actually used — could native JS methods
  suffice?
  - `_.trim()` → `String.prototype.trim()`
  - `_.toLower()` → `String.prototype.toLowerCase()`
  - `_.escape()` → might be justified
- Verify lodash is in `dependencies` not `devDependencies`
- Check `package-lock.json` is committed

### 2.3 Review database query design

- Check for proper indexing hints (comments or migration files)
- Look for LIMIT/OFFSET or cursor-based pagination on search results
- Check if results are bounded (no unbounded SELECT)
- Verify connection pooling is used (not creating new connections per request)

### 2.4 Review tests

- Check if unit tests were added for the search endpoint
- Check if integration tests exist
- Look for test coverage of:
  - Happy path (valid search returns results)
  - Empty search results
  - Invalid/missing search parameters
  - SQL injection attempts
  - Very long search strings
  - Special characters in search terms

---

## Phase 3: Run Automated Checks

### 3.1 Install dependencies

```bash
npm install
```

- Verify `lodash` installs correctly
- Check for any peer dependency warnings
- Check for vulnerability warnings from npm audit

### 3.2 Run linter

```bash
npm run lint
```

- Fix any linting errors before PR submission

### 3.3 Run tests

```bash
npm test
```

- All existing tests must pass
- New tests for the search endpoint should pass

### 3.4 Security audit

```bash
npm audit
```

- Check if lodash version has known vulnerabilities
- Review any high/critical findings

### 3.5 Build check (if applicable)

```bash
npm run build
```

- Ensure the project builds successfully with the new code

---

## Phase 4: Push and Create PR

### 4.1 Push branch to remote

```bash
git push -u origin feature/add-user-search
```

- Push with `-u` to set upstream tracking

### 4.2 Create the Pull Request

```bash
gh pr create --title "Add user search endpoint" --body "$(cat <<'EOF'
## Summary

- Add new search endpoint for querying users by search terms
- Endpoint queries PostgreSQL with parameterized queries
- Add lodash dependency for string utility functions

## Changes

- New route handler for user search (GET /api/users/search or similar)
- Database query logic with parameterized search
- Input validation for search parameters
- Added lodash for string processing utilities

## Testing

- [ ] Unit tests for search logic
- [ ] Integration tests for the endpoint
- [ ] Manual testing with various search terms
- [ ] Tested with special characters and edge cases

## Security Considerations

- Search terms are parameterized to prevent SQL injection
- Input validation applied to search parameters
- Results are paginated to prevent excessive data retrieval
EOF
)"
```

### 4.3 Verify PR was created

```bash
gh pr view --web
```

- Confirm PR is visible on GitHub
- Confirm it targets `main` branch
- Confirm all 4 commits are included

---

## Phase 5: Post-PR Checks

### 5.1 Check CI status

```bash
gh pr checks
```

- Wait for CI pipeline to complete
- Review any failures

### 5.2 Review the PR diff on GitHub

```bash
gh pr diff
```

- Final review of all changes as they appear in the PR

### 5.3 Verify no sensitive data

- Check that no API keys, database credentials, or secrets are in the diff
- Check `.env` files are not committed
- Verify `.gitignore` is appropriate

---

## Issues to Flag / QA Checklist

### Critical Issues to Look For

| # | Issue                    | Severity | What to Check                                         |
| - | ------------------------ | -------- | ----------------------------------------------------- |
| 1 | SQL Injection            | Critical | All user input must use parameterized queries         |
| 2 | Missing input validation | High     | Search terms must be validated (type, length, format) |
| 3 | Unbounded results        | High     | Query must have LIMIT clause or pagination            |
| 4 | Missing error handling   | High     | Database errors must be caught and handled            |
| 5 | Credential exposure      | Critical | No hardcoded DB credentials in committed code         |
| 6 | Missing authentication   | Medium   | Endpoint should require auth if other endpoints do    |

### Recommendations

| # | Recommendation                                                | Priority |
| - | ------------------------------------------------------------- | -------- |
| 1 | Replace full `lodash` with specific imports or native methods | Medium   |
| 2 | Add rate limiting to search endpoint                          | Medium   |
| 3 | Add database index for search columns                         | Medium   |
| 4 | Add request logging for search queries                        | Low      |
| 5 | Consider full-text search (tsvector) instead of LIKE queries  | Low      |
| 6 | Add response caching for common searches                      | Low      |

### Test Scenarios to Verify

| # | Scenario                                                 | Expected Result                                |
| - | -------------------------------------------------------- | ---------------------------------------------- |
| 1 | Valid search term "john"                                 | Returns matching users, 200                    |
| 2 | Empty search term                                        | Returns 400 or all results with pagination     |
| 3 | Search term with SQL injection `'; DROP TABLE users; --` | Returns empty results or 400, no SQL execution |
| 4 | Very long search string (10000+ chars)                   | Returns 400                                    |
| 5 | Special characters `<script>alert('xss')</script>`       | Properly escaped, no XSS                       |
| 6 | No results found                                         | Returns 200 with empty array                   |
| 7 | Search with pagination params                            | Returns correct page of results                |
| 8 | Unauthenticated request (if auth required)               | Returns 401                                    |

---

## Complete Command Sequence (Summary)

```bash
# 1. Verify state
git status
git branch -vv
git log main..HEAD --oneline

# 2. Review changes
git diff main...HEAD --stat
git diff main...HEAD

# 3. Run checks
npm install
npm run lint
npm test
npm audit

# 4. Push and create PR
git push -u origin feature/add-user-search
gh pr create --title "Add user search endpoint" --body "..."

# 5. Post-PR verification
gh pr checks
gh pr view
```

---

## Decision Points

1. **If SQL injection vulnerability found:** Block PR, fix before submitting
2. **If tests fail:** Fix before submitting PR
3. **If npm audit shows critical vulnerabilities:** Evaluate if lodash version
   can be updated, or if the vulnerability is relevant
4. **If full lodash is used for trivial operations:** Recommend refactoring but
   don't block PR
5. **If no tests exist for the new endpoint:** Strongly recommend adding tests
   before merge, consider blocking
6. **If no pagination on search results:** Flag as high priority issue,
   recommend fixing before merge

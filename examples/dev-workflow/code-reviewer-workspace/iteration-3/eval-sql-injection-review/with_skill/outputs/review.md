## Code Review Summary

**Context**: Two Flask API endpoints for user search and deletion, both using
SQLite with direct string concatenation in SQL queries. **Overall Assessment**:
REJECT **Findings**: 2 critical, 1 high, 1 medium, 1 low, 0 info

## Findings

### CRITICAL SECURITY: SQL injection in search_users — user input concatenated into query

**Location**: `search_users()`, query construction **Issue**: `search_term` from
`request.args.get('q')` is concatenated directly into the SQL string, enabling
arbitrary SQL injection (OWASP A03:2021). **Suggestion**: Use parameterized
queries.

```diff
- query = "SELECT id, username, email FROM users WHERE username LIKE '%" + search_term + "%'"
- cursor.execute(query)
+ cursor.execute("SELECT id, username, email FROM users WHERE username LIKE ?", ('%' + search_term + '%',))
```

### CRITICAL SECURITY: SQL injection in delete_user — path parameter concatenated into DELETE

**Location**: `delete_user()`, `cursor.execute` call **Issue**: `user_id` from
URL path is concatenated into DELETE query. Attacker can delete all records via
`/api/users/1 OR 1=1`. **Suggestion**: Use parameterized queries.

```diff
- cursor.execute("DELETE FROM users WHERE id = " + user_id)
+ cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
```

### HIGH BUG: Database connections never closed (resource leak)

**Location**: Both endpoints **Issue**: `sqlite3.connect()` called but
`conn.close()` never called. Leaks file descriptors and locks. **Suggestion**:
Use context manager.

```diff
- conn = sqlite3.connect('app.db')
- cursor = conn.cursor()
+ with sqlite3.connect('app.db') as conn:
+     cursor = conn.cursor()
```

### MEDIUM BUG: No authorization on DELETE endpoint

**Location**: `delete_user()` route **Issue**: Any unauthenticated request can
delete any user. **Suggestion**: Add auth middleware with role check.

```diff
+ @require_auth(role='admin')
  @app.route('/api/users/<user_id>', methods=['DELETE'])
  def delete_user(user_id):
```

### LOW STYLE: Missing type hints and docstrings

**Location**: Both functions **Issue**: No type annotations or documentation.
**Suggestion**: Add Flask Response type hints and docstrings.

## Recommendations

Fix both SQL injection vulnerabilities immediately. Add connection cleanup via
context managers. Add authentication to the delete endpoint.

## Code Review Summary

**Context**: Flask API with two endpoints (user search, user deletion) using
SQLite with string concatenation in SQL queries. **Overall Assessment**: REJECT
**Findings**: 2 critical, 1 high, 1 medium, 1 low, 0 info

## Findings

### CRITICAL SECURITY: SQL injection in search_users

**Location**: `search_users()`, query construction **Issue**: `search_term` from
request args concatenated into SQL. Enables arbitrary injection. **Suggestion**:
Parameterized queries.

```diff
- query = "SELECT id, username, email FROM users WHERE username LIKE '%" + search_term + "%'"
- cursor.execute(query)
+ cursor.execute("SELECT id, username, email FROM users WHERE username LIKE ?", ('%' + search_term + '%',))
```

### CRITICAL SECURITY: SQL injection in delete_user

**Location**: `delete_user()`, cursor.execute **Issue**: `user_id` path param
concatenated into DELETE query. **Suggestion**: Parameterized queries.

```diff
- cursor.execute("DELETE FROM users WHERE id = " + user_id)
+ cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
```

### HIGH BUG: Resource leak — connections never closed

**Location**: Both endpoints **Issue**: `sqlite3.connect()` without
`conn.close()` or context manager. **Suggestion**: Context manager.

```diff
+ with sqlite3.connect('app.db') as conn:
+     cursor = conn.cursor()
+     # ... queries ...
```

### MEDIUM BUG: No authorization on DELETE

**Location**: `delete_user()` route **Issue**: Unauthenticated deletion
possible. **Suggestion**: Add auth middleware.

### LOW STYLE: Missing type hints and docstrings

**Location**: Both functions **Issue**: No type annotations or documentation.
**Suggestion**: Add Flask Response type hints.

## Recommendations

Fix SQL injection immediately. Add connection cleanup and authentication.

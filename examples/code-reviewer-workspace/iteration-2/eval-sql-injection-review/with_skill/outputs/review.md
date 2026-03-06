## Code Review Summary

**Context**: Two Flask API endpoints — one for searching users by username, one
for deleting users by ID — both interacting with a SQLite database. **Overall
Assessment**: REJECT **Findings**: 2 critical, 1 high, 1 medium, 1 low, 0 info

## Findings

### CRITICAL SECURITY: SQL injection in search_users via string concatenation

**Location**: `search_users()`, line building the query variable **Issue**: The
`search_term` from `request.args.get('q')` is concatenated directly into the SQL
query string. An attacker can inject arbitrary SQL via the `q` parameter (e.g.,
`%'; DROP TABLE users; --`). This is a textbook SQL injection vulnerability
(OWASP A03:2021 - Injection). **Suggestion**: Use parameterized queries with
SQLite's `?` placeholder.

```diff
- query = "SELECT id, username, email FROM users WHERE username LIKE '%" + search_term + "%'"
- cursor.execute(query)
+ cursor.execute(
+     "SELECT id, username, email FROM users WHERE username LIKE ?",
+     ('%' + search_term + '%',)
+ )
```

---

### CRITICAL SECURITY: SQL injection in delete_user via string concatenation

**Location**: `delete_user()`, the `cursor.execute` call **Issue**: The
`user_id` path parameter is concatenated directly into the DELETE query. An
attacker can inject SQL via the URL (e.g., `/api/users/1 OR 1=1`), potentially
deleting all users. **Suggestion**: Use parameterized queries.

```diff
- cursor.execute("DELETE FROM users WHERE id = " + user_id)
+ cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
```

---

### HIGH BUG: Missing database connection cleanup (resource leak)

**Location**: Both `search_users()` and `delete_user()` **Issue**: Database
connections are opened with `sqlite3.connect()` but never closed. Over time,
this leaks file descriptors and database locks, eventually causing
`OperationalError: database is locked` under load. **Suggestion**: Use a context
manager for automatic cleanup.

```diff
- conn = sqlite3.connect('app.db')
- cursor = conn.cursor()
- cursor.execute(...)
- results = cursor.fetchall()
- # ... process results ...
- return jsonify(users)
+ with sqlite3.connect('app.db') as conn:
+     cursor = conn.cursor()
+     cursor.execute(
+         "SELECT id, username, email FROM users WHERE username LIKE ?",
+         ('%' + search_term + '%',)
+     )
+     results = cursor.fetchall()
+     users = [{'id': row[0], 'username': row[1], 'email': row[2]} for row in results]
+     return jsonify(users)
```

---

### MEDIUM BUG: Missing authorization check on delete endpoint

**Location**: `delete_user()` route **Issue**: The DELETE endpoint has no
authentication or authorization check. Any unauthenticated request can delete
any user. **Suggestion**: Add authentication middleware and role check.

```diff
+ from functools import wraps
+ def require_admin(f):
+     @wraps(f)
+     def decorated(*args, **kwargs):
+         token = request.headers.get('Authorization')
+         if not token or not verify_admin_token(token):
+             return jsonify({'error': 'Unauthorized'}), 403
+         return f(*args, **kwargs)
+     return decorated
+
  @app.route('/api/users/<user_id>', methods=['DELETE'])
+ @require_admin
  def delete_user(user_id):
```

---

### LOW STYLE: Missing type hints and docstrings

**Location**: Both functions **Issue**: Functions lack type annotations and
docstrings, making the API contract unclear. **Suggestion**: Add type hints and
brief docstrings.

```diff
+ from flask import Response
+
- def search_users():
+ def search_users() -> Response:
+     """Search users by username substring. Query param: q."""
```

## Recommendations

The two SQL injection vulnerabilities must be fixed immediately — they allow
complete database compromise. Switch all queries to parameterized form. Add
connection cleanup via context managers, and add authentication to the delete
endpoint before deploying.

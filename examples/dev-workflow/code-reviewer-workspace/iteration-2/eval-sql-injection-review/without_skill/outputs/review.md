## Code Review

Here are the issues I found in this Flask code:

1. **SQL Injection** - Both endpoints are vulnerable to SQL injection. The
   `search_users` function builds a query by concatenating `search_term`
   directly into the SQL string. The `delete_user` function does the same with
   `user_id`. Use parameterized queries:

```python
cursor.execute("SELECT id, username, email FROM users WHERE username LIKE ?", ('%' + search_term + '%',))
```

2. **No connection cleanup** - The database connections are never closed. Use
   `with` statements or call `conn.close()` in a finally block.

3. **No auth on delete** - The delete endpoint doesn't check if the user is
   authorized to delete records.

4. **No error handling** - If the database query fails, the user gets an
   unhandled exception.

These issues should be fixed before deploying, especially the SQL injection
vulnerabilities.

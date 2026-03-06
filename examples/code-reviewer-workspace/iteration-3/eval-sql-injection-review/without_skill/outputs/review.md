## Review

Issues found:

1. **SQL Injection** — Both `search_users` and `delete_user` concatenate user
   input into SQL queries. Use parameterized queries instead.

2. **Connection leak** — Database connections are opened but never closed.

3. **No auth** — The delete endpoint has no authentication.

4. **No error handling** — Database errors will cause unhandled exceptions.

Fix the SQL injection issues first, then address the other concerns.

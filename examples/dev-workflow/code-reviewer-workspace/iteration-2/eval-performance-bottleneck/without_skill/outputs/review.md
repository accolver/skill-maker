## Review

This code has a classic N+1 query problem. For each order, it makes separate
database calls to get items, products, and shipping info. This will be very slow
with many orders.

**Issues:**

- Database queries in loops — use JOINs instead
- No error handling — async operations should be wrapped in try/catch
- No pagination — could return huge result sets

**Recommendations:**

- Rewrite using a single JOIN query
- Add try/catch blocks
- Consider adding pagination

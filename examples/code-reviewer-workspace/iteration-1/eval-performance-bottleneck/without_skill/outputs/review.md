## Review of getOrderDetails

This function has a performance problem. It's making database queries inside a
loop, which is known as the N+1 query problem. For each order, it queries for
items, then for each item it queries for the product, and then it queries for
shipping. This could result in a lot of database calls.

**Suggestions:**

- Consider using a JOIN query to fetch all the data at once instead of making
  separate queries in loops
- You might want to add some error handling with try/catch since these are async
  operations
- The function could benefit from pagination if there are many orders

The code is functional but would have performance issues at scale. I'd recommend
refactoring the database queries before deploying to production.

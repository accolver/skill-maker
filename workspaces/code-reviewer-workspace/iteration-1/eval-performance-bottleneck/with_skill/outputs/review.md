## Code Review Summary

**Context**: An Express.js handler that fetches orders for a user, then enriches
each order with its items, product details, and shipping information via
separate database queries. **Overall Assessment**: NEEDS CHANGES **Findings**: 0
critical, 2 high, 1 medium, 1 low, 0 info

## Findings

### HIGH PERFORMANCE: N+1 query pattern with multiplicative database calls

**Location**: `getOrderDetails()`, the nested for loops **Issue**: For each
order, the code runs 1 query for items + 1 query per item for products + 1 query
for shipping. For N orders with M items each, this executes
`1 + N + (N * M) + N` queries. With 50 orders averaging 3 items each, that's 1 +
50 + 150 + 50 = 251 database queries for a single API call. This will cause
severe latency and database load at scale. **Suggestion**: Use JOINs to fetch
all data in 1-2 queries.

```diff
- const enrichedOrders = [];
- for (const order of orders) {
-   const items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
-   for (const item of items) {
-     const product = await db.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
-     item.product = product[0];
-   }
-   const shipping = await db.query('SELECT * FROM shipping WHERE order_id = $1', [order.id]);
-   order.items = items;
-   order.shipping = shipping[0];
-   enrichedOrders.push(order);
- }
+ const enrichedOrders = await db.query(`
+   SELECT o.*, oi.*, p.name as product_name, p.price as product_price,
+          s.status as shipping_status, s.tracking_number
+   FROM orders o
+   LEFT JOIN order_items oi ON oi.order_id = o.id
+   LEFT JOIN products p ON p.id = oi.product_id
+   LEFT JOIN shipping s ON s.order_id = o.id
+   WHERE o.user_id = $1
+ `, [req.params.userId]);
+ // Then group results by order in application code
```

---

### HIGH BUG: Missing error handling for async database operations

**Location**: Entire `getOrderDetails()` function **Issue**: No try-catch wraps
the async database calls. If any query fails (connection timeout, invalid data,
missing table), the unhandled promise rejection will crash the process or return
a 500 with a stack trace, potentially leaking database schema information.
**Suggestion**: Wrap in try-catch with proper error response.

```diff
  async function getOrderDetails(req, res) {
+   try {
      const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [req.params.userId]);
      // ... rest of function ...
      res.json(enrichedOrders);
+   } catch (error) {
+     console.error('Failed to fetch order details:', error);
+     res.status(500).json({ error: 'Failed to fetch order details' });
+   }
  }
```

---

### MEDIUM BUG: Missing input validation on userId parameter

**Location**: `req.params.userId` usage **Issue**: The `userId` parameter from
the URL is passed directly to the database query without validation. While
parameterized queries prevent SQL injection, invalid input (empty string,
non-numeric value) could cause unexpected query behavior or confusing error
messages. **Suggestion**: Validate userId before querying.

```diff
  async function getOrderDetails(req, res) {
+   const userId = parseInt(req.params.userId, 10);
+   if (isNaN(userId) || userId <= 0) {
+     return res.status(400).json({ error: 'Invalid user ID' });
+   }
    const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [req.params.userId]);
```

---

### LOW STYLE: Using SELECT * instead of explicit column names

**Location**: All four queries **Issue**: `SELECT *` fetches all columns
including potentially large or unnecessary ones, and makes the code fragile to
schema changes. If a column is added to the orders table, it silently appears in
the API response. **Suggestion**: List explicit column names in each query.

## Recommendations

Refactor the N+1 query pattern first — it's the biggest performance risk. A
single JOIN query will reduce 251 queries to 1. Then add try-catch error
handling and input validation to make the endpoint production-ready.

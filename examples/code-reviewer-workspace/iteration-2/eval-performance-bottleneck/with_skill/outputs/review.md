## Code Review Summary

**Context**: An Express.js handler that fetches orders for a user, then enriches
each order with items, product details, and shipping via separate database
queries in nested loops. **Overall Assessment**: NEEDS CHANGES **Findings**: 0
critical, 2 high, 1 medium, 1 low, 0 info

## Findings

### HIGH PERFORMANCE: N+1 query pattern with multiplicative database calls

**Location**: `getOrderDetails()`, the nested for loops (lines 8-17) **Issue**:
For each order, the code runs 1 query for items + 1 query per item for
products + 1 query for shipping. For N orders with M items each, this executes
`1 + N + (N * M) + N` queries. With 50 orders averaging 3 items each, that's 251
database queries for a single API call. **Suggestion**: Use a single JOIN query
to fetch all data at once.

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
+ const result = await db.query(`
+   SELECT o.*, oi.id as item_id, oi.quantity, oi.price as item_price,
+          p.name as product_name, p.price as product_price,
+          s.status as shipping_status, s.tracking_number
+   FROM orders o
+   LEFT JOIN order_items oi ON oi.order_id = o.id
+   LEFT JOIN products p ON p.id = oi.product_id
+   LEFT JOIN shipping s ON s.order_id = o.id
+   WHERE o.user_id = $1
+ `, [req.params.userId]);
+ const enrichedOrders = groupByOrder(result);
```

---

### HIGH BUG: Missing error handling for async database operations

**Location**: Entire `getOrderDetails()` function **Issue**: No try-catch wraps
the async database calls. If any query fails, the unhandled promise rejection
will crash the Node.js process or return a 500 with a stack trace.
**Suggestion**: Wrap in try-catch with proper error response and logging.

```diff
  async function getOrderDetails(req, res) {
+   try {
      const orders = await db.query(...);
      // ... enrichment logic ...
      res.json(enrichedOrders);
+   } catch (error) {
+     console.error('Failed to fetch order details:', error.message);
+     res.status(500).json({ error: 'Internal server error' });
+   }
  }
```

---

### MEDIUM BUG: Missing input validation on userId parameter

**Location**: `req.params.userId` usage (line 5) **Issue**: The `userId`
parameter is passed directly to the query without validation. Non-numeric or
empty values could cause unexpected behavior. **Suggestion**: Validate before
querying.

```diff
  async function getOrderDetails(req, res) {
+   const userId = parseInt(req.params.userId, 10);
+   if (isNaN(userId) || userId <= 0) {
+     return res.status(400).json({ error: 'Invalid user ID' });
+   }
-   const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [req.params.userId]);
+   const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
```

---

### LOW STYLE: Using SELECT * instead of explicit column names

**Location**: All four queries **Issue**: `SELECT *` fetches all columns and is
fragile to schema changes. **Suggestion**: List explicit column names.

```diff
- const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [req.params.userId]);
+ const orders = await db.query('SELECT id, user_id, status, created_at FROM orders WHERE user_id = $1', [req.params.userId]);
```

## Recommendations

Refactor the N+1 query pattern first — a single JOIN reduces 251 queries to 1.
Then add try-catch error handling and input validation to make the endpoint
production-ready.

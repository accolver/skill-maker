## Code Review Summary

**Context**: A Java `OrderProcessor` class with a single `processOrder` method
that handles order type routing, tax/shipping calculation, currency conversion,
and database persistence — all in one 80+ line method with deeply nested
conditionals. **Overall Assessment**: NEEDS CHANGES **Findings**: 1 critical, 1
high, 3 medium, 1 low, 0 info

## Findings

### CRITICAL SECURITY: Hardcoded database credentials in source code

**Location**: Two `DriverManager.getConnection()` calls **Issue**: Database
credentials (`"root"`, `"password123"`) are hardcoded in the source code. Anyone
with repository access can see the database password. If this repository is
public or shared, the database is already compromised. **Suggestion**: Use
environment variables or a secrets manager. Also use connection pooling instead
of creating connections per request.

```diff
+ import javax.sql.DataSource;
+ // Inject via constructor or DI framework
+ private final DataSource dataSource;
+
+ public OrderProcessor(DataSource dataSource) {
+     this.dataSource = dataSource;
+ }
+
  // In the method:
- Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/orders", "root", "password123");
+ Connection conn = dataSource.getConnection();
```

Configure the DataSource with environment variables:

```java
// application.properties or environment
DB_URL=jdbc:mysql://localhost:3306/orders
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
```

---

### HIGH MAINTAINABILITY: Deeply nested conditional structure (5+ levels)

**Location**: Entire `processOrder` method **Issue**: The method has 5+ levels
of nesting. Each new condition adds another indentation level, making the code
extremely hard to read, test, and modify. **Suggestion**: Use early returns
(guard clauses) to flatten the structure.

```diff
  public String processOrder(Map<String, Object> data) {
      String type = (String) data.get("type");
-     if (type != null) {
-         if (type.equals("standard")) {
-             if (amount > 0) {
-                 // ... 60 more lines of nesting ...
-             }
-         }
-     }
+     if (type == null) return "MISSING_TYPE";
+     double amount = (Double) data.get("amount");
+     String currency = (String) data.get("currency");
+     String customerId = (String) data.get("customerId");
+
+     return switch (type) {
+         case "standard" -> processStandardOrder(customerId, amount, currency);
+         case "subscription" -> processSubscriptionOrder(customerId, amount, currency);
+         default -> "UNKNOWN_TYPE";
+     };
  }
```

---

### MEDIUM MAINTAINABILITY: Magic numbers throughout the code

**Location**: Multiple locations (0.08, 5.99, 100, 10000, 0.85, 0.73, 110.0)
**Issue**: Unnamed numeric constants are scattered through the code. They're
hard to understand ("what does 0.85 mean?") and dangerous to change — a
developer might update one occurrence but miss the duplicate. **Suggestion**:
Extract to named constants.

```diff
+ private static final double TAX_RATE = 0.08;
+ private static final double STANDARD_SHIPPING_COST = 5.99;
+ private static final double FREE_SHIPPING_THRESHOLD = 100.0;
+ private static final double APPROVAL_REQUIRED_THRESHOLD = 10000.0;
+ private static final Map<String, Double> CURRENCY_RATES = Map.of(
+     "EUR", 0.85, "GBP", 0.73, "JPY", 110.0
+ );
```

---

### MEDIUM MAINTAINABILITY: Duplicated currency conversion and database insertion code

**Location**: Standard order block and subscription order block **Issue**: The
currency conversion if-else chain and the database insertion code are
copy-pasted between branches. Any change must be made in two places.
**Suggestion**: Extract into shared private methods.

```diff
+ private double convertCurrency(double amount, String currency) {
+     Double rate = CURRENCY_RATES.get(currency);
+     return rate != null ? amount * rate : amount;
+ }
+
+ private void saveOrder(String customerId, String type, double amount,
+                         double tax, double shipping, double total, String currency)
+         throws SQLException {
+     try (Connection conn = dataSource.getConnection();
+          PreparedStatement stmt = conn.prepareStatement(INSERT_ORDER_SQL)) {
+         stmt.setString(1, customerId);
+         // ... set remaining parameters ...
+         stmt.executeUpdate();
+     }
+ }
```

---

### MEDIUM BUG: Swallowed exceptions with generic error return

**Location**: Both catch blocks **Issue**: The catch blocks catch broad
`Exception`, return a generic `"ERROR"` string with no logging, no stack trace,
and no indication of what failed. This makes debugging production issues nearly
impossible. **Suggestion**: Catch specific exceptions, log with context, and
return descriptive errors.

```diff
+ import java.util.logging.Logger;
+ private static final Logger logger = Logger.getLogger(OrderProcessor.class.getName());
+
- } catch (Exception e) {
-     return "ERROR";
+ } catch (SQLException e) {
+     logger.severe("Failed to save order for customer " + customerId + ": " + e.getMessage());
+     return "ERROR:DB_FAILURE:" + e.getSQLState();
  }
```

---

### LOW STYLE: Method is too long (80+ lines) — extract focused methods

**Location**: `processOrder` method **Issue**: The entire method handles type
routing, calculation, currency conversion, and persistence. This makes it
impossible to unit test individual concerns. **Suggestion**: Extract into
focused methods: `calculateTax()`, `calculateShipping()`, `convertCurrency()`,
`saveOrder()`, `processStandardOrder()`, `processSubscriptionOrder()`.

## Recommendations

Fix the hardcoded credentials immediately. Then refactor by extracting shared
methods for currency conversion and database operations, which eliminates
duplication and reduces nesting. Use guard clauses to flatten the conditional
structure. Add proper logging to catch blocks.

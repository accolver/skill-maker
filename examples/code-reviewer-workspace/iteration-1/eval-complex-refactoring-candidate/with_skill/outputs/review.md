## Code Review Summary

**Context**: A Java `OrderProcessor` class with a single `processOrder` method
that handles order type routing, tax/shipping calculation, currency conversion,
and database persistence — all in one 80+ line method. **Overall Assessment**:
NEEDS CHANGES **Findings**: 1 critical, 1 high, 3 medium, 1 low, 0 info

## Findings

### CRITICAL SECURITY: Hardcoded database credentials

**Location**: Two `DriverManager.getConnection()` calls **Issue**: Database
credentials (`"root"`, `"password123"`) are hardcoded in the source code. Anyone
with access to the repository can see the database password. This is a critical
security violation — credentials should never be in source code. **Suggestion**:
Use environment variables or a secrets manager.

```diff
- Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/orders", "root", "password123");
+ String dbUrl = System.getenv("DB_URL");
+ String dbUser = System.getenv("DB_USER");
+ String dbPassword = System.getenv("DB_PASSWORD");
+ Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword);
```

---

### HIGH MAINTAINABILITY: Deeply nested conditional structure (5+ levels)

**Location**: Entire `processOrder` method **Issue**: The method has 5+ levels
of nesting
(`if type != null → if equals standard → if amount > 0 → if amount < 10000 → if amount > 100`).
This makes the code extremely hard to read, test, and modify. Each new condition
adds another indentation level. **Suggestion**: Use early returns (guard
clauses) to flatten the structure.

```diff
  public String processOrder(Map<String, Object> data) {
      String type = (String) data.get("type");
+     if (type == null) return "MISSING_TYPE";
+     
      double amount = (Double) data.get("amount");
-     // ... 80 lines of nested ifs ...
+     if (type.equals("standard")) return processStandardOrder(data, amount);
+     if (type.equals("subscription")) return processSubscriptionOrder(data, amount);
+     return "UNKNOWN_TYPE";
  }
```

---

### MEDIUM MAINTAINABILITY: Magic numbers throughout the code

**Location**: Multiple locations **Issue**: The code contains numerous unnamed
numeric constants: `0.08` (tax rate), `5.99` (shipping cost), `100` (free
shipping threshold), `10000` (approval threshold), `0.85` (EUR rate), `0.73`
(GBP rate), `110.0` (JPY rate). These are hard to understand and dangerous to
change — a developer might update one occurrence but miss the duplicate.
**Suggestion**: Extract to named constants.

```diff
+ private static final double TAX_RATE = 0.08;
+ private static final double STANDARD_SHIPPING = 5.99;
+ private static final double FREE_SHIPPING_THRESHOLD = 100.0;
+ private static final double APPROVAL_THRESHOLD = 10000.0;
+ private static final Map<String, Double> CURRENCY_RATES = Map.of(
+     "EUR", 0.85, "GBP", 0.73, "JPY", 110.0
+ );
```

---

### MEDIUM MAINTAINABILITY: Duplicated currency conversion and database code

**Location**: Standard order block and subscription order block **Issue**: The
currency conversion logic (EUR/GBP/JPY if-else chain) is copy-pasted between the
standard and subscription branches. The database insertion code is also
duplicated verbatim. This violates DRY — any change to currency rates or the
insert query must be made in two places. **Suggestion**: Extract shared logic
into private methods.

```diff
+ private double convertCurrency(double amount, String currency) {
+     return switch (currency) {
+         case "EUR" -> amount * CURRENCY_RATES.get("EUR");
+         case "GBP" -> amount * CURRENCY_RATES.get("GBP");
+         case "JPY" -> amount * CURRENCY_RATES.get("JPY");
+         default -> amount;
+     };
+ }
+
+ private void saveOrder(String customerId, String type, double amount,
+                         double tax, double shipping, double total, String currency) {
+     // Single database insertion method
+ }
```

---

### MEDIUM BUG: Swallowed exceptions with generic error return

**Location**: Both catch blocks **Issue**: The catch blocks catch `Exception`
(too broad) and return a generic `"ERROR"` string with no logging, no stack
trace, and no indication of what failed. This makes debugging production issues
nearly impossible. **Suggestion**: Log the exception and return more specific
error information.

```diff
- } catch (Exception e) {
-     return "ERROR";
+ } catch (SQLException e) {
+     logger.error("Failed to save order for customer {}: {}", customerId, e.getMessage(), e);
+     return "ERROR:DB_FAILURE";
  }
```

---

### LOW STYLE: Method is too long (80+ lines)

**Location**: `processOrder` method **Issue**: The entire method is over 80
lines, handling type routing, calculation, currency conversion, and persistence.
This makes it hard to understand, test, and modify independently.
**Suggestion**: Extract into focused methods: `calculateTax()`,
`calculateShipping()`, `convertCurrency()`, `saveOrder()`,
`processStandardOrder()`, `processSubscriptionOrder()`.

## Recommendations

Fix the hardcoded credentials immediately — this is a security incident if the
code is in a public or shared repository. Then refactor the method by extracting
currency conversion and database logic into shared methods, which will eliminate
the duplication and reduce nesting. Add proper exception handling with logging.

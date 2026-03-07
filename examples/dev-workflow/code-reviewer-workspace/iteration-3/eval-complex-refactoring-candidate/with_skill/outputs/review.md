## Code Review Summary

**Context**: Java OrderProcessor with 80+ line method handling order routing,
calculation, currency conversion, and database persistence in deeply nested
conditionals. **Overall Assessment**: NEEDS CHANGES **Findings**: 1 critical, 1
high, 3 medium, 1 low, 0 info

## Findings

### CRITICAL SECURITY: Hardcoded database credentials

**Location**: Two `DriverManager.getConnection()` calls **Issue**: `"root"` and
`"password123"` hardcoded in source. Repository access = database access.
**Suggestion**: Use DataSource with environment variables.

```diff
- Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/orders", "root", "password123");
+ try (Connection conn = dataSource.getConnection()) {
```

### HIGH MAINTAINABILITY: 5+ levels of nesting

**Location**: Entire processOrder method **Issue**: Deep nesting makes code
unreadable and untestable. **Suggestion**: Guard clauses + method extraction.

```diff
+ if (type == null) return "MISSING_TYPE";
+ return switch (type) {
+     case "standard" -> processStandardOrder(customerId, amount, currency);
+     case "subscription" -> processSubscriptionOrder(customerId, amount, currency);
+     default -> "UNKNOWN_TYPE";
+ };
```

### MEDIUM MAINTAINABILITY: Magic numbers (0.08, 5.99, 0.85, 0.73, 110.0, 100, 10000)

**Location**: Multiple locations **Issue**: Unnamed constants are hard to
understand and dangerous to change. **Suggestion**: Named constants.

```diff
+ private static final double TAX_RATE = 0.08;
+ private static final double SHIPPING_COST = 5.99;
+ private static final double FREE_SHIPPING_THRESHOLD = 100.0;
```

### MEDIUM MAINTAINABILITY: Duplicated currency conversion and DB insertion

**Location**: Standard and subscription blocks **Issue**: Same logic
copy-pasted. Changes must be made in two places. **Suggestion**: Extract
`convertCurrency()` and `saveOrder()` methods.

### MEDIUM BUG: Swallowed exceptions

**Location**: Both catch blocks **Issue**: Catches broad Exception, returns
"ERROR" with no logging. **Suggestion**: Catch specific exceptions, log with
context.

```diff
+ private static final Logger log = Logger.getLogger(OrderProcessor.class.getName());
- } catch (Exception e) { return "ERROR"; }
+ } catch (SQLException e) {
+     log.severe("Order save failed for " + customerId + ": " + e.getMessage());
+     return "ERROR:DB_FAILURE";
+ }
```

### LOW STYLE: Method too long (80+ lines)

**Location**: processOrder **Issue**: Single method handles 4 concerns.
**Suggestion**: Extract focused methods.

## Recommendations

Fix hardcoded credentials immediately. Refactor by extracting shared methods,
flattening nesting with guard clauses, and adding proper logging.

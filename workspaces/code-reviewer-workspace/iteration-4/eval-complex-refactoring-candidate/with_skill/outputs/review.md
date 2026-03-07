## Code Review Summary

**Context**: Java OrderProcessor — 80+ line method with deep nesting, magic
numbers, duplicated logic, and hardcoded credentials. **Overall Assessment**:
NEEDS CHANGES **Findings**: 1 critical, 1 high, 3 medium, 1 low, 0 info

## Findings

### CRITICAL SECURITY: Hardcoded credentials ("root", "password123")

**Location**: `DriverManager.getConnection()` calls **Issue**: Database
credentials in source code. **Suggestion**: Environment variables + DataSource
injection.

```diff
- Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/orders", "root", "password123");
+ Connection conn = dataSource.getConnection();
```

### HIGH MAINTAINABILITY: 5+ levels of nesting

**Location**: processOrder method **Issue**: Unreadable, untestable.
**Suggestion**: Guard clauses + switch expression.

### MEDIUM MAINTAINABILITY: Magic numbers

**Location**: 0.08, 5.99, 100, 10000, 0.85, 0.73, 110.0 **Issue**: Unnamed,
duplicated constants. **Suggestion**: Named constants (TAX_RATE, SHIPPING_COST,
etc.).

### MEDIUM MAINTAINABILITY: Duplicated currency conversion and DB code

**Location**: Standard and subscription blocks **Issue**: Same logic in two
places. **Suggestion**: Extract convertCurrency() and saveOrder().

### MEDIUM BUG: Swallowed exceptions

**Location**: catch blocks **Issue**: Generic "ERROR" return, no logging.
**Suggestion**: Specific catch + Logger.

```diff
+ private static final Logger log = Logger.getLogger(OrderProcessor.class.getName());
- } catch (Exception e) { return "ERROR"; }
+ } catch (SQLException e) {
+     log.severe("Save failed: " + e.getMessage());
+     return "ERROR:DB:" + e.getSQLState();
+ }
```

### LOW STYLE: Method too long

**Location**: processOrder (80+ lines) **Issue**: Multiple concerns in one
method. **Suggestion**: Extract focused methods.

## Recommendations

Fix credentials, extract shared methods, flatten nesting, add logging.

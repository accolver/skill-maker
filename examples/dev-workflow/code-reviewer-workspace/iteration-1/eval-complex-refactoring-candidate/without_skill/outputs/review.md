## Code Review

This `OrderProcessor` class has several issues:

1. **The method is too long** - `processOrder` is doing too much. It handles
   order type routing, calculations, currency conversion, and database
   operations all in one method. Consider breaking it into smaller methods.

2. **Hardcoded values** - There are magic numbers like `0.08`, `5.99`, `0.85`,
   `0.73`, `110.0` scattered throughout. These should be constants.

3. **Code duplication** - The currency conversion logic and database insertion
   code are duplicated between the standard and subscription branches.

4. **Deep nesting** - The if-else structure is deeply nested, making it hard to
   follow. Consider using early returns or a switch statement.

5. **Error handling** - The catch blocks just return "ERROR" without any logging
   or context. This will make debugging difficult.

6. **Database credentials** - The database connection string contains hardcoded
   credentials. These should be externalized to configuration.

I'd recommend refactoring this into smaller methods and extracting the shared
logic. The method would be much more readable and testable with these changes.

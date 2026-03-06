## Code Review

This Java class has several problems:

1. **Too long** — The `processOrder` method is over 80 lines and does too many
   things. Break it into smaller methods.

2. **Deep nesting** — There are 5+ levels of if/else nesting. Use early returns
   to flatten the structure.

3. **Magic numbers** — Constants like `0.08`, `5.99`, `0.85`, `0.73`, `110.0`
   should be named constants.

4. **Duplicated code** — The currency conversion and database insertion logic is
   duplicated between the standard and subscription branches. Extract shared
   methods.

5. **Hardcoded credentials** — `"root"` and `"password123"` are hardcoded in the
   connection string. Use environment variables or a config file.

6. **Poor error handling** — The catch blocks swallow exceptions and return a
   generic "ERROR" string. Log the exception and provide more context.

7. **No connection pooling** — Creating a new database connection for each
   request is inefficient. Use a connection pool.

Refactor this into smaller, testable methods and externalize the configuration.

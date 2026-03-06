# error-handling

> **Status:** Planned

Standardize error handling across a codebase with a unified error taxonomy,
consistent error codes, proper propagation, user-facing vs internal error
separation, and structured logging.

## When built, this skill will

- Define an error taxonomy with categories (validation, auth, not-found,
  conflict, internal)
- Assign stable error codes that clients can match on programmatically
- Separate user-facing messages from internal diagnostic details
- Implement consistent error propagation (no swallowed exceptions, no bare
  throws)
- Add structured error logging with correlation IDs and request context
- Generate error response schemas for API documentation

## Predicted delta: +65-75%

Agents scatter ad-hoc try/catch blocks, mix user-facing and internal error
details, and rarely implement a unified error code system.

## Getting started

```
Create a skill for standardizing error handling with a unified error taxonomy and structured logging
```

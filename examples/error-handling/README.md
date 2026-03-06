# error-handling

> **Status:** Built

Standardize error handling across a codebase with a unified error taxonomy,
consistent error codes, proper propagation, user-facing vs internal error
separation, and structured logging.

## Results

| Metric                     | Value  |
| -------------------------- | ------ |
| Final With-Skill Pass Rate | 100.0% |
| Without-Skill Pass Rate    | 8.3%   |
| Delta                      | +91.7% |
| Iterations                 | 3      |
| Plateau At                 | 3      |

## What agents miss without this skill

- Unified error taxonomy with categories mapping to HTTP status codes
- Stable string error codes (ERR_NOT_FOUND_USER) for programmatic matching
- Error class hierarchy with base class and category-specific subclasses
- User-facing vs internal error separation (no leaked stack traces)
- Correlation IDs for cross-service debugging
- Structured JSON logging with error context
- Proper error propagation chains (no swallowed exceptions)
- Consistent error response format across all endpoints

## Getting started

```
Create a skill for standardizing error handling with a unified error taxonomy and structured logging
```

---
name: error-handling
description: >-
  Implement a unified error handling system with a structured error taxonomy, stable string error codes, proper error wrapping/propagation, user-safe vs internal error separation, correlation IDs for tracing, and consistent JSON error responses. Use when adding error handling to any backend service, refactoring inconsistent error patterns, building API error responses, implementing validation error details, or when you see raw throw/raise statements without structured error types.
version: 1.0.0
---

# Error Handling

Build a consistent, production-grade error handling system that separates
user-facing messages from internal details, uses stable error codes for
programmatic consumption, and preserves causal chains for debugging.

## Why This Matters

Without a unified error system, codebases accumulate inconsistent patterns: some
endpoints return `{ error: "something went wrong" }`, others return
`{ message: "Not found", status: 404 }`, and others throw unhandled exceptions
that leak stack traces. Clients can't programmatically react to errors, support
teams can't trace issues, and developers waste time decoding ad-hoc formats.

## Workflow

### 1. Define the base error class

Create a single `AppError` base class that every application error extends. This
is the foundation — all other steps depend on it.

**Required fields on every AppError:**

| Field           | Type          | Purpose                                                                                                                                                                                        |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`          | string        | Stable, programmatic identifier (e.g., `ERR_NOT_FOUND_USER`). Clients switch on this. Never changes once shipped.                                                                              |
| `message`       | string        | Human-readable, user-safe description. Never contains stack traces, SQL, or internal identifiers.                                                                                              |
| `statusCode`    | number        | HTTP status code for the response.                                                                                                                                                             |
| `isOperational` | boolean       | `true` = expected error (bad input, not found). `false` = programmer error (null ref, assertion). Only operational errors are safe to handle; non-operational errors should crash the process. |
| `cause`         | Error \| None | The original error that triggered this one. Preserves the causal chain for debugging.                                                                                                          |

**JS/TS implementation:**

```typescript
class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly cause?: Error;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: string;
    message: string;
    statusCode: number;
    isOperational?: boolean;
    cause?: Error;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = this.constructor.name;
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.isOperational = params.isOperational ?? true;
    this.cause = params.cause;
    this.details = params.details;

    // Preserve proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

**Python implementation:**

```python
class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int,
        is_operational: bool = True,
        cause: Exception | None = None,
        details: dict | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.is_operational = is_operational
        self.__cause__ = cause  # Python's native chaining
        self.details = details
```

### 2. Build the error subclass hierarchy

Create one subclass per HTTP error category. Each subclass locks down
`statusCode` so callers only provide `code`, `message`, and optional `details`.
This prevents mismatched status codes (a validation error accidentally returning
500).

| Subclass              | Status | When to use                                                                                 |
| --------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `ValidationError`     | 400    | Request body/params fail schema or business rules                                           |
| `AuthenticationError` | 401    | Missing, expired, or invalid credentials                                                    |
| `ForbiddenError`      | 403    | Authenticated but lacks permission for this action                                          |
| `NotFoundError`       | 404    | Resource doesn't exist or caller can't see it (use 404 over 403 to avoid leaking existence) |
| `ConflictError`       | 409    | Duplicate key, version mismatch, state transition violation                                 |
| `RateLimitError`      | 429    | Too many requests — always include `retryAfter` field                                       |
| `InternalError`       | 500    | Unexpected failures — always set `isOperational: false`                                     |

**JS/TS subclass example:**

```typescript
class ValidationError extends AppError {
  constructor(params: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super({ ...params, statusCode: 400, isOperational: true });
  }
}

class NotFoundError extends AppError {
  constructor(params: {
    code: string;
    message: string;
    cause?: Error;
  }) {
    super({ ...params, statusCode: 404, isOperational: true });
  }
}

class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(params: {
    code: string;
    message: string;
    retryAfter: number; // seconds
    cause?: Error;
  }) {
    super({ ...params, statusCode: 429, isOperational: true });
    this.retryAfter = params.retryAfter;
  }
}

class InternalError extends AppError {
  constructor(params: {
    code: string;
    message: string;
    cause?: Error;
  }) {
    // Always non-operational — these represent bugs
    super({ ...params, statusCode: 500, isOperational: false });
  }
}
```

### 3. Establish the error code convention

Error codes are the contract between your API and its consumers. They must be
**stable** (never renamed once shipped), **greppable** (unique across the
codebase), and **self-documenting**.

**Format:** `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]`

Examples:

- `ERR_VALIDATION_EMAIL_FORMAT` — email field failed format check
- `ERR_NOT_FOUND_USER` — user resource not found
- `ERR_AUTH_TOKEN_EXPIRED` — JWT/session expired
- `ERR_CONFLICT_USERNAME_TAKEN` — unique constraint on username
- `ERR_RATE_LIMIT_API` — general API rate limit exceeded
- `ERR_FORBIDDEN_ADMIN_ONLY` — requires admin role
- `ERR_INTERNAL_DB_CONNECTION` — database connection failed

**Why string codes instead of numeric codes:** HTTP status codes are too coarse
— there are dozens of reasons a 400 can occur. Numeric error codes (like
`40012`) are opaque and require a lookup table. String codes are
self-documenting, greppable, and clients can pattern-match on prefixes
(`ERR_VALIDATION_*`).

### 4. Design the JSON error response schema

Every error response from your API must follow this exact shape. Consistency
means clients write one error handler, not one per endpoint.

```json
{
  "error": {
    "code": "ERR_VALIDATION_EMAIL_FORMAT",
    "message": "The email address is not valid.",
    "requestId": "req_a1b2c3d4e5",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address.",
        "rejected": "not-an-email"
      }
    ],
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_EMAIL_FORMAT"
  }
}
```

**Field reference:**

| Field                      | Required         | Description                                                             |
| -------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `error.code`               | Yes              | Stable string error code.                                               |
| `error.message`            | Yes              | User-safe, human-readable message. Never contains stack traces or SQL.  |
| `error.requestId`          | Yes              | Correlation ID for tracing this request through logs.                   |
| `error.details`            | Conditional      | Required for 400 validation errors. Array of field-level issues.        |
| `error.details[].field`    | Yes (in details) | JSON path to the invalid field (e.g., `address.zipCode`).               |
| `error.details[].message`  | Yes (in details) | What's wrong with this specific field.                                  |
| `error.details[].rejected` | No               | The value that was rejected (omit for sensitive fields like passwords). |
| `error.target`             | No               | The API endpoint or operation that failed. Useful for debugging.        |
| `error.docUrl`             | No               | Link to documentation about this error code.                            |

**Rate limit responses** must include the `Retry-After` header (in seconds):

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "error": {
    "code": "ERR_RATE_LIMIT_API",
    "message": "Too many requests. Please retry after 60 seconds.",
    "requestId": "req_x9y8z7"
  }
}
```

### 5. Implement error wrapping for propagation

When catching errors from lower layers (database, external APIs, file system),
**wrap** them — don't swallow or re-throw raw. Wrapping preserves the causal
chain while translating to your domain's error taxonomy.

```typescript
// BAD: swallows the original error — you lose the root cause
try {
  await db.users.insert(userData);
} catch (err) {
  throw new ConflictError({
    code: "ERR_CONFLICT_USERNAME_TAKEN",
    message: "This username is already in use.",
  });
}

// GOOD: wraps with cause — logs show the full chain
try {
  await db.users.insert(userData);
} catch (err) {
  throw new ConflictError({
    code: "ERR_CONFLICT_USERNAME_TAKEN",
    message: "This username is already in use.",
    cause: err, // Original DB error preserved for debugging
  });
}
```

**Python equivalent:**

```python
# Use native exception chaining with `from`
try:
    db.users.insert(user_data)
except IntegrityError as e:
    raise ConflictError(
        code="ERR_CONFLICT_USERNAME_TAKEN",
        message="This username is already in use.",
    ) from e  # `from e` sets __cause__, preserving the chain
```

### 6. Add correlation IDs and structured logging

Every incoming request gets a unique `requestId` (generated at the API gateway
or first middleware). This ID flows through every log line and appears in the
error response, enabling end-to-end tracing.

**Middleware pattern (JS/TS):**

```typescript
function correlationMiddleware(req, res, next) {
  // Accept client-provided ID or generate one
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
```

**Structured log output** (JSON, not plaintext — because machines parse logs
too):

```json
{
  "level": "error",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "requestId": "req_a1b2c3d4e5",
  "code": "ERR_CONFLICT_USERNAME_TAKEN",
  "message": "This username is already in use.",
  "statusCode": 409,
  "userId": "usr_123",
  "cause": "duplicate key value violates unique constraint \"users_username_key\"",
  "stack": "ConflictError: This username is already in use.\n    at UserService.create ..."
}
```

**Critical rule:** The `cause` and `stack` fields appear in **logs only**, never
in the API response. The API response contains `code`, `message`, and
`requestId` — enough for the client to report the issue, not enough to leak
internals.

### 7. Build the centralized error handler

One place converts `AppError` instances into HTTP responses. This prevents every
route from implementing its own error formatting.

```typescript
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // If it's not an AppError, wrap it as an InternalError
  const appError = err instanceof AppError ? err : new InternalError({
    code: "ERR_INTERNAL_UNHANDLED",
    message: "An unexpected error occurred.",
    cause: err,
  });

  // Log the full error (internal details included)
  logger.error({
    requestId: req.requestId,
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    cause: appError.cause?.message,
    stack: appError.stack,
    isOperational: appError.isOperational,
  });

  // Build the user-safe response
  const response: Record<string, unknown> = {
    error: {
      code: appError.code,
      message: appError.isOperational
        ? appError.message
        : "An unexpected error occurred. Please try again later.",
      requestId: req.requestId,
    },
  };

  // Attach field-level details for validation errors
  if (appError instanceof ValidationError && appError.details) {
    response.error.details = appError.details;
  }

  // Set Retry-After header for rate limit errors
  if (appError instanceof RateLimitError) {
    res.setHeader("Retry-After", String(appError.retryAfter));
  }

  // Non-operational errors indicate bugs — alert on-call
  if (!appError.isOperational) {
    alertOncall(appError, req.requestId);
  }

  res.status(appError.statusCode).json(response);
}
```

### 8. Generate error reference documentation

For each error code in your codebase, maintain a reference entry. This serves
both API consumers (via `docUrl` in responses) and internal developers.

**Template per error code:**

````markdown
## ERR_CONFLICT_USERNAME_TAKEN

- **HTTP Status:** 409 Conflict
- **Meaning:** The requested username is already registered.
- **Common causes:** User submitted a registration form with a username that
  exists.
- **Resolution:** Choose a different username or check availability first via
  `GET /api/v1/users/check-username`.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_CONFLICT_USERNAME_TAKEN",
      "message": "This username is already in use.",
      "requestId": "req_a1b2c3d4e5"
    }
  }
  ```
````

```
## Common Mistakes

| Mistake | Why it's wrong | Fix |
|---------|---------------|-----|
| Returning raw exception messages to clients | Leaks internals (SQL queries, file paths, stack traces). Security risk and confusing for users. | Always use `isOperational` check — non-operational errors get a generic message. |
| Using HTTP status codes as error codes | Too coarse — 400 covers dozens of distinct errors. Clients can't distinguish validation from malformed JSON. | Use stable string codes (`ERR_VALIDATION_EMAIL_FORMAT`) alongside HTTP status. |
| Swallowing the original error when wrapping | Destroys the root cause. Debugging becomes guesswork. | Always pass `cause` when wrapping. Use `from` in Python. |
| Inconsistent error response shapes across endpoints | Clients need a different parser per endpoint. Breaks SDK generation. | Use one centralized error handler that formats all errors identically. |
| Logging errors without a correlation ID | Can't trace a user-reported error back through distributed services. | Generate `requestId` in middleware, attach to every log line and error response. |
| Making `InternalError` operational | Bugs get swallowed silently instead of triggering alerts. | `InternalError` must always have `isOperational: false`. |
| Returning 403 for resources that don't exist | Confirms the resource exists to unauthorized users (information leakage). | Return 404 for resources the caller can't access, unless existence is already public. |
| Omitting `Retry-After` on 429 responses | Clients have no idea when to retry, leading to thundering herd retries. | Always include `Retry-After` header with seconds until the limit resets. |
| Putting field validation errors in the top-level message | Client can't highlight specific form fields. User sees a wall of text. | Use `details` array with per-field `field`, `message`, and optional `rejected`. |
| Renaming error codes after they ship | Breaks client error handling that switches on code strings. | Error codes are immutable once released. Add new codes, deprecate old ones. |

## Quick Reference

**Error subclass decision tree:**
```

Is the request malformed or violates business rules? → ValidationError (400)
with field-level details

Is the caller not authenticated? → AuthenticationError (401)

Is the caller authenticated but lacks permission? → ForbiddenError (403) — or
NotFoundError (404) to hide existence

Does the target resource not exist? → NotFoundError (404)

Does the request conflict with current state? → ConflictError (409)

Has the caller exceeded rate limits? → RateLimitError (429) with retryAfter

Is this an unexpected failure / bug? → InternalError (500) with isOperational:
false

```
**Error response checklist:**
- [ ] Response body follows the JSON schema (code, message, requestId)
- [ ] Validation errors include `details` array with field-level info
- [ ] 429 responses include `Retry-After` header
- [ ] No stack traces, SQL, or internal paths in the response body
- [ ] `requestId` matches the `X-Request-Id` response header
- [ ] Non-operational errors return generic message, not the real one
- [ ] Original error preserved via `cause` in logs
```

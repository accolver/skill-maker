---
name: error-handling
description: >-
  Implement structured error handling with a unified error taxonomy, stable
  string error codes, proper error wrapping/propagation, user-safe vs internal
  error separation, and correlation-ID-based structured logging. Use when
  adding error handling to any backend service, designing error responses for
  APIs, refactoring inconsistent try/catch blocks, building middleware or
  decorators for error translation, or when error messages leak internal
  details to users. Also use when you see bare throw/raise statements,
  generic catch-all handlers, missing request IDs in logs, or inconsistent
  error response shapes across endpoints.
version: 0.1.0
---

# Error Handling

Build consistent, traceable, and secure error handling across any codebase.

Inconsistent error handling is one of the most common sources of production
incidents. When errors lack stable codes, callers can't programmatically react.
When errors leak stack traces, attackers gain information. When errors lack
correlation IDs, debugging distributed failures becomes guesswork. This skill
gives you a concrete system that solves all three problems.

## Core Principles

### 1. Every Error Gets a Stable String Code

HTTP status codes tell you the _category_ — string codes tell you the _cause_. A
client receiving `404` doesn't know if the user, the document, or the endpoint
is missing. `ERR_NOT_FOUND_USER` lets the client show the right UI.

**Format:** `ERR_{CATEGORY}_{ENTITY}[_{DETAIL}]`

| Category     | HTTP | Example Codes                                    |
| ------------ | ---- | ------------------------------------------------ |
| `VALIDATION` | 400  | `ERR_VALIDATION_EMAIL`, `ERR_VALIDATION_RANGE`   |
| `AUTH`       | 401  | `ERR_AUTH_TOKEN_EXPIRED`, `ERR_AUTH_CREDENTIALS` |
| `FORBIDDEN`  | 403  | `ERR_FORBIDDEN_ROLE`, `ERR_FORBIDDEN_RESOURCE`   |
| `NOT_FOUND`  | 404  | `ERR_NOT_FOUND_USER`, `ERR_NOT_FOUND_ENDPOINT`   |
| `CONFLICT`   | 409  | `ERR_CONFLICT_DUPLICATE`, `ERR_CONFLICT_VERSION` |
| `RATE_LIMIT` | 429  | `ERR_RATE_LIMIT_API`, `ERR_RATE_LIMIT_LOGIN`     |
| `INTERNAL`   | 500  | `ERR_INTERNAL_DB`, `ERR_INTERNAL_SERVICE`        |

These codes are part of your API contract. Once published, treat them as
immutable — clients depend on them for branching logic.

### 2. User-Facing vs Internal: Two Audiences, Two Messages

Every error carries two messages:

- **`message`** — safe for end users. Never includes table names, stack traces,
  query details, or internal service names.
- **`internalMessage`** — full diagnostic detail. Logged server-side, never
  serialized to responses.

This is a security boundary. A leaked message like
`"Column 'ssn' not found in
table 'users_pii'"` tells an attacker your schema.
The user sees only:
`"An internal error occurred. Please try again or contact support."`

### 3. Error Wrapping Preserves the Causal Chain

When you catch and rethrow, wrap — don't replace. The original error is the
_cause_; your new error is the _context_:

```
AppError: ERR_INTERNAL_SERVICE — Failed to create order
  caused by: DatabaseError: connection refused to orders-db:5432
    caused by: ECONNREFUSED 10.0.3.12:5432
```

Without wrapping, you'd only see "Failed to create order" with no idea whether
the database was down, the query was malformed, or a constraint was violated.

### 4. Every Request Gets a Correlation ID

Assign a `requestId` (UUID v4) at the entry point of every request. Propagate it
through every log line, downstream call, and error response. When a user reports
an error, the `requestId` in their response is the key that unlocks the full
trace in your logs.

## Error Class Hierarchy

Build a base `AppError` class and extend it for each category.

### JavaScript/TypeScript

```typescript
class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toResponse(requestId: string) {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super("ERR_VALIDATION", 400, message, details, cause);
  }
}

class AuthenticationError extends AppError {
  constructor(
    code = "ERR_AUTH",
    message = "Authentication required",
    cause?: Error,
  ) {
    super(code, 401, message, undefined, cause);
  }
}

class ForbiddenError extends AppError {
  constructor(
    code = "ERR_FORBIDDEN",
    message = "Insufficient permissions",
    cause?: Error,
  ) {
    super(code, 403, message, undefined, cause);
  }
}

class NotFoundError extends AppError {
  constructor(
    code = "ERR_NOT_FOUND",
    message = "Resource not found",
    cause?: Error,
  ) {
    super(code, 404, message, undefined, cause);
  }
}

class ConflictError extends AppError {
  constructor(
    code = "ERR_CONFLICT",
    message = "Resource conflict",
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, 409, message, details, cause);
  }
}

class RateLimitError extends AppError {
  constructor(
    public readonly retryAfterSeconds: number,
    code = "ERR_RATE_LIMIT",
    message = "Too many requests",
    cause?: Error,
  ) {
    super(code, 429, message, undefined, cause);
  }
}

class InternalError extends AppError {
  private _internalMessage: string;
  constructor(internalMessage: string, code = "ERR_INTERNAL", cause?: Error) {
    super(
      code,
      500,
      "An internal error occurred. Please try again or contact support.",
      undefined,
      cause,
    );
    this._internalMessage = internalMessage;
  }
  get internalMessage() {
    return this._internalMessage;
  }
}
```

### Python

```python
class AppError(Exception):
    def __init__(self, code: str, status_code: int, message: str,
                 details: dict | None = None, cause: Exception | None = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.message = message
        self.details = details
        self.__cause__ = cause

    def to_response(self, request_id: str) -> dict:
        resp = {"error": {"code": self.code, "message": self.message, "requestId": request_id}}
        if self.details:
            resp["error"]["details"] = self.details
        return resp

class ValidationError(AppError):
    def __init__(self, message, details=None, cause=None):
        super().__init__("ERR_VALIDATION", 400, message, details, cause)

class AuthenticationError(AppError):
    def __init__(self, code="ERR_AUTH", message="Authentication required", cause=None):
        super().__init__(code, 401, message, cause=cause)

class ForbiddenError(AppError):
    def __init__(self, code="ERR_FORBIDDEN", message="Insufficient permissions", cause=None):
        super().__init__(code, 403, message, cause=cause)

class NotFoundError(AppError):
    def __init__(self, code="ERR_NOT_FOUND", message="Resource not found", cause=None):
        super().__init__(code, 404, message, cause=cause)

class ConflictError(AppError):
    def __init__(self, code="ERR_CONFLICT", message="Resource conflict", details=None, cause=None):
        super().__init__(code, 409, message, details, cause)

class RateLimitError(AppError):
    def __init__(self, retry_after_seconds: int, code="ERR_RATE_LIMIT", message="Too many requests", cause=None):
        super().__init__(code, 429, message, cause=cause)
        self.retry_after_seconds = retry_after_seconds

class InternalError(AppError):
    def __init__(self, internal_message: str, code="ERR_INTERNAL", cause=None):
        super().__init__(code, 500, "An internal error occurred. Please try again or contact support.", cause=cause)
        self._internal_message = internal_message

    @property
    def internal_message(self) -> str:
        return self._internal_message
```

## Error Response JSON Schema

All error responses follow one shape. Clients write one error parser, not one
per endpoint.

```json
{
  "error": {
    "code": "ERR_VALIDATION_EMAIL",
    "message": "The email address is invalid.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Must be a valid email address",
          "rejected_value": "not-an-email"
        }
      ]
    },
    "target": "email",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_EMAIL"
  }
}
```

### Required Fields

| Field       | Type   | Purpose                                   |
| ----------- | ------ | ----------------------------------------- |
| `code`      | string | Stable, machine-readable error identifier |
| `message`   | string | Human-readable, user-safe description     |
| `requestId` | string | Correlation ID for log tracing            |

### Optional Fields

| Field     | Type   | When to Include                                  |
| --------- | ------ | ------------------------------------------------ |
| `details` | object | Validation errors — include per-field breakdowns |
| `target`  | string | When error relates to a specific input field     |
| `docUrl`  | string | When you have developer-facing error docs        |

### Validation Error Details

For 400 errors, `details.fields` gives clients enough info to render inline
field errors without parsing the message string:

```json
{
  "fields": [
    {
      "field": "age",
      "message": "Must be between 0 and 150",
      "rejected_value": -5
    },
    {
      "field": "username",
      "message": "Must be 3-30 characters, alphanumeric only",
      "rejected_value": "ab"
    }
  ]
}
```

## Middleware / Global Handler

Centralize error-to-response translation in one place. Route handlers throw
typed errors; the middleware catches and formats them. This prevents
inconsistent error shapes across endpoints.

### Express.js

```typescript
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req.headers["x-request-id"] as string) ||
    crypto.randomUUID();

  if (err instanceof AppError) {
    logger.error({
      requestId,
      code: err.code,
      message: err.message,
      ...(err instanceof InternalError &&
        { internalMessage: err.internalMessage }),
      ...(err.cause && { cause: err.cause.message }),
      stack: err.stack,
    });
    if (err instanceof RateLimitError) {
      res.set("Retry-After", String(err.retryAfterSeconds));
    }
    return res.status(err.statusCode).json(err.toResponse(requestId));
  }

  // Unhandled errors — never leak details
  logger.error({
    requestId,
    code: "ERR_INTERNAL_UNHANDLED",
    message: err.message,
    stack: err.stack,
  });
  return res.status(500).json({
    error: {
      code: "ERR_INTERNAL",
      message:
        "An internal error occurred. Please try again or contact support.",
      requestId,
    },
  });
}
```

### FastAPI

```python
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    logger.error("AppError", code=exc.code, message=exc.message, request_id=request_id,
                 **({"internal_message": exc.internal_message} if isinstance(exc, InternalError) else {}),
                 **({"cause": str(exc.__cause__)} if exc.__cause__ else {}))
    headers = {"Retry-After": str(exc.retry_after_seconds)} if isinstance(exc, RateLimitError) else {}
    return JSONResponse(status_code=exc.status_code, content=exc.to_response(request_id), headers=headers)

@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    logger.error("Unhandled error", message=str(exc), request_id=request_id)
    return JSONResponse(status_code=500, content={"error": {
        "code": "ERR_INTERNAL", "message": "An internal error occurred. Please try again or contact support.",
        "requestId": request_id}})
```

## Workflow: Adding Error Handling to a Service

### Step 1 — Audit Current State

Scan for these anti-patterns:

- Bare `throw new Error("...")` / `raise Exception("...")`
- `catch (e) { res.status(500).send(e.message) }` — leaks internals
- Inconsistent response shapes across endpoints
- Missing `requestId` in error responses or logs
- String-matching on error messages instead of codes

### Step 2 — Define the Error Taxonomy

List every error condition. Map each to a category, code, and user-safe message:

| Code                     | HTTP | User Message                                        | When                        |
| ------------------------ | ---- | --------------------------------------------------- | --------------------------- |
| `ERR_VALIDATION_EMAIL`   | 400  | The email address is invalid.                       | Email fails format check    |
| `ERR_AUTH_TOKEN_EXPIRED` | 401  | Your session has expired. Please log in again.      | JWT exp claim is past       |
| `ERR_NOT_FOUND_USER`     | 404  | User not found.                                     | User ID lookup returns null |
| `ERR_CONFLICT_DUPLICATE` | 409  | An account with this email already exists.          | Unique constraint violation |
| `ERR_RATE_LIMIT_API`     | 429  | Too many requests. Please wait before trying again. | Sliding window exceeded     |
| `ERR_INTERNAL_DB`        | 500  | An internal error occurred.                         | Database connection failure |

For larger services, maintain this as an error code registry — a single file
mapping every code to its metadata (statusCode, message, docUrl). This prevents
duplication and can auto-generate developer-facing error documentation.

### Step 3 — Implement the Base Classes

Add the `AppError` hierarchy from the
[Error Class Hierarchy](#error-class-hierarchy) section. Place it in a shared
module so every layer imports from one source.

### Step 4 — Add the Global Error Handler

Wire up middleware or exception handlers from the
[Middleware](#middleware--global-handler) section. This is the single point
where errors become HTTP responses.

### Step 5 — Replace Bare Throws

Refactor each `throw` / `raise` to use the appropriate typed error:

```diff
- throw new Error("User not found");
+ throw new NotFoundError("ERR_NOT_FOUND_USER", "User not found");
```

```diff
- raise Exception("Invalid email")
+ raise ValidationError("Invalid email format", details={"fields": [{"field": "email", "message": "Must be a valid email"}]})
```

### Step 6 — Add Correlation ID Propagation

Ensure every request gets a `requestId` at the entry point. Pass it through
context (`AsyncLocalStorage` in Node.js, `contextvars` in Python) so every log
line and downstream call includes it without manual threading.

### Step 7 — Verify the Contract

For each endpoint, confirm:

- [ ] Error responses match the JSON schema (code, message, requestId)
- [ ] 500 errors never expose internal details in the response body
- [ ] 400 errors include field-level details when applicable
- [ ] 429 errors include a `Retry-After` header
- [ ] Logs include requestId, error code, and causal chain
- [ ] Error codes are stable strings, not ad-hoc messages

## Common Mistakes

| Mistake                                                   | Why It's a Problem                                       | Fix                                                  |
| --------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Using HTTP status as the only error identifier            | Clients can't distinguish `404 user` from `404 endpoint` | Add stable string codes                              |
| Logging the user-safe message instead of the internal one | Logs become useless for debugging                        | Log `internalMessage` + cause chain                  |
| Catching and re-throwing without wrapping                 | Destroys the causal chain                                | Use `cause` parameter to wrap                        |
| Returning different JSON shapes from different endpoints  | Clients need per-endpoint error parsers                  | Use one global error handler                         |
| Including stack traces in production responses            | Information disclosure vulnerability                     | Only include in dev mode, if at all                  |
| Inventing new codes per-instance instead of per-category  | Code explosion, clients can't match                      | Use `ERR_{CATEGORY}_{ENTITY}` pattern                |
| Forgetting `Retry-After` on 429 responses                 | Clients retry immediately, worsening overload            | Always set the header on rate limit errors           |
| Swallowing errors silently (`catch {}`)                   | Failures become invisible                                | At minimum, log and re-throw or return a typed error |

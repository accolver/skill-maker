# Comprehensive Error Response System for a Public REST API

This document defines a complete, production-grade error handling system for a
public REST API serving mobile and web clients. It includes the base error
class, subclass hierarchy, error code registry, JSON response schema, example
responses, and developer-facing reference documentation.

---

## 1. Base Error Class (AppError)

Every application error extends this single base class. It enforces the five
required fields and supports error wrapping via `cause`.

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

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

**Required fields on every AppError:**

| Field           | Type          | Purpose                                                                                                           |
| --------------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `code`          | string        | Stable, programmatic identifier (e.g., `ERR_NOT_FOUND_USER`). Clients switch on this. Never changes once shipped. |
| `message`       | string        | Human-readable, user-safe description. Never contains stack traces, SQL, or internal identifiers.                 |
| `statusCode`    | number        | HTTP status code for the response.                                                                                |
| `isOperational` | boolean       | `true` = expected error (bad input, not found). `false` = programmer error (null ref, assertion).                 |
| `cause`         | Error \| None | The original error that triggered this one. Preserves the causal chain for debugging.                             |

---

## 2. Error Subclass Hierarchy

Each subclass locks down `statusCode` so callers only provide `code`, `message`,
and optional `details`. This prevents mismatched status codes.

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

class AuthenticationError extends AppError {
  constructor(params: {
    code: string;
    message: string;
    cause?: Error;
  }) {
    super({ ...params, statusCode: 401, isOperational: true });
  }
}

class ForbiddenError extends AppError {
  constructor(params: {
    code: string;
    message: string;
    cause?: Error;
  }) {
    super({ ...params, statusCode: 403, isOperational: true });
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

class ConflictError extends AppError {
  constructor(params: {
    code: string;
    message: string;
    cause?: Error;
  }) {
    super({ ...params, statusCode: 409, isOperational: true });
  }
}

class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(params: {
    code: string;
    message: string;
    retryAfter: number; // seconds until limit resets
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

| Subclass              | Status | When to use                                                                                 |
| --------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `ValidationError`     | 400    | Request body/params fail schema or business rules                                           |
| `AuthenticationError` | 401    | Missing, expired, or invalid credentials                                                    |
| `ForbiddenError`      | 403    | Authenticated but lacks permission for this action                                          |
| `NotFoundError`       | 404    | Resource doesn't exist or caller can't see it (use 404 over 403 to avoid leaking existence) |
| `ConflictError`       | 409    | Duplicate key, version mismatch, state transition violation                                 |
| `RateLimitError`      | 429    | Too many requests — always include `retryAfter` field                                       |
| `InternalError`       | 500    | Unexpected failures — always set `isOperational: false`                                     |

---

## 3. Error Code Convention

**Format:** `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]`

Error codes are the contract between the API and its consumers. They are:

- **Stable** — never renamed once shipped
- **Greppable** — unique across the codebase
- **Self-documenting** — readable without a lookup table

String codes are used instead of numeric codes because HTTP status codes are too
coarse (dozens of reasons for a 400), and numeric error codes (like `40012`) are
opaque and require a lookup table.

---

## 4. Error Code Registry

### 4.1 Validation Errors (400)

| Code                            | Message                                       | When Used                                            |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `ERR_VALIDATION_EMAIL_FORMAT`   | The email address is not valid.               | Email field fails RFC 5322 format check              |
| `ERR_VALIDATION_PASSWORD_WEAK`  | Password does not meet strength requirements. | Password fails minimum length/complexity rules       |
| `ERR_VALIDATION_FIELD_REQUIRED` | A required field is missing.                  | Required field is absent from request body           |
| `ERR_VALIDATION_FIELD_TYPE`     | Field value has an incorrect type.            | String sent where number expected, etc.              |
| `ERR_VALIDATION_BODY_MALFORMED` | The request body could not be parsed.         | Invalid JSON syntax in request body                  |
| `ERR_VALIDATION_DATE_RANGE`     | The date range is invalid.                    | Start date is after end date, or date is in the past |

### 4.2 Authentication Errors (401)

| Code                     | Message                           | When Used                                      |
| ------------------------ | --------------------------------- | ---------------------------------------------- |
| `ERR_AUTH_TOKEN_MISSING` | Authentication token is required. | No Authorization header or cookie present      |
| `ERR_AUTH_TOKEN_EXPIRED` | Authentication token has expired. | JWT/session past its expiration time           |
| `ERR_AUTH_TOKEN_INVALID` | Authentication token is invalid.  | Malformed JWT, bad signature, or revoked token |

### 4.3 Forbidden Errors (403)

| Code                           | Message                                             | When Used                                    |
| ------------------------------ | --------------------------------------------------- | -------------------------------------------- |
| `ERR_FORBIDDEN_ADMIN_ONLY`     | This action requires administrator privileges.      | Non-admin user attempts admin-only operation |
| `ERR_FORBIDDEN_RESOURCE_OWNER` | You do not have permission to modify this resource. | User tries to edit another user's resource   |

### 4.4 Not Found Errors (404)

| Code                     | Message                               | When Used                                    |
| ------------------------ | ------------------------------------- | -------------------------------------------- |
| `ERR_NOT_FOUND_USER`     | The requested user was not found.     | User ID/username doesn't exist in the system |
| `ERR_NOT_FOUND_RESOURCE` | The requested resource was not found. | Generic resource lookup fails                |

### 4.5 Conflict Errors (409)

| Code                          | Message                          | When Used                               |
| ----------------------------- | -------------------------------- | --------------------------------------- |
| `ERR_CONFLICT_USERNAME_TAKEN` | This username is already in use. | Unique constraint violation on username |

### 4.6 Rate Limit Errors (429)

| Code                 | Message                                | When Used                      |
| -------------------- | -------------------------------------- | ------------------------------ |
| `ERR_RATE_LIMIT_API` | Too many requests. Please retry later. | Global API rate limit exceeded |

### 4.7 Internal Errors (500)

| Code                         | Message (logged internally)      | User-Facing Message                                   |
| ---------------------------- | -------------------------------- | ----------------------------------------------------- |
| `ERR_INTERNAL_DB_CONNECTION` | Database connection failed.      | An unexpected error occurred. Please try again later. |
| `ERR_INTERNAL_UNHANDLED`     | An unhandled exception occurred. | An unexpected error occurred. Please try again later. |

> **Note:** Internal errors always return the generic user-facing message. The
> real message is logged with the correlation ID for internal debugging only.
> `isOperational` is always `false` for internal errors.

---

## 5. JSON Error Response Schema

### 5.1 JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://api.example.com/schemas/error-response.json",
  "title": "API Error Response",
  "description": "Standard error response format for all API endpoints. Every error response follows this exact shape so clients can write one error handler, not one per endpoint.",
  "type": "object",
  "required": ["error"],
  "additionalProperties": false,
  "properties": {
    "error": {
      "type": "object",
      "required": ["code", "message", "requestId"],
      "additionalProperties": false,
      "properties": {
        "code": {
          "type": "string",
          "pattern": "^ERR_[A-Z]+_[A-Z][A-Z0-9_]*$",
          "description": "Stable, programmatic error identifier. Format: ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]. Clients switch on this value. Never changes once shipped.",
          "examples": [
            "ERR_VALIDATION_EMAIL_FORMAT",
            "ERR_NOT_FOUND_USER",
            "ERR_AUTH_TOKEN_EXPIRED",
            "ERR_RATE_LIMIT_API"
          ]
        },
        "message": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1024,
          "description": "Human-readable, user-safe description of the error. Never contains stack traces, SQL queries, file paths, or internal identifiers. Suitable for display to end users in mobile and web clients."
        },
        "requestId": {
          "type": "string",
          "pattern": "^req_[a-zA-Z0-9]+$",
          "description": "Unique correlation ID for this request. Matches the X-Request-Id response header. Used for end-to-end tracing through logs and support tickets."
        },
        "details": {
          "type": "array",
          "minItems": 1,
          "description": "Field-level validation error details. Required when code starts with ERR_VALIDATION_. Each entry identifies a specific field that failed validation.",
          "items": {
            "type": "object",
            "required": ["field", "message"],
            "additionalProperties": false,
            "properties": {
              "field": {
                "type": "string",
                "description": "JSON path to the invalid field (e.g., 'email', 'address.zipCode', 'items[0].quantity'). Clients use this to highlight specific form fields."
              },
              "message": {
                "type": "string",
                "description": "Human-readable description of what is wrong with this specific field."
              },
              "rejected": {
                "type": ["string", "number", "boolean", "null"],
                "description": "The value that was rejected. Omit for sensitive fields like passwords, tokens, or secrets."
              },
              "constraint": {
                "type": "string",
                "description": "The validation rule that failed (e.g., 'format:email', 'minLength:8', 'required'). Useful for programmatic client-side validation."
              }
            }
          }
        },
        "target": {
          "type": "string",
          "description": "The API endpoint or operation that failed (e.g., 'POST /api/v1/users'). Useful for debugging when clients call multiple endpoints.",
          "examples": [
            "POST /api/v1/users",
            "GET /api/v1/orders/ord_123",
            "PATCH /api/v1/settings"
          ]
        },
        "docUrl": {
          "type": "string",
          "format": "uri",
          "description": "Link to documentation about this specific error code. Allows developers to look up resolution steps directly from the error response.",
          "examples": [
            "https://docs.example.com/errors/ERR_VALIDATION_EMAIL_FORMAT"
          ]
        },
        "retryAfter": {
          "type": "integer",
          "minimum": 1,
          "description": "Seconds until the rate limit resets. Present only on 429 responses. Also sent as the Retry-After HTTP header."
        },
        "locale": {
          "type": "string",
          "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
          "description": "The locale used for the message and details[].message fields. Determined by the Accept-Language request header. Defaults to 'en'.",
          "default": "en",
          "examples": ["en", "es", "fr", "de", "ja", "pt-BR"]
        }
      }
    }
  }
}
```

### 5.2 Field Reference

| Field                        | Required         | Type            | Description                                                                      |
| ---------------------------- | ---------------- | --------------- | -------------------------------------------------------------------------------- |
| `error.code`                 | Yes              | string          | Stable string error code. Format: `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]`.          |
| `error.message`              | Yes              | string          | User-safe, human-readable message. Never contains stack traces or SQL.           |
| `error.requestId`            | Yes              | string          | Correlation ID for tracing this request through logs.                            |
| `error.details`              | Conditional      | array           | Required for 400 validation errors. Array of field-level issues.                 |
| `error.details[].field`      | Yes (in details) | string          | JSON path to the invalid field (e.g., `address.zipCode`).                        |
| `error.details[].message`    | Yes (in details) | string          | What's wrong with this specific field.                                           |
| `error.details[].rejected`   | No               | string/num/bool | The value that was rejected (omit for sensitive fields like passwords).          |
| `error.details[].constraint` | No               | string          | The validation rule that failed (e.g., `format:email`, `minLength:8`).           |
| `error.target`               | No               | string          | The API endpoint or operation that failed. Useful for debugging.                 |
| `error.docUrl`               | No               | string (URI)    | Link to documentation about this error code.                                     |
| `error.retryAfter`           | Conditional      | integer         | Seconds until rate limit resets. Required on 429 responses.                      |
| `error.locale`               | No               | string          | Locale used for messages. Determined by `Accept-Language` header. Default: `en`. |

### 5.3 Localization Support

The API supports localized error messages via the `Accept-Language` HTTP request
header. The response includes a `locale` field indicating which locale was used.

**Request:**

```
POST /api/v1/users
Accept-Language: es
Content-Type: application/json
```

**Response (Spanish):**

```json
{
  "error": {
    "code": "ERR_VALIDATION_EMAIL_FORMAT",
    "message": "La dirección de correo electrónico no es válida.",
    "requestId": "req_m3n4o5p6q7",
    "locale": "es",
    "details": [
      {
        "field": "email",
        "message": "Debe ser una dirección de correo electrónico válida.",
        "rejected": "no-es-email",
        "constraint": "format:email"
      }
    ],
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_EMAIL_FORMAT"
  }
}
```

**Localization implementation pattern:**

```typescript
// Error message catalog keyed by error code and locale
const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  "ERR_VALIDATION_EMAIL_FORMAT": {
    "en": "The email address is not valid.",
    "es": "La dirección de correo electrónico no es válida.",
    "fr": "L'adresse e-mail n'est pas valide.",
    "de": "Die E-Mail-Adresse ist ungültig.",
    "ja": "メールアドレスが無効です。",
    "pt-BR": "O endereço de e-mail não é válido.",
  },
  // ... additional codes
};

function getLocalizedMessage(code: string, locale: string): string {
  const messages = ERROR_MESSAGES[code];
  if (!messages) return "An error occurred.";
  return messages[locale] || messages["en"] || "An error occurred.";
}
```

---

## 6. Example Error Responses

### 6.1 Validation Error with Multiple Field Failures

A user submits a registration form with an invalid email, a weak password, and a
missing required field.

**Request:**

```
POST /api/v1/users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Accept-Language: en
X-Request-Id: req_a1b2c3d4e5

{
  "email": "not-an-email",
  "password": "123",
  "username": "",
  "profile": {
    "birthDate": "2099-01-01"
  }
}
```

**Response:**

```
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Request-Id: req_a1b2c3d4e5
```

```json
{
  "error": {
    "code": "ERR_VALIDATION_FIELD_REQUIRED",
    "message": "One or more fields failed validation. See details for specifics.",
    "requestId": "req_a1b2c3d4e5",
    "locale": "en",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address.",
        "rejected": "not-an-email",
        "constraint": "format:email"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
        "constraint": "minLength:8"
      },
      {
        "field": "username",
        "message": "Username is required and cannot be empty.",
        "rejected": "",
        "constraint": "required"
      },
      {
        "field": "profile.birthDate",
        "message": "Birth date cannot be in the future.",
        "rejected": "2099-01-01",
        "constraint": "date:past"
      }
    ],
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_FIELD_REQUIRED"
  }
}
```

> **Note:** The `password` detail omits the `rejected` field because passwords
> are sensitive. The `details` array allows clients to highlight each invalid
> form field individually.

### 6.2 Authentication Error

A client sends a request with an expired JWT token.

**Request:**

```
GET /api/v1/users/me HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired...
X-Request-Id: req_f6g7h8i9j0
```

**Response:**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json
X-Request-Id: req_f6g7h8i9j0
WWW-Authenticate: Bearer error="invalid_token", error_description="The access token has expired"
```

```json
{
  "error": {
    "code": "ERR_AUTH_TOKEN_EXPIRED",
    "message": "Your authentication token has expired. Please sign in again.",
    "requestId": "req_f6g7h8i9j0",
    "locale": "en",
    "target": "GET /api/v1/users/me",
    "docUrl": "https://docs.example.com/errors/ERR_AUTH_TOKEN_EXPIRED"
  }
}
```

> **Note:** No `details` array — authentication errors don't have field-level
> issues. The `WWW-Authenticate` header follows RFC 6750 for bearer token
> errors.

### 6.3 Not Found Error

A client requests a user profile that doesn't exist (or that the caller doesn't
have permission to see — we return 404 instead of 403 to avoid leaking
existence).

**Request:**

```
GET /api/v1/users/usr_nonexistent HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid...
X-Request-Id: req_k1l2m3n4o5
```

**Response:**

```
HTTP/1.1 404 Not Found
Content-Type: application/json
X-Request-Id: req_k1l2m3n4o5
```

```json
{
  "error": {
    "code": "ERR_NOT_FOUND_USER",
    "message": "The requested user was not found.",
    "requestId": "req_k1l2m3n4o5",
    "locale": "en",
    "target": "GET /api/v1/users/usr_nonexistent",
    "docUrl": "https://docs.example.com/errors/ERR_NOT_FOUND_USER"
  }
}
```

> **Note:** The response does not reveal whether the user exists but is
> inaccessible, or truly doesn't exist. This prevents information leakage about
> which user IDs are valid.

### 6.4 Rate Limit Error

A client has exceeded the API rate limit of 100 requests per minute.

**Request:**

```
GET /api/v1/products HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid...
X-Request-Id: req_p6q7r8s9t0
```

**Response:**

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-Request-Id: req_p6q7r8s9t0
Retry-After: 42
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705312242
```

```json
{
  "error": {
    "code": "ERR_RATE_LIMIT_API",
    "message": "Too many requests. Please retry after 42 seconds.",
    "requestId": "req_p6q7r8s9t0",
    "locale": "en",
    "retryAfter": 42,
    "target": "GET /api/v1/products",
    "docUrl": "https://docs.example.com/errors/ERR_RATE_LIMIT_API"
  }
}
```

> **Note:** The `Retry-After` HTTP header is always included on 429 responses
> (in seconds). The `retryAfter` field in the JSON body mirrors this value for
> clients that find it easier to parse the body. Additional `X-RateLimit-*`
> headers provide context about the rate limit policy.

### 6.5 Internal Server Error

An unexpected database connection failure occurs. The real error is logged
internally; the client receives a generic message.

**Request:**

```
POST /api/v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid...
Content-Type: application/json
X-Request-Id: req_u1v2w3x4y5

{
  "items": [{ "productId": "prod_abc", "quantity": 2 }]
}
```

**Response:**

```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
X-Request-Id: req_u1v2w3x4y5
```

```json
{
  "error": {
    "code": "ERR_INTERNAL_UNHANDLED",
    "message": "An unexpected error occurred. Please try again later.",
    "requestId": "req_u1v2w3x4y5",
    "locale": "en",
    "target": "POST /api/v1/orders",
    "docUrl": "https://docs.example.com/errors/ERR_INTERNAL_UNHANDLED"
  }
}
```

> **Note:** The message is always the generic "An unexpected error occurred.
> Please try again later." for internal errors — never the real error message.
> No stack traces, SQL queries, file paths, or internal identifiers are exposed.
> The `requestId` allows the user to reference this error when contacting
> support, and the support team can use it to find the full error details in
> structured logs.

**What the server logs internally (never sent to the client):**

```json
{
  "level": "error",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "requestId": "req_u1v2w3x4y5",
  "code": "ERR_INTERNAL_DB_CONNECTION",
  "message": "Database connection failed.",
  "statusCode": 500,
  "isOperational": false,
  "userId": "usr_456",
  "cause": "ECONNREFUSED 10.0.1.5:5432 - Connection refused",
  "stack": "InternalError: Database connection failed.\n    at OrderService.create (src/services/order.ts:47:11)\n    at OrderController.createOrder (src/controllers/order.ts:23:5)"
}
```

---

## 7. Error Wrapping and Propagation

When catching errors from lower layers (database, external APIs, file system),
**wrap** them — don't swallow or re-throw raw. Wrapping preserves the causal
chain while translating to the domain's error taxonomy.

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

---

## 8. Correlation IDs and Structured Logging

Every incoming request gets a unique `requestId` generated at the first
middleware layer. This ID flows through every log line and appears in the error
response, enabling end-to-end tracing.

```typescript
function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Accept client-provided ID or generate one
  req.requestId = req.headers["x-request-id"] as string ||
    `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  res.setHeader("X-Request-Id", req.requestId);
  next();
}
```

**Critical rule:** The `cause` and `stack` fields appear in **logs only**, never
in the API response. The API response contains `code`, `message`, and
`requestId` — enough for the client to report the issue, not enough to leak
internals.

---

## 9. Centralized Error Handler

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

  // Determine locale from Accept-Language header
  const locale = parseAcceptLanguage(req.headers["accept-language"]) || "en";

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
        ? getLocalizedMessage(appError.code, locale)
        : getLocalizedMessage("ERR_INTERNAL_UNHANDLED", locale),
      requestId: req.requestId,
      locale: locale,
    },
  };

  // Attach field-level details for validation errors
  if (appError instanceof ValidationError && appError.details) {
    (response.error as Record<string, unknown>).details = appError.details;
  }

  // Add target endpoint for debugging context
  (response.error as Record<string, unknown>).target =
    `${req.method} ${req.originalUrl}`;

  // Add documentation URL
  (response.error as Record<string, unknown>).docUrl =
    `https://docs.example.com/errors/${appError.code}`;

  // Set Retry-After header for rate limit errors
  if (appError instanceof RateLimitError) {
    res.setHeader("Retry-After", String(appError.retryAfter));
    (response.error as Record<string, unknown>).retryAfter =
      appError.retryAfter;
  }

  // Non-operational errors indicate bugs — alert on-call
  if (!appError.isOperational) {
    alertOncall(appError, req.requestId);
  }

  res.status(appError.statusCode).json(response);
}
```

---

## 10. Developer-Facing Error Reference Document

This section serves as the complete error reference for API consumers. Each
error code has its own entry with HTTP status, meaning, common causes,
resolution steps, and an example response. This content would be published at
`https://docs.example.com/errors/`.

---

### ERR_VALIDATION_EMAIL_FORMAT

- **HTTP Status:** 400 Bad Request
- **Meaning:** The `email` field does not contain a valid email address per
  RFC 5322.
- **Common causes:** Typo in email (missing `@`, double dots), copy-paste
  artifact, or placeholder text submitted.
- **Resolution:** Ensure the email field contains a valid email address (e.g.,
  `user@example.com`). Validate client-side before submission.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_EMAIL_FORMAT",
    "message": "The email address is not valid.",
    "requestId": "req_a1b2c3d4e5",
    "locale": "en",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address.",
        "rejected": "not-an-email",
        "constraint": "format:email"
      }
    ],
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_EMAIL_FORMAT"
  }
}
```

---

### ERR_VALIDATION_PASSWORD_WEAK

- **HTTP Status:** 400 Bad Request
- **Meaning:** The `password` field does not meet the minimum strength
  requirements.
- **Common causes:** Password is too short, lacks uppercase letters, lacks
  numbers, or lacks special characters.
- **Resolution:** Password must be at least 8 characters and include at least
  one uppercase letter, one lowercase letter, and one number. Special characters
  are recommended.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_PASSWORD_WEAK",
    "message": "Password does not meet strength requirements.",
    "requestId": "req_b2c3d4e5f6",
    "locale": "en",
    "details": [
      {
        "field": "password",
        "message": "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
        "constraint": "minLength:8"
      }
    ],
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_PASSWORD_WEAK"
  }
}
```

> **Note:** The `rejected` field is intentionally omitted for password fields to
> avoid exposing sensitive data.

---

### ERR_VALIDATION_FIELD_REQUIRED

- **HTTP Status:** 400 Bad Request
- **Meaning:** One or more required fields are missing from the request body.
- **Common causes:** Client omitted a required field, sent `null` or empty
  string for a required field, or a nested object is missing a required
  property.
- **Resolution:** Check the API documentation for the endpoint to see which
  fields are required. Ensure all required fields are present and non-empty.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_FIELD_REQUIRED",
    "message": "A required field is missing.",
    "requestId": "req_c3d4e5f6g7",
    "locale": "en",
    "details": [
      {
        "field": "username",
        "message": "Username is required and cannot be empty.",
        "rejected": "",
        "constraint": "required"
      }
    ],
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_FIELD_REQUIRED"
  }
}
```

---

### ERR_VALIDATION_FIELD_TYPE

- **HTTP Status:** 400 Bad Request
- **Meaning:** A field value has an incorrect data type.
- **Common causes:** String sent where a number is expected, number sent where a
  boolean is expected, or array sent where an object is expected.
- **Resolution:** Check the API documentation for the expected type of each
  field. Ensure values match the documented types.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_FIELD_TYPE",
    "message": "Field value has an incorrect type.",
    "requestId": "req_d4e5f6g7h8",
    "locale": "en",
    "details": [
      {
        "field": "quantity",
        "message": "Expected a number, received a string.",
        "rejected": "five",
        "constraint": "type:number"
      }
    ],
    "target": "POST /api/v1/orders",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_FIELD_TYPE"
  }
}
```

---

### ERR_VALIDATION_BODY_MALFORMED

- **HTTP Status:** 400 Bad Request
- **Meaning:** The request body could not be parsed as valid JSON.
- **Common causes:** Syntax error in JSON (trailing comma, unquoted key, single
  quotes instead of double quotes), empty body when JSON is expected, or wrong
  `Content-Type` header.
- **Resolution:** Validate your JSON before sending. Use
  `Content-Type: application/json`. Tools like `jq` or online JSON validators
  can help identify syntax issues.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_BODY_MALFORMED",
    "message": "The request body could not be parsed. Please send valid JSON.",
    "requestId": "req_e5f6g7h8i9",
    "locale": "en",
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_BODY_MALFORMED"
  }
}
```

---

### ERR_VALIDATION_DATE_RANGE

- **HTTP Status:** 400 Bad Request
- **Meaning:** A date or date range field contains an invalid value.
- **Common causes:** Start date is after end date, date is in the future when a
  past date is required, or date format doesn't match ISO 8601.
- **Resolution:** Ensure dates are in ISO 8601 format (`YYYY-MM-DD`). Check that
  start dates precede end dates and that dates fall within the allowed range.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_DATE_RANGE",
    "message": "The date range is invalid.",
    "requestId": "req_f6g7h8i9j0",
    "locale": "en",
    "details": [
      {
        "field": "profile.birthDate",
        "message": "Birth date cannot be in the future.",
        "rejected": "2099-01-01",
        "constraint": "date:past"
      }
    ],
    "target": "PATCH /api/v1/users/me/profile",
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_DATE_RANGE"
  }
}
```

---

### ERR_AUTH_TOKEN_MISSING

- **HTTP Status:** 401 Unauthorized
- **Meaning:** The request does not include an authentication token.
- **Common causes:** `Authorization` header is missing, cookie-based auth token
  is absent, or the client forgot to include credentials after a fresh install.
- **Resolution:** Include a valid bearer token in the `Authorization` header:
  `Authorization: Bearer <token>`. Obtain a token via `POST /api/v1/auth/login`
  or `POST /api/v1/auth/refresh`.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_AUTH_TOKEN_MISSING",
    "message": "Authentication is required. Please sign in.",
    "requestId": "req_g7h8i9j0k1",
    "locale": "en",
    "target": "GET /api/v1/users/me",
    "docUrl": "https://docs.example.com/errors/ERR_AUTH_TOKEN_MISSING"
  }
}
```

---

### ERR_AUTH_TOKEN_EXPIRED

- **HTTP Status:** 401 Unauthorized
- **Meaning:** The authentication token has passed its expiration time.
- **Common causes:** Access token TTL exceeded (typically 15-60 minutes), user's
  session timed out, or the client cached a stale token.
- **Resolution:** Use the refresh token to obtain a new access token via
  `POST /api/v1/auth/refresh`. If the refresh token is also expired, the user
  must sign in again via `POST /api/v1/auth/login`.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_AUTH_TOKEN_EXPIRED",
    "message": "Your authentication token has expired. Please sign in again.",
    "requestId": "req_h8i9j0k1l2",
    "locale": "en",
    "target": "GET /api/v1/users/me",
    "docUrl": "https://docs.example.com/errors/ERR_AUTH_TOKEN_EXPIRED"
  }
}
```

---

### ERR_AUTH_TOKEN_INVALID

- **HTTP Status:** 401 Unauthorized
- **Meaning:** The authentication token is malformed, has an invalid signature,
  or has been revoked.
- **Common causes:** Token was tampered with, signed with a different secret,
  truncated during copy-paste, or explicitly revoked by the server (e.g., after
  password change).
- **Resolution:** Obtain a fresh token via `POST /api/v1/auth/login`. If the
  issue persists, ensure you're using the correct API environment (production
  vs. staging tokens are not interchangeable).
- **Example response:**

```json
{
  "error": {
    "code": "ERR_AUTH_TOKEN_INVALID",
    "message": "The authentication token is invalid. Please sign in again.",
    "requestId": "req_i9j0k1l2m3",
    "locale": "en",
    "target": "GET /api/v1/users/me",
    "docUrl": "https://docs.example.com/errors/ERR_AUTH_TOKEN_INVALID"
  }
}
```

---

### ERR_FORBIDDEN_ADMIN_ONLY

- **HTTP Status:** 403 Forbidden
- **Meaning:** The authenticated user does not have administrator privileges
  required for this action.
- **Common causes:** Regular user attempting to access admin endpoints (user
  management, system configuration, audit logs).
- **Resolution:** This action requires an account with the `admin` role. Contact
  your organization administrator to request elevated permissions.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_FORBIDDEN_ADMIN_ONLY",
    "message": "This action requires administrator privileges.",
    "requestId": "req_j0k1l2m3n4",
    "locale": "en",
    "target": "DELETE /api/v1/admin/users/usr_789",
    "docUrl": "https://docs.example.com/errors/ERR_FORBIDDEN_ADMIN_ONLY"
  }
}
```

---

### ERR_FORBIDDEN_RESOURCE_OWNER

- **HTTP Status:** 403 Forbidden
- **Meaning:** The authenticated user is not the owner of the resource they are
  trying to modify.
- **Common causes:** User attempting to edit, delete, or update another user's
  resource (profile, post, order).
- **Resolution:** You can only modify resources that belong to your account.
  Verify you are using the correct resource ID.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_FORBIDDEN_RESOURCE_OWNER",
    "message": "You do not have permission to modify this resource.",
    "requestId": "req_k1l2m3n4o5",
    "locale": "en",
    "target": "PATCH /api/v1/posts/post_456",
    "docUrl": "https://docs.example.com/errors/ERR_FORBIDDEN_RESOURCE_OWNER"
  }
}
```

---

### ERR_NOT_FOUND_USER

- **HTTP Status:** 404 Not Found
- **Meaning:** The requested user does not exist, or the caller does not have
  permission to view it.
- **Common causes:** Typo in user ID, user account was deleted, or the caller
  lacks access (404 is returned instead of 403 to avoid leaking existence).
- **Resolution:** Verify the user ID is correct. If you believe the user exists,
  check that your account has the necessary permissions. Use
  `GET /api/v1/users?search=<query>` to find users.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_NOT_FOUND_USER",
    "message": "The requested user was not found.",
    "requestId": "req_l2m3n4o5p6",
    "locale": "en",
    "target": "GET /api/v1/users/usr_nonexistent",
    "docUrl": "https://docs.example.com/errors/ERR_NOT_FOUND_USER"
  }
}
```

---

### ERR_NOT_FOUND_RESOURCE

- **HTTP Status:** 404 Not Found
- **Meaning:** The requested resource does not exist.
- **Common causes:** Invalid resource ID, resource was deleted, or the URL path
  is incorrect.
- **Resolution:** Verify the resource ID and endpoint URL. Check the API
  documentation for the correct path format.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_NOT_FOUND_RESOURCE",
    "message": "The requested resource was not found.",
    "requestId": "req_m3n4o5p6q7",
    "locale": "en",
    "target": "GET /api/v1/orders/ord_nonexistent",
    "docUrl": "https://docs.example.com/errors/ERR_NOT_FOUND_RESOURCE"
  }
}
```

---

### ERR_CONFLICT_USERNAME_TAKEN

- **HTTP Status:** 409 Conflict
- **Meaning:** The requested username is already registered by another account.
- **Common causes:** User submitted a registration form with a username that
  already exists in the system.
- **Resolution:** Choose a different username. You can check availability before
  registration via `GET /api/v1/users/check-username?username=<desired>`.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_CONFLICT_USERNAME_TAKEN",
    "message": "This username is already in use.",
    "requestId": "req_n4o5p6q7r8",
    "locale": "en",
    "target": "POST /api/v1/users",
    "docUrl": "https://docs.example.com/errors/ERR_CONFLICT_USERNAME_TAKEN"
  }
}
```

---

### ERR_RATE_LIMIT_API

- **HTTP Status:** 429 Too Many Requests
- **Meaning:** The client has exceeded the allowed number of API requests within
  the rate limit window.
- **Common causes:** Automated scripts without rate limiting, polling too
  frequently, or burst traffic from the client.
- **Resolution:** Wait for the number of seconds specified in the `Retry-After`
  header (also available as `retryAfter` in the response body). Implement
  exponential backoff in your client. Check `X-RateLimit-Limit` and
  `X-RateLimit-Remaining` headers to monitor your usage proactively.
- **Rate limit policy:**
  - **Default:** 100 requests per minute per API key
  - **Authenticated:** 1000 requests per minute per user
  - **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
    `X-RateLimit-Reset`
- **Example response:**

```json
{
  "error": {
    "code": "ERR_RATE_LIMIT_API",
    "message": "Too many requests. Please retry after 42 seconds.",
    "requestId": "req_o5p6q7r8s9",
    "locale": "en",
    "retryAfter": 42,
    "target": "GET /api/v1/products",
    "docUrl": "https://docs.example.com/errors/ERR_RATE_LIMIT_API"
  }
}
```

> **Important:** The `Retry-After` HTTP header is always present on 429
> responses. Clients must respect this value to avoid being temporarily blocked.

---

### ERR_INTERNAL_DB_CONNECTION

- **HTTP Status:** 500 Internal Server Error
- **Meaning:** The server failed to connect to the database. This is an
  infrastructure issue, not a client error.
- **Common causes:** Database server is down, network partition, connection pool
  exhausted, or misconfigured credentials (all internal — never exposed to
  clients).
- **Resolution (for API consumers):** This is a server-side issue. Retry the
  request after a short delay (30-60 seconds). If the error persists, contact
  support with the `requestId` from the response.
- **Resolution (for operators):** Check database connectivity, connection pool
  metrics, and database server health. The full error details are in the
  structured logs under the `requestId`.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_INTERNAL_UNHANDLED",
    "message": "An unexpected error occurred. Please try again later.",
    "requestId": "req_p6q7r8s9t0",
    "locale": "en",
    "target": "POST /api/v1/orders",
    "docUrl": "https://docs.example.com/errors/ERR_INTERNAL_UNHANDLED"
  }
}
```

> **Note:** The response uses `ERR_INTERNAL_UNHANDLED` as the code and a generic
> message. The actual `ERR_INTERNAL_DB_CONNECTION` code and real error message
> are logged internally only. This prevents leaking infrastructure details to
> clients.

---

### ERR_INTERNAL_UNHANDLED

- **HTTP Status:** 500 Internal Server Error
- **Meaning:** An unexpected, unhandled exception occurred on the server.
- **Common causes:** Programming error (null reference, assertion failure,
  unhandled promise rejection), unexpected data state, or third-party service
  failure.
- **Resolution (for API consumers):** This is a server-side issue. Retry the
  request after a short delay. If the error persists, contact support with the
  `requestId` from the response.
- **Resolution (for operators):** Search structured logs for the `requestId` to
  find the full stack trace and root cause. These errors trigger on-call alerts
  automatically because `isOperational` is `false`.
- **Example response:**

```json
{
  "error": {
    "code": "ERR_INTERNAL_UNHANDLED",
    "message": "An unexpected error occurred. Please try again later.",
    "requestId": "req_q7r8s9t0u1",
    "locale": "en",
    "target": "PATCH /api/v1/settings",
    "docUrl": "https://docs.example.com/errors/ERR_INTERNAL_UNHANDLED"
  }
}
```

---

## 11. Error Response Checklist

Use this checklist to verify every error response from the API:

- [x] Response body follows the JSON schema (`code`, `message`, `requestId`
      always present)
- [x] `code` uses the `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]` format
- [x] `message` is human-readable and user-safe (no stack traces, SQL, or
      internal paths)
- [x] Validation errors (400) include `details` array with field-level info
      (`field`, `message`)
- [x] Sensitive fields (passwords, tokens) omit the `rejected` value in
      `details`
- [x] 429 responses include `Retry-After` HTTP header and `retryAfter` in the
      body
- [x] No stack traces, SQL queries, file paths, or internal identifiers in the
      response body
- [x] `requestId` matches the `X-Request-Id` response header
- [x] Non-operational errors (500) return generic message, not the real error
      message
- [x] Original error preserved via `cause` in structured logs (never in
      response)
- [x] `docUrl` points to the error reference documentation for the specific
      error code
- [x] `locale` field reflects the language used for messages (from
      `Accept-Language` header)
- [x] 404 is used instead of 403 when resource existence should not be leaked

## 12. Error Subclass Decision Tree

```
Is the request body unparseable?
  → ERR_VALIDATION_BODY_MALFORMED (400)

Is the request malformed or violates business rules?
  → ValidationError (400) with field-level details in `details` array

Is the caller not authenticated?
  → AuthenticationError (401)
    - No token? → ERR_AUTH_TOKEN_MISSING
    - Token expired? → ERR_AUTH_TOKEN_EXPIRED
    - Token invalid/revoked? → ERR_AUTH_TOKEN_INVALID

Is the caller authenticated but lacks permission?
  → ForbiddenError (403)
    - Or use NotFoundError (404) to hide resource existence

Does the target resource not exist?
  → NotFoundError (404)

Does the request conflict with current state?
  → ConflictError (409)

Has the caller exceeded rate limits?
  → RateLimitError (429) with retryAfter and Retry-After header

Is this an unexpected failure / bug?
  → InternalError (500) with isOperational: false
    - Generic message to client
    - Real error in structured logs
    - On-call alert triggered
```

---

## 13. Common Mistakes

| Mistake                                                  | Why it's wrong                                                                                               | Fix                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Returning raw exception messages to clients              | Leaks internals (SQL queries, file paths, stack traces). Security risk and confusing for users.              | Always use `isOperational` check — non-operational errors get a generic message.      |
| Using HTTP status codes as error codes                   | Too coarse — 400 covers dozens of distinct errors. Clients can't distinguish validation from malformed JSON. | Use stable string codes (`ERR_VALIDATION_EMAIL_FORMAT`) alongside HTTP status.        |
| Swallowing the original error when wrapping              | Destroys the root cause. Debugging becomes guesswork.                                                        | Always pass `cause` when wrapping. Use `from` in Python.                              |
| Inconsistent error response shapes across endpoints      | Clients need a different parser per endpoint. Breaks SDK generation.                                         | Use one centralized error handler that formats all errors identically.                |
| Logging errors without a correlation ID                  | Can't trace a user-reported error back through distributed services.                                         | Generate `requestId` in middleware, attach to every log line and error response.      |
| Making `InternalError` operational                       | Bugs get swallowed silently instead of triggering alerts.                                                    | `InternalError` must always have `isOperational: false`.                              |
| Returning 403 for resources that don't exist             | Confirms the resource exists to unauthorized users (information leakage).                                    | Return 404 for resources the caller can't access, unless existence is already public. |
| Omitting `Retry-After` on 429 responses                  | Clients have no idea when to retry, leading to thundering herd retries.                                      | Always include `Retry-After` header with seconds until the limit resets.              |
| Putting field validation errors in the top-level message | Client can't highlight specific form fields. User sees a wall of text.                                       | Use `details` array with per-field `field`, `message`, and optional `rejected`.       |
| Renaming error codes after they ship                     | Breaks client error handling that switches on code strings.                                                  | Error codes are immutable once released. Add new codes, deprecate old ones.           |
| Exposing `rejected` values for sensitive fields          | Leaks passwords, tokens, or secrets in error responses.                                                      | Omit `rejected` for any field containing sensitive data.                              |
| Not including `docUrl` in error responses                | Developers must search documentation manually to understand errors.                                          | Auto-generate `docUrl` from the error code in the centralized error handler.          |

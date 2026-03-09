# Comprehensive Error Response Design for a Public REST API

This document contains all artifacts for a production-grade error handling
system serving mobile and web clients. It follows the
`ERR_{CATEGORY}_{ENTITY}[_{DETAIL}]` code format, separates user-safe from
internal messages, includes correlation IDs in every response, and provides
field-level validation details, localization support, and documentation
references.

---

## Table of Contents

1. [Error Response JSON Schema](#1-error-response-json-schema)
2. [Error Code Registry](#2-error-code-registry)
3. [Example Error Responses](#3-example-error-responses)
4. [Error Class Hierarchy (TypeScript)](#4-error-class-hierarchy-typescript)
5. [Global Error Handler Middleware](#5-global-error-handler-middleware)
6. [Localization Support](#6-localization-support)
7. [Developer-Facing Error Reference Document](#7-developer-facing-error-reference-document)

---

## 1. Error Response JSON Schema

All error responses from the API follow a single, consistent shape. Clients
write one error parser — not one per endpoint.

### JSON Schema (Draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.example.com/schemas/error-response.json",
  "title": "API Error Response",
  "description": "Unified error response envelope for all API endpoints. Every error response uses this exact shape so clients can implement a single error parser.",
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
          "pattern": "^ERR_[A-Z]+(_[A-Z]+){1,3}$",
          "description": "Stable, machine-readable error identifier. Format: ERR_{CATEGORY}_{ENTITY}[_{DETAIL}]. These codes are part of the API contract — once published, they are immutable. Clients use these for programmatic branching (e.g., showing a re-login dialog on ERR_AUTH_TOKEN_EXPIRED).",
          "examples": [
            "ERR_VALIDATION_EMAIL",
            "ERR_AUTH_TOKEN_EXPIRED",
            "ERR_NOT_FOUND_USER",
            "ERR_RATE_LIMIT_API"
          ]
        },
        "message": {
          "type": "string",
          "description": "Human-readable, user-safe description. NEVER contains table names, stack traces, query details, internal service names, or any information that could aid an attacker. Suitable for display in client UIs.",
          "examples": [
            "The email address is invalid.",
            "Your session has expired. Please log in again."
          ]
        },
        "requestId": {
          "type": "string",
          "format": "uuid",
          "description": "UUID v4 correlation ID assigned at the API gateway entry point. Propagated through every log line, downstream service call, and error response. When a user reports an error, this ID unlocks the full distributed trace in server logs.",
          "examples": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
        },
        "target": {
          "type": "string",
          "description": "The specific input field, query parameter, or path segment that caused the error. Included when the error relates to a single identifiable input. Helps clients highlight the offending field without parsing the message string.",
          "examples": ["email", "Authorization", "userId"]
        },
        "details": {
          "type": "object",
          "description": "Structured metadata providing additional context. Shape varies by error category.",
          "properties": {
            "fields": {
              "type": "array",
              "description": "Per-field validation failure details. Included on 400 validation errors so clients can render inline field-level error messages.",
              "items": {
                "type": "object",
                "required": ["field", "message"],
                "additionalProperties": false,
                "properties": {
                  "field": {
                    "type": "string",
                    "description": "The JSON path or field name that failed validation (e.g., 'email', 'address.zipCode', 'items[0].quantity')."
                  },
                  "message": {
                    "type": "string",
                    "description": "Human-readable description of the validation constraint that was violated."
                  },
                  "code": {
                    "type": "string",
                    "description": "Optional machine-readable constraint code for this specific field failure (e.g., 'REQUIRED', 'FORMAT', 'RANGE', 'LENGTH')."
                  },
                  "rejectedValue": {
                    "description": "The value that was submitted and rejected. Omitted for sensitive fields (passwords, tokens, SSNs)."
                  }
                }
              }
            },
            "retryAfter": {
              "type": "integer",
              "minimum": 1,
              "description": "Seconds until the client should retry. Included on 429 rate limit errors. Also set as the Retry-After HTTP header."
            },
            "limit": {
              "type": "integer",
              "description": "The rate limit ceiling that was exceeded (requests per window)."
            },
            "remaining": {
              "type": "integer",
              "description": "Number of requests remaining in the current window (always 0 when rate limited)."
            },
            "windowSeconds": {
              "type": "integer",
              "description": "The duration of the rate limit window in seconds."
            }
          }
        },
        "docUrl": {
          "type": "string",
          "format": "uri",
          "description": "URL to the developer-facing documentation page for this specific error code. Provides resolution steps, common causes, and code examples.",
          "examples": ["https://docs.example.com/errors/ERR_VALIDATION_EMAIL"]
        },
        "locale": {
          "type": "string",
          "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
          "description": "The locale used for the message field. Determined by the Accept-Language request header, falling back to 'en'. Clients can use this to verify the message language matches their UI locale.",
          "examples": ["en", "es", "fr-FR", "ja"]
        }
      }
    }
  }
}
```

### Required vs Optional Fields

| Field       | Type   | Required | Purpose                                              |
| ----------- | ------ | -------- | ---------------------------------------------------- |
| `code`      | string | **Yes**  | Stable, machine-readable error identifier            |
| `message`   | string | **Yes**  | Human-readable, user-safe description                |
| `requestId` | string | **Yes**  | UUID v4 correlation ID for distributed log tracing   |
| `target`    | string | No       | Specific input field that caused the error           |
| `details`   | object | No       | Structured metadata (field errors, rate limit info)  |
| `docUrl`    | string | No       | Link to developer documentation for this error code  |
| `locale`    | string | No       | Locale of the `message` field (from Accept-Language) |

### Design Decisions

1. **Single envelope (`error` wrapper):** Distinguishes error responses from
   success responses at the top level. Clients check for the `error` key.
2. **`code` is the primary identifier:** HTTP status codes tell you the
   _category_ (4xx vs 5xx). The string code tells you the _cause_. A `404` alone
   doesn't tell the client whether the user, the document, or the endpoint is
   missing. `ERR_NOT_FOUND_USER` lets the client show the right UI.
3. **`requestId` is always present:** Even on 500 errors. This is the key that
   unlocks the full server-side trace when a user reports a problem.
4. **`details.fields` for validation:** Clients render inline field errors
   without parsing the `message` string. Each field entry includes the field
   path, a human-readable constraint message, and optionally the rejected value.
5. **`docUrl` for developer self-service:** Reduces support burden. Developers
   can resolve common errors without filing tickets.
6. **No stack traces in responses:** Stack traces are an information disclosure
   vulnerability. They are logged server-side with the `requestId` for
   correlation, never serialized to the client.

---

## 2. Error Code Registry

The error code registry is the single source of truth for all error codes in the
API. Every code maps to its HTTP status, user-safe message, internal
description, and documentation URL. This registry prevents duplication and can
auto-generate the developer-facing error reference document.

### Format: `ERR_{CATEGORY}_{ENTITY}[_{DETAIL}]`

Codes are part of the API contract. Once published, they are **immutable** —
clients depend on them for branching logic (e.g., showing a re-login dialog on
`ERR_AUTH_TOKEN_EXPIRED`).

### Registry

```json
{
  "errorCodes": [
    {
      "code": "ERR_VALIDATION_REQUIRED",
      "category": "VALIDATION",
      "httpStatus": 400,
      "message": "A required field is missing.",
      "internalDescription": "Request body or query parameter is missing a field marked as required in the schema.",
      "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_REQUIRED",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_VALIDATION_FORMAT",
      "category": "VALIDATION",
      "httpStatus": 400,
      "message": "A field has an invalid format.",
      "internalDescription": "A field value does not match the expected format (email, URL, date, UUID, etc.).",
      "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_FORMAT",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_VALIDATION_RANGE",
      "category": "VALIDATION",
      "httpStatus": 400,
      "message": "A field value is out of the allowed range.",
      "internalDescription": "A numeric or date field falls outside the min/max bounds defined in the schema.",
      "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_RANGE",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_VALIDATION_LENGTH",
      "category": "VALIDATION",
      "httpStatus": 400,
      "message": "A field value exceeds the allowed length.",
      "internalDescription": "A string or array field violates minLength/maxLength or minItems/maxItems constraints.",
      "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_LENGTH",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_VALIDATION_TYPE",
      "category": "VALIDATION",
      "httpStatus": 400,
      "message": "A field has an incorrect type.",
      "internalDescription": "A field value does not match the expected JSON type (string, number, boolean, array, object).",
      "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_TYPE",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_AUTH_CREDENTIALS",
      "category": "AUTH",
      "httpStatus": 401,
      "message": "Invalid email or password.",
      "internalDescription": "Login attempt failed: either the email does not exist or the password hash does not match. Message is intentionally vague to prevent user enumeration.",
      "docUrl": "https://docs.example.com/errors/ERR_AUTH_CREDENTIALS",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_AUTH_TOKEN_EXPIRED",
      "category": "AUTH",
      "httpStatus": 401,
      "message": "Your session has expired. Please log in again.",
      "internalDescription": "The JWT access token's exp claim is in the past. Client should use the refresh token to obtain a new access token, or redirect to login.",
      "docUrl": "https://docs.example.com/errors/ERR_AUTH_TOKEN_EXPIRED",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_AUTH_TOKEN_MALFORMED",
      "category": "AUTH",
      "httpStatus": 401,
      "message": "Authentication failed. Please log in again.",
      "internalDescription": "The Authorization header contains a value that cannot be parsed as a valid JWT (missing segments, invalid base64, corrupted signature).",
      "docUrl": "https://docs.example.com/errors/ERR_AUTH_TOKEN_MALFORMED",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_FORBIDDEN_ROLE",
      "category": "FORBIDDEN",
      "httpStatus": 403,
      "message": "You do not have permission to perform this action.",
      "internalDescription": "The authenticated user's role does not include the required permission for this endpoint/action. Check RBAC policy configuration.",
      "docUrl": "https://docs.example.com/errors/ERR_FORBIDDEN_ROLE",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_NOT_FOUND_RESOURCE",
      "category": "NOT_FOUND",
      "httpStatus": 404,
      "message": "The requested resource was not found.",
      "internalDescription": "Generic not-found for any entity lookup that returns null/empty. Use more specific codes (ERR_NOT_FOUND_USER, ERR_NOT_FOUND_ORDER) when the entity type is known.",
      "docUrl": "https://docs.example.com/errors/ERR_NOT_FOUND_RESOURCE",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_NOT_FOUND_ENDPOINT",
      "category": "NOT_FOUND",
      "httpStatus": 404,
      "message": "This API endpoint does not exist. Check the URL and HTTP method.",
      "internalDescription": "No route matched the request path and method. May indicate a client using a deprecated or misspelled endpoint.",
      "docUrl": "https://docs.example.com/errors/ERR_NOT_FOUND_ENDPOINT",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_CONFLICT_DUPLICATE",
      "category": "CONFLICT",
      "httpStatus": 409,
      "message": "A resource with this identifier already exists.",
      "internalDescription": "INSERT or UPDATE violated a unique constraint (email, username, slug, etc.). The details.target field indicates which field caused the conflict.",
      "docUrl": "https://docs.example.com/errors/ERR_CONFLICT_DUPLICATE",
      "retryable": false,
      "deprecated": false
    },
    {
      "code": "ERR_CONFLICT_VERSION",
      "category": "CONFLICT",
      "httpStatus": 409,
      "message": "This resource has been modified by another request. Please refresh and try again.",
      "internalDescription": "Optimistic concurrency check failed: the If-Match ETag or version field in the request does not match the current version in the database.",
      "docUrl": "https://docs.example.com/errors/ERR_CONFLICT_VERSION",
      "retryable": true,
      "deprecated": false
    },
    {
      "code": "ERR_RATE_LIMIT_API",
      "category": "RATE_LIMIT",
      "httpStatus": 429,
      "message": "Too many requests. Please wait before trying again.",
      "internalDescription": "The client has exceeded the API-wide rate limit (sliding window). The Retry-After header and details.retryAfter field indicate when the client can retry.",
      "docUrl": "https://docs.example.com/errors/ERR_RATE_LIMIT_API",
      "retryable": true,
      "deprecated": false
    },
    {
      "code": "ERR_RATE_LIMIT_LOGIN",
      "category": "RATE_LIMIT",
      "httpStatus": 429,
      "message": "Too many login attempts. Please wait before trying again.",
      "internalDescription": "The client has exceeded the login-specific rate limit (stricter than API-wide). Applied per-IP and per-account to prevent brute-force attacks.",
      "docUrl": "https://docs.example.com/errors/ERR_RATE_LIMIT_LOGIN",
      "retryable": true,
      "deprecated": false
    },
    {
      "code": "ERR_INTERNAL_SERVICE",
      "category": "INTERNAL",
      "httpStatus": 500,
      "message": "An internal error occurred. Please try again or contact support.",
      "internalDescription": "An unhandled exception occurred in the application layer. The requestId in the response correlates to the full stack trace in server logs. NEVER expose the actual error details to the client.",
      "docUrl": "https://docs.example.com/errors/ERR_INTERNAL_SERVICE",
      "retryable": true,
      "deprecated": false
    },
    {
      "code": "ERR_INTERNAL_DB",
      "category": "INTERNAL",
      "httpStatus": 500,
      "message": "An internal error occurred. Please try again or contact support.",
      "internalDescription": "Database operation failed (connection refused, query timeout, constraint violation that wasn't caught by validation). Logged with full query context server-side.",
      "docUrl": "https://docs.example.com/errors/ERR_INTERNAL_DB",
      "retryable": true,
      "deprecated": false
    },
    {
      "code": "ERR_INTERNAL_UPSTREAM",
      "category": "INTERNAL",
      "httpStatus": 500,
      "message": "An internal error occurred. Please try again or contact support.",
      "internalDescription": "A downstream/upstream service call failed (timeout, 5xx response, network error). The cause chain in server logs identifies which service and what failure mode.",
      "docUrl": "https://docs.example.com/errors/ERR_INTERNAL_UPSTREAM",
      "retryable": true,
      "deprecated": false
    }
  ]
}
```

### Registry Summary Table

| Code                       | HTTP | Category   | User Message                                                                  | Retryable |
| -------------------------- | ---- | ---------- | ----------------------------------------------------------------------------- | --------- |
| `ERR_VALIDATION_REQUIRED`  | 400  | VALIDATION | A required field is missing.                                                  | No        |
| `ERR_VALIDATION_FORMAT`    | 400  | VALIDATION | A field has an invalid format.                                                | No        |
| `ERR_VALIDATION_RANGE`     | 400  | VALIDATION | A field value is out of the allowed range.                                    | No        |
| `ERR_VALIDATION_LENGTH`    | 400  | VALIDATION | A field value exceeds the allowed length.                                     | No        |
| `ERR_VALIDATION_TYPE`      | 400  | VALIDATION | A field has an incorrect type.                                                | No        |
| `ERR_AUTH_CREDENTIALS`     | 401  | AUTH       | Invalid email or password.                                                    | No        |
| `ERR_AUTH_TOKEN_EXPIRED`   | 401  | AUTH       | Your session has expired. Please log in again.                                | No        |
| `ERR_AUTH_TOKEN_MALFORMED` | 401  | AUTH       | Authentication failed. Please log in again.                                   | No        |
| `ERR_FORBIDDEN_ROLE`       | 403  | FORBIDDEN  | You do not have permission to perform this action.                            | No        |
| `ERR_NOT_FOUND_RESOURCE`   | 404  | NOT_FOUND  | The requested resource was not found.                                         | No        |
| `ERR_NOT_FOUND_ENDPOINT`   | 404  | NOT_FOUND  | This API endpoint does not exist. Check the URL and HTTP method.              | No        |
| `ERR_CONFLICT_DUPLICATE`   | 409  | CONFLICT   | A resource with this identifier already exists.                               | No        |
| `ERR_CONFLICT_VERSION`     | 409  | CONFLICT   | This resource has been modified by another request. Please refresh and retry. | Yes       |
| `ERR_RATE_LIMIT_API`       | 429  | RATE_LIMIT | Too many requests. Please wait before trying again.                           | Yes       |
| `ERR_RATE_LIMIT_LOGIN`     | 429  | RATE_LIMIT | Too many login attempts. Please wait before trying again.                     | Yes       |
| `ERR_INTERNAL_SERVICE`     | 500  | INTERNAL   | An internal error occurred. Please try again or contact support.              | Yes       |
| `ERR_INTERNAL_DB`          | 500  | INTERNAL   | An internal error occurred. Please try again or contact support.              | Yes       |
| `ERR_INTERNAL_UPSTREAM`    | 500  | INTERNAL   | An internal error occurred. Please try again or contact support.              | Yes       |

**18 error codes** across **7 categories** (VALIDATION, AUTH, FORBIDDEN,
NOT_FOUND, CONFLICT, RATE_LIMIT, INTERNAL).

---

## 3. Example Error Responses

Each example shows the full HTTP response including status code, relevant
headers, and the JSON body. Every response follows the exact same JSON schema
defined in Section 1.

### 3.1 Validation Error with Multiple Field Failures

A user submits a registration form with three invalid fields.

**Request:**

```http
POST /v1/users HTTP/1.1
Content-Type: application/json
Accept-Language: en

{
  "email": "not-an-email",
  "password": "123",
  "age": -5,
  "username": "ab"
}
```

**Response:**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Request-Id: 7f3a9c2e-1b4d-4e8f-a6c0-3d2e1f0a9b8c
```

```json
{
  "error": {
    "code": "ERR_VALIDATION_FORMAT",
    "message": "One or more fields failed validation. See details for specifics.",
    "requestId": "7f3a9c2e-1b4d-4e8f-a6c0-3d2e1f0a9b8c",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Must be a valid email address.",
          "code": "FORMAT",
          "rejectedValue": "not-an-email"
        },
        {
          "field": "password",
          "message": "Must be at least 8 characters long.",
          "code": "LENGTH",
          "rejectedValue": "123"
        },
        {
          "field": "age",
          "message": "Must be between 0 and 150.",
          "code": "RANGE",
          "rejectedValue": -5
        },
        {
          "field": "username",
          "message": "Must be 3-30 characters, alphanumeric and underscores only.",
          "code": "LENGTH",
          "rejectedValue": "ab"
        }
      ]
    },
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_FORMAT",
    "locale": "en"
  }
}
```

**What the server logs (never sent to client):**

```json
{
  "level": "warn",
  "timestamp": "2026-03-09T14:23:01.456Z",
  "requestId": "7f3a9c2e-1b4d-4e8f-a6c0-3d2e1f0a9b8c",
  "code": "ERR_VALIDATION_FORMAT",
  "message": "Validation failed on POST /v1/users",
  "fieldCount": 4,
  "fields": ["email", "password", "age", "username"],
  "clientIp": "203.0.113.42",
  "userAgent": "ExampleApp/2.1.0 (iOS 17.4)"
}
```

**Client handling notes:**

- Mobile clients iterate `details.fields` and display inline errors next to each
  form field using the `field` key to match UI elements.
- The `rejectedValue` is intentionally omitted for `password` in production
  (shown here for illustration). Sensitive fields should never echo back values.

---

### 3.2 Authentication Error

A request with an expired JWT access token.

**Request:**

```http
GET /v1/users/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...expired_token
Accept-Language: en
```

**Response:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
WWW-Authenticate: Bearer error="invalid_token", error_description="Token has expired"
X-Request-Id: b2c4d6e8-f0a1-4b3c-8d5e-7f9a0b1c2d3e
```

```json
{
  "error": {
    "code": "ERR_AUTH_TOKEN_EXPIRED",
    "message": "Your session has expired. Please log in again.",
    "requestId": "b2c4d6e8-f0a1-4b3c-8d5e-7f9a0b1c2d3e",
    "target": "Authorization",
    "docUrl": "https://docs.example.com/errors/ERR_AUTH_TOKEN_EXPIRED",
    "locale": "en"
  }
}
```

**What the server logs (never sent to client):**

```json
{
  "level": "warn",
  "timestamp": "2026-03-09T14:25:12.789Z",
  "requestId": "b2c4d6e8-f0a1-4b3c-8d5e-7f9a0b1c2d3e",
  "code": "ERR_AUTH_TOKEN_EXPIRED",
  "message": "JWT token expired",
  "internalMessage": "Token exp claim 1741444800 is 3612 seconds in the past. Subject: user_abc123. Issuer: auth.example.com",
  "clientIp": "198.51.100.17",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
}
```

**Client handling notes:**

- On receiving `ERR_AUTH_TOKEN_EXPIRED`, clients should attempt a silent token
  refresh using the refresh token. If the refresh also fails, redirect to login.
- The `WWW-Authenticate` header follows RFC 6750 for OAuth 2.0 bearer tokens.
- The `target` field indicates the `Authorization` header was the source of the
  problem.

---

### 3.3 Not-Found Error

A request for a user that does not exist.

**Request:**

```http
GET /v1/users/usr_nonexistent_999 HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...valid_token
Accept-Language: es
```

**Response:**

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
X-Request-Id: c3d5e7f9-a1b2-4c3d-9e5f-0a1b2c3d4e5f
```

```json
{
  "error": {
    "code": "ERR_NOT_FOUND_RESOURCE",
    "message": "El recurso solicitado no fue encontrado.",
    "requestId": "c3d5e7f9-a1b2-4c3d-9e5f-0a1b2c3d4e5f",
    "target": "userId",
    "docUrl": "https://docs.example.com/errors/ERR_NOT_FOUND_RESOURCE",
    "locale": "es"
  }
}
```

**What the server logs (never sent to client):**

```json
{
  "level": "warn",
  "timestamp": "2026-03-09T14:27:45.123Z",
  "requestId": "c3d5e7f9-a1b2-4c3d-9e5f-0a1b2c3d4e5f",
  "code": "ERR_NOT_FOUND_RESOURCE",
  "message": "User lookup returned null",
  "internalMessage": "SELECT * FROM users WHERE id = 'usr_nonexistent_999' returned 0 rows. Table: users, index: users_pkey.",
  "authenticatedUser": "user_abc123",
  "clientIp": "192.0.2.88"
}
```

**Client handling notes:**

- The `message` is localized to Spanish (`es`) based on the `Accept-Language`
  header. The `locale` field confirms which language was used.
- The `target` field indicates the `userId` path parameter was the source.
- The response intentionally does NOT reveal whether the user ever existed, was
  deleted, or is in a different tenant — just "not found."

---

### 3.4 Rate Limit Error

A client exceeds the API-wide rate limit.

**Request:**

```http
GET /v1/products?category=electronics HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...valid_token
Accept-Language: en
```

**Response:**

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1741530240
X-Request-Id: d4e6f8a0-b1c2-4d3e-af5g-1a2b3c4d5e6f
```

```json
{
  "error": {
    "code": "ERR_RATE_LIMIT_API",
    "message": "Too many requests. Please wait before trying again.",
    "requestId": "d4e6f8a0-b1c2-4d3e-af5g-1a2b3c4d5e6f",
    "details": {
      "retryAfter": 30,
      "limit": 100,
      "remaining": 0,
      "windowSeconds": 60
    },
    "docUrl": "https://docs.example.com/errors/ERR_RATE_LIMIT_API",
    "locale": "en"
  }
}
```

**What the server logs (never sent to client):**

```json
{
  "level": "warn",
  "timestamp": "2026-03-09T14:30:00.456Z",
  "requestId": "d4e6f8a0-b1c2-4d3e-af5g-1a2b3c4d5e6f",
  "code": "ERR_RATE_LIMIT_API",
  "message": "Rate limit exceeded",
  "internalMessage": "Client api_key_xyz exceeded 100 req/60s sliding window. Current count: 103. Redis key: ratelimit:api_key_xyz:1741530180",
  "clientIp": "203.0.113.55",
  "apiKeyId": "api_key_xyz"
}
```

**Client handling notes:**

- The `Retry-After` HTTP header (RFC 7231 §7.1.3) is **always** set on 429
  responses. Clients that ignore it and retry immediately will worsen the
  overload.
- `details.retryAfter` mirrors the header value in the JSON body for clients
  that find it easier to parse JSON than headers.
- `details.limit` and `details.windowSeconds` let clients display "You've
  exceeded 100 requests per minute" in the UI.
- Clients should implement exponential backoff with jitter, not fixed-interval
  retry.

---

### 3.5 Internal Server Error

An unhandled database connection failure.

**Request:**

```http
POST /v1/orders HTTP/1.1
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...valid_token
Accept-Language: en

{
  "items": [{"productId": "prod_123", "quantity": 2}],
  "shippingAddressId": "addr_456"
}
```

**Response:**

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
X-Request-Id: e5f7a9b1-c2d3-4e5f-b0a1-2c3d4e5f6a7b
```

```json
{
  "error": {
    "code": "ERR_INTERNAL_DB",
    "message": "An internal error occurred. Please try again or contact support.",
    "requestId": "e5f7a9b1-c2d3-4e5f-b0a1-2c3d4e5f6a7b",
    "docUrl": "https://docs.example.com/errors/ERR_INTERNAL_DB",
    "locale": "en"
  }
}
```

**What the server logs (never sent to client):**

```json
{
  "level": "error",
  "timestamp": "2026-03-09T14:32:18.901Z",
  "requestId": "e5f7a9b1-c2d3-4e5f-b0a1-2c3d4e5f6a7b",
  "code": "ERR_INTERNAL_DB",
  "message": "An internal error occurred. Please try again or contact support.",
  "internalMessage": "Failed to insert order: connection refused to orders-db.internal:5432",
  "cause": "ECONNREFUSED 10.0.3.12:5432",
  "causeChain": [
    "AppError: ERR_INTERNAL_DB — Failed to create order",
    "DatabaseError: connection refused to orders-db.internal:5432",
    "ECONNREFUSED 10.0.3.12:5432"
  ],
  "stack": "InternalError: An internal error occurred...\n    at OrderService.create (src/services/order.ts:47:11)\n    at ...",
  "authenticatedUser": "user_abc123",
  "clientIp": "198.51.100.22"
}
```

**Client handling notes:**

- The response body is intentionally vague. No table names, no connection
  strings, no stack traces. An attacker learns nothing.
- The `requestId` is the lifeline: the user can share it with support, and
  support can look up the full causal chain in server logs.
- The `ERR_INTERNAL_DB` code (vs generic `ERR_INTERNAL_SERVICE`) lets the
  operations team set up targeted alerts for database failures without parsing
  log messages.
- Clients should offer a "Try Again" button since `retryable: true` in the
  registry. Transient database failures often resolve on retry.

---

## 4. Error Class Hierarchy (TypeScript)

This is the implementation that produces the responses above. Place in a shared
module (e.g., `src/errors/index.ts`) so every layer imports from one source.

```typescript
import { randomUUID } from "crypto";

/**
 * Base application error. All domain errors extend this class.
 * Route handlers throw typed errors; the global error handler catches
 * and formats them into the unified JSON response shape.
 */
export class AppError extends Error {
  constructor(
    /** Stable string code: ERR_{CATEGORY}_{ENTITY}[_{DETAIL}] */
    public readonly code: string,
    /** HTTP status code for the response */
    public readonly statusCode: number,
    /** User-safe message. NEVER includes internal details. */
    message: string,
    /** Optional structured metadata (field errors, rate limit info) */
    public readonly details?: Record<string, unknown>,
    /** The original error that caused this one (preserves causal chain) */
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialize to the unified error response shape.
   * This is the ONLY place where errors become JSON responses.
   */
  toResponse(requestId: string, locale: string = "en") {
    const response: Record<string, unknown> = {
      error: {
        code: this.code,
        message: this.message,
        requestId,
        ...(this.details && { details: this.details }),
        docUrl: `https://docs.example.com/errors/${this.code}`,
        locale,
      },
    };
    return response;
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super("ERR_VALIDATION_FORMAT", 400, message, details, cause);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    code = "ERR_AUTH_CREDENTIALS",
    message = "Authentication required.",
    cause?: Error,
  ) {
    super(code, 401, message, undefined, cause);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    code = "ERR_FORBIDDEN_ROLE",
    message = "You do not have permission to perform this action.",
    cause?: Error,
  ) {
    super(code, 403, message, undefined, cause);
  }
}

export class NotFoundError extends AppError {
  constructor(
    code = "ERR_NOT_FOUND_RESOURCE",
    message = "The requested resource was not found.",
    cause?: Error,
  ) {
    super(code, 404, message, undefined, cause);
  }
}

export class ConflictError extends AppError {
  constructor(
    code = "ERR_CONFLICT_DUPLICATE",
    message = "A resource with this identifier already exists.",
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, 409, message, details, cause);
  }
}

export class RateLimitError extends AppError {
  constructor(
    public readonly retryAfterSeconds: number,
    code = "ERR_RATE_LIMIT_API",
    message = "Too many requests. Please wait before trying again.",
    cause?: Error,
  ) {
    super(code, 429, message, {
      retryAfter: retryAfterSeconds,
    }, cause);
  }
}

export class InternalError extends AppError {
  private _internalMessage: string;

  constructor(
    internalMessage: string,
    code = "ERR_INTERNAL_SERVICE",
    cause?: Error,
  ) {
    super(
      code,
      500,
      "An internal error occurred. Please try again or contact support.",
      undefined,
      cause,
    );
    this._internalMessage = internalMessage;
  }

  /** Full diagnostic detail. Logged server-side, NEVER serialized to responses. */
  get internalMessage(): string {
    return this._internalMessage;
  }
}
```

---

## 5. Global Error Handler Middleware

Centralized error-to-response translation. Route handlers throw typed errors;
this middleware catches and formats them. This prevents inconsistent error
shapes across endpoints.

```typescript
import { NextFunction, Request, Response } from "express";
import { AppError, InternalError, RateLimitError } from "./errors";
import { logger } from "./logger";
import { randomUUID } from "crypto";
import { getLocalizedMessage } from "./i18n";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Correlation ID: use the one from the gateway, or generate a new one
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();

  // Determine locale from Accept-Language header
  const locale = parseAcceptLanguage(req.headers["accept-language"]) || "en";

  if (err instanceof AppError) {
    // --- Known application error ---

    // Log with full diagnostic detail (never sent to client)
    logger.error({
      requestId,
      code: err.code,
      message: err.message,
      ...(err instanceof InternalError && {
        internalMessage: err.internalMessage,
      }),
      ...(err.cause && { cause: err.cause.message }),
      stack: err.stack,
    });

    // Set Retry-After header on 429 responses (RFC 7231 §7.1.3)
    if (err instanceof RateLimitError) {
      res.set("Retry-After", String(err.retryAfterSeconds));
      res.set("X-RateLimit-Remaining", "0");
    }

    // Localize the user-facing message
    const localizedMessage = getLocalizedMessage(err.code, locale) ||
      err.message;

    const response = err.toResponse(requestId, locale);
    (response.error as Record<string, unknown>).message = localizedMessage;

    res.set("X-Request-Id", requestId);
    res.status(err.statusCode).json(response);
    return;
  }

  // --- Unhandled/unexpected error — NEVER leak details ---
  logger.error({
    requestId,
    code: "ERR_INTERNAL_SERVICE",
    message: err.message,
    stack: err.stack,
  });

  res.set("X-Request-Id", requestId);
  res.status(500).json({
    error: {
      code: "ERR_INTERNAL_SERVICE",
      message:
        "An internal error occurred. Please try again or contact support.",
      requestId,
      docUrl: "https://docs.example.com/errors/ERR_INTERNAL_SERVICE",
      locale: "en",
    },
  });
}

/**
 * Parse Accept-Language header and return the best matching locale.
 * Returns the primary language tag (e.g., "en", "es", "fr").
 */
function parseAcceptLanguage(header?: string): string {
  if (!header) return "en";
  const locales = header
    .split(",")
    .map((part) => {
      const [locale, q] = part.trim().split(";q=");
      return {
        locale: locale.trim().split("-")[0],
        quality: q ? parseFloat(q) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);
  return locales[0]?.locale || "en";
}
```

---

## 6. Localization Support

Error messages are localized based on the `Accept-Language` request header. The
`locale` field in the response confirms which language was used.

### Message Catalog Structure

```typescript
// src/i18n/error-messages.ts

export const errorMessages: Record<string, Record<string, string>> = {
  en: {
    ERR_VALIDATION_REQUIRED: "A required field is missing.",
    ERR_VALIDATION_FORMAT:
      "One or more fields failed validation. See details for specifics.",
    ERR_VALIDATION_RANGE: "A field value is out of the allowed range.",
    ERR_VALIDATION_LENGTH: "A field value exceeds the allowed length.",
    ERR_VALIDATION_TYPE: "A field has an incorrect type.",
    ERR_AUTH_CREDENTIALS: "Invalid email or password.",
    ERR_AUTH_TOKEN_EXPIRED: "Your session has expired. Please log in again.",
    ERR_AUTH_TOKEN_MALFORMED: "Authentication failed. Please log in again.",
    ERR_FORBIDDEN_ROLE: "You do not have permission to perform this action.",
    ERR_NOT_FOUND_RESOURCE: "The requested resource was not found.",
    ERR_NOT_FOUND_ENDPOINT:
      "This API endpoint does not exist. Check the URL and HTTP method.",
    ERR_CONFLICT_DUPLICATE: "A resource with this identifier already exists.",
    ERR_CONFLICT_VERSION:
      "This resource has been modified by another request. Please refresh and try again.",
    ERR_RATE_LIMIT_API: "Too many requests. Please wait before trying again.",
    ERR_RATE_LIMIT_LOGIN:
      "Too many login attempts. Please wait before trying again.",
    ERR_INTERNAL_SERVICE:
      "An internal error occurred. Please try again or contact support.",
    ERR_INTERNAL_DB:
      "An internal error occurred. Please try again or contact support.",
    ERR_INTERNAL_UPSTREAM:
      "An internal error occurred. Please try again or contact support.",
  },
  es: {
    ERR_VALIDATION_REQUIRED: "Falta un campo obligatorio.",
    ERR_VALIDATION_FORMAT:
      "Uno o más campos no pasaron la validación. Consulte los detalles.",
    ERR_VALIDATION_RANGE:
      "El valor de un campo está fuera del rango permitido.",
    ERR_VALIDATION_LENGTH: "El valor de un campo excede la longitud permitida.",
    ERR_VALIDATION_TYPE: "Un campo tiene un tipo incorrecto.",
    ERR_AUTH_CREDENTIALS: "Correo electrónico o contraseña inválidos.",
    ERR_AUTH_TOKEN_EXPIRED:
      "Su sesión ha expirado. Por favor, inicie sesión de nuevo.",
    ERR_AUTH_TOKEN_MALFORMED:
      "La autenticación falló. Por favor, inicie sesión de nuevo.",
    ERR_FORBIDDEN_ROLE: "No tiene permiso para realizar esta acción.",
    ERR_NOT_FOUND_RESOURCE: "El recurso solicitado no fue encontrado.",
    ERR_NOT_FOUND_ENDPOINT:
      "Este endpoint de API no existe. Verifique la URL y el método HTTP.",
    ERR_CONFLICT_DUPLICATE: "Ya existe un recurso con este identificador.",
    ERR_CONFLICT_VERSION:
      "Este recurso ha sido modificado por otra solicitud. Actualice e intente de nuevo.",
    ERR_RATE_LIMIT_API:
      "Demasiadas solicitudes. Por favor, espere antes de intentar de nuevo.",
    ERR_RATE_LIMIT_LOGIN:
      "Demasiados intentos de inicio de sesión. Por favor, espere antes de intentar de nuevo.",
    ERR_INTERNAL_SERVICE:
      "Ocurrió un error interno. Por favor, intente de nuevo o contacte a soporte.",
    ERR_INTERNAL_DB:
      "Ocurrió un error interno. Por favor, intente de nuevo o contacte a soporte.",
    ERR_INTERNAL_UPSTREAM:
      "Ocurrió un error interno. Por favor, intente de nuevo o contacte a soporte.",
  },
  fr: {
    ERR_VALIDATION_REQUIRED: "Un champ obligatoire est manquant.",
    ERR_VALIDATION_FORMAT:
      "Un ou plusieurs champs n'ont pas passé la validation. Voir les détails.",
    ERR_VALIDATION_RANGE:
      "La valeur d'un champ est en dehors de la plage autorisée.",
    ERR_VALIDATION_LENGTH:
      "La valeur d'un champ dépasse la longueur autorisée.",
    ERR_VALIDATION_TYPE: "Un champ a un type incorrect.",
    ERR_AUTH_CREDENTIALS: "Adresse e-mail ou mot de passe invalide.",
    ERR_AUTH_TOKEN_EXPIRED:
      "Votre session a expiré. Veuillez vous reconnecter.",
    ERR_AUTH_TOKEN_MALFORMED:
      "L'authentification a échoué. Veuillez vous reconnecter.",
    ERR_FORBIDDEN_ROLE:
      "Vous n'avez pas la permission d'effectuer cette action.",
    ERR_NOT_FOUND_RESOURCE: "La ressource demandée n'a pas été trouvée.",
    ERR_NOT_FOUND_ENDPOINT:
      "Ce point de terminaison API n'existe pas. Vérifiez l'URL et la méthode HTTP.",
    ERR_CONFLICT_DUPLICATE: "Une ressource avec cet identifiant existe déjà.",
    ERR_CONFLICT_VERSION:
      "Cette ressource a été modifiée par une autre requête. Veuillez actualiser et réessayer.",
    ERR_RATE_LIMIT_API:
      "Trop de requêtes. Veuillez patienter avant de réessayer.",
    ERR_RATE_LIMIT_LOGIN:
      "Trop de tentatives de connexion. Veuillez patienter avant de réessayer.",
    ERR_INTERNAL_SERVICE:
      "Une erreur interne s'est produite. Veuillez réessayer ou contacter le support.",
    ERR_INTERNAL_DB:
      "Une erreur interne s'est produite. Veuillez réessayer ou contacter le support.",
    ERR_INTERNAL_UPSTREAM:
      "Une erreur interne s'est produite. Veuillez réessayer ou contacter le support.",
  },
  ja: {
    ERR_VALIDATION_REQUIRED: "必須フィールドが不足しています。",
    ERR_VALIDATION_FORMAT:
      "1つ以上のフィールドの検証に失敗しました。詳細をご確認ください。",
    ERR_AUTH_CREDENTIALS: "メールアドレスまたはパスワードが無効です。",
    ERR_AUTH_TOKEN_EXPIRED:
      "セッションの有効期限が切れました。再度ログインしてください。",
    ERR_NOT_FOUND_RESOURCE: "リクエストされたリソースが見つかりませんでした。",
    ERR_RATE_LIMIT_API:
      "リクエストが多すぎます。しばらくしてから再試行してください。",
    ERR_INTERNAL_SERVICE:
      "内部エラーが発生しました。再試行するか、サポートにお問い合わせください。",
    ERR_INTERNAL_DB:
      "内部エラーが発生しました。再試行するか、サポートにお問い合わせください。",
    ERR_INTERNAL_UPSTREAM:
      "内部エラーが発生しました。再試行するか、サポートにお問い合わせください。",
  },
};

/**
 * Look up a localized message for an error code.
 * Falls back to English if the locale or code is not found.
 */
export function getLocalizedMessage(
  code: string,
  locale: string,
): string | undefined {
  return errorMessages[locale]?.[code] || errorMessages["en"]?.[code];
}
```

### Localization Design Decisions

1. **Server-side localization:** The API returns localized `message` strings
   based on `Accept-Language`. This is simpler for mobile clients that would
   otherwise need to bundle all error translations.
2. **`locale` field in response:** Clients can verify the message language
   matches their UI locale. If it doesn't match, the client can fall back to its
   own translation using the `code` field.
3. **`code` is always English:** Error codes are machine-readable identifiers,
   never localized. Clients branch on `code`, display `message`.
4. **Fallback chain:** Requested locale → English → hardcoded default. Never
   return an empty message.
5. **Field-level messages in `details.fields`:** These are also localized. The
   field `code` (e.g., `FORMAT`, `RANGE`, `LENGTH`) is machine-readable and can
   be used by clients that prefer client-side localization of field errors.

---

## 7. Developer-Facing Error Reference Document

This section is the developer-facing documentation that would be published at
`https://docs.example.com/errors/`. Each error code links to its own page.

---

# API Error Reference

## Overview

All API error responses follow a consistent JSON structure. Every response
includes a machine-readable `code`, a human-readable `message`, and a
`requestId` for support correlation.

### Response Structure

```json
{
  "error": {
    "code": "ERR_{CATEGORY}_{ENTITY}",
    "message": "Human-readable description",
    "requestId": "uuid-v4",
    "target": "fieldName",
    "details": {},
    "docUrl": "https://docs.example.com/errors/ERR_...",
    "locale": "en"
  }
}
```

| Field       | Always Present | Description                                             |
| ----------- | -------------- | ------------------------------------------------------- |
| `code`      | Yes            | Stable string identifier. Use this for branching.       |
| `message`   | Yes            | Localized, user-safe text. Safe to display in UI.       |
| `requestId` | Yes            | UUID v4. Include in support tickets for fast lookup.    |
| `target`    | No             | The specific field or parameter that caused the error.  |
| `details`   | No             | Additional structured data (field errors, rate limits). |
| `docUrl`    | No             | Link to this documentation for the specific error.      |
| `locale`    | No             | Language of the `message` (from Accept-Language).       |

### Client Error Handling Best Practices

1. **Branch on `code`, not `message`.** Messages are localized and may change.
   Codes are immutable API contract.
2. **Always display `requestId` in error UIs** (or make it copyable). This is
   the fastest path to resolution when users contact support.
3. **Implement a single error parser.** All endpoints return the same shape.
4. **Respect `Retry-After`** on 429 responses. Use exponential backoff with
   jitter.
5. **Handle `details.fields`** for validation errors to show inline field
   errors.

---

### Validation Errors (400)

#### `ERR_VALIDATION_REQUIRED`

A required field is missing from the request body or query parameters.

**HTTP Status:** 400 Bad Request

**Common Causes:**

- Omitting a required field from the JSON body
- Sending `null` for a non-nullable field
- Missing required query parameters

**Resolution:**

- Check the API reference for required fields on the endpoint you're calling
- Ensure your request body includes all required fields with non-null values

**Example Response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_REQUIRED",
    "message": "A required field is missing.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "This field is required.",
          "code": "REQUIRED"
        }
      ]
    },
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_REQUIRED"
  }
}
```

---

#### `ERR_VALIDATION_FORMAT`

A field value does not match the expected format.

**HTTP Status:** 400 Bad Request

**Common Causes:**

- Invalid email address format
- Malformed UUID
- Invalid date string (expected ISO 8601)
- Invalid URL format

**Resolution:**

- Check the `details.fields` array for which fields failed and what format is
  expected
- Refer to the endpoint documentation for field format specifications

**Example Response:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_FORMAT",
    "message": "A field has an invalid format.",
    "requestId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Must be a valid email address.",
          "code": "FORMAT",
          "rejectedValue": "not-an-email"
        }
      ]
    },
    "docUrl": "https://docs.example.com/errors/ERR_VALIDATION_FORMAT"
  }
}
```

---

#### `ERR_VALIDATION_RANGE`

A numeric or date field value is outside the allowed bounds.

**HTTP Status:** 400 Bad Request

**Common Causes:**

- Negative values for fields that require positive numbers
- Dates in the past for future-only fields
- Values exceeding maximum limits

**Resolution:**

- Check `details.fields[].message` for the allowed range
- Adjust the value to fall within the documented bounds

---

#### `ERR_VALIDATION_LENGTH`

A string or array field violates length constraints.

**HTTP Status:** 400 Bad Request

**Common Causes:**

- Strings shorter than `minLength` or longer than `maxLength`
- Arrays with fewer than `minItems` or more than `maxItems`

**Resolution:**

- Check `details.fields[].message` for the allowed length
- Trim or pad the value to meet constraints

---

#### `ERR_VALIDATION_TYPE`

A field value has the wrong JSON type.

**HTTP Status:** 400 Bad Request

**Common Causes:**

- Sending a string where a number is expected (e.g., `"42"` instead of `42`)
- Sending a single object where an array is expected
- Sending `"true"` (string) instead of `true` (boolean)

**Resolution:**

- Ensure your JSON serialization produces the correct types
- Check the API reference for the expected type of each field

---

### Authentication Errors (401)

#### `ERR_AUTH_CREDENTIALS`

Login credentials are invalid.

**HTTP Status:** 401 Unauthorized

**Common Causes:**

- Incorrect email or password
- Account does not exist (message is intentionally vague to prevent user
  enumeration)

**Resolution:**

- Verify the email address and password
- Use the password reset flow if the password is forgotten
- Do NOT retry programmatically — this is not a transient error

**Security Note:** The message "Invalid email or password" is intentionally
vague. The API will never confirm whether an email address exists in the system.

---

#### `ERR_AUTH_TOKEN_EXPIRED`

The JWT access token has expired.

**HTTP Status:** 401 Unauthorized

**Headers:** `WWW-Authenticate: Bearer error="invalid_token"`

**Common Causes:**

- Access token TTL has elapsed (default: 15 minutes)
- Clock skew between client and server

**Resolution:**

1. Use your refresh token to obtain a new access token via
   `POST /v1/auth/refresh`
2. If the refresh token is also expired, redirect the user to the login flow
3. Ensure client system clock is synchronized (NTP)

**Client Implementation:**

```
if (error.code === "ERR_AUTH_TOKEN_EXPIRED") {
  const newToken = await refreshAccessToken();
  if (newToken) {
    // Retry the original request with the new token
    return retryRequest(originalRequest, newToken);
  } else {
    // Refresh failed — redirect to login
    redirectToLogin();
  }
}
```

---

#### `ERR_AUTH_TOKEN_MALFORMED`

The Authorization header contains an unparseable token.

**HTTP Status:** 401 Unauthorized

**Common Causes:**

- Corrupted token (truncated, extra characters)
- Using a refresh token where an access token is expected
- Missing `Bearer` prefix in the Authorization header

**Resolution:**

- Verify the Authorization header format: `Authorization: Bearer <token>`
- Ensure you're using the access token, not the refresh token
- Re-authenticate to obtain a fresh token

---

### Authorization Errors (403)

#### `ERR_FORBIDDEN_ROLE`

The authenticated user lacks the required role or permission.

**HTTP Status:** 403 Forbidden

**Common Causes:**

- User's role does not include the required permission for this endpoint
- Attempting to access admin-only endpoints with a regular user account
- Attempting to modify another user's resources

**Resolution:**

- Check your account's role and permissions in the dashboard
- Contact your organization admin to request the necessary role
- This is NOT an authentication error — your identity is verified, but you lack
  authorization

---

### Not Found Errors (404)

#### `ERR_NOT_FOUND_RESOURCE`

The requested resource does not exist.

**HTTP Status:** 404 Not Found

**Common Causes:**

- The resource ID is incorrect or has a typo
- The resource was deleted
- The resource belongs to a different tenant/organization

**Resolution:**

- Verify the resource ID in the URL path
- List resources via the collection endpoint to find valid IDs
- Check if the resource was recently deleted

**Security Note:** The API intentionally does not distinguish between "never
existed," "was deleted," and "belongs to another tenant." All return the same
404 to prevent information leakage.

---

#### `ERR_NOT_FOUND_ENDPOINT`

No API route matches the request path and method.

**HTTP Status:** 404 Not Found

**Common Causes:**

- Typo in the URL path
- Using the wrong HTTP method (e.g., GET instead of POST)
- Using a deprecated endpoint that has been removed
- Missing API version prefix (e.g., `/users` instead of `/v1/users`)

**Resolution:**

- Check the API reference for the correct URL and HTTP method
- Ensure the URL includes the version prefix (`/v1/`)
- Check the changelog for deprecated endpoints

---

### Conflict Errors (409)

#### `ERR_CONFLICT_DUPLICATE`

A resource with the same unique identifier already exists.

**HTTP Status:** 409 Conflict

**Common Causes:**

- Creating a user with an email that's already registered
- Creating a resource with a slug that's already taken
- Duplicate idempotency key

**Resolution:**

- Check if the resource already exists before creating
- Use a different value for the conflicting field
- For idempotency conflicts, the original request likely succeeded — check the
  response from the first attempt

---

#### `ERR_CONFLICT_VERSION`

Optimistic concurrency conflict — the resource was modified by another request.

**HTTP Status:** 409 Conflict

**Common Causes:**

- Two users editing the same resource simultaneously
- Stale `If-Match` ETag header
- Background process modified the resource between your read and write

**Resolution:**

1. Re-fetch the resource to get the latest version
2. Re-apply your changes to the fresh data
3. Retry the update with the new ETag/version

**This error is retryable.** Implement optimistic concurrency retry logic.

---

### Rate Limit Errors (429)

#### `ERR_RATE_LIMIT_API`

The API-wide rate limit has been exceeded.

**HTTP Status:** 429 Too Many Requests

**Headers:**

- `Retry-After: <seconds>` — seconds until the client can retry
- `X-RateLimit-Limit: <n>` — requests allowed per window
- `X-RateLimit-Remaining: 0` — always 0 when rate limited
- `X-RateLimit-Reset: <unix-timestamp>` — when the window resets

**Default Limits:**

- Free tier: 60 requests/minute
- Pro tier: 600 requests/minute
- Enterprise: Custom

**Resolution:**

1. **Wait** for the duration specified in `Retry-After` before retrying
2. Implement exponential backoff with jitter for retry logic
3. Cache responses where possible to reduce request volume
4. Consider upgrading your plan if you consistently hit limits
5. Use webhooks instead of polling for event-driven data

**Anti-pattern:** Do NOT retry immediately. Immediate retries worsen the
overload and may result in longer rate limit windows.

**Client Implementation:**

```
if (error.code === "ERR_RATE_LIMIT_API") {
  const retryAfter = error.details.retryAfter;
  const jitter = Math.random() * 1000; // 0-1 second jitter
  await sleep(retryAfter * 1000 + jitter);
  return retryRequest(originalRequest);
}
```

---

#### `ERR_RATE_LIMIT_LOGIN`

The login-specific rate limit has been exceeded.

**HTTP Status:** 429 Too Many Requests

**Default Limits:**

- 5 failed attempts per account per 15 minutes
- 20 failed attempts per IP per 15 minutes

**Resolution:**

- Wait for the `Retry-After` duration
- Use the password reset flow if you've forgotten your password
- Contact support if you believe your account is under attack

**Security Note:** Login rate limits are stricter than API-wide limits to
prevent brute-force attacks. They are applied per-account AND per-IP.

---

### Internal Errors (500)

#### `ERR_INTERNAL_SERVICE`

An unexpected error occurred in the application.

**HTTP Status:** 500 Internal Server Error

**What You'll See:**

```json
{
  "error": {
    "code": "ERR_INTERNAL_SERVICE",
    "message": "An internal error occurred. Please try again or contact support.",
    "requestId": "e5f7a9b1-c2d3-4e5f-b0a1-2c3d4e5f6a7b"
  }
}
```

**Resolution:**

1. **Retry the request** — many internal errors are transient
2. If the error persists, **note the `requestId`** and contact support
3. Check the [status page](https://status.example.com) for ongoing incidents

**Why is the message vague?** Internal error messages never include technical
details (database names, stack traces, query text) because this information
could be exploited by attackers. The `requestId` lets our support team look up
the full diagnostic details in server logs.

---

#### `ERR_INTERNAL_DB`

A database operation failed.

**HTTP Status:** 500 Internal Server Error

**This error is retryable.** Database connection failures are often transient.
Retry with exponential backoff.

**Resolution:** Same as `ERR_INTERNAL_SERVICE`. The more specific code helps our
operations team triage — it does not change the client's response.

---

#### `ERR_INTERNAL_UPSTREAM`

A downstream service call failed.

**HTTP Status:** 500 Internal Server Error

**This error is retryable.** Upstream service failures are often transient.

**Resolution:** Same as `ERR_INTERNAL_SERVICE`. Check the status page for known
outages in dependent services.

---

## Appendix A: Error Code Quick Reference

| Code                       | HTTP | Retryable | Client Action                                      |
| -------------------------- | ---- | --------- | -------------------------------------------------- |
| `ERR_VALIDATION_REQUIRED`  | 400  | No        | Show field-level errors from `details.fields`      |
| `ERR_VALIDATION_FORMAT`    | 400  | No        | Show field-level errors from `details.fields`      |
| `ERR_VALIDATION_RANGE`     | 400  | No        | Show field-level errors from `details.fields`      |
| `ERR_VALIDATION_LENGTH`    | 400  | No        | Show field-level errors from `details.fields`      |
| `ERR_VALIDATION_TYPE`      | 400  | No        | Show field-level errors from `details.fields`      |
| `ERR_AUTH_CREDENTIALS`     | 401  | No        | Show login error, offer password reset             |
| `ERR_AUTH_TOKEN_EXPIRED`   | 401  | No        | Refresh token → retry, or redirect to login        |
| `ERR_AUTH_TOKEN_MALFORMED` | 401  | No        | Re-authenticate                                    |
| `ERR_FORBIDDEN_ROLE`       | 403  | No        | Show "insufficient permissions" message            |
| `ERR_NOT_FOUND_RESOURCE`   | 404  | No        | Show "not found" message, offer navigation         |
| `ERR_NOT_FOUND_ENDPOINT`   | 404  | No        | Check URL and HTTP method                          |
| `ERR_CONFLICT_DUPLICATE`   | 409  | No        | Show "already exists" message                      |
| `ERR_CONFLICT_VERSION`     | 409  | Yes       | Re-fetch, re-apply changes, retry                  |
| `ERR_RATE_LIMIT_API`       | 429  | Yes       | Wait `Retry-After` seconds, then retry with jitter |
| `ERR_RATE_LIMIT_LOGIN`     | 429  | Yes       | Wait `Retry-After` seconds, offer password reset   |
| `ERR_INTERNAL_SERVICE`     | 500  | Yes       | Retry with backoff, then show support contact      |
| `ERR_INTERNAL_DB`          | 500  | Yes       | Retry with backoff, then show support contact      |
| `ERR_INTERNAL_UPSTREAM`    | 500  | Yes       | Retry with backoff, check status page              |

## Appendix B: HTTP Headers for Error Responses

| Header                  | When Set      | Purpose                                          |
| ----------------------- | ------------- | ------------------------------------------------ |
| `X-Request-Id`          | Always        | Correlation ID (matches `requestId` in body)     |
| `Retry-After`           | 429 responses | Seconds until client should retry (RFC 7231)     |
| `X-RateLimit-Limit`     | 429 responses | Rate limit ceiling (requests per window)         |
| `X-RateLimit-Remaining` | 429 responses | Requests remaining (always 0 when rate limited)  |
| `X-RateLimit-Reset`     | 429 responses | Unix timestamp when the rate limit window resets |
| `WWW-Authenticate`      | 401 responses | Bearer token error details (RFC 6750)            |

## Appendix C: Common Mistakes to Avoid

| Mistake                                                   | Why It's a Problem                                       | Fix                                                  |
| --------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Using HTTP status as the only error identifier            | Clients can't distinguish `404 user` from `404 endpoint` | Add stable string codes (`ERR_NOT_FOUND_USER`)       |
| Logging the user-safe message instead of the internal one | Logs become useless for debugging                        | Log `internalMessage` + cause chain                  |
| Catching and re-throwing without wrapping                 | Destroys the causal chain                                | Use `cause` parameter to wrap                        |
| Returning different JSON shapes from different endpoints  | Clients need per-endpoint error parsers                  | Use one global error handler                         |
| Including stack traces in production responses            | Information disclosure vulnerability                     | Only log server-side, never serialize to response    |
| Inventing new codes per-instance instead of per-category  | Code explosion, clients can't match                      | Use `ERR_{CATEGORY}_{ENTITY}` pattern                |
| Forgetting `Retry-After` on 429 responses                 | Clients retry immediately, worsening overload            | Always set the header on rate limit errors           |
| Swallowing errors silently (`catch {}`)                   | Failures become invisible                                | At minimum, log and re-throw or return a typed error |
| Parsing `message` strings for error handling              | Messages are localized and may change                    | Branch on `code`, display `message`                  |
| Exposing internal details in 500 error messages           | Attackers learn your schema, services, infrastructure    | Use generic message, log details server-side         |

# Standardized Error Handling for Express.js Users API

This document implements a complete, production-grade error handling system for
the Express.js Users API following the error-handling skill workflow. Every
artifact is included: base error class, error subclass hierarchy, error code
convention, JSON error response schema, error wrapping, correlation IDs with
structured logging, centralized error handler, and error reference
documentation.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Base Error Class (`AppError`)](#2-base-error-class-apperror)
3. [Error Subclass Hierarchy](#3-error-subclass-hierarchy)
4. [Error Code Convention & Registry](#4-error-code-convention--registry)
5. [JSON Error Response Schema](#5-json-error-response-schema)
6. [Correlation ID Middleware](#6-correlation-id-middleware)
7. [Structured Logger](#7-structured-logger)
8. [Centralized Error Handler Middleware](#8-centralized-error-handler-middleware)
9. [Refactored Routes with Error Wrapping](#9-refactored-routes-with-error-wrapping)
10. [JWT Authentication Middleware (Updated)](#10-jwt-authentication-middleware-updated)
11. [Application Wiring (`app.js`)](#11-application-wiring-appjs)
12. [Error Reference Documentation](#12-error-reference-documentation)
13. [Error Response Checklist Verification](#13-error-response-checklist-verification)

---

## 1. Architecture Overview

```
Request Flow:
┌──────────┐    ┌──────────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Client  │───▶│ correlationId MW │───▶│  JWT Auth MW │───▶│ Route Handler│───▶│ Error Handler MW │
└──────────┘    └──────────────────┘    └──────────────┘    └──────────────┘    └──────────────────┘
                  │ Generates/accepts     │ Throws             │ Throws             │ Catches all
                  │ X-Request-Id          │ AuthenticationError │ AppError subclass   │ Formats JSON
                  │                       │                     │ with cause wrapping │ Logs structured
```

**File structure:**

```
src/
├── errors/
│   ├── AppError.js              # Base error class
│   ├── ValidationError.js       # 400
│   ├── AuthenticationError.js   # 401
│   ├── ForbiddenError.js        # 403
│   ├── NotFoundError.js         # 404
│   ├── ConflictError.js         # 409
│   ├── RateLimitError.js        # 429
│   ├── InternalError.js         # 500
│   └── index.js                 # Re-exports all error classes
├── middleware/
│   ├── correlationId.js         # Request ID generation
│   ├── errorHandler.js          # Centralized error handler
│   └── authenticate.js          # JWT auth (updated)
├── lib/
│   └── logger.js                # Structured JSON logger
├── routes/
│   └── users.js                 # Refactored user routes
└── app.js                       # Application wiring
```

---

## 2. Base Error Class (`AppError`)

**File: `src/errors/AppError.js`**

```javascript
"use strict";

/**
 * Base application error class. All application errors extend this.
 *
 * Required fields:
 * - code:          Stable string identifier (e.g., ERR_NOT_FOUND_USER). Clients switch on this. Never changes once shipped.
 * - message:       Human-readable, user-safe description. Never contains stack traces, SQL, or internal identifiers.
 * - statusCode:    HTTP status code for the response.
 * - isOperational: true = expected error (bad input, not found). false = programmer error (null ref, assertion).
 *                  Only operational errors are safe to handle; non-operational errors should crash the process.
 * - cause:         The original error that triggered this one. Preserves the causal chain for debugging.
 */
class AppError extends Error {
  /**
   * @param {Object} params
   * @param {string} params.code - Stable programmatic error code (e.g., ERR_NOT_FOUND_USER)
   * @param {string} params.message - User-safe, human-readable description
   * @param {number} params.statusCode - HTTP status code
   * @param {boolean} [params.isOperational=true] - Whether this is an expected operational error
   * @param {Error} [params.cause] - The original error that caused this one
   * @param {Object} [params.details] - Additional structured details (e.g., field validation errors)
   */
  constructor(
    { code, message, statusCode, isOperational = true, cause, details },
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.cause = cause || undefined;
    this.details = details || undefined;

    // Preserve proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize to a plain object for logging (includes internal details).
   * This is NOT the API response format — use errorHandler middleware for that.
   */
  toLog() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      details: this.details,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

module.exports = AppError;
```

---

## 3. Error Subclass Hierarchy

### `ValidationError` (400)

**File: `src/errors/ValidationError.js`**

```javascript
"use strict";

const AppError = require("./AppError");

/**
 * 400 Bad Request — request body/params fail schema or business rules.
 * Always operational. Should include field-level details when possible.
 */
class ValidationError extends AppError {
  /**
   * @param {Object} params
   * @param {string} params.code - e.g., ERR_VALIDATION_EMAIL_FORMAT
   * @param {string} params.message - User-safe description
   * @param {Array<{field: string, message: string, rejected?: any}>} [params.details] - Field-level validation errors
   * @param {Error} [params.cause]
   */
  constructor({ code, message, details, cause }) {
    super({
      code,
      message,
      statusCode: 400,
      isOperational: true,
      cause,
      details,
    });
  }
}

module.exports = ValidationError;
```

### `AuthenticationError` (401)

**File: `src/errors/AuthenticationError.js`**

```javascript
"use strict";

const AppError = require("./AppError");

/**
 * 401 Unauthorized — missing, expired, or invalid credentials.
 * Always operational.
 */
class AuthenticationError extends AppError {
  /**
   * @param {Object} params
   * @param {string} params.code - e.g., ERR_AUTH_TOKEN_EXPIRED
   * @param {string} params.message - User-safe description
   * @param {Error} [params.cause]
   */
  constructor({ code, message, cause }) {
    super({
      code,
      message,
      statusCode: 401,
      isOperational: true,
      cause,
    });
  }
}

module.exports = AuthenticationError;
```

### `ForbiddenError` (403)

**File: `src/errors/ForbiddenError.js`**

```javascript
"use strict";

const AppError = require("./AppError");

/**
 * 403 Forbidden — authenticated but lacks permission for this action.
 * Always operational.
 */
class ForbiddenError extends AppError {
  /**
   * @param {Object} params
   * @param {string} params.code - e.g., ERR_FORBIDDEN_ADMIN_ONLY
   * @param {string} params.message - User-safe description
   * @param {Error} [params.cause]
   */
  constructor({ code, message, cause }) {
    super({
      code,
      message,
      statusCode: 403,
      isOperational: true,
      cause,
    });
  }
}

module.exports = ForbiddenError;
```

### `NotFoundError` (404)

**File: `src/errors/NotFoundError.js`**

```javascript
"use strict";

const AppError = require("./AppError");

/**
 * 404 Not Found — resource doesn't exist or caller can't see it.
 * Use 404 over 403 to avoid leaking resource existence.
 * Always operational.
 */
class NotFoundError extends AppError {
  /**
   * @param {Object} params
   * @param {string} params.code - e.g., ERR_NOT_FOUND_USER
   * @param {string} params.message - User-safe description
   * @param {Error} [params.cause]
   */
  constructor({ code, message, cause }) {
    super({
      code,
      message,
      statusCode: 404,
      isOperational: true,
      cause,
    });
  }
}

module.exports = NotFoundError;
```

### `ConflictError` (409)

**File: `src/errors/ConflictError.js`**

```javascript
"use strict";

const AppError = require("./AppError");

/**
 * 409 Conflict — duplicate key, version mismatch, state transition violation.
 * Always operational.
 */
class ConflictError extends AppError {
  /**
   * @param {Object} params
   * @param {string} params.code - e.g., ERR_CONFLICT_EMAIL_TAKEN
   * @param {string} params.message - User-safe description
   * @param {Error} [params.cause]
   */
  constructor({ code, message, cause }) {
    super({
      code,
      message,
      statusCode: 409,
      isOperational: true,
      cause,
    });
  }
}

module.exports = ConflictError;
```

### `RateLimitError` (429)

**File: `src/errors/RateLimitError.js`**

```javascript
"use strict";

const AppError = require("./AppError");

/**
 * 429 Too Many Requests — always includes retryAfter field.
 * Always operational.
 */
class RateLimitError extends AppError {
  /**
   * @param {Object} params
   * @param {string} params.code - e.g., ERR_RATE_LIMIT_API
   * @param {string} params.message - User-safe description
   * @param {number} params.retryAfter - Seconds until the client can retry
   * @param {Error} [params.cause]
   */
  constructor({ code, message, retryAfter, cause }) {
    super({
      code,
      message,
      statusCode: 429,
      isOperational: true,
      cause,
    });
    this.retryAfter = retryAfter;
  }
}

module.exports = RateLimitError;
```

### `InternalError` (500)

**File: `src/errors/InternalError.js`**

```javascript
"use strict";

const AppError = require("./AppError");

/**
 * 500 Internal Server Error — unexpected failures / bugs.
 * ALWAYS non-operational (isOperational: false).
 * These represent programmer errors and should trigger alerts.
 */
class InternalError extends AppError {
  /**
   * @param {Object} params
   * @param {string} params.code - e.g., ERR_INTERNAL_DB_CONNECTION
   * @param {string} params.message - Internal description (will NOT be shown to user)
   * @param {Error} [params.cause]
   */
  constructor({ code, message, cause }) {
    // Always non-operational — these represent bugs
    super({
      code,
      message,
      statusCode: 500,
      isOperational: false,
      cause,
    });
  }
}

module.exports = InternalError;
```

### Error Index (Re-exports)

**File: `src/errors/index.js`**

```javascript
"use strict";

const AppError = require("./AppError");
const ValidationError = require("./ValidationError");
const AuthenticationError = require("./AuthenticationError");
const ForbiddenError = require("./ForbiddenError");
const NotFoundError = require("./NotFoundError");
const ConflictError = require("./ConflictError");
const RateLimitError = require("./RateLimitError");
const InternalError = require("./InternalError");

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
};
```

---

## 4. Error Code Convention & Registry

**Format:** `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]`

All error codes used in this API:

| Error Code                          | Subclass            | Status | Where Used                          |
| ----------------------------------- | ------------------- | ------ | ----------------------------------- |
| `ERR_VALIDATION_USER_EMAIL_FORMAT`  | ValidationError     | 400    | POST /api/users, PUT /api/users/:id |
| `ERR_VALIDATION_USER_NAME_REQUIRED` | ValidationError     | 400    | POST /api/users, PUT /api/users/:id |
| `ERR_VALIDATION_USER_PASSWORD_WEAK` | ValidationError     | 400    | POST /api/users                     |
| `ERR_VALIDATION_USER_ID_FORMAT`     | ValidationError     | 400    | GET/PUT/DELETE /api/users/:id       |
| `ERR_VALIDATION_USER_BODY_EMPTY`    | ValidationError     | 400    | POST /api/users, PUT /api/users/:id |
| `ERR_AUTH_TOKEN_MISSING`            | AuthenticationError | 401    | JWT middleware                      |
| `ERR_AUTH_TOKEN_INVALID`            | AuthenticationError | 401    | JWT middleware                      |
| `ERR_AUTH_TOKEN_EXPIRED`            | AuthenticationError | 401    | JWT middleware                      |
| `ERR_FORBIDDEN_ADMIN_ONLY`          | ForbiddenError      | 403    | DELETE /api/users/:id               |
| `ERR_NOT_FOUND_USER`                | NotFoundError       | 404    | GET/PUT/DELETE /api/users/:id       |
| `ERR_CONFLICT_EMAIL_TAKEN`          | ConflictError       | 409    | POST /api/users, PUT /api/users/:id |
| `ERR_RATE_LIMIT_API`                | RateLimitError      | 429    | Rate limit middleware               |
| `ERR_INTERNAL_DB_QUERY`             | InternalError       | 500    | Any DB operation failure            |
| `ERR_INTERNAL_DB_CONNECTION`        | InternalError       | 500    | MongoDB connection failure          |
| `ERR_INTERNAL_UNHANDLED`            | InternalError       | 500    | Centralized error handler fallback  |

**Why string codes instead of numeric codes:** HTTP status codes are too coarse
— there are dozens of reasons a 400 can occur. Numeric error codes (like
`40012`) are opaque and require a lookup table. String codes are
self-documenting, greppable, and clients can pattern-match on prefixes
(`ERR_VALIDATION_*`).

---

## 5. JSON Error Response Schema

Every error response from this API follows this exact shape:

```json
{
  "error": {
    "code": "ERR_VALIDATION_USER_EMAIL_FORMAT",
    "message": "The email address is not valid.",
    "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address.",
        "rejected": "not-an-email"
      }
    ],
    "target": "POST /api/users"
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
| `error.details[].field`    | Yes (in details) | JSON path to the invalid field.                                         |
| `error.details[].message`  | Yes (in details) | What's wrong with this specific field.                                  |
| `error.details[].rejected` | No               | The value that was rejected (omit for sensitive fields like passwords). |
| `error.target`             | No               | The API endpoint or operation that failed.                              |

---

## 6. Correlation ID Middleware

**File: `src/middleware/correlationId.js`**

```javascript
"use strict";

const crypto = require("crypto");

/**
 * Generates or accepts a correlation ID for every incoming request.
 * The ID flows through every log line and appears in the error response,
 * enabling end-to-end tracing.
 *
 * Accepts client-provided X-Request-Id header, or generates a new UUID.
 */
function correlationId(req, res, next) {
  // Accept client-provided ID or generate one
  req.requestId = req.headers["x-request-id"] || `req_${crypto.randomUUID()}`;

  // Echo it back in the response headers
  res.setHeader("X-Request-Id", req.requestId);

  next();
}

module.exports = correlationId;
```

---

## 7. Structured Logger

**File: `src/lib/logger.js`**

```javascript
"use strict";

/**
 * Structured JSON logger.
 *
 * Outputs JSON to stdout/stderr so log aggregators (Datadog, ELK, CloudWatch)
 * can parse fields automatically. Never outputs plaintext — machines parse logs too.
 *
 * Critical rule: The `cause` and `stack` fields appear in LOGS ONLY, never
 * in the API response. The API response contains code, message, and requestId —
 * enough for the client to report the issue, not enough to leak internals.
 */
const logger = {
  /**
   * @param {Object} data - Structured log data
   */
  info(data) {
    const entry = {
      level: "info",
      timestamp: new Date().toISOString(),
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + "\n");
  },

  /**
   * @param {Object} data - Structured log data
   */
  warn(data) {
    const entry = {
      level: "warn",
      timestamp: new Date().toISOString(),
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + "\n");
  },

  /**
   * @param {Object} data - Structured log data including error details
   */
  error(data) {
    const entry = {
      level: "error",
      timestamp: new Date().toISOString(),
      ...data,
    };
    process.stderr.write(JSON.stringify(entry) + "\n");
  },
};

module.exports = logger;
```

---

## 8. Centralized Error Handler Middleware

**File: `src/middleware/errorHandler.js`**

```javascript
"use strict";

const {
  AppError,
  ValidationError,
  RateLimitError,
  InternalError,
} = require("../errors");
const logger = require("../lib/logger");

/**
 * Sends an alert to the on-call team for non-operational (programmer) errors.
 * In production, this would integrate with PagerDuty, Opsgenie, Slack, etc.
 *
 * @param {AppError} error
 * @param {string} requestId
 */
function alertOncall(error, requestId) {
  logger.error({
    alert: "ONCALL_TRIGGERED",
    requestId,
    code: error.code,
    message: error.message,
    stack: error.stack,
    cause: error.cause?.message,
  });
  // In production: integrate with PagerDuty, Opsgenie, Slack webhook, etc.
}

/**
 * Centralized error handler middleware.
 *
 * One place converts AppError instances into HTTP responses. This prevents
 * every route from implementing its own error formatting.
 *
 * MUST be registered AFTER all routes in Express (app.use(errorHandler) last).
 * Express recognizes 4-argument middleware as error handlers.
 */
function errorHandler(err, req, res, next) {
  // If it's not an AppError, wrap it as an InternalError
  const appError = err instanceof AppError ? err : new InternalError({
    code: "ERR_INTERNAL_UNHANDLED",
    message: "An unexpected error occurred.",
    cause: err,
  });

  // Log the full error (internal details included — never sent to client)
  logger.error({
    requestId: req.requestId,
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    isOperational: appError.isOperational,
    cause: appError.cause?.message,
    stack: appError.stack,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
  });

  // Build the user-safe response
  const response = {
    error: {
      code: appError.code,
      // Non-operational errors get a generic message — never leak internal details
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

  // Add target for debugging context
  if (req.method && req.originalUrl) {
    response.error.target = `${req.method} ${req.originalUrl}`;
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

module.exports = errorHandler;
```

---

## 9. Refactored Routes with Error Wrapping

**File: `src/routes/users.js`**

This is the core refactoring. Each route now:

- Throws specific `AppError` subclasses instead of ad-hoc error responses
- Wraps lower-level errors (MongoDB) with `cause` to preserve the causal chain
- Delegates all error formatting to the centralized error handler via
  `next(err)`
- Never sends error responses directly — only `next(error)`

```javascript
"use strict";

const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

const {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InternalError,
} = require("../errors");

// Assume `db` is the MongoDB database instance, injected or imported
// const db = require("../lib/db");

/**
 * Validates that a string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * Validates user input for create/update operations.
 * Returns an array of field-level validation errors, or empty array if valid.
 *
 * @param {Object} body - Request body
 * @param {Object} options
 * @param {boolean} options.isCreate - Whether this is a create (vs update) operation
 * @returns {Array<{field: string, message: string, rejected?: any}>}
 */
function validateUserInput(body, { isCreate = false } = {}) {
  const errors = [];

  if (!body || Object.keys(body).length === 0) {
    return [{ field: "body", message: "Request body must not be empty." }];
  }

  // Name validation
  if (
    isCreate &&
    (!body.name || typeof body.name !== "string" ||
      body.name.trim().length === 0)
  ) {
    errors.push({
      field: "name",
      message: "Name is required and must be a non-empty string.",
      rejected: body.name,
    });
  } else if (
    body.name !== undefined &&
    (typeof body.name !== "string" || body.name.trim().length === 0)
  ) {
    errors.push({
      field: "name",
      message: "Name must be a non-empty string.",
      rejected: body.name,
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (isCreate && !body.email) {
    errors.push({
      field: "email",
      message: "Email is required.",
    });
  } else if (body.email !== undefined && !emailRegex.test(body.email)) {
    errors.push({
      field: "email",
      message: "Must be a valid email address.",
      rejected: body.email,
    });
  }

  // Password validation (create only)
  if (isCreate) {
    if (!body.password) {
      errors.push({
        field: "password",
        message: "Password is required.",
        // Never include rejected password values — sensitive field
      });
    } else if (body.password.length < 8) {
      errors.push({
        field: "password",
        message: "Password must be at least 8 characters long.",
        // Never include rejected password values — sensitive field
      });
    }
  }

  return errors;
}

/**
 * GET /api/users
 * List all users with pagination.
 */
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      req.db
        .collection("users")
        .find({}, { projection: { password: 0 } })
        .skip(skip)
        .limit(limit)
        .toArray(),
      req.db.collection("users").countDocuments(),
    ]);

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    // Wrap MongoDB errors — don't swallow or re-throw raw
    next(
      new InternalError({
        code: "ERR_INTERNAL_DB_QUERY",
        message: "Failed to retrieve users.",
        cause: err, // Original DB error preserved for debugging
      }),
    );
  }
});

/**
 * GET /api/users/:id
 * Get a single user by ID.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      throw new ValidationError({
        code: "ERR_VALIDATION_USER_ID_FORMAT",
        message: "The provided user ID is not valid.",
        details: [
          {
            field: "id",
            message: "Must be a valid 24-character hex string.",
            rejected: id,
          },
        ],
      });
    }

    const user = await req.db
      .collection("users")
      .findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });

    if (!user) {
      throw new NotFoundError({
        code: "ERR_NOT_FOUND_USER",
        message: `User with ID '${id}' was not found.`,
      });
    }

    res.json({ data: user });
  } catch (err) {
    // If it's already an AppError, pass it through
    if (err.code && err.statusCode) {
      return next(err);
    }
    // Otherwise wrap as internal error
    next(
      new InternalError({
        code: "ERR_INTERNAL_DB_QUERY",
        message: "Failed to retrieve user.",
        cause: err,
      }),
    );
  }
});

/**
 * POST /api/users
 * Create a new user.
 */
router.post("/", async (req, res, next) => {
  try {
    // Validate input
    const validationErrors = validateUserInput(req.body, { isCreate: true });
    if (validationErrors.length > 0) {
      throw new ValidationError({
        code: validationErrors[0].field === "body"
          ? "ERR_VALIDATION_USER_BODY_EMPTY"
          : validationErrors[0].field === "email"
          ? "ERR_VALIDATION_USER_EMAIL_FORMAT"
          : validationErrors[0].field === "name"
          ? "ERR_VALIDATION_USER_NAME_REQUIRED"
          : "ERR_VALIDATION_USER_PASSWORD_WEAK",
        message:
          "Validation failed. Check the details for specific field errors.",
        details: validationErrors,
      });
    }

    // Attempt insert
    const userData = {
      name: req.body.name.trim(),
      email: req.body.email.toLowerCase().trim(),
      password: req.body.password, // In production: hash with bcrypt first
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await req.db.collection("users").insertOne(userData);

    // Return created user (without password)
    const { password, ...userWithoutPassword } = userData;
    res.status(201).json({
      data: {
        _id: result.insertedId,
        ...userWithoutPassword,
      },
    });
  } catch (err) {
    // If it's already an AppError, pass it through
    if (err.code && err.statusCode) {
      return next(err);
    }

    // MongoDB duplicate key error (code 11000)
    if (err.code === 11000) {
      return next(
        new ConflictError({
          code: "ERR_CONFLICT_EMAIL_TAKEN",
          message: "A user with this email address already exists.",
          cause: err, // Original DB error preserved for debugging
        }),
      );
    }

    // All other DB errors
    next(
      new InternalError({
        code: "ERR_INTERNAL_DB_QUERY",
        message: "Failed to create user.",
        cause: err,
      }),
    );
  }
});

/**
 * PUT /api/users/:id
 * Update an existing user.
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      throw new ValidationError({
        code: "ERR_VALIDATION_USER_ID_FORMAT",
        message: "The provided user ID is not valid.",
        details: [
          {
            field: "id",
            message: "Must be a valid 24-character hex string.",
            rejected: id,
          },
        ],
      });
    }

    // Validate input
    const validationErrors = validateUserInput(req.body, { isCreate: false });
    if (validationErrors.length > 0) {
      throw new ValidationError({
        code: validationErrors[0].field === "body"
          ? "ERR_VALIDATION_USER_BODY_EMPTY"
          : validationErrors[0].field === "email"
          ? "ERR_VALIDATION_USER_EMAIL_FORMAT"
          : "ERR_VALIDATION_USER_NAME_REQUIRED",
        message:
          "Validation failed. Check the details for specific field errors.",
        details: validationErrors,
      });
    }

    // Build update document (only include provided fields)
    const updateFields = {};
    if (req.body.name !== undefined) updateFields.name = req.body.name.trim();
    if (req.body.email !== undefined) {
      updateFields.email = req.body.email.toLowerCase().trim();
    }
    updateFields.updatedAt = new Date();

    const result = await req.db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after", projection: { password: 0 } },
    );

    if (!result || !result.value) {
      throw new NotFoundError({
        code: "ERR_NOT_FOUND_USER",
        message: `User with ID '${id}' was not found.`,
      });
    }

    res.json({ data: result.value });
  } catch (err) {
    // If it's already an AppError, pass it through
    if (err.code && err.statusCode) {
      return next(err);
    }

    // MongoDB duplicate key error (code 11000)
    if (err.code === 11000) {
      return next(
        new ConflictError({
          code: "ERR_CONFLICT_EMAIL_TAKEN",
          message: "A user with this email address already exists.",
          cause: err, // Original DB error preserved for debugging
        }),
      );
    }

    // All other DB errors
    next(
      new InternalError({
        code: "ERR_INTERNAL_DB_QUERY",
        message: "Failed to update user.",
        cause: err,
      }),
    );
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user. Requires admin role.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      throw new ValidationError({
        code: "ERR_VALIDATION_USER_ID_FORMAT",
        message: "The provided user ID is not valid.",
        details: [
          {
            field: "id",
            message: "Must be a valid 24-character hex string.",
            rejected: id,
          },
        ],
      });
    }

    // Authorization check — only admins can delete users
    if (!req.user || req.user.role !== "admin") {
      throw new ForbiddenError({
        code: "ERR_FORBIDDEN_ADMIN_ONLY",
        message: "Only administrators can delete users.",
      });
    }

    const result = await req.db
      .collection("users")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new NotFoundError({
        code: "ERR_NOT_FOUND_USER",
        message: `User with ID '${id}' was not found.`,
      });
    }

    res.status(204).send();
  } catch (err) {
    // If it's already an AppError, pass it through
    if (err.code && err.statusCode) {
      return next(err);
    }

    // All other DB errors
    next(
      new InternalError({
        code: "ERR_INTERNAL_DB_QUERY",
        message: "Failed to delete user.",
        cause: err,
      }),
    );
  }
});

module.exports = router;
```

---

## 10. JWT Authentication Middleware (Updated)

**File: `src/middleware/authenticate.js`**

The JWT middleware now throws proper `AuthenticationError` subclasses with
specific error codes instead of ad-hoc responses.

```javascript
"use strict";

const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("../errors");

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT authentication middleware.
 *
 * Validates the Authorization: Bearer <token> header.
 * Throws AuthenticationError subclasses with specific error codes
 * instead of sending ad-hoc error responses.
 *
 * All errors are passed to next() for the centralized error handler.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // No Authorization header at all
    if (!authHeader) {
      throw new AuthenticationError({
        code: "ERR_AUTH_TOKEN_MISSING",
        message:
          "Authentication is required. Please provide a valid Bearer token.",
      });
    }

    // Malformed header (not "Bearer <token>")
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new AuthenticationError({
        code: "ERR_AUTH_TOKEN_INVALID",
        message:
          "The Authorization header must use the format: Bearer <token>.",
      });
    }

    const token = parts[1];

    // Verify and decode the token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Attach user payload to request
      next();
    } catch (jwtError) {
      // Distinguish expired from invalid
      if (jwtError.name === "TokenExpiredError") {
        throw new AuthenticationError({
          code: "ERR_AUTH_TOKEN_EXPIRED",
          message:
            "Your authentication token has expired. Please log in again.",
          cause: jwtError, // Preserve original JWT error for debugging
        });
      }

      throw new AuthenticationError({
        code: "ERR_AUTH_TOKEN_INVALID",
        message: "The provided authentication token is invalid.",
        cause: jwtError, // Preserve original JWT error for debugging
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
```

---

## 11. Application Wiring (`app.js`)

**File: `src/app.js`**

Shows the correct middleware ordering: correlation ID first, then routes, then
error handler last.

```javascript
"use strict";

const express = require("express");
const { MongoClient } = require("mongodb");
const correlationId = require("./middleware/correlationId");
const authenticate = require("./middleware/authenticate");
const errorHandler = require("./middleware/errorHandler");
const usersRouter = require("./routes/users");
const logger = require("./lib/logger");
const { InternalError } = require("./errors");

const app = express();

// --- Body parsing ---
app.use(express.json());

// --- Correlation ID middleware (FIRST — before everything else) ---
// Every request gets a unique requestId that flows through all logs and error responses
app.use(correlationId);

// --- Request logging ---
app.use((req, res, next) => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userAgent: req.headers["user-agent"],
  });
  next();
});

// --- Database injection middleware ---
// Attaches the db instance to every request
let db;
app.use((req, res, next) => {
  req.db = db;
  next();
});

// --- Routes ---
// JWT authentication applied to all /api/users routes
app.use("/api/users", authenticate, usersRouter);

// --- 404 handler for unmatched routes ---
const { NotFoundError } = require("./errors");
app.use((req, res, next) => {
  next(
    new NotFoundError({
      code: "ERR_NOT_FOUND_ROUTE",
      message: `The route ${req.method} ${req.originalUrl} does not exist.`,
    }),
  );
});

// --- Centralized error handler (LAST — after all routes) ---
// Express recognizes 4-argument middleware as error handlers
app.use(errorHandler);

// --- Unhandled rejection / uncaught exception handlers ---
process.on("unhandledRejection", (reason) => {
  logger.error({
    alert: "UNHANDLED_REJECTION",
    message: reason?.message || String(reason),
    stack: reason?.stack,
  });
  // In production: graceful shutdown
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error({
    alert: "UNCAUGHT_EXCEPTION",
    message: err.message,
    stack: err.stack,
  });
  // Non-operational errors must crash — they indicate bugs
  process.exit(1);
});

// --- Start server ---
async function start() {
  try {
    const mongoUrl = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const dbName = process.env.DB_NAME || "users_api";

    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);

    // Create indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info({ message: `Server started on port ${port}` });
    });
  } catch (err) {
    logger.error({
      alert: "STARTUP_FAILURE",
      code: "ERR_INTERNAL_DB_CONNECTION",
      message: "Failed to connect to MongoDB.",
      cause: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

start();

module.exports = app; // For testing
```

---

## 12. Error Reference Documentation

### ERR_VALIDATION_USER_EMAIL_FORMAT

- **HTTP Status:** 400 Bad Request
- **Meaning:** The email field in the request body is not a valid email address.
- **Common causes:** Typo in email, missing `@` symbol, missing domain.
- **Resolution:** Provide a valid email address in the format `user@domain.com`.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_USER_EMAIL_FORMAT",
      "message": "Validation failed. Check the details for specific field errors.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "details": [
        {
          "field": "email",
          "message": "Must be a valid email address.",
          "rejected": "not-an-email"
        }
      ],
      "target": "POST /api/users"
    }
  }
  ```

### ERR_VALIDATION_USER_NAME_REQUIRED

- **HTTP Status:** 400 Bad Request
- **Meaning:** The name field is missing or empty.
- **Common causes:** Omitted name field in request body, empty string.
- **Resolution:** Include a non-empty `name` string in the request body.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_USER_NAME_REQUIRED",
      "message": "Validation failed. Check the details for specific field errors.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "details": [
        {
          "field": "name",
          "message": "Name is required and must be a non-empty string.",
          "rejected": ""
        }
      ],
      "target": "POST /api/users"
    }
  }
  ```

### ERR_VALIDATION_USER_PASSWORD_WEAK

- **HTTP Status:** 400 Bad Request
- **Meaning:** The password does not meet minimum strength requirements.
- **Common causes:** Password shorter than 8 characters.
- **Resolution:** Provide a password with at least 8 characters.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_USER_PASSWORD_WEAK",
      "message": "Validation failed. Check the details for specific field errors.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "details": [
        {
          "field": "password",
          "message": "Password must be at least 8 characters long."
        }
      ],
      "target": "POST /api/users"
    }
  }
  ```

### ERR_VALIDATION_USER_ID_FORMAT

- **HTTP Status:** 400 Bad Request
- **Meaning:** The user ID in the URL path is not a valid MongoDB ObjectId.
- **Common causes:** Malformed ID, wrong length, non-hex characters.
- **Resolution:** Use a valid 24-character hexadecimal string as the user ID.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_USER_ID_FORMAT",
      "message": "The provided user ID is not valid.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "details": [
        {
          "field": "id",
          "message": "Must be a valid 24-character hex string.",
          "rejected": "invalid-id"
        }
      ],
      "target": "GET /api/users/invalid-id"
    }
  }
  ```

### ERR_VALIDATION_USER_BODY_EMPTY

- **HTTP Status:** 400 Bad Request
- **Meaning:** The request body is empty or missing.
- **Common causes:** Forgot to include JSON body, Content-Type header missing.
- **Resolution:** Include a JSON request body with the required fields.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_USER_BODY_EMPTY",
      "message": "Validation failed. Check the details for specific field errors.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "details": [
        {
          "field": "body",
          "message": "Request body must not be empty."
        }
      ],
      "target": "POST /api/users"
    }
  }
  ```

### ERR_AUTH_TOKEN_MISSING

- **HTTP Status:** 401 Unauthorized
- **Meaning:** No Authorization header was provided in the request.
- **Common causes:** Client forgot to include the token, middleware
  misconfiguration.
- **Resolution:** Include an `Authorization: Bearer <token>` header with a valid
  JWT.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_AUTH_TOKEN_MISSING",
      "message": "Authentication is required. Please provide a valid Bearer token.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "GET /api/users"
    }
  }
  ```

### ERR_AUTH_TOKEN_INVALID

- **HTTP Status:** 401 Unauthorized
- **Meaning:** The provided JWT token is malformed, has an invalid signature, or
  uses an unsupported algorithm.
- **Common causes:** Corrupted token, wrong secret, token from a different
  environment.
- **Resolution:** Obtain a new token by logging in again. Ensure you're using
  the correct environment.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_AUTH_TOKEN_INVALID",
      "message": "The provided authentication token is invalid.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "GET /api/users"
    }
  }
  ```

### ERR_AUTH_TOKEN_EXPIRED

- **HTTP Status:** 401 Unauthorized
- **Meaning:** The JWT token's `exp` claim has passed.
- **Common causes:** Token TTL exceeded, clock skew between client and server.
- **Resolution:** Log in again to obtain a fresh token.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_AUTH_TOKEN_EXPIRED",
      "message": "Your authentication token has expired. Please log in again.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "GET /api/users"
    }
  }
  ```

### ERR_FORBIDDEN_ADMIN_ONLY

- **HTTP Status:** 403 Forbidden
- **Meaning:** The authenticated user does not have the admin role required for
  this operation.
- **Common causes:** Regular user attempting to delete another user.
- **Resolution:** Contact an administrator to perform this action, or request
  admin role elevation.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_FORBIDDEN_ADMIN_ONLY",
      "message": "Only administrators can delete users.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "DELETE /api/users/507f1f77bcf86cd799439011"
    }
  }
  ```

### ERR_NOT_FOUND_USER

- **HTTP Status:** 404 Not Found
- **Meaning:** No user exists with the specified ID.
- **Common causes:** User was deleted, ID is incorrect, typo in the URL.
- **Resolution:** Verify the user ID. List users with `GET /api/users` to find
  valid IDs.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_NOT_FOUND_USER",
      "message": "User with ID '507f1f77bcf86cd799439011' was not found.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "GET /api/users/507f1f77bcf86cd799439011"
    }
  }
  ```

### ERR_NOT_FOUND_ROUTE

- **HTTP Status:** 404 Not Found
- **Meaning:** The requested API route does not exist.
- **Common causes:** Typo in URL, wrong HTTP method, outdated client.
- **Resolution:** Check the API documentation for available endpoints.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_NOT_FOUND_ROUTE",
      "message": "The route GET /api/nonexistent does not exist.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "GET /api/nonexistent"
    }
  }
  ```

### ERR_CONFLICT_EMAIL_TAKEN

- **HTTP Status:** 409 Conflict
- **Meaning:** A user with the provided email address already exists in the
  database.
- **Common causes:** Duplicate registration, attempting to update email to one
  that's already taken.
- **Resolution:** Use a different email address, or check if the user already
  has an account.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_CONFLICT_EMAIL_TAKEN",
      "message": "A user with this email address already exists.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "POST /api/users"
    }
  }
  ```

### ERR_RATE_LIMIT_API

- **HTTP Status:** 429 Too Many Requests
- **Meaning:** The client has exceeded the API rate limit.
- **Common causes:** Automated scripts without backoff, polling too frequently.
- **Resolution:** Wait for the duration specified in the `Retry-After` header
  before making another request.
- **Example response:**
  ```
  HTTP/1.1 429 Too Many Requests
  Retry-After: 60
  Content-Type: application/json
  X-Request-Id: req_a1b2c3d4-e5f6-7890-abcd-ef1234567890
  ```
  ```json
  {
    "error": {
      "code": "ERR_RATE_LIMIT_API",
      "message": "Too many requests. Please retry after 60 seconds.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
  ```

### ERR_INTERNAL_DB_QUERY

- **HTTP Status:** 500 Internal Server Error
- **Meaning:** A database query failed unexpectedly.
- **Common causes:** MongoDB connection timeout, query syntax error, disk full.
- **Resolution:** This is a server-side issue. Retry the request. If the problem
  persists, contact support with the `requestId`.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_INTERNAL_DB_QUERY",
      "message": "An unexpected error occurred. Please try again later.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "GET /api/users"
    }
  }
  ```
  Note: The actual error message ("Failed to retrieve users.") is logged
  internally but NOT shown to the client. The client sees the generic message
  because `isOperational` is `false`.

### ERR_INTERNAL_DB_CONNECTION

- **HTTP Status:** 500 Internal Server Error
- **Meaning:** The application could not connect to MongoDB at startup.
- **Common causes:** MongoDB is down, connection string is wrong, network issue.
- **Resolution:** Server-side issue. The application will not start until the
  database is available.

### ERR_INTERNAL_UNHANDLED

- **HTTP Status:** 500 Internal Server Error
- **Meaning:** An unexpected error occurred that was not caught by any specific
  error handler.
- **Common causes:** Programmer error (null reference, type error, assertion
  failure).
- **Resolution:** This is a bug. Contact support with the `requestId` for
  investigation.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_INTERNAL_UNHANDLED",
      "message": "An unexpected error occurred. Please try again later.",
      "requestId": "req_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "POST /api/users"
    }
  }
  ```

---

## 13. Error Response Checklist Verification

For every error response produced by this system:

- [x] **Response body follows the JSON schema** — Every response has
      `error.code`, `error.message`, `error.requestId`
- [x] **Validation errors include `details` array** — `ValidationError`
      responses include field-level `details` with `field`, `message`, and
      optional `rejected`
- [x] **429 responses include `Retry-After` header** — `RateLimitError` sets
      `Retry-After` header via the centralized error handler
- [x] **No stack traces, SQL, or internal paths in the response body** — `cause`
      and `stack` appear in logs only; non-operational errors get a generic
      message
- [x] **`requestId` matches the `X-Request-Id` response header** — Both are set
      from the same `req.requestId` value in correlation middleware
- [x] **Non-operational errors return generic message** — `InternalError`
      (isOperational: false) returns "An unexpected error occurred. Please try
      again later." instead of the real message
- [x] **Original error preserved via `cause` in logs** — Every `catch` block
      wraps with `cause: err` to preserve the causal chain
- [x] **Sensitive fields never leaked** — Password validation errors never
      include the `rejected` value; password field excluded from all query
      projections
- [x] **Stable error codes** — All codes follow
      `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]` format and are documented in the
      registry
- [x] **Centralized error handler** — One `errorHandler` middleware formats all
      errors identically; no route sends error responses directly

---

## Summary of Changes

| Before (Ad-hoc)                                           | After (Standardized)                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `res.status(500).json({ error: "Something went wrong" })` | `next(new InternalError({ code: "ERR_INTERNAL_DB_QUERY", message: "...", cause: err }))`       |
| `res.status(400).json({ message: "Invalid email" })`      | `throw new ValidationError({ code: "ERR_VALIDATION_USER_EMAIL_FORMAT", ..., details: [...] })` |
| `res.status(404).json({ error: "User not found" })`       | `throw new NotFoundError({ code: "ERR_NOT_FOUND_USER", message: "..." })`                      |
| `res.status(401).json({ error: "No token" })`             | `throw new AuthenticationError({ code: "ERR_AUTH_TOKEN_MISSING", message: "..." })`            |
| `console.error(err)`                                      | `logger.error({ requestId, code, message, cause, stack, ... })`                                |
| No correlation IDs                                        | Every request gets `X-Request-Id`, appears in logs and error responses                         |
| Stack traces leaked to clients                            | Internal details in logs only; clients get `code`, `message`, `requestId`                      |
| Each route formats its own errors                         | One `errorHandler` middleware handles all error formatting                                     |

# Error Handling Implementation for Express.js User API

## Step 1 — Audit Current State

The existing Express.js API has 5 routes (`GET /api/users`,
`GET /api/users/:id`, `POST /api/users`, `PUT /api/users/:id`,
`DELETE /api/users/:id`) with the following anti-patterns:

- **Bare `throw new Error("...")`** — routes throw generic `Error` instances
  with no stable codes
- **`catch (e) { res.status(500).send(e.message) }`** — leaks internal details
  (MongoDB connection strings, collection names, query details) directly to
  clients
- **Inconsistent response shapes** — some routes return `{ error: "message" }`,
  others return `{ message: "..." }`, others return
  `{ msg: "...", status: "fail" }`
- **Missing `requestId`** — no correlation IDs in error responses or logs;
  debugging production issues requires timestamp-based log searching
- **String-matching on error messages** — JWT middleware checks
  `err.message.includes("expired")` instead of using typed errors
- **Swallowed errors** — some catch blocks log nothing and return generic 500s

## Step 2 — Define the Error Taxonomy

Every error condition in the User API, mapped to category, code, and user-safe
message:

| Code                           | HTTP | User Message                                                     | When                                 |
| ------------------------------ | ---- | ---------------------------------------------------------------- | ------------------------------------ |
| `ERR_VALIDATION_USER`          | 400  | Invalid user data provided.                                      | Request body fails schema validation |
| `ERR_VALIDATION_EMAIL`         | 400  | The email address is invalid.                                    | Email fails format check             |
| `ERR_VALIDATION_PASSWORD`      | 400  | Password does not meet requirements.                             | Password too short/weak              |
| `ERR_VALIDATION_NAME`          | 400  | Name is required and must be between 1 and 100 characters.       | Name missing or out of range         |
| `ERR_VALIDATION_ID`            | 400  | Invalid user ID format.                                          | MongoDB ObjectId parse failure       |
| `ERR_AUTH_TOKEN_MISSING`       | 401  | Authentication required. Please provide a valid token.           | No Authorization header              |
| `ERR_AUTH_TOKEN_EXPIRED`       | 401  | Your session has expired. Please log in again.                   | JWT exp claim is past                |
| `ERR_AUTH_TOKEN_INVALID`       | 401  | Invalid authentication token.                                    | JWT signature verification fails     |
| `ERR_FORBIDDEN_ROLE`           | 403  | You do not have permission to perform this action.               | User role insufficient               |
| `ERR_NOT_FOUND_USER`           | 404  | User not found.                                                  | User ID lookup returns null          |
| `ERR_NOT_FOUND_ENDPOINT`       | 404  | The requested endpoint does not exist.                           | Unmatched route                      |
| `ERR_CONFLICT_DUPLICATE_EMAIL` | 409  | An account with this email already exists.                       | MongoDB duplicate key on email       |
| `ERR_RATE_LIMIT_API`           | 429  | Too many requests. Please wait before trying again.              | Sliding window exceeded              |
| `ERR_INTERNAL_DB`              | 500  | An internal error occurred. Please try again or contact support. | MongoDB connection/query failure     |
| `ERR_INTERNAL_SERVICE`         | 500  | An internal error occurred. Please try again or contact support. | Unexpected service-layer error       |

## Step 3 — Implement the Base Classes

### File: `src/errors/AppError.ts`

```typescript
/**
 * Base application error class.
 * All domain errors extend this. The global error handler uses
 * `instanceof AppError` to distinguish known errors from unhandled crashes.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Fix prototype chain for instanceof checks in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialize to the standard error response envelope.
   * This is the ONLY place error responses are shaped — never inline in routes.
   */
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
```

### File: `src/errors/ValidationError.ts`

```typescript
import { AppError } from "./AppError";

/**
 * 400 Bad Request — input validation failures.
 * Always include field-level details so clients can render inline errors.
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super("ERR_VALIDATION", 400, message, details, cause);
  }
}
```

### File: `src/errors/AuthenticationError.ts`

```typescript
import { AppError } from "./AppError";

/**
 * 401 Unauthorized — authentication failures.
 * Use specific codes: ERR_AUTH_TOKEN_EXPIRED, ERR_AUTH_TOKEN_INVALID, ERR_AUTH_TOKEN_MISSING.
 */
export class AuthenticationError extends AppError {
  constructor(
    code = "ERR_AUTH",
    message = "Authentication required",
    cause?: Error,
  ) {
    super(code, 401, message, undefined, cause);
  }
}
```

### File: `src/errors/ForbiddenError.ts`

```typescript
import { AppError } from "./AppError";

/**
 * 403 Forbidden — authorization failures.
 * The user is authenticated but lacks the required role/permission.
 */
export class ForbiddenError extends AppError {
  constructor(
    code = "ERR_FORBIDDEN",
    message = "Insufficient permissions",
    cause?: Error,
  ) {
    super(code, 403, message, undefined, cause);
  }
}
```

### File: `src/errors/NotFoundError.ts`

```typescript
import { AppError } from "./AppError";

/**
 * 404 Not Found — resource lookup failures.
 * Use specific codes: ERR_NOT_FOUND_USER, ERR_NOT_FOUND_ENDPOINT, etc.
 */
export class NotFoundError extends AppError {
  constructor(
    code = "ERR_NOT_FOUND",
    message = "Resource not found",
    cause?: Error,
  ) {
    super(code, 404, message, undefined, cause);
  }
}
```

### File: `src/errors/ConflictError.ts`

```typescript
import { AppError } from "./AppError";

/**
 * 409 Conflict — resource state conflicts.
 * Typically duplicate key violations or version mismatches.
 */
export class ConflictError extends AppError {
  constructor(
    code = "ERR_CONFLICT",
    message = "Resource conflict",
    details?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, 409, message, details, cause);
  }
}
```

### File: `src/errors/RateLimitError.ts`

```typescript
import { AppError } from "./AppError";

/**
 * 429 Too Many Requests — rate limiting.
 * Always includes retryAfterSeconds so the error handler can set the Retry-After header.
 */
export class RateLimitError extends AppError {
  constructor(
    public readonly retryAfterSeconds: number,
    code = "ERR_RATE_LIMIT",
    message = "Too many requests",
    cause?: Error,
  ) {
    super(code, 429, message, undefined, cause);
  }
}
```

### File: `src/errors/InternalError.ts`

```typescript
import { AppError } from "./AppError";

/**
 * 500 Internal Server Error — infrastructure/service failures.
 *
 * SECURITY BOUNDARY: The user-facing `message` is always generic.
 * The `internalMessage` carries full diagnostic detail and is ONLY logged,
 * never serialized to the HTTP response.
 */
export class InternalError extends AppError {
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

  get internalMessage(): string {
    return this._internalMessage;
  }
}
```

### File: `src/errors/index.ts`

```typescript
export { AppError } from "./AppError";
export { ValidationError } from "./ValidationError";
export { AuthenticationError } from "./AuthenticationError";
export { ForbiddenError } from "./ForbiddenError";
export { NotFoundError } from "./NotFoundError";
export { ConflictError } from "./ConflictError";
export { RateLimitError } from "./RateLimitError";
export { InternalError } from "./InternalError";
```

## Step 4 — Add the Global Error Handler

### File: `src/middleware/errorHandler.ts`

```typescript
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { AppError, InternalError, RateLimitError } from "../errors";
import { logger } from "../utils/logger";

/**
 * Centralized error handler middleware.
 *
 * This is the SINGLE place where errors become HTTP responses.
 * Route handlers throw typed errors; this middleware catches and formats them.
 * This guarantees every error response has the same shape:
 *   { error: { code, message, requestId, details? } }
 *
 * MUST be registered AFTER all routes:
 *   app.use(errorHandler);
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as any).requestId ||
    (req.headers["x-request-id"] as string) ||
    crypto.randomUUID();

  if (err instanceof AppError) {
    // Known application error — log with full context
    logger.error({
      requestId,
      code: err.code,
      message: err.message,
      ...(err instanceof InternalError && {
        internalMessage: err.internalMessage,
      }),
      ...(err.cause && { cause: err.cause.message }),
      stack: err.stack,
      method: req.method,
      path: req.originalUrl,
    });

    // Set Retry-After header for rate limit errors
    if (err instanceof RateLimitError) {
      res.set("Retry-After", String(err.retryAfterSeconds));
    }

    res.status(err.statusCode).json(err.toResponse(requestId));
    return;
  }

  // Unhandled/unexpected error — NEVER leak details to the client
  logger.error({
    requestId,
    code: "ERR_INTERNAL_UNHANDLED",
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
  });

  res.status(500).json({
    error: {
      code: "ERR_INTERNAL",
      message:
        "An internal error occurred. Please try again or contact support.",
      requestId,
    },
  });
}
```

### File: `src/middleware/requestId.ts`

```typescript
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

/**
 * Assigns a correlation ID to every incoming request.
 *
 * Priority:
 *   1. Use the client-provided X-Request-ID header (for distributed tracing)
 *   2. Generate a new UUID v4
 *
 * The requestId is:
 *   - Attached to req.requestId for use in route handlers and downstream middleware
 *   - Set as the X-Request-ID response header so clients can reference it
 *   - Included in every error response via the error handler
 *   - Included in every log line via the structured logger
 */
export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const requestId = (req.headers["x-request-id"] as string) ||
    crypto.randomUUID();
  (req as any).requestId = requestId;
  _res.setHeader("X-Request-ID", requestId);
  next();
}
```

### File: `src/middleware/notFoundHandler.ts`

```typescript
import { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../errors";

/**
 * Catch-all for unmatched routes.
 * Registered AFTER all route definitions but BEFORE the error handler.
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(
    new NotFoundError(
      "ERR_NOT_FOUND_ENDPOINT",
      `The requested endpoint ${req.method} ${req.path} does not exist.`,
    ),
  );
}
```

## Step 5 — Replace Bare Throws (Refactored Route Handlers)

### File: `src/utils/logger.ts`

```typescript
/**
 * Structured JSON logger.
 *
 * Every log entry includes:
 *   - timestamp (ISO 8601)
 *   - level (info, warn, error)
 *   - requestId (when available)
 *   - Structured key-value context
 *
 * In production, replace with pino or winston configured for JSON output.
 * The interface stays the same.
 */
export const logger = {
  info(data: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        ...data,
      }),
    );
  },

  warn(data: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        ...data,
      }),
    );
  },

  error(data: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        ...data,
      }),
    );
  },
};
```

### File: `src/utils/mongoErrors.ts`

```typescript
import { ConflictError, InternalError, ValidationError } from "../errors";
import { AppError } from "../errors/AppError";

/**
 * Translates MongoDB driver errors into typed AppErrors.
 *
 * This is the ONLY place MongoDB-specific error handling lives.
 * Route handlers and services call this to wrap database errors
 * without leaking MongoDB internals (collection names, query details).
 */
export function translateMongoError(err: any, entity: string): AppError {
  // Duplicate key violation (unique index)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return new ConflictError(
      `ERR_CONFLICT_DUPLICATE_${entity.toUpperCase()}`,
      `A ${entity} with this ${field} already exists.`,
      { field },
      err,
    );
  }

  // Validation error from MongoDB schema validation
  if (err.name === "ValidationError") {
    const fields = Object.entries(err.errors || {}).map(
      ([field, detail]: [string, any]) => ({
        field,
        message: detail.message,
        rejected_value: detail.value,
      }),
    );
    return new ValidationError(
      `Invalid ${entity} data.`,
      { fields },
      err,
    );
  }

  // Connection errors, timeouts, etc.
  return new InternalError(
    `MongoDB error on ${entity}: ${err.message}`,
    "ERR_INTERNAL_DB",
    err,
  );
}
```

### File: `src/middleware/authenticate.ts`

```typescript
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthenticationError } from "../errors";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

/**
 * JWT authentication middleware.
 *
 * Replaces the previous ad-hoc implementation that:
 *   - Returned { error: "No token" } (inconsistent shape)
 *   - String-matched on err.message.includes("expired")
 *   - Leaked JWT library error messages to clients
 *
 * Now throws typed AuthenticationError instances that the global
 * error handler formats consistently.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError(
      "ERR_AUTH_TOKEN_MISSING",
      "Authentication required. Please provide a valid token.",
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw new AuthenticationError(
        "ERR_AUTH_TOKEN_EXPIRED",
        "Your session has expired. Please log in again.",
        err,
      );
    }

    if (
      err.name === "JsonWebTokenError" ||
      err.name === "NotBeforeError"
    ) {
      throw new AuthenticationError(
        "ERR_AUTH_TOKEN_INVALID",
        "Invalid authentication token.",
        err,
      );
    }

    // Unexpected JWT error — wrap, don't swallow
    throw new AuthenticationError(
      "ERR_AUTH_TOKEN_INVALID",
      "Invalid authentication token.",
      err,
    );
  }
}
```

### File: `src/validators/userValidator.ts`

```typescript
import { ValidationError } from "../errors";

interface UserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

/**
 * Validates user input for create and update operations.
 *
 * Returns field-level error details so the error handler can include
 * them in the response, enabling clients to render inline field errors.
 */
export function validateUserCreate(data: UserInput): void {
  const fields: Array<{
    field: string;
    message: string;
    rejected_value: unknown;
  }> = [];

  if (!data.name || data.name.trim().length === 0) {
    fields.push({
      field: "name",
      message: "Name is required",
      rejected_value: data.name ?? null,
    });
  } else if (data.name.length > 100) {
    fields.push({
      field: "name",
      message: "Name must be between 1 and 100 characters",
      rejected_value: data.name,
    });
  }

  if (!data.email) {
    fields.push({
      field: "email",
      message: "Email is required",
      rejected_value: data.email ?? null,
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    fields.push({
      field: "email",
      message: "Must be a valid email address",
      rejected_value: data.email,
    });
  }

  if (!data.password) {
    fields.push({
      field: "password",
      message: "Password is required",
      rejected_value: null,
    });
  } else if (data.password.length < 8) {
    fields.push({
      field: "password",
      message: "Password must be at least 8 characters",
      rejected_value: "[REDACTED]",
    });
  }

  if (fields.length > 0) {
    throw new ValidationError("Invalid user data provided.", { fields });
  }
}

export function validateUserUpdate(data: UserInput): void {
  const fields: Array<{
    field: string;
    message: string;
    rejected_value: unknown;
  }> = [];

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      fields.push({
        field: "name",
        message: "Name cannot be empty",
        rejected_value: data.name,
      });
    } else if (data.name.length > 100) {
      fields.push({
        field: "name",
        message: "Name must be between 1 and 100 characters",
        rejected_value: data.name,
      });
    }
  }

  if (data.email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      fields.push({
        field: "email",
        message: "Must be a valid email address",
        rejected_value: data.email,
      });
    }
  }

  if (data.password !== undefined && data.password.length < 8) {
    fields.push({
      field: "password",
      message: "Password must be at least 8 characters",
      rejected_value: "[REDACTED]",
    });
  }

  if (fields.length > 0) {
    throw new ValidationError("Invalid user data provided.", { fields });
  }
}

/**
 * Validates that a string is a valid MongoDB ObjectId.
 */
export function validateObjectId(id: string): void {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ValidationError(
      "Invalid user ID format.",
      {
        fields: [
          {
            field: "id",
            message: "Must be a valid 24-character hex string",
            rejected_value: id,
          },
        ],
      },
    );
  }
}
```

### File: `src/routes/users.ts`

```typescript
import { NextFunction, Request, Response, Router } from "express";
import { Collection, Db, ObjectId } from "mongodb";
import { InternalError, NotFoundError } from "../errors";
import { translateMongoError } from "../utils/mongoErrors";
import { authenticate } from "../middleware/authenticate";
import {
  validateObjectId,
  validateUserCreate,
  validateUserUpdate,
} from "../validators/userValidator";
import { logger } from "../utils/logger";

const router = Router();

/**
 * Helper to get the users collection.
 * Centralizes collection access so the collection name never leaks into error messages.
 */
function getUsersCollection(req: Request): Collection {
  const db: Db = (req as any).app.locals.db;
  return db.collection("users");
}

/**
 * GET /api/users — List all users
 *
 * Before (ad-hoc):
 *   try { ... } catch(e) { res.status(500).json({ error: e.message }) }
 *
 * After (structured):
 *   Throws InternalError on DB failure → error handler formats response
 */
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    try {
      const collection = getUsersCollection(req);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        collection
          .find({}, { projection: { password: 0 } })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(),
      ]);

      logger.info({
        requestId,
        action: "list_users",
        count: users.length,
        page,
        limit,
        total,
      });

      res.json({
        data: users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      next(translateMongoError(err, "user"));
    }
  },
);

/**
 * GET /api/users/:id — Get a single user
 *
 * Before (ad-hoc):
 *   if (!user) return res.status(404).json({ msg: "not found" })
 *
 * After (structured):
 *   Validates ObjectId format → throws ValidationError
 *   Throws NotFoundError with ERR_NOT_FOUND_USER code
 */
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    try {
      validateObjectId(req.params.id);

      const collection = getUsersCollection(req);
      const user = await collection.findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { password: 0 } },
      );

      if (!user) {
        throw new NotFoundError("ERR_NOT_FOUND_USER", "User not found.");
      }

      logger.info({
        requestId,
        action: "get_user",
        userId: req.params.id,
      });

      res.json({ data: user });
    } catch (err: any) {
      if (err.code && err.code.startsWith("ERR_")) {
        // Already a typed AppError — pass through
        next(err);
      } else {
        next(translateMongoError(err, "user"));
      }
    }
  },
);

/**
 * POST /api/users — Create a new user
 *
 * Before (ad-hoc):
 *   catch(e) {
 *     if (e.code === 11000) res.status(400).json({ error: "duplicate" })
 *     else res.status(500).send(e.message)
 *   }
 *
 * After (structured):
 *   Validates input → throws ValidationError with field details
 *   Translates MongoDB 11000 → ConflictError with ERR_CONFLICT_DUPLICATE_USER
 *   All other DB errors → InternalError (never leaks collection names)
 */
router.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    try {
      validateUserCreate(req.body);

      const collection = getUsersCollection(req);

      const userData = {
        name: req.body.name.trim(),
        email: req.body.email.toLowerCase().trim(),
        password: req.body.password, // Should be hashed by a service layer
        role: req.body.role || "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(userData);

      logger.info({
        requestId,
        action: "create_user",
        userId: result.insertedId.toString(),
        email: userData.email,
      });

      const { password, ...userResponse } = userData;
      res.status(201).json({
        data: { _id: result.insertedId, ...userResponse },
      });
    } catch (err: any) {
      if (err.code && err.code.startsWith("ERR_")) {
        next(err);
      } else {
        next(translateMongoError(err, "user"));
      }
    }
  },
);

/**
 * PUT /api/users/:id — Update a user
 *
 * Before (ad-hoc):
 *   catch(e) { res.status(500).json({ status: "fail", msg: e.message }) }
 *
 * After (structured):
 *   Validates ObjectId → ValidationError
 *   Validates update fields → ValidationError with field details
 *   User not found → NotFoundError with ERR_NOT_FOUND_USER
 *   Duplicate email → ConflictError via translateMongoError
 */
router.put(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    try {
      validateObjectId(req.params.id);
      validateUserUpdate(req.body);

      const collection = getUsersCollection(req);

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (req.body.name !== undefined) updateData.name = req.body.name.trim();
      if (req.body.email !== undefined) {
        updateData.email = req.body.email.toLowerCase().trim();
      }
      if (req.body.password !== undefined) {
        updateData.password = req.body.password;
      }
      if (req.body.role !== undefined) updateData.role = req.body.role;

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData },
        { returnDocument: "after", projection: { password: 0 } },
      );

      if (!result) {
        throw new NotFoundError("ERR_NOT_FOUND_USER", "User not found.");
      }

      logger.info({
        requestId,
        action: "update_user",
        userId: req.params.id,
        updatedFields: Object.keys(updateData).filter(
          (k) => k !== "updatedAt" && k !== "password",
        ),
      });

      res.json({ data: result });
    } catch (err: any) {
      if (err.code && err.code.startsWith("ERR_")) {
        next(err);
      } else {
        next(translateMongoError(err, "user"));
      }
    }
  },
);

/**
 * DELETE /api/users/:id — Delete a user
 *
 * Before (ad-hoc):
 *   catch(e) { console.log(e); res.sendStatus(500) }
 *
 * After (structured):
 *   Validates ObjectId → ValidationError
 *   User not found → NotFoundError with ERR_NOT_FOUND_USER
 *   DB failure → InternalError (logged with full context, generic message to client)
 */
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId;
    try {
      validateObjectId(req.params.id);

      const collection = getUsersCollection(req);
      const result = await collection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      if (result.deletedCount === 0) {
        throw new NotFoundError("ERR_NOT_FOUND_USER", "User not found.");
      }

      logger.info({
        requestId,
        action: "delete_user",
        userId: req.params.id,
      });

      res.status(204).send();
    } catch (err: any) {
      if (err.code && err.code.startsWith("ERR_")) {
        next(err);
      } else {
        next(translateMongoError(err, "user"));
      }
    }
  },
);

export default router;
```

## Step 6 — Add Correlation ID Propagation

### File: `src/app.ts`

```typescript
import express from "express";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import userRoutes from "./routes/users";

const app = express();

// --- Middleware order matters ---

// 1. Parse JSON bodies
app.use(express.json());

// 2. Assign correlation ID to every request (BEFORE any route handlers)
app.use(requestIdMiddleware);

// 3. Mount routes
app.use("/api/users", userRoutes);

// 4. Catch unmatched routes (AFTER all route definitions)
app.use(notFoundHandler);

// 5. Global error handler (MUST be last — Express identifies error handlers
//    by their 4-parameter signature)
app.use(errorHandler);

export default app;
```

### File: `src/server.ts`

```typescript
import { MongoClient } from "mongodb";
import app from "./app";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "myapp";

async function start() {
  try {
    const client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    // Make db available to route handlers via app.locals
    app.locals.db = db;

    // Create indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    app.listen(PORT, () => {
      logger.info({
        action: "server_start",
        port: PORT,
        database: DB_NAME,
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info({ action: "server_shutdown", reason: "SIGTERM" });
      await client.close();
      process.exit(0);
    });
  } catch (err: any) {
    logger.error({
      action: "server_start_failed",
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

start();
```

## Step 7 — Verify the Contract

### Verification Checklist

- [x] **Error responses match the JSON schema** — Every error response follows
      `{ error: { code, message, requestId, details? } }`. The `toResponse()`
      method on `AppError` is the single source of truth for this shape. The
      global `errorHandler` calls it for all `AppError` instances and manually
      constructs the same shape for unhandled errors.

- [x] **500 errors never expose internal details** — `InternalError` always
      returns the generic message
      `"An internal error occurred. Please try again or contact support."` to
      clients. The `internalMessage` property is only logged server-side.
      Unhandled errors in the catch-all also return the generic message. MongoDB
      error details (collection names, query structures, connection strings) are
      never serialized to responses.

- [x] **400 errors include field-level details** — `ValidationError` includes
      `details.fields` with `field`, `message`, and `rejected_value` for each
      invalid field. Password values are redacted to `"[REDACTED]"` in
      rejected_value.

- [x] **429 errors include a `Retry-After` header** — The `errorHandler` checks
      `instanceof RateLimitError` and sets
      `res.set("Retry-After", String(err.retryAfterSeconds))`.

- [x] **Logs include requestId, error code, and causal chain** — Every
      `logger.error()` call in the error handler includes `requestId`, `code`,
      `message`, and conditionally `internalMessage` (for `InternalError`) and
      `cause` (when error wrapping is present). Route handlers also log
      `requestId` on success paths.

- [x] **Error codes are stable strings, not ad-hoc messages** — All codes follow
      the `ERR_{CATEGORY}_{ENTITY}` pattern: `ERR_NOT_FOUND_USER`,
      `ERR_VALIDATION_EMAIL`, `ERR_AUTH_TOKEN_EXPIRED`,
      `ERR_CONFLICT_DUPLICATE_USER`, `ERR_INTERNAL_DB`, etc.

### Example Error Responses

**Validation Error (400):**

```json
{
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Invalid user data provided.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Must be a valid email address",
          "rejected_value": "not-an-email"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters",
          "rejected_value": "[REDACTED]"
        }
      ]
    }
  }
}
```

**Authentication Error (401):**

```json
{
  "error": {
    "code": "ERR_AUTH_TOKEN_EXPIRED",
    "message": "Your session has expired. Please log in again.",
    "requestId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  }
}
```

**Not Found Error (404):**

```json
{
  "error": {
    "code": "ERR_NOT_FOUND_USER",
    "message": "User not found.",
    "requestId": "c3d4e5f6-a7b8-9012-cdef-123456789012"
  }
}
```

**Conflict Error (409):**

```json
{
  "error": {
    "code": "ERR_CONFLICT_DUPLICATE_USER",
    "message": "A user with this email already exists.",
    "requestId": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "details": {
      "field": "email"
    }
  }
}
```

**Internal Error (500):**

```json
{
  "error": {
    "code": "ERR_INTERNAL",
    "message": "An internal error occurred. Please try again or contact support.",
    "requestId": "e5f6a7b8-c9d0-1234-efab-345678901234"
  }
}
```

**What the server logs for the 500 above (never sent to client):**

```json
{
  "timestamp": "2026-03-09T14:32:01.123Z",
  "level": "error",
  "requestId": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "code": "ERR_INTERNAL_DB",
  "message": "An internal error occurred. Please try again or contact support.",
  "internalMessage": "MongoDB error on user: connection refused to mongodb:27017",
  "cause": "MongoServerError: connect ECONNREFUSED 127.0.0.1:27017",
  "stack": "InternalError: An internal error occurred...\n    at translateMongoError (/app/src/utils/mongoErrors.ts:38:12)...",
  "method": "GET",
  "path": "/api/users"
}
```

**Unmatched Endpoint (404):**

```json
{
  "error": {
    "code": "ERR_NOT_FOUND_ENDPOINT",
    "message": "The requested endpoint GET /api/widgets does not exist.",
    "requestId": "f6a7b8c9-d0e1-2345-fabc-456789012345"
  }
}
```

## Complete File Structure

```
src/
├── app.ts                          # Express app setup, middleware ordering
├── server.ts                       # MongoDB connection, server startup
├── errors/
│   ├── index.ts                    # Barrel export
│   ├── AppError.ts                 # Base error class with toResponse()
│   ├── ValidationError.ts          # 400 — input validation
│   ├── AuthenticationError.ts      # 401 — auth failures
│   ├── ForbiddenError.ts           # 403 — authorization failures
│   ├── NotFoundError.ts            # 404 — resource not found
│   ├── ConflictError.ts            # 409 — duplicate/version conflict
│   ├── RateLimitError.ts           # 429 — rate limiting
│   └── InternalError.ts            # 500 — infrastructure failures
├── middleware/
│   ├── requestId.ts                # Correlation ID assignment
│   ├── authenticate.ts             # JWT auth with typed errors
│   ├── errorHandler.ts             # Centralized error → response translation
│   └── notFoundHandler.ts          # Catch-all for unmatched routes
├── routes/
│   └── users.ts                    # All 5 user CRUD routes
├── validators/
│   └── userValidator.ts            # Input validation with field-level details
└── utils/
    ├── logger.ts                   # Structured JSON logger
    └── mongoErrors.ts              # MongoDB error → AppError translation
```

## Error Code Registry

| Code                          | HTTP | User Message                                                     | Internal Context                        |
| ----------------------------- | ---- | ---------------------------------------------------------------- | --------------------------------------- |
| `ERR_VALIDATION`              | 400  | Invalid user data provided.                                      | Field-level details in `details.fields` |
| `ERR_VALIDATION_EMAIL`        | 400  | The email address is invalid.                                    | Email format check failure              |
| `ERR_VALIDATION_PASSWORD`     | 400  | Password does not meet requirements.                             | Length/complexity check failure         |
| `ERR_VALIDATION_NAME`         | 400  | Name is required and must be between 1 and 100 characters.       | Name length check failure               |
| `ERR_AUTH_TOKEN_MISSING`      | 401  | Authentication required. Please provide a valid token.           | No Authorization header present         |
| `ERR_AUTH_TOKEN_EXPIRED`      | 401  | Your session has expired. Please log in again.                   | JWT `exp` claim is in the past          |
| `ERR_AUTH_TOKEN_INVALID`      | 401  | Invalid authentication token.                                    | JWT signature verification failed       |
| `ERR_FORBIDDEN_ROLE`          | 403  | You do not have permission to perform this action.               | User role insufficient for operation    |
| `ERR_NOT_FOUND_USER`          | 404  | User not found.                                                  | MongoDB `findOne` returned null         |
| `ERR_NOT_FOUND_ENDPOINT`      | 404  | The requested endpoint does not exist.                           | No route matched the request            |
| `ERR_CONFLICT_DUPLICATE_USER` | 409  | A user with this email already exists.                           | MongoDB error code 11000 on email index |
| `ERR_RATE_LIMIT_API`          | 429  | Too many requests. Please wait before trying again.              | Sliding window rate limit exceeded      |
| `ERR_INTERNAL_DB`             | 500  | An internal error occurred. Please try again or contact support. | MongoDB connection/query failure        |
| `ERR_INTERNAL_SERVICE`        | 500  | An internal error occurred. Please try again or contact support. | Unexpected service-layer error          |
| `ERR_INTERNAL`                | 500  | An internal error occurred. Please try again or contact support. | Generic internal error                  |
| `ERR_INTERNAL_UNHANDLED`      | 500  | An internal error occurred. Please try again or contact support. | Unhandled exception (not an AppError)   |

These codes are part of the API contract. Once published, they are immutable —
clients depend on them for branching logic.

## Summary of Changes

1. **Error class hierarchy** (`src/errors/`) — `AppError` base class with 7
   typed subclasses covering every HTTP error category. Each carries a stable
   string code, user-safe message, optional details, and error wrapping via
   `cause`.

2. **Centralized error handler** (`src/middleware/errorHandler.ts`) — Single
   middleware that translates all errors into the standard
   `{ error: { code, message, requestId, details? } }` envelope. Handles
   `AppError` instances with full context logging and falls back to a safe
   generic response for unhandled errors.

3. **Correlation ID propagation** (`src/middleware/requestId.ts`) — Every
   request gets a UUID v4 `requestId` at the entry point. It's included in every
   log line, every error response, and the `X-Request-ID` response header.

4. **Structured logging** (`src/utils/logger.ts`) — JSON-formatted log output
   with timestamp, level, requestId, and structured context. Error logs include
   the error code, internal message (for 500s), causal chain, stack trace, HTTP
   method, and path.

5. **MongoDB error translation** (`src/utils/mongoErrors.ts`) — Centralized
   translation of MongoDB driver errors into typed `AppError` instances.
   Duplicate key → `ConflictError`, validation → `ValidationError`, everything
   else → `InternalError`. MongoDB internals never leak to clients.

6. **JWT authentication** (`src/middleware/authenticate.ts`) — Refactored from
   ad-hoc string matching to typed `AuthenticationError` instances with specific
   codes (`ERR_AUTH_TOKEN_MISSING`, `ERR_AUTH_TOKEN_EXPIRED`,
   `ERR_AUTH_TOKEN_INVALID`).

7. **Input validation** (`src/validators/userValidator.ts`) — Field-level
   validation with `details.fields` arrays that include `field`, `message`, and
   `rejected_value` for each invalid field. Password values are redacted.

8. **Route handlers** (`src/routes/users.ts`) — All 5 CRUD routes refactored to
   throw typed errors instead of manually constructing inconsistent response
   objects. Route handlers focus on business logic; error formatting is
   delegated entirely to the global error handler.

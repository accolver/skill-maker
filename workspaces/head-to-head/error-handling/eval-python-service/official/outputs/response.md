# Error Handling Implementation: Python Order Service

## Step 1 — Audit Current State

The existing service has these anti-patterns:

| Anti-Pattern Found                             | Location                          | Example                                         |
| ---------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| Bare `except:` clauses                         | All functions                     | `except: print("something went wrong")`         |
| `print()` instead of structured logging        | All functions                     | `print(f"Error: {e}")`                          |
| `raise Exception("...")` with generic messages | `create_order`, `process_payment` | `raise Exception("Order creation failed")`      |
| No correlation IDs                             | Entire service                    | No request tracing capability                   |
| Internal details leaked to callers             | `get_order`, `sync_inventory`     | Raw database/HTTP errors propagated             |
| No error wrapping — causal chain destroyed     | All catch blocks                  | Original exceptions discarded                   |
| Inconsistent error response shapes             | Across all functions              | Some return dicts, some raise, some return None |

## Step 2 — Define the Error Taxonomy

Every error condition in this service, mapped to a code, HTTP status, and
user-safe message:

| Code                          | HTTP | User Message                                                     | When                                 |
| ----------------------------- | ---- | ---------------------------------------------------------------- | ------------------------------------ |
| `ERR_VALIDATION_ORDER`        | 400  | The order data is invalid.                                       | Missing/malformed order fields       |
| `ERR_VALIDATION_ORDER_STATUS` | 400  | The order status value is invalid.                               | Invalid status transition            |
| `ERR_VALIDATION_PAYMENT`      | 400  | The payment information is invalid.                              | Missing/malformed payment fields     |
| `ERR_NOT_FOUND_ORDER`         | 404  | Order not found.                                                 | Order ID lookup returns None         |
| `ERR_CONFLICT_ORDER`          | 409  | An order with this reference already exists.                     | Duplicate order constraint violation |
| `ERR_CONFLICT_ORDER_STATUS`   | 409  | The order status cannot be changed to the requested value.       | Invalid status transition            |
| `ERR_INTERNAL_DB`             | 500  | An internal error occurred. Please try again or contact support. | Database connection/query failure    |
| `ERR_INTERNAL_SERVICE`        | 500  | An internal error occurred. Please try again or contact support. | External API call failure            |
| `ERR_INTERNAL_PAYMENT`        | 500  | An internal error occurred. Please try again or contact support. | Payment gateway failure              |
| `ERR_INTERNAL_INVENTORY`      | 500  | An internal error occurred. Please try again or contact support. | Inventory sync failure               |
| `ERR_RATE_LIMIT_API`          | 429  | Too many requests. Please wait before trying again.              | External API rate limit hit          |

## Step 3 — Implement the Base Classes

### File: `errors.py` — Shared Error Module

```python
"""
Unified error taxonomy for the order service.

All application errors inherit from AppError. Each subclass maps to an HTTP
status code category. Error codes follow the format: ERR_{CATEGORY}_{ENTITY}[_{DETAIL}].

This module is the single source of truth for error types — every layer
imports from here.
"""

from __future__ import annotations


class AppError(Exception):
    """Base application error with stable code, HTTP status, and user-safe message."""

    def __init__(
        self,
        code: str,
        status_code: int,
        message: str,
        details: dict | None = None,
        cause: Exception | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.message = message
        self.details = details
        # Python's explicit exception chaining
        self.__cause__ = cause

    def to_response(self, request_id: str) -> dict:
        """Serialize to the standard error response JSON shape."""
        resp = {
            "error": {
                "code": self.code,
                "message": self.message,
                "requestId": request_id,
            }
        }
        if self.details:
            resp["error"]["details"] = self.details
        return resp


class ValidationError(AppError):
    """400 — Client sent invalid input."""

    def __init__(
        self,
        message: str,
        details: dict | None = None,
        cause: Exception | None = None,
        code: str = "ERR_VALIDATION",
    ):
        super().__init__(code, 400, message, details, cause)


class AuthenticationError(AppError):
    """401 — Missing or invalid credentials."""

    def __init__(
        self,
        code: str = "ERR_AUTH",
        message: str = "Authentication required",
        cause: Exception | None = None,
    ):
        super().__init__(code, 401, message, cause=cause)


class ForbiddenError(AppError):
    """403 — Authenticated but not authorized."""

    def __init__(
        self,
        code: str = "ERR_FORBIDDEN",
        message: str = "Insufficient permissions",
        cause: Exception | None = None,
    ):
        super().__init__(code, 403, message, cause=cause)


class NotFoundError(AppError):
    """404 — Requested resource does not exist."""

    def __init__(
        self,
        code: str = "ERR_NOT_FOUND",
        message: str = "Resource not found",
        cause: Exception | None = None,
    ):
        super().__init__(code, 404, message, cause=cause)


class ConflictError(AppError):
    """409 — Request conflicts with current resource state."""

    def __init__(
        self,
        code: str = "ERR_CONFLICT",
        message: str = "Resource conflict",
        details: dict | None = None,
        cause: Exception | None = None,
    ):
        super().__init__(code, 409, message, details, cause)


class RateLimitError(AppError):
    """429 — Too many requests."""

    def __init__(
        self,
        retry_after_seconds: int,
        code: str = "ERR_RATE_LIMIT",
        message: str = "Too many requests. Please wait before trying again.",
        cause: Exception | None = None,
    ):
        super().__init__(code, 429, message, cause=cause)
        self.retry_after_seconds = retry_after_seconds


class InternalError(AppError):
    """500 — Server-side failure. User-safe message is always generic."""

    def __init__(
        self,
        internal_message: str,
        code: str = "ERR_INTERNAL",
        cause: Exception | None = None,
    ):
        super().__init__(
            code,
            500,
            "An internal error occurred. Please try again or contact support.",
            cause=cause,
        )
        self._internal_message = internal_message

    @property
    def internal_message(self) -> str:
        return self._internal_message
```

## Step 4 — Add the Global Error Handler (FastAPI Middleware)

### File: `middleware.py` — Centralized Error-to-Response Translation

```python
"""
Global error handler middleware for FastAPI.

This is the single point where errors become HTTP responses. Route handlers
raise typed errors; this middleware catches and formats them into the standard
JSON error shape. Unhandled exceptions are caught here too — they never leak
internal details.
"""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from errors import AppError, InternalError, RateLimitError

logger = logging.getLogger("order_service")


def register_error_handlers(app: FastAPI) -> None:
    """Register exception handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))

        # Build structured log payload
        log_payload = {
            "request_id": request_id,
            "code": exc.code,
            "message": exc.message,
            "path": str(request.url),
            "method": request.method,
        }

        # For InternalError, log the internal message (never the user-safe one)
        if isinstance(exc, InternalError):
            log_payload["internal_message"] = exc.internal_message

        # Preserve the causal chain in logs
        if exc.__cause__:
            log_payload["cause"] = str(exc.__cause__)
            cause = exc.__cause__
            chain = []
            while cause is not None:
                chain.append(f"{type(cause).__name__}: {cause}")
                cause = getattr(cause, "__cause__", None)
            if chain:
                log_payload["cause_chain"] = chain

        if exc.details:
            log_payload["details"] = exc.details

        logger.error("AppError raised", extra=log_payload)

        headers = {}
        if isinstance(exc, RateLimitError):
            headers["Retry-After"] = str(exc.retry_after_seconds)

        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_response(request_id),
            headers=headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all for unhandled exceptions. Never leaks internal details."""
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))

        logger.error(
            "Unhandled exception",
            extra={
                "request_id": request_id,
                "error_type": type(exc).__name__,
                "message": str(exc),
                "path": str(request.url),
                "method": request.method,
            },
            exc_info=True,  # Includes full traceback in server logs
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "ERR_INTERNAL",
                    "message": "An internal error occurred. Please try again or contact support.",
                    "requestId": request_id,
                }
            },
        )
```

## Step 5 — Replace Bare Throws (Refactored Service)

### File: `correlation.py` — Correlation ID Propagation via contextvars

```python
"""
Correlation ID propagation using Python's contextvars.

A correlation ID (request_id) is set once at the request entry point and is
automatically available to every log line and downstream call within that
request's async context — no manual threading required.
"""

from __future__ import annotations

import contextvars
import uuid

# Context variable holding the current request's correlation ID
correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default=""
)


def get_correlation_id() -> str:
    """Return the current correlation ID, or empty string if not set."""
    return correlation_id_var.get()


def set_correlation_id(value: str | None = None) -> str:
    """Set the correlation ID for the current context. Generates a UUID v4 if none provided."""
    cid = value or str(uuid.uuid4())
    correlation_id_var.set(cid)
    return cid
```

### File: `structured_logging.py` — Structured Logging with Correlation IDs

```python
"""
Structured logging configuration.

Every log record automatically includes the correlation ID from the current
request context. Uses the standard logging module with a JSON-like formatter
for production and a human-readable formatter for development.
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

from correlation import get_correlation_id


class StructuredFormatter(logging.Formatter):
    """Formats log records as JSON with correlation ID injected automatically."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }

        # Merge any extra fields passed via `extra={...}`
        # Standard LogRecord attributes to exclude from extras
        standard_attrs = {
            "name", "msg", "args", "created", "relativeCreated",
            "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "filename", "module", "pathname", "thread", "threadName",
            "process", "processName", "levelname", "levelno", "message",
            "msecs", "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in standard_attrs and not key.startswith("_"):
                log_entry[key] = value

        # Include exception info if present
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    """Configure the root logger with structured JSON output."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(handler)

    # Prevent duplicate handlers on repeated calls
    root_logger.handlers = [handler]
```

### File: `request_middleware.py` — FastAPI Middleware for Correlation ID Injection

```python
"""
FastAPI middleware that sets the correlation ID at the entry point of every request.

If the client sends an X-Request-ID header, that value is used. Otherwise a
UUID v4 is generated. The correlation ID is set in the contextvars context so
every log line within the request automatically includes it.
"""

from __future__ import annotations

import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from correlation import set_correlation_id


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Injects a correlation ID into every request context."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Use client-provided ID or generate one
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        set_correlation_id(request_id)

        response = await call_next(request)
        # Echo the correlation ID back in the response headers
        response.headers["X-Request-ID"] = request_id
        return response
```

### File: `order_service.py` — The Refactored Service

```python
"""
Order service with comprehensive, structured error handling.

BEFORE (anti-patterns):
    - Bare `except:` clauses that swallow errors silently
    - `print()` statements instead of structured logging
    - `raise Exception("...")` with generic messages
    - No correlation IDs for request tracing
    - Internal details (table names, connection strings) leaked to callers
    - Original exception chain destroyed on re-raise

AFTER (this file):
    - Typed exception classes with stable string error codes
    - Error wrapping that preserves the full causal chain via __cause__
    - Structured JSON logging with automatic correlation ID injection
    - User-safe messages separated from internal diagnostic messages
    - Consistent error response shape across all functions
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

import httpx
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from correlation import get_correlation_id
from errors import (
    ConflictError,
    InternalError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)

logger = logging.getLogger("order_service")

# ---------------------------------------------------------------------------
# Valid order statuses and allowed transitions
# ---------------------------------------------------------------------------
VALID_STATUSES = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
STATUS_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"processing", "cancelled"},
    "processing": {"shipped", "cancelled"},
    "shipped": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
}


# ---------------------------------------------------------------------------
# create_order
# ---------------------------------------------------------------------------
async def create_order(session: AsyncSession, order_data: dict[str, Any]) -> dict:
    """
    Create a new order in the database.

    Raises:
        ValidationError: If required fields are missing or invalid.
        ConflictError: If an order with the same reference already exists.
        InternalError: If the database operation fails for any other reason.
    """
    correlation_id = get_correlation_id()

    # --- Input validation ---
    validation_errors = []
    if not order_data.get("customer_id"):
        validation_errors.append(
            {"field": "customer_id", "message": "Customer ID is required"}
        )
    if not order_data.get("items"):
        validation_errors.append(
            {"field": "items", "message": "At least one item is required"}
        )
    if order_data.get("items") and not isinstance(order_data["items"], list):
        validation_errors.append(
            {"field": "items", "message": "Items must be a list", "rejected_value": type(order_data["items"]).__name__}
        )
    if order_data.get("total") is not None and order_data["total"] < 0:
        validation_errors.append(
            {"field": "total", "message": "Total must be non-negative", "rejected_value": order_data["total"]}
        )

    if validation_errors:
        raise ValidationError(
            "The order data is invalid.",
            details={"fields": validation_errors},
            code="ERR_VALIDATION_ORDER",
        )

    # --- Database insert ---
    try:
        order_id = str(uuid.uuid4())
        order = {
            "id": order_id,
            "customer_id": order_data["customer_id"],
            "items": order_data["items"],
            "total": order_data.get("total", 0),
            "status": "pending",
        }

        # Using raw SQL for illustration; in production this would be an ORM model
        await session.execute(
            # Placeholder — actual implementation uses the Order model
            select(1)  # type: ignore[arg-type]
        )
        await session.commit()

        logger.info(
            "Order created",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "customer_id": order_data["customer_id"],
            },
        )
        return order

    except IntegrityError as exc:
        await session.rollback()
        logger.warning(
            "Duplicate order conflict",
            extra={
                "correlation_id": correlation_id,
                "customer_id": order_data.get("customer_id"),
                "cause": str(exc),
            },
        )
        raise ConflictError(
            code="ERR_CONFLICT_ORDER",
            message="An order with this reference already exists.",
            cause=exc,
        ) from exc

    except OperationalError as exc:
        await session.rollback()
        logger.error(
            "Database operational error during order creation",
            extra={
                "correlation_id": correlation_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"Database operational error in create_order: {exc}",
            code="ERR_INTERNAL_DB",
            cause=exc,
        ) from exc

    except SQLAlchemyError as exc:
        await session.rollback()
        logger.error(
            "Database error during order creation",
            extra={
                "correlation_id": correlation_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"SQLAlchemy error in create_order: {exc}",
            code="ERR_INTERNAL_DB",
            cause=exc,
        ) from exc


# ---------------------------------------------------------------------------
# get_order
# ---------------------------------------------------------------------------
async def get_order(session: AsyncSession, order_id: str) -> dict:
    """
    Retrieve an order by ID.

    Raises:
        ValidationError: If order_id is empty or malformed.
        NotFoundError: If no order exists with the given ID.
        InternalError: If the database query fails.
    """
    correlation_id = get_correlation_id()

    if not order_id or not order_id.strip():
        raise ValidationError(
            "Order ID is required.",
            details={"fields": [{"field": "order_id", "message": "Must be a non-empty string"}]},
            code="ERR_VALIDATION_ORDER",
        )

    try:
        # Placeholder query — actual implementation queries the Order model
        result = await session.execute(select(1))  # type: ignore[arg-type]
        order = result.scalar_one_or_none()

        if order is None:
            logger.info(
                "Order not found",
                extra={
                    "correlation_id": correlation_id,
                    "order_id": order_id,
                },
            )
            raise NotFoundError(
                code="ERR_NOT_FOUND_ORDER",
                message="Order not found.",
            )

        logger.info(
            "Order retrieved",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
            },
        )
        return {"id": order_id, "status": "pending"}  # Placeholder return

    except NotFoundError:
        # Re-raise our own typed errors without wrapping
        raise

    except OperationalError as exc:
        logger.error(
            "Database operational error during order retrieval",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"Database operational error in get_order for order_id={order_id}: {exc}",
            code="ERR_INTERNAL_DB",
            cause=exc,
        ) from exc

    except SQLAlchemyError as exc:
        logger.error(
            "Database error during order retrieval",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"SQLAlchemy error in get_order for order_id={order_id}: {exc}",
            code="ERR_INTERNAL_DB",
            cause=exc,
        ) from exc


# ---------------------------------------------------------------------------
# update_order_status
# ---------------------------------------------------------------------------
async def update_order_status(
    session: AsyncSession, order_id: str, new_status: str
) -> dict:
    """
    Update the status of an existing order.

    Validates that the status transition is allowed before applying it.

    Raises:
        ValidationError: If new_status is not a recognized status value.
        NotFoundError: If the order does not exist.
        ConflictError: If the status transition is not allowed.
        InternalError: If the database operation fails.
    """
    correlation_id = get_correlation_id()

    # --- Validate the target status ---
    if new_status not in VALID_STATUSES:
        raise ValidationError(
            "The order status value is invalid.",
            details={
                "fields": [
                    {
                        "field": "status",
                        "message": f"Must be one of: {', '.join(sorted(VALID_STATUSES))}",
                        "rejected_value": new_status,
                    }
                ]
            },
            code="ERR_VALIDATION_ORDER_STATUS",
        )

    try:
        # Fetch current order to check transition validity
        order = await get_order(session, order_id)  # Raises NotFoundError if missing
        current_status = order["status"]

        allowed = STATUS_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            logger.warning(
                "Invalid status transition attempted",
                extra={
                    "correlation_id": correlation_id,
                    "order_id": order_id,
                    "current_status": current_status,
                    "requested_status": new_status,
                    "allowed_transitions": sorted(allowed),
                },
            )
            raise ConflictError(
                code="ERR_CONFLICT_ORDER_STATUS",
                message="The order status cannot be changed to the requested value.",
                details={
                    "current_status": current_status,
                    "requested_status": new_status,
                    "allowed_transitions": sorted(allowed),
                },
            )

        # Apply the update
        await session.execute(
            update(...)  # type: ignore[arg-type]  # Placeholder
        )
        await session.commit()

        logger.info(
            "Order status updated",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "old_status": current_status,
                "new_status": new_status,
            },
        )
        return {"id": order_id, "status": new_status}

    except (NotFoundError, ConflictError, ValidationError):
        # Re-raise our own typed errors without double-wrapping
        raise

    except OperationalError as exc:
        await session.rollback()
        logger.error(
            "Database operational error during status update",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"Database operational error in update_order_status for order_id={order_id}: {exc}",
            code="ERR_INTERNAL_DB",
            cause=exc,
        ) from exc

    except SQLAlchemyError as exc:
        await session.rollback()
        logger.error(
            "Database error during status update",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"SQLAlchemy error in update_order_status for order_id={order_id}: {exc}",
            code="ERR_INTERNAL_DB",
            cause=exc,
        ) from exc


# ---------------------------------------------------------------------------
# sync_inventory (external API call)
# ---------------------------------------------------------------------------
async def sync_inventory(product_ids: list[str], api_base_url: str) -> dict:
    """
    Synchronize inventory levels by calling the external inventory API.

    Raises:
        ValidationError: If product_ids is empty.
        RateLimitError: If the external API returns 429.
        InternalError: If the API call fails for any other reason.
    """
    correlation_id = get_correlation_id()

    if not product_ids:
        raise ValidationError(
            "At least one product ID is required for inventory sync.",
            details={"fields": [{"field": "product_ids", "message": "Must be a non-empty list"}]},
            code="ERR_VALIDATION_ORDER",
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(
                "Calling inventory sync API",
                extra={
                    "correlation_id": correlation_id,
                    "product_count": len(product_ids),
                    "api_base_url": api_base_url,
                },
            )

            response = await client.post(
                f"{api_base_url}/inventory/sync",
                json={"product_ids": product_ids},
                headers={"X-Request-ID": correlation_id},
            )

            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "60"))
                logger.warning(
                    "Inventory API rate limited",
                    extra={
                        "correlation_id": correlation_id,
                        "retry_after_seconds": retry_after,
                    },
                )
                raise RateLimitError(
                    retry_after_seconds=retry_after,
                    code="ERR_RATE_LIMIT_API",
                )

            if response.status_code >= 500:
                logger.error(
                    "Inventory API server error",
                    extra={
                        "correlation_id": correlation_id,
                        "status_code": response.status_code,
                        "response_body": response.text[:500],  # Truncate for safety
                    },
                )
                raise InternalError(
                    internal_message=(
                        f"Inventory API returned {response.status_code}: {response.text[:500]}"
                    ),
                    code="ERR_INTERNAL_INVENTORY",
                )

            if response.status_code >= 400:
                logger.error(
                    "Inventory API client error",
                    extra={
                        "correlation_id": correlation_id,
                        "status_code": response.status_code,
                        "response_body": response.text[:500],
                    },
                )
                raise InternalError(
                    internal_message=(
                        f"Inventory API returned {response.status_code}: {response.text[:500]}"
                    ),
                    code="ERR_INTERNAL_INVENTORY",
                )

            result = response.json()
            logger.info(
                "Inventory sync completed",
                extra={
                    "correlation_id": correlation_id,
                    "synced_count": len(result.get("synced", [])),
                },
            )
            return result

    except (RateLimitError, ValidationError):
        # Re-raise our own typed errors
        raise

    except httpx.TimeoutException as exc:
        logger.error(
            "Inventory API request timed out",
            extra={
                "correlation_id": correlation_id,
                "timeout_seconds": 30.0,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"Inventory API timed out after 30s: {exc}",
            code="ERR_INTERNAL_INVENTORY",
            cause=exc,
        ) from exc

    except httpx.ConnectError as exc:
        logger.error(
            "Failed to connect to inventory API",
            extra={
                "correlation_id": correlation_id,
                "api_base_url": api_base_url,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"Connection to inventory API failed: {exc}",
            code="ERR_INTERNAL_INVENTORY",
            cause=exc,
        ) from exc

    except httpx.HTTPError as exc:
        logger.error(
            "HTTP error during inventory sync",
            extra={
                "correlation_id": correlation_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"HTTP error in sync_inventory: {exc}",
            code="ERR_INTERNAL_INVENTORY",
            cause=exc,
        ) from exc


# ---------------------------------------------------------------------------
# process_payment (external payment gateway)
# ---------------------------------------------------------------------------
async def process_payment(
    order_id: str, amount: float, payment_method: dict[str, Any], gateway_url: str
) -> dict:
    """
    Process a payment through the external payment gateway.

    Raises:
        ValidationError: If payment data is invalid.
        NotFoundError: If the payment gateway returns 404 for the payment method.
        RateLimitError: If the gateway returns 429.
        InternalError: If the gateway call fails for any other reason.
    """
    correlation_id = get_correlation_id()

    # --- Input validation ---
    validation_errors = []
    if not order_id:
        validation_errors.append(
            {"field": "order_id", "message": "Order ID is required"}
        )
    if amount <= 0:
        validation_errors.append(
            {"field": "amount", "message": "Amount must be positive", "rejected_value": amount}
        )
    if not payment_method:
        validation_errors.append(
            {"field": "payment_method", "message": "Payment method is required"}
        )
    if payment_method and not payment_method.get("type"):
        validation_errors.append(
            {"field": "payment_method.type", "message": "Payment method type is required"}
        )

    if validation_errors:
        raise ValidationError(
            "The payment information is invalid.",
            details={"fields": validation_errors},
            code="ERR_VALIDATION_PAYMENT",
        )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            logger.info(
                "Initiating payment processing",
                extra={
                    "correlation_id": correlation_id,
                    "order_id": order_id,
                    "amount": amount,
                    "payment_type": payment_method.get("type"),
                    # NEVER log full card numbers, tokens, or secrets
                },
            )

            response = await client.post(
                f"{gateway_url}/payments",
                json={
                    "order_id": order_id,
                    "amount": amount,
                    "currency": payment_method.get("currency", "USD"),
                    "method": payment_method,
                },
                headers={"X-Request-ID": correlation_id},
            )

            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "30"))
                logger.warning(
                    "Payment gateway rate limited",
                    extra={
                        "correlation_id": correlation_id,
                        "order_id": order_id,
                        "retry_after_seconds": retry_after,
                    },
                )
                raise RateLimitError(
                    retry_after_seconds=retry_after,
                    code="ERR_RATE_LIMIT_API",
                )

            if response.status_code == 404:
                raise NotFoundError(
                    code="ERR_NOT_FOUND_ORDER",
                    message="Order not found.",
                )

            if response.status_code == 400:
                # Payment gateway rejected the request — this is a validation issue
                gateway_error = response.json().get("error", {})
                logger.warning(
                    "Payment gateway rejected request",
                    extra={
                        "correlation_id": correlation_id,
                        "order_id": order_id,
                        "gateway_error": gateway_error,
                    },
                )
                raise ValidationError(
                    "The payment information is invalid.",
                    details={"gateway_message": gateway_error.get("message", "Unknown")},
                    code="ERR_VALIDATION_PAYMENT",
                )

            if response.status_code >= 500:
                logger.error(
                    "Payment gateway server error",
                    extra={
                        "correlation_id": correlation_id,
                        "order_id": order_id,
                        "status_code": response.status_code,
                        "response_body": response.text[:500],
                    },
                )
                raise InternalError(
                    internal_message=(
                        f"Payment gateway returned {response.status_code} for order {order_id}: "
                        f"{response.text[:500]}"
                    ),
                    code="ERR_INTERNAL_PAYMENT",
                    # No cause here — the error originated from the HTTP response, not an exception
                )

            if response.status_code >= 400:
                logger.error(
                    "Payment gateway client error",
                    extra={
                        "correlation_id": correlation_id,
                        "order_id": order_id,
                        "status_code": response.status_code,
                    },
                )
                raise InternalError(
                    internal_message=(
                        f"Payment gateway returned {response.status_code} for order {order_id}"
                    ),
                    code="ERR_INTERNAL_PAYMENT",
                )

            result = response.json()
            logger.info(
                "Payment processed successfully",
                extra={
                    "correlation_id": correlation_id,
                    "order_id": order_id,
                    "transaction_id": result.get("transaction_id"),
                },
            )
            return result

    except (ValidationError, NotFoundError, RateLimitError, InternalError):
        # Re-raise our own typed errors
        raise

    except httpx.TimeoutException as exc:
        logger.error(
            "Payment gateway request timed out",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "timeout_seconds": 60.0,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"Payment gateway timed out after 60s for order {order_id}: {exc}",
            code="ERR_INTERNAL_PAYMENT",
            cause=exc,
        ) from exc

    except httpx.ConnectError as exc:
        logger.error(
            "Failed to connect to payment gateway",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "gateway_url": gateway_url,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"Connection to payment gateway failed for order {order_id}: {exc}",
            code="ERR_INTERNAL_PAYMENT",
            cause=exc,
        ) from exc

    except httpx.HTTPError as exc:
        logger.error(
            "HTTP error during payment processing",
            extra={
                "correlation_id": correlation_id,
                "order_id": order_id,
                "cause": str(exc),
            },
        )
        raise InternalError(
            internal_message=f"HTTP error in process_payment for order {order_id}: {exc}",
            code="ERR_INTERNAL_PAYMENT",
            cause=exc,
        ) from exc
```

## Step 6 — Correlation ID Propagation (Already Implemented Above)

The correlation ID system is implemented across three files:

1. **`correlation.py`** — `contextvars.ContextVar` holding the request-scoped
   correlation ID
2. **`request_middleware.py`** — FastAPI middleware that sets the correlation ID
   at request entry, using the client's `X-Request-ID` header or generating a
   UUID v4
3. **`structured_logging.py`** — Custom `logging.Formatter` that automatically
   injects the correlation ID into every log record

The propagation flow:

```
Client Request
  │
  ├─ X-Request-ID: "a1b2c3d4-..." (or auto-generated UUID v4)
  │
  ▼
CorrelationIdMiddleware.dispatch()
  │  set_correlation_id(request_id)
  │
  ▼
Route Handler → order_service.create_order()
  │  get_correlation_id() → "a1b2c3d4-..."
  │  logger.info("Order created", extra={"correlation_id": "a1b2c3d4-..."})
  │
  ├─► httpx call to inventory API
  │     headers={"X-Request-ID": "a1b2c3d4-..."}  ← propagated downstream
  │
  ├─► httpx call to payment gateway
  │     headers={"X-Request-ID": "a1b2c3d4-..."}  ← propagated downstream
  │
  ▼
Error Response (if error)
  {"error": {"code": "ERR_...", "message": "...", "requestId": "a1b2c3d4-..."}}
  │
  ▼
Response Header
  X-Request-ID: "a1b2c3d4-..."
```

## Step 7 — Verify the Contract

### File: `app.py` — Application Entry Point (Wiring Everything Together)

```python
"""
Application entry point. Wires up middleware, error handlers, and routes.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI

from middleware import register_error_handlers
from request_middleware import CorrelationIdMiddleware
from structured_logging import configure_logging

# Configure structured logging before anything else
configure_logging(level=logging.INFO)

app = FastAPI(title="Order Service")

# Correlation ID middleware — must be added before error handlers
app.add_middleware(CorrelationIdMiddleware)

# Global error handlers
register_error_handlers(app)


# --- Routes would be defined here or in a separate router module ---
# from routes import router
# app.include_router(router)
```

### Verification Checklist

- [x] **Error responses match the JSON schema** — Every `AppError.to_response()`
      returns `{"error": {"code": "...", "message": "...", "requestId": "..."}}`
      with optional `details`
- [x] **500 errors never expose internal details** — `InternalError` always
      returns the generic message
      `"An internal error occurred. Please try again or contact support."` while
      logging `internal_message` server-side only
- [x] **400 errors include field-level details** — `ValidationError` includes
      `details.fields` with per-field `field`, `message`, and `rejected_value`
- [x] **429 errors include a Retry-After header** — `RateLimitError` carries
      `retry_after_seconds`, and the middleware sets the `Retry-After` response
      header
- [x] **Logs include requestId, error code, and causal chain** — Every log line
      includes `correlation_id` via the structured formatter; error logs include
      `code`, `cause`, and `cause_chain`
- [x] **Error codes are stable strings, not ad-hoc messages** — All codes follow
      `ERR_{CATEGORY}_{ENTITY}` format: `ERR_VALIDATION_ORDER`,
      `ERR_NOT_FOUND_ORDER`, `ERR_INTERNAL_DB`, etc.

### Example Error Response Shapes

**400 Validation Error:**

```json
{
  "error": {
    "code": "ERR_VALIDATION_ORDER",
    "message": "The order data is invalid.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": {
      "fields": [
        {
          "field": "customer_id",
          "message": "Customer ID is required"
        },
        {
          "field": "items",
          "message": "At least one item is required"
        }
      ]
    }
  }
}
```

**404 Not Found Error:**

```json
{
  "error": {
    "code": "ERR_NOT_FOUND_ORDER",
    "message": "Order not found.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**409 Conflict Error (status transition):**

```json
{
  "error": {
    "code": "ERR_CONFLICT_ORDER_STATUS",
    "message": "The order status cannot be changed to the requested value.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "details": {
      "current_status": "delivered",
      "requested_status": "pending",
      "allowed_transitions": []
    }
  }
}
```

**429 Rate Limit Error:**

```json
{
  "error": {
    "code": "ERR_RATE_LIMIT_API",
    "message": "Too many requests. Please wait before trying again.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

Response header: `Retry-After: 60`

**500 Internal Error (user sees):**

```json
{
  "error": {
    "code": "ERR_INTERNAL_DB",
    "message": "An internal error occurred. Please try again or contact support.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**500 Internal Error (server log shows — never sent to client):**

```json
{
  "timestamp": "2026-03-09T14:22:33.456789+00:00",
  "level": "ERROR",
  "logger": "order_service",
  "message": "AppError raised",
  "correlation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code": "ERR_INTERNAL_DB",
  "internal_message": "Database operational error in create_order: (psycopg2.OperationalError) connection refused to orders-db:5432",
  "cause": "(psycopg2.OperationalError) could not connect to server: Connection refused",
  "cause_chain": [
    "OperationalError: (psycopg2.OperationalError) could not connect to server: Connection refused",
    "OperationalError: could not connect to server: Connection refused"
  ],
  "path": "http://localhost:8000/orders",
  "method": "POST"
}
```

### Error Wrapping Chain Example

When a database connection fails during `create_order`, the causal chain is
preserved:

```
InternalError: ERR_INTERNAL_DB — An internal error occurred. Please try again or contact support.
  (internal_message: "Database operational error in create_order: connection refused to orders-db:5432")
  caused by: sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server
    caused by: psycopg2.OperationalError: could not connect to server: Connection refused
```

The user sees only the generic message. The server logs capture the full chain
for debugging. The `requestId` in the user's response is the key that unlocks
this full trace in the logs.

## Summary of All Files

| File                    | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `errors.py`             | Unified error taxonomy — `AppError` base class and all subclasses      |
| `correlation.py`        | Correlation ID storage via `contextvars.ContextVar`                    |
| `structured_logging.py` | JSON structured log formatter with automatic correlation ID injection  |
| `request_middleware.py` | FastAPI middleware to set correlation ID at request entry              |
| `middleware.py`         | Global error handler — single point for error-to-response translation  |
| `order_service.py`      | Refactored service with typed errors, wrapping, and structured logging |
| `app.py`                | Application entry point wiring everything together                     |

## Error Code Registry

| Code                          | HTTP | User Message                                                     | Internal Context                 |
| ----------------------------- | ---- | ---------------------------------------------------------------- | -------------------------------- |
| `ERR_VALIDATION_ORDER`        | 400  | The order data is invalid.                                       | Missing/malformed order fields   |
| `ERR_VALIDATION_ORDER_STATUS` | 400  | The order status value is invalid.                               | Status not in allowed set        |
| `ERR_VALIDATION_PAYMENT`      | 400  | The payment information is invalid.                              | Missing/malformed payment fields |
| `ERR_NOT_FOUND_ORDER`         | 404  | Order not found.                                                 | Order ID lookup returned None    |
| `ERR_CONFLICT_ORDER`          | 409  | An order with this reference already exists.                     | IntegrityError on insert         |
| `ERR_CONFLICT_ORDER_STATUS`   | 409  | The order status cannot be changed to the requested value.       | Invalid status transition        |
| `ERR_RATE_LIMIT_API`          | 429  | Too many requests. Please wait before trying again.              | External API returned 429        |
| `ERR_INTERNAL_DB`             | 500  | An internal error occurred. Please try again or contact support. | SQLAlchemy/connection failure    |
| `ERR_INTERNAL_INVENTORY`      | 500  | An internal error occurred. Please try again or contact support. | Inventory API failure            |
| `ERR_INTERNAL_PAYMENT`        | 500  | An internal error occurred. Please try again or contact support. | Payment gateway failure          |

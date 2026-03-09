# Comprehensive Error Handling for Python Order Service

This document implements a complete, production-grade error handling system for
a Python service that interacts with PostgreSQL (via SQLAlchemy) and external
APIs (via httpx). It follows every step of the error-handling skill workflow.

---

## Table of Contents

1. [Base Error Class (`AppError`)](#1-base-error-class-apperror)
2. [Error Subclass Hierarchy](#2-error-subclass-hierarchy)
3. [Error Code Convention & Registry](#3-error-code-convention--registry)
4. [JSON Error Response Schema](#4-json-error-response-schema)
5. [Correlation ID Middleware & Structured Logging](#5-correlation-id-middleware--structured-logging)
6. [Service Implementation with Error Wrapping](#6-service-implementation-with-error-wrapping)
7. [Centralized Error Handler](#7-centralized-error-handler)
8. [Error Reference Documentation](#8-error-reference-documentation)
9. [Complete File Listing](#9-complete-file-listing)

---

## 1. Base Error Class (`AppError`)

Every application error extends `AppError`. It carries the five required fields:
`code`, `message`, `status_code`, `is_operational`, and `cause` (`__cause__`).

```python
# app/errors/base.py

"""
Base application error class.

All application errors extend AppError. This ensures every error carries:
- code: stable string identifier for programmatic consumption
- message: user-safe, human-readable description
- status_code: HTTP status code
- is_operational: True for expected errors, False for bugs
- __cause__: the original exception (Python's native chaining)
- details: optional dict with structured context
"""


class AppError(Exception):
    """Base class for all application errors.

    Attributes:
        code: Stable, programmatic error identifier (e.g., ERR_NOT_FOUND_ORDER).
              Clients switch on this. Never changes once shipped.
        message: Human-readable, user-safe description. Never contains stack
                 traces, SQL, or internal identifiers.
        status_code: HTTP status code for the response.
        is_operational: True = expected error (bad input, not found).
                        False = programmer error (null ref, assertion).
                        Only operational errors are safe to handle;
                        non-operational errors should crash the process.
        details: Optional dict with additional structured context.
    """

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
        self.__cause__ = cause  # Python's native exception chaining
        self.details = details

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"code={self.code!r}, "
            f"status_code={self.status_code}, "
            f"message={str(self)!r}"
            f")"
        )
```

---

## 2. Error Subclass Hierarchy

One subclass per HTTP error category. Each locks down `status_code` so callers
only provide `code`, `message`, and optional `details`/`cause`.

```python
# app/errors/exceptions.py

"""
Error subclass hierarchy.

Each subclass locks down status_code so callers cannot accidentally
return a mismatched status (e.g., a validation error returning 500).
"""

from app.errors.base import AppError


class ValidationError(AppError):
    """400 — Request body/params fail schema or business rules.

    Always include field-level details in the `details` dict when possible.
    """

    def __init__(
        self,
        code: str,
        message: str,
        details: dict | None = None,
        cause: Exception | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=400,
            is_operational=True,
            cause=cause,
            details=details,
        )


class AuthenticationError(AppError):
    """401 — Missing, expired, or invalid credentials."""

    def __init__(
        self,
        code: str,
        message: str,
        cause: Exception | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=401,
            is_operational=True,
            cause=cause,
        )


class ForbiddenError(AppError):
    """403 — Authenticated but lacks permission for this action."""

    def __init__(
        self,
        code: str,
        message: str,
        cause: Exception | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=403,
            is_operational=True,
            cause=cause,
        )


class NotFoundError(AppError):
    """404 — Resource doesn't exist or caller can't see it.

    Use 404 over 403 to avoid leaking resource existence.
    """

    def __init__(
        self,
        code: str,
        message: str,
        cause: Exception | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=404,
            is_operational=True,
            cause=cause,
        )


class ConflictError(AppError):
    """409 — Duplicate key, version mismatch, state transition violation."""

    def __init__(
        self,
        code: str,
        message: str,
        cause: Exception | None = None,
        details: dict | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=409,
            is_operational=True,
            cause=cause,
            details=details,
        )


class RateLimitError(AppError):
    """429 — Too many requests. Always includes retry_after.

    Attributes:
        retry_after: Seconds until the rate limit resets.
    """

    def __init__(
        self,
        code: str,
        message: str,
        retry_after: int,
        cause: Exception | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=429,
            is_operational=True,
            cause=cause,
        )
        self.retry_after = retry_after


class InternalError(AppError):
    """500 — Unexpected failures / bugs.

    Always sets is_operational=False. These represent programmer errors
    and should trigger alerts, not be silently handled.
    """

    def __init__(
        self,
        code: str,
        message: str,
        cause: Exception | None = None,
    ):
        # Always non-operational — these represent bugs
        super().__init__(
            code=code,
            message=message,
            status_code=500,
            is_operational=False,
            cause=cause,
        )


class ExternalServiceError(AppError):
    """502 — An external service (API, payment gateway) returned an error.

    Operational because external failures are expected in production.
    """

    def __init__(
        self,
        code: str,
        message: str,
        cause: Exception | None = None,
        details: dict | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=502,
            is_operational=True,
            cause=cause,
            details=details,
        )


class ServiceUnavailableError(AppError):
    """503 — Service temporarily unavailable (DB down, dependency timeout).

    Operational because transient failures are expected.
    """

    def __init__(
        self,
        code: str,
        message: str,
        retry_after: int | None = None,
        cause: Exception | None = None,
    ):
        super().__init__(
            code=code,
            message=message,
            status_code=503,
            is_operational=True,
            cause=cause,
        )
        self.retry_after = retry_after
```

```python
# app/errors/__init__.py

"""Error module — import all error classes from here."""

from app.errors.base import AppError
from app.errors.exceptions import (
    AuthenticationError,
    ConflictError,
    ExternalServiceError,
    ForbiddenError,
    InternalError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
)

__all__ = [
    "AppError",
    "AuthenticationError",
    "ConflictError",
    "ExternalServiceError",
    "ForbiddenError",
    "InternalError",
    "NotFoundError",
    "RateLimitError",
    "ServiceUnavailableError",
    "ValidationError",
]
```

---

## 3. Error Code Convention & Registry

**Format:** `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]`

Error codes are **stable** (never renamed once shipped), **greppable** (unique
across the codebase), and **self-documenting**.

```python
# app/errors/codes.py

"""
Error code registry.

All error codes used in the application are defined here as constants.
This ensures:
- Codes are stable (never renamed once shipped)
- Codes are greppable (unique across the codebase)
- Codes are self-documenting (follow ERR_<CATEGORY>_<ENTITY>[_<DETAIL>] format)

IMPORTANT: Error codes are immutable once released. To deprecate a code,
add a new code and mark the old one with a comment. Never delete or rename.
"""

# --- Validation Errors (400) ---
ERR_VALIDATION_ORDER_ITEMS_EMPTY = "ERR_VALIDATION_ORDER_ITEMS_EMPTY"
ERR_VALIDATION_ORDER_ITEMS_FORMAT = "ERR_VALIDATION_ORDER_ITEMS_FORMAT"
ERR_VALIDATION_ORDER_CUSTOMER_ID = "ERR_VALIDATION_ORDER_CUSTOMER_ID"
ERR_VALIDATION_ORDER_STATUS = "ERR_VALIDATION_ORDER_STATUS"
ERR_VALIDATION_ORDER_QUANTITY = "ERR_VALIDATION_ORDER_QUANTITY"
ERR_VALIDATION_PAYMENT_AMOUNT = "ERR_VALIDATION_PAYMENT_AMOUNT"
ERR_VALIDATION_PAYMENT_METHOD = "ERR_VALIDATION_PAYMENT_METHOD"

# --- Not Found Errors (404) ---
ERR_NOT_FOUND_ORDER = "ERR_NOT_FOUND_ORDER"
ERR_NOT_FOUND_PRODUCT = "ERR_NOT_FOUND_PRODUCT"
ERR_NOT_FOUND_CUSTOMER = "ERR_NOT_FOUND_CUSTOMER"

# --- Conflict Errors (409) ---
ERR_CONFLICT_ORDER_STATUS_TRANSITION = "ERR_CONFLICT_ORDER_STATUS_TRANSITION"
ERR_CONFLICT_ORDER_DUPLICATE = "ERR_CONFLICT_ORDER_DUPLICATE"
ERR_CONFLICT_INVENTORY_VERSION = "ERR_CONFLICT_INVENTORY_VERSION"

# --- External Service Errors (502) ---
ERR_EXTERNAL_INVENTORY_SYNC = "ERR_EXTERNAL_INVENTORY_SYNC"
ERR_EXTERNAL_INVENTORY_RESPONSE = "ERR_EXTERNAL_INVENTORY_RESPONSE"
ERR_EXTERNAL_PAYMENT_GATEWAY = "ERR_EXTERNAL_PAYMENT_GATEWAY"
ERR_EXTERNAL_PAYMENT_DECLINED = "ERR_EXTERNAL_PAYMENT_DECLINED"
ERR_EXTERNAL_PAYMENT_RESPONSE = "ERR_EXTERNAL_PAYMENT_RESPONSE"

# --- Internal Errors (500) ---
ERR_INTERNAL_DB_CONNECTION = "ERR_INTERNAL_DB_CONNECTION"
ERR_INTERNAL_DB_QUERY = "ERR_INTERNAL_DB_QUERY"
ERR_INTERNAL_UNHANDLED = "ERR_INTERNAL_UNHANDLED"
ERR_INTERNAL_DB_TRANSACTION = "ERR_INTERNAL_DB_TRANSACTION"

# --- Service Unavailable Errors (503) ---
ERR_SERVICE_UNAVAILABLE_DB = "ERR_SERVICE_UNAVAILABLE_DB"
ERR_SERVICE_UNAVAILABLE_INVENTORY_API = "ERR_SERVICE_UNAVAILABLE_INVENTORY_API"
ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY = "ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY"

# --- Rate Limit Errors (429) ---
ERR_RATE_LIMIT_PAYMENT_GATEWAY = "ERR_RATE_LIMIT_PAYMENT_GATEWAY"
ERR_RATE_LIMIT_INVENTORY_API = "ERR_RATE_LIMIT_INVENTORY_API"
```

---

## 4. JSON Error Response Schema

Every error response follows this exact shape. Consistency means clients write
one error handler, not one per endpoint.

```python
# app/errors/response.py

"""
JSON error response builder.

Converts AppError instances into the standard JSON error response schema.
This module is used by the centralized error handler to ensure every error
response has the same shape.
"""

from __future__ import annotations

from typing import Any

from app.errors.base import AppError
from app.errors.exceptions import RateLimitError, ValidationError


def build_error_response(
    error: AppError,
    request_id: str,
    target: str | None = None,
) -> dict[str, Any]:
    """Build a standardized JSON error response body.

    The response follows this schema:
    {
        "error": {
            "code": "ERR_...",           # Stable string error code (always present)
            "message": "...",            # User-safe message (always present)
            "requestId": "req_...",      # Correlation ID (always present)
            "details": [...],            # Field-level issues (conditional, for 400s)
            "target": "POST /api/...",   # Endpoint that failed (optional)
        }
    }

    CRITICAL: Non-operational errors (is_operational=False) get a generic
    message in the response. The real message only appears in logs.
    """
    # Non-operational errors get a generic message — never leak internals
    if error.is_operational:
        user_message = str(error)
    else:
        user_message = "An unexpected error occurred. Please try again later."

    error_body: dict[str, Any] = {
        "code": error.code,
        "message": user_message,
        "requestId": request_id,
    }

    # Attach field-level details for validation errors
    if isinstance(error, ValidationError) and error.details:
        error_body["details"] = error.details

    # Include target endpoint if provided
    if target:
        error_body["target"] = target

    return {"error": error_body}


def build_error_headers(error: AppError) -> dict[str, str]:
    """Build additional HTTP headers for the error response.

    Rate limit errors MUST include Retry-After header.
    """
    headers: dict[str, str] = {}

    if isinstance(error, RateLimitError):
        headers["Retry-After"] = str(error.retry_after)

    return headers
```

---

## 5. Correlation ID Middleware & Structured Logging

Every incoming request gets a unique `request_id`. This ID flows through every
log line and appears in the error response, enabling end-to-end tracing.

```python
# app/logging_config.py

"""
Structured logging configuration with correlation ID support.

Uses Python's standard logging module with a custom JSON formatter.
Correlation IDs are stored in contextvars so they are automatically
available in every log line within the same request context, even
across async boundaries.
"""

from __future__ import annotations

import contextvars
import json
import logging
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any

# Context variable for correlation ID — works across async boundaries
correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default=""
)


def generate_request_id() -> str:
    """Generate a unique request ID with the req_ prefix."""
    return f"req_{uuid.uuid4().hex[:12]}"


def get_correlation_id() -> str:
    """Get the current correlation ID from context."""
    return correlation_id_var.get()


def set_correlation_id(request_id: str) -> contextvars.Token[str]:
    """Set the correlation ID in context. Returns a token for resetting."""
    return correlation_id_var.set(request_id)


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as JSON for machine parsing.

    Output format:
    {
        "level": "ERROR",
        "timestamp": "2025-01-15T10:30:00.000Z",
        "requestId": "req_a1b2c3d4e5",
        "logger": "app.services.order",
        "message": "Failed to create order",
        "code": "ERR_INTERNAL_DB_QUERY",
        "statusCode": 500,
        "cause": "relation \"orders\" does not exist",
        "stack": "Traceback (most recent call last):\n  ...",
        "extra": { ... }
    }
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "level": record.levelname,
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "requestId": correlation_id_var.get(""),
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add error-specific fields if present
        if hasattr(record, "error_code"):
            log_entry["code"] = record.error_code
        if hasattr(record, "status_code"):
            log_entry["statusCode"] = record.status_code
        if hasattr(record, "cause"):
            log_entry["cause"] = record.cause

        # Add stack trace for errors
        if record.exc_info and record.exc_info[1] is not None:
            log_entry["stack"] = "".join(
                traceback.format_exception(*record.exc_info)
            )

        # Add any extra structured data
        if hasattr(record, "extra_data"):
            log_entry["extra"] = record.extra_data

        return json.dumps(log_entry, default=str)


def setup_logging(level: int = logging.INFO) -> None:
    """Configure structured JSON logging for the application.

    Call this once at application startup.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicate output
    root_logger.handlers.clear()

    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())
    root_logger.addHandler(handler)

    # Suppress noisy third-party loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name.

    Usage:
        logger = get_logger(__name__)
        logger.info("Processing order", extra={"extra_data": {"order_id": "123"}})
    """
    return logging.getLogger(name)
```

```python
# app/middleware.py

"""
Request middleware for correlation ID injection.

Works with any ASGI framework (FastAPI, Starlette). For WSGI frameworks
(Flask, Django), adapt the middleware pattern accordingly.
"""

from __future__ import annotations

import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.logging_config import (
    generate_request_id,
    get_logger,
    set_correlation_id,
)

logger = get_logger(__name__)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Injects a correlation ID into every request.

    - Accepts client-provided X-Request-Id header, or generates one
    - Sets the ID in contextvars for structured logging
    - Adds X-Request-Id to the response headers
    - Logs request start/end with timing
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Accept client-provided ID or generate one
        request_id = request.headers.get("x-request-id") or generate_request_id()

        # Store in contextvars — available to all code in this request
        token = set_correlation_id(request_id)

        # Store on request state for access in route handlers
        request.state.request_id = request_id

        start_time = time.monotonic()

        logger.info(
            "Request started",
            extra={
                "extra_data": {
                    "method": request.method,
                    "path": str(request.url.path),
                    "query": str(request.url.query),
                }
            },
        )

        try:
            response = await call_next(request)

            duration_ms = (time.monotonic() - start_time) * 1000
            logger.info(
                "Request completed",
                extra={
                    "extra_data": {
                        "method": request.method,
                        "path": str(request.url.path),
                        "status_code": response.status_code,
                        "duration_ms": round(duration_ms, 2),
                    }
                },
            )

            # Add correlation ID to response headers
            response.headers["X-Request-Id"] = request_id
            return response

        finally:
            # Reset the context variable
            from app.logging_config import correlation_id_var
            correlation_id_var.reset(token)
```

---

## 6. Service Implementation with Error Wrapping

This is the core of the refactoring. Each function replaces bare `except`
clauses and `print` statements with proper error wrapping that preserves the
original exception chain via `from e`.

```python
# app/services/order_service.py

"""
Order service with comprehensive error handling.

BEFORE (what this replaces):
    - Bare except clauses: `except: print("error")`
    - print() for error reporting
    - No error classification
    - No correlation IDs
    - Lost exception chains

AFTER (what this implements):
    - Custom exception classes per error category
    - Error wrapping with `raise ... from e` preserving causal chains
    - Structured logging with correlation IDs
    - User-safe messages separated from internal details
    - Stable error codes for programmatic consumption
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select, update
from sqlalchemy.exc import (
    DBAPIError,
    IntegrityError,
    NoResultFound,
    OperationalError,
    SQLAlchemyError,
)
from sqlalchemy.orm import Session

from app.errors import (
    ConflictError,
    ExternalServiceError,
    InternalError,
    NotFoundError,
    RateLimitError,
    ServiceUnavailableError,
    ValidationError,
)
from app.errors.codes import (
    ERR_CONFLICT_ORDER_DUPLICATE,
    ERR_CONFLICT_ORDER_STATUS_TRANSITION,
    ERR_EXTERNAL_INVENTORY_RESPONSE,
    ERR_EXTERNAL_INVENTORY_SYNC,
    ERR_EXTERNAL_PAYMENT_DECLINED,
    ERR_EXTERNAL_PAYMENT_GATEWAY,
    ERR_EXTERNAL_PAYMENT_RESPONSE,
    ERR_INTERNAL_DB_CONNECTION,
    ERR_INTERNAL_DB_QUERY,
    ERR_INTERNAL_DB_TRANSACTION,
    ERR_NOT_FOUND_ORDER,
    ERR_RATE_LIMIT_INVENTORY_API,
    ERR_RATE_LIMIT_PAYMENT_GATEWAY,
    ERR_SERVICE_UNAVAILABLE_DB,
    ERR_SERVICE_UNAVAILABLE_INVENTORY_API,
    ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY,
    ERR_VALIDATION_ORDER_CUSTOMER_ID,
    ERR_VALIDATION_ORDER_ITEMS_EMPTY,
    ERR_VALIDATION_ORDER_ITEMS_FORMAT,
    ERR_VALIDATION_ORDER_QUANTITY,
    ERR_VALIDATION_ORDER_STATUS,
    ERR_VALIDATION_PAYMENT_AMOUNT,
    ERR_VALIDATION_PAYMENT_METHOD,
)
from app.logging_config import get_logger
from app.models import Order, OrderStatus

logger = get_logger(__name__)

# Valid status transitions — enforces state machine
VALID_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),  # Terminal state
    OrderStatus.CANCELLED: set(),  # Terminal state
}

VALID_PAYMENT_METHODS = {"credit_card", "debit_card", "bank_transfer", "wallet"}


class OrderService:
    """Service layer for order operations.

    All public methods:
    - Validate inputs and raise ValidationError for bad data
    - Wrap database errors with appropriate AppError subclasses
    - Wrap external API errors with ExternalServiceError
    - Preserve the original exception chain via `raise ... from e`
    - Log with structured data and correlation IDs
    """

    def __init__(self, db_session: Session, http_client: httpx.AsyncClient):
        self.db = db_session
        self.http_client = http_client

    # ------------------------------------------------------------------ #
    # create_order
    # ------------------------------------------------------------------ #
    def create_order(
        self,
        customer_id: str,
        items: list[dict[str, Any]],
    ) -> Order:
        """Create a new order.

        Args:
            customer_id: UUID string of the customer.
            items: List of dicts with 'product_id', 'quantity', 'unit_price'.

        Returns:
            The created Order object.

        Raises:
            ValidationError: If customer_id or items are invalid.
            ConflictError: If a duplicate order is detected (idempotency key).
            InternalError: If the database query fails unexpectedly.
            ServiceUnavailableError: If the database is unreachable.
        """
        # --- Input validation ---
        if not customer_id or not isinstance(customer_id, str):
            raise ValidationError(
                code=ERR_VALIDATION_ORDER_CUSTOMER_ID,
                message="A valid customer ID is required.",
                details={
                    "field": "customer_id",
                    "message": "Must be a non-empty string.",
                    "rejected": customer_id,
                },
            )

        if not items:
            raise ValidationError(
                code=ERR_VALIDATION_ORDER_ITEMS_EMPTY,
                message="At least one item is required to create an order.",
                details={
                    "field": "items",
                    "message": "Items list must not be empty.",
                },
            )

        # Validate each item
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValidationError(
                    code=ERR_VALIDATION_ORDER_ITEMS_FORMAT,
                    message="Each item must be an object with product_id, quantity, and unit_price.",
                    details={
                        "field": f"items[{i}]",
                        "message": "Must be an object with product_id, quantity, and unit_price.",
                        "rejected": str(item),
                    },
                )

            required_keys = {"product_id", "quantity", "unit_price"}
            missing = required_keys - set(item.keys())
            if missing:
                raise ValidationError(
                    code=ERR_VALIDATION_ORDER_ITEMS_FORMAT,
                    message=f"Item is missing required fields: {', '.join(sorted(missing))}.",
                    details={
                        "field": f"items[{i}]",
                        "message": f"Missing required fields: {', '.join(sorted(missing))}.",
                    },
                )

            if not isinstance(item.get("quantity"), int) or item["quantity"] < 1:
                raise ValidationError(
                    code=ERR_VALIDATION_ORDER_QUANTITY,
                    message="Item quantity must be a positive integer.",
                    details={
                        "field": f"items[{i}].quantity",
                        "message": "Must be a positive integer.",
                        "rejected": item.get("quantity"),
                    },
                )

        logger.info(
            "Creating order",
            extra={
                "extra_data": {
                    "customer_id": customer_id,
                    "item_count": len(items),
                }
            },
        )

        # --- Database operation ---
        try:
            order = Order(
                customer_id=customer_id,
                items=items,
                status=OrderStatus.PENDING,
            )
            self.db.add(order)
            self.db.commit()
            self.db.refresh(order)

            logger.info(
                "Order created successfully",
                extra={
                    "extra_data": {
                        "order_id": str(order.id),
                        "customer_id": customer_id,
                        "status": order.status.value,
                    }
                },
            )
            return order

        except IntegrityError as e:
            self.db.rollback()
            logger.warning(
                "Duplicate order detected",
                extra={
                    "error_code": ERR_CONFLICT_ORDER_DUPLICATE,
                    "cause": str(e.orig),
                    "extra_data": {"customer_id": customer_id},
                },
            )
            raise ConflictError(
                code=ERR_CONFLICT_ORDER_DUPLICATE,
                message="An order with these details already exists.",
            ) from e

        except OperationalError as e:
            self.db.rollback()
            logger.error(
                "Database connection error while creating order",
                extra={
                    "error_code": ERR_SERVICE_UNAVAILABLE_DB,
                    "cause": str(e.orig),
                    "extra_data": {"customer_id": customer_id},
                },
                exc_info=True,
            )
            raise ServiceUnavailableError(
                code=ERR_SERVICE_UNAVAILABLE_DB,
                message="The service is temporarily unavailable. Please try again later.",
                retry_after=5,
            ) from e

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(
                "Unexpected database error while creating order",
                extra={
                    "error_code": ERR_INTERNAL_DB_QUERY,
                    "cause": str(e),
                    "extra_data": {"customer_id": customer_id},
                },
                exc_info=True,
            )
            raise InternalError(
                code=ERR_INTERNAL_DB_QUERY,
                message="An unexpected error occurred while creating the order.",
            ) from e

    # ------------------------------------------------------------------ #
    # get_order
    # ------------------------------------------------------------------ #
    def get_order(self, order_id: str) -> Order:
        """Retrieve an order by ID.

        Args:
            order_id: UUID string of the order.

        Returns:
            The Order object.

        Raises:
            NotFoundError: If the order does not exist.
            InternalError: If the database query fails unexpectedly.
            ServiceUnavailableError: If the database is unreachable.
        """
        logger.info(
            "Fetching order",
            extra={"extra_data": {"order_id": order_id}},
        )

        try:
            stmt = select(Order).where(Order.id == order_id)
            result = self.db.execute(stmt).scalar_one_or_none()

            if result is None:
                logger.info(
                    "Order not found",
                    extra={
                        "error_code": ERR_NOT_FOUND_ORDER,
                        "extra_data": {"order_id": order_id},
                    },
                )
                raise NotFoundError(
                    code=ERR_NOT_FOUND_ORDER,
                    message=f"Order '{order_id}' was not found.",
                )

            logger.info(
                "Order fetched successfully",
                extra={
                    "extra_data": {
                        "order_id": order_id,
                        "status": result.status.value,
                    }
                },
            )
            return result

        except NotFoundError:
            # Re-raise our own errors — don't wrap them again
            raise

        except OperationalError as e:
            logger.error(
                "Database connection error while fetching order",
                extra={
                    "error_code": ERR_SERVICE_UNAVAILABLE_DB,
                    "cause": str(e.orig),
                    "extra_data": {"order_id": order_id},
                },
                exc_info=True,
            )
            raise ServiceUnavailableError(
                code=ERR_SERVICE_UNAVAILABLE_DB,
                message="The service is temporarily unavailable. Please try again later.",
                retry_after=5,
            ) from e

        except SQLAlchemyError as e:
            logger.error(
                "Unexpected database error while fetching order",
                extra={
                    "error_code": ERR_INTERNAL_DB_QUERY,
                    "cause": str(e),
                    "extra_data": {"order_id": order_id},
                },
                exc_info=True,
            )
            raise InternalError(
                code=ERR_INTERNAL_DB_QUERY,
                message="An unexpected error occurred while retrieving the order.",
            ) from e

    # ------------------------------------------------------------------ #
    # update_order_status
    # ------------------------------------------------------------------ #
    def update_order_status(
        self,
        order_id: str,
        new_status: str,
    ) -> Order:
        """Update the status of an order.

        Enforces a state machine — only valid transitions are allowed.

        Args:
            order_id: UUID string of the order.
            new_status: The target status string.

        Returns:
            The updated Order object.

        Raises:
            ValidationError: If new_status is not a valid status value.
            NotFoundError: If the order does not exist.
            ConflictError: If the status transition is not allowed.
            InternalError: If the database operation fails unexpectedly.
            ServiceUnavailableError: If the database is unreachable.
        """
        # --- Validate the new status value ---
        try:
            target_status = OrderStatus(new_status)
        except ValueError:
            valid_values = [s.value for s in OrderStatus]
            raise ValidationError(
                code=ERR_VALIDATION_ORDER_STATUS,
                message=f"Invalid order status: '{new_status}'.",
                details={
                    "field": "status",
                    "message": f"Must be one of: {', '.join(valid_values)}.",
                    "rejected": new_status,
                },
            )

        logger.info(
            "Updating order status",
            extra={
                "extra_data": {
                    "order_id": order_id,
                    "new_status": new_status,
                }
            },
        )

        try:
            # Fetch the current order
            order = self.get_order(order_id)  # Raises NotFoundError if missing

            current_status = order.status
            allowed_transitions = VALID_STATUS_TRANSITIONS.get(current_status, set())

            if target_status not in allowed_transitions:
                logger.warning(
                    "Invalid status transition attempted",
                    extra={
                        "error_code": ERR_CONFLICT_ORDER_STATUS_TRANSITION,
                        "extra_data": {
                            "order_id": order_id,
                            "current_status": current_status.value,
                            "requested_status": target_status.value,
                            "allowed_transitions": [s.value for s in allowed_transitions],
                        },
                    },
                )
                raise ConflictError(
                    code=ERR_CONFLICT_ORDER_STATUS_TRANSITION,
                    message=(
                        f"Cannot transition order from '{current_status.value}' "
                        f"to '{target_status.value}'."
                    ),
                    details={
                        "current_status": current_status.value,
                        "requested_status": target_status.value,
                        "allowed_transitions": [s.value for s in allowed_transitions],
                    },
                )

            order.status = target_status
            self.db.commit()
            self.db.refresh(order)

            logger.info(
                "Order status updated successfully",
                extra={
                    "extra_data": {
                        "order_id": order_id,
                        "old_status": current_status.value,
                        "new_status": target_status.value,
                    }
                },
            )
            return order

        except (NotFoundError, ConflictError, ValidationError):
            # Re-raise our own errors — don't wrap them again
            raise

        except OperationalError as e:
            self.db.rollback()
            logger.error(
                "Database connection error while updating order status",
                extra={
                    "error_code": ERR_SERVICE_UNAVAILABLE_DB,
                    "cause": str(e.orig),
                    "extra_data": {"order_id": order_id},
                },
                exc_info=True,
            )
            raise ServiceUnavailableError(
                code=ERR_SERVICE_UNAVAILABLE_DB,
                message="The service is temporarily unavailable. Please try again later.",
                retry_after=5,
            ) from e

        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(
                "Unexpected database error while updating order status",
                extra={
                    "error_code": ERR_INTERNAL_DB_QUERY,
                    "cause": str(e),
                    "extra_data": {"order_id": order_id},
                },
                exc_info=True,
            )
            raise InternalError(
                code=ERR_INTERNAL_DB_QUERY,
                message="An unexpected error occurred while updating the order.",
            ) from e

    # ------------------------------------------------------------------ #
    # sync_inventory (external API call)
    # ------------------------------------------------------------------ #
    async def sync_inventory(self, product_ids: list[str]) -> dict[str, Any]:
        """Sync inventory levels from the external inventory API.

        Args:
            product_ids: List of product ID strings to sync.

        Returns:
            Dict mapping product_id to inventory data.

        Raises:
            ValidationError: If product_ids is empty.
            ExternalServiceError: If the inventory API returns an error.
            ServiceUnavailableError: If the inventory API is unreachable.
            RateLimitError: If the inventory API rate-limits us.
        """
        if not product_ids:
            raise ValidationError(
                code=ERR_VALIDATION_ORDER_ITEMS_EMPTY,
                message="At least one product ID is required for inventory sync.",
                details={
                    "field": "product_ids",
                    "message": "Must be a non-empty list.",
                },
            )

        logger.info(
            "Syncing inventory from external API",
            extra={
                "extra_data": {
                    "product_count": len(product_ids),
                    "product_ids": product_ids[:10],  # Log first 10 only
                }
            },
        )

        try:
            response = await self.http_client.post(
                "/api/v1/inventory/sync",
                json={"product_ids": product_ids},
                timeout=10.0,
            )

            # Handle HTTP error responses from the external API
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "60"))
                logger.warning(
                    "Inventory API rate limit exceeded",
                    extra={
                        "error_code": ERR_RATE_LIMIT_INVENTORY_API,
                        "extra_data": {
                            "retry_after": retry_after,
                            "product_count": len(product_ids),
                        },
                    },
                )
                raise RateLimitError(
                    code=ERR_RATE_LIMIT_INVENTORY_API,
                    message=f"Inventory API rate limit exceeded. Retry after {retry_after} seconds.",
                    retry_after=retry_after,
                )

            if response.status_code >= 500:
                logger.error(
                    "Inventory API returned server error",
                    extra={
                        "error_code": ERR_EXTERNAL_INVENTORY_RESPONSE,
                        "cause": f"HTTP {response.status_code}: {response.text[:200]}",
                        "extra_data": {
                            "status_code": response.status_code,
                            "product_count": len(product_ids),
                        },
                    },
                )
                raise ExternalServiceError(
                    code=ERR_EXTERNAL_INVENTORY_RESPONSE,
                    message="The inventory service is experiencing issues. Please try again later.",
                    details={
                        "service": "inventory-api",
                        "status_code": response.status_code,
                    },
                )

            if response.status_code >= 400:
                logger.warning(
                    "Inventory API returned client error",
                    extra={
                        "error_code": ERR_EXTERNAL_INVENTORY_RESPONSE,
                        "cause": f"HTTP {response.status_code}: {response.text[:200]}",
                        "extra_data": {
                            "status_code": response.status_code,
                            "product_count": len(product_ids),
                        },
                    },
                )
                raise ExternalServiceError(
                    code=ERR_EXTERNAL_INVENTORY_RESPONSE,
                    message="Failed to sync inventory. The request was rejected by the inventory service.",
                    details={
                        "service": "inventory-api",
                        "status_code": response.status_code,
                    },
                )

            inventory_data = response.json()

            logger.info(
                "Inventory sync completed successfully",
                extra={
                    "extra_data": {
                        "product_count": len(product_ids),
                        "synced_count": len(inventory_data),
                    }
                },
            )
            return inventory_data

        except (RateLimitError, ExternalServiceError, ValidationError):
            # Re-raise our own errors — don't wrap them again
            raise

        except httpx.TimeoutException as e:
            logger.error(
                "Inventory API request timed out",
                extra={
                    "error_code": ERR_SERVICE_UNAVAILABLE_INVENTORY_API,
                    "cause": str(e),
                    "extra_data": {"product_count": len(product_ids)},
                },
                exc_info=True,
            )
            raise ServiceUnavailableError(
                code=ERR_SERVICE_UNAVAILABLE_INVENTORY_API,
                message="The inventory service is not responding. Please try again later.",
                retry_after=10,
            ) from e

        except httpx.ConnectError as e:
            logger.error(
                "Cannot connect to inventory API",
                extra={
                    "error_code": ERR_SERVICE_UNAVAILABLE_INVENTORY_API,
                    "cause": str(e),
                    "extra_data": {"product_count": len(product_ids)},
                },
                exc_info=True,
            )
            raise ServiceUnavailableError(
                code=ERR_SERVICE_UNAVAILABLE_INVENTORY_API,
                message="The inventory service is currently unavailable. Please try again later.",
                retry_after=15,
            ) from e

        except httpx.HTTPError as e:
            logger.error(
                "Unexpected HTTP error during inventory sync",
                extra={
                    "error_code": ERR_EXTERNAL_INVENTORY_SYNC,
                    "cause": str(e),
                    "extra_data": {"product_count": len(product_ids)},
                },
                exc_info=True,
            )
            raise ExternalServiceError(
                code=ERR_EXTERNAL_INVENTORY_SYNC,
                message="An error occurred while syncing inventory. Please try again later.",
            ) from e

    # ------------------------------------------------------------------ #
    # process_payment (external API call)
    # ------------------------------------------------------------------ #
    async def process_payment(
        self,
        order_id: str,
        amount: float,
        currency: str,
        payment_method: str,
        payment_token: str,
    ) -> dict[str, Any]:
        """Process payment through the external payment gateway.

        Args:
            order_id: UUID string of the order being paid for.
            amount: Payment amount (must be positive).
            currency: ISO 4217 currency code (e.g., "USD").
            payment_method: One of: credit_card, debit_card, bank_transfer, wallet.
            payment_token: Tokenized payment credential from the client.

        Returns:
            Dict with payment confirmation details.

        Raises:
            ValidationError: If amount or payment_method is invalid.
            NotFoundError: If the order does not exist.
            ExternalServiceError: If the payment gateway returns an error or declines.
            ServiceUnavailableError: If the payment gateway is unreachable.
            RateLimitError: If the payment gateway rate-limits us.
        """
        # --- Input validation ---
        if not isinstance(amount, (int, float)) or amount <= 0:
            raise ValidationError(
                code=ERR_VALIDATION_PAYMENT_AMOUNT,
                message="Payment amount must be a positive number.",
                details={
                    "field": "amount",
                    "message": "Must be a positive number.",
                    "rejected": amount,
                },
            )

        if payment_method not in VALID_PAYMENT_METHODS:
            raise ValidationError(
                code=ERR_VALIDATION_PAYMENT_METHOD,
                message=f"Invalid payment method: '{payment_method}'.",
                details={
                    "field": "payment_method",
                    "message": f"Must be one of: {', '.join(sorted(VALID_PAYMENT_METHODS))}.",
                    "rejected": payment_method,
                },
            )

        # Verify the order exists before charging
        order = self.get_order(order_id)  # Raises NotFoundError if missing

        logger.info(
            "Processing payment",
            extra={
                "extra_data": {
                    "order_id": order_id,
                    "amount": amount,
                    "currency": currency,
                    "payment_method": payment_method,
                    # NEVER log payment_token — it's sensitive
                }
            },
        )

        try:
            response = await self.http_client.post(
                "/api/v1/payments/charge",
                json={
                    "order_id": order_id,
                    "amount": amount,
                    "currency": currency,
                    "payment_method": payment_method,
                    "payment_token": payment_token,
                },
                timeout=30.0,  # Payment calls get a longer timeout
            )

            # Handle HTTP error responses from the payment gateway
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", "60"))
                logger.warning(
                    "Payment gateway rate limit exceeded",
                    extra={
                        "error_code": ERR_RATE_LIMIT_PAYMENT_GATEWAY,
                        "extra_data": {
                            "order_id": order_id,
                            "retry_after": retry_after,
                        },
                    },
                )
                raise RateLimitError(
                    code=ERR_RATE_LIMIT_PAYMENT_GATEWAY,
                    message=f"Payment gateway rate limit exceeded. Retry after {retry_after} seconds.",
                    retry_after=retry_after,
                )

            if response.status_code == 402:
                # Payment declined — this is an expected business error
                decline_data = response.json()
                decline_reason = decline_data.get("reason", "Payment was declined.")
                logger.warning(
                    "Payment declined by gateway",
                    extra={
                        "error_code": ERR_EXTERNAL_PAYMENT_DECLINED,
                        "cause": decline_reason,
                        "extra_data": {
                            "order_id": order_id,
                            "amount": amount,
                            "currency": currency,
                        },
                    },
                )
                raise ExternalServiceError(
                    code=ERR_EXTERNAL_PAYMENT_DECLINED,
                    message="Payment was declined. Please check your payment details and try again.",
                    details={
                        "reason": decline_reason,
                    },
                )

            if response.status_code >= 500:
                logger.error(
                    "Payment gateway returned server error",
                    extra={
                        "error_code": ERR_EXTERNAL_PAYMENT_RESPONSE,
                        "cause": f"HTTP {response.status_code}: {response.text[:200]}",
                        "extra_data": {
                            "order_id": order_id,
                            "status_code": response.status_code,
                        },
                    },
                )
                raise ExternalServiceError(
                    code=ERR_EXTERNAL_PAYMENT_RESPONSE,
                    message="The payment service is experiencing issues. Please try again later.",
                    details={
                        "service": "payment-gateway",
                        "status_code": response.status_code,
                    },
                )

            if response.status_code >= 400:
                logger.warning(
                    "Payment gateway returned client error",
                    extra={
                        "error_code": ERR_EXTERNAL_PAYMENT_RESPONSE,
                        "cause": f"HTTP {response.status_code}: {response.text[:200]}",
                        "extra_data": {
                            "order_id": order_id,
                            "status_code": response.status_code,
                        },
                    },
                )
                raise ExternalServiceError(
                    code=ERR_EXTERNAL_PAYMENT_RESPONSE,
                    message="Failed to process payment. The request was rejected.",
                    details={
                        "service": "payment-gateway",
                        "status_code": response.status_code,
                    },
                )

            payment_result = response.json()

            logger.info(
                "Payment processed successfully",
                extra={
                    "extra_data": {
                        "order_id": order_id,
                        "transaction_id": payment_result.get("transaction_id"),
                        "amount": amount,
                        "currency": currency,
                    }
                },
            )
            return payment_result

        except (
            NotFoundError,
            ValidationError,
            RateLimitError,
            ExternalServiceError,
        ):
            # Re-raise our own errors — don't wrap them again
            raise

        except httpx.TimeoutException as e:
            logger.error(
                "Payment gateway request timed out",
                extra={
                    "error_code": ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY,
                    "cause": str(e),
                    "extra_data": {"order_id": order_id, "amount": amount},
                },
                exc_info=True,
            )
            raise ServiceUnavailableError(
                code=ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY,
                message="The payment service is not responding. Please try again later.",
                retry_after=15,
            ) from e

        except httpx.ConnectError as e:
            logger.error(
                "Cannot connect to payment gateway",
                extra={
                    "error_code": ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY,
                    "cause": str(e),
                    "extra_data": {"order_id": order_id, "amount": amount},
                },
                exc_info=True,
            )
            raise ServiceUnavailableError(
                code=ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY,
                message="The payment service is currently unavailable. Please try again later.",
                retry_after=30,
            ) from e

        except httpx.HTTPError as e:
            logger.error(
                "Unexpected HTTP error during payment processing",
                extra={
                    "error_code": ERR_EXTERNAL_PAYMENT_GATEWAY,
                    "cause": str(e),
                    "extra_data": {"order_id": order_id, "amount": amount},
                },
                exc_info=True,
            )
            raise ExternalServiceError(
                code=ERR_EXTERNAL_PAYMENT_GATEWAY,
                message="An error occurred while processing payment. Please try again later.",
            ) from e
```

```python
# app/models.py

"""
SQLAlchemy models for the order service.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, Float, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class OrderStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(String(255), nullable=False, index=True)
    items = Column(JSON, nullable=False)
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.PENDING)
    total_amount = Column(Float, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
```

---

## 7. Centralized Error Handler

One place converts `AppError` instances into HTTP responses. This prevents every
route from implementing its own error formatting.

```python
# app/error_handler.py

"""
Centralized error handler for FastAPI.

Converts AppError instances into standardized JSON error responses.
Handles unknown exceptions by wrapping them as InternalError.

CRITICAL RULES:
- Non-operational errors get a generic message (never leak internals)
- cause and stack appear in LOGS ONLY, never in the API response
- The API response contains code, message, and requestId only
- Validation errors include a details array with field-level info
- Rate limit errors include the Retry-After header
"""

from __future__ import annotations

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.errors.base import AppError
from app.errors.exceptions import InternalError, RateLimitError, ValidationError
from app.errors.codes import ERR_INTERNAL_UNHANDLED
from app.errors.response import build_error_response, build_error_headers
from app.logging_config import get_correlation_id, get_logger

logger = get_logger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    """Register centralized error handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        """Handle all AppError subclasses."""
        request_id = getattr(request.state, "request_id", get_correlation_id())
        target = f"{request.method} {request.url.path}"

        # Log the full error (internal details included — these stay in logs)
        log_data = {
            "error_code": exc.code,
            "status_code": exc.status_code,
            "cause": str(exc.__cause__) if exc.__cause__ else None,
            "extra_data": {
                "target": target,
                "is_operational": exc.is_operational,
                "details": exc.details,
            },
        }

        if exc.is_operational:
            logger.warning(str(exc), extra=log_data)
        else:
            # Non-operational errors are bugs — log at ERROR with stack trace
            logger.error(str(exc), extra=log_data, exc_info=True)
            # Alert on-call for non-operational errors
            _alert_oncall(exc, request_id)

        # Build the user-safe response
        response_body = build_error_response(
            error=exc,
            request_id=request_id,
            target=target,
        )

        # Build additional headers (e.g., Retry-After for 429)
        headers = build_error_headers(exc)
        headers["X-Request-Id"] = request_id

        return JSONResponse(
            status_code=exc.status_code,
            content=response_body,
            headers=headers,
        )

    @app.exception_handler(Exception)
    async def handle_unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        """Handle any exception that isn't an AppError.

        Wraps it as an InternalError so the response format is consistent.
        These are always non-operational (bugs).
        """
        request_id = getattr(request.state, "request_id", get_correlation_id())
        target = f"{request.method} {request.url.path}"

        # Wrap as InternalError — preserves the original exception as cause
        internal_error = InternalError(
            code=ERR_INTERNAL_UNHANDLED,
            message="An unexpected error occurred.",
            cause=exc,
        )

        # Log the full error with stack trace
        logger.error(
            f"Unhandled exception: {exc}",
            extra={
                "error_code": ERR_INTERNAL_UNHANDLED,
                "status_code": 500,
                "cause": str(exc),
                "extra_data": {
                    "target": target,
                    "exception_type": type(exc).__name__,
                },
            },
            exc_info=True,
        )

        # Alert on-call — unhandled exceptions are always bugs
        _alert_oncall(internal_error, request_id)

        response_body = build_error_response(
            error=internal_error,
            request_id=request_id,
            target=target,
        )

        return JSONResponse(
            status_code=500,
            content=response_body,
            headers={"X-Request-Id": request_id},
        )


def _alert_oncall(error: AppError, request_id: str) -> None:
    """Send an alert for non-operational errors.

    In production, this would integrate with PagerDuty, Opsgenie, Slack, etc.
    """
    logger.critical(
        f"ALERT: Non-operational error requires attention: {error.code}",
        extra={
            "error_code": error.code,
            "extra_data": {
                "request_id": request_id,
                "message": str(error),
                "cause": str(error.__cause__) if error.__cause__ else None,
            },
        },
    )
```

```python
# app/main.py

"""
FastAPI application entry point.

Wires up middleware, error handlers, and routes.
"""

from fastapi import FastAPI

from app.error_handler import register_error_handlers
from app.logging_config import setup_logging
from app.middleware import CorrelationIdMiddleware

# Initialize structured logging at startup
setup_logging()

app = FastAPI(title="Order Service", version="1.0.0")

# Add correlation ID middleware — must be first
app.add_middleware(CorrelationIdMiddleware)

# Register centralized error handlers
register_error_handlers(app)


# --- Routes would be registered here ---
# from app.routes import order_router
# app.include_router(order_router, prefix="/api/v1")
```

---

## 8. Error Reference Documentation

For each error code, a reference entry for API consumers and internal
developers.

### ERR_VALIDATION_ORDER_ITEMS_EMPTY

- **HTTP Status:** 400 Bad Request
- **Meaning:** The order request contained no items.
- **Common causes:** Client submitted an empty `items` array or omitted it
  entirely.
- **Resolution:** Include at least one item with `product_id`, `quantity`, and
  `unit_price`.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_ORDER_ITEMS_EMPTY",
      "message": "At least one item is required to create an order.",
      "requestId": "req_a1b2c3d4e5",
      "details": {
        "field": "items",
        "message": "Items list must not be empty."
      },
      "target": "POST /api/v1/orders"
    }
  }
  ```

### ERR_VALIDATION_ORDER_ITEMS_FORMAT

- **HTTP Status:** 400 Bad Request
- **Meaning:** An item in the order is missing required fields or has an invalid
  format.
- **Common causes:** Item object missing `product_id`, `quantity`, or
  `unit_price`.
- **Resolution:** Ensure each item is an object with all required fields.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_ORDER_ITEMS_FORMAT",
      "message": "Item is missing required fields: quantity, unit_price.",
      "requestId": "req_f6g7h8i9j0",
      "details": {
        "field": "items[0]",
        "message": "Missing required fields: quantity, unit_price."
      },
      "target": "POST /api/v1/orders"
    }
  }
  ```

### ERR_VALIDATION_ORDER_CUSTOMER_ID

- **HTTP Status:** 400 Bad Request
- **Meaning:** The customer ID is missing or invalid.
- **Common causes:** Empty string or null value for `customer_id`.
- **Resolution:** Provide a valid, non-empty customer ID string.

### ERR_VALIDATION_ORDER_QUANTITY

- **HTTP Status:** 400 Bad Request
- **Meaning:** An item quantity is not a positive integer.
- **Common causes:** Quantity is zero, negative, or a non-integer value.
- **Resolution:** Set quantity to a positive integer (1 or greater).

### ERR_VALIDATION_ORDER_STATUS

- **HTTP Status:** 400 Bad Request
- **Meaning:** The provided status value is not a recognized order status.
- **Common causes:** Typo in status string, or using a status that doesn't
  exist.
- **Resolution:** Use one of: `pending`, `confirmed`, `processing`, `shipped`,
  `delivered`, `cancelled`.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_VALIDATION_ORDER_STATUS",
      "message": "Invalid order status: 'completed'.",
      "requestId": "req_k1l2m3n4o5",
      "details": {
        "field": "status",
        "message": "Must be one of: pending, confirmed, processing, shipped, delivered, cancelled.",
        "rejected": "completed"
      },
      "target": "PATCH /api/v1/orders/123/status"
    }
  }
  ```

### ERR_VALIDATION_PAYMENT_AMOUNT

- **HTTP Status:** 400 Bad Request
- **Meaning:** The payment amount is not a positive number.
- **Common causes:** Amount is zero, negative, or not a number.
- **Resolution:** Provide a positive numeric amount.

### ERR_VALIDATION_PAYMENT_METHOD

- **HTTP Status:** 400 Bad Request
- **Meaning:** The payment method is not supported.
- **Common causes:** Using an unsupported payment method string.
- **Resolution:** Use one of: `bank_transfer`, `credit_card`, `debit_card`,
  `wallet`.

### ERR_NOT_FOUND_ORDER

- **HTTP Status:** 404 Not Found
- **Meaning:** The requested order does not exist.
- **Common causes:** Invalid order ID, order was deleted, or typo in the ID.
- **Resolution:** Verify the order ID is correct. List orders via
  `GET /api/v1/orders` to find valid IDs.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_NOT_FOUND_ORDER",
      "message": "Order 'ord_nonexistent' was not found.",
      "requestId": "req_p6q7r8s9t0",
      "target": "GET /api/v1/orders/ord_nonexistent"
    }
  }
  ```

### ERR_CONFLICT_ORDER_STATUS_TRANSITION

- **HTTP Status:** 409 Conflict
- **Meaning:** The requested status transition is not allowed by the order state
  machine.
- **Common causes:** Trying to ship a pending order (must confirm first), or
  transitioning from a terminal state (delivered, cancelled).
- **Resolution:** Check the current order status and follow the valid transition
  path: `pending -> confirmed -> processing -> shipped -> delivered`. Orders can
  be cancelled from `pending`, `confirmed`, or `processing`.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_CONFLICT_ORDER_STATUS_TRANSITION",
      "message": "Cannot transition order from 'pending' to 'shipped'.",
      "requestId": "req_u1v2w3x4y5",
      "details": {
        "current_status": "pending",
        "requested_status": "shipped",
        "allowed_transitions": ["confirmed", "cancelled"]
      },
      "target": "PATCH /api/v1/orders/123/status"
    }
  }
  ```

### ERR_CONFLICT_ORDER_DUPLICATE

- **HTTP Status:** 409 Conflict
- **Meaning:** An order with these details already exists (idempotency
  violation).
- **Common causes:** Duplicate submission of the same order, or idempotency key
  collision.
- **Resolution:** Check if the order was already created. Use a unique
  idempotency key for retries.

### ERR_EXTERNAL_INVENTORY_SYNC

- **HTTP Status:** 502 Bad Gateway
- **Meaning:** An unexpected error occurred while communicating with the
  inventory API.
- **Common causes:** Network issues, unexpected response format, or protocol
  errors.
- **Resolution:** Retry the request. If the issue persists, contact support.

### ERR_EXTERNAL_INVENTORY_RESPONSE

- **HTTP Status:** 502 Bad Gateway
- **Meaning:** The inventory API returned an error response.
- **Common causes:** Invalid product IDs, inventory API internal error.
- **Resolution:** Verify product IDs are valid. If the inventory API is
  returning 5xx errors, wait and retry.

### ERR_EXTERNAL_PAYMENT_GATEWAY

- **HTTP Status:** 502 Bad Gateway
- **Meaning:** An unexpected error occurred while communicating with the payment
  gateway.
- **Common causes:** Network issues, unexpected response format, or protocol
  errors.
- **Resolution:** Retry the request. Check the order status to see if the
  payment was actually processed before retrying.

### ERR_EXTERNAL_PAYMENT_DECLINED

- **HTTP Status:** 502 Bad Gateway
- **Meaning:** The payment was declined by the payment gateway.
- **Common causes:** Insufficient funds, expired card, fraud detection, or
  invalid payment details.
- **Resolution:** Check payment details, try a different payment method, or
  contact your bank.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_EXTERNAL_PAYMENT_DECLINED",
      "message": "Payment was declined. Please check your payment details and try again.",
      "requestId": "req_z6a7b8c9d0",
      "details": {
        "reason": "Insufficient funds"
      },
      "target": "POST /api/v1/orders/123/pay"
    }
  }
  ```

### ERR_EXTERNAL_PAYMENT_RESPONSE

- **HTTP Status:** 502 Bad Gateway
- **Meaning:** The payment gateway returned an unexpected error response.
- **Common causes:** Payment gateway internal error, malformed request.
- **Resolution:** Retry the request. Check order status before retrying to avoid
  double charges.

### ERR_INTERNAL_DB_QUERY

- **HTTP Status:** 500 Internal Server Error
- **Meaning:** An unexpected database error occurred.
- **Common causes:** Bug in query construction, schema mismatch, or data
  corruption.
- **Resolution:** This is an internal error. The team has been alerted. Please
  try again later.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_INTERNAL_DB_QUERY",
      "message": "An unexpected error occurred. Please try again later.",
      "requestId": "req_e1f2g3h4i5",
      "target": "POST /api/v1/orders"
    }
  }
  ```
  Note: The generic message is intentional — internal errors never expose
  details to clients.

### ERR_INTERNAL_UNHANDLED

- **HTTP Status:** 500 Internal Server Error
- **Meaning:** An unhandled exception occurred that wasn't caught by any
  specific error handler.
- **Common causes:** Programming error, null reference, assertion failure.
- **Resolution:** This is an internal error. The team has been alerted. Please
  try again later.

### ERR_SERVICE_UNAVAILABLE_DB

- **HTTP Status:** 503 Service Unavailable
- **Meaning:** The database is unreachable.
- **Common causes:** Database server is down, network partition, connection pool
  exhausted.
- **Resolution:** Retry after the suggested delay. If the issue persists,
  contact support.

### ERR_SERVICE_UNAVAILABLE_INVENTORY_API

- **HTTP Status:** 503 Service Unavailable
- **Meaning:** The inventory API is unreachable or not responding.
- **Common causes:** Inventory service is down, network timeout, DNS resolution
  failure.
- **Resolution:** Retry after the suggested delay.

### ERR_SERVICE_UNAVAILABLE_PAYMENT_GATEWAY

- **HTTP Status:** 503 Service Unavailable
- **Meaning:** The payment gateway is unreachable or not responding.
- **Common causes:** Payment service is down, network timeout.
- **Resolution:** Retry after the suggested delay. Check order status before
  retrying to avoid double charges.

### ERR_RATE_LIMIT_INVENTORY_API

- **HTTP Status:** 429 Too Many Requests
- **Meaning:** The inventory API rate limit has been exceeded.
- **Common causes:** Too many inventory sync requests in a short period.
- **Resolution:** Wait for the duration specified in the `Retry-After` header
  before retrying.
- **Example response:**
  ```json
  {
    "error": {
      "code": "ERR_RATE_LIMIT_INVENTORY_API",
      "message": "Inventory API rate limit exceeded. Retry after 60 seconds.",
      "requestId": "req_j6k7l8m9n0"
    }
  }
  ```
  Response includes `Retry-After: 60` header.

### ERR_RATE_LIMIT_PAYMENT_GATEWAY

- **HTTP Status:** 429 Too Many Requests
- **Meaning:** The payment gateway rate limit has been exceeded.
- **Common causes:** Too many payment processing requests in a short period.
- **Resolution:** Wait for the duration specified in the `Retry-After` header
  before retrying.

---

## 9. Complete File Listing

Here is the full directory structure of the refactored service:

```
app/
├── __init__.py
├── main.py                          # FastAPI app entry point
├── middleware.py                     # Correlation ID middleware
├── logging_config.py                # Structured JSON logging + contextvars
├── error_handler.py                 # Centralized error handler
├── models.py                        # SQLAlchemy models (Order, OrderStatus)
├── errors/
│   ├── __init__.py                  # Re-exports all error classes
│   ├── base.py                      # AppError base class
│   ├── codes.py                     # Error code constants registry
│   ├── exceptions.py                # Error subclass hierarchy
│   └── response.py                  # JSON error response builder
└── services/
    ├── __init__.py
    └── order_service.py             # Order service with error wrapping
```

---

## Error Response Checklist

Per the skill's requirements, every error response in this implementation
satisfies:

- [x] Response body follows the JSON schema (`code`, `message`, `requestId`)
- [x] Validation errors include `details` with field-level info (`field`,
      `message`, `rejected`)
- [x] 429 responses include `Retry-After` header
- [x] No stack traces, SQL, or internal paths in the response body
- [x] `requestId` matches the `X-Request-Id` response header
- [x] Non-operational errors return generic message, not the real one
- [x] Original error preserved via `cause` / `from e` in logs
- [x] Correlation IDs flow through every log line via `contextvars`
- [x] Structured JSON log output (not plaintext)
- [x] Error codes follow `ERR_<CATEGORY>_<ENTITY>[_<DETAIL>]` convention
- [x] Error codes are defined as constants in a central registry
- [x] `InternalError` always has `is_operational=False`
- [x] Centralized error handler — routes don't format their own errors
- [x] `AppError` re-raised without double-wrapping (explicit re-raise of own
      errors)
- [x] Every error reference entry documents HTTP status, meaning, causes, and
      resolution

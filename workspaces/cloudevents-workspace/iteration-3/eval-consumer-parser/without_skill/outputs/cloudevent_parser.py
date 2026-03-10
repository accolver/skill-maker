"""
CloudEvent Consumer/Parser

Parses CloudEvents from HTTP requests in both binary content mode and
structured content mode as defined by the CloudEvents v1.0 specification.

Binary mode: context attributes are mapped to HTTP headers with a "ce-" prefix,
and the data is the HTTP body.

Structured mode: the entire CloudEvent (attributes + data) is encoded in the
HTTP body as a single JSON object with Content-Type application/cloudevents+json.

References:
  - https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
  - https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/http-protocol-binding.md
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any, Dict, Optional, Union


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Required context attributes per CloudEvents v1.0
REQUIRED_ATTRIBUTES = frozenset({"specversion", "id", "source", "type"})

# Optional context attributes defined by the spec
OPTIONAL_ATTRIBUTES = frozenset({
    "datacontenttype",
    "dataschema",
    "subject",
    "time",
})

# All known context attributes (required + optional)
KNOWN_ATTRIBUTES = REQUIRED_ATTRIBUTES | OPTIONAL_ATTRIBUTES

# The Content-Type that signals structured mode
STRUCTURED_CONTENT_TYPE = "application/cloudevents+json"

# Header prefix for binary mode context attributes
CE_HEADER_PREFIX = "ce-"


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class CloudEventError(Exception):
    """Base exception for CloudEvent parsing errors."""


class InvalidCloudEventError(CloudEventError):
    """Raised when a CloudEvent is structurally invalid."""


class MissingRequiredAttributeError(CloudEventError):
    """Raised when a required context attribute is missing."""

    def __init__(self, attribute: str) -> None:
        self.attribute = attribute
        super().__init__(f"Missing required CloudEvent attribute: '{attribute}'")


class InvalidPayloadError(CloudEventError):
    """Raised when the event data/payload cannot be decoded."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalise_headers(headers: Dict[str, str]) -> Dict[str, str]:
    """Return a new dict with all header names lowercased and stripped."""
    return {k.strip().lower(): v for k, v in headers.items()}


def _is_structured_mode(content_type: Optional[str]) -> bool:
    """Determine whether the request uses structured content mode.

    Structured mode is indicated by a Content-Type of
    ``application/cloudevents+json`` (optionally with parameters such as
    ``; charset=utf-8``).
    """
    if content_type is None:
        return False
    # Strip parameters (e.g. "; charset=utf-8") and compare base type
    base_type = content_type.split(";")[0].strip().lower()
    return base_type == STRUCTURED_CONTENT_TYPE


def _is_binary_mode(headers: Dict[str, str]) -> bool:
    """Determine whether the request uses binary content mode.

    Binary mode is detected by the presence of required ``ce-`` prefixed
    headers (at minimum ``ce-specversion``, ``ce-id``, ``ce-source``,
    ``ce-type``).
    """
    return "ce-specversion" in headers or "ce-type" in headers


def _decode_data(
    raw_data: Union[str, bytes, None],
    data_content_type: Optional[str],
) -> Any:
    """Decode the event data payload.

    - If *data_content_type* indicates JSON, parse as JSON.
    - Otherwise return the raw value (string or bytes).
    """
    if raw_data is None:
        return None

    if isinstance(raw_data, bytes):
        try:
            raw_data = raw_data.decode("utf-8")
        except UnicodeDecodeError:
            # Return raw bytes if it cannot be decoded to text
            return raw_data

    if data_content_type and "json" in data_content_type.lower():
        try:
            return json.loads(raw_data)
        except (json.JSONDecodeError, TypeError) as exc:
            raise InvalidPayloadError(
                f"Data Content-Type indicates JSON but payload is not valid JSON: {exc}"
            ) from exc

    # Try JSON anyway as a convenience – many producers omit datacontenttype
    try:
        return json.loads(raw_data)
    except (json.JSONDecodeError, TypeError, ValueError):
        return raw_data


def _decode_base64_data(data_base64: str) -> bytes:
    """Decode a base64-encoded ``data_base64`` field."""
    try:
        return base64.b64decode(data_base64)
    except Exception as exc:
        raise InvalidPayloadError(
            f"data_base64 field is not valid base64: {exc}"
        ) from exc


def _validate_required(attributes: Dict[str, Any]) -> None:
    """Raise if any required context attribute is missing or empty."""
    for attr in REQUIRED_ATTRIBUTES:
        if attr not in attributes or attributes[attr] is None or attributes[attr] == "":
            raise MissingRequiredAttributeError(attr)


def _validate_specversion(specversion: str) -> None:
    """Warn / raise on unsupported specversions."""
    if specversion not in ("1.0", "0.3"):
        raise InvalidCloudEventError(
            f"Unsupported specversion '{specversion}'. Only '1.0' (and '0.3' legacy) are supported."
        )


# ---------------------------------------------------------------------------
# Structured mode parser
# ---------------------------------------------------------------------------

def _parse_structured(
    body: Union[str, bytes, dict],
    content_type: str,
) -> Dict[str, Any]:
    """Parse a structured-mode CloudEvent from the HTTP body.

    In structured mode the body is a JSON object containing both context
    attributes and data.
    """
    # --- Decode body to dict ---
    if isinstance(body, dict):
        envelope = body
    elif isinstance(body, bytes):
        try:
            body = body.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise InvalidPayloadError(f"Cannot decode body as UTF-8: {exc}") from exc
        try:
            envelope = json.loads(body)
        except json.JSONDecodeError as exc:
            raise InvalidPayloadError(
                f"Structured-mode body is not valid JSON: {exc}"
            ) from exc
    elif isinstance(body, str):
        try:
            envelope = json.loads(body)
        except json.JSONDecodeError as exc:
            raise InvalidPayloadError(
                f"Structured-mode body is not valid JSON: {exc}"
            ) from exc
    else:
        raise InvalidPayloadError(
            f"Unexpected body type: {type(body).__name__}"
        )

    if not isinstance(envelope, dict):
        raise InvalidPayloadError("Structured-mode body must be a JSON object")

    # --- Extract context attributes ---
    attributes: Dict[str, Any] = {}
    extensions: Dict[str, Any] = {}
    data: Any = None
    data_base64: Optional[str] = None

    for key, value in envelope.items():
        if key == "data":
            data = value
        elif key == "data_base64":
            data_base64 = value
        elif key in KNOWN_ATTRIBUTES:
            attributes[key] = value
        else:
            # Anything else is an extension attribute
            extensions[key] = value

    # --- Validate ---
    _validate_required(attributes)
    _validate_specversion(attributes["specversion"])

    # --- Resolve data ---
    # data_base64 takes precedence when both are present (per spec, only one
    # SHOULD be present, but we handle gracefully).
    resolved_data: Any
    if data_base64 is not None:
        resolved_data = _decode_base64_data(data_base64)
        # Attempt to further decode if datacontenttype is JSON
        dct = attributes.get("datacontenttype")
        if dct and "json" in dct.lower():
            try:
                resolved_data = json.loads(resolved_data)
            except (json.JSONDecodeError, TypeError, ValueError):
                pass  # keep as bytes
    elif data is not None:
        # data is already a native Python object from JSON parsing
        resolved_data = data
    else:
        resolved_data = None

    # --- Build result ---
    result: Dict[str, Any] = {
        **attributes,
        "data": resolved_data,
    }
    if extensions:
        result["extensions"] = extensions

    return result


# ---------------------------------------------------------------------------
# Binary mode parser
# ---------------------------------------------------------------------------

def _parse_binary(
    headers: Dict[str, str],
    body: Union[str, bytes, None],
) -> Dict[str, Any]:
    """Parse a binary-mode CloudEvent from HTTP headers + body.

    In binary mode, context attributes are transported as HTTP headers with
    the ``ce-`` prefix, and the body is the event data.
    """
    normalised = _normalise_headers(headers)

    # --- Extract context attributes from ce-* headers ---
    attributes: Dict[str, Any] = {}
    extensions: Dict[str, Any] = {}

    for header_name, header_value in normalised.items():
        if header_name.startswith(CE_HEADER_PREFIX):
            attr_name = header_name[len(CE_HEADER_PREFIX):]
            if attr_name in KNOWN_ATTRIBUTES:
                attributes[attr_name] = header_value
            else:
                extensions[attr_name] = header_value

    # datacontenttype comes from the Content-Type header (NOT ce-datacontenttype)
    if "content-type" in normalised and "datacontenttype" not in attributes:
        attributes["datacontenttype"] = normalised["content-type"]

    # --- Validate ---
    _validate_required(attributes)
    _validate_specversion(attributes["specversion"])

    # --- Decode data ---
    data_content_type = attributes.get("datacontenttype")
    resolved_data = _decode_data(body, data_content_type)

    # --- Build result ---
    result: Dict[str, Any] = {
        **attributes,
        "data": resolved_data,
    }
    if extensions:
        result["extensions"] = extensions

    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_cloudevent(
    headers: Dict[str, str],
    body: Union[str, bytes, dict, None] = None,
) -> Dict[str, Any]:
    """Parse an incoming HTTP request into a CloudEvent dict.

    Automatically detects whether the request uses **structured** or **binary**
    content mode by inspecting the ``Content-Type`` header.

    Parameters
    ----------
    headers:
        HTTP request headers (case-insensitive matching is applied internally).
    body:
        The raw HTTP request body.  May be ``str``, ``bytes``, a pre-parsed
        ``dict``, or ``None``.

    Returns
    -------
    dict
        A dictionary containing all context attributes, extension attributes
        (under an ``"extensions"`` key if present), and the ``"data"`` payload.

    Raises
    ------
    InvalidCloudEventError
        If the event cannot be identified as a valid CloudEvent.
    MissingRequiredAttributeError
        If a required context attribute is absent.
    InvalidPayloadError
        If the data payload cannot be decoded.
    """
    if not headers:
        raise InvalidCloudEventError("No headers provided; cannot parse CloudEvent.")

    normalised = _normalise_headers(headers)
    content_type = normalised.get("content-type", "")

    # --- Detect mode ---
    if _is_structured_mode(content_type):
        if body is None:
            raise InvalidPayloadError(
                "Structured-mode CloudEvent requires a body."
            )
        return _parse_structured(body, content_type)

    if _is_binary_mode(normalised):
        return _parse_binary(headers, body)

    raise InvalidCloudEventError(
        "Cannot determine CloudEvent mode. For structured mode, set "
        "Content-Type to 'application/cloudevents+json'. For binary mode, "
        "include ce-specversion and ce-type headers."
    )


def parse_cloudevent_batch(
    headers: Dict[str, str],
    body: Union[str, bytes, list],
) -> list[Dict[str, Any]]:
    """Parse a batch of structured-mode CloudEvents.

    Batched mode uses Content-Type ``application/cloudevents-batch+json`` and
    the body is a JSON array of CloudEvent objects.

    Parameters
    ----------
    headers:
        HTTP request headers.
    body:
        The raw HTTP body (a JSON array of CloudEvent objects).

    Returns
    -------
    list[dict]
        A list of parsed CloudEvent dicts.
    """
    if isinstance(body, bytes):
        body = body.decode("utf-8")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError as exc:
            raise InvalidPayloadError(f"Batch body is not valid JSON: {exc}") from exc

    if not isinstance(body, list):
        raise InvalidPayloadError("Batch body must be a JSON array.")

    results = []
    for idx, event_obj in enumerate(body):
        if not isinstance(event_obj, dict):
            raise InvalidPayloadError(
                f"Batch element at index {idx} is not a JSON object."
            )
        try:
            parsed = _parse_structured(event_obj, STRUCTURED_CONTENT_TYPE)
            results.append(parsed)
        except CloudEventError as exc:
            raise InvalidCloudEventError(
                f"Invalid CloudEvent at batch index {idx}: {exc}"
            ) from exc

    return results


# ---------------------------------------------------------------------------
# Convenience: detect mode without parsing
# ---------------------------------------------------------------------------

def detect_mode(headers: Dict[str, str]) -> str:
    """Return ``"structured"``, ``"binary"``, or ``"unknown"``.

    Parameters
    ----------
    headers:
        HTTP request headers.

    Returns
    -------
    str
        The detected CloudEvent content mode.
    """
    normalised = _normalise_headers(headers)
    content_type = normalised.get("content-type", "")

    base_type = content_type.split(";")[0].strip().lower()
    if base_type == STRUCTURED_CONTENT_TYPE:
        return "structured"
    if base_type == "application/cloudevents-batch+json":
        return "batch"
    if _is_binary_mode(normalised):
        return "binary"
    return "unknown"


# ---------------------------------------------------------------------------
# Demo / self-test when run directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("CloudEvent Parser — Demo")
    print("=" * 60)

    # ---- Structured mode example ----
    print("\n--- Structured Mode ---")
    structured_headers = {
        "Content-Type": "application/cloudevents+json; charset=utf-8",
    }
    structured_body = json.dumps({
        "specversion": "1.0",
        "id": "evt-001",
        "source": "/myapp/orders",
        "type": "com.example.order.created",
        "datacontenttype": "application/json",
        "subject": "order-12345",
        "time": "2024-01-15T12:00:00Z",
        "data": {"orderId": "12345", "amount": 99.99},
        "comexampleextension": "ext-value",
    })

    mode = detect_mode(structured_headers)
    print(f"Detected mode: {mode}")
    result = parse_cloudevent(structured_headers, structured_body)
    print(json.dumps(result, indent=2, default=str))

    # ---- Binary mode example ----
    print("\n--- Binary Mode ---")
    binary_headers = {
        "Content-Type": "application/json",
        "ce-specversion": "1.0",
        "ce-id": "evt-002",
        "ce-source": "/myapp/users",
        "ce-type": "com.example.user.updated",
        "ce-subject": "user-42",
        "ce-time": "2024-01-15T13:00:00Z",
        "ce-comexampleext": "binary-ext",
    }
    binary_body = json.dumps({"userId": "42", "name": "Alice"})

    mode = detect_mode(binary_headers)
    print(f"Detected mode: {mode}")
    result = parse_cloudevent(binary_headers, binary_body)
    print(json.dumps(result, indent=2, default=str))

    # ---- Structured mode with base64 data ----
    print("\n--- Structured Mode (base64 data) ---")
    b64_headers = {
        "Content-Type": "application/cloudevents+json",
    }
    raw_bytes = b"Hello, binary world!"
    b64_body = json.dumps({
        "specversion": "1.0",
        "id": "evt-003",
        "source": "/myapp/files",
        "type": "com.example.file.uploaded",
        "datacontenttype": "application/octet-stream",
        "data_base64": base64.b64encode(raw_bytes).decode("ascii"),
    })

    mode = detect_mode(b64_headers)
    print(f"Detected mode: {mode}")
    result = parse_cloudevent(b64_headers, b64_body)
    # data will be bytes, show repr
    display = {**result, "data": repr(result["data"])}
    print(json.dumps(display, indent=2, default=str))

    # ---- Error handling demo ----
    print("\n--- Error Handling ---")
    try:
        parse_cloudevent({"Content-Type": "application/cloudevents+json"}, '{"id": "no-specversion"}')
    except MissingRequiredAttributeError as e:
        print(f"Caught expected error: {e}")

    try:
        parse_cloudevent({}, None)
    except InvalidCloudEventError as e:
        print(f"Caught expected error: {e}")

    try:
        parse_cloudevent(
            {"Content-Type": "application/cloudevents+json"},
            "not-json-at-all",
        )
    except InvalidPayloadError as e:
        print(f"Caught expected error: {e}")

    # ---- Batch mode demo ----
    print("\n--- Batch Mode ---")
    batch_headers = {
        "Content-Type": "application/cloudevents-batch+json",
    }
    batch_body = json.dumps([
        {
            "specversion": "1.0",
            "id": "batch-1",
            "source": "/batch",
            "type": "com.example.batch",
            "data": {"index": 0},
        },
        {
            "specversion": "1.0",
            "id": "batch-2",
            "source": "/batch",
            "type": "com.example.batch",
            "data": {"index": 1},
        },
    ])
    batch_mode = detect_mode(batch_headers)
    print(f"Detected mode: {batch_mode}")
    batch_results = parse_cloudevent_batch(batch_headers, batch_body)
    for i, evt in enumerate(batch_results):
        print(f"  Event {i}: {json.dumps(evt, indent=4, default=str)}")

    print("\n" + "=" * 60)
    print("All demos passed successfully.")
    print("=" * 60)

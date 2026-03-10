"""
CloudEvent consumer/parser for HTTP binary and structured content modes.

Parses incoming HTTP requests into CloudEvent dicts conforming to the
CNCF CloudEvents v1.0.2 specification. Detects content mode by inspecting
the Content-Type header, extracts all context attributes (required, optional,
and extension), and handles both JSON and binary (base64) data payloads.

Spec references:
  - CloudEvents v1.0.2 core specification
  - HTTP Protocol Binding v1.0.2
  - JSON Event Format v1.0.2
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any, Optional
from urllib.parse import unquote


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class CloudEventError(Exception):
    """Base exception for CloudEvent parsing and validation errors."""


class InvalidCloudEventError(CloudEventError):
    """Raised when a CloudEvent fails spec validation."""


class ContentModeError(CloudEventError):
    """Raised when the content mode cannot be determined or is unsupported."""


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REQUIRED_ATTRIBUTES = frozenset({"specversion", "id", "source", "type"})

OPTIONAL_ATTRIBUTES = frozenset(
    {"datacontenttype", "dataschema", "subject", "time"}
)

KNOWN_ATTRIBUTES = REQUIRED_ATTRIBUTES | OPTIONAL_ATTRIBUTES

# specversion MUST be exactly this string (not a number).
SPEC_VERSION = "1.0"

# Content-Type prefixes for mode detection (case-insensitive).
STRUCTURED_PREFIX = "application/cloudevents"
BATCH_PREFIX = "application/cloudevents-batch"

# Extension attribute naming rules: lowercase a-z and digits 0-9 only, max 20.
EXTENSION_NAME_RE = re.compile(r"^[a-z0-9]{1,20}$")

# RFC 3339 timestamp pattern (simplified but covers the required format).
RFC3339_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$"
)

# JSON-compatible media type patterns.
_JSON_TYPE_RE = re.compile(r"(^|/)json($|[;\s])", re.IGNORECASE)
_JSON_SUFFIX_RE = re.compile(r"\+json($|[;\s])", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _is_json_content_type(ct: str) -> bool:
    """Return True if *ct* indicates JSON-compatible data (*/json or */*+json)."""
    return bool(_JSON_TYPE_RE.search(ct) or _JSON_SUFFIX_RE.search(ct))


def _normalize_header_name(name: str) -> str:
    """Lowercase a header name for case-insensitive comparison."""
    return name.lower().strip()


def _get_header(headers: dict[str, str], name: str) -> Optional[str]:
    """Case-insensitive header lookup."""
    target = name.lower()
    for key, value in headers.items():
        if key.lower() == target:
            return value
    return None


# ---------------------------------------------------------------------------
# Content-mode detection
# ---------------------------------------------------------------------------


class ContentMode:
    BINARY = "binary"
    STRUCTURED = "structured"
    BATCHED = "batched"


def detect_content_mode(headers: dict[str, str]) -> str:
    """Detect the CloudEvent content mode from HTTP headers.

    Detection order (per HTTP Protocol Binding §3.2):
      1. Content-Type starts with "application/cloudevents-batch" → Batched
      2. Content-Type starts with "application/cloudevents"       → Structured
      3. Otherwise (look for ce-* headers)                        → Binary

    The match is case-insensitive.

    Raises:
        ContentModeError: If the request has no CloudEvent indicators at all.
    """
    content_type = (_get_header(headers, "content-type") or "").lower().strip()

    # Check batch BEFORE structured (batch prefix is longer and more specific).
    if content_type.startswith(BATCH_PREFIX.lower()):
        return ContentMode.BATCHED

    if content_type.startswith(STRUCTURED_PREFIX.lower()):
        return ContentMode.STRUCTURED

    # Binary mode: expect at least ce-specversion to be present.
    has_ce_headers = any(
        k.lower().startswith("ce-") for k in headers
    )
    if has_ce_headers:
        return ContentMode.BINARY

    raise ContentModeError(
        "Cannot determine CloudEvent content mode: no 'application/cloudevents' "
        "Content-Type and no 'ce-' headers found."
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_cloud_event(event: dict[str, Any]) -> list[str]:
    """Validate a parsed CloudEvent dict against the v1.0.2 spec.

    Returns a list of human-readable error strings. An empty list means the
    event is valid.
    """
    errors: list[str] = []

    # 1. specversion must be the string "1.0".
    sv = event.get("specversion")
    if sv != SPEC_VERSION:
        errors.append(
            f'specversion must be the string "1.0", got {sv!r}'
        )

    # 2. id must be a non-empty string.
    eid = event.get("id")
    if not isinstance(eid, str) or not eid:
        errors.append(f"id must be a non-empty string, got {eid!r}")

    # 3. source must be a non-empty URI-reference.
    src = event.get("source")
    if not isinstance(src, str) or not src:
        errors.append(f"source must be a non-empty URI-reference, got {src!r}")

    # 4. type must be a non-empty string.
    etype = event.get("type")
    if not isinstance(etype, str) or not etype:
        errors.append(f"type must be a non-empty string, got {etype!r}")

    # 5. time (if present) must be RFC 3339.
    etime = event.get("time")
    if etime is not None:
        if not isinstance(etime, str) or not RFC3339_RE.match(etime):
            errors.append(
                f"time must be RFC 3339 format, got {etime!r}"
            )

    # 6. datacontenttype (if present) must be a non-empty string (RFC 2046).
    dct = event.get("datacontenttype")
    if dct is not None:
        if not isinstance(dct, str) or not dct:
            errors.append(
                f"datacontenttype must be a valid RFC 2046 media type, got {dct!r}"
            )

    # 7. dataschema (if present) must be a non-empty absolute URI.
    ds = event.get("dataschema")
    if ds is not None:
        if not isinstance(ds, str) or not ds:
            errors.append(
                f"dataschema must be a non-empty absolute URI, got {ds!r}"
            )

    # 8. data and data_base64 are mutually exclusive.
    has_data = "data" in event
    has_data_base64 = "data_base64" in event
    if has_data and has_data_base64:
        errors.append("data and data_base64 are mutually exclusive")

    # 9. Extension attribute names must be lowercase alphanumeric, max 20 chars.
    all_known = KNOWN_ATTRIBUTES | {"data", "data_base64"}
    for key in event:
        if key not in all_known:
            if not EXTENSION_NAME_RE.match(key):
                errors.append(
                    f"Extension attribute name {key!r} must be lowercase "
                    f"alphanumeric (a-z, 0-9) and max 20 characters"
                )

    return errors


# ---------------------------------------------------------------------------
# Parsing — Structured mode
# ---------------------------------------------------------------------------


def _parse_structured(
    headers: dict[str, str],
    body: str | bytes,
) -> dict[str, Any]:
    """Parse a structured-mode CloudEvent from the HTTP body.

    In structured mode the entire CloudEvent (attributes + data) is encoded
    in the body as a single JSON object with Content-Type
    ``application/cloudevents+json``.
    """
    raw = body if isinstance(body, str) else body.decode("utf-8")

    try:
        event = json.loads(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        raise InvalidCloudEventError(
            f"Structured mode body is not valid JSON: {exc}"
        ) from exc

    if not isinstance(event, dict):
        raise InvalidCloudEventError(
            "Structured mode body must be a JSON object, "
            f"got {type(event).__name__}"
        )

    return event


# ---------------------------------------------------------------------------
# Parsing — Binary mode
# ---------------------------------------------------------------------------


def _parse_binary(
    headers: dict[str, str],
    body: str | bytes,
) -> dict[str, Any]:
    """Parse a binary-mode CloudEvent from HTTP headers and body.

    In binary mode:
      - Context attributes are carried in ``ce-`` prefixed headers.
      - ``Content-Type`` carries the ``datacontenttype`` value.
      - The body contains the raw event data.
      - There MUST NOT be a ``ce-datacontenttype`` header.

    Header values are percent-decoded per the HTTP binding spec.
    """
    event: dict[str, Any] = {}

    for key, value in headers.items():
        lower_key = key.lower()
        if lower_key.startswith("ce-"):
            attr_name = lower_key[3:]  # strip "ce-" prefix

            # Per spec: MUST NOT have ce-datacontenttype in binary mode.
            if attr_name == "datacontenttype":
                raise InvalidCloudEventError(
                    "Binary mode MUST NOT include a ce-datacontenttype header. "
                    "The Content-Type header carries the datacontenttype value."
                )

            # Percent-decode the header value.
            event[attr_name] = unquote(value)

    # datacontenttype comes from Content-Type header in binary mode.
    content_type = _get_header(headers, "content-type")
    if content_type:
        event["datacontenttype"] = content_type

    # Determine effective content type for data deserialization.
    effective_ct = content_type or "application/json"  # default per spec

    # Deserialize body based on content type.
    if body is not None and (isinstance(body, bytes) and len(body) > 0 or isinstance(body, str) and len(body) > 0):
        if _is_json_content_type(effective_ct):
            # JSON data → parse into native JSON value and store in "data".
            raw = body if isinstance(body, str) else body.decode("utf-8")
            try:
                event["data"] = json.loads(raw)
            except (json.JSONDecodeError, ValueError) as exc:
                raise InvalidCloudEventError(
                    f"Binary mode body declared as JSON but failed to parse: {exc}"
                ) from exc
        else:
            # Non-JSON data → base64-encode and store in "data_base64".
            if isinstance(body, str):
                raw_bytes = body.encode("utf-8")
            else:
                raw_bytes = body
            event["data_base64"] = base64.b64encode(raw_bytes).decode("ascii")

    return event


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_cloud_event(
    headers: dict[str, str],
    body: str | bytes,
    *,
    validate: bool = True,
) -> dict[str, Any]:
    """Parse an HTTP request into a CloudEvent dict.

    Detects the content mode (binary vs structured) by inspecting the
    ``Content-Type`` header, extracts all context attributes, and returns
    a parsed CloudEvent dict.

    Args:
        headers: HTTP request headers (keys may be any case).
        body: HTTP request body as a string or bytes.
        validate: If True (default), validate the parsed event and raise
            ``InvalidCloudEventError`` on any spec violations.

    Returns:
        A dict representing the CloudEvent with all context attributes
        (``specversion``, ``id``, ``source``, ``type``, plus any optional
        and extension attributes) and either a ``data`` or ``data_base64``
        member for the payload.

    Raises:
        ContentModeError: If the content mode cannot be determined.
        InvalidCloudEventError: If the event fails spec validation
            (only when *validate* is True) or if parsing fails.

    Example — structured mode::

        event = parse_cloud_event(
            headers={"Content-Type": "application/cloudevents+json"},
            body=json.dumps({
                "specversion": "1.0",
                "type": "com.example.order.created",
                "source": "/orders",
                "id": "evt-001",
                "data": {"orderId": "123"},
            }),
        )

    Example — binary mode::

        event = parse_cloud_event(
            headers={
                "Content-Type": "application/json",
                "ce-specversion": "1.0",
                "ce-type": "com.example.order.created",
                "ce-source": "/orders",
                "ce-id": "evt-001",
            },
            body=b'{"orderId": "123"}',
        )
    """
    mode = detect_content_mode(headers)

    if mode == ContentMode.BATCHED:
        raise ContentModeError(
            "Batched mode is not supported by parse_cloud_event(). "
            "Use parse_cloud_event_batch() for batched events."
        )

    if mode == ContentMode.STRUCTURED:
        event = _parse_structured(headers, body)
    else:
        event = _parse_binary(headers, body)

    if validate:
        errors = validate_cloud_event(event)
        if errors:
            raise InvalidCloudEventError(
                "CloudEvent validation failed:\n  - " + "\n  - ".join(errors)
            )

    return event


def parse_cloud_event_batch(
    headers: dict[str, str],
    body: str | bytes,
    *,
    validate: bool = True,
) -> list[dict[str, Any]]:
    """Parse a batched CloudEvent HTTP request into a list of CloudEvent dicts.

    The Content-Type must be ``application/cloudevents-batch+json``.

    Args:
        headers: HTTP request headers.
        body: HTTP request body (JSON array of CloudEvent objects).
        validate: If True, validate each event in the batch.

    Returns:
        A list of CloudEvent dicts.

    Raises:
        ContentModeError: If the Content-Type does not indicate batch mode.
        InvalidCloudEventError: If parsing or validation fails.
    """
    mode = detect_content_mode(headers)
    if mode != ContentMode.BATCHED:
        raise ContentModeError(
            f"Expected batched content mode, got {mode!r}."
        )

    raw = body if isinstance(body, str) else body.decode("utf-8")

    try:
        batch = json.loads(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        raise InvalidCloudEventError(
            f"Batch body is not valid JSON: {exc}"
        ) from exc

    if not isinstance(batch, list):
        raise InvalidCloudEventError(
            f"Batch body must be a JSON array, got {type(batch).__name__}"
        )

    events: list[dict[str, Any]] = []
    for idx, item in enumerate(batch):
        if not isinstance(item, dict):
            raise InvalidCloudEventError(
                f"Batch item [{idx}] must be a JSON object, "
                f"got {type(item).__name__}"
            )
        if validate:
            errors = validate_cloud_event(item)
            if errors:
                raise InvalidCloudEventError(
                    f"Batch item [{idx}] validation failed:\n  - "
                    + "\n  - ".join(errors)
                )
        events.append(item)

    return events


# ---------------------------------------------------------------------------
# Convenience: detect mode and dispatch
# ---------------------------------------------------------------------------


def parse(
    headers: dict[str, str],
    body: str | bytes,
    *,
    validate: bool = True,
) -> dict[str, Any] | list[dict[str, Any]]:
    """Auto-detect content mode and parse accordingly.

    Returns a single CloudEvent dict for binary/structured modes, or a list
    of CloudEvent dicts for batched mode.
    """
    mode = detect_content_mode(headers)

    if mode == ContentMode.BATCHED:
        return parse_cloud_event_batch(headers, body, validate=validate)
    return parse_cloud_event(headers, body, validate=validate)


# ---------------------------------------------------------------------------
# Self-test / demo when run directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    print("=== CloudEvent Parser — Self-test ===\n")

    # --- Test 1: Structured mode with JSON data ---
    print("Test 1: Structured mode (JSON data)")
    structured_headers = {
        "Content-Type": "application/cloudevents+json; charset=utf-8",
    }
    structured_body = json.dumps(
        {
            "specversion": "1.0",
            "type": "com.example.order.created",
            "source": "https://example.com/orders",
            "id": "A234-1234-1234",
            "time": "2024-01-15T09:30:00Z",
            "datacontenttype": "application/json",
            "data": {"orderId": "12345", "amount": 99.99},
        }
    )
    event1 = parse_cloud_event(structured_headers, structured_body)
    assert event1["specversion"] == "1.0"
    assert event1["type"] == "com.example.order.created"
    assert event1["source"] == "https://example.com/orders"
    assert event1["id"] == "A234-1234-1234"
    assert event1["data"]["orderId"] == "12345"
    assert event1["data"]["amount"] == 99.99
    assert "data_base64" not in event1
    print(f"  PASS — parsed {len(event1)} attributes, data={event1['data']}\n")

    # --- Test 2: Binary mode with JSON data ---
    print("Test 2: Binary mode (JSON data)")
    binary_headers = {
        "Content-Type": "application/json",
        "ce-specversion": "1.0",
        "ce-type": "com.example.order.shipped",
        "ce-source": "https://example.com/orders",
        "ce-id": "B567-5678-5678",
        "ce-time": "2024-01-16T10:00:00Z",
        "ce-subject": "order-12345",
    }
    binary_body = b'{"orderId": "12345", "trackingId": "TRK-789"}'
    event2 = parse_cloud_event(binary_headers, binary_body)
    assert event2["specversion"] == "1.0"
    assert event2["type"] == "com.example.order.shipped"
    assert event2["source"] == "https://example.com/orders"
    assert event2["id"] == "B567-5678-5678"
    assert event2["subject"] == "order-12345"
    assert event2["datacontenttype"] == "application/json"
    assert event2["data"]["orderId"] == "12345"
    assert "data_base64" not in event2
    print(f"  PASS — parsed {len(event2)} attributes, data={event2['data']}\n")

    # --- Test 3: Binary mode with binary (non-JSON) data ---
    print("Test 3: Binary mode (binary/base64 data)")
    binary_img_headers = {
        "Content-Type": "image/png",
        "ce-specversion": "1.0",
        "ce-type": "com.example.image.uploaded",
        "ce-source": "/images",
        "ce-id": "C999-0001",
    }
    binary_img_body = b"\x89PNG\r\n\x1a\nfake-image-data"
    event3 = parse_cloud_event(binary_img_headers, binary_img_body)
    assert event3["specversion"] == "1.0"
    assert event3["datacontenttype"] == "image/png"
    assert "data" not in event3
    assert "data_base64" in event3
    decoded = base64.b64decode(event3["data_base64"])
    assert decoded == binary_img_body
    print(f"  PASS — data_base64 length={len(event3['data_base64'])}\n")

    # --- Test 4: Structured mode with data_base64 ---
    print("Test 4: Structured mode (data_base64)")
    structured_b64_headers = {
        "Content-Type": "application/cloudevents+json",
    }
    raw_binary = b"\x00\x01\x02\x03binary-payload"
    structured_b64_body = json.dumps(
        {
            "specversion": "1.0",
            "type": "com.example.file.uploaded",
            "source": "/files",
            "id": "D100-0001",
            "datacontenttype": "application/octet-stream",
            "data_base64": base64.b64encode(raw_binary).decode("ascii"),
        }
    )
    event4 = parse_cloud_event(structured_b64_headers, structured_b64_body)
    assert event4["specversion"] == "1.0"
    assert "data" not in event4
    assert "data_base64" in event4
    assert base64.b64decode(event4["data_base64"]) == raw_binary
    print(f"  PASS — data_base64 round-trips correctly\n")

    # --- Test 5: Extension attributes ---
    print("Test 5: Extension attributes in binary mode")
    ext_headers = {
        "Content-Type": "application/json",
        "ce-specversion": "1.0",
        "ce-type": "com.example.test",
        "ce-source": "/test",
        "ce-id": "E200-0001",
        "ce-traceparent": "00-abc123-def456-01",
        "ce-partitionkey": "user-42",
    }
    ext_body = b'{"test": true}'
    event5 = parse_cloud_event(ext_headers, ext_body)
    assert event5["traceparent"] == "00-abc123-def456-01"
    assert event5["partitionkey"] == "user-42"
    print(f"  PASS — extensions: traceparent={event5['traceparent']}, "
          f"partitionkey={event5['partitionkey']}\n")

    # --- Test 6: Percent-encoded header values in binary mode ---
    print("Test 6: Percent-encoded header values")
    pct_headers = {
        "Content-Type": "application/json",
        "ce-specversion": "1.0",
        "ce-type": "com.example.test",
        "ce-source": "https://example.com/path%20with%20spaces",
        "ce-id": "F300-0001",
    }
    pct_body = b"{}"
    event6 = parse_cloud_event(pct_headers, pct_body)
    assert event6["source"] == "https://example.com/path with spaces"
    print(f"  PASS — source decoded: {event6['source']!r}\n")

    # --- Test 7: Validation errors ---
    print("Test 7: Validation catches missing required attributes")
    try:
        bad_headers = {"Content-Type": "application/cloudevents+json"}
        bad_body = json.dumps({"specversion": "1.0", "type": "test"})
        parse_cloud_event(bad_headers, bad_body)
        print("  FAIL — should have raised InvalidCloudEventError")
        sys.exit(1)
    except InvalidCloudEventError as exc:
        assert "id" in str(exc)
        assert "source" in str(exc)
        print(f"  PASS — caught validation error: {exc}\n")

    # --- Test 8: Reject ce-datacontenttype in binary mode ---
    print("Test 8: Reject ce-datacontenttype header in binary mode")
    try:
        bad_bin_headers = {
            "Content-Type": "application/json",
            "ce-specversion": "1.0",
            "ce-type": "com.example.test",
            "ce-source": "/test",
            "ce-id": "G400-0001",
            "ce-datacontenttype": "application/json",
        }
        parse_cloud_event(bad_bin_headers, b'{}')
        print("  FAIL — should have raised InvalidCloudEventError")
        sys.exit(1)
    except InvalidCloudEventError as exc:
        assert "ce-datacontenttype" in str(exc)
        print(f"  PASS — correctly rejected: {exc}\n")

    # --- Test 9: Batch mode ---
    print("Test 9: Batch mode")
    batch_headers = {
        "Content-Type": "application/cloudevents-batch+json",
    }
    batch_body = json.dumps(
        [
            {
                "specversion": "1.0",
                "type": "com.example.a",
                "source": "/a",
                "id": "1",
                "data": {"x": 1},
            },
            {
                "specversion": "1.0",
                "type": "com.example.b",
                "source": "/b",
                "id": "2",
                "data": {"y": 2},
            },
        ]
    )
    events = parse_cloud_event_batch(batch_headers, batch_body)
    assert len(events) == 2
    assert events[0]["type"] == "com.example.a"
    assert events[1]["type"] == "com.example.b"
    print(f"  PASS — parsed {len(events)} events from batch\n")

    # --- Test 10: No CloudEvent indicators ---
    print("Test 10: No CloudEvent indicators raises ContentModeError")
    try:
        parse_cloud_event({"Content-Type": "text/plain"}, b"hello")
        print("  FAIL — should have raised ContentModeError")
        sys.exit(1)
    except ContentModeError as exc:
        print(f"  PASS — caught: {exc}\n")

    # --- Test 11: data and data_base64 mutually exclusive ---
    print("Test 11: data and data_base64 mutually exclusive")
    try:
        both_headers = {"Content-Type": "application/cloudevents+json"}
        both_body = json.dumps(
            {
                "specversion": "1.0",
                "type": "com.example.bad",
                "source": "/bad",
                "id": "H500-0001",
                "data": {"x": 1},
                "data_base64": "AQID",
            }
        )
        parse_cloud_event(both_headers, both_body)
        print("  FAIL — should have raised InvalidCloudEventError")
        sys.exit(1)
    except InvalidCloudEventError as exc:
        assert "mutually exclusive" in str(exc)
        print(f"  PASS — caught: {exc}\n")

    # --- Test 12: specversion must be string "1.0", not number ---
    print("Test 12: specversion must be string '1.0', not number")
    try:
        sv_headers = {"Content-Type": "application/cloudevents+json"}
        sv_body = json.dumps(
            {
                "specversion": 1.0,
                "type": "com.example.test",
                "source": "/test",
                "id": "I600-0001",
            }
        )
        parse_cloud_event(sv_headers, sv_body)
        print("  FAIL — should have raised InvalidCloudEventError")
        sys.exit(1)
    except InvalidCloudEventError as exc:
        assert "specversion" in str(exc)
        print(f"  PASS — caught: {exc}\n")

    # --- Test 13: Auto-detect with parse() ---
    print("Test 13: parse() auto-detects mode")
    auto_event = parse(binary_headers, binary_body)
    assert isinstance(auto_event, dict)
    assert auto_event["type"] == "com.example.order.shipped"
    auto_batch = parse(batch_headers, batch_body)
    assert isinstance(auto_batch, list)
    assert len(auto_batch) == 2
    print("  PASS — auto-detect works for both single and batch\n")

    # --- Test 14: Case-insensitive header handling ---
    print("Test 14: Case-insensitive header handling")
    ci_headers = {
        "CONTENT-TYPE": "Application/CloudEvents+JSON",
    }
    ci_body = json.dumps(
        {
            "specversion": "1.0",
            "type": "com.example.ci",
            "source": "/ci",
            "id": "J700-0001",
        }
    )
    event14 = parse_cloud_event(ci_headers, ci_body)
    assert event14["type"] == "com.example.ci"
    print("  PASS — case-insensitive Content-Type detection\n")

    print("=" * 50)
    print("All 14 tests passed!")

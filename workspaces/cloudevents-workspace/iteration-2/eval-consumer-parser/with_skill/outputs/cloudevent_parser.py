"""
CloudEvent consumer/parser for HTTP binary mode and structured mode.

Parses incoming HTTP requests into a normalized CloudEvent dict conforming
to the CNCF CloudEvents v1.0.2 specification.

Content mode detection follows the spec:
  - Content-Type starts with "application/cloudevents-batch" → Batched mode
  - Content-Type starts with "application/cloudevents"       → Structured mode
  - Otherwise (look for ce-* headers)                        → Binary mode

Match is case-insensitive.
"""

from __future__ import annotations

import base64
import json
import re
from typing import Any, Union
from urllib.parse import unquote

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REQUIRED_ATTRIBUTES = frozenset({"specversion", "id", "source", "type"})

OPTIONAL_ATTRIBUTES = frozenset(
    {"datacontenttype", "dataschema", "subject", "time"}
)

KNOWN_ATTRIBUTES = REQUIRED_ATTRIBUTES | OPTIONAL_ATTRIBUTES

# Extension attribute naming rule: lowercase a-z and digits 0-9 only, max 20
EXTENSION_NAME_RE = re.compile(r"^[a-z0-9]{1,20}$")

# RFC 3339 timestamp (simplified but covers the required format)
RFC3339_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$"
)

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class CloudEventError(Exception):
    """Base exception for CloudEvent parsing errors."""


class InvalidCloudEvent(CloudEventError):
    """Raised when a CloudEvent fails validation."""


class UnsupportedContentMode(CloudEventError):
    """Raised for unsupported content modes (e.g., batch)."""


# ---------------------------------------------------------------------------
# Content mode detection
# ---------------------------------------------------------------------------


def detect_content_mode(content_type: str) -> str:
    """Detect the CloudEvent content mode from the Content-Type header.

    Returns one of: "structured", "batched", "binary".

    Per the spec, detection is case-insensitive:
      - Content-Type starts with "application/cloudevents-batch" → Batched
      - Content-Type starts with "application/cloudevents"       → Structured
      - Anything else                                            → Binary
    """
    ct_lower = content_type.strip().lower()

    # Order matters: check batch FIRST since it also starts with
    # "application/cloudevents"
    if ct_lower.startswith("application/cloudevents-batch"):
        return "batched"
    if ct_lower.startswith("application/cloudevents"):
        return "structured"
    return "binary"


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_required_attributes(event: dict[str, Any]) -> list[str]:
    """Check that all four REQUIRED attributes are present and valid."""
    errors: list[str] = []

    # specversion
    sv = event.get("specversion")
    if sv is None:
        errors.append("Missing REQUIRED attribute: specversion")
    elif sv != "1.0":
        errors.append(
            f'specversion MUST be the string "1.0", got {sv!r}'
        )

    # id
    eid = event.get("id")
    if eid is None:
        errors.append("Missing REQUIRED attribute: id")
    elif not isinstance(eid, str) or eid == "":
        errors.append("id MUST be a non-empty string")

    # source
    src = event.get("source")
    if src is None:
        errors.append("Missing REQUIRED attribute: source")
    elif not isinstance(src, str) or src == "":
        errors.append("source MUST be a non-empty URI-reference string")

    # type
    etype = event.get("type")
    if etype is None:
        errors.append("Missing REQUIRED attribute: type")
    elif not isinstance(etype, str) or etype == "":
        errors.append("type MUST be a non-empty string")

    return errors


def _validate_optional_attributes(event: dict[str, Any]) -> list[str]:
    """Validate OPTIONAL attributes when present."""
    errors: list[str] = []

    # time — RFC 3339
    t = event.get("time")
    if t is not None:
        if not isinstance(t, str) or not RFC3339_RE.match(t):
            errors.append(
                f"time MUST be RFC 3339 format, got {t!r}"
            )

    # datacontenttype — RFC 2046 media type (basic check: contains '/')
    dct = event.get("datacontenttype")
    if dct is not None:
        if not isinstance(dct, str) or "/" not in dct:
            errors.append(
                f"datacontenttype MUST be a valid RFC 2046 media type, got {dct!r}"
            )

    # dataschema — non-empty absolute URI
    ds = event.get("dataschema")
    if ds is not None:
        if not isinstance(ds, str) or ds == "":
            errors.append("dataschema MUST be a non-empty absolute URI")

    # subject — non-empty string
    subj = event.get("subject")
    if subj is not None:
        if not isinstance(subj, str) or subj == "":
            errors.append("subject MUST be a non-empty string")

    return errors


def _validate_data_fields(event: dict[str, Any]) -> list[str]:
    """Validate data and data_base64 mutual exclusivity."""
    errors: list[str] = []
    has_data = "data" in event
    has_data_base64 = "data_base64" in event

    if has_data and has_data_base64:
        errors.append("data and data_base64 are mutually exclusive")

    if has_data_base64:
        val = event["data_base64"]
        if not isinstance(val, str):
            errors.append("data_base64 MUST be a Base64-encoded string")
        else:
            try:
                base64.b64decode(val, validate=True)
            except Exception:
                errors.append("data_base64 contains invalid Base64")

    return errors


def _validate_extension_names(event: dict[str, Any]) -> list[str]:
    """Validate that extension attribute names follow the naming rules."""
    errors: list[str] = []
    reserved = KNOWN_ATTRIBUTES | {"data", "data_base64"}

    for key in event:
        if key in reserved:
            continue
        if not EXTENSION_NAME_RE.match(key):
            errors.append(
                f"Extension attribute name {key!r} MUST be lowercase "
                f"alphanumeric (a-z, 0-9) and max 20 characters"
            )

    return errors


def validate_cloudevent(event: dict[str, Any]) -> list[str]:
    """Validate a parsed CloudEvent dict. Returns a list of error strings.

    An empty list means the event is valid.
    """
    errors: list[str] = []
    errors.extend(_validate_required_attributes(event))
    errors.extend(_validate_optional_attributes(event))
    errors.extend(_validate_data_fields(event))
    errors.extend(_validate_extension_names(event))
    return errors


# ---------------------------------------------------------------------------
# Parsing: Structured mode
# ---------------------------------------------------------------------------


def _parse_structured(body: Union[str, bytes]) -> dict[str, Any]:
    """Parse a structured-mode CloudEvent from the HTTP body.

    In structured mode the entire CloudEvent (attributes + data) is encoded
    as a single JSON object in the request body with Content-Type
    ``application/cloudevents+json``.
    """
    text = body if isinstance(body, str) else body.decode("utf-8")

    try:
        event = json.loads(text)
    except (json.JSONDecodeError, ValueError) as exc:
        raise InvalidCloudEvent(
            f"Structured mode body is not valid JSON: {exc}"
        ) from exc

    if not isinstance(event, dict):
        raise InvalidCloudEvent(
            "Structured mode body MUST be a JSON object, "
            f"got {type(event).__name__}"
        )

    return event


# ---------------------------------------------------------------------------
# Parsing: Binary mode
# ---------------------------------------------------------------------------


def _is_json_content_type(ct: str) -> bool:
    """Return True if the content type indicates JSON data.

    Matches ``*/json`` and ``*/*+json`` per the CloudEvents spec data
    serialization rules.
    """
    ct_lower = ct.strip().lower().split(";")[0].strip()
    if ct_lower.endswith("/json"):
        return True
    if "+json" in ct_lower:
        return True
    return False


def _parse_binary(
    headers: dict[str, str],
    body: Union[str, bytes],
) -> dict[str, Any]:
    """Parse a binary-mode CloudEvent from HTTP headers and body.

    In binary mode:
      - Context attributes are carried in ``ce-`` prefixed HTTP headers.
      - The ``Content-Type`` header carries the ``datacontenttype`` value
        (there MUST NOT be a ``ce-datacontenttype`` header).
      - The HTTP body contains the raw event data.

    Header values are percent-decoded per the spec's encoding rules.
    """
    event: dict[str, Any] = {}

    # Extract context attributes from ce- headers
    for raw_key, raw_value in headers.items():
        key_lower = raw_key.lower()
        if key_lower.startswith("ce-"):
            attr_name = key_lower[3:]  # strip "ce-" prefix

            # Per spec: MUST NOT have ce-datacontenttype in binary mode
            if attr_name == "datacontenttype":
                raise InvalidCloudEvent(
                    "Binary mode MUST NOT include a ce-datacontenttype header. "
                    "The Content-Type header carries the datacontenttype value."
                )

            # Percent-decode the header value
            event[attr_name] = unquote(raw_value)

    # datacontenttype comes from Content-Type header
    content_type = ""
    for raw_key, raw_value in headers.items():
        if raw_key.lower() == "content-type":
            content_type = raw_value.strip()
            break

    if content_type:
        event["datacontenttype"] = content_type

    # Parse the body based on datacontenttype
    effective_ct = content_type if content_type else "application/json"

    if _is_json_content_type(effective_ct):
        # JSON data → store as native JSON value in "data"
        text = body if isinstance(body, str) else body.decode("utf-8")
        if text.strip():
            try:
                event["data"] = json.loads(text)
            except (json.JSONDecodeError, ValueError) as exc:
                raise InvalidCloudEvent(
                    f"Binary mode body declared as JSON but is not valid JSON: {exc}"
                ) from exc
    else:
        # Non-JSON data → base64-encode into "data_base64"
        raw_bytes = body if isinstance(body, bytes) else body.encode("utf-8")
        if raw_bytes:
            event["data_base64"] = base64.b64encode(raw_bytes).decode("ascii")

    return event


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_cloudevent(
    headers: dict[str, str],
    body: Union[str, bytes],
    *,
    validate: bool = True,
) -> dict[str, Any]:
    """Parse an HTTP request into a CloudEvent dict.

    Detects the content mode by inspecting the ``Content-Type`` header:

    +----------------------------------------------+------------+
    | Content-Type prefix                          | Mode       |
    +==============================================+============+
    | ``application/cloudevents-batch``             | Batched    |
    | ``application/cloudevents``                   | Structured |
    | Anything else (with ``ce-`` headers)          | Binary     |
    +----------------------------------------------+------------+

    Parameters
    ----------
    headers:
        HTTP request headers as a ``{name: value}`` dict.  Header names
        are matched case-insensitively.
    body:
        The raw HTTP request body as ``str`` or ``bytes``.
    validate:
        If ``True`` (default), the parsed event is validated against the
        CloudEvents v1.0 spec and ``InvalidCloudEvent`` is raised on
        failure.

    Returns
    -------
    dict[str, Any]
        A normalised CloudEvent dict with context attributes as top-level
        keys.  Data is in ``data`` (native JSON value) or ``data_base64``
        (Base64-encoded string).

    Raises
    ------
    InvalidCloudEvent
        If the event fails validation (when ``validate=True``).
    UnsupportedContentMode
        If the Content-Type indicates batched mode.
    """
    # Resolve Content-Type (case-insensitive header lookup)
    content_type = ""
    for raw_key, raw_value in headers.items():
        if raw_key.lower() == "content-type":
            content_type = raw_value.strip()
            break

    mode = detect_content_mode(content_type)

    if mode == "batched":
        raise UnsupportedContentMode(
            "Batched mode (application/cloudevents-batch+json) is not "
            "supported by parse_cloudevent(). Use parse_batch() instead."
        )

    if mode == "structured":
        event = _parse_structured(body)
    else:
        event = _parse_binary(headers, body)

    if validate:
        errors = validate_cloudevent(event)
        if errors:
            raise InvalidCloudEvent(
                "CloudEvent validation failed:\n  - "
                + "\n  - ".join(errors)
            )

    return event


def parse_batch(
    body: Union[str, bytes],
    *,
    validate: bool = True,
) -> list[dict[str, Any]]:
    """Parse a batched CloudEvent request body.

    The body MUST be a JSON array of CloudEvent objects with Content-Type
    ``application/cloudevents-batch+json``.

    Parameters
    ----------
    body:
        The raw HTTP request body.
    validate:
        If ``True``, each event in the batch is validated.

    Returns
    -------
    list[dict[str, Any]]
        A list of normalised CloudEvent dicts.
    """
    text = body if isinstance(body, str) else body.decode("utf-8")

    try:
        events = json.loads(text)
    except (json.JSONDecodeError, ValueError) as exc:
        raise InvalidCloudEvent(
            f"Batch body is not valid JSON: {exc}"
        ) from exc

    if not isinstance(events, list):
        raise InvalidCloudEvent(
            "Batch body MUST be a JSON array"
        )

    if validate:
        for i, event in enumerate(events):
            if not isinstance(event, dict):
                raise InvalidCloudEvent(
                    f"Batch element {i} MUST be a JSON object"
                )
            errors = validate_cloudevent(event)
            if errors:
                raise InvalidCloudEvent(
                    f"Batch element {i} validation failed:\n  - "
                    + "\n  - ".join(errors)
                )

    return events


# ---------------------------------------------------------------------------
# Convenience: extract all context attributes from a parsed event
# ---------------------------------------------------------------------------


def extract_context_attributes(event: dict[str, Any]) -> dict[str, Any]:
    """Extract all context attributes (required + optional + extensions)
    from a parsed CloudEvent dict, excluding ``data`` and ``data_base64``.

    Returns a new dict containing only context attributes.
    """
    data_keys = {"data", "data_base64"}
    return {k: v for k, v in event.items() if k not in data_keys}


# ---------------------------------------------------------------------------
# Main — demo / smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # ---- Structured mode example ----
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

    print("=== Structured Mode ===")
    ce = parse_cloudevent(structured_headers, structured_body)
    print(f"Mode detected: structured")
    print(f"Context attributes: {extract_context_attributes(ce)}")
    print(f"Data: {ce.get('data')}")
    print()

    # ---- Binary mode example (JSON data) ----
    binary_json_headers = {
        "ce-specversion": "1.0",
        "ce-type": "com.example.order.shipped",
        "ce-source": "https://example.com/orders",
        "ce-id": "B456-5678-5678",
        "ce-time": "2024-01-15T10:00:00Z",
        "ce-subject": "order-12345",
        "Content-Type": "application/json",
    }
    binary_json_body = '{"orderId": "12345", "trackingId": "TRK-789"}'

    print("=== Binary Mode (JSON data) ===")
    ce = parse_cloudevent(binary_json_headers, binary_json_body)
    print(f"Mode detected: binary")
    print(f"Context attributes: {extract_context_attributes(ce)}")
    print(f"Data: {ce.get('data')}")
    print()

    # ---- Binary mode example (binary/base64 data) ----
    raw_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    binary_b64_headers = {
        "ce-specversion": "1.0",
        "ce-type": "com.example.image.uploaded",
        "ce-source": "https://example.com/images",
        "ce-id": "C789-9012-9012",
        "Content-Type": "image/png",
    }

    print("=== Binary Mode (binary/base64 data) ===")
    ce = parse_cloudevent(binary_b64_headers, raw_bytes)
    print(f"Mode detected: binary")
    print(f"Context attributes: {extract_context_attributes(ce)}")
    print(f"data_base64: {ce.get('data_base64')}")
    print()

    # ---- Invalid event example ----
    print("=== Invalid Event (missing required attributes) ===")
    try:
        bad_headers = {"Content-Type": "application/cloudevents+json"}
        bad_body = json.dumps({"specversion": "1.0"})
        parse_cloudevent(bad_headers, bad_body)
    except InvalidCloudEvent as exc:
        print(f"Caught InvalidCloudEvent:\n{exc}")
    print()

    # ---- Batch example ----
    print("=== Batch Mode ===")
    batch_body = json.dumps(
        [
            {
                "specversion": "1.0",
                "type": "com.example.order.created",
                "source": "/orders",
                "id": "evt-001",
                "data": {"orderId": "123"},
            },
            {
                "specversion": "1.0",
                "type": "com.example.order.shipped",
                "source": "/orders",
                "id": "evt-002",
                "data": {"orderId": "123", "trackingId": "TRK-456"},
            },
        ]
    )
    events = parse_batch(batch_body)
    print(f"Parsed {len(events)} events from batch")
    for i, ev in enumerate(events):
        print(f"  Event {i}: type={ev['type']}, id={ev['id']}")

    print("\nAll smoke tests passed.")

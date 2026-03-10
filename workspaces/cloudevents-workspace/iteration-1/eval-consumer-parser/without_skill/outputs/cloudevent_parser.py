"""
CloudEvent Consumer/Parser

Parses CloudEvents from HTTP requests in both binary mode and structured mode
per the CloudEvents v1.0 specification.

Binary mode: context attributes are in HTTP headers (ce-* prefixed),
             data is the HTTP body.
Structured mode: the entire CloudEvent (attributes + data) is encoded
                 in the HTTP body as JSON (Content-Type: application/cloudevents+json).

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

CLOUDEVENTS_CONTENT_TYPE = "application/cloudevents+json"
CLOUDEVENTS_BATCH_CONTENT_TYPE = "application/cloudevents-batch+json"

# Required context attributes (CloudEvents v1.0)
REQUIRED_ATTRIBUTES = {"specversion", "id", "source", "type"}

# All recognised context attributes (required + optional)
KNOWN_CONTEXT_ATTRIBUTES = {
    "specversion",
    "id",
    "source",
    "type",
    "datacontenttype",
    "dataschema",
    "subject",
    "time",
}

# HTTP header prefix for binary-mode context attributes
CE_HEADER_PREFIX = "ce-"

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class CloudEventError(Exception):
    """Base exception for CloudEvent parsing errors."""


class InvalidCloudEventError(CloudEventError):
    """Raised when a CloudEvent is structurally invalid."""


class MissingRequiredAttributeError(InvalidCloudEventError):
    """Raised when a required context attribute is missing."""


class InvalidPayloadError(CloudEventError):
    """Raised when the event payload cannot be decoded."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _normalise_headers(headers: Dict[str, str]) -> Dict[str, str]:
    """Return a new dict with all header names lowercased and stripped."""
    return {k.strip().lower(): v.strip() for k, v in headers.items()}


def _is_structured_mode(content_type: str) -> bool:
    """Detect structured-mode by inspecting the Content-Type header value."""
    ct = content_type.strip().lower()
    # Match "application/cloudevents+json" with optional charset / params
    return ct == CLOUDEVENTS_CONTENT_TYPE or ct.startswith(
        CLOUDEVENTS_CONTENT_TYPE + ";"
    )


def _is_batch_mode(content_type: str) -> bool:
    """Detect batch-mode by inspecting the Content-Type header value."""
    ct = content_type.strip().lower()
    return ct == CLOUDEVENTS_BATCH_CONTENT_TYPE or ct.startswith(
        CLOUDEVENTS_BATCH_CONTENT_TYPE + ";"
    )


def _decode_data(
    raw_data: Union[str, bytes, None],
    data_content_type: Optional[str],
    data_base64: Optional[str] = None,
) -> Any:
    """Decode the event data payload.

    In structured mode the spec allows either ``data`` (inline JSON) or
    ``data_base64`` (base64-encoded binary).  In binary mode the body *is*
    the data and its encoding is described by ``datacontenttype``.

    Returns the decoded Python object (dict/list for JSON, bytes for binary,
    str for text, or None).
    """
    # Handle data_base64 (structured mode with binary payload)
    if data_base64 is not None:
        try:
            return base64.b64decode(data_base64)
        except Exception as exc:
            raise InvalidPayloadError(
                f"Failed to base64-decode data_base64: {exc}"
            ) from exc

    if raw_data is None:
        return None

    # If we have bytes, decide how to interpret them
    if isinstance(raw_data, bytes):
        if data_content_type:
            dct = data_content_type.strip().lower()
            if "json" in dct:
                try:
                    return json.loads(raw_data)
                except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                    raise InvalidPayloadError(
                        f"Failed to decode JSON data payload: {exc}"
                    ) from exc
            if dct.startswith("text/"):
                try:
                    return raw_data.decode("utf-8")
                except UnicodeDecodeError as exc:
                    raise InvalidPayloadError(
                        f"Failed to decode text data payload: {exc}"
                    ) from exc
        # Default: return raw bytes
        return raw_data

    # If we have a string, try JSON first when appropriate
    if isinstance(raw_data, str):
        if data_content_type and "json" in data_content_type.lower():
            try:
                return json.loads(raw_data)
            except json.JSONDecodeError as exc:
                raise InvalidPayloadError(
                    f"Failed to decode JSON data payload: {exc}"
                ) from exc
        # For structured mode, data may already be a decoded JSON value
        return raw_data

    # Already a Python object (e.g. dict/list from structured JSON)
    return raw_data


def _validate_attributes(attributes: Dict[str, Any]) -> None:
    """Validate that all required CloudEvent context attributes are present."""
    missing = REQUIRED_ATTRIBUTES - set(attributes.keys())
    if missing:
        raise MissingRequiredAttributeError(
            f"Missing required CloudEvent attributes: {', '.join(sorted(missing))}"
        )

    # specversion must be "1.0"
    sv = attributes.get("specversion")
    if sv and sv != "1.0":
        raise InvalidCloudEventError(
            f"Unsupported specversion '{sv}'; only '1.0' is supported"
        )


def _extract_extensions(
    attributes: Dict[str, Any],
) -> Dict[str, Any]:
    """Separate extension attributes from known context attributes."""
    extensions: Dict[str, Any] = {}
    for key, value in attributes.items():
        if key not in KNOWN_CONTEXT_ATTRIBUTES and key not in (
            "data",
            "data_base64",
        ):
            extensions[key] = value
    return extensions


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_structured(body: Union[str, bytes, Dict[str, Any]]) -> Dict[str, Any]:
    """Parse a structured-mode CloudEvent from the HTTP body.

    Parameters
    ----------
    body:
        The raw HTTP body as ``str``, ``bytes``, or an already-parsed ``dict``.

    Returns
    -------
    dict
        A normalised CloudEvent dictionary with keys:
        ``specversion``, ``id``, ``source``, ``type``, and optionally
        ``datacontenttype``, ``dataschema``, ``subject``, ``time``,
        ``data``, ``extensions``, ``mode``.
    """
    # Decode body to dict
    if isinstance(body, bytes):
        try:
            body = body.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise InvalidPayloadError(
                f"Cannot decode structured body as UTF-8: {exc}"
            ) from exc

    if isinstance(body, str):
        try:
            envelope = json.loads(body)
        except json.JSONDecodeError as exc:
            raise InvalidPayloadError(
                f"Structured body is not valid JSON: {exc}"
            ) from exc
    elif isinstance(body, dict):
        envelope = body
    else:
        raise InvalidPayloadError(
            f"Unexpected body type for structured mode: {type(body).__name__}"
        )

    if not isinstance(envelope, dict):
        raise InvalidPayloadError(
            "Structured CloudEvent body must be a JSON object"
        )

    # Separate context attributes from data
    attributes: Dict[str, Any] = {}
    raw_data: Any = None
    data_base64: Optional[str] = None

    for key, value in envelope.items():
        if key == "data":
            raw_data = value
        elif key == "data_base64":
            data_base64 = value
        else:
            attributes[key] = value

    _validate_attributes(attributes)

    # Both data and data_base64 must not coexist
    if raw_data is not None and data_base64 is not None:
        raise InvalidCloudEventError(
            "Structured CloudEvent must not contain both 'data' and 'data_base64'"
        )

    # Decode data
    data_content_type = attributes.get("datacontenttype")
    decoded_data = _decode_data(raw_data, data_content_type, data_base64)

    # Build result
    result: Dict[str, Any] = {**attributes, "data": decoded_data}
    extensions = _extract_extensions(attributes)
    if extensions:
        result["extensions"] = extensions
    result["mode"] = "structured"

    return result


def parse_binary(
    headers: Dict[str, str],
    body: Union[str, bytes, None],
) -> Dict[str, Any]:
    """Parse a binary-mode CloudEvent from HTTP headers and body.

    Parameters
    ----------
    headers:
        HTTP request headers (case-insensitive matching is applied).
    body:
        The raw HTTP body (the event data payload).

    Returns
    -------
    dict
        A normalised CloudEvent dictionary (same shape as ``parse_structured``).
    """
    norm = _normalise_headers(headers)

    # Extract context attributes from ce-* headers
    attributes: Dict[str, Any] = {}
    for header_name, header_value in norm.items():
        if header_name.startswith(CE_HEADER_PREFIX):
            attr_name = header_name[len(CE_HEADER_PREFIX):]
            if attr_name:
                attributes[attr_name] = header_value

    # datacontenttype comes from Content-Type (not ce-datacontenttype)
    content_type = norm.get("content-type")
    if content_type and "datacontenttype" not in attributes:
        attributes["datacontenttype"] = content_type

    _validate_attributes(attributes)

    # Decode data
    data_content_type = attributes.get("datacontenttype")
    decoded_data = _decode_data(body, data_content_type)

    # Build result
    result: Dict[str, Any] = {**attributes, "data": decoded_data}
    extensions = _extract_extensions(attributes)
    if extensions:
        result["extensions"] = extensions
    result["mode"] = "binary"

    return result


def parse(
    headers: Dict[str, str],
    body: Union[str, bytes, None] = None,
) -> Union[Dict[str, Any], list]:
    """Auto-detect the CloudEvent transport mode and parse accordingly.

    Detection logic (per the HTTP protocol binding spec):
    - If Content-Type is ``application/cloudevents+json`` → structured mode
    - If Content-Type is ``application/cloudevents-batch+json`` → batch mode
      (returns a list of parsed CloudEvents)
    - Otherwise → binary mode (context attributes in ``ce-*`` headers)

    Parameters
    ----------
    headers:
        HTTP request headers.
    body:
        The raw HTTP body.

    Returns
    -------
    dict or list[dict]
        Parsed CloudEvent(s).

    Raises
    ------
    CloudEventError
        On any parsing or validation failure.
    """
    norm = _normalise_headers(headers)
    content_type = norm.get("content-type", "")

    # --- Structured mode ---
    if _is_structured_mode(content_type):
        if body is None:
            raise InvalidPayloadError(
                "Structured-mode CloudEvent requires a body"
            )
        return parse_structured(body)

    # --- Batch mode ---
    if _is_batch_mode(content_type):
        if body is None:
            raise InvalidPayloadError(
                "Batch-mode CloudEvent requires a body"
            )
        raw = body
        if isinstance(raw, bytes):
            try:
                raw = raw.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise InvalidPayloadError(
                    f"Cannot decode batch body as UTF-8: {exc}"
                ) from exc
        if isinstance(raw, str):
            try:
                batch = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise InvalidPayloadError(
                    f"Batch body is not valid JSON: {exc}"
                ) from exc
        else:
            batch = raw

        if not isinstance(batch, list):
            raise InvalidPayloadError(
                "Batch-mode body must be a JSON array"
            )
        return [parse_structured(event) for event in batch]

    # --- Binary mode (default) ---
    return parse_binary(headers, body)


# ---------------------------------------------------------------------------
# Convenience: from a WSGI / framework request
# ---------------------------------------------------------------------------


def from_request(
    headers: Dict[str, str],
    body: Union[str, bytes, None] = None,
    content_type: Optional[str] = None,
) -> Union[Dict[str, Any], list]:
    """Parse a CloudEvent from an HTTP request.

    This is a thin wrapper around :func:`parse` that allows passing
    ``content_type`` separately (useful when the framework exposes it
    outside the headers dict).
    """
    merged = dict(headers)
    if content_type and "content-type" not in _normalise_headers(merged):
        merged["Content-Type"] = content_type
    return parse(merged, body)


# ---------------------------------------------------------------------------
# Self-test / demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 72)
    print("CloudEvent Parser — self-test")
    print("=" * 72)

    # --- Test 1: Structured mode (JSON data) ---
    print("\n[1] Structured mode — JSON data")
    structured_body = json.dumps(
        {
            "specversion": "1.0",
            "id": "evt-001",
            "source": "/myapp/orders",
            "type": "com.example.order.created",
            "datacontenttype": "application/json",
            "subject": "order-42",
            "time": "2024-01-15T12:00:00Z",
            "data": {"orderId": 42, "amount": 99.95},
            "customext": "hello",
        }
    )
    result = parse(
        headers={"Content-Type": "application/cloudevents+json"},
        body=structured_body,
    )
    assert result["mode"] == "structured"
    assert result["id"] == "evt-001"
    assert result["source"] == "/myapp/orders"
    assert result["type"] == "com.example.order.created"
    assert result["data"]["orderId"] == 42
    assert result["extensions"] == {"customext": "hello"}
    print(f"  OK — id={result['id']}, data={result['data']}")

    # --- Test 2: Structured mode (base64 data) ---
    print("\n[2] Structured mode — base64 binary data")
    raw_bytes = b"\x89PNG\r\n\x1a\n"
    structured_b64_body = json.dumps(
        {
            "specversion": "1.0",
            "id": "evt-002",
            "source": "/myapp/images",
            "type": "com.example.image.uploaded",
            "datacontenttype": "image/png",
            "data_base64": base64.b64encode(raw_bytes).decode(),
        }
    )
    result = parse(
        headers={"Content-Type": "application/cloudevents+json"},
        body=structured_b64_body,
    )
    assert result["mode"] == "structured"
    assert result["data"] == raw_bytes
    print(f"  OK — id={result['id']}, data length={len(result['data'])} bytes")

    # --- Test 3: Binary mode (JSON data) ---
    print("\n[3] Binary mode — JSON data")
    binary_headers = {
        "Content-Type": "application/json",
        "ce-specversion": "1.0",
        "ce-id": "evt-003",
        "ce-source": "/myapp/sensors",
        "ce-type": "com.example.sensor.reading",
        "ce-subject": "sensor-7",
        "ce-time": "2024-01-15T12:05:00Z",
        "ce-myextension": "ext-value",
    }
    binary_body = json.dumps({"temperature": 22.5, "unit": "celsius"}).encode()
    result = parse(headers=binary_headers, body=binary_body)
    assert result["mode"] == "binary"
    assert result["id"] == "evt-003"
    assert result["data"]["temperature"] == 22.5
    assert result["extensions"] == {"myextension": "ext-value"}
    print(f"  OK — id={result['id']}, data={result['data']}")

    # --- Test 4: Binary mode (plain text data) ---
    print("\n[4] Binary mode — plain text data")
    text_headers = {
        "Content-Type": "text/plain",
        "ce-specversion": "1.0",
        "ce-id": "evt-004",
        "ce-source": "/myapp/logs",
        "ce-type": "com.example.log.entry",
    }
    text_body = b"Something happened at 12:05"
    result = parse(headers=text_headers, body=text_body)
    assert result["mode"] == "binary"
    assert result["data"] == "Something happened at 12:05"
    print(f"  OK — id={result['id']}, data={result['data']!r}")

    # --- Test 5: Binary mode (raw binary data) ---
    print("\n[5] Binary mode — raw binary (octet-stream) data")
    bin_headers = {
        "Content-Type": "application/octet-stream",
        "ce-specversion": "1.0",
        "ce-id": "evt-005",
        "ce-source": "/myapp/files",
        "ce-type": "com.example.file.uploaded",
    }
    bin_body = b"\x00\x01\x02\x03\xff"
    result = parse(headers=bin_headers, body=bin_body)
    assert result["mode"] == "binary"
    assert result["data"] == bin_body
    print(f"  OK — id={result['id']}, data={result['data']!r}")

    # --- Test 6: Missing required attribute ---
    print("\n[6] Error handling — missing required attribute")
    try:
        parse(
            headers={"Content-Type": "application/cloudevents+json"},
            body=json.dumps({"specversion": "1.0", "id": "bad"}),
        )
        assert False, "Should have raised"
    except MissingRequiredAttributeError as exc:
        print(f"  OK — caught: {exc}")

    # --- Test 7: Invalid JSON body ---
    print("\n[7] Error handling — invalid JSON in structured mode")
    try:
        parse(
            headers={"Content-Type": "application/cloudevents+json"},
            body="not json {{{",
        )
        assert False, "Should have raised"
    except InvalidPayloadError as exc:
        print(f"  OK — caught: {exc}")

    # --- Test 8: Unsupported specversion ---
    print("\n[8] Error handling — unsupported specversion")
    try:
        parse(
            headers={"Content-Type": "application/cloudevents+json"},
            body=json.dumps(
                {
                    "specversion": "0.3",
                    "id": "old",
                    "source": "/old",
                    "type": "old.type",
                }
            ),
        )
        assert False, "Should have raised"
    except InvalidCloudEventError as exc:
        print(f"  OK — caught: {exc}")

    # --- Test 9: Batch mode ---
    print("\n[9] Batch mode")
    batch_body = json.dumps(
        [
            {
                "specversion": "1.0",
                "id": "b1",
                "source": "/batch",
                "type": "batch.test",
                "data": {"seq": 1},
            },
            {
                "specversion": "1.0",
                "id": "b2",
                "source": "/batch",
                "type": "batch.test",
                "data": {"seq": 2},
            },
        ]
    )
    results = parse(
        headers={"Content-Type": "application/cloudevents-batch+json"},
        body=batch_body,
    )
    assert isinstance(results, list)
    assert len(results) == 2
    assert results[0]["id"] == "b1"
    assert results[1]["data"]["seq"] == 2
    print(f"  OK — parsed {len(results)} events")

    # --- Test 10: from_request convenience ---
    print("\n[10] from_request convenience wrapper")
    result = from_request(
        headers={
            "ce-specversion": "1.0",
            "ce-id": "evt-010",
            "ce-source": "/convenience",
            "ce-type": "test.convenience",
        },
        body=b'{"ok": true}',
        content_type="application/json",
    )
    assert result["mode"] == "binary"
    assert result["data"]["ok"] is True
    print(f"  OK — id={result['id']}, data={result['data']}")

    # --- Test 11: Both data and data_base64 ---
    print("\n[11] Error handling — both data and data_base64")
    try:
        parse(
            headers={"Content-Type": "application/cloudevents+json"},
            body=json.dumps(
                {
                    "specversion": "1.0",
                    "id": "dual",
                    "source": "/dual",
                    "type": "dual.type",
                    "data": {"x": 1},
                    "data_base64": "AAEC",
                }
            ),
        )
        assert False, "Should have raised"
    except InvalidCloudEventError as exc:
        print(f"  OK — caught: {exc}")

    print("\n" + "=" * 72)
    print("All tests passed!")
    print("=" * 72)

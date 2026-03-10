# CloudEvents v1.0.2 — Complete Reference

## Type System

| CloudEvents Type | JSON Mapping               | String Encoding                                         |
| ---------------- | -------------------------- | ------------------------------------------------------- |
| Boolean          | JSON boolean               | `true` or `false` (case-sensitive)                      |
| Integer          | JSON number (integer only) | Integer per RFC 7159 §6, optional minus prefix          |
| String           | JSON string                | Unicode (no control chars U+0000-U+001F, U+007F-U+009F) |
| Binary           | JSON string (Base64)       | Base64 per RFC 4648                                     |
| URI              | JSON string                | Absolute URI per RFC 3986 §4.3                          |
| URI-reference    | JSON string                | URI-reference per RFC 3986 §4.1                         |
| Timestamp        | JSON string                | RFC 3339 (e.g., `2024-01-15T09:30:00Z`)                 |

Unset attributes MAY be encoded as JSON `null`. When decoding, treat `null` as
unset/omitted.

## Context Attributes — Full Detail

### REQUIRED

#### id

- **Type:** String
- **Constraints:** Non-empty, unique within scope of `source`
- **Uniqueness rule:** `source` + `id` MUST be unique per distinct event
- **Duplicates:** If re-sent (e.g., network error), MAY reuse same `id`
- **Examples:** UUID, event counter, ULID

#### source

- **Type:** URI-reference
- **Constraints:** Non-empty; absolute URI RECOMMENDED
- **Examples:**
  - `https://github.com/cloudevents`
  - `urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66`
  - `/sensors/tn-1234567/alerts`

#### specversion

- **Type:** String
- **Value:** `"1.0"` for this version of the spec
- **Note:** Only major.minor — patch changes don't change this value

#### type

- **Type:** String
- **Constraints:** Non-empty; SHOULD use reverse-DNS prefix
- **Examples:**
  - `com.github.pull_request.opened`
  - `com.example.object.deleted.v2`

### OPTIONAL

#### datacontenttype

- **Type:** String (RFC 2046 media type)
- **Default:** `application/json` when omitted in JSON format
- **Rule:** When translating events between formats, set explicitly if source
  format omits it

#### dataschema

- **Type:** URI (absolute)
- **Rule:** Change URI on incompatible schema changes

#### subject

- **Type:** String
- **Use case:** Sub-resource qualifier within `source` context
- **Example:** blob name (`mynewfile.jpg`) when source is a storage container

#### time

- **Type:** Timestamp (RFC 3339)
- **Rule:** All producers for the same `source` MUST be consistent — either all
  use actual occurrence time or all use the same algorithm

## Extension Attributes

- Names: lowercase a-z and digits 0-9 only
- Max length: 20 characters SHOULD NOT be exceeded
- Serialized as top-level JSON properties (NOT nested)
- In HTTP binary mode: `ce-` prefixed headers
- Follow the same type system as standard attributes

## JSON Format Details

### Media Types

| Format                    | Media Type                           |
| ------------------------- | ------------------------------------ |
| Single event (structured) | `application/cloudevents+json`       |
| Batch of events           | `application/cloudevents-batch+json` |

### Data Serialization Rules

| Data type                        | JSON member                              | Value format                                                     |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| JSON data (`*/json`, `*/*+json`) | `data`                                   | Native JSON value (object, array, string, number, boolean, null) |
| Non-JSON text (e.g., XML)        | `data`                                   | JSON string with encoded content                                 |
| Binary data                      | `data_base64`                            | Base64-encoded string                                            |
| No data                          | Neither `data` nor `data_base64` present | —                                                                |

**Critical rules:**

- `data` and `data_base64` are **mutually exclusive**
- JSON data MUST be stored as a native JSON value, NOT a stringified JSON string
- If `datacontenttype` is absent, treat as `application/json`
- `data` MAY be `null` (explicit null payload ≠ absent data)

### JSON Batch Format

- Outermost element: JSON Array
- Each element: a CloudEvent in JSON format
- Empty array `[]` is valid
- MUST NOT be used when only JSON format (non-batch) support is indicated

## HTTP Protocol Binding

### Content Mode Detection (Receiver)

```
Content-Type starts with "application/cloudevents-batch" → Batched mode
Content-Type starts with "application/cloudevents"       → Structured mode
Otherwise (look for ce-* headers)                        → Binary mode
```

Match is case-insensitive.

### Binary Content Mode

**Headers:**

- `Content-Type` → the event's `datacontenttype`
- All other attributes → `ce-{attributename}` headers
- **MUST NOT** have a `ce-datacontenttype` header

**Body:** Raw event data bytes

**Header value encoding:** Characters requiring percent-encoding in `ce-` header
values:

- Space (U+0020) → `%20`
- Double-quote (U+0022) → `%22`
- Percent (U+0025) → `%25`
- Any character outside U+0021-U+007E

Encoding steps:

1. UTF-8 encode the Unicode character
2. Each byte → `%XY` (hex, uppercase RECOMMENDED)

**Example:**

```http
POST /webhook HTTP/1.1
Host: example.com
ce-specversion: 1.0
ce-type: com.example.order.created
ce-source: https://example.com/orders
ce-id: A234-1234-1234
ce-time: 2024-01-15T09:30:00Z
Content-Type: application/json

{"orderId": "12345", "amount": 99.99}
```

### Structured Content Mode

**Headers:**

- `Content-Type: application/cloudevents+json`
- MAY also include `ce-` headers (but all attributes MUST be in the body)

**Body:** Complete CloudEvent in JSON format

**Example:**

```http
POST /webhook HTTP/1.1
Host: example.com
Content-Type: application/cloudevents+json; charset=utf-8

{
  "specversion": "1.0",
  "type": "com.example.order.created",
  "source": "https://example.com/orders",
  "id": "A234-1234-1234",
  "time": "2024-01-15T09:30:00Z",
  "datacontenttype": "application/json",
  "data": {"orderId": "12345", "amount": 99.99}
}
```

### Batched Content Mode

**Headers:**

- `Content-Type: application/cloudevents-batch+json`

**Body:** JSON array of CloudEvent objects

**Rules:**

- MUST NOT be used unless solicited
- Receiver SHOULD be allowed to choose max batch size

## Kafka Protocol Binding

### Binary Content Mode

- `key`: application-defined (often event `source` or `subject`)
- `value`: event `data`
- `headers`:
  - `content-type` → `datacontenttype`
  - All other attributes → `ce_{attributename}` (underscore prefix, NOT hyphen)
  - Header values are UTF-8 encoded strings

### Structured Content Mode

- `value`: complete serialized CloudEvent
- `content-type` header: `application/cloudevents+json`

### Key Difference from HTTP

- Kafka uses `ce_` prefix (underscore), HTTP uses `ce-` prefix (hyphen)
- Kafka header values are raw UTF-8 bytes, not percent-encoded

## Size Limits

| Rule                        | Value                                   |
| --------------------------- | --------------------------------------- |
| Intermediaries MUST forward | Events ≤ 64 KB                          |
| Consumers SHOULD accept     | Events ≥ 64 KB                          |
| Producers SHOULD            | Keep events compact; link to large data |

Wire size = protocol frame metadata + event metadata + event data.

## Privacy & Security

- Context attributes: SHOULD NOT contain sensitive information (may be logged)
- Data: SHOULD be encrypted for sensitive content
- Protocol: SHOULD use TLS

## Common Event Type Patterns

```
com.{company}.{service}.{entity}.{action}
com.{company}.{service}.{entity}.{action}.v{version}
```

Examples:

- `com.example.warehouse.order.created`
- `com.example.auth.user.login.v2`
- `com.github.pull_request.opened`
- `io.cloudevents.test.event`

## Validation Checklist

1. `specversion` is string `"1.0"` (not number `1.0`)
2. `id` is non-empty string
3. `source` is non-empty URI-reference
4. `type` is non-empty string
5. `time` (if present) matches RFC 3339
6. `datacontenttype` (if present) is valid RFC 2046 media type
7. `dataschema` (if present) is non-empty absolute URI
8. All extension names: lowercase alphanumeric, ≤20 chars
9. `data` and `data_base64` are not both present
10. JSON data stored as native value, not stringified
11. HTTP binary: Content-Type = datacontenttype, no ce-datacontenttype header
12. Kafka binary: headers use `ce_` prefix (underscore), not `ce-`
13. Wire size ≤ 64 KB for safe forwarding

---
name: cloudevents
description: Build, validate, serialize, and parse CloudEvents conforming to the CNCF CloudEvents v1.0 specification. Use when working with CloudEvents, event-driven architectures, webhook payloads, event schemas, serverless events, or when the user mentions CloudEvents, cloud events, event envelopes, ce- headers, structured/binary content mode, or application/cloudevents+json. Also use when producing or consuming events over HTTP, Kafka, or AMQP that need spec-compliant metadata.
---

# CloudEvents

Build, validate, and serialize events conforming to the CNCF CloudEvents v1.0.2
specification. This skill ensures agents produce spec-compliant event
structures, correct HTTP/Kafka bindings, and proper JSON serialization — details
that agents consistently get wrong without guidance.

## When to use

- When creating or consuming CloudEvents in any language
- When building event producers, consumers, or intermediaries
- When implementing HTTP webhooks that send/receive CloudEvents
- When designing event schemas with proper `type` and `source` conventions
- When serializing events to JSON (structured mode) or HTTP headers (binary
  mode)
- When validating existing CloudEvents for spec compliance
- When batching multiple events into a single HTTP request

**Do NOT use when:**

- Working with proprietary event formats that don't follow CloudEvents
- Building generic pub/sub without CloudEvents requirements

## Workflow

### 1. Determine the event shape

Identify the REQUIRED context attributes and which OPTIONAL/extension attributes
apply. Every CloudEvent MUST have these four attributes:

| Attribute     | Type          | Rule                                       |
| ------------- | ------------- | ------------------------------------------ |
| `specversion` | String        | MUST be `"1.0"`                            |
| `id`          | String        | Non-empty, unique within scope of `source` |
| `source`      | URI-reference | Non-empty; absolute URI recommended        |
| `type`        | String        | Non-empty; reverse-DNS prefix recommended  |

OPTIONAL attributes:

| Attribute         | Type      | Notes                                                        |
| ----------------- | --------- | ------------------------------------------------------------ |
| `datacontenttype` | String    | RFC 2046 media type. Defaults to `application/json` in JSON  |
| `dataschema`      | URI       | Schema for `data`. Change URI on incompatible schema changes |
| `subject`         | String    | Sub-resource within `source` context                         |
| `time`            | Timestamp | RFC 3339 format (`2024-01-15T09:30:00Z`)                     |

Extension attributes follow the same naming rules (lowercase a-z, 0-9 only, max
20 chars) and are serialized as top-level properties in JSON or `ce-` prefixed
headers in HTTP binary mode.

### 2. Choose the content mode

There are three content modes. Pick based on your transport and consumer needs:

| Mode           | When to use                                        | Content-Type                         |
| -------------- | -------------------------------------------------- | ------------------------------------ |
| **Binary**     | Efficient transfer; consumers need raw data access | The `datacontenttype` value          |
| **Structured** | Simple forwarding across hops and protocols        | `application/cloudevents+json`       |
| **Batched**    | Multiple events in one HTTP request/response       | `application/cloudevents-batch+json` |

### 3. Serialize the event

#### JSON Structured Mode

All attributes and data go in a single JSON object. Media type:
`application/cloudevents+json`.

```json
{
  "specversion": "1.0",
  "type": "com.example.order.created",
  "source": "https://example.com/orders",
  "id": "A234-1234-1234",
  "time": "2024-01-15T09:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "orderId": "12345",
    "amount": 99.99
  }
}
```

**Data handling rules:**

- JSON data (`*/json` or `*/*+json` content type) → use `data` member, store as
  native JSON value (NOT a stringified JSON string)
- Binary data → use `data_base64` member with Base64-encoded value
- `data` and `data_base64` are mutually exclusive
- No `datacontenttype` → implied `application/json`

#### HTTP Binary Mode

Event data goes in HTTP body. All context attributes go in `ce-` prefixed
headers. The `Content-Type` header carries the `datacontenttype` value (do NOT
also send a `ce-datacontenttype` header).

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

**Header value encoding:** String values in headers MUST be percent-encoded for
characters outside printable ASCII (U+0021-U+007E), plus space (U+0020),
double-quote (U+0022), and percent (U+0025).

#### JSON Batch Mode

An array of CloudEvent JSON objects. Media type:
`application/cloudevents-batch+json`.

```json
[
  {
    "specversion": "1.0",
    "type": "com.example.order.created",
    "source": "/orders",
    "id": "evt-001",
    "data": { "orderId": "123" }
  },
  {
    "specversion": "1.0",
    "type": "com.example.order.shipped",
    "source": "/orders",
    "id": "evt-002",
    "data": { "orderId": "123", "trackingId": "TRK-456" }
  }
]
```

### 4. Validate the event

Check these rules against every CloudEvent you produce:

- [ ] `specversion` is exactly `"1.0"` (string, not number)
- [ ] `id` is a non-empty string
- [ ] `source` is a non-empty URI-reference
- [ ] `type` is a non-empty string with reverse-DNS prefix
- [ ] `time` (if present) is RFC 3339 format
- [ ] `datacontenttype` (if present) is a valid RFC 2046 media type
- [ ] `dataschema` (if present) is a non-empty absolute URI
- [ ] Extension attribute names are lowercase alphanumeric only, max 20 chars
- [ ] JSON mode: `data` and `data_base64` are not both present
- [ ] HTTP binary mode: `Content-Type` matches `datacontenttype`, no
      `ce-datacontenttype` header
- [ ] Event wire size ≤ 64 KB for safe intermediary forwarding
- [ ] No sensitive data in context attributes (only in encrypted `data`)

### 5. Implement consumer detection

Consumers receiving HTTP messages distinguish content modes by inspecting
`Content-Type`:

| Content-Type prefix                | Mode       |
| ---------------------------------- | ---------- |
| `application/cloudevents`          | Structured |
| `application/cloudevents-batch`    | Batched    |
| Anything else (with `ce-` headers) | Binary     |

## Checklist

- [ ] All four REQUIRED attributes present (`specversion`, `id`, `source`,
      `type`)
- [ ] `specversion` is the string `"1.0"`, not a number
- [ ] `type` uses reverse-DNS prefix (e.g., `com.example.object.created`)
- [ ] `source` is a valid URI-reference (absolute URI recommended)
- [ ] Content mode chosen and correct Content-Type set
- [ ] Data serialized correctly for chosen mode (JSON value vs base64 vs raw
      body)
- [ ] HTTP binary mode: attributes in `ce-` headers, no `ce-datacontenttype`
- [ ] Extension attributes follow naming rules (lowercase, alphanumeric, ≤20
      chars)

## Examples

### Producer: HTTP structured mode (TypeScript)

```typescript
import { randomUUID } from "crypto";

interface CloudEvent<T = unknown> {
  specversion: "1.0";
  type: string;
  source: string;
  id: string;
  time?: string;
  datacontenttype?: string;
  dataschema?: string;
  subject?: string;
  data?: T;
  data_base64?: string;
  [extension: string]: unknown;
}

function createCloudEvent<T>(
  type: string,
  source: string,
  data: T,
  options?: {
    subject?: string;
    datacontenttype?: string;
    dataschema?: string;
    extensions?: Record<string, string | number | boolean>;
  },
): CloudEvent<T> {
  const event: CloudEvent<T> = {
    specversion: "1.0",
    id: randomUUID(),
    type,
    source,
    time: new Date().toISOString(),
    data,
  };

  if (options?.subject) event.subject = options.subject;
  if (options?.datacontenttype) event.datacontenttype = options.datacontenttype;
  if (options?.dataschema) event.dataschema = options.dataschema;

  // Extensions are top-level properties
  if (options?.extensions) {
    for (const [key, value] of Object.entries(options.extensions)) {
      if (!/^[a-z0-9]+$/.test(key) || key.length > 20) {
        throw new Error(
          `Extension "${key}" must be lowercase alphanumeric, max 20 chars`,
        );
      }
      event[key] = value;
    }
  }

  return event;
}

// Send as structured mode
async function sendStructured(url: string, event: CloudEvent): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/cloudevents+json" },
    body: JSON.stringify(event),
  });
}

// Send as binary mode
async function sendBinary(url: string, event: CloudEvent): Promise<void> {
  const { data, data_base64, datacontenttype, ...attrs } = event;
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      headers[`ce-${key}`] = String(value);
    }
  }

  headers["Content-Type"] = datacontenttype ?? "application/json";

  await fetch(url, {
    method: "POST",
    headers,
    body: data_base64
      ? Buffer.from(data_base64, "base64")
      : JSON.stringify(data),
  });
}
```

### Consumer: detecting and parsing (TypeScript)

```typescript
function parseCloudEvent(
  headers: Record<string, string>,
  body: string | Buffer,
): CloudEvent {
  const contentType = headers["content-type"] ?? "";

  if (contentType.startsWith("application/cloudevents-batch")) {
    throw new Error("Use parseBatch() for batched events");
  }

  if (contentType.startsWith("application/cloudevents")) {
    // Structured mode: entire event is in the body
    return JSON.parse(typeof body === "string" ? body : body.toString("utf-8"));
  }

  // Binary mode: attributes in ce- headers, data in body
  const event: CloudEvent = {
    specversion: "1.0",
    id: "",
    type: "",
    source: "",
  };

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase().startsWith("ce-")) {
      const attr = key.slice(3).toLowerCase();
      event[attr] = decodeURIComponent(value);
    }
  }

  event.datacontenttype = contentType;

  if (contentType.includes("json")) {
    event.data = JSON.parse(
      typeof body === "string" ? body : body.toString("utf-8"),
    );
  } else {
    event.data_base64 = Buffer.from(body).toString("base64");
  }

  return event;
}
```

## Common mistakes

| Mistake                                               | Fix                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `specversion: 1.0` (number)                           | Must be the string `"1.0"`, not a numeric 1.0                             |
| Putting `data` as a stringified JSON string           | Store as native JSON value; use `data_base64` only for actual binary      |
| Sending both `data` and `data_base64`                 | They are mutually exclusive — pick one                                    |
| `ce-datacontenttype` header in binary mode            | Content-Type header carries this value; don't duplicate with `ce-` prefix |
| Extension names with uppercase or hyphens             | Names MUST be lowercase a-z and digits 0-9 only, no hyphens               |
| `type` without reverse-DNS prefix                     | Use `com.example.entity.action` pattern                                   |
| Missing `source` or using empty string                | MUST be a non-empty URI-reference                                         |
| Omitting `datacontenttype` when data is not JSON      | Only omit when data is JSON (it's the implied default)                    |
| Events exceeding 64 KB wire size                      | Link to large payloads instead of embedding them                          |
| Nested events inside `data` without separate envelope | Each event is its own CloudEvent; use batching for multiple events        |

## Quick reference

| Concept                           | Value                                   |
| --------------------------------- | --------------------------------------- |
| Spec version string               | `"1.0"`                                 |
| JSON structured media type        | `application/cloudevents+json`          |
| JSON batch media type             | `application/cloudevents-batch+json`    |
| HTTP header prefix (binary mode)  | `ce-`                                   |
| Attribute name rules              | lowercase a-z, digits 0-9, max 20 chars |
| Timestamp format                  | RFC 3339 (`2024-01-15T09:30:00Z`)       |
| Max safe event size               | 64 KB (wire size)                       |
| Default `datacontenttype` in JSON | `application/json` (implicit)           |
| `source` + `id` uniqueness        | MUST be unique per distinct event       |

See [references/spec-quick-ref.md](references/spec-quick-ref.md) for the
complete type system, Kafka/AMQP bindings, and extension attribute details.

## Key principles

1. **Spec compliance is binary** — An event either conforms to CloudEvents v1.0
   or it doesn't. There is no "close enough." All four REQUIRED attributes must
   be present and correctly typed.

2. **Context attributes are for routing, not data** — Attributes like `type`,
   `source`, and `subject` exist so intermediaries can route events without
   deserializing the payload. Never put sensitive or domain-specific data in
   context attributes.

3. **Content mode determines serialization** — Binary and structured modes are
   not interchangeable format choices; they have different serialization rules,
   different Content-Type values, and different header requirements. Pick one
   and follow its rules exactly.

4. **Extensions are top-level, not nested** — Extension attributes sit alongside
   core attributes (in JSON) or as `ce-` headers (in HTTP binary). They are
   never nested under an `extensions` key.

5. **Data format follows `datacontenttype`** — The `data` member is a native
   JSON value when the content type is JSON-compatible, but a string when it's
   not. Binary data uses `data_base64`. These rules are not optional.

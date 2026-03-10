import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// CloudEvent v1.0 — Type Definitions
// ---------------------------------------------------------------------------

/**
 * A CloudEvent conforming to the CNCF CloudEvents v1.0.2 specification.
 *
 * REQUIRED attributes: specversion, id, source, type
 * OPTIONAL attributes: time, datacontenttype, dataschema, subject
 *
 * Extension attributes are represented as additional top-level properties
 * (NOT nested under an "extensions" key).
 *
 * `data` and `data_base64` are mutually exclusive.
 */
interface CloudEvent<T = unknown> {
  /** MUST be the string "1.0" — not a number. */
  specversion: "1.0";
  /** Non-empty string, unique within the scope of `source`. */
  id: string;
  /** Non-empty URI-reference; absolute URI recommended. */
  source: string;
  /** Non-empty string; reverse-DNS prefix recommended (e.g. com.example.order.created). */
  type: string;
  /** RFC 3339 timestamp (e.g. "2024-01-15T09:30:00Z"). */
  time?: string;
  /** RFC 2046 media type. Implied "application/json" when omitted in JSON format. */
  datacontenttype?: string;
  /** Absolute URI pointing to the schema for `data`. */
  dataschema?: string;
  /** Sub-resource qualifier within the `source` context. */
  subject?: string;
  /** Event payload — native JSON value when content type is JSON-compatible. */
  data?: T;
  /** Base64-encoded binary payload. Mutually exclusive with `data`. */
  data_base64?: string;
  /** Extension attributes — lowercase alphanumeric only, max 20 chars. */
  [extension: string]: unknown;
}

// ---------------------------------------------------------------------------
// Domain Types — Order Processing
// ---------------------------------------------------------------------------

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface OrderCreatedData {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Extension attribute name rule: lowercase a-z and digits 0-9 only, max 20 chars. */
const EXTENSION_NAME_RE = /^[a-z0-9]+$/;
const EXTENSION_NAME_MAX_LEN = 20;

/** Reserved CloudEvent attribute names that must not be used as extensions. */
const RESERVED_ATTRIBUTES = new Set([
  "specversion",
  "id",
  "source",
  "type",
  "time",
  "datacontenttype",
  "dataschema",
  "subject",
  "data",
  "data_base64",
]);

class CloudEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudEventValidationError";
  }
}

/**
 * Validates a CloudEvent against the v1.0 specification rules.
 * Throws CloudEventValidationError on any violation.
 */
function validateCloudEvent(event: CloudEvent): void {
  // specversion MUST be the string "1.0"
  if (event.specversion !== "1.0") {
    throw new CloudEventValidationError(
      `specversion MUST be the string "1.0", got: ${JSON.stringify(event.specversion)}`,
    );
  }

  // id MUST be a non-empty string
  if (typeof event.id !== "string" || event.id.length === 0) {
    throw new CloudEventValidationError("id MUST be a non-empty string");
  }

  // source MUST be a non-empty URI-reference
  if (typeof event.source !== "string" || event.source.length === 0) {
    throw new CloudEventValidationError(
      "source MUST be a non-empty URI-reference",
    );
  }

  // type MUST be a non-empty string
  if (typeof event.type !== "string" || event.type.length === 0) {
    throw new CloudEventValidationError("type MUST be a non-empty string");
  }

  // time (if present) MUST be RFC 3339
  if (event.time !== undefined) {
    const parsed = Date.parse(event.time);
    if (Number.isNaN(parsed)) {
      throw new CloudEventValidationError(
        `time MUST be a valid RFC 3339 timestamp, got: "${event.time}"`,
      );
    }
  }

  // datacontenttype (if present) MUST be a valid RFC 2046 media type
  if (event.datacontenttype !== undefined) {
    if (
      typeof event.datacontenttype !== "string" ||
      !event.datacontenttype.includes("/")
    ) {
      throw new CloudEventValidationError(
        `datacontenttype MUST be a valid RFC 2046 media type, got: "${event.datacontenttype}"`,
      );
    }
  }

  // dataschema (if present) MUST be a non-empty absolute URI
  if (event.dataschema !== undefined) {
    if (
      typeof event.dataschema !== "string" ||
      event.dataschema.length === 0
    ) {
      throw new CloudEventValidationError(
        "dataschema MUST be a non-empty absolute URI",
      );
    }
  }

  // data and data_base64 are mutually exclusive
  if (event.data !== undefined && event.data_base64 !== undefined) {
    throw new CloudEventValidationError(
      "data and data_base64 are mutually exclusive — only one may be present",
    );
  }

  // Validate extension attribute names
  for (const key of Object.keys(event)) {
    if (RESERVED_ATTRIBUTES.has(key)) continue;
    if (!EXTENSION_NAME_RE.test(key)) {
      throw new CloudEventValidationError(
        `Extension attribute "${key}" MUST be lowercase alphanumeric only (a-z, 0-9)`,
      );
    }
    if (key.length > EXTENSION_NAME_MAX_LEN) {
      throw new CloudEventValidationError(
        `Extension attribute "${key}" exceeds max length of ${EXTENSION_NAME_MAX_LEN} characters`,
      );
    }
  }

  // Wire size check (64 KB safe limit for intermediary forwarding)
  const wireSize = new TextEncoder().encode(JSON.stringify(event)).byteLength;
  if (wireSize > 64 * 1024) {
    throw new CloudEventValidationError(
      `Event wire size (${wireSize} bytes) exceeds the 64 KB safe forwarding limit`,
    );
  }
}

// ---------------------------------------------------------------------------
// CloudEvent Factory
// ---------------------------------------------------------------------------

interface CreateCloudEventOptions {
  subject?: string;
  datacontenttype?: string;
  dataschema?: string;
  extensions?: Record<string, string | number | boolean>;
}

/**
 * Creates a spec-compliant CloudEvent with all REQUIRED attributes populated.
 *
 * - `specversion` is always `"1.0"` (string, not number)
 * - `id` is a UUID v4 generated via crypto.randomUUID()
 * - `time` is the current timestamp in RFC 3339 format
 * - Extension attributes are placed at the top level (not nested)
 * - The event is validated before being returned
 */
function createCloudEvent<T>(
  type: string,
  source: string,
  data: T,
  options?: CreateCloudEventOptions,
): CloudEvent<T> {
  const event: CloudEvent<T> = {
    specversion: "1.0",
    id: randomUUID(),
    type,
    source,
    time: new Date().toISOString(),
    datacontenttype: options?.datacontenttype ?? "application/json",
    data,
  };

  if (options?.subject) {
    event.subject = options.subject;
  }

  if (options?.dataschema) {
    event.dataschema = options.dataschema;
  }

  // Extensions are top-level properties — never nested under an "extensions" key
  if (options?.extensions) {
    for (const [key, value] of Object.entries(options.extensions)) {
      if (!EXTENSION_NAME_RE.test(key) || key.length > EXTENSION_NAME_MAX_LEN) {
        throw new CloudEventValidationError(
          `Extension "${key}" MUST be lowercase alphanumeric (a-z, 0-9), max ${EXTENSION_NAME_MAX_LEN} chars`,
        );
      }
      event[key] = value;
    }
  }

  // Validate the fully constructed event before returning
  validateCloudEvent(event);

  return event;
}

// ---------------------------------------------------------------------------
// HTTP Structured Mode Sender
// ---------------------------------------------------------------------------

/**
 * Result of sending a CloudEvent over HTTP.
 */
interface SendResult {
  success: boolean;
  statusCode: number;
  statusText: string;
}

/**
 * Sends a CloudEvent over HTTP in **structured content mode**.
 *
 * Structured mode rules (per CloudEvents HTTP Protocol Binding):
 * - Content-Type MUST be `application/cloudevents+json`
 * - The entire CloudEvent (attributes + data) is serialized as a single JSON object in the body
 * - Data is stored as a native JSON value (NOT a stringified JSON string)
 *
 * The event is validated before sending.
 */
async function sendCloudEventStructured(
  url: string,
  event: CloudEvent,
): Promise<SendResult> {
  // Validate before sending
  validateCloudEvent(event);

  const body = JSON.stringify(event);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/cloudevents+json",
    },
    body,
  });

  return {
    success: response.ok,
    statusCode: response.status,
    statusText: response.statusText,
  };
}

// ---------------------------------------------------------------------------
// Order Event Producer
// ---------------------------------------------------------------------------

/** The event source URI for the order processing service. */
const ORDER_SERVICE_SOURCE = "https://api.example.com/orders";

/** Reverse-DNS event type for order creation. */
const ORDER_CREATED_TYPE = "com.example.order.created";

/**
 * Creates and sends an `order.created` CloudEvent in HTTP structured mode.
 *
 * The event conforms to CloudEvents v1.0.2:
 * - specversion: "1.0" (string)
 * - type: "com.example.order.created" (reverse-DNS prefix)
 * - source: "https://api.example.com/orders" (absolute URI)
 * - id: UUID v4
 * - time: RFC 3339 timestamp
 * - datacontenttype: "application/json"
 * - data: native JSON object with order details (not stringified)
 *
 * Sent over HTTP with Content-Type: application/cloudevents+json (structured mode).
 */
async function emitOrderCreatedEvent(
  webhookUrl: string,
  order: OrderCreatedData,
): Promise<SendResult> {
  const event = createCloudEvent<OrderCreatedData>(
    ORDER_CREATED_TYPE,
    ORDER_SERVICE_SOURCE,
    order,
    {
      subject: order.orderId,
      dataschema:
        "https://api.example.com/schemas/order-created/v1.json",
    },
  );

  return sendCloudEventStructured(webhookUrl, event);
}

// ---------------------------------------------------------------------------
// Usage Example
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const webhookUrl = "https://webhook.example.com/events";

  const order: OrderCreatedData = {
    orderId: "ord-20240115-001",
    customerId: "cust-42",
    items: [
      {
        productId: "prod-101",
        name: "Wireless Keyboard",
        quantity: 1,
        unitPrice: 79.99,
      },
      {
        productId: "prod-202",
        name: "USB-C Cable",
        quantity: 2,
        unitPrice: 12.5,
      },
    ],
    totalAmount: 104.99,
  };

  try {
    const result = await emitOrderCreatedEvent(webhookUrl, order);

    if (result.success) {
      console.log(
        `order.created event sent successfully (HTTP ${result.statusCode})`,
      );
    } else {
      console.error(
        `Failed to send event: HTTP ${result.statusCode} ${result.statusText}`,
      );
    }
  } catch (error) {
    if (error instanceof CloudEventValidationError) {
      console.error(`CloudEvent validation failed: ${error.message}`);
    } else {
      throw error;
    }
  }
}

// Run if executed directly
main().catch(console.error);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  CloudEvent,
  CloudEventValidationError,
  CreateCloudEventOptions,
  OrderCreatedData,
  OrderItem,
  SendResult,
  createCloudEvent,
  emitOrderCreatedEvent,
  sendCloudEventStructured,
  validateCloudEvent,
};

import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// CloudEvent v1.0 Interface
// ---------------------------------------------------------------------------

/**
 * A CloudEvent conforming to the CNCF CloudEvents v1.0.2 specification.
 *
 * REQUIRED attributes: specversion, id, source, type
 * OPTIONAL attributes: datacontenttype, dataschema, subject, time
 *
 * Extension attributes are represented by the index signature and MUST use
 * lowercase alphanumeric names (a-z, 0-9) with a maximum length of 20 chars.
 * They are serialized as top-level properties in JSON structured mode.
 */
interface CloudEvent<T = unknown> {
  /** MUST be the string "1.0" — not a number. */
  specversion: "1.0";
  /** Non-empty string; reverse-DNS prefix recommended (e.g. com.example.order.created). */
  type: string;
  /** Non-empty URI-reference; absolute URI recommended. */
  source: string;
  /** Non-empty string; unique within scope of `source`. */
  id: string;
  /** RFC 3339 timestamp (e.g. 2024-01-15T09:30:00Z). */
  time?: string;
  /** RFC 2046 media type. Defaults to application/json when omitted in JSON format. */
  datacontenttype?: string;
  /** Absolute URI pointing to the schema for `data`. */
  dataschema?: string;
  /** Sub-resource qualifier within `source` context. */
  subject?: string;
  /** Event payload — native JSON value when datacontenttype is JSON-compatible. */
  data?: T;
  /** Base64-encoded binary payload. Mutually exclusive with `data`. */
  data_base64?: string;
  /** Extension attributes (lowercase alphanumeric, max 20 chars). */
  [extension: string]: unknown;
}

// ---------------------------------------------------------------------------
// Order domain types
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
  currency: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// CloudEvent factory
// ---------------------------------------------------------------------------

/**
 * Validates that an extension attribute name conforms to the CloudEvents spec:
 * lowercase a-z and digits 0-9 only, max 20 characters.
 */
function validateExtensionName(name: string): void {
  if (!/^[a-z0-9]+$/.test(name)) {
    throw new Error(
      `Extension attribute name "${name}" is invalid: must contain only lowercase a-z and digits 0-9 (no hyphens, underscores, or uppercase)`,
    );
  }
  if (name.length > 20) {
    throw new Error(
      `Extension attribute name "${name}" exceeds 20 character limit (got ${name.length})`,
    );
  }
}

/**
 * Creates a spec-compliant CloudEvent with all REQUIRED attributes populated.
 *
 * @param type   - Reverse-DNS event type (e.g. "com.example.order.created")
 * @param source - URI-reference identifying the event producer
 * @param data   - The event payload (stored as native JSON value)
 * @param options - Optional attributes and extension overrides
 */
function createCloudEvent<T>(
  type: string,
  source: string,
  data: T,
  options?: {
    id?: string;
    subject?: string;
    datacontenttype?: string;
    dataschema?: string;
    extensions?: Record<string, string | number | boolean>;
  },
): CloudEvent<T> {
  // Validate REQUIRED attribute constraints
  if (!type) throw new Error("CloudEvent 'type' MUST be a non-empty string");
  if (!source)
    throw new Error("CloudEvent 'source' MUST be a non-empty URI-reference");

  const event: CloudEvent<T> = {
    specversion: "1.0", // MUST be the string "1.0", never a number
    id: options?.id ?? randomUUID(),
    type,
    source,
    time: new Date().toISOString(), // RFC 3339 format
    datacontenttype: options?.datacontenttype ?? "application/json",
    data,
  };

  if (options?.subject) event.subject = options.subject;
  if (options?.dataschema) event.dataschema = options.dataschema;

  // Extension attributes are top-level properties (NOT nested under an "extensions" key)
  if (options?.extensions) {
    for (const [key, value] of Object.entries(options.extensions)) {
      validateExtensionName(key);
      event[key] = value;
    }
  }

  return event;
}

// ---------------------------------------------------------------------------
// HTTP structured mode sender
// ---------------------------------------------------------------------------

/**
 * Sends a CloudEvent over HTTP in **structured content mode**.
 *
 * In structured mode the entire CloudEvent (attributes + data) is serialized
 * as a single JSON object in the HTTP body. The Content-Type MUST be
 * `application/cloudevents+json`.
 *
 * @param url   - The webhook endpoint URL
 * @param event - A valid CloudEvent object
 * @returns The HTTP Response from the webhook
 */
async function sendCloudEventStructured(
  url: string,
  event: CloudEvent,
): Promise<Response> {
  // Validate the event before sending
  validateCloudEvent(event);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/cloudevents+json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to send CloudEvent: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates a CloudEvent against the v1.0.2 specification rules.
 * Throws on the first violation found.
 */
function validateCloudEvent(event: CloudEvent): void {
  // 1. specversion MUST be the string "1.0"
  if (event.specversion !== "1.0") {
    throw new Error(
      `specversion MUST be the string "1.0", got: ${JSON.stringify(event.specversion)}`,
    );
  }

  // 2. id MUST be a non-empty string
  if (typeof event.id !== "string" || event.id.length === 0) {
    throw new Error("id MUST be a non-empty string");
  }

  // 3. source MUST be a non-empty URI-reference
  if (typeof event.source !== "string" || event.source.length === 0) {
    throw new Error("source MUST be a non-empty URI-reference");
  }

  // 4. type MUST be a non-empty string
  if (typeof event.type !== "string" || event.type.length === 0) {
    throw new Error("type MUST be a non-empty string");
  }

  // 5. time (if present) MUST be RFC 3339
  if (event.time !== undefined) {
    const rfc3339 =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    if (!rfc3339.test(event.time)) {
      throw new Error(`time MUST be RFC 3339 format, got: "${event.time}"`);
    }
  }

  // 6. datacontenttype (if present) MUST be a valid RFC 2046 media type
  if (event.datacontenttype !== undefined) {
    if (
      typeof event.datacontenttype !== "string" ||
      !event.datacontenttype.includes("/")
    ) {
      throw new Error(
        `datacontenttype MUST be a valid RFC 2046 media type, got: "${event.datacontenttype}"`,
      );
    }
  }

  // 7. dataschema (if present) MUST be a non-empty absolute URI
  if (event.dataschema !== undefined) {
    if (typeof event.dataschema !== "string" || event.dataschema.length === 0) {
      throw new Error("dataschema MUST be a non-empty absolute URI");
    }
  }

  // 8. data and data_base64 are mutually exclusive
  if (event.data !== undefined && event.data_base64 !== undefined) {
    throw new Error("data and data_base64 are mutually exclusive");
  }

  // 9. Estimate wire size (≤ 64 KB recommended for safe intermediary forwarding)
  const wireSize = new TextEncoder().encode(JSON.stringify(event)).byteLength;
  if (wireSize > 65536) {
    console.warn(
      `CloudEvent wire size is ${wireSize} bytes, exceeding the 64 KB safe forwarding limit. Consider linking to large payloads instead of embedding them.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Order event producer
// ---------------------------------------------------------------------------

/**
 * Creates an `order.created` CloudEvent with the proper reverse-DNS type,
 * source URI, and structured order data payload.
 */
function createOrderCreatedEvent(
  orderId: string,
  customerId: string,
  items: OrderItem[],
  totalAmount: number,
  currency: string = "USD",
): CloudEvent<OrderCreatedData> {
  const orderData: OrderCreatedData = {
    orderId,
    customerId,
    items,
    totalAmount,
    currency,
    createdAt: new Date().toISOString(),
  };

  return createCloudEvent<OrderCreatedData>(
    "com.example.order.created", // reverse-DNS type prefix
    "https://example.com/orders", // absolute URI source
    orderData,
    {
      subject: orderId, // sub-resource qualifier: the specific order
      dataschema:
        "https://example.com/schemas/order-created/v1.json",
    },
  );
}

/**
 * Emits an order.created CloudEvent to the configured webhook endpoint
 * using HTTP structured content mode.
 */
async function emitOrderCreatedEvent(
  webhookUrl: string,
  orderId: string,
  customerId: string,
  items: OrderItem[],
  totalAmount: number,
  currency?: string,
): Promise<Response> {
  const event = createOrderCreatedEvent(
    orderId,
    customerId,
    items,
    totalAmount,
    currency,
  );

  console.log(
    `Sending order.created CloudEvent [id=${event.id}] for order ${orderId}`,
  );

  return sendCloudEventStructured(webhookUrl, event);
}

// ---------------------------------------------------------------------------
// Usage example
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const WEBHOOK_URL = "https://example.com/webhooks/orders";

  const items: OrderItem[] = [
    {
      productId: "PROD-001",
      name: "Wireless Keyboard",
      quantity: 1,
      unitPrice: 79.99,
    },
    {
      productId: "PROD-042",
      name: "USB-C Hub",
      quantity: 2,
      unitPrice: 34.99,
    },
  ];

  const totalAmount = 149.97;

  // Build the CloudEvent
  const event = createOrderCreatedEvent(
    "ORD-20240115-001",
    "CUST-9876",
    items,
    totalAmount,
    "USD",
  );

  // Inspect the event that would be sent (structured mode JSON body)
  console.log("CloudEvent (structured mode payload):");
  console.log(JSON.stringify(event, null, 2));

  // In production, send to the webhook:
  // await emitOrderCreatedEvent(WEBHOOK_URL, "ORD-20240115-001", "CUST-9876", items, totalAmount);
}

main().catch(console.error);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export type { CloudEvent, OrderCreatedData, OrderItem };
export {
  createCloudEvent,
  createOrderCreatedEvent,
  emitOrderCreatedEvent,
  sendCloudEventStructured,
  validateCloudEvent,
  validateExtensionName,
};

import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// CloudEvents v1.0 Specification – Structured Content Mode
// https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
// ---------------------------------------------------------------------------

/**
 * CloudEvent v1.0 envelope.
 *
 * REQUIRED attributes: specversion, id, source, type.
 * OPTIONAL attributes used here: time, datacontenttype, subject.
 */
export interface CloudEvent<T = unknown> {
  /** The version of the CloudEvents specification (MUST be "1.0"). */
  specversion: "1.0";

  /** Unique identifier for this event (RFC 4122 UUID recommended). */
  id: string;

  /**
   * Identifies the context in which the event happened.
   * MUST be a valid URI-reference (RFC 3986).
   */
  source: string;

  /**
   * Describes the type of event related to the originating occurrence.
   * SHOULD be prefixed with a reverse-DNS name.
   */
  type: string;

  /** Timestamp of when the occurrence happened (RFC 3339). */
  time?: string;

  /** Content type of the `data` value (e.g. "application/json"). */
  datacontenttype?: string;

  /** Describes the subject of the event in the context of the source. */
  subject?: string;

  /** The event payload. */
  data?: T;
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderCreatedData {
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

const EVENT_SOURCE = "/order-service";
const EVENT_TYPE = "order.created";

/**
 * Build a CloudEvent<OrderCreatedData> with all required and recommended
 * attributes populated.
 */
export function buildOrderCreatedEvent(
  data: OrderCreatedData
): CloudEvent<OrderCreatedData> {
  return {
    specversion: "1.0",
    id: randomUUID(),
    source: EVENT_SOURCE,
    type: EVENT_TYPE,
    time: new Date().toISOString(),
    datacontenttype: "application/json",
    subject: data.orderId,
    data,
  };
}

// ---------------------------------------------------------------------------
// HTTP sender – structured content mode
// ---------------------------------------------------------------------------

export interface SendResult {
  ok: boolean;
  status: number;
  statusText: string;
  body?: string;
}

/**
 * Send a CloudEvent over HTTP using **structured content mode**.
 *
 * In structured mode the entire event (metadata + data) is encoded in the
 * HTTP body and the Content-Type header is set to
 * `application/cloudevents+json; charset=utf-8`.
 *
 * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/http-protocol-binding.md#32-structured-content-mode
 */
export async function sendCloudEvent<T>(
  webhookUrl: string,
  event: CloudEvent<T>
): Promise<SendResult> {
  const body = JSON.stringify(event);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/cloudevents+json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body, "utf-8").toString(),
    },
    body,
  });

  const responseBody = await response.text().catch(() => undefined);

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: responseBody,
  };
}

// ---------------------------------------------------------------------------
// High-level producer function
// ---------------------------------------------------------------------------

export interface EmitOptions {
  /** The webhook endpoint URL to POST the CloudEvent to. */
  webhookUrl: string;

  /** Number of retry attempts on transient failures (default: 3). */
  retries?: number;

  /** Base delay in ms between retries – doubled each attempt (default: 500). */
  retryDelayMs?: number;
}

/**
 * Emit an `order.created` CloudEvent to the configured webhook endpoint.
 *
 * Builds the event envelope, serialises it in structured content mode, and
 * sends it over HTTP with exponential-backoff retries for transient errors
 * (HTTP 429 / 5xx).
 */
export async function emitOrderCreatedEvent(
  data: OrderCreatedData,
  options: EmitOptions
): Promise<SendResult> {
  const { webhookUrl, retries = 3, retryDelayMs = 500 } = options;

  const event = buildOrderCreatedEvent(data);

  let lastResult: SendResult | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      lastResult = await sendCloudEvent(webhookUrl, event);

      // Treat 2xx as success
      if (lastResult.ok) {
        return lastResult;
      }

      // Only retry on transient server errors or rate-limiting
      const retryable =
        lastResult.status === 429 || lastResult.status >= 500;

      if (!retryable || attempt === retries) {
        return lastResult;
      }
    } catch (error: unknown) {
      // Network-level errors are retryable
      if (attempt === retries) {
        throw error;
      }
    }

    // Exponential backoff
    const delay = retryDelayMs * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Should be unreachable, but satisfies the type checker.
  return lastResult!;
}

// ---------------------------------------------------------------------------
// Example usage (runs when executed directly)
// ---------------------------------------------------------------------------

async function main() {
  const WEBHOOK_URL =
    process.env.WEBHOOK_URL ?? "https://example.com/webhooks/orders";

  const orderData: OrderCreatedData = {
    orderId: "ord_abc123",
    customerId: "cust_xyz789",
    items: [
      {
        productId: "prod_001",
        name: "Wireless Keyboard",
        quantity: 1,
        unitPrice: 59.99,
      },
      {
        productId: "prod_002",
        name: "USB-C Cable",
        quantity: 3,
        unitPrice: 12.99,
      },
    ],
    totalAmount: 98.96,
    currency: "USD",
    createdAt: new Date().toISOString(),
  };

  console.log("Building CloudEvent for order:", orderData.orderId);

  // Show the event envelope that would be sent
  const event = buildOrderCreatedEvent(orderData);
  console.log(
    "\nCloudEvent (structured mode payload):\n",
    JSON.stringify(event, null, 2)
  );

  // Attempt to send (will fail against the example URL, but demonstrates the flow)
  try {
    const result = await emitOrderCreatedEvent(orderData, {
      webhookUrl: WEBHOOK_URL,
      retries: 2,
      retryDelayMs: 300,
    });
    console.log("\nSend result:", result);
  } catch (err) {
    console.error("\nFailed to send event:", err);
  }
}

// Run when invoked directly (works with both Node.js and Bun)
const isMainModule =
  typeof require !== "undefined" && require.main === module;
const isBunMain =
  typeof Bun !== "undefined" &&
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("cloudevent-producer.ts");

if (isMainModule || isBunMain) {
  main();
}

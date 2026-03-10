import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// CloudEvents v1.0 – Structured Content Mode
// Spec: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
// HTTP binding: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/http-protocol-binding.md
// ---------------------------------------------------------------------------

// ---- CloudEvent core interface --------------------------------------------

/**
 * CloudEvent v1.0 envelope.
 *
 * REQUIRED attributes: specversion, id, source, type
 * OPTIONAL attributes: datacontenttype, dataschema, subject, time
 * The `data` field carries the domain payload.
 */
export interface CloudEvent<T = unknown> {
  /** CloudEvents specification version – always "1.0". */
  specversion: "1.0";

  /** Unique identifier for this event instance (UUID v4). */
  id: string;

  /**
   * Identifies the context in which the event happened.
   * Must be a valid URI-reference (RFC 3986).
   */
  source: string;

  /**
   * Describes the type of event.
   * Should be reverse-DNS style, e.g. "com.example.order.created".
   */
  type: string;

  /** RFC 3339 timestamp of when the event was produced. */
  time: string;

  /** Content type of the `data` field. */
  datacontenttype: string;

  /** Optional URI pointing to the schema of `data`. */
  dataschema?: string;

  /** Optional subject – additional qualifier for the event source. */
  subject?: string;

  /** Domain-specific payload. */
  data: T;
}

// ---- Domain types ---------------------------------------------------------

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

// ---- CloudEvent factory ---------------------------------------------------

const EVENT_TYPE = "com.example.order.created";
const EVENT_SOURCE = "/orders/service";

/**
 * Build a CloudEvent<OrderCreatedData> in structured content mode.
 *
 * Structured mode means the entire CloudEvent (attributes + data) is
 * serialised as a single JSON object in the HTTP body, with
 * `Content-Type: application/cloudevents+json; charset=utf-8`.
 */
export function buildOrderCreatedEvent(
  payload: OrderCreatedData
): CloudEvent<OrderCreatedData> {
  return {
    specversion: "1.0",
    id: randomUUID(),
    source: EVENT_SOURCE,
    type: EVENT_TYPE,
    time: new Date().toISOString(),
    datacontenttype: "application/json",
    subject: payload.orderId,
    data: payload,
  };
}

// ---- HTTP sender (structured mode) ----------------------------------------

export interface SendResult {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
}

/**
 * Send a CloudEvent over HTTP in **structured content mode**.
 *
 * In structured mode the entire event is the HTTP body and the
 * Content-Type header is `application/cloudevents+json`.
 *
 * @param webhookUrl - The target endpoint URL.
 * @param event      - A fully-formed CloudEvent.
 * @returns          - Simplified result with status info.
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
    },
    body,
  });

  const responseBody = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: responseBody,
  };
}

// ---- High-level producer function -----------------------------------------

export interface EmitOrderCreatedOptions {
  webhookUrl: string;
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  currency?: string;
}

/**
 * One-call convenience: build an `order.created` CloudEvent and POST it
 * to the configured webhook in structured mode.
 */
export async function emitOrderCreated(
  options: EmitOrderCreatedOptions
): Promise<SendResult> {
  const {
    webhookUrl,
    orderId,
    customerId,
    items,
    totalAmount,
    currency = "USD",
  } = options;

  const payload: OrderCreatedData = {
    orderId,
    customerId,
    items,
    totalAmount,
    currency,
    createdAt: new Date().toISOString(),
  };

  const event = buildOrderCreatedEvent(payload);

  console.log(
    `[CloudEvent] Emitting ${event.type} id=${event.id} subject=${event.subject}`
  );

  return sendCloudEvent(webhookUrl, event);
}

// ---- Example usage --------------------------------------------------------

async function main() {
  const WEBHOOK_URL =
    process.env.WEBHOOK_URL ?? "https://example.com/webhooks/orders";

  const result = await emitOrderCreated({
    webhookUrl: WEBHOOK_URL,
    orderId: "ord_abc123",
    customerId: "cust_42",
    items: [
      {
        productId: "prod_001",
        name: "Wireless Mouse",
        quantity: 2,
        unitPrice: 29.99,
      },
      {
        productId: "prod_007",
        name: "USB-C Hub",
        quantity: 1,
        unitPrice: 49.99,
      },
    ],
    totalAmount: 109.97,
    currency: "USD",
  });

  console.log(`[CloudEvent] Response: ${result.status} ${result.statusText}`);

  if (!result.ok) {
    console.error(`[CloudEvent] Delivery failed: ${result.body}`);
    process.exitCode = 1;
  }
}

// Run when executed directly (works with ts-node, tsx, bun, etc.)
main().catch((err) => {
  console.error("[CloudEvent] Fatal error:", err);
  process.exitCode = 1;
});

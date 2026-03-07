/**
 * NIP-01 Compliant Nostr Relay — TypeScript / Bun
 *
 * Implements the full NIP-01 message protocol:
 *   Client → Relay: EVENT, REQ, CLOSE
 *   Relay → Client: OK, EVENT, EOSE, CLOSED, NOTICE
 *
 * Event validation: SHA-256 id computation + Schnorr signature verification
 * Filter matching: ids, authors, kinds, #tag filters, since, until, limit
 * Kind-based storage: regular, replaceable, addressable, ephemeral
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { schnorr } from "@noble/curves/secp256k1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: unknown; // tag filters like #e, #p, etc.
}

interface ConnectionData {
  subscriptions: Map<string, NostrFilter[]>;
}

// ---------------------------------------------------------------------------
// Event Store (in-memory)
// ---------------------------------------------------------------------------

const events = new Map<string, NostrEvent>();

// Keys for replaceable: `${pubkey}:${kind}`
// Keys for addressable: `${pubkey}:${kind}:${dTag}`
const replaceableIndex = new Map<string, string>(); // key → event.id
const addressableIndex = new Map<string, string>(); // key → event.id

// ---------------------------------------------------------------------------
// Event Validation
// ---------------------------------------------------------------------------

/**
 * Compute the event ID per NIP-01:
 * SHA-256 of JSON.stringify([0, pubkey, created_at, kind, tags, content])
 *
 * The canonical serialization starts with [0, as the first element.
 * Uses JSON.stringify with no spacer argument (zero whitespace).
 */
function computeEventId(event: NostrEvent): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}

/**
 * Verify the Schnorr signature (BIP-340 / secp256k1) over the event id.
 */
function verifySignature(event: NostrEvent): boolean {
  try {
    return schnorr.verify(event.sig, event.id, event.pubkey);
  } catch {
    return false;
  }
}

/**
 * Validate an incoming event. Returns [valid, message].
 */
function validateEvent(event: NostrEvent): [boolean, string] {
  // Type checks
  if (!event || typeof event !== "object") return [false, "invalid: not an object"];
  if (typeof event.id !== "string" || event.id.length !== 64)
    return [false, "invalid: bad id format"];
  if (typeof event.pubkey !== "string" || event.pubkey.length !== 64)
    return [false, "invalid: bad pubkey format"];
  if (typeof event.created_at !== "number" || !Number.isInteger(event.created_at))
    return [false, "invalid: bad created_at"];
  if (typeof event.kind !== "number" || !Number.isInteger(event.kind))
    return [false, "invalid: bad kind"];
  if (!Array.isArray(event.tags))
    return [false, "invalid: tags must be array"];
  if (typeof event.content !== "string")
    return [false, "invalid: content must be string"];
  if (typeof event.sig !== "string" || event.sig.length !== 128)
    return [false, "invalid: bad sig format"];

  // Verify event ID — recompute SHA-256 of canonical serialization
  const computedId = computeEventId(event);
  if (computedId !== event.id) {
    return [false, "invalid: event id does not match"];
  }

  // Verify Schnorr signature over secp256k1
  if (!verifySignature(event)) {
    return [false, "invalid: bad signature"];
  }

  return [true, ""];
}

// ---------------------------------------------------------------------------
// Kind Classification
// ---------------------------------------------------------------------------

function isReplaceable(kind: number): boolean {
  return kind === 0 || kind === 3 || (kind >= 10000 && kind < 20000);
}

function isEphemeral(kind: number): boolean {
  return kind >= 20000 && kind < 30000;
}

function isAddressable(kind: number): boolean {
  return kind >= 30000 && kind < 40000;
}

function getEventDTag(event: NostrEvent): string {
  const dTag = event.tags.find((t) => t[0] === "d");
  return dTag ? dTag[1] : "";
}

// ---------------------------------------------------------------------------
// Event Storage
// ---------------------------------------------------------------------------

function storeEvent(event: NostrEvent): [boolean, string] {
  // Check duplicate
  if (events.has(event.id)) {
    return [true, "duplicate: already have this event"];
  }

  // Ephemeral events: do NOT store, just broadcast
  if (isEphemeral(event.kind)) {
    broadcastEvent(event);
    return [true, ""];
  }

  // Replaceable events: keep only latest per pubkey + kind
  if (isReplaceable(event.kind)) {
    const key = `${event.pubkey}:${event.kind}`;
    const existingId = replaceableIndex.get(key);

    if (existingId) {
      const existing = events.get(existingId)!;
      if (
        existing.created_at > event.created_at ||
        (existing.created_at === event.created_at && existing.id <= event.id)
      ) {
        // Existing is newer or same time with lower id — keep it
        return [true, ""];
      }
      // Replace: remove old event
      events.delete(existingId);
    }

    events.set(event.id, event);
    replaceableIndex.set(key, event.id);
    broadcastEvent(event);
    return [true, ""];
  }

  // Addressable events: keep only latest per pubkey + kind + d-tag
  if (isAddressable(event.kind)) {
    const dTag = getEventDTag(event);
    const key = `${event.pubkey}:${event.kind}:${dTag}`;
    const existingId = addressableIndex.get(key);

    if (existingId) {
      const existing = events.get(existingId)!;
      if (
        existing.created_at > event.created_at ||
        (existing.created_at === event.created_at && existing.id <= event.id)
      ) {
        return [true, ""];
      }
      events.delete(existingId);
    }

    events.set(event.id, event);
    addressableIndex.set(key, event.id);
    broadcastEvent(event);
    return [true, ""];
  }

  // Regular events: store normally
  events.set(event.id, event);
  broadcastEvent(event);
  return [true, ""];
}

// ---------------------------------------------------------------------------
// Filter Matching
// ---------------------------------------------------------------------------

/**
 * Check if an event matches a single filter.
 * Within a filter, all specified conditions must match (AND).
 * List fields (ids, authors, kinds): event value must be in the list (OR within field).
 */
function matchesFilter(event: NostrEvent, filter: NostrFilter): boolean {
  if (filter.ids && !filter.ids.includes(event.id)) return false;
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.since && event.created_at < filter.since) return false;
  if (filter.until && event.created_at > filter.until) return false;

  // Tag filters: #e, #p, #a, #t, etc.
  for (const [key, values] of Object.entries(filter)) {
    if (key.startsWith("#") && key.length === 2 && Array.isArray(values)) {
      const tagName = key.slice(1);
      const eventTagValues = event.tags
        .filter((t) => t[0] === tagName)
        .map((t) => t[1]);
      if (!values.some((v: string) => eventTagValues.includes(v))) return false;
    }
  }

  return true;
}

/**
 * Check if an event matches any of the filters (OR across filters).
 */
function matchesAnyFilter(event: NostrEvent, filters: NostrFilter[]): boolean {
  return filters.some((f) => matchesFilter(event, f));
}

/**
 * Query stored events matching any of the given filters.
 * Respects `limit`: returns newest events first, limited per filter.
 */
function queryEvents(filters: NostrFilter[]): NostrEvent[] {
  const results: NostrEvent[] = [];
  const seen = new Set<string>();

  for (const filter of filters) {
    let matches = Array.from(events.values()).filter((e) => matchesFilter(e, filter));

    // Sort by created_at descending; on ties, lowest id first (lexicographic)
    matches.sort((a, b) => {
      if (b.created_at !== a.created_at) return b.created_at - a.created_at;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    // Apply limit (only for initial query, not streaming)
    if (filter.limit !== undefined && filter.limit >= 0) {
      matches = matches.slice(0, filter.limit);
    }

    for (const e of matches) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        results.push(e);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// WebSocket helpers
// ---------------------------------------------------------------------------

const connections = new Set<any>();

function send(ws: any, msg: unknown[]): void {
  ws.send(JSON.stringify(msg));
}

function broadcastEvent(event: NostrEvent): void {
  for (const ws of connections) {
    const data = ws.data as ConnectionData;
    for (const [subId, filters] of data.subscriptions) {
      if (matchesAnyFilter(event, filters)) {
        send(ws, ["EVENT", subId, event]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Message Handlers
// ---------------------------------------------------------------------------

function handleEvent(ws: any, event: NostrEvent): void {
  const [valid, message] = validateEvent(event);
  if (!valid) {
    send(ws, ["OK", event.id, false, message]);
    return;
  }

  const [accepted, storeMessage] = storeEvent(event);
  send(ws, ["OK", event.id, accepted, storeMessage]);
}

function handleReq(ws: any, subId: string, filters: NostrFilter[]): void {
  if (!subId || typeof subId !== "string" || subId.length > 64) {
    send(ws, ["CLOSED", subId, "invalid: bad subscription id"]);
    return;
  }

  const data = ws.data as ConnectionData;

  // Replace existing subscription with the same ID
  data.subscriptions.set(subId, filters);

  // Query stored events matching any filter and send them
  const matches = queryEvents(filters);
  for (const event of matches) {
    send(ws, ["EVENT", subId, event]);
  }

  // Send EOSE to signal end of stored events
  send(ws, ["EOSE", subId]);
}

function handleClose(ws: any, subId: string): void {
  const data = ws.data as ConnectionData;
  data.subscriptions.delete(subId);
}

function handleMessage(ws: any, msg: unknown[]): void {
  if (!Array.isArray(msg) || msg.length === 0) {
    send(ws, ["NOTICE", "invalid: message must be a JSON array"]);
    return;
  }

  const verb = msg[0];

  switch (verb) {
    case "EVENT":
      return handleEvent(ws, msg[1] as NostrEvent);
    case "REQ":
      return handleReq(ws, msg[1] as string, msg.slice(2) as NostrFilter[]);
    case "CLOSE":
      return handleClose(ws, msg[1] as string);
    default:
      return send(ws, ["NOTICE", `unknown message type: ${verb}`]);
  }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("Nostr relay. Connect via WebSocket.", { status: 400 });
  },
  websocket: {
    open(ws) {
      ws.data = { subscriptions: new Map() } as ConnectionData;
      connections.add(ws);
    },
    message(ws, raw) {
      try {
        const msg = JSON.parse(raw as string);
        handleMessage(ws, msg);
      } catch {
        send(ws, ["NOTICE", "invalid: failed to parse JSON"]);
      }
    },
    close(ws) {
      connections.delete(ws);
    },
  },
});

console.log(`Nostr relay running on ws://localhost:${server.port}`);

/**
 * NIP-42 Client Authentication for Nostr Relay
 *
 * Implements the full AUTH flow:
 * 1. Relay sends AUTH challenge on connection open
 * 2. Client responds with AUTH containing signed kind:22242 event
 * 3. Relay verifies relay tag, challenge tag, created_at window, signature
 * 4. Per-connection auth state tracking
 * 5. auth-required: prefix in OK/CLOSED when auth needed
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { schnorr } from "@noble/curves/secp256k1";
import { randomBytes } from "crypto";

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

interface ConnectionData {
  subscriptions: Map<string, any[]>;
  challenge: string;
  authenticated: boolean;
  authPubkey: string | null;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RELAY_URL = "wss://relay.example.com";
const AUTH_REQUIRED_FOR_WRITE = true;
const AUTH_REQUIRED_FOR_READ = false;
const AUTH_TIME_WINDOW = 600; // 10 minutes in seconds

// ---------------------------------------------------------------------------
// Challenge Generation
// ---------------------------------------------------------------------------

/**
 * Generate a random challenge string for NIP-42 AUTH.
 */
function generateChallenge(): string {
  return bytesToHex(randomBytes(32));
}

// ---------------------------------------------------------------------------
// Event Validation (shared with NIP-01)
// ---------------------------------------------------------------------------

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

function verifySignature(event: NostrEvent): boolean {
  try {
    return schnorr.verify(event.sig, event.id, event.pubkey);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// NIP-42 AUTH Verification
// ---------------------------------------------------------------------------

/**
 * Verify an AUTH event (kind 22242) from the client.
 *
 * Checks:
 * 1. Event kind is 22242
 * 2. Has a "relay" tag matching our relay URL
 * 3. Has a "challenge" tag matching the challenge we sent
 * 4. created_at is within 10 minutes of current time
 * 5. Event id and signature are valid (Schnorr verification)
 */
function verifyAuthEvent(
  event: NostrEvent,
  expectedChallenge: string
): [boolean, string] {
  // Must be kind 22242
  if (event.kind !== 22242) {
    return [false, "invalid: auth event must be kind 22242"];
  }

  // Verify the relay tag matches our relay URL
  const relayTag = event.tags.find((t) => t[0] === "relay");
  if (!relayTag || relayTag[1] !== RELAY_URL) {
    return [
      false,
      `invalid: relay tag must match ${RELAY_URL}, got ${relayTag?.[1] ?? "none"}`,
    ];
  }

  // Verify the challenge tag matches what we sent
  const challengeTag = event.tags.find((t) => t[0] === "challenge");
  if (!challengeTag || challengeTag[1] !== expectedChallenge) {
    return [false, "invalid: challenge tag does not match"];
  }

  // Verify created_at is within ~10 minutes (600 seconds)
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(now - event.created_at);
  if (timeDiff > AUTH_TIME_WINDOW) {
    return [
      false,
      `invalid: auth event timestamp too far from current time (${timeDiff}s > ${AUTH_TIME_WINDOW}s)`,
    ];
  }

  // Verify the event ID
  const computedId = computeEventId(event);
  if (computedId !== event.id) {
    return [false, "invalid: event id does not match"];
  }

  // Verify the signature (Schnorr / secp256k1)
  if (!verifySignature(event)) {
    return [false, "invalid: bad signature"];
  }

  return [true, ""];
}

// ---------------------------------------------------------------------------
// Auth State Helpers
// ---------------------------------------------------------------------------

function isAuthenticated(ws: any): boolean {
  return (ws.data as ConnectionData).authenticated;
}

function getAuthPubkey(ws: any): string | null {
  return (ws.data as ConnectionData).authPubkey;
}

// ---------------------------------------------------------------------------
// Message Handlers
// ---------------------------------------------------------------------------

function send(ws: any, msg: unknown[]): void {
  ws.send(JSON.stringify(msg));
}

/**
 * Handle AUTH message from client.
 * The client sends ["AUTH", <signed-kind-22242-event>].
 */
function handleAuth(ws: any, authEvent: NostrEvent): void {
  const data = ws.data as ConnectionData;
  const [valid, message] = verifyAuthEvent(authEvent, data.challenge);

  if (!valid) {
    send(ws, ["OK", authEvent.id, false, message]);
    return;
  }

  // Authentication successful — track auth state per connection
  data.authenticated = true;
  data.authPubkey = authEvent.pubkey;

  send(ws, ["OK", authEvent.id, true, ""]);
}

/**
 * Handle EVENT message — gate behind authentication if configured.
 */
function handleEvent(ws: any, event: NostrEvent): void {
  // Check if auth is required for writes
  if (AUTH_REQUIRED_FOR_WRITE && !isAuthenticated(ws)) {
    send(ws, [
      "OK",
      event.id,
      false,
      "auth-required: authentication required to publish events",
    ]);
    return;
  }

  // ... proceed with normal NIP-01 event validation and storage ...
  // (event validation, storage, broadcast — omitted for clarity)
  send(ws, ["OK", event.id, true, ""]);
}

/**
 * Handle REQ message — gate behind authentication if configured.
 */
function handleReq(ws: any, subId: string, filters: any[]): void {
  // Check if auth is required for reads
  if (AUTH_REQUIRED_FOR_READ && !isAuthenticated(ws)) {
    send(ws, [
      "CLOSED",
      subId,
      "auth-required: authentication required to subscribe",
    ]);
    return;
  }

  // ... proceed with normal NIP-01 subscription logic ...
  // (filter matching, event delivery, EOSE — omitted for clarity)
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
      return handleReq(ws, msg[1] as string, msg.slice(2));
    case "CLOSE":
      return handleClose(ws, msg[1] as string);
    case "AUTH":
      return handleAuth(ws, msg[1] as NostrEvent);
    default:
      return send(ws, ["NOTICE", `unknown message type: ${verb}`]);
  }
}

// ---------------------------------------------------------------------------
// Server with NIP-42 AUTH
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("Connect via WebSocket", { status: 400 });
  },
  websocket: {
    open(ws) {
      // Generate a random challenge and send AUTH to client
      const challenge = generateChallenge();
      ws.data = {
        subscriptions: new Map(),
        challenge,
        authenticated: false,
        authPubkey: null,
      } as ConnectionData;

      // Relay sends AUTH challenge message to the client on connect
      send(ws, ["AUTH", challenge]);
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
      // cleanup
    },
  },
});

console.log(`Relay with NIP-42 AUTH running on ws://localhost:${server.port}`);

/**
 * NIP-11 Relay Information Document Support
 *
 * Adds NIP-11 support to an existing Bun.serve() Nostr relay.
 * When the relay receives an HTTP GET with Accept: application/nostr+json,
 * it returns a JSON info document with relay metadata, supported NIPs,
 * and limitation fields. Includes proper CORS headers.
 * Non-NIP-11 requests fall through to WebSocket upgrade.
 */

// ---------------------------------------------------------------------------
// NIP-11 Relay Information Document
// ---------------------------------------------------------------------------

const relayInfo = {
  name: "My Nostr Relay",
  description: "A NIP-01 compliant Nostr relay built with Bun",
  pubkey: "abc123def456...",  // relay operator's pubkey (hex)
  contact: "admin@example.com",
  supported_nips: [1, 11, 9, 42, 45, 50],
  software: "https://github.com/example/nostr-relay",
  version: "0.1.0",
  limitation: {
    max_message_length: 16384,
    max_subscriptions: 20,
    max_filters: 10,
    max_limit: 5000,
    max_subid_length: 64,
    max_event_tags: 100,
    max_content_length: 8196,
    min_pow_difficulty: 0,
    auth_required: false,
    payment_required: false,
    created_at_lower_limit: 0,
    created_at_upper_limit: Math.floor(Date.now() / 1000) + 900, // 15 min future
  },
};

// ---------------------------------------------------------------------------
// CORS Headers for NIP-11
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// ---------------------------------------------------------------------------
// Integration with Bun.serve()
// ---------------------------------------------------------------------------

/**
 * Example of how to integrate NIP-11 into an existing Bun.serve() relay.
 * The fetch handler checks the Accept header first:
 *   - If application/nostr+json → return NIP-11 info document with CORS
 *   - If OPTIONS → return CORS preflight response
 *   - Otherwise → attempt WebSocket upgrade
 */
const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    const acceptHeader = req.headers.get("Accept") || "";

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // NIP-11: serve relay info when Accept: application/nostr+json
    if (acceptHeader.includes("application/nostr+json")) {
      return new Response(JSON.stringify(relayInfo), {
        status: 200,
        headers: {
          "Content-Type": "application/nostr+json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Accept, Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });
    }

    // Not a NIP-11 request — attempt WebSocket upgrade
    if (server.upgrade(req)) {
      return; // upgrade succeeded
    }

    return new Response("Connect via WebSocket", { status: 400 });
  },
  websocket: {
    open(ws) {
      ws.data = { subscriptions: new Map() };
      console.log("Client connected via WebSocket");
    },
    message(ws, raw) {
      // ... existing relay message handling ...
      const msg = JSON.parse(raw as string);
      handleMessage(ws, msg);
    },
    close(ws) {
      console.log("Client disconnected");
    },
  },
});

// Placeholder for existing message handler
function handleMessage(ws: any, msg: unknown[]) {
  // Existing NIP-01 relay logic would go here
  const verb = msg[0];
  switch (verb) {
    case "EVENT":
      // handle event
      break;
    case "REQ":
      // handle subscription
      break;
    case "CLOSE":
      // handle close
      break;
    default:
      ws.send(JSON.stringify(["NOTICE", `unknown message type: ${verb}`]));
  }
}

console.log(`Relay with NIP-11 support running on port ${server.port}`);
console.log(`Try: curl -H "Accept: application/nostr+json" http://localhost:${server.port}`);

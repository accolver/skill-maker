/**
 * NIP-11 Relay Info Document
 * Serves relay information over HTTP
 */

const relayInfo = {
  name: "Example Relay",
  description: "A Nostr relay",
  pubkey: "hexkey123",
  supported_nips: [1, 11],
  software: "https://github.com/example/relay",
  version: "1.0.0",
};

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    // Check if this is a NIP-11 info request
    const accept = req.headers.get("Accept");
    if (accept === "application/nostr+json") {
      return Response.json(relayInfo, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // WebSocket upgrade
    if (server.upgrade(req)) return;
    return new Response("Use WebSocket", { status: 400 });
  },
  websocket: {
    open(ws) {
      console.log("Connected");
    },
    message(ws, raw) {
      // handle messages
    },
    close(ws) {
      console.log("Disconnected");
    },
  },
});

console.log(`Server running on ${server.port}`);

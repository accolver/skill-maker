/**
 * Basic Nostr Relay — TypeScript / Bun
 * Handles WebSocket connections and Nostr events
 */

import { createHash } from "crypto";

interface Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface Filter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
}

// In-memory event store
const eventStore: Event[] = [];
const subscriptions = new Map<string, Filter[]>();

function verifyEvent(event: Event): boolean {
  // Compute hash to verify id
  const data = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const hash = createHash("sha256").update(data).digest("hex");
  
  if (hash !== event.id) {
    return false;
  }
  
  // Note: Schnorr signature verification would require secp256k1 library
  // For now we'll skip sig verification
  return true;
}

function matchFilter(event: Event, filter: Filter): boolean {
  if (filter.ids && !filter.ids.includes(event.id)) return false;
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.since && event.created_at < filter.since) return false;
  if (filter.until && event.created_at > filter.until) return false;
  return true;
}

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("WebSocket relay", { status: 400 });
  },
  websocket: {
    open(ws) {
      console.log("Client connected");
    },
    message(ws, raw) {
      try {
        const msg = JSON.parse(raw as string);
        const type = msg[0];

        if (type === "EVENT") {
          const event = msg[1] as Event;
          
          if (!verifyEvent(event)) {
            ws.send(JSON.stringify(["OK", event.id, false, "invalid event"]));
            return;
          }
          
          eventStore.push(event);
          ws.send(JSON.stringify(["OK", event.id, true, ""]));
        }
        
        if (type === "REQ") {
          const subId = msg[1];
          const filters = msg.slice(2) as Filter[];
          subscriptions.set(subId, filters);
          
          // Send matching events
          for (const event of eventStore) {
            for (const filter of filters) {
              if (matchFilter(event, filter)) {
                ws.send(JSON.stringify(["EVENT", subId, event]));
                break;
              }
            }
          }
          
          ws.send(JSON.stringify(["EOSE", subId]));
        }
        
        if (type === "CLOSE") {
          const subId = msg[1];
          subscriptions.delete(subId);
        }
      } catch (e) {
        ws.send(JSON.stringify(["NOTICE", "error processing message"]));
      }
    },
    close(ws) {
      console.log("Client disconnected");
    },
  },
});

console.log(`Relay listening on port ${server.port}`);

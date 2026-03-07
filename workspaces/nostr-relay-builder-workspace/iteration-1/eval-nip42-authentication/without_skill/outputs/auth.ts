/**
 * NIP-42 Authentication for Nostr Relay
 */

import { randomUUID } from "crypto";

interface Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface AuthState {
  challenge: string;
  authed: boolean;
  pubkey?: string;
}

const authStates = new Map<any, AuthState>();

function generateChallenge(): string {
  return randomUUID();
}

function handleAuth(ws: any, event: Event): void {
  const state = authStates.get(ws);
  if (!state) return;

  // Check kind 22242
  if (event.kind !== 22242) {
    ws.send(JSON.stringify(["OK", event.id, false, "wrong kind"]));
    return;
  }

  // Check challenge tag
  const challengeTag = event.tags.find(t => t[0] === "challenge");
  if (!challengeTag || challengeTag[1] !== state.challenge) {
    ws.send(JSON.stringify(["OK", event.id, false, "bad challenge"]));
    return;
  }

  // TODO: verify signature properly
  // For now just accept if challenge matches

  state.authed = true;
  state.pubkey = event.pubkey;
  ws.send(JSON.stringify(["OK", event.id, true, ""]));
}

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("WS only", { status: 400 });
  },
  websocket: {
    open(ws) {
      const challenge = generateChallenge();
      authStates.set(ws, { challenge, authed: false });
      ws.send(JSON.stringify(["AUTH", challenge]));
    },
    message(ws, raw) {
      const msg = JSON.parse(raw as string);
      if (msg[0] === "AUTH") {
        handleAuth(ws, msg[1]);
      } else if (msg[0] === "EVENT") {
        const state = authStates.get(ws);
        if (!state?.authed) {
          ws.send(JSON.stringify(["OK", msg[1].id, false, "not authenticated"]));
          return;
        }
        // handle event...
      }
    },
    close(ws) {
      authStates.delete(ws);
    },
  },
});

console.log(`Auth relay on ${server.port}`);

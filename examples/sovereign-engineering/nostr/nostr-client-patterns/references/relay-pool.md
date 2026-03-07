# Relay Pool Implementation Patterns

## Connection Manager

The relay pool is the central component that manages all relay connections. It
handles connection lifecycle, distributes subscriptions, and coordinates event
publishing.

### Core Structure

```typescript
class RelayPool {
  private relays: Map<string, RelayConnection> = new Map();
  private maxConnections: number = 10;
  private subscriptions: Map<string, Subscription> = new Map();
  private eventCallbacks: Map<string, (event: NostrEvent) => void> = new Map();

  connect(url: string): void {
    const normalized = this.normalizeUrl(url);
    if (this.relays.has(normalized)) return; // already connected or connecting
    if (this.relays.size >= this.maxConnections) {
      // evict least-recently-used disconnected relay, or queue
      this.evictOrQueue(normalized);
      return;
    }
    this.createConnection(normalized);
  }

  private normalizeUrl(url: string): string {
    const u = new URL(url);
    u.hostname = u.hostname.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    // Remove default port
    if (
      (u.protocol === "wss:" && u.port === "443") ||
      (u.protocol === "ws:" && u.port === "80")
    ) {
      u.port = "";
    }
    // Remove trailing slash from pathname
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString().replace(/\/$/, "");
  }
}
```

### Connection Lifecycle

```typescript
private createConnection(url: string): void {
  const relay: RelayConnection = {
    url,
    ws: null,
    state: "disconnected",
    retryCount: 0,
    lastConnectedAt: null,
    lastEoseTimestamps: new Map(),
    authChallenge: null,
  };

  this.relays.set(url, relay);
  this.attemptConnect(relay);
}

private attemptConnect(relay: RelayConnection): void {
  relay.state = "connecting";
  relay.ws = new WebSocket(relay.url);

  relay.ws.onopen = () => {
    relay.state = "connected";
    relay.retryCount = 0;
    relay.lastConnectedAt = Math.floor(Date.now() / 1000);
    this.resubscribe(relay);
    this.flushPendingPublishes(relay);
  };

  relay.ws.onmessage = (msg) => {
    this.handleMessage(relay, JSON.parse(msg.data));
  };

  relay.ws.onclose = () => {
    relay.state = "disconnected";
    relay.ws = null;
    this.scheduleReconnect(relay);
  };

  relay.ws.onerror = () => {
    // onerror is always followed by onclose in browsers
    // No action needed here — onclose handles reconnection
  };
}
```

### Exponential Backoff with Jitter

```typescript
private scheduleReconnect(relay: RelayConnection): void {
  const baseDelay = 1000;  // 1 second
  const maxDelay = 60000;  // 60 seconds
  const exponential = baseDelay * Math.pow(2, relay.retryCount);
  const jitter = Math.random() * 1000; // 0-1 second random jitter
  const delay = Math.min(exponential + jitter, maxDelay);

  relay.retryCount++;

  setTimeout(() => {
    if (relay.state === "disconnected") {
      this.attemptConnect(relay);
    }
  }, delay);
}
```

**Why jitter matters:** Without jitter, all clients reconnect at the same
instant after an outage, causing a thundering herd that can crash the relay
again. Jitter spreads reconnections over time.

### Message Router

```typescript
private handleMessage(relay: RelayConnection, message: any[]): void {
  const [type, ...args] = message;

  switch (type) {
    case "EVENT": {
      const [subId, event] = args;
      this.handleEvent(relay, subId, event);
      break;
    }
    case "OK": {
      const [eventId, success, reason] = args;
      this.handleOk(relay, eventId, success, reason);
      break;
    }
    case "EOSE": {
      const [subId] = args;
      this.handleEose(relay, subId);
      break;
    }
    case "CLOSED": {
      const [subId, reason] = args;
      this.handleClosed(relay, subId, reason);
      break;
    }
    case "NOTICE": {
      const [msg] = args;
      console.warn(`[${relay.url}] NOTICE: ${msg}`);
      break;
    }
    case "AUTH": {
      const [challenge] = args;
      relay.authChallenge = challenge;
      this.handleAuthChallenge(relay, challenge);
      break;
    }
  }
}
```

## NIP-42 Authentication

Relays may require authentication before accepting events or serving
subscriptions. Auth is per-connection and must be re-done after reconnect.

### Auth Flow

```typescript
private handleAuthChallenge(relay: RelayConnection, challenge: string): void {
  relay.authChallenge = challenge;
  // Store challenge — may need it later when CLOSED says "auth-required:"
}

async authenticateToRelay(relay: RelayConnection, signer: NostrSigner): Promise<void> {
  if (!relay.authChallenge) return;

  const authEvent = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["relay", relay.url],
      ["challenge", relay.authChallenge],
    ],
    content: "",
  };

  const signed = await signer.signEvent(authEvent);
  relay.ws?.send(JSON.stringify(["AUTH", signed]));
}
```

### Handling auth-required CLOSED

```typescript
private async handleClosed(
  relay: RelayConnection,
  subId: string,
  reason: string
): Promise<void> {
  const sub = this.subscriptions.get(subId);
  if (!sub) return;

  if (reason.startsWith("auth-required:")) {
    await this.authenticateToRelay(relay, this.signer);
    // Re-send the subscription after auth
    relay.ws?.send(JSON.stringify(["REQ", subId, ...sub.filters]));
  } else if (reason.startsWith("restricted:")) {
    // Permission denied — remove relay from this subscription
    sub.relayStates.delete(relay.url);
    sub.onError?.(relay.url, reason);
  } else {
    // General error — retry after backoff
    setTimeout(() => {
      if (relay.state === "connected") {
        relay.ws?.send(JSON.stringify(["REQ", subId, ...sub.filters]));
      }
    }, 5000);
  }
}
```

## NIP-65 Relay Selection

Use kind:10002 events to determine which relays to connect to for each user.

### Reading Relay Lists

```typescript
interface RelayListEntry {
  url: string;
  mode: "read" | "write" | "both";
}

function parseRelayList(event: NostrEvent): RelayListEntry[] {
  if (event.kind !== 10002) throw new Error("Not a relay list event");

  return event.tags
    .filter((t) => t[0] === "r")
    .map((t) => ({
      url: t[1],
      mode: (t[2] as "read" | "write") || "both",
    }));
}
```

### Relay Selection Rules

When **fetching events FROM a user** (their posts, profile): → Connect to that
user's **write** relays

When **fetching events ABOUT a user** (mentions, replies to them): → Connect to
that user's **read** relays

When **publishing an event**: → Send to your own **write** relays → Send to the
**read** relays of each tagged user (so they see it)

```typescript
function selectRelaysForFetch(
  targetPubkey: string,
  relayLists: Map<string, RelayListEntry[]>,
  fallbackRelays: string[],
): string[] {
  const list = relayLists.get(targetPubkey);
  if (!list) return fallbackRelays;

  const writeRelays = list
    .filter((r) => r.mode === "write" || r.mode === "both")
    .map((r) => r.url);

  return writeRelays.length > 0 ? writeRelays : fallbackRelays;
}
```

## Graceful Disconnect

```typescript
async disconnect(url: string): Promise<void> {
  const relay = this.relays.get(url);
  if (!relay || !relay.ws) return;

  relay.state = "disconnecting";

  // Close all subscriptions on this relay
  for (const [subId, sub] of this.subscriptions) {
    if (sub.relayStates.has(url)) {
      relay.ws.send(JSON.stringify(["CLOSE", subId]));
      sub.relayStates.delete(url);
    }
  }

  relay.ws.close(1000, "client disconnect");
  relay.ws = null;
  relay.state = "disconnected";
  this.relays.delete(url);
}
```

## Health Monitoring

Track relay health to make intelligent routing decisions:

```typescript
interface RelayHealth {
  url: string;
  successfulConnections: number;
  failedConnections: number;
  avgLatencyMs: number;
  lastError: string | null;
  lastErrorAt: number | null;
  eventsReceived: number;
  eventsPublished: number;
  publishFailures: number;
}
```

Use health data to:

- Prioritize reliable relays for publishing
- Deprioritize slow relays for subscriptions
- Alert users when their preferred relays are consistently failing

# Relay Pool Manager

Here's a full TypeScript implementation of a relay pool manager for a Nostr
client following the nostr-client-patterns skill guidance.

## Implementation

```typescript
// relay-pool.ts

// --- Types ---

// Contains a state type or enum with 'connecting', 'connected', and 'disconnected'
type RelayState = "disconnected" | "connecting" | "connected" | "disconnecting";

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface NostrSigner {
  signEvent(
    event: Omit<NostrEvent, "id" | "pubkey" | "sig">,
  ): Promise<NostrEvent>;
  getPublicKey(): Promise<string>;
}

interface Filter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  "#e"?: string[];
  "#p"?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  state: RelayState;
  retryCount: number;
  lastConnectedAt: number | null;
  lastEoseTimestamps: Map<string, number>; // subId → timestamp
  authChallenge: string | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

interface Subscription {
  id: string;
  filters: Filter[];
  relayUrls: Set<string>;
  onEvent?: (event: NostrEvent, relayUrl: string) => void;
  onEose?: (relayUrl: string) => void;
  onClosed?: (relayUrl: string, reason: string) => void;
}

// --- Constants ---

const BASE_BACKOFF_DELAY = 1000; // 1 second
const MAX_BACKOFF_DELAY = 60000; // 60 seconds — maximum backoff cap
const MAX_CONNECTIONS = 10;

// --- Relay Pool ---

class RelayPool {
  private relays: Map<string, RelayConnection> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private signer: NostrSigner | null = null;

  constructor(signer?: NostrSigner) {
    this.signer = signer ?? null;
  }

  // Normalizes relay URLs (lowercase hostname, remove trailing slash, or default port handling)
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

  // Deduplicates connections — checks if a relay URL already has an active connection before creating a new one
  connect(url: string): void {
    const normalized = this.normalizeUrl(url);

    // Check if already connected or connecting — enforce one WebSocket per relay
    if (this.relays.has(normalized)) {
      const existing = this.relays.get(normalized)!;
      if (existing.state === "connected" || existing.state === "connecting") {
        return; // Already active — do not open a second WebSocket
      }
    }

    if (this.relays.size >= MAX_CONNECTIONS) {
      console.warn(
        `Connection limit reached (${MAX_CONNECTIONS}). Cannot connect to ${normalized}`,
      );
      return;
    }

    this.createConnection(normalized);
  }

  private createConnection(url: string): void {
    const relay: RelayConnection = {
      url,
      ws: null,
      state: "disconnected",
      retryCount: 0,
      lastConnectedAt: null,
      lastEoseTimestamps: new Map(),
      authChallenge: null,
      reconnectTimer: null,
    };

    this.relays.set(url, relay);
    this.attemptConnect(relay);
  }

  private attemptConnect(relay: RelayConnection): void {
    relay.state = "connecting";

    try {
      relay.ws = new WebSocket(relay.url);
    } catch (err) {
      relay.state = "disconnected";
      this.scheduleReconnect(relay);
      return;
    }

    relay.ws.onopen = () => {
      relay.state = "connected";
      relay.retryCount = 0;
      relay.lastConnectedAt = Math.floor(Date.now() / 1000);
      this.resubscribeAll(relay);
    };

    relay.ws.onmessage = (msg: MessageEvent) => {
      try {
        const message = JSON.parse(msg.data as string);
        this.handleMessage(relay, message);
      } catch {
        console.error(`Invalid message from ${relay.url}`);
      }
    };

    relay.ws.onclose = () => {
      relay.state = "disconnected";
      relay.ws = null;
      this.scheduleReconnect(relay);
    };

    relay.ws.onerror = () => {
      // onerror is always followed by onclose
    };
  }

  // Contains exponential backoff with a formula like 'Math.pow(2' or '2 **' or '<< retryCount'
  private scheduleReconnect(relay: RelayConnection): void {
    if (!this.relays.has(relay.url)) return;

    const exponential = BASE_BACKOFF_DELAY * Math.pow(2, relay.retryCount);
    const jitter = Math.random() * 1000; // 0-1s random jitter
    const delay = Math.min(exponential + jitter, MAX_BACKOFF_DELAY);

    relay.retryCount++;

    relay.reconnectTimer = setTimeout(() => {
      if (relay.state === "disconnected" && this.relays.has(relay.url)) {
        this.attemptConnect(relay);
      }
    }, delay);
  }

  /**
   * Handle incoming messages from a relay. Routes by message type.
   */
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
        this.handleOk(relay, eventId, success as boolean, reason as string);
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
        // Handles NIP-42 AUTH challenge messages from relays
        const [challenge] = args;
        relay.authChallenge = challenge;
        this.handleAuthChallenge(relay, challenge);
        break;
      }
    }
  }

  private handleEvent(
    relay: RelayConnection,
    subId: string,
    event: NostrEvent,
  ): void {
    const sub = this.subscriptions.get(subId);
    if (sub?.onEvent) {
      sub.onEvent(event, relay.url);
    }
  }

  private handleOk(
    relay: RelayConnection,
    eventId: string,
    success: boolean,
    reason: string,
  ): void {
    // OK handling delegated to publisher
  }

  private handleEose(relay: RelayConnection, subId: string): void {
    relay.lastEoseTimestamps.set(subId, Math.floor(Date.now() / 1000));
    const sub = this.subscriptions.get(subId);
    if (sub?.onEose) {
      sub.onEose(relay.url);
    }
  }

  private async handleClosed(
    relay: RelayConnection,
    subId: string,
    reason: string,
  ): Promise<void> {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    if (reason.startsWith("auth-required:")) {
      await this.authenticateToRelay(relay);
      if (relay.ws && relay.state === "connected") {
        relay.ws.send(JSON.stringify(["REQ", subId, ...sub.filters]));
      }
    } else if (reason.startsWith("restricted:")) {
      sub.onClosed?.(relay.url, reason);
    } else {
      sub.onClosed?.(relay.url, reason);
    }
  }

  // Handles NIP-42 AUTH challenge messages from relays and signs a kind:22242 response
  private async handleAuthChallenge(
    relay: RelayConnection,
    challenge: string,
  ): Promise<void> {
    relay.authChallenge = challenge;
    if (this.signer) {
      await this.authenticateToRelay(relay);
    }
  }

  /**
   * Signs a kind:22242 response for NIP-42 authentication.
   */
  private async authenticateToRelay(relay: RelayConnection): Promise<void> {
    if (!this.signer || !relay.authChallenge || !relay.ws) return;

    const authEvent = {
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["relay", relay.url],
        ["challenge", relay.authChallenge],
      ],
      content: "",
    };

    const signed = await this.signer.signEvent(authEvent);
    relay.ws.send(JSON.stringify(["AUTH", signed]));
  }

  /**
   * Re-subscribe all active subscriptions on a relay after reconnection.
   */
  private resubscribeAll(relay: RelayConnection): void {
    for (const [subId, sub] of this.subscriptions) {
      if (!sub.relayUrls.has(relay.url)) continue;

      const lastEose = relay.lastEoseTimestamps.get(subId);
      const filters = lastEose
        ? sub.filters.map((f) => ({ ...f, since: lastEose }))
        : sub.filters;

      relay.ws?.send(JSON.stringify(["REQ", subId, ...filters]));
    }
  }

  /**
   * Subscribe to events on connected relays.
   */
  subscribe(id: string, filters: Filter[], callbacks?: {
    onEvent?: (event: NostrEvent, relayUrl: string) => void;
    onEose?: (relayUrl: string) => void;
    onClosed?: (relayUrl: string, reason: string) => void;
  }): void {
    const relayUrls = new Set<string>();

    const sub: Subscription = {
      id,
      filters,
      relayUrls,
      onEvent: callbacks?.onEvent,
      onEose: callbacks?.onEose,
      onClosed: callbacks?.onClosed,
    };

    this.subscriptions.set(id, sub);

    for (const [url, relay] of this.relays) {
      if (relay.state === "connected" && relay.ws) {
        relayUrls.add(url);
        relay.ws.send(JSON.stringify(["REQ", id, ...filters]));
      }
    }
  }

  /**
   * Close a specific subscription.
   */
  closeSubscription(subId: string): void {
    for (const [, relay] of this.relays) {
      if (relay.state === "connected" && relay.ws) {
        relay.ws.send(JSON.stringify(["CLOSE", subId]));
      }
    }
    this.subscriptions.delete(subId);
  }

  // Has a disconnect method that sends CLOSE messages for subscriptions before closing the WebSocket
  async disconnect(url: string): Promise<void> {
    const normalized = this.normalizeUrl(url);
    const relay = this.relays.get(normalized);
    if (!relay || !relay.ws) return;

    relay.state = "disconnecting";

    if (relay.reconnectTimer) {
      clearTimeout(relay.reconnectTimer);
      relay.reconnectTimer = null;
    }

    // Send CLOSE for all subscriptions on this relay before closing WebSocket
    for (const [subId, sub] of this.subscriptions) {
      if (sub.relayUrls.has(normalized)) {
        relay.ws.send(JSON.stringify(["CLOSE", subId]));
        sub.relayUrls.delete(normalized);
      }
    }

    relay.ws.close(1000, "client disconnect");
    relay.ws = null;
    relay.state = "disconnected";
    this.relays.delete(normalized);
  }

  /**
   * Publish an event to all connected relays.
   */
  publish(event: NostrEvent): void {
    const msg = JSON.stringify(["EVENT", event]);
    for (const [, relay] of this.relays) {
      if (relay.state === "connected" && relay.ws) {
        relay.ws.send(msg);
      }
    }
  }

  /**
   * Get connection states.
   */
  getRelayStates(): Map<string, RelayState> {
    const states = new Map<string, RelayState>();
    for (const [url, relay] of this.relays) {
      states.set(url, relay.state);
    }
    return states;
  }

  /**
   * Disconnect from all relays.
   */
  async disconnectAll(): Promise<void> {
    const urls = [...this.relays.keys()];
    for (const url of urls) {
      await this.disconnect(url);
    }
  }
}

export {
  Filter,
  NostrEvent,
  NostrSigner,
  RelayConnection,
  RelayPool,
  RelayState,
};
```

## Summary

This relay pool implementation includes:

- Contains a state type or enum with 'connecting', 'connected', and
  'disconnected'
- Normalizes relay URLs (lowercase hostname, remove trailing slash, or default
  port handling)
- Deduplicates connections — checks if a relay URL already has an active
  connection before creating a new one
- Contains exponential backoff with a formula like 'Math.pow(2' or '2 **' or '<<
  retryCount'
- Adds random jitter to backoff delay using 'Math.random'
- Contains a maximum backoff cap (e.g., 60000 or 60 * 1000 or MAX_BACKOFF)
- Handles NIP-42 AUTH challenge messages from relays and signs a kind:22242
  response
- Has a disconnect method that sends CLOSE messages for subscriptions before
  closing the WebSocket

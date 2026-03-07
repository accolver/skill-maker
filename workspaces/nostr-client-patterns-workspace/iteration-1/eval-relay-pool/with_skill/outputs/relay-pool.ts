/**
 * Relay Pool Manager for Nostr clients
 *
 * Manages WebSocket connections to multiple Nostr relays with:
 * - Per-relay connection state tracking
 * - URL normalization and deduplication
 * - Exponential backoff with jitter for reconnection
 * - NIP-42 authentication handling
 * - Graceful disconnect with subscription cleanup
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RelayConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";

interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  state: RelayConnectionState;
  retryCount: number;
  lastConnectedAt: number | null;
  lastEoseTimestamps: Map<string, number>; // subId → timestamp
  authChallenge: string | null;
  activeSubscriptions: Set<string>;
  pendingPublishes: Map<string, NostrEvent>;
}

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
  signEvent(event: Partial<NostrEvent>): Promise<NostrEvent>;
}

interface Subscription {
  id: string;
  filters: Record<string, unknown>[];
  relayStates: Map<string, { eoseReceived: boolean; eoseTimestamp: number | null }>;
  onEvent?: (event: NostrEvent, relay: string) => void;
  onEose?: (relay: string) => void;
  onError?: (relay: string, reason: string) => void;
}

// ---------------------------------------------------------------------------
// URL Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a relay URL for deduplication.
 * - Lowercase scheme and hostname
 * - Remove default ports (443 for wss, 80 for ws)
 * - Remove trailing slashes
 */
function normalizeRelayUrl(url: string): string {
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

// ---------------------------------------------------------------------------
// Relay Pool
// ---------------------------------------------------------------------------

class RelayPool {
  private relays: Map<string, RelayConnection> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private signer: NostrSigner | null = null;
  private maxConnections: number = 10;

  // Backoff configuration
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 60000; // 60 seconds max cap

  constructor(signer?: NostrSigner, maxConnections?: number) {
    if (signer) this.signer = signer;
    if (maxConnections) this.maxConnections = maxConnections;
  }

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  /**
   * Connect to a relay. Normalizes the URL and enforces one WebSocket per
   * relay URL — if already connected or connecting, this is a no-op.
   */
  connect(url: string): void {
    const normalized = normalizeRelayUrl(url);

    // Deduplication: only one WebSocket per normalized URL
    if (this.relays.has(normalized)) {
      const existing = this.relays.get(normalized)!;
      if (
        existing.state === "connected" ||
        existing.state === "connecting"
      ) {
        return; // Already connected or in progress
      }
    }

    if (this.relays.size >= this.maxConnections) {
      console.warn(
        `RelayPool: Max connections (${this.maxConnections}) reached. Cannot connect to ${normalized}`
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
      activeSubscriptions: new Set(),
      pendingPublishes: new Map(),
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

      // Re-subscribe active subscriptions after reconnect
      this.resubscribe(relay);

      // Flush pending publishes
      this.flushPendingPublishes(relay);
    };

    relay.ws.onmessage = (msg: MessageEvent) => {
      try {
        const message = JSON.parse(msg.data as string);
        this.handleMessage(relay, message);
      } catch (err) {
        console.error(`RelayPool: Failed to parse message from ${relay.url}:`, err);
      }
    };

    relay.ws.onclose = () => {
      relay.state = "disconnected";
      relay.ws = null;
      // Only schedule reconnect if not intentionally disconnecting
      if (this.relays.has(relay.url)) {
        this.scheduleReconnect(relay);
      }
    };

    relay.ws.onerror = () => {
      // onerror is always followed by onclose in browsers
      // No action needed here — onclose handles reconnection
    };
  }

  // -------------------------------------------------------------------------
  // Exponential Backoff with Jitter
  // -------------------------------------------------------------------------

  /**
   * Schedule a reconnection attempt with exponential backoff and jitter.
   *
   * Formula: min(baseDelay * 2^retryCount + jitter, maxDelay)
   * - Base delay: 1 second
   * - Max delay cap: 60 seconds
   * - Jitter: random 0-1000ms to prevent thundering herd
   */
  private scheduleReconnect(relay: RelayConnection): void {
    const exponential = this.baseDelay * Math.pow(2, relay.retryCount);
    const jitter = Math.random() * 1000; // 0-1 second random jitter
    const delay = Math.min(exponential + jitter, this.maxDelay);

    relay.retryCount++;

    console.log(
      `RelayPool: Reconnecting to ${relay.url} in ${Math.round(delay)}ms (attempt ${relay.retryCount})`
    );

    setTimeout(() => {
      if (relay.state === "disconnected" && this.relays.has(relay.url)) {
        this.attemptConnect(relay);
      }
    }, delay);
  }

  // -------------------------------------------------------------------------
  // Message Handling
  // -------------------------------------------------------------------------

  private handleMessage(relay: RelayConnection, message: unknown[]): void {
    const [type, ...args] = message;

    switch (type) {
      case "EVENT": {
        const [subId, event] = args as [string, NostrEvent];
        this.handleEvent(relay, subId, event);
        break;
      }
      case "OK": {
        const [eventId, success, reason] = args as [string, boolean, string];
        this.handleOk(relay, eventId, success, reason);
        break;
      }
      case "EOSE": {
        const [subId] = args as [string];
        this.handleEose(relay, subId);
        break;
      }
      case "CLOSED": {
        const [subId, reason] = args as [string, string];
        this.handleClosed(relay, subId, reason);
        break;
      }
      case "NOTICE": {
        const [msg] = args as [string];
        console.warn(`[${relay.url}] NOTICE: ${msg}`);
        break;
      }
      case "AUTH": {
        const [challenge] = args as [string];
        relay.authChallenge = challenge;
        this.handleAuthChallenge(relay, challenge);
        break;
      }
    }
  }

  private handleEvent(
    relay: RelayConnection,
    subId: string,
    event: NostrEvent
  ): void {
    const sub = this.subscriptions.get(subId);
    if (sub && sub.onEvent) {
      sub.onEvent(event, relay.url);
    }
  }

  private handleOk(
    relay: RelayConnection,
    eventId: string,
    success: boolean,
    reason: string
  ): void {
    // Remove from pending publishes
    relay.pendingPublishes.delete(eventId);
    // Notify listeners if needed
  }

  private handleEose(relay: RelayConnection, subId: string): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    const relayState = sub.relayStates.get(relay.url);
    if (relayState) {
      relayState.eoseReceived = true;
      relayState.eoseTimestamp = Math.floor(Date.now() / 1000);
    }

    // Store EOSE timestamp for reconnection
    relay.lastEoseTimestamps.set(subId, Math.floor(Date.now() / 1000));

    if (sub.onEose) {
      sub.onEose(relay.url);
    }
  }

  private async handleClosed(
    relay: RelayConnection,
    subId: string,
    reason: string
  ): Promise<void> {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    if (reason.startsWith("auth-required:")) {
      // Authenticate and re-subscribe
      await this.authenticateToRelay(relay);
      if (relay.ws && relay.state === "connected") {
        relay.ws.send(JSON.stringify(["REQ", subId, ...sub.filters]));
      }
    } else if (reason.startsWith("restricted:")) {
      // Permission denied — remove relay from this subscription, don't retry
      sub.relayStates.delete(relay.url);
      relay.activeSubscriptions.delete(subId);
      if (sub.onError) {
        sub.onError(relay.url, reason);
      }
    } else if (reason.startsWith("error:")) {
      // General error — retry after short delay
      setTimeout(() => {
        if (relay.state === "connected" && relay.ws) {
          relay.ws.send(JSON.stringify(["REQ", subId, ...sub.filters]));
        }
      }, 5000);
    }
  }

  // -------------------------------------------------------------------------
  // NIP-42 Authentication
  // -------------------------------------------------------------------------

  /**
   * Handle NIP-42 AUTH challenge from relay.
   * Stores the challenge string for later use.
   */
  private handleAuthChallenge(
    relay: RelayConnection,
    challenge: string
  ): void {
    relay.authChallenge = challenge;
    // Automatically attempt authentication if signer is available
    if (this.signer) {
      this.authenticateToRelay(relay);
    }
  }

  /**
   * Send AUTH response to relay using the stored challenge.
   */
  private async authenticateToRelay(relay: RelayConnection): Promise<void> {
    if (!relay.authChallenge || !this.signer || !relay.ws) return;

    const authEvent = {
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["relay", relay.url],
        ["challenge", relay.authChallenge],
      ],
      content: "",
    } as Partial<NostrEvent>;

    try {
      const signed = await this.signer.signEvent(authEvent);
      relay.ws.send(JSON.stringify(["AUTH", signed]));
    } catch (err) {
      console.error(`RelayPool: AUTH failed for ${relay.url}:`, err);
    }
  }

  // -------------------------------------------------------------------------
  // Subscription Management
  // -------------------------------------------------------------------------

  private resubscribe(relay: RelayConnection): void {
    for (const [subId, sub] of this.subscriptions) {
      if (sub.relayStates.has(relay.url) || relay.activeSubscriptions.has(subId)) {
        // Use last EOSE timestamp to avoid re-fetching old events
        const lastEose = relay.lastEoseTimestamps.get(subId);
        const reconnectFilters = lastEose
          ? sub.filters.map((f) => ({ ...f, since: lastEose }))
          : sub.filters;

        if (relay.ws) {
          relay.ws.send(JSON.stringify(["REQ", subId, ...reconnectFilters]));
        }

        // Reset EOSE tracking for this relay
        sub.relayStates.set(relay.url, {
          eoseReceived: false,
          eoseTimestamp: null,
        });
      }
    }
  }

  private flushPendingPublishes(relay: RelayConnection): void {
    for (const [, event] of relay.pendingPublishes) {
      if (relay.ws && relay.state === "connected") {
        relay.ws.send(JSON.stringify(["EVENT", event]));
      }
    }
  }

  // -------------------------------------------------------------------------
  // Graceful Disconnect
  // -------------------------------------------------------------------------

  /**
   * Gracefully disconnect from a relay.
   * Sends CLOSE for all active subscriptions before closing the WebSocket.
   */
  async disconnect(url: string): Promise<void> {
    const normalized = normalizeRelayUrl(url);
    const relay = this.relays.get(normalized);
    if (!relay || !relay.ws) return;

    relay.state = "disconnecting";

    // Send CLOSE for all active subscriptions on this relay
    for (const [subId, sub] of this.subscriptions) {
      if (sub.relayStates.has(normalized) || relay.activeSubscriptions.has(subId)) {
        relay.ws.send(JSON.stringify(["CLOSE", subId]));
        sub.relayStates.delete(normalized);
        relay.activeSubscriptions.delete(subId);
      }
    }

    // Close the WebSocket with normal closure code
    relay.ws.close(1000, "client disconnect");
    relay.ws = null;
    relay.state = "disconnected";

    // Remove from pool so it doesn't auto-reconnect
    this.relays.delete(normalized);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  getRelay(url: string): RelayConnection | undefined {
    return this.relays.get(normalizeRelayUrl(url));
  }

  getConnectedRelays(): RelayConnection[] {
    return [...this.relays.values()].filter((r) => r.state === "connected");
  }

  getRelayStates(): Map<string, RelayConnectionState> {
    const states = new Map<string, RelayConnectionState>();
    for (const [url, relay] of this.relays) {
      states.set(url, relay.state);
    }
    return states;
  }
}

export { RelayPool, normalizeRelayUrl };
export type {
  RelayConnection,
  RelayConnectionState,
  NostrEvent,
  NostrSigner,
  Subscription,
};

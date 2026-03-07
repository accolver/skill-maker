/**
 * Subscription Manager for Nostr clients
 *
 * Handles the complete subscription lifecycle:
 * - Per-relay EOSE tracking with overall loading → live transition
 * - EOSE timeout to prevent infinite loading states
 * - CLOSED message handling by reason prefix
 * - Subscription replacement with same sub-id
 * - Reconnection re-subscription with 'since' parameter
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubscriptionState = "idle" | "loading" | "live" | "closed";

interface RelaySubState {
  state: "loading" | "live" | "closed";
  eoseReceived: boolean;
  eoseTimestamp: number | null;
  lastEventTimestamp: number | null;
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

interface Filter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: unknown;
}

interface NostrSigner {
  signEvent(event: Partial<NostrEvent>): Promise<NostrEvent>;
}

interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  state: "disconnected" | "connecting" | "connected" | "disconnecting";
  authChallenge: string | null;
}

interface Subscription {
  id: string;
  filters: Filter[];
  relayStates: Map<string, RelaySubState>; // per-relay EOSE tracking
  overallState: SubscriptionState;
  createdAt: number;
  onEvent: (event: NostrEvent, relay: string) => void;
  onEose: (relay: string) => void;
  onClosed: (relay: string, reason: string) => void;
  onStateChange: (state: SubscriptionState) => void;
  eoseTimeout: ReturnType<typeof setTimeout> | null;
}

// ---------------------------------------------------------------------------
// Subscription Manager
// ---------------------------------------------------------------------------

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private signer: NostrSigner | null = null;
  private defaultEoseTimeoutMs: number = 10000; // 10 seconds

  constructor(signer?: NostrSigner, eoseTimeoutMs?: number) {
    if (signer) this.signer = signer;
    if (eoseTimeoutMs) this.defaultEoseTimeoutMs = eoseTimeoutMs;
  }

  // -------------------------------------------------------------------------
  // Open Subscription
  // -------------------------------------------------------------------------

  /**
   * Open a subscription across multiple relays.
   * Tracks EOSE state per-relay and transitions overall state from
   * 'loading' to 'live' only when ALL relays have sent EOSE or timed out.
   */
  openSubscription(
    subId: string,
    filters: Filter[],
    relays: RelayConnection[],
    callbacks: {
      onEvent: (event: NostrEvent, relay: string) => void;
      onEose?: (relay: string) => void;
      onClosed?: (relay: string, reason: string) => void;
      onStateChange?: (state: SubscriptionState) => void;
    }
  ): Subscription {
    const sub: Subscription = {
      id: subId,
      filters,
      relayStates: new Map<string, RelaySubState>(),
      overallState: "loading",
      createdAt: Math.floor(Date.now() / 1000),
      onEvent: callbacks.onEvent,
      onEose: callbacks.onEose || (() => {}),
      onClosed: callbacks.onClosed || (() => {}),
      onStateChange: callbacks.onStateChange || (() => {}),
      eoseTimeout: null,
    };

    // Initialize per-relay state and send REQ to each relay
    for (const relay of relays) {
      if (relay.state !== "connected" || !relay.ws) continue;

      sub.relayStates.set(relay.url, {
        state: "loading",
        eoseReceived: false,
        eoseTimestamp: null,
        lastEventTimestamp: null,
      });

      relay.ws.send(JSON.stringify(["REQ", subId, ...filters]));
    }

    // Set EOSE timeout — if relays don't send EOSE within the timeout,
    // force transition to 'live' to avoid infinite loading
    sub.eoseTimeout = setTimeout(() => {
      this.forceEoseTimeout(sub);
    }, this.defaultEoseTimeoutMs);

    this.subscriptions.set(subId, sub);
    sub.onStateChange("loading");

    return sub;
  }

  // -------------------------------------------------------------------------
  // EOSE Handling
  // -------------------------------------------------------------------------

  /**
   * Handle EOSE from a specific relay for a specific subscription.
   * EOSE is tracked per-relay — the overall subscription only transitions
   * to 'live' when ALL relays have sent EOSE or timed out.
   */
  handleEose(subId: string, relayUrl: string): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    const relayState = sub.relayStates.get(relayUrl);
    if (!relayState) return;

    relayState.state = "live";
    relayState.eoseReceived = true;
    relayState.eoseTimestamp = Math.floor(Date.now() / 1000);

    sub.onEose(relayUrl);

    // Check if ALL relays have sent EOSE
    const allEose = [...sub.relayStates.values()].every(
      (rs) => rs.eoseReceived || rs.state === "closed"
    );

    if (allEose) {
      this.transitionToLive(sub);
    }
  }

  /**
   * Force EOSE timeout — transition to live even if some relays haven't
   * sent EOSE. This prevents infinite loading states.
   */
  private forceEoseTimeout(sub: Subscription): void {
    if (sub.overallState !== "loading") return;

    for (const [url, rs] of sub.relayStates) {
      if (!rs.eoseReceived && rs.state === "loading") {
        rs.state = "live";
        rs.eoseTimestamp = Math.floor(Date.now() / 1000);
        console.warn(
          `SubscriptionManager: EOSE timeout for ${url} on sub ${sub.id}`
        );
      }
    }

    this.transitionToLive(sub);
  }

  private transitionToLive(sub: Subscription): void {
    sub.overallState = "live";

    if (sub.eoseTimeout) {
      clearTimeout(sub.eoseTimeout);
      sub.eoseTimeout = null;
    }

    sub.onStateChange("live");
  }

  // -------------------------------------------------------------------------
  // CLOSED Handling
  // -------------------------------------------------------------------------

  /**
   * Handle CLOSED messages from relays. The reason prefix determines the
   * appropriate action:
   * - auth-required: → authenticate with NIP-42, then re-subscribe
   * - restricted: → permission denied, don't retry
   * - error: → general error, retry after backoff
   */
  async handleClosed(
    subId: string,
    relayUrl: string,
    reason: string,
    relay: RelayConnection
  ): Promise<void> {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    sub.onClosed(relayUrl, reason);

    if (reason.startsWith("auth-required:")) {
      // Attempt re-authentication before re-subscribing
      await this.authenticateAndResubscribe(sub, relay);
    } else if (reason.startsWith("restricted:")) {
      // Permission denied — remove relay from subscription, don't retry
      const relayState = sub.relayStates.get(relayUrl);
      if (relayState) {
        relayState.state = "closed";
      }
      // Check if all relays are closed
      this.checkAllClosed(sub);
    } else if (reason.startsWith("error:")) {
      // General error — retry after backoff
      setTimeout(() => {
        if (relay.state === "connected" && relay.ws) {
          relay.ws.send(JSON.stringify(["REQ", subId, ...sub.filters]));
          const relayState = sub.relayStates.get(relayUrl);
          if (relayState) {
            relayState.state = "loading";
            relayState.eoseReceived = false;
          }
        }
      }, 5000);
    } else {
      // Unknown reason — treat as error
      const relayState = sub.relayStates.get(relayUrl);
      if (relayState) {
        relayState.state = "closed";
      }
    }
  }

  /**
   * For auth-required CLOSED, authenticate with NIP-42 then re-subscribe
   */
  private async authenticateAndResubscribe(
    sub: Subscription,
    relay: RelayConnection
  ): Promise<void> {
    if (!this.signer || !relay.ws || !relay.authChallenge) return;

    // Build and sign NIP-42 auth event
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

      // Re-subscribe after authentication
      relay.ws.send(JSON.stringify(["REQ", sub.id, ...sub.filters]));

      // Reset EOSE tracking for this relay
      const relayState = sub.relayStates.get(relay.url);
      if (relayState) {
        relayState.state = "loading";
        relayState.eoseReceived = false;
        relayState.eoseTimestamp = null;
      }
    } catch (err) {
      console.error(
        `SubscriptionManager: Auth failed for ${relay.url}:`,
        err
      );
    }
  }

  private checkAllClosed(sub: Subscription): void {
    const allClosed = [...sub.relayStates.values()].every(
      (rs) => rs.state === "closed"
    );
    if (allClosed) {
      sub.overallState = "closed";
      sub.onStateChange("closed");
    }
  }

  // -------------------------------------------------------------------------
  // Event Handling
  // -------------------------------------------------------------------------

  handleEvent(subId: string, relayUrl: string, event: NostrEvent): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    const relayState = sub.relayStates.get(relayUrl);
    if (relayState) {
      relayState.lastEventTimestamp = event.created_at;
    }

    sub.onEvent(event, relayUrl);
  }

  // -------------------------------------------------------------------------
  // Subscription Replacement
  // -------------------------------------------------------------------------

  /**
   * Replace a subscription's filters by sending a new REQ with the same
   * subscription ID. Resets EOSE tracking for all relays.
   */
  replaceSubscription(
    subId: string,
    newFilters: Filter[],
    relays: RelayConnection[]
  ): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    sub.filters = newFilters;

    // Reset EOSE tracking for all relays — we need new EOSE for new filters
    for (const [, rs] of sub.relayStates) {
      rs.state = "loading";
      rs.eoseReceived = false;
      rs.eoseTimestamp = null;
    }

    sub.overallState = "loading";
    sub.onStateChange("loading");

    // Clear existing EOSE timeout and set a new one
    if (sub.eoseTimeout) {
      clearTimeout(sub.eoseTimeout);
    }
    sub.eoseTimeout = setTimeout(() => {
      this.forceEoseTimeout(sub);
    }, this.defaultEoseTimeoutMs);

    // Send new REQ with same subscription ID to all relays
    for (const relay of relays) {
      if (relay.state !== "connected" || !relay.ws) continue;
      if (!sub.relayStates.has(relay.url)) continue;

      relay.ws.send(JSON.stringify(["REQ", subId, ...newFilters]));
    }
  }

  // -------------------------------------------------------------------------
  // Reconnection Re-subscription
  // -------------------------------------------------------------------------

  /**
   * After a relay reconnects, re-send all active subscriptions with a
   * 'since' filter parameter based on the last EOSE timestamp.
   * This avoids re-fetching the entire history.
   */
  resubscribeAfterReconnect(relay: RelayConnection): void {
    for (const [subId, sub] of this.subscriptions) {
      if (sub.overallState === "closed") continue;

      const relayState = sub.relayStates.get(relay.url);
      if (!relayState) continue;

      // Use last EOSE timestamp to set 'since' parameter
      const since =
        relayState.eoseTimestamp ?? relayState.lastEventTimestamp;
      const reconnectFilters = since
        ? sub.filters.map((f) => ({ ...f, since }))
        : sub.filters;

      // Reset relay state for this subscription
      relayState.state = "loading";
      relayState.eoseReceived = false;

      if (relay.ws && relay.state === "connected") {
        relay.ws.send(JSON.stringify(["REQ", subId, ...reconnectFilters]));
      }
    }
  }

  // -------------------------------------------------------------------------
  // Close Subscription
  // -------------------------------------------------------------------------

  /**
   * Close a subscription by sending CLOSE messages to all connected relays.
   */
  closeSubscription(subId: string, relays: RelayConnection[]): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    // Send CLOSE to all connected relays
    for (const relay of relays) {
      if (relay.state !== "connected" || !relay.ws) continue;
      if (!sub.relayStates.has(relay.url)) continue;

      relay.ws.send(JSON.stringify(["CLOSE", subId]));
    }

    sub.overallState = "closed";

    if (sub.eoseTimeout) {
      clearTimeout(sub.eoseTimeout);
      sub.eoseTimeout = null;
    }

    sub.onStateChange("closed");
    this.subscriptions.delete(subId);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  getSubscription(subId: string): Subscription | undefined {
    return this.subscriptions.get(subId);
  }

  getActiveSubscriptions(): Subscription[] {
    return [...this.subscriptions.values()].filter(
      (s) => s.overallState !== "closed"
    );
  }
}

export { SubscriptionManager };
export type {
  Subscription,
  SubscriptionState,
  RelaySubState,
  Filter,
  RelayConnection,
  NostrEvent,
  NostrSigner,
};

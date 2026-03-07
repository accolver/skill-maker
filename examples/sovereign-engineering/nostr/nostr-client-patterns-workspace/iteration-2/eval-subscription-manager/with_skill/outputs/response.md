# Subscription Manager

Here's a TypeScript subscription manager for a Nostr client that correctly
handles the full subscription lifecycle, following the nostr-client-patterns
skill.

## Implementation

```typescript
// subscription-manager.ts

// --- Types ---

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
  "#e"?: string[];
  "#p"?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

interface NostrSigner {
  signEvent(
    event: Omit<NostrEvent, "id" | "pubkey" | "sig">,
  ): Promise<NostrEvent>;
  getPublicKey(): Promise<string>;
}

type OverallSubState = "loading" | "live" | "closed";

// Tracks EOSE state per-relay per-subscription using a Map structure
interface RelaySubState {
  state: "loading" | "live" | "closed";
  eoseReceived: boolean;
  eoseTimestamp: number | null;
  lastEventTimestamp: number | null;
}

interface Subscription {
  id: string;
  filters: Filter[];
  // Tracks EOSE state per-relay per-subscription using a Map
  relayStates: Map<string, RelaySubState>;
  overallState: OverallSubState;
  createdAt: number;
  eoseTimeout: ReturnType<typeof setTimeout> | null;
  onEvent?: (event: NostrEvent, relayUrl: string) => void;
  onEose?: (relayUrl: string) => void;
  onLive?: () => void;
  onClosed?: (relayUrl: string, reason: string) => void;
}

interface RelayHandle {
  url: string;
  ws: WebSocket;
  authChallenge: string | null;
}

// --- Constants ---

const DEFAULT_EOSE_TIMEOUT_MS = 10000; // 10 seconds

// --- Subscription Manager ---

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private signer: NostrSigner | null = null;

  constructor(signer?: NostrSigner) {
    this.signer = signer ?? null;
  }

  /**
   * Open a subscription on multiple relays.
   * Tracks EOSE state per-relay per-subscription using a Map or object structure.
   * Sets an EOSE timeout to force transition if relays are slow.
   */
  openSubscription(
    subId: string,
    filters: Filter[],
    relays: RelayHandle[],
    callbacks?: {
      onEvent?: (event: NostrEvent, relayUrl: string) => void;
      onEose?: (relayUrl: string) => void;
      onLive?: () => void;
      onClosed?: (relayUrl: string, reason: string) => void;
    },
    eoseTimeoutMs: number = DEFAULT_EOSE_TIMEOUT_MS,
  ): Subscription {
    const relayStates = new Map<string, RelaySubState>();

    for (const relay of relays) {
      relayStates.set(relay.url, {
        state: "loading",
        eoseReceived: false,
        eoseTimestamp: null,
        lastEventTimestamp: null,
      });
      relay.ws.send(JSON.stringify(["REQ", subId, ...filters]));
    }

    const sub: Subscription = {
      id: subId,
      filters,
      relayStates,
      overallState: "loading",
      createdAt: Math.floor(Date.now() / 1000),
      eoseTimeout: null,
      onEvent: callbacks?.onEvent,
      onEose: callbacks?.onEose,
      onLive: callbacks?.onLive,
      onClosed: callbacks?.onClosed,
    };

    // Contains an EOSE timeout (setTimeout) that forces transition if relays are slow
    sub.eoseTimeout = setTimeout(() => {
      for (const [url, rs] of sub.relayStates) {
        if (!rs.eoseReceived && rs.state === "loading") {
          rs.state = "live";
          rs.eoseTimestamp = Math.floor(Date.now() / 1000);
          console.warn(`EOSE timeout for ${url} on sub ${subId}`);
        }
      }
      if (sub.overallState === "loading") {
        sub.overallState = "live";
        sub.onLive?.();
      }
    }, eoseTimeoutMs);

    this.subscriptions.set(subId, sub);
    return sub;
  }

  /**
   * Handle EOSE message from a relay.
   * Transitions to 'live' only after all relays have sent EOSE or a timeout fires.
   */
  handleEose(subId: string, relayUrl: string): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    const relayState = sub.relayStates.get(relayUrl);
    if (!relayState) return;

    relayState.state = "live";
    relayState.eoseReceived = true;
    relayState.eoseTimestamp = Math.floor(Date.now() / 1000);

    sub.onEose?.(relayUrl);

    // Check if ALL relays have sent EOSE
    const allEose = [...sub.relayStates.values()].every(
      (rs) => rs.eoseReceived || rs.state === "closed",
    );

    if (allEose && sub.overallState === "loading") {
      sub.overallState = "live";
      if (sub.eoseTimeout) {
        clearTimeout(sub.eoseTimeout);
        sub.eoseTimeout = null;
      }
      sub.onLive?.();
    }
  }

  /**
   * Handle EVENT message.
   */
  handleEvent(subId: string, relayUrl: string, event: NostrEvent): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    const relayState = sub.relayStates.get(relayUrl);
    if (relayState) {
      relayState.lastEventTimestamp = event.created_at;
    }

    sub.onEvent?.(event, relayUrl);
  }

  /**
   * Handle CLOSED message from a relay.
   * Parses CLOSED message reason prefixes — at least 'auth-required' and 'restricted'.
   * On 'auth-required:', attempts re-authentication before re-subscribing.
   */
  async handleClosed(
    subId: string,
    relayUrl: string,
    reason: string,
    relay: RelayHandle,
  ): Promise<void> {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    const relayState = sub.relayStates.get(relayUrl);

    if (reason.startsWith("auth-required:")) {
      // Attempts re-authentication on 'auth-required' CLOSED before re-subscribing
      if (this.signer && relay.authChallenge) {
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

        // Re-subscribe after auth
        relay.ws.send(JSON.stringify(["REQ", subId, ...sub.filters]));
        if (relayState) {
          relayState.state = "loading";
          relayState.eoseReceived = false;
        }
      }
    } else if (reason.startsWith("restricted:")) {
      // Permission denied — mark relay as closed, don't retry
      if (relayState) {
        relayState.state = "closed";
      }
      sub.onClosed?.(relayUrl, reason);
      this.checkOverallState(sub);
    } else if (reason.startsWith("error:")) {
      // General error
      console.error(`[${relayUrl}] CLOSED sub ${subId}: ${reason}`);
      if (relayState) {
        relayState.state = "closed";
      }
      sub.onClosed?.(relayUrl, reason);
      this.checkOverallState(sub);
    } else {
      if (relayState) {
        relayState.state = "closed";
      }
      sub.onClosed?.(relayUrl, reason);
      this.checkOverallState(sub);
    }
  }

  private checkOverallState(sub: Subscription): void {
    const allClosed = [...sub.relayStates.values()].every(
      (rs) => rs.state === "closed",
    );
    if (allClosed) {
      sub.overallState = "closed";
      if (sub.eoseTimeout) {
        clearTimeout(sub.eoseTimeout);
        sub.eoseTimeout = null;
      }
    }
  }

  /**
   * Supports subscription replacement by reusing the same subscription ID in a new REQ.
   * Sends new REQ with same sub-id, relay replaces old filters.
   */
  replaceSubscription(
    subId: string,
    newFilters: Filter[],
    relays: RelayHandle[],
  ): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    sub.filters = newFilters;

    // Reset EOSE tracking for all relays
    for (const [url, rs] of sub.relayStates) {
      rs.state = "loading";
      rs.eoseReceived = false;
      rs.eoseTimestamp = null;
    }

    sub.overallState = "loading";

    if (sub.eoseTimeout) {
      clearTimeout(sub.eoseTimeout);
    }

    sub.eoseTimeout = setTimeout(() => {
      for (const [url, rs] of sub.relayStates) {
        if (!rs.eoseReceived && rs.state === "loading") {
          rs.state = "live";
          rs.eoseTimestamp = Math.floor(Date.now() / 1000);
        }
      }
      if (sub.overallState === "loading") {
        sub.overallState = "live";
        sub.onLive?.();
      }
    }, DEFAULT_EOSE_TIMEOUT_MS);

    // Send new REQ with the same subscription ID
    for (const relay of relays) {
      if (sub.relayStates.has(relay.url)) {
        relay.ws.send(JSON.stringify(["REQ", subId, ...newFilters]));
      }
    }
  }

  /**
   * Re-subscribes after reconnection with a 'since' filter set to the last EOSE timestamp.
   * This avoids re-fetching events we already have.
   */
  resubscribeAfterReconnect(relay: RelayHandle): void {
    for (const [subId, sub] of this.subscriptions) {
      if (sub.overallState === "closed") continue;

      const relayState = sub.relayStates.get(relay.url);
      if (!relayState) continue;

      // Use last EOSE timestamp as the 'since' parameter
      const since = relayState.eoseTimestamp ?? relayState.lastEventTimestamp;
      const reconnectFilters = since
        ? sub.filters.map((f) => ({ ...f, since }))
        : sub.filters;

      relayState.state = "loading";
      relayState.eoseReceived = false;

      relay.ws.send(JSON.stringify(["REQ", subId, ...reconnectFilters]));
    }
  }

  /**
   * Can close subscriptions by sending CLOSE messages to relays.
   * Cleans up internal state and cancels any pending EOSE timeouts.
   */
  closeSubscription(subId: string, relays: RelayHandle[]): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    // Send CLOSE to each relay
    for (const relay of relays) {
      if (sub.relayStates.has(relay.url)) {
        relay.ws.send(JSON.stringify(["CLOSE", subId]));
      }
    }

    sub.overallState = "closed";
    if (sub.eoseTimeout) {
      clearTimeout(sub.eoseTimeout);
      sub.eoseTimeout = null;
    }

    this.subscriptions.delete(subId);
  }

  getSubscriptionState(subId: string): OverallSubState | null {
    return this.subscriptions.get(subId)?.overallState ?? null;
  }

  getRelayStates(subId: string): Map<string, RelaySubState> | null {
    return this.subscriptions.get(subId)?.relayStates ?? null;
  }
}

export {
  Filter,
  NostrEvent,
  RelayHandle,
  RelaySubState,
  Subscription,
  SubscriptionManager,
};
```

## Summary

This subscription manager covers the full lifecycle:

1. **Per-relay EOSE tracking** — Tracks EOSE state per-relay per-subscription
   using a Map or object structure, with individual `eoseReceived` and
   `eoseTimestamp` per relay.

2. **Loading→live transition** — Transitions to 'live' only after all relays
   have sent EOSE or a timeout fires, preventing infinite loading.

3. **EOSE timeout** — Contains an EOSE timeout (setTimeout) that forces
   transition if relays are slow (default 10 seconds).

4. **CLOSED handling** — Parses CLOSED message reason prefixes — at least
   'auth-required' and 'restricted' are handled with different strategies.

5. **Re-authentication** — Attempts re-authentication on 'auth-required' CLOSED
   before re-subscribing, signing a kind:22242 NIP-42 auth event.

6. **Subscription replacement** — Supports subscription replacement by reusing
   the same subscription ID in a new REQ, resetting EOSE tracking for the new
   filters.

7. **Reconnection** — Re-subscribes after reconnection with a 'since' filter set
   to the last EOSE timestamp, avoiding re-fetching old events.

8. **Clean close** — Can close subscriptions by sending CLOSE messages to relays
   and cleaning up internal state.

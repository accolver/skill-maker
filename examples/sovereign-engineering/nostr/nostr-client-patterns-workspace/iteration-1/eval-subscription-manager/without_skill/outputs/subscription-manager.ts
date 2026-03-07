/**
 * Basic Subscription Manager for Nostr
 */

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

interface Subscription {
  id: string;
  filters: Filter[];
  active: boolean;
  onEvent: (event: NostrEvent) => void;
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private eoseReceived: Set<string> = new Set(); // tracks which sub IDs got EOSE

  /**
   * Open a subscription
   */
  openSubscription(
    subId: string,
    filters: Filter[],
    relays: { url: string; ws: WebSocket | null; state: string }[],
    onEvent: (event: NostrEvent) => void
  ): Subscription {
    const sub: Subscription = {
      id: subId,
      filters,
      active: true,
      onEvent,
    };

    this.subscriptions.set(subId, sub);

    for (const relay of relays) {
      if (relay.state === "connected" && relay.ws) {
        relay.ws.send(JSON.stringify(["REQ", subId, ...filters]));
      }
    }

    return sub;
  }

  /**
   * Handle EOSE
   */
  handleEose(subId: string): void {
    this.eoseReceived.add(subId);
    console.log(`EOSE received for subscription ${subId}`);
  }

  /**
   * Handle incoming event
   */
  handleEvent(subId: string, event: NostrEvent): void {
    const sub = this.subscriptions.get(subId);
    if (sub && sub.active) {
      sub.onEvent(event);
    }
  }

  /**
   * Handle CLOSED message
   */
  handleClosed(subId: string, reason: string): void {
    console.log(`Subscription ${subId} closed: ${reason}`);
    const sub = this.subscriptions.get(subId);
    if (sub) {
      sub.active = false;
    }
  }

  /**
   * Close a subscription
   */
  closeSubscription(
    subId: string,
    relays: { url: string; ws: WebSocket | null; state: string }[]
  ): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    for (const relay of relays) {
      if (relay.state === "connected" && relay.ws) {
        relay.ws.send(JSON.stringify(["CLOSE", subId]));
      }
    }

    sub.active = false;
    this.subscriptions.delete(subId);
  }

  /**
   * Replace subscription filters
   */
  replaceSubscription(
    subId: string,
    newFilters: Filter[],
    relays: { url: string; ws: WebSocket | null; state: string }[]
  ): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    sub.filters = newFilters;

    for (const relay of relays) {
      if (relay.state === "connected" && relay.ws) {
        relay.ws.send(JSON.stringify(["REQ", subId, ...newFilters]));
      }
    }
  }
}

export { SubscriptionManager };
export type { Subscription, Filter, NostrEvent };

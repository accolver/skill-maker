# Subscription Manager

Here's a TypeScript subscription manager for a Nostr client.

```typescript
// subscription-manager.ts

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
}

interface Subscription {
  id: string;
  filters: Filter[];
  isActive: boolean;
  eoseReceived: boolean;
  callback: (event: NostrEvent) => void;
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private subCounter: number = 0;

  /**
   * Create a new subscription.
   */
  subscribe(
    filters: Filter[],
    callback: (event: NostrEvent) => void,
    relays: WebSocket[],
  ): string {
    const subId = `sub_${this.subCounter++}`;

    const sub: Subscription = {
      id: subId,
      filters,
      isActive: true,
      eoseReceived: false,
      callback,
    };

    this.subscriptions.set(subId, sub);

    // Send REQ to all relays
    for (const ws of relays) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["REQ", subId, ...filters]));
      }
    }

    return subId;
  }

  /**
   * Handle incoming message.
   */
  handleMessage(message: any[]): void {
    const type = message[0];

    switch (type) {
      case "EVENT": {
        const subId = message[1];
        const event = message[2] as NostrEvent;
        const sub = this.subscriptions.get(subId);
        if (sub && sub.isActive) {
          sub.callback(event);
        }
        break;
      }
      case "EOSE": {
        const subId = message[1];
        const sub = this.subscriptions.get(subId);
        if (sub) {
          sub.eoseReceived = true;
        }
        break;
      }
      case "CLOSED": {
        const subId = message[1];
        const reason = message[2] as string;
        console.log(`Subscription ${subId} closed: ${reason}`);
        const sub = this.subscriptions.get(subId);
        if (sub) {
          sub.isActive = false;
        }
        break;
      }
    }
  }

  /**
   * Close a subscription.
   */
  unsubscribe(subId: string, relays: WebSocket[]): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    for (const ws of relays) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["CLOSE", subId]));
      }
    }

    sub.isActive = false;
    this.subscriptions.delete(subId);
  }

  /**
   * Update subscription with new filters.
   */
  updateFilters(
    subId: string,
    newFilters: Filter[],
    relays: WebSocket[],
  ): void {
    const sub = this.subscriptions.get(subId);
    if (!sub) return;

    sub.filters = newFilters;

    for (const ws of relays) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["REQ", subId, ...newFilters]));
      }
    }
  }

  /**
   * Re-subscribe all active subscriptions on a reconnected relay.
   */
  resubscribe(ws: WebSocket): void {
    for (const [subId, sub] of this.subscriptions) {
      if (sub.isActive) {
        ws.send(JSON.stringify(["REQ", subId, ...sub.filters]));
      }
    }
  }

  closeAll(relays: WebSocket[]): void {
    for (const [subId] of this.subscriptions) {
      this.unsubscribe(subId, relays);
    }
  }
}

export { Filter, NostrEvent, Subscription, SubscriptionManager };
```

This subscription manager provides:

- Subscription creation and tracking with EOSE flags
- Message handling for EVENT, EOSE, and CLOSED
- Filter updates on existing subscriptions
- Re-subscribing on reconnected relays
- Clean subscription closing

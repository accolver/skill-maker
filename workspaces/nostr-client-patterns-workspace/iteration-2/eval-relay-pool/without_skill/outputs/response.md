# Relay Pool Manager

Here's a TypeScript implementation of a relay pool manager for Nostr.

```typescript
// relay-pool.ts

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface RelayInfo {
  url: string;
  socket: WebSocket | null;
  connected: boolean;
  subscriptions: Set<string>;
}

type EventHandler = (event: NostrEvent) => void;

class RelayPool {
  private relays: Map<string, RelayInfo> = new Map();
  private handlers: Map<string, EventHandler> = new Map();
  private reconnectDelay: number = 3000;

  /**
   * Add and connect to a relay.
   */
  addRelay(url: string): void {
    if (this.relays.has(url)) return;

    const relay: RelayInfo = {
      url,
      socket: null,
      connected: false,
      subscriptions: new Set(),
    };

    this.relays.set(url, relay);
    this.connectRelay(relay);
  }

  private connectRelay(relay: RelayInfo): void {
    const ws = new WebSocket(relay.url);

    ws.onopen = () => {
      relay.connected = true;
      relay.socket = ws;
      console.log(`Connected to ${relay.url}`);
    };

    ws.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      this.handleMessage(relay, data);
    };

    ws.onclose = () => {
      relay.connected = false;
      relay.socket = null;
      // Reconnect after fixed delay (no backoff)
      setTimeout(() => {
        this.connectRelay(relay);
      }, this.reconnectDelay);
    };

    ws.onerror = (err) => {
      console.error(`WebSocket error on ${relay.url}:`, err);
    };
  }

  private handleMessage(relay: RelayInfo, message: any[]): void {
    const type = message[0];

    switch (type) {
      case "EVENT": {
        const subId = message[1];
        const event = message[2];
        const handler = this.handlers.get(subId);
        if (handler) handler(event);
        break;
      }
      case "OK": {
        const eventId = message[1];
        const success = message[2];
        if (!success) {
          console.error(
            `Event ${eventId} rejected by ${relay.url}: ${message[3]}`,
          );
        }
        break;
      }
      case "EOSE": {
        console.log(`EOSE received from ${relay.url} for sub ${message[1]}`);
        break;
      }
      case "NOTICE": {
        console.log(`Notice from ${relay.url}: ${message[1]}`);
        break;
      }
    }
  }

  subscribe(subId: string, filters: any[], handler: EventHandler): void {
    this.handlers.set(subId, handler);

    for (const [, relay] of this.relays) {
      if (relay.connected && relay.socket) {
        relay.socket.send(JSON.stringify(["REQ", subId, ...filters]));
        relay.subscriptions.add(subId);
      }
    }
  }

  unsubscribe(subId: string): void {
    for (const [, relay] of this.relays) {
      if (relay.connected && relay.socket) {
        relay.socket.send(JSON.stringify(["CLOSE", subId]));
      }
      relay.subscriptions.delete(subId);
    }
    this.handlers.delete(subId);
  }

  publish(event: NostrEvent): void {
    for (const [, relay] of this.relays) {
      if (relay.connected && relay.socket) {
        relay.socket.send(JSON.stringify(["EVENT", event]));
      }
    }
  }

  removeRelay(url: string): void {
    const relay = this.relays.get(url);
    if (relay && relay.socket) {
      relay.socket.close();
      relay.socket = null;
      relay.connected = false;
    }
    this.relays.delete(url);
  }

  close(): void {
    for (const [url] of this.relays) {
      this.removeRelay(url);
    }
  }
}

export { NostrEvent, RelayPool };
```

This implementation provides:

- Connection management with a connected boolean flag per relay
- Subscription handling with event callbacks
- Fixed-delay reconnection when connections drop
- Publishing events to all connected relays
- Removing relays by closing their WebSocket

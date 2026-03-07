/**
 * Simple Relay Pool Manager for Nostr
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

interface Relay {
  url: string;
  ws: WebSocket | null;
  connected: boolean;
}

class RelayPool {
  private relays: Map<string, Relay> = new Map();
  private subscriptions: Map<string, any> = new Map();

  /**
   * Connect to a relay
   */
  connect(url: string): void {
    if (this.relays.has(url)) return;

    const relay: Relay = {
      url,
      ws: null,
      connected: false,
    };

    this.relays.set(url, relay);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      relay.ws = ws;
      relay.connected = true;
      console.log(`Connected to ${url}`);
    };

    ws.onmessage = (msg: MessageEvent) => {
      const data = JSON.parse(msg.data as string);
      this.handleMessage(relay, data);
    };

    ws.onclose = () => {
      relay.connected = false;
      relay.ws = null;
      // Reconnect after 5 seconds
      setTimeout(() => {
        this.connect(url);
      }, 5000);
    };

    ws.onerror = (err) => {
      console.error(`WebSocket error for ${url}:`, err);
    };
  }

  private handleMessage(relay: Relay, message: any[]): void {
    const [type, ...args] = message;

    switch (type) {
      case "EVENT": {
        const [subId, event] = args;
        const sub = this.subscriptions.get(subId);
        if (sub && sub.callback) {
          sub.callback(event);
        }
        break;
      }
      case "OK": {
        const [eventId, success, reason] = args;
        if (!success) {
          console.error(`Event ${eventId} rejected: ${reason}`);
        }
        break;
      }
      case "EOSE": {
        const [subId] = args;
        console.log(`EOSE received for ${subId}`);
        break;
      }
      case "NOTICE": {
        console.log(`NOTICE from ${relay.url}: ${args[0]}`);
        break;
      }
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(
    subId: string,
    filters: any[],
    callback: (event: NostrEvent) => void
  ): void {
    this.subscriptions.set(subId, { filters, callback });

    for (const [, relay] of this.relays) {
      if (relay.connected && relay.ws) {
        relay.ws.send(JSON.stringify(["REQ", subId, ...filters]));
      }
    }
  }

  /**
   * Publish an event
   */
  publish(event: NostrEvent): void {
    for (const [, relay] of this.relays) {
      if (relay.connected && relay.ws) {
        relay.ws.send(JSON.stringify(["EVENT", event]));
      }
    }
  }

  /**
   * Disconnect from a relay
   */
  disconnect(url: string): void {
    const relay = this.relays.get(url);
    if (relay && relay.ws) {
      relay.ws.close();
      this.relays.delete(url);
    }
  }
}

export { RelayPool };
export type { Relay, NostrEvent };

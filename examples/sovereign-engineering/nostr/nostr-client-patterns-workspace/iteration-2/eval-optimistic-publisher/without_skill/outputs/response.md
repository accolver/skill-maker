# Optimistic Event Publisher

Here's a TypeScript optimistic event publisher for a Nostr client.

```typescript
// optimistic-publisher.ts

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

type PublishStatus = "sending" | "sent" | "error";

interface PendingEvent {
  event: NostrEvent;
  status: PublishStatus;
  sentToRelays: string[];
  errors: string[];
}

class EventPublisher {
  private pendingEvents: Map<string, PendingEvent> = new Map();
  private seenEvents: Set<string> = new Set();

  /**
   * Publish an event to relays.
   */
  async publish(event: NostrEvent, relays: WebSocket[]): Promise<void> {
    const pending: PendingEvent = {
      event,
      status: "sending",
      sentToRelays: [],
      errors: [],
    };
    this.pendingEvents.set(event.id, pending);

    for (const ws of relays) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(["EVENT", event]));
        pending.sentToRelays.push((ws as any).url || "unknown");
      }
    }

    pending.status = "sent";
  }

  /**
   * Handle OK message from relay.
   */
  handleOk(eventId: string, success: boolean, message: string): void {
    const pending = this.pendingEvents.get(eventId);
    if (!pending) return;

    if (success) {
      pending.status = "sent";
    } else {
      pending.errors.push(message);
      if (pending.errors.length >= pending.sentToRelays.length) {
        pending.status = "error";
      }
    }
  }

  /**
   * Check if we've already seen an event (by id).
   */
  isDuplicate(event: NostrEvent): boolean {
    if (this.seenEvents.has(event.id)) {
      return true;
    }
    this.seenEvents.add(event.id);
    return false;
  }

  getPending(): PendingEvent[] {
    return [...this.pendingEvents.values()];
  }

  remove(eventId: string): void {
    this.pendingEvents.delete(eventId);
  }
}

export { EventPublisher, NostrEvent, PendingEvent };
```

This publisher provides:

- Event publishing with status tracking (sending/sent/error)
- OK message handling from relays
- Basic event deduplication by ID
- Error collection from relay rejections

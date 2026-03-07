/**
 * Event Publisher for Nostr
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

interface PublishedEvent {
  event: NostrEvent;
  published: boolean;
}

class EventPublisher {
  private events: Map<string, PublishedEvent> = new Map();
  private seenEvents: Set<string> = new Set();

  /**
   * Publish an event to relays
   */
  publish(
    event: NostrEvent,
    relays: { url: string; ws: WebSocket | null; state: string }[]
  ): void {
    this.events.set(event.id, {
      event,
      published: false,
    });

    for (const relay of relays) {
      if (relay.state === "connected" && relay.ws) {
        relay.ws.send(JSON.stringify(["EVENT", event]));
      }
    }
  }

  /**
   * Handle OK response from relay
   */
  handleOk(eventId: string, success: boolean, reason: string): void {
    const pub = this.events.get(eventId);
    if (!pub) return;

    if (success) {
      pub.published = true;
    } else {
      console.error(`Event ${eventId} failed: ${reason}`);
    }
  }

  /**
   * Deduplicate incoming events by ID
   */
  deduplicateEvent(event: NostrEvent): boolean {
    if (this.seenEvents.has(event.id)) {
      return false;
    }
    this.seenEvents.add(event.id);
    return true;
  }

  /**
   * Get event status
   */
  getEventStatus(eventId: string): PublishedEvent | undefined {
    return this.events.get(eventId);
  }
}

export { EventPublisher };
export type { PublishedEvent, NostrEvent };

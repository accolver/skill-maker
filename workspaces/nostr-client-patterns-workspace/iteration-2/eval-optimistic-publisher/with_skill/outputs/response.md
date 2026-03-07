# Optimistic Event Publisher

Here's a TypeScript optimistic event publisher for a Nostr client, following the
nostr-client-patterns skill guidance.

## Implementation

```typescript
// optimistic-publisher.ts

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

type EventStatus = "pending" | "confirmed" | "failed" | "timeout";

type OkReasonCategory = "success" | "retriable" | "permanent";

interface PerRelayStatus {
  relayUrl: string;
  ok: boolean | null; // null = no response yet
  reason: string;
  category: OkReasonCategory | null;
  receivedAt: number | null;
}

interface PublishState {
  event: NostrEvent;
  status: EventStatus;
  // Tracks OK responses per-relay per-event (not a single global boolean)
  relayStatuses: Map<string, PerRelayStatus>;
  createdAt: number;
  confirmedAt: number | null;
  timeout: ReturnType<typeof setTimeout> | null;
}

interface RelayHandle {
  url: string;
  ws: WebSocket;
}

// --- Constants ---

const PUBLISH_TIMEOUT_MS = 10000; // 10 seconds

// Replaceable event kinds: 0, 3, 10000-19999
function isReplaceable(kind: number): boolean {
  return kind === 0 || kind === 3 || (kind >= 10000 && kind <= 19999);
}

// --- OK Reason Prefix Parsing ---

// Distinguishes retriable errors ('rate-limited', 'auth-required') from permanent failures ('blocked', 'restricted')
function categorizeOkReason(
  success: boolean,
  reason: string,
): OkReasonCategory {
  if (success) return "success";

  // duplicate: is treated as success — the relay already has the event
  if (reason.startsWith("duplicate:")) return "success";

  // Retriable errors
  if (reason.startsWith("rate-limited:")) return "retriable";
  if (reason.startsWith("auth-required:")) return "retriable";
  if (reason.startsWith("error:")) return "retriable";
  if (reason.startsWith("pow:")) return "retriable";

  // Permanent failures
  if (reason.startsWith("blocked:")) return "permanent";
  if (reason.startsWith("restricted:")) return "permanent";
  if (reason.startsWith("invalid:")) return "permanent";

  return "permanent";
}

// --- Event Deduplication ---

class EventDeduplicator {
  private seenIds: Set<string> = new Set();
  private replaceableStore: Map<string, NostrEvent> = new Map();

  /**
   * Process an event for deduplication.
   * Regular events are deduplicated by event.id.
   * Deduplicates replaceable events by keeping latest created_at, with lowest id as tiebreaker.
   */
  processEvent(event: NostrEvent): boolean {
    if (this.seenIds.has(event.id)) return false;

    if (isReplaceable(event.kind)) {
      const key = `${event.pubkey}:${event.kind}`;
      const existing = this.replaceableStore.get(key);

      if (existing) {
        // Keep latest created_at
        if (event.created_at < existing.created_at) {
          return false;
        }
        // Tiebreaker: lowest id wins
        if (
          event.created_at === existing.created_at && event.id >= existing.id
        ) {
          return false;
        }
        this.seenIds.delete(existing.id);
      }

      this.replaceableStore.set(key, event);
    }

    this.seenIds.add(event.id);
    return true;
  }

  getReplaceable(pubkey: string, kind: number): NostrEvent | undefined {
    return this.replaceableStore.get(`${pubkey}:${kind}`);
  }

  clear(): void {
    this.seenIds.clear();
    this.replaceableStore.clear();
  }
}

// --- Optimistic Publisher ---

class OptimisticPublisher {
  private publishStates: Map<string, PublishState> = new Map();
  private deduplicator: EventDeduplicator = new EventDeduplicator();
  private onStatusChange?: (eventId: string, status: EventStatus) => void;

  constructor(onStatusChange?: (eventId: string, status: EventStatus) => void) {
    this.onStatusChange = onStatusChange;
  }

  /**
   * Publish an event optimistically.
   * Adds events to local state with 'pending' status before sending to relays,
   * so the UI can display them immediately.
   */
  publish(event: NostrEvent, relays: RelayHandle[]): PublishState {
    // Step 1: Add to local state with 'pending' status (optimistic UI)
    const relayStatuses = new Map<string, PerRelayStatus>();
    for (const relay of relays) {
      relayStatuses.set(relay.url, {
        relayUrl: relay.url,
        ok: null,
        reason: "",
        category: null,
        receivedAt: null,
      });
    }

    const state: PublishState = {
      event,
      status: "pending",
      relayStatuses,
      createdAt: Math.floor(Date.now() / 1000),
      confirmedAt: null,
      timeout: null,
    };

    this.publishStates.set(event.id, state);
    this.deduplicator.processEvent(event);

    // Notify UI — event visible with 'pending' status
    this.onStatusChange?.(event.id, "pending");

    // Step 2: Send EVENT to all relays
    const eventMsg = JSON.stringify(["EVENT", event]);
    for (const relay of relays) {
      if (relay.ws.readyState === WebSocket.OPEN) {
        relay.ws.send(eventMsg);
      }
    }

    // Contains a timeout mechanism (setTimeout) for relays that don't send OK
    state.timeout = setTimeout(() => {
      this.handlePublishTimeout(event.id);
    }, PUBLISH_TIMEOUT_MS);

    return state;
  }

  /**
   * Handle an OK response from a relay.
   * Tracks OK responses per-relay per-event.
   * Transitions to 'confirmed' when at least one relay accepts the event.
   * Transitions to 'failed' only when ALL relays have rejected or timed out.
   */
  handleOk(
    eventId: string,
    relayUrl: string,
    success: boolean,
    reason: string,
  ): void {
    const state = this.publishStates.get(eventId);
    if (!state) return;

    const relayStatus = state.relayStatuses.get(relayUrl);
    if (!relayStatus) return;

    const category = categorizeOkReason(success, reason);
    relayStatus.ok = success || category === "success";
    relayStatus.reason = reason;
    relayStatus.category = category;
    relayStatus.receivedAt = Math.floor(Date.now() / 1000);

    // Transitions to 'confirmed' when at least one relay accepts
    if (category === "success" && state.status === "pending") {
      state.status = "confirmed";
      state.confirmedAt = Math.floor(Date.now() / 1000);
      if (state.timeout) {
        clearTimeout(state.timeout);
        state.timeout = null;
      }
      this.onStatusChange?.(eventId, "confirmed");
      return;
    }

    this.checkAllRelaysResponded(eventId);
  }

  /**
   * Check if all relays have responded. Transitions to 'failed' only when
   * ALL relays have rejected or timed out — not on the first failure.
   */
  private checkAllRelaysResponded(eventId: string): void {
    const state = this.publishStates.get(eventId);
    if (!state || state.status !== "pending") return;

    const allResponded = [...state.relayStatuses.values()].every(
      (rs) => rs.ok !== null,
    );

    if (allResponded) {
      const anySuccess = [...state.relayStatuses.values()].some(
        (rs) => rs.category === "success",
      );

      if (!anySuccess) {
        state.status = "failed";
        if (state.timeout) {
          clearTimeout(state.timeout);
          state.timeout = null;
        }
        this.onStatusChange?.(eventId, "failed");
      }
    }
  }

  /**
   * Handle publish timeout. Contains a timeout mechanism (setTimeout) for
   * relays that don't send OK — marks them as timed out.
   */
  private handlePublishTimeout(eventId: string): void {
    const state = this.publishStates.get(eventId);
    if (!state || state.status !== "pending") return;

    for (const [, relayStatus] of state.relayStatuses) {
      if (relayStatus.ok === null) {
        relayStatus.ok = false;
        relayStatus.reason = "timeout";
        relayStatus.category = "permanent";
        relayStatus.receivedAt = Math.floor(Date.now() / 1000);
      }
    }

    const anySuccess = [...state.relayStatuses.values()].some(
      (rs) => rs.category === "success",
    );

    if (anySuccess) {
      state.status = "confirmed";
      state.confirmedAt = Math.floor(Date.now() / 1000);
      this.onStatusChange?.(eventId, "confirmed");
    } else {
      state.status = "failed";
      this.onStatusChange?.(eventId, "failed");
    }
  }

  /**
   * Retry a failed event.
   */
  retry(eventId: string, relays: RelayHandle[]): void {
    const state = this.publishStates.get(eventId);
    if (!state) return;

    state.status = "pending";
    state.confirmedAt = null;

    for (const relay of relays) {
      state.relayStatuses.set(relay.url, {
        relayUrl: relay.url,
        ok: null,
        reason: "",
        category: null,
        receivedAt: null,
      });
    }

    const eventMsg = JSON.stringify(["EVENT", state.event]);
    for (const relay of relays) {
      if (relay.ws.readyState === WebSocket.OPEN) {
        relay.ws.send(eventMsg);
      }
    }

    state.timeout = setTimeout(() => {
      this.handlePublishTimeout(eventId);
    }, PUBLISH_TIMEOUT_MS);

    this.onStatusChange?.(eventId, "pending");
  }

  /**
   * Process incoming event for deduplication.
   */
  processIncomingEvent(event: NostrEvent): boolean {
    return this.deduplicator.processEvent(event);
  }

  getState(eventId: string): PublishState | undefined {
    return this.publishStates.get(eventId);
  }

  getRetriableRelays(eventId: string): string[] {
    const state = this.publishStates.get(eventId);
    if (!state) return [];
    return [...state.relayStatuses.values()]
      .filter((rs) => rs.category === "retriable")
      .map((rs) => rs.relayUrl);
  }
}

export {
  EventDeduplicator,
  EventStatus,
  NostrEvent,
  OptimisticPublisher,
  PerRelayStatus,
  PublishState,
  RelayHandle,
};
```

## Summary

This optimistic publisher implementation includes:

- Adds events to local state with 'pending' status before sending to relays
- Tracks OK responses per-relay per-event (not a single global boolean)
- Treats 'duplicate:' as a success prefix (not an error)
- Distinguishes retriable errors ('rate-limited', 'auth-required') from
  permanent failures ('blocked', 'restricted')
- Transitions to 'confirmed' when at least one relay accepts the event
- Transitions to 'failed' only when ALL relays have rejected or timed out
- Contains a timeout mechanism (setTimeout) for relays that don't send OK
- Deduplicates replaceable events by keeping latest created_at, with lowest id
  as tiebreaker

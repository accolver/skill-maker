/**
 * Optimistic Event Publisher for Nostr clients
 *
 * Implements:
 * - Optimistic UI: events shown immediately with 'pending' status
 * - Per-relay OK response tracking
 * - OK reason prefix parsing (duplicate as success, retriable vs permanent errors)
 * - Event status transitions: pending → confirmed | failed
 * - Timeout for unresponsive relays
 * - Event deduplication for regular and replaceable events
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventPublishStatus = "pending" | "confirmed" | "failed" | "timeout";

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface RelayOkResponse {
  relayUrl: string;
  success: boolean;
  reason: string;
  receivedAt: number;
}

interface PendingEvent {
  event: NostrEvent;
  status: EventPublishStatus;
  relayResponses: Map<string, RelayOkResponse>;
  targetRelays: Set<string>;
  timeout: ReturnType<typeof setTimeout> | null;
  onStatusChange?: (status: EventPublishStatus) => void;
}

type OkReasonCategory = "success" | "retriable" | "permanent";

interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  state: "disconnected" | "connecting" | "connected" | "disconnecting";
}

// ---------------------------------------------------------------------------
// OK Reason Prefix Classification
// ---------------------------------------------------------------------------

/**
 * Parse OK message reason prefix to determine error category.
 *
 * Success prefixes (treat as success):
 *   - "" (empty) — accepted
 *   - "duplicate:" — relay already has it (still success)
 *
 * Retriable prefixes (can retry):
 *   - "rate-limited:" — too many events, backoff and retry
 *   - "auth-required:" — need NIP-42 auth first
 *   - "error:" — general relay error
 *   - "pow:" — proof of work issue
 *
 * Permanent failure prefixes (don't retry):
 *   - "blocked:" — client/user blocked
 *   - "restricted:" — permission denied
 *   - "invalid:" — protocol violation
 */
function classifyOkReason(
  success: boolean,
  reason: string
): OkReasonCategory {
  if (success) return "success";

  // duplicate: is treated as success even if success=true,
  // but also handle the case where it might come with success=false
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

  // Unknown reason — treat as permanent to be safe
  return "permanent";
}

// ---------------------------------------------------------------------------
// Event Deduplication
// ---------------------------------------------------------------------------

/**
 * Deduplicates events received from multiple relays.
 *
 * Regular events: deduplicated by event.id using a Set
 * Replaceable events (kinds 0, 3, 10000-19999): keep latest created_at,
 *   break ties by keeping the lowest event id (lexicographic)
 * Addressable events (kinds 30000-39999): same as replaceable but keyed
 *   by pubkey+kind+d-tag
 */
class EventDeduplicator {
  // Regular event dedup — Set of event IDs
  private seenIds: Set<string> = new Set();

  // Replaceable event store — key: "pubkey:kind" → event
  private replaceableStore: Map<string, NostrEvent> = new Map();

  // Addressable event store — key: "pubkey:kind:d-tag" → event
  private addressableStore: Map<string, NostrEvent> = new Map();

  /**
   * Check if an event is a duplicate. Returns true if the event should
   * be processed (is new or replaces an older version).
   */
  processEvent(event: NostrEvent): boolean {
    if (this.isReplaceable(event.kind)) {
      return this.processReplaceableEvent(event);
    }

    if (this.isAddressable(event.kind)) {
      return this.processAddressableEvent(event);
    }

    return this.processRegularEvent(event);
  }

  /**
   * Regular event deduplication uses event.id with a Set.
   */
  private processRegularEvent(event: NostrEvent): boolean {
    if (this.seenIds.has(event.id)) {
      return false; // duplicate
    }
    this.seenIds.add(event.id);
    return true;
  }

  /**
   * Replaceable event deduplication keeps the latest created_at.
   * Breaks ties by keeping the lowest event id (lexicographic comparison).
   */
  private processReplaceableEvent(event: NostrEvent): boolean {
    const key = `${event.pubkey}:${event.kind}`;
    const existing = this.replaceableStore.get(key);

    if (existing) {
      // Keep the event with the latest created_at
      if (event.created_at < existing.created_at) {
        return false; // older event, skip
      }
      // If same created_at, keep the one with the lowest id
      if (
        event.created_at === existing.created_at &&
        event.id >= existing.id
      ) {
        return false; // same timestamp, higher or equal id, skip
      }
    }

    this.replaceableStore.set(key, event);
    // Also add to seenIds for cross-dedup
    this.seenIds.add(event.id);
    return true;
  }

  /**
   * Addressable event deduplication — same as replaceable but keyed by
   * pubkey + kind + d-tag value.
   */
  private processAddressableEvent(event: NostrEvent): boolean {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1] ?? "";
    const key = `${event.pubkey}:${event.kind}:${dTag}`;
    const existing = this.addressableStore.get(key);

    if (existing) {
      if (event.created_at < existing.created_at) return false;
      if (
        event.created_at === existing.created_at &&
        event.id >= existing.id
      ) {
        return false;
      }
    }

    this.addressableStore.set(key, event);
    this.seenIds.add(event.id);
    return true;
  }

  private isReplaceable(kind: number): boolean {
    return kind === 0 || kind === 3 || (kind >= 10000 && kind <= 19999);
  }

  private isAddressable(kind: number): boolean {
    return kind >= 30000 && kind <= 39999;
  }

  /**
   * Clear old entries to prevent memory leaks in long-running clients.
   */
  cleanup(maxAge: number = 3600): void {
    // For LRU-style cleanup, remove oldest entries
    if (this.seenIds.size > 10000) {
      const idsArray = [...this.seenIds];
      const toRemove = idsArray.slice(0, idsArray.length - 5000);
      for (const id of toRemove) {
        this.seenIds.delete(id);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Optimistic Publisher
// ---------------------------------------------------------------------------

class OptimisticPublisher {
  private pendingEvents: Map<string, PendingEvent> = new Map();
  private deduplicator: EventDeduplicator = new EventDeduplicator();
  private okTimeoutMs: number = 10000; // 10 second timeout for OK responses

  constructor(okTimeoutMs?: number) {
    if (okTimeoutMs) this.okTimeoutMs = okTimeoutMs;
  }

  // -------------------------------------------------------------------------
  // Publish Event (Optimistic)
  // -------------------------------------------------------------------------

  /**
   * Publish an event optimistically:
   * 1. Add to local state with 'pending' status immediately
   * 2. Send to all connected relays
   * 3. Track OK responses per relay
   * 4. Update status based on responses
   */
  publishEvent(
    event: NostrEvent,
    relays: RelayConnection[],
    onStatusChange?: (status: EventPublishStatus) => void
  ): PendingEvent {
    const targetRelays = new Set(
      relays
        .filter((r) => r.state === "connected" && r.ws)
        .map((r) => r.url)
    );

    // Step 1: Add to local state with 'pending' status immediately
    const pending: PendingEvent = {
      event,
      status: "pending",
      relayResponses: new Map<string, RelayOkResponse>(),
      targetRelays,
      timeout: null,
      onStatusChange,
    };

    this.pendingEvents.set(event.id, pending);

    // Step 2: Send EVENT to all connected relays
    for (const relay of relays) {
      if (relay.state !== "connected" || !relay.ws) continue;
      relay.ws.send(JSON.stringify(["EVENT", event]));
    }

    // Step 3: Set timeout for relays that don't send OK responses
    pending.timeout = setTimeout(() => {
      this.handleTimeout(event.id);
    }, this.okTimeoutMs);

    return pending;
  }

  // -------------------------------------------------------------------------
  // OK Response Handling
  // -------------------------------------------------------------------------

  /**
   * Handle an OK response from a relay.
   * OK responses are tracked per-relay per-event.
   *
   * The 'duplicate:' reason prefix is treated as success (not failure).
   * Retriable errors (rate-limited, auth-required) are distinguished from
   * permanent failures (blocked, restricted).
   */
  handleOk(
    eventId: string,
    relayUrl: string,
    success: boolean,
    reason: string
  ): void {
    const pending = this.pendingEvents.get(eventId);
    if (!pending) return;

    const category = classifyOkReason(success, reason);

    // Track OK response per-relay per-event
    pending.relayResponses.set(relayUrl, {
      relayUrl,
      success: category === "success",
      reason,
      receivedAt: Date.now(),
    });

    // Check if event status should transition
    if (category === "success" && pending.status === "pending") {
      // Event status transitions to 'confirmed' when at least one relay accepts
      this.updateStatus(pending, "confirmed");
    }

    // Check if ALL relays have responded
    if (pending.relayResponses.size >= pending.targetRelays.size) {
      this.evaluateFinalStatus(pending);
    }
  }

  /**
   * Evaluate final status after all relays have responded.
   * Event status transitions to 'failed' only when ALL relays have
   * rejected or timed out.
   */
  private evaluateFinalStatus(pending: PendingEvent): void {
    if (pending.status === "confirmed") return; // Already confirmed

    const hasSuccess = [...pending.relayResponses.values()].some(
      (r) => r.success
    );

    if (hasSuccess) {
      this.updateStatus(pending, "confirmed");
    } else {
      // ALL relays rejected — status transitions to 'failed'
      this.updateStatus(pending, "failed");
    }
  }

  // -------------------------------------------------------------------------
  // Timeout Handling
  // -------------------------------------------------------------------------

  /**
   * Handle timeout for relays that don't send OK responses.
   * If no relay has confirmed by timeout, check partial responses.
   */
  private handleTimeout(eventId: string): void {
    const pending = this.pendingEvents.get(eventId);
    if (!pending || pending.status === "confirmed") return;

    // Check if any relay confirmed before timeout
    const hasSuccess = [...pending.relayResponses.values()].some(
      (r) => r.success
    );

    if (hasSuccess) {
      this.updateStatus(pending, "confirmed");
    } else if (pending.relayResponses.size === 0) {
      // No responses at all — timeout
      this.updateStatus(pending, "timeout");
    } else {
      // Some responses but all failures — failed
      this.updateStatus(pending, "failed");
    }
  }

  private updateStatus(
    pending: PendingEvent,
    status: EventPublishStatus
  ): void {
    pending.status = status;

    if (status === "confirmed" || status === "failed" || status === "timeout") {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
        pending.timeout = null;
      }
    }

    if (pending.onStatusChange) {
      pending.onStatusChange(status);
    }
  }

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  /**
   * Process an incoming event through the deduplicator.
   * Returns true if the event is new and should be displayed.
   */
  processIncomingEvent(event: NostrEvent): boolean {
    return this.deduplicator.processEvent(event);
  }

  // -------------------------------------------------------------------------
  // Retry
  // -------------------------------------------------------------------------

  /**
   * Retry publishing a failed event to specific relays.
   */
  retryPublish(
    eventId: string,
    relays: RelayConnection[]
  ): PendingEvent | null {
    const existing = this.pendingEvents.get(eventId);
    if (!existing) return null;

    // Only retry failed or timed-out events
    if (
      existing.status !== "failed" &&
      existing.status !== "timeout"
    ) {
      return existing;
    }

    // Reset status and re-publish
    existing.status = "pending";
    existing.relayResponses.clear();
    existing.targetRelays = new Set(
      relays
        .filter((r) => r.state === "connected" && r.ws)
        .map((r) => r.url)
    );

    for (const relay of relays) {
      if (relay.state !== "connected" || !relay.ws) continue;
      relay.ws.send(JSON.stringify(["EVENT", existing.event]));
    }

    existing.timeout = setTimeout(() => {
      this.handleTimeout(eventId);
    }, this.okTimeoutMs);

    if (existing.onStatusChange) {
      existing.onStatusChange("pending");
    }

    return existing;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  getPendingEvent(eventId: string): PendingEvent | undefined {
    return this.pendingEvents.get(eventId);
  }

  getAllPending(): PendingEvent[] {
    return [...this.pendingEvents.values()].filter(
      (p) => p.status === "pending"
    );
  }

  getDeduplicator(): EventDeduplicator {
    return this.deduplicator;
  }
}

export { OptimisticPublisher, EventDeduplicator, classifyOkReason };
export type {
  PendingEvent,
  EventPublishStatus,
  OkReasonCategory,
  RelayOkResponse,
  NostrEvent,
  RelayConnection,
};

# Subscription Lifecycle Patterns

## State Machine

Each subscription tracks its state independently per relay. The overall
subscription state is derived from the per-relay states.

### Per-Relay Subscription State

```
                  ┌──────────────────────────────┐
                  │                              │
                  ▼                              │
┌──────┐    ┌─────────┐    ┌──────┐    ┌────────┴─┐
│ idle │───▶│ loading  │───▶│ live │───▶│  closed  │
└──────┘    └─────────┘    └──────┘    └──────────┘
                │              │              ▲
                │              │              │
                │              ▼              │
                │         ┌──────────┐        │
                └────────▶│ replacing│────────┘
                          └──────────┘
```

**Transitions:**

| From      | To        | Trigger                                  |
| --------- | --------- | ---------------------------------------- |
| idle      | loading   | Client sends REQ                         |
| loading   | live      | Relay sends EOSE                         |
| loading   | closed    | Relay sends CLOSED or timeout            |
| live      | closed    | Client sends CLOSE or relay sends CLOSED |
| live      | replacing | Client sends new REQ with same sub-id    |
| replacing | loading   | New REQ sent, awaiting new EOSE          |
| any       | closed    | WebSocket disconnects                    |

### Subscription Data Structure

```typescript
interface Subscription {
  id: string;
  filters: Filter[];
  relayStates: Map<string, RelaySubState>;
  overallState: "loading" | "live" | "closed";
  createdAt: number;
  onEvent: (event: NostrEvent, relay: string) => void;
  onEose: (relay: string) => void;
  onClosed: (relay: string, reason: string) => void;
  eoseTimeout: ReturnType<typeof setTimeout> | null;
}

interface RelaySubState {
  state: "loading" | "live" | "closed";
  eoseReceived: boolean;
  eoseTimestamp: number | null;
  lastEventTimestamp: number | null;
}
```

## Multi-Relay EOSE Coordination

When subscribed to multiple relays, EOSE arrives independently from each. The
subscription transitions to "live" when enough relays have responded.

### Strategy: Wait for All (with timeout)

```typescript
function handleEose(sub: Subscription, relayUrl: string): void {
  const relayState = sub.relayStates.get(relayUrl);
  if (!relayState) return;

  relayState.state = "live";
  relayState.eoseReceived = true;
  relayState.eoseTimestamp = Math.floor(Date.now() / 1000);

  sub.onEose(relayUrl);

  // Check if ALL relays have sent EOSE
  const allEose = [...sub.relayStates.values()].every(
    (rs) => rs.eoseReceived || rs.state === "closed",
  );

  if (allEose) {
    sub.overallState = "live";
    if (sub.eoseTimeout) {
      clearTimeout(sub.eoseTimeout);
      sub.eoseTimeout = null;
    }
  }
}
```

### EOSE Timeout

Set a timeout when opening the subscription. If some relays haven't sent EOSE
within the timeout, treat them as if they did (to avoid infinite loading).

```typescript
function openSubscription(
  sub: Subscription,
  relays: RelayConnection[],
  eoseTimeoutMs: number = 10000,
): void {
  for (const relay of relays) {
    if (relay.state !== "connected") continue;

    sub.relayStates.set(relay.url, {
      state: "loading",
      eoseReceived: false,
      eoseTimestamp: null,
      lastEventTimestamp: null,
    });

    relay.ws!.send(JSON.stringify(["REQ", sub.id, ...sub.filters]));
  }

  // Timeout: transition to live even if some relays are slow
  sub.eoseTimeout = setTimeout(() => {
    for (const [url, rs] of sub.relayStates) {
      if (!rs.eoseReceived && rs.state === "loading") {
        rs.state = "live";
        rs.eoseTimestamp = Math.floor(Date.now() / 1000);
        console.warn(`EOSE timeout for ${url} on sub ${sub.id}`);
      }
    }
    sub.overallState = "live";
  }, eoseTimeoutMs);
}
```

## Subscription ID Management

Subscription IDs must be unique per relay connection. Use a consistent naming
scheme to avoid collisions.

```typescript
function generateSubId(purpose: string, context: string): string {
  // Keep it short (max 64 chars per NIP-01) and descriptive
  const hash = simpleHash(context).slice(0, 8);
  return `${purpose}-${hash}`;
}

// Examples:
// "feed-a1b2c3d4"     — main feed subscription
// "profile-e5f6g7h8"  — profile metadata fetch
// "thread-i9j0k1l2"   — thread view subscription
// "notif-m3n4o5p6"    — notifications subscription
```

## Subscription Replacement

To change filters without closing and reopening, send a new REQ with the same
subscription ID. The relay replaces the old filter set.

```typescript
function replaceSubscription(
  sub: Subscription,
  newFilters: Filter[],
  relays: RelayConnection[],
): void {
  sub.filters = newFilters;

  // Reset EOSE tracking — we need new EOSE for the new filters
  for (const [url, rs] of sub.relayStates) {
    rs.state = "loading";
    rs.eoseReceived = false;
    rs.eoseTimestamp = null;
  }

  sub.overallState = "loading";

  for (const relay of relays) {
    if (relay.state !== "connected") continue;
    if (!sub.relayStates.has(relay.url)) continue;
    relay.ws!.send(JSON.stringify(["REQ", sub.id, ...newFilters]));
  }
}
```

## Closing Subscriptions

Always close subscriptions when they're no longer needed. Unclosed subscriptions
waste relay resources and bandwidth.

```typescript
function closeSubscription(
  sub: Subscription,
  relays: RelayConnection[],
): void {
  for (const relay of relays) {
    if (relay.state !== "connected") continue;
    if (!sub.relayStates.has(relay.url)) continue;
    relay.ws!.send(JSON.stringify(["CLOSE", sub.id]));
  }

  sub.overallState = "closed";
  if (sub.eoseTimeout) {
    clearTimeout(sub.eoseTimeout);
    sub.eoseTimeout = null;
  }
}
```

**When to close:**

- View/component unmounts (React useEffect cleanup, etc.)
- User navigates away from the relevant content
- Subscription is being replaced by a completely different query
- Application is shutting down

## Reconnection and Re-subscription

When a relay reconnects, re-send active subscriptions with a `since` parameter
to avoid re-fetching old events.

```typescript
function resubscribeAfterReconnect(
  relay: RelayConnection,
  subscriptions: Map<string, Subscription>,
): void {
  for (const [subId, sub] of subscriptions) {
    if (sub.overallState === "closed") continue;

    const relayState = sub.relayStates.get(relay.url);
    if (!relayState) continue;

    // Use last EOSE timestamp to avoid re-fetching
    const since = relayState.eoseTimestamp ?? relayState.lastEventTimestamp;
    const reconnectFilters = since
      ? sub.filters.map((f) => ({ ...f, since }))
      : sub.filters;

    relayState.state = "loading";
    relayState.eoseReceived = false;

    relay.ws!.send(JSON.stringify(["REQ", subId, ...reconnectFilters]));
  }
}
```

## Common Subscription Patterns

### Feed Subscription (paginated)

```typescript
// Initial load: get latest 50 events
const feedSub = createSubscription("feed", [
  { kinds: [1, 6], authors: followList, limit: 50 },
]);

// Load more: use `until` with oldest event's created_at
function loadMore(oldestTimestamp: number): void {
  const moreSub = createSubscription("feed-more", [
    {
      kinds: [1, 6],
      authors: followList,
      until: oldestTimestamp - 1,
      limit: 50,
    },
  ]);
  // Close after EOSE (one-shot query)
  moreSub.onEose = () => closeSubscription(moreSub, relays);
}
```

### Profile Fetch (one-shot)

```typescript
// Fetch profile and close after EOSE
const profileSub = createSubscription("profile", [
  { kinds: [0], authors: [pubkey], limit: 1 },
  { kinds: [10002], authors: [pubkey], limit: 1 },
]);

profileSub.onEose = (relay) => {
  // Check if all relays responded
  const allDone = [...profileSub.relayStates.values()]
    .every((rs) => rs.eoseReceived);
  if (allDone) closeSubscription(profileSub, relays);
};
```

### Thread View (live)

```typescript
// Subscribe to root event + all replies, keep live for new replies
const threadSub = createSubscription("thread", [
  { ids: [rootEventId] },
  { kinds: [1], "#e": [rootEventId] },
]);
// Don't close — keep receiving live replies until user navigates away
```

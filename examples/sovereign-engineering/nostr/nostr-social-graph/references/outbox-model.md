# The Outbox Model

## What It Is

The outbox model is a relay routing strategy defined in NIP-65. Instead of
broadcasting events to every known relay and hoping recipients find them, the
outbox model uses kind:10002 relay list metadata to route events precisely.

## The Problem It Solves

Without the outbox model, clients either:

- Connect to a handful of popular relays (centralization risk)
- Broadcast to every relay they know (bandwidth waste)
- Miss events from users on different relays (data loss)

## Core Rules

### Fetching Events FROM a User

Use that user's **WRITE** relays (from their kind:10002).

Why: Users publish to their write relays. That's where their events live.

```
You want Alice's notes
  → Fetch Alice's kind:10002
  → Find her WRITE relays: wss://alice-relay.com, wss://general-relay.com
  → Subscribe to those relays: { kinds: [1], authors: [alice_pubkey] }
```

### Fetching Events ABOUT a User (Mentions)

Use that user's **READ** relays (from their kind:10002).

Why: When someone tags Alice, they should send to Alice's read relays. So
mentions of Alice accumulate on her read relays.

```
You want notes that mention Alice
  → Fetch Alice's kind:10002
  → Find her READ relays: wss://mentions-relay.com, wss://general-relay.com
  → Subscribe: { kinds: [1], #p: [alice_pubkey] }
```

### Publishing an Event

1. Send to your own **WRITE** relays
2. Send to the **READ** relays of each user you tagged
3. Send your kind:10002 to all relays you published to

```
You publish a note tagging Alice and Bob
  → Send to YOUR write relays
  → Send to Alice's READ relays
  → Send to Bob's READ relays
  → Send your kind:10002 to all those relays
```

## Relay Classification from kind:10002

```json
{
  "kind": 10002,
  "tags": [
    ["r", "wss://both.example.com"],
    ["r", "wss://write-only.example.com", "write"],
    ["r", "wss://read-only.example.com", "read"]
  ]
}
```

| Tag                           | Marker    | Classification |
| ----------------------------- | --------- | -------------- |
| `["r", "wss://url"]`          | none      | READ + WRITE   |
| `["r", "wss://url", "write"]` | `"write"` | WRITE only     |
| `["r", "wss://url", "read"]`  | `"read"`  | READ only      |

## Implementation Pattern

### Step 1: Resolve Relay Lists

```typescript
async function resolveRelayList(pubkey: string): Promise<RelayList> {
  // Fetch kind:10002 from well-known indexer relays
  const event = await pool.get(INDEXER_RELAYS, {
    kinds: [10002],
    authors: [pubkey],
  });

  if (!event) return { read: [], write: [] };

  const read: string[] = [];
  const write: string[] = [];

  for (const tag of event.tags) {
    if (tag[0] !== "r") continue;
    const url = normalizeUrl(tag[1]);
    const marker = tag[2];

    if (!marker || marker === "read") read.push(url);
    if (!marker || marker === "write") write.push(url);
  }

  return { read, write };
}
```

### Step 2: Build Feed Subscriptions

```typescript
async function buildFeed(myFollows: string[]) {
  // Batch-fetch kind:10002 for all follows
  const relayLists = new Map<string, RelayList>();
  const events = await pool.querySync(INDEXER_RELAYS, {
    kinds: [10002],
    authors: myFollows,
  });

  for (const event of events) {
    relayLists.set(event.pubkey, parseRelayList(event));
  }

  // Group users by their write relays
  const relayToAuthors = new Map<string, Set<string>>();
  for (const [pubkey, relays] of relayLists) {
    for (const writeRelay of relays.write) {
      if (!relayToAuthors.has(writeRelay)) {
        relayToAuthors.set(writeRelay, new Set());
      }
      relayToAuthors.get(writeRelay)!.add(pubkey);
    }
  }

  // Subscribe per relay
  for (const [relay, authors] of relayToAuthors) {
    pool.subscribeMany([relay], [{
      kinds: [1],
      authors: [...authors],
      since: Math.floor(Date.now() / 1000) - 86400,
    }]);
  }
}
```

### Step 3: Publish with Outbox Routing

```typescript
async function publishWithOutbox(event: SignedEvent, myRelayList: RelayList) {
  const targetRelays = new Set<string>();

  // 1. Add my write relays
  for (const relay of myRelayList.write) {
    targetRelays.add(relay);
  }

  // 2. Add read relays of each tagged user
  const taggedPubkeys = event.tags
    .filter((t) => t[0] === "p")
    .map((t) => t[1]);

  for (const pubkey of taggedPubkeys) {
    const theirRelays = await resolveRelayList(pubkey);
    for (const relay of theirRelays.read) {
      targetRelays.add(relay);
    }
  }

  // 3. Publish event to all target relays
  await pool.publish([...targetRelays], event);

  // 4. Spread kind:10002 to those relays too
  await pool.publish([...targetRelays], myKind10002Event);
}
```

## Fallback Strategy

When a user has no kind:10002 event:

1. Check kind:3 `p` tag relay hints (legacy, but sometimes available)
2. Try well-known public relays (wss://relay.damus.io, wss://nos.lol, etc.)
3. Check NIP-05 identifier for relay suggestions
4. Use relay discovery services (e.g., purplepag.es)

## Discoverability

Clients SHOULD spread kind:10002 events to well-known indexer relays. These are
relays that naturally serve as public directories for relay list metadata.
Without this, the outbox model breaks down because nobody can find your relay
preferences.

Common indexer relays:

- `wss://purplepag.es` — dedicated relay list indexer
- `wss://relay.nostr.band` — general indexer with relay list support
- `wss://relay.damus.io` — large general-purpose relay

## Size Guidelines

Clients should guide users to keep kind:10002 lists small:

- 2-4 write relays
- 2-4 read relays
- Overlapping (no marker) relays count toward both

Large relay lists defeat the purpose: they increase connection overhead and
approach the "broadcast to everything" anti-pattern the outbox model exists to
prevent.

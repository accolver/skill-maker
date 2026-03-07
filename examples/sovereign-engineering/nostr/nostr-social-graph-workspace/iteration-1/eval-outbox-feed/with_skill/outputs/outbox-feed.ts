/**
 * Outbox Model Feed Implementation (NIP-65)
 *
 * Implements the outbox model for fetching a user's feed. Uses kind:10002
 * relay list metadata to route subscriptions to the correct relays.
 *
 * Core rules:
 * - Fetch events FROM a user → use that user's WRITE relays
 * - Fetch events ABOUT a user (mentions) → use that user's READ relays
 * - r tags with no marker = both read AND write
 * - r tags with "read" marker = read only
 * - r tags with "write" marker = write only
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NostrEvent {
  kind: number;
  pubkey: string;
  tags: string[][];
  content: string;
  created_at: number;
}

interface RelayList {
  read: string[];
  write: string[];
}

interface SubscriptionFilter {
  kinds?: number[];
  authors?: string[];
  "#p"?: string[];
  since?: number;
}

interface RelaySubscription {
  relay: string;
  filters: SubscriptionFilter[];
}

// Well-known indexer relays for discovering kind:10002 events
const INDEXER_RELAYS = [
  "wss://purplepag.es",
  "wss://relay.nostr.band",
  "wss://relay.damus.io",
];

// Fallback relays for users without kind:10002
const FALLBACK_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
];

// ---------------------------------------------------------------------------
// Relay List Parsing
// ---------------------------------------------------------------------------

/**
 * Parse a kind:10002 event to extract read and write relays.
 *
 * Relay classification:
 * - ["r", "wss://url"]           → no marker → BOTH read AND write
 * - ["r", "wss://url", "write"]  → write marker → WRITE only
 * - ["r", "wss://url", "read"]   → read marker → READ only
 */
export function parseRelayList(event: NostrEvent): RelayList {
  const read: string[] = [];
  const write: string[] = [];

  for (const tag of event.tags) {
    if (tag[0] !== "r") continue;

    const url = normalizeRelayUrl(tag[1]);
    const marker = tag[2]; // undefined if no marker

    // No marker means BOTH read and write
    if (!marker || marker === "read") {
      read.push(url);
    }
    if (!marker || marker === "write") {
      write.push(url);
    }
  }

  return { read, write };
}

/**
 * Normalize a relay URL for consistent comparison.
 * - Lowercase the host
 * - Remove default port (443 for wss, 80 for ws)
 * - Ensure trailing slash consistency
 */
function normalizeRelayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove default ports
    if (
      (parsed.protocol === "wss:" && parsed.port === "443") ||
      (parsed.protocol === "ws:" && parsed.port === "80")
    ) {
      parsed.port = "";
    }

    // Remove trailing slash for consistency
    let normalized = parsed.toString();
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Fetching kind:10002 Relay Lists
// ---------------------------------------------------------------------------

/**
 * Simulated relay pool for fetching events.
 * In production, replace with your relay library (nostr-tools, etc.)
 */
interface RelayPool {
  querySync(
    relays: string[],
    filter: SubscriptionFilter,
  ): Promise<NostrEvent[]>;
  subscribeMany(
    relays: string[],
    filters: SubscriptionFilter[],
    callbacks: {
      onevent: (event: NostrEvent) => void;
      oneose: () => void;
    },
  ): void;
}

/**
 * Fetch kind:10002 relay list metadata for a list of pubkeys.
 * Uses well-known indexer relays for discovery.
 */
export async function fetchRelayLists(
  pool: RelayPool,
  pubkeys: string[],
): Promise<Map<string, RelayList>> {
  const relayLists = new Map<string, RelayList>();

  // Batch-fetch kind:10002 for all pubkeys from indexer relays
  const events = await pool.querySync(INDEXER_RELAYS, {
    kinds: [10002],
    authors: pubkeys,
  });

  // Keep only the latest event per pubkey (kind:10002 is replaceable)
  const latestByPubkey = new Map<string, NostrEvent>();
  for (const event of events) {
    const existing = latestByPubkey.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      latestByPubkey.set(event.pubkey, event);
    }
  }

  for (const [pubkey, event] of latestByPubkey) {
    relayLists.set(pubkey, parseRelayList(event));
  }

  return relayLists;
}

// ---------------------------------------------------------------------------
// Outbox Model: Build Feed Subscriptions
// ---------------------------------------------------------------------------

/**
 * Build per-relay subscriptions for a user's feed using the outbox model.
 *
 * Steps:
 * 1. Extract followed pubkeys from the user's kind:3 event
 * 2. Fetch kind:10002 for each followed user to discover their relays
 * 3. Group followed users by their WRITE relays (where they publish)
 * 4. Create subscription filters per relay using the authors field
 *
 * This minimizes relay connections by grouping users who publish to the same relay.
 */
export async function buildFeedSubscriptions(
  pool: RelayPool,
  followListEvent: NostrEvent,
): Promise<RelaySubscription[]> {
  // Step 1: Extract followed pubkeys from kind:3
  const followedPubkeys = followListEvent.tags
    .filter((tag) => tag[0] === "p")
    .map((tag) => tag[1]);

  if (followedPubkeys.length === 0) {
    return [];
  }

  // Step 2: Fetch kind:10002 relay list metadata for each followed user
  const relayLists = await fetchRelayLists(pool, followedPubkeys);

  // Step 3: Group followed users by their WRITE relays
  const relayToAuthors = new Map<string, Set<string>>();

  for (const pubkey of followedPubkeys) {
    const relays = relayLists.get(pubkey);

    if (relays && relays.write.length > 0) {
      // User has kind:10002 — use their write relays
      for (const writeRelay of relays.write) {
        if (!relayToAuthors.has(writeRelay)) {
          relayToAuthors.set(writeRelay, new Set());
        }
        relayToAuthors.get(writeRelay)!.add(pubkey);
      }
    } else {
      // Fallback: user has no kind:10002 event
      // Try relay hints from the kind:3 p tags, then fall back to default relays
      const relayHint = followListEvent.tags.find(
        (tag) => tag[0] === "p" && tag[1] === pubkey && tag[2],
      )?.[2];

      const fallbackRelays = relayHint
        ? [relayHint, ...FALLBACK_RELAYS]
        : FALLBACK_RELAYS;

      for (const relay of fallbackRelays) {
        const normalizedRelay = normalizeRelayUrl(relay);
        if (!relayToAuthors.has(normalizedRelay)) {
          relayToAuthors.set(normalizedRelay, new Set());
        }
        relayToAuthors.get(normalizedRelay)!.add(pubkey);
      }
    }
  }

  // Step 4: Create subscription filters per relay
  const subscriptions: RelaySubscription[] = [];

  for (const [relay, authors] of relayToAuthors) {
    subscriptions.push({
      relay,
      filters: [
        {
          kinds: [1], // Text notes
          authors: [...authors], // Filter by pubkey on this relay
          since: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
        },
      ],
    });
  }

  return subscriptions;
}

// ---------------------------------------------------------------------------
// Outbox Model: Build Mention Subscriptions
// ---------------------------------------------------------------------------

/**
 * Build per-relay subscriptions for mentions of a specific user.
 * Uses the user's READ relays (where others send mentions to them).
 */
export async function buildMentionSubscriptions(
  pool: RelayPool,
  targetPubkey: string,
): Promise<RelaySubscription[]> {
  const relayLists = await fetchRelayLists(pool, [targetPubkey]);
  const relays = relayLists.get(targetPubkey);

  // Use read relays for mentions — that's where tagged events should arrive
  const readRelays =
    relays && relays.read.length > 0 ? relays.read : FALLBACK_RELAYS;

  return readRelays.map((relay) => ({
    relay,
    filters: [
      {
        kinds: [1],
        "#p": [targetPubkey],
        since: Math.floor(Date.now() / 1000) - 86400,
      },
    ],
  }));
}

// ---------------------------------------------------------------------------
// Helper: Get write/read relays from parsed tags
// ---------------------------------------------------------------------------

/**
 * Extract write relays from kind:10002 r tags.
 * Write relays: tags with "write" marker OR no marker (no marker = both).
 */
export function getWriteRelays(tags: string[][]): string[] {
  return tags
    .filter((t) => t[0] === "r" && (t.length === 2 || t[2] === "write"))
    .map((t) => normalizeRelayUrl(t[1]));
}

/**
 * Extract read relays from kind:10002 r tags.
 * Read relays: tags with "read" marker OR no marker (no marker = both).
 */
export function getReadRelays(tags: string[][]): string[] {
  return tags
    .filter((t) => t[0] === "r" && (t.length === 2 || t[2] === "read"))
    .map((t) => normalizeRelayUrl(t[1]));
}

// ---------------------------------------------------------------------------
// Example usage
// ---------------------------------------------------------------------------

async function example() {
  // Mock relay pool
  const mockPool: RelayPool = {
    async querySync(_relays, filter) {
      // Simulated kind:10002 responses
      if (filter.kinds?.[0] === 10002) {
        return [
          {
            kind: 10002,
            pubkey: "alice_pubkey_hex",
            tags: [
              ["r", "wss://alice-relay.com", "write"],
              ["r", "wss://mentions.alice.com", "read"],
              ["r", "wss://general-relay.com"], // no marker = both read AND write
            ],
            content: "",
            created_at: 1700000000,
          },
          {
            kind: 10002,
            pubkey: "bob_pubkey_hex",
            tags: [
              ["r", "wss://bob-writes.com", "write"],
              ["r", "wss://general-relay.com"], // no marker = both
            ],
            content: "",
            created_at: 1700000000,
          },
        ];
      }
      return [];
    },
    subscribeMany() {},
  };

  // My follow list (kind:3)
  const myFollowList: NostrEvent = {
    kind: 3,
    pubkey: "my_pubkey_hex",
    tags: [
      ["p", "alice_pubkey_hex", "wss://alice-relay.com", "alice"],
      ["p", "bob_pubkey_hex", "wss://nos.lol", "bob"],
      ["p", "charlie_pubkey_hex"], // No relay hint, no kind:10002 → fallback
    ],
    content: "",
    created_at: 1700000000,
  };

  const subscriptions = await buildFeedSubscriptions(mockPool, myFollowList);

  console.log("Feed subscriptions (outbox model):");
  for (const sub of subscriptions) {
    console.log(`  Relay: ${sub.relay}`);
    console.log(`  Authors: ${sub.filters[0].authors?.join(", ")}`);
  }
}

example().catch(console.error);

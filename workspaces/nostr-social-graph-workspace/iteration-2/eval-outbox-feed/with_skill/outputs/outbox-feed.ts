/**
 * Outbox Model Feed Implementation for Nostr (NIP-65)
 *
 * Fetches a user's feed by consulting kind:10002 relay list metadata
 * for each followed user, extracting write relays (where they publish)
 * and read relays (where they expect mentions), grouping followed users
 * by their write relays to minimize connections, and creating per-relay
 * subscription filters with authors fields.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
}

interface RelayInfo {
  url: string;
  read: boolean;
  write: boolean;
}

interface SubscriptionFilter {
  kinds?: number[];
  authors?: string[];
  since?: number;
  limit?: number;
}

interface RelaySubscription {
  relay: string;
  filter: SubscriptionFilter;
}

// ─── Relay Extraction from kind:10002 ────────────────────────────────────────

/**
 * Extract relay information from a kind:10002 relay list metadata event.
 * Uses r tags (not p tags or e tags) for relay discovery.
 *
 * r tag format:
 *   ["r", "wss://relay.example.com"]          — no marker = BOTH read AND write
 *   ["r", "wss://relay.example.com", "write"] — write only
 *   ["r", "wss://relay.example.com", "read"]  — read only
 */
function extractRelays(relayListEvent: NostrEvent): RelayInfo[] {
  return relayListEvent.tags
    .filter((tag) => tag[0] === "r") // Only r tags from kind:10002 for relay discovery
    .map((tag) => {
      const url = tag[1];
      const marker = tag[2]; // "read", "write", or undefined (no marker)

      if (marker === "write") {
        return { url, read: false, write: true };
      } else if (marker === "read") {
        return { url, read: true, write: false };
      } else {
        // No marker means BOTH read and write
        return { url, read: true, write: true };
      }
    });
}

/**
 * Get write relays from r tags — write marker OR no marker.
 * Write relays are where the user publishes their events.
 * Use these to FETCH events FROM a user.
 */
function getWriteRelays(relayListEvent: NostrEvent): string[] {
  return relayListEvent.tags
    .filter((tag) => tag[0] === "r" && (tag.length === 2 || tag[2] === "write"))
    .map((tag) => tag[1]);
}

/**
 * Get read relays from r tags — read marker OR no marker.
 * Read relays are where the user expects to receive mentions.
 * Use these to FETCH events ABOUT a user (mentions).
 */
function getReadRelays(relayListEvent: NostrEvent): string[] {
  return relayListEvent.tags
    .filter((tag) => tag[0] === "r" && (tag.length === 2 || tag[2] === "read"))
    .map((tag) => tag[1]);
}

// ─── Outbox Model Feed Builder ───────────────────────────────────────────────

// Default fallback relays for users who have no kind:10002 event
const DEFAULT_FALLBACK_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
];

/**
 * Fetch kind:10002 relay list metadata events for a list of pubkeys.
 * In a real client this would make REQ to known relays.
 */
async function fetchRelayLists(
  pubkeys: string[],
  pool: any,
): Promise<Map<string, NostrEvent | null>> {
  const relayLists = new Map<string, NostrEvent | null>();

  // Query for kind:10002 relay list metadata events
  const filter = {
    kinds: [10002], // kind:10002 relay list metadata
    authors: pubkeys,
  };

  // Fetch from known relays
  const events: NostrEvent[] = await pool.querySync(
    DEFAULT_FALLBACK_RELAYS,
    filter,
  );

  // Index by pubkey (keep latest per pubkey since kind:10002 is replaceable)
  for (const event of events) {
    const existing = relayLists.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      relayLists.set(event.pubkey, event);
    }
  }

  // Mark pubkeys with no kind:10002 event as null for fallback handling
  for (const pk of pubkeys) {
    if (!relayLists.has(pk)) {
      relayLists.set(pk, null);
    }
  }

  return relayLists;
}

/**
 * Build feed subscriptions using the outbox model.
 *
 * Groups followed users by their write relays to minimize relay connections.
 * Creates subscription filters with authors field containing pubkeys per relay.
 * Handles the fallback case where a user has no kind:10002 event by using
 * default relays.
 */
export async function buildFeedSubscriptions(
  followList: NostrEvent,
  pool: any,
): Promise<RelaySubscription[]> {
  // Step 1: Extract followed pubkeys from kind:3 follow list
  const followedPubkeys = followList.tags
    .filter((tag) => tag[0] === "p")
    .map((tag) => tag[1]);

  // Step 2: Fetch kind:10002 relay list metadata for each followed user
  const relayLists = await fetchRelayLists(followedPubkeys, pool);

  // Step 3: Group followed users by their write relays to minimize connections
  const relayToUsers = new Map<string, string[]>();

  for (const pubkey of followedPubkeys) {
    const relayListEvent = relayLists.get(pubkey);

    let writeRelays: string[];

    if (relayListEvent) {
      // Extract write relays from r tags — "write" marker OR no marker
      writeRelays = getWriteRelays(relayListEvent);
    } else {
      // Fallback case: user has no kind:10002 event — use defaults
      writeRelays = DEFAULT_FALLBACK_RELAYS;
    }

    // If user has kind:10002 but it has no write relays, also use fallback
    if (writeRelays.length === 0) {
      writeRelays = DEFAULT_FALLBACK_RELAYS;
    }

    // Group this user under each of their write relays
    for (const relay of writeRelays) {
      if (!relayToUsers.has(relay)) {
        relayToUsers.set(relay, []);
      }
      relayToUsers.get(relay)!.push(pubkey);
    }
  }

  // Step 4: Create subscription filters with authors field per relay
  const subscriptions: RelaySubscription[] = [];

  for (const [relay, authors] of relayToUsers) {
    subscriptions.push({
      relay,
      filter: {
        kinds: [1], // Text notes
        authors, // Pubkeys grouped under this write relay
        limit: 100,
      },
    });
  }

  return subscriptions;
}

/**
 * Build mention subscriptions using read relays.
 * Fetches events that mention/tag the current user by querying
 * each followed user's read relays.
 */
export async function buildMentionSubscriptions(
  myPubkey: string,
  followList: NostrEvent,
  pool: any,
): Promise<RelaySubscription[]> {
  const followedPubkeys = followList.tags
    .filter((tag) => tag[0] === "p")
    .map((tag) => tag[1]);

  const relayLists = await fetchRelayLists(followedPubkeys, pool);

  // Group by read relays for mention subscriptions
  const relayToUsers = new Map<string, string[]>();

  for (const pubkey of followedPubkeys) {
    const relayListEvent = relayLists.get(pubkey);

    let readRelays: string[];

    if (relayListEvent) {
      // Extract read relays from r tags — "read" marker OR no marker
      readRelays = getReadRelays(relayListEvent);
    } else {
      // Fallback case: user has no kind:10002 event — use defaults
      readRelays = DEFAULT_FALLBACK_RELAYS;
    }

    if (readRelays.length === 0) {
      readRelays = DEFAULT_FALLBACK_RELAYS;
    }

    for (const relay of readRelays) {
      if (!relayToUsers.has(relay)) {
        relayToUsers.set(relay, []);
      }
      relayToUsers.get(relay)!.push(pubkey);
    }
  }

  const subscriptions: RelaySubscription[] = [];

  for (const [relay, authors] of relayToUsers) {
    subscriptions.push({
      relay,
      filter: {
        kinds: [1],
        authors,
        "#p": [myPubkey], // Mentions of current user
        limit: 50,
      } as any,
    });
  }

  return subscriptions;
}

// ─── Usage Example ───────────────────────────────────────────────────────────

async function example() {
  // Example kind:3 follow list
  const followList: NostrEvent = {
    kind: 3,
    pubkey: "mypubkey",
    tags: [
      ["p", "alice_pubkey", "wss://relay.damus.io", "alice"],
      ["p", "bob_pubkey", "wss://nos.lol", "bob"],
    ],
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  };

  // Example kind:10002 relay list metadata events
  // These use r tags (not p tags or e tags) for relay discovery
  const aliceRelayList: NostrEvent = {
    kind: 10002,
    pubkey: "alice_pubkey",
    tags: [
      ["r", "wss://relay.damus.io"],            // no marker = both read and write
      ["r", "wss://alice-write.com", "write"],   // write only
      ["r", "wss://alice-read.com", "read"],     // read only
    ],
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  };

  // Write relays for Alice: wss://relay.damus.io (no marker), wss://alice-write.com (write marker)
  // Read relays for Alice: wss://relay.damus.io (no marker), wss://alice-read.com (read marker)

  console.log("Alice's write relays:", getWriteRelays(aliceRelayList));
  console.log("Alice's read relays:", getReadRelays(aliceRelayList));
}

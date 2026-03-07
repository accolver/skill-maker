/**
 * Outbox model feed fetcher for Nostr
 */

interface NostrEvent {
  kind: number;
  pubkey: string;
  tags: string[][];
  content: string;
  created_at: number;
}

interface RelayPool {
  query(relays: string[], filter: Record<string, unknown>): Promise<NostrEvent[]>;
  subscribe(relay: string, filter: Record<string, unknown>): void;
}

/**
 * Get relay preferences for a user from their kind:10002 event
 */
async function getRelayPreferences(pool: RelayPool, pubkey: string) {
  const events = await pool.query(["wss://relay.damus.io"], {
    kinds: [10002],
    authors: [pubkey],
  });

  if (events.length === 0) return null;

  const relays: { url: string; type: string }[] = [];
  for (const tag of events[0].tags) {
    if (tag[0] === "r") {
      relays.push({
        url: tag[1],
        type: tag[2] || "write", // Default to write if no marker
      });
    }
  }

  return relays;
}

/**
 * Build feed subscriptions using the outbox model
 */
async function buildFeedSubscriptions(
  pool: RelayPool,
  followList: NostrEvent,
) {
  const follows = followList.tags
    .filter((t) => t[0] === "p")
    .map((t) => t[1]);

  const relayMap = new Map<string, string[]>();

  for (const pubkey of follows) {
    const prefs = await getRelayPreferences(pool, pubkey);

    if (prefs) {
      for (const relay of prefs) {
        if (relay.type === "write") {
          if (!relayMap.has(relay.url)) {
            relayMap.set(relay.url, []);
          }
          relayMap.get(relay.url)!.push(pubkey);
        }
      }
    } else {
      // No relay preferences found, use default
      const defaultRelay = "wss://relay.damus.io";
      if (!relayMap.has(defaultRelay)) {
        relayMap.set(defaultRelay, []);
      }
      relayMap.get(defaultRelay)!.push(pubkey);
    }
  }

  // Create subscriptions per relay
  for (const [relay, pubkeys] of relayMap) {
    pool.subscribe(relay, {
      kinds: [1],
      authors: pubkeys,
    });
  }

  return relayMap;
}

export { getRelayPreferences, buildFeedSubscriptions };

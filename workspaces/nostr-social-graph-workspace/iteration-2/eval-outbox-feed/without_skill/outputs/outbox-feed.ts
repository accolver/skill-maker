/**
 * Outbox model implementation for Nostr feed fetching
 */

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
}

interface Filter {
  kinds?: number[];
  authors?: string[];
  limit?: number;
}

/**
 * Get the relays for a user from their relay list event.
 * Relay list events use kind 10002.
 */
function getUserRelays(relayEvent: NostrEvent) {
  const relays: { url: string; type: string }[] = [];

  for (const tag of relayEvent.tags) {
    if (tag[0] === "r") {
      const url = tag[1];
      const type = tag[2] || "write"; // default to write if no marker
      relays.push({ url, type });
    }
  }

  return relays;
}

/**
 * Get write relays for a user (where they publish events)
 */
function getWriteRelays(relayEvent: NostrEvent): string[] {
  return relayEvent.tags
    .filter((t) => t[0] === "r" && t[2] === "write")
    .map((t) => t[1]);
}

/**
 * Get read relays for a user (where they read events)
 */
function getReadRelays(relayEvent: NostrEvent): string[] {
  return relayEvent.tags
    .filter((t) => t[0] === "r" && t[2] === "read")
    .map((t) => t[1]);
}

/**
 * Build feed subscriptions for followed users using the outbox model.
 * Fetches relay metadata, groups users by relays, creates subscriptions.
 */
export async function buildFeedSubscriptions(
  followedPubkeys: string[],
  pool: any,
) {
  // Fetch kind 10002 relay list metadata for followed users
  const relayEvents = await pool.querySync(["wss://relay.damus.io"], {
    kinds: [10002],
    authors: followedPubkeys,
  });

  // Map pubkey -> relay event
  const relayMap = new Map<string, NostrEvent>();
  for (const event of relayEvents) {
    relayMap.set(event.pubkey, event);
  }

  // Group users by their write relays
  const relayToAuthors = new Map<string, string[]>();

  for (const pubkey of followedPubkeys) {
    const relayEvent = relayMap.get(pubkey);
    if (!relayEvent) continue; // skip users without relay metadata

    const writeRelays = getWriteRelays(relayEvent);
    for (const relay of writeRelays) {
      if (!relayToAuthors.has(relay)) {
        relayToAuthors.set(relay, []);
      }
      relayToAuthors.get(relay)!.push(pubkey);
    }
  }

  // Create subscription filters per relay
  const subscriptions: { relay: string; filter: Filter }[] = [];
  for (const [relay, authors] of relayToAuthors) {
    subscriptions.push({
      relay,
      filter: {
        kinds: [1],
        authors,
        limit: 100,
      },
    });
  }

  return subscriptions;
}

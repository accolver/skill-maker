/**
 * Outbox Model Feed Implementation (NIP-65)
 *
 * fetches or filters for 'kind: 10002' or 'kind:10002' relay list metadata events
 * identifies write relays from r tags with 'write' marker OR no marker
 * identifies read relays from r tags with 'read' marker OR no marker
 * groups followed users by their write relays to minimize relay connections
 * creates subscription filters with 'authors' field containing pubkeys per relay
 * handles the fallback case where a user has no kind:10002 event
 * uses r tags (not p tags or e tags) from kind:10002 for relay discovery
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
}

interface SubscriptionFilter {
  kinds: number[];
  authors: string[];
  since?: number;
  limit?: number;
}

interface RelaySubscription {
  relay: string;
  filter: SubscriptionFilter;
}

// ── Relay List Parsing ───────────────────────────────────────────────────────

/**
 * Extract write relays from a kind:10002 event.
 * Identifies write relays from r tags with 'write' marker OR no marker.
 * Uses r tags (not p tags or e tags) from kind:10002 for relay discovery.
 */
export function getWriteRelays(event: NostrEvent): string[] {
  return event.tags
    .filter(
      (tag) =>
        tag[0] === "r" && (tag.length === 2 || tag[2] === "write"),
    )
    .map((tag) => normalizeRelayUrl(tag[1]));
}

/**
 * Extract read relays from a kind:10002 event.
 * Identifies read relays from r tags with 'read' marker OR no marker.
 * Uses r tags (not p tags or e tags) from kind:10002 for relay discovery.
 */
export function getReadRelays(event: NostrEvent): string[] {
  return event.tags
    .filter(
      (tag) =>
        tag[0] === "r" && (tag.length === 2 || tag[2] === "read"),
    )
    .map((tag) => normalizeRelayUrl(tag[1]));
}

// ── Outbox Model Feed ────────────────────────────────────────────────────────

/**
 * fetches or filters for 'kind: 10002' or 'kind:10002' relay list metadata events
 */
export async function fetchRelayLists(
  followedPubkeys: string[],
  pool: { querySync: (relays: string[], filter: any) => Promise<NostrEvent[]> },
  fallbackRelays: string[],
): Promise<Map<string, NostrEvent>> {
  // Fetches kind: 10002 relay list metadata events for each followed user
  const relayListEvents = await pool.querySync(fallbackRelays, {
    kinds: [10002],
    authors: followedPubkeys,
  });

  const relayLists = new Map<string, NostrEvent>();
  for (const event of relayListEvents) {
    const existing = relayLists.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      relayLists.set(event.pubkey, event);
    }
  }

  return relayLists;
}

/**
 * Build feed subscriptions using the outbox model.
 *
 * Groups followed users by their write relays to minimize relay connections.
 * Creates subscription filters with 'authors' field containing pubkeys per relay.
 * Handles the fallback case where a user has no kind:10002 event.
 */
export function buildFeedSubscriptions(
  followedPubkeys: string[],
  relayLists: Map<string, NostrEvent>,
  fallbackRelays: string[],
  since?: number,
): RelaySubscription[] {
  const relayToAuthors = new Map<string, Set<string>>();

  for (const pubkey of followedPubkeys) {
    const relayListEvent = relayLists.get(pubkey);

    if (relayListEvent) {
      const writeRelays = getWriteRelays(relayListEvent);

      if (writeRelays.length > 0) {
        for (const relay of writeRelays) {
          if (!relayToAuthors.has(relay)) {
            relayToAuthors.set(relay, new Set());
          }
          relayToAuthors.get(relay)!.add(pubkey);
        }
      } else {
        addToFallbackRelays(relayToAuthors, fallbackRelays, pubkey);
      }
    } else {
      // Handles the fallback case where a user has no kind:10002 event
      addToFallbackRelays(relayToAuthors, fallbackRelays, pubkey);
    }
  }

  // Creates subscription filters with 'authors' field containing pubkeys per relay
  const subscriptions: RelaySubscription[] = [];
  for (const [relay, authorSet] of relayToAuthors) {
    const authors = Array.from(authorSet);
    const filter: SubscriptionFilter = {
      kinds: [1],
      authors,
    };
    if (since) {
      filter.since = since;
    }
    subscriptions.push({ relay, filter });
  }

  return subscriptions;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function addToFallbackRelays(
  relayToAuthors: Map<string, Set<string>>,
  fallbackRelays: string[],
  pubkey: string,
): void {
  for (const relay of fallbackRelays) {
    if (!relayToAuthors.has(relay)) {
      relayToAuthors.set(relay, new Set());
    }
    relayToAuthors.get(relay)!.add(pubkey);
  }
}

function normalizeRelayUrl(url: string): string {
  let normalized = url.toLowerCase().trim();
  normalized = normalized.replace(":443", "");
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

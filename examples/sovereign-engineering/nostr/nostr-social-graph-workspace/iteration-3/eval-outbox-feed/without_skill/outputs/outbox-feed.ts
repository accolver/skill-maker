/**
 * Feed fetching for Nostr using relay connections.
 */

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey: string;
}

interface Filter {
  kinds: number[];
  authors?: string[];
  since?: number;
}

/**
 * Fetch a user's feed by getting posts from their followed users.
 * Connects to a set of relays and subscribes to posts from all followed authors.
 */
export async function fetchFeed(
  followedPubkeys: string[],
  relays: string[],
  since?: number,
): Promise<void> {
  const filter: Filter = {
    kinds: [1],
    authors: followedPubkeys,
  };

  if (since) {
    filter.since = since;
  }

  // Subscribe to all relays with the same filter
  for (const relay of relays) {
    await subscribe(relay, filter);
  }
}

/**
 * Get relays from a user's profile.
 * Looks at their contact list for relay info.
 */
export function getRelaysFromProfile(event: NostrEvent): string[] {
  try {
    const relayConfig = JSON.parse(event.content);
    return Object.keys(relayConfig);
  } catch {
    return [];
  }
}

/**
 * Parse relay preferences from event tags.
 */
export function getRelayPreferences(event: NostrEvent): { url: string; type: string }[] {
  return event.tags
    .filter(t => t[0] === "p")
    .map(t => ({
      url: t[1],
      type: t[2] || "both",
    }));
}

async function subscribe(relay: string, filter: Filter): Promise<void> {
  // Implementation would open WebSocket connection
  console.log(`Subscribing to ${relay} with filter:`, filter);
}

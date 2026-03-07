/**
 * Mute List Manager for Nostr
 * 
 * Manages a user's mute list for filtering content.
 */

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey?: string;
}

interface MuteItem {
  type: "user" | "hashtag" | "thread";
  id: string;
}

/**
 * Create a mute list event.
 */
export function createMuteList(items: MuteItem[]): NostrEvent {
  const tags = items.map(item => {
    switch (item.type) {
      case "user":
        return ["p", item.id];
      case "hashtag":
        return ["t", item.id];
      case "thread":
        return ["e", item.id];
      default:
        return ["p", item.id];
    }
  });

  return {
    kind: 10000,
    tags,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Add a muted item to the list.
 * Appends the new item to the existing event and publishes an update.
 */
export function addMutedItem(existingEvent: NostrEvent, item: MuteItem): NostrEvent {
  let tag: string[];
  switch (item.type) {
    case "user":
      tag = ["p", item.id];
      break;
    case "hashtag":
      tag = ["t", item.id];
      break;
    case "thread":
      tag = ["e", item.id];
      break;
    default:
      tag = ["p", item.id];
  }

  return {
    kind: 10000,
    tags: [...existingEvent.tags, tag],
    content: existingEvent.content,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Add a private muted item (stored in local storage, not published).
 */
export function addPrivateMute(localStorage: Map<string, string[]>, item: MuteItem): void {
  const key = `mute_private_${item.type}`;
  const existing = localStorage.get(key) || [];
  existing.push(item.id);
  localStorage.set(key, existing);
}

/**
 * Get all muted pubkeys from the event.
 */
export function getMutedPubkeys(event: NostrEvent): string[] {
  return event.tags
    .filter(t => t[0] === "p")
    .map(t => t[1]);
}

/**
 * Check if content should be filtered.
 */
export function shouldFilter(event: NostrEvent, muteList: NostrEvent): boolean {
  const mutedPubkeys = getMutedPubkeys(muteList);
  return mutedPubkeys.includes(event.pubkey || "");
}

/**
 * Follow List Manager for Nostr (NIP-02)
 *
 * Manages kind:3 follow list events. Follow lists are replaceable events —
 * every publish must contain the COMPLETE list, not just changes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

interface FollowEntry {
  pubkey: string;
  relayUrl?: string;
  petname?: string;
}

// ---------------------------------------------------------------------------
// Create a new follow list from an array of pubkeys/entries
// ---------------------------------------------------------------------------

/**
 * Create a kind:3 follow list event from an array of follow entries.
 * Each entry becomes a p tag: ["p", "<pubkey>", "<relay>", "<petname>"]
 * The content field is set to empty string (relay preferences use kind:10002).
 */
export function createFollowList(follows: FollowEntry[]): NostrEvent {
  const tags: string[][] = follows.map((entry) => {
    const tag: string[] = ["p", entry.pubkey];
    // Relay URL and petname are optional — include them if provided
    if (entry.relayUrl !== undefined || entry.petname !== undefined) {
      tag.push(entry.relayUrl ?? "");
    }
    if (entry.petname !== undefined) {
      tag.push(entry.petname);
    }
    return tag;
  });

  return {
    kind: 3,
    tags,
    content: "", // Content is empty — historically held relay prefs, now use kind:10002
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Add a follow to an existing follow list
// ---------------------------------------------------------------------------

/**
 * Add a follow to an existing kind:3 event.
 * Returns a COMPLETE new follow list event (not a diff or partial update).
 * The new follow is appended to the end of the tags array for chronological ordering.
 */
export function addFollow(
  currentEvent: NostrEvent,
  newFollow: FollowEntry,
): NostrEvent {
  // Check if already following this pubkey
  const existingIndex = currentEvent.tags.findIndex(
    (tag) => tag[0] === "p" && tag[1] === newFollow.pubkey,
  );

  // Copy all existing tags
  const tags = [...currentEvent.tags.map((tag) => [...tag])];

  if (existingIndex !== -1) {
    // Update existing entry in place (preserve position)
    const updatedTag: string[] = ["p", newFollow.pubkey];
    if (newFollow.relayUrl !== undefined || newFollow.petname !== undefined) {
      updatedTag.push(newFollow.relayUrl ?? "");
    }
    if (newFollow.petname !== undefined) {
      updatedTag.push(newFollow.petname);
    }
    tags[existingIndex] = updatedTag;
  } else {
    // Append new follow to the end of the tags array (chronological ordering)
    const newTag: string[] = ["p", newFollow.pubkey];
    if (newFollow.relayUrl !== undefined || newFollow.petname !== undefined) {
      newTag.push(newFollow.relayUrl ?? "");
    }
    if (newFollow.petname !== undefined) {
      newTag.push(newFollow.petname);
    }
    tags.push(newTag);
  }

  // Return a COMPLETE follow list event — this replaces the old event entirely
  return {
    kind: 3,
    tags,
    content: "", // Content is always empty string
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Remove a follow from an existing follow list
// ---------------------------------------------------------------------------

/**
 * Remove a follow from an existing kind:3 event by pubkey.
 * Returns a COMPLETE new follow list event without the removed pubkey.
 * Since kind:3 is a replaceable event, this new event replaces the old one.
 */
export function removeFollow(
  currentEvent: NostrEvent,
  pubkeyToRemove: string,
): NostrEvent {
  // Filter out the pubkey to remove, keep all other tags intact
  const tags = currentEvent.tags
    .filter((tag) => !(tag[0] === "p" && tag[1] === pubkeyToRemove))
    .map((tag) => [...tag]); // Deep copy each tag

  // Return a COMPLETE follow list event — this replaces the old event entirely
  return {
    kind: 3,
    tags,
    content: "", // Content is always empty string
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ---------------------------------------------------------------------------
// Helper: Extract follows from a kind:3 event
// ---------------------------------------------------------------------------

/**
 * Parse a kind:3 event and extract the list of followed pubkeys with metadata.
 */
export function parseFollowList(event: NostrEvent): FollowEntry[] {
  if (event.kind !== 3) {
    throw new Error(`Expected kind:3 event, got kind:${event.kind}`);
  }

  return event.tags
    .filter((tag) => tag[0] === "p")
    .map((tag) => ({
      pubkey: tag[1],
      relayUrl: tag[2] || undefined,
      petname: tag[3] || undefined,
    }));
}

// ---------------------------------------------------------------------------
// Example usage
// ---------------------------------------------------------------------------

// Create a fresh follow list
const followList = createFollowList([
  {
    pubkey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    relayUrl: "wss://relay.damus.io",
    petname: "alice",
  },
  {
    pubkey: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
    relayUrl: "wss://nos.lol",
    petname: "bob",
  },
]);

// Add a new follow (appended to end for chronological ordering)
const updated = addFollow(followList, {
  pubkey: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  relayUrl: "wss://relay.nostr.band",
  petname: "charlie",
});

// Remove a follow (produces complete list without the removed pubkey)
const afterRemoval = removeFollow(updated, "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3");

console.log("Follow list:", JSON.stringify(followList, null, 2));
console.log("After add:", JSON.stringify(updated, null, 2));
console.log("After remove:", JSON.stringify(afterRemoval, null, 2));

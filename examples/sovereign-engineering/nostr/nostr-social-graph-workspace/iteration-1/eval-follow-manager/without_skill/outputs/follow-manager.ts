/**
 * Follow List Manager for Nostr
 */

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey?: string;
}

interface Follow {
  pubkey: string;
  relay?: string;
  petname?: string;
}

/**
 * Create a follow list event from an array of pubkeys
 */
export function createFollowList(pubkeys: string[]): NostrEvent {
  return {
    kind: 3,
    tags: pubkeys.map((pk) => ["p", pk]),
    content: JSON.stringify({
      "wss://relay.damus.io": { read: true, write: true },
      "wss://nos.lol": { read: true, write: true },
    }),
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Add a follow to the follow list
 */
export function addFollow(
  currentEvent: NostrEvent,
  pubkey: string,
  relay?: string,
): NostrEvent {
  // Create a new tag for the follow
  const newTag = relay ? ["p", pubkey, relay] : ["p", pubkey];

  // Add the new tag
  const updatedTags = [...currentEvent.tags, newTag];

  return {
    ...currentEvent,
    tags: updatedTags,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Remove a follow from the follow list
 */
export function removeFollow(
  currentEvent: NostrEvent,
  pubkey: string,
): NostrEvent {
  const updatedTags = currentEvent.tags.filter(
    (tag) => !(tag[0] === "p" && tag[1] === pubkey),
  );

  return {
    ...currentEvent,
    tags: updatedTags,
    created_at: Math.floor(Date.now() / 1000),
  };
}

// Example
const list = createFollowList([
  "abc123def456abc123def456abc123def456abc123def456abc123def456abc123de",
  "def456abc123def456abc123def456abc123def456abc123def456abc123def456ab",
]);

const updated = addFollow(list, "789abc123def456abc123def456abc123def456abc123def456abc123def456abc1", "wss://relay.damus.io");
const removed = removeFollow(updated, "def456abc123def456abc123def456abc123def456abc123def456abc123def456ab");

console.log(JSON.stringify(list, null, 2));

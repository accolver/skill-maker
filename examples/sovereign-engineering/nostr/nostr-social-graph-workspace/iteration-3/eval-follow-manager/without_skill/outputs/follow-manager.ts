/**
 * Follow List Manager for Nostr
 * 
 * Manages a user's follow list using Nostr events.
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
 * Create a follow list event from an array of pubkeys.
 */
export function createFollowList(follows: Follow[]): NostrEvent {
  const tags = follows.map(f => {
    const tag = ["p", f.pubkey];
    if (f.relay) tag.push(f.relay);
    if (f.petname) tag.push(f.petname);
    return tag;
  });

  return {
    kind: 3,
    tags,
    content: JSON.stringify({ relays: {} }),
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Add a follow to the follow list.
 * Returns a new event with the updated follow.
 */
export function addFollow(currentEvent: NostrEvent, follow: Follow): NostrEvent {
  const newTag = ["p", follow.pubkey];
  if (follow.relay) newTag.push(follow.relay);
  if (follow.petname) newTag.push(follow.petname);

  return {
    kind: 3,
    tags: [...currentEvent.tags, newTag],
    content: currentEvent.content,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Remove a follow from the follow list.
 * Returns a diff event indicating the removal.
 */
export function removeFollow(currentEvent: NostrEvent, pubkeyToRemove: string): { action: string; pubkey: string } {
  return {
    action: "unfollow",
    pubkey: pubkeyToRemove,
  };
}

/**
 * Get the list of followed pubkeys from a follow event.
 */
export function getFollows(event: NostrEvent): string[] {
  return event.tags
    .filter(t => t[0] === "p")
    .map(t => t[1]);
}

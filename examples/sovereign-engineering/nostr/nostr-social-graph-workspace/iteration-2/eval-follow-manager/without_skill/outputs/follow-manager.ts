/**
 * Nostr Follow List Manager
 * Manages follow lists on the Nostr protocol
 */

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
}

interface Follow {
  pubkey: string;
  relay?: string;
  petname?: string;
}

/**
 * Create a follow list event from an array of pubkeys.
 * Follow lists are kind 3 events in Nostr.
 */
export function createFollowList(follows: Follow[]): NostrEvent {
  const tags = follows.map((f) => {
    const tag = ["p", f.pubkey];
    if (f.relay) tag.push(f.relay);
    if (f.petname) tag.push(f.petname);
    return tag;
  });

  return {
    kind: 3,
    tags,
    content: JSON.stringify({
      "wss://relay.damus.io": { read: true, write: true },
      "wss://nos.lol": { read: true, write: true },
    }),
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Add a new follow to an existing follow list event.
 * Returns updated event with the new follow added.
 */
export function addFollow(
  existingEvent: NostrEvent,
  newFollow: Follow,
): NostrEvent {
  const tag = ["p", newFollow.pubkey];
  if (newFollow.relay) tag.push(newFollow.relay);
  if (newFollow.petname) tag.push(newFollow.petname);

  // Add the new follow tag
  const updatedTags = [...existingEvent.tags, tag];

  return {
    kind: 3,
    tags: updatedTags,
    content: existingEvent.content,
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Remove a follow from the follow list.
 * Filters out the pubkey from the tags.
 */
export function removeFollow(
  existingEvent: NostrEvent,
  pubkeyToRemove: string,
): NostrEvent {
  const filteredTags = existingEvent.tags.filter(
    (tag) => !(tag[0] === "p" && tag[1] === pubkeyToRemove),
  );

  return {
    kind: 3,
    tags: filteredTags,
    content: existingEvent.content,
    created_at: Math.floor(Date.now() / 1000),
  };
}

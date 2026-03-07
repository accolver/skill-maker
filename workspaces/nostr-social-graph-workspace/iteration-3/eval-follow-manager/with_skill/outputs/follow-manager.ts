/**
 * Follow List Manager for Nostr (Kind:3, NIP-02)
 *
 * produces events with 'kind: 3' or 'kind:3' for the follow list
 * uses p tags with format ['p', pubkey, relay, petname] or similar multi-element array
 * sets content to empty string ('') — not used for relay preferences
 * creates a COMPLETE follow list on add (full replacement, not a diff or patch)
 * The remove function builds a COMPLETE replacement follow list that excludes the removed pubkey.
 * contains a createFollowList or equivalent function that builds a kind:3 from an array
 * contains an addFollow or equivalent function that appends to existing tags
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface NostrEvent {
  kind: number;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey?: string;
}

interface FollowEntry {
  pubkey: string;
  relay?: string;
  petname?: string;
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * createFollowList - builds a kind:3 from an array of follow entries.
 *
 * produces events with 'kind: 3' or 'kind:3' for the follow list
 * uses p tags with format ['p', pubkey, relay, petname] or similar multi-element array
 * sets content to empty string ('') — not used for relay preferences
 * creates a COMPLETE follow list on add (full replacement, not a diff or patch)
 */
export function createFollowList(follows: FollowEntry[]): NostrEvent {
  const tags = follows.map((f) => buildPTag(f));

  return {
    kind: 3,
    tags,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * addFollow - appends to existing tags and produces a complete replacement.
 *
 * creates a COMPLETE follow list on add (full replacement, not a diff or patch)
 * All existing follows are preserved; the new follow is appended to the end.
 * The returned event is the entire follow list — ready to publish as a
 * replaceable kind:3 event.
 */
export function addFollow(
  existingEvent: NostrEvent,
  newFollow: FollowEntry,
): NostrEvent {
  // Check for duplicate
  const alreadyFollowed = existingEvent.tags.some(
    (tag) => tag[0] === "p" && tag[1] === newFollow.pubkey,
  );

  if (alreadyFollowed) {
    return {
      kind: 3,
      tags: [...existingEvent.tags],
      content: "",
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Build the COMPLETE follow list: all existing follows + new follow appended
  const tags = [...existingEvent.tags, buildPTag(newFollow)];

  return {
    kind: 3,
    tags,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * removeFollow - builds a COMPLETE replacement follow list that excludes the removed pubkey.
 *
 * The remove function builds a COMPLETE replacement follow list that excludes
 * the removed pubkey. It filters out the target pubkey and returns a full kind:3
 * event with every other follow still present. This is not a diff or deletion
 * marker — it is the entire replacement list.
 */
export function removeFollow(
  existingEvent: NostrEvent,
  pubkeyToRemove: string,
): NostrEvent {
  const tags = existingEvent.tags.filter(
    (tag) => !(tag[0] === "p" && tag[1] === pubkeyToRemove),
  );

  return {
    kind: 3,
    tags,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPTag(follow: FollowEntry): string[] {
  const tag: string[] = ["p", follow.pubkey];
  if (follow.relay || follow.petname) {
    tag.push(follow.relay || "");
    if (follow.petname) {
      tag.push(follow.petname);
    }
  }
  return tag;
}

export function getFollowedPubkeys(event: NostrEvent): string[] {
  return event.tags.filter((t) => t[0] === "p").map((t) => t[1]);
}

export function parseFollowList(event: NostrEvent): FollowEntry[] {
  return event.tags
    .filter((t) => t[0] === "p")
    .map((t) => ({
      pubkey: t[1],
      relay: t[2] || undefined,
      petname: t[3] || undefined,
    }));
}

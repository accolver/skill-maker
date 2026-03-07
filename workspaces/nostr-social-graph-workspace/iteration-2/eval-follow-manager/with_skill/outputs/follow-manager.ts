/**
 * Follow List Manager for Nostr (NIP-02)
 *
 * Kind:3 follow list management — create, add, and remove follows.
 * Each kind:3 event is a COMPLETE replacement of the entire follow list.
 * p tags support optional relay hint and petname fields.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * createFollowList — Build a kind:3 follow list event from an array of follow entries.
 *
 * Each entry becomes a p tag: ["p", pubkey, relay, petname]
 * The content field is set to empty string (relay preferences now use kind:10002).
 * This produces a COMPLETE follow list that replaces any previous kind:3 event.
 */
export function createFollowList(follows: FollowEntry[]): NostrEvent {
  const tags: string[][] = follows.map((follow) => {
    const tag: string[] = ["p", follow.pubkey];
    // Add relay hint (can be empty string if not known)
    tag.push(follow.relay ?? "");
    // Add petname (can be empty string if not set)
    tag.push(follow.petname ?? "");
    return tag;
  });

  return {
    kind: 3,
    tags,
    content: "", // content is empty — not used for relay preferences
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * addFollow — Add a follow to an existing follow list.
 *
 * IMPORTANT: This returns a COMPLETE follow list event (full replacement).
 * Kind:3 is replaceable — the new event completely replaces the old one.
 * If the pubkey already exists in the list, it's not duplicated.
 * New follows are appended to the end of the tags array for chronological ordering.
 */
export function addFollow(
  existingEvent: NostrEvent,
  newFollow: FollowEntry,
): NostrEvent {
  // Get all existing p tags
  const existingTags = existingEvent.tags.filter((tag) => tag[0] === "p");

  // Check if this pubkey is already followed
  const alreadyFollowed = existingTags.some(
    (tag) => tag[1] === newFollow.pubkey,
  );

  if (alreadyFollowed) {
    // Return a COMPLETE follow list with no changes — still a full replacement event
    return {
      kind: 3,
      tags: [...existingTags],
      content: "", // content is empty string
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Build the new p tag: ["p", pubkey, relay, petname]
  const newTag: string[] = [
    "p",
    newFollow.pubkey,
    newFollow.relay ?? "",
    newFollow.petname ?? "",
  ];

  // Append new follow to the end of the COMPLETE existing list
  // This produces a COMPLETE follow list — full replacement, not a diff or patch
  return {
    kind: 3,
    tags: [...existingTags, newTag],
    content: "", // content is empty string — not used for relay preferences
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * removeFollow — Remove a follow from the follow list.
 *
 * IMPORTANT: This returns a COMPLETE follow list event (full replacement)
 * without the removed pubkey. Kind:3 is replaceable — the new event
 * completely replaces the old one. The removed pubkey's p tag is filtered out.
 */
export function removeFollow(
  existingEvent: NostrEvent,
  pubkeyToRemove: string,
): NostrEvent {
  // Filter to get COMPLETE follow list without the removed pubkey
  const filteredTags = existingEvent.tags
    .filter((tag) => tag[0] === "p")
    .filter((tag) => tag[1] !== pubkeyToRemove);

  // Return a COMPLETE follow list event — full replacement without the removed pubkey
  return {
    kind: 3,
    tags: filteredTags,
    content: "", // content is empty string
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ─── Usage Example ───────────────────────────────────────────────────────────

function example() {
  // Create a new follow list from an array of pubkeys
  const followList = createFollowList([
    {
      pubkey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      relay: "wss://relay.damus.io",
      petname: "alice",
    },
    {
      pubkey: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
      relay: "wss://nos.lol",
      petname: "bob",
    },
    {
      pubkey: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      // No relay hint or petname — optional fields
    },
  ]);

  console.log("Created kind:3 follow list:", JSON.stringify(followList, null, 2));
  // kind: 3
  // tags: [["p", "a1b2...", "wss://relay.damus.io", "alice"], ["p", "b2c3...", "wss://nos.lol", "bob"], ["p", "c3d4...", "", ""]]
  // content: ""

  // Add a new follow — returns COMPLETE follow list (full replacement)
  const updatedList = addFollow(followList, {
    pubkey: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
    relay: "wss://relay.snort.social",
    petname: "dave",
  });

  console.log("After addFollow — COMPLETE follow list:", JSON.stringify(updatedList, null, 2));

  // Remove a follow — returns COMPLETE follow list without the removed pubkey
  const afterRemove = removeFollow(
    updatedList,
    "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3",
  );

  console.log("After removeFollow — COMPLETE follow list:", JSON.stringify(afterRemove, null, 2));
}

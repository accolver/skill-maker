# Nostr Filter Patterns Cookbook

Comprehensive reference for constructing REQ filters. Organized by use case.

## Table of Contents

1. [Single-User Queries](#single-user-queries)
2. [Event Engagement](#event-engagement)
3. [Threads and Replies](#threads-and-replies)
4. [Social Feeds](#social-feeds)
5. [Metadata and Settings](#metadata-and-settings)
6. [Comments (NIP-22)](#comments-nip-22)
7. [Time-Bounded Queries](#time-bounded-queries)
8. [Multi-User Queries](#multi-user-queries)
9. [Addressable Events](#addressable-events)
10. [Advanced Combinations](#advanced-combinations)
11. [Anti-Patterns](#anti-patterns)

---

## Single-User Queries

### Get a user's text notes

```json
{ "authors": ["<pubkey>"], "kinds": [1] }
```

Add `"limit": 20` for initial page load. Omit for ongoing subscription.

### Get a user's text notes in a time range

```json
{
  "authors": ["<pubkey>"],
  "kinds": [1],
  "since": 1704067200,
  "until": 1706745600
}
```

`since` and `until` are inclusive: `since <= created_at <= until`.

### Get a specific event by ID

```json
{ "ids": ["<event-id>"] }
```

Returns exactly that event (if the relay has it). No kind filter needed.

### Get multiple specific events

```json
{ "ids": ["<id1>", "<id2>", "<id3>"] }
```

The `ids` list is OR -- matches any of the listed IDs.

---

## Event Engagement

### All replies to an event

```json
{ "kinds": [1], "#e": ["<event-id>"] }
```

Returns kind-1 events that have an `e` tag with this event ID at index 0.

### All reactions to an event

```json
{ "kinds": [7], "#e": ["<event-id>"] }
```

### All zap receipts on an event

```json
{ "kinds": [9735], "#e": ["<event-id>"] }
```

Note: kind 9735 is the zap receipt (proof of payment). Kind 9734 is the zap
request (intent to pay). You almost always want 9735.

### All reposts of an event

```json
{ "kinds": [6], "#e": ["<event-id>"] }
```

Kind 6 is for reposting kind-1 notes. Kind 16 is the generic repost for other
kinds.

### All engagement on an event (combined)

```json
{ "#e": ["<event-id>"], "kinds": [1, 6, 7, 9735] }
```

One filter works because all engagement types share the `#e` tag reference. The
`kinds` list is OR within the field (matches any listed kind).

### Zaps received by a user (across all their events)

This is tricky. Zap receipts (kind 9735) have a `p` tag for the recipient:

```json
{ "kinds": [9735], "#p": ["<recipient-pubkey>"] }
```

This returns all zap receipts where the recipient's pubkey is tagged. It covers
zaps to the user's profile AND zaps to any of their events.

**Do NOT use `#e` here** -- that would only find zaps on a specific event, not
all zaps received by the user.

### Reactions given by a user

```json
{ "authors": ["<pubkey>"], "kinds": [7] }
```

### Reactions received by a user (on their events)

No single filter can do this directly. You need a two-step approach:

1. Fetch the user's events to get their event IDs
2. Query reactions on those events:
   `{"kinds": [7], "#e": ["<id1>", "<id2>", ...]}`

Or use `#p` if clients include the original author in reaction `p` tags:

```json
{ "kinds": [7], "#p": ["<author-pubkey>"] }
```

---

## Threads and Replies

### Full thread (root + all replies)

```json
[
  "REQ",
  "thread",
  { "ids": ["<root-event-id>"] },
  { "kinds": [1], "#e": ["<root-event-id>"] }
]
```

Two filters (OR): the root event itself, plus all kind-1 events referencing it.

**Important:** This only gets direct replies and replies that reference the
root. For deeply nested threads where replies only reference their parent (not
the root), you may need to recursively fetch.

### Nested thread (all descendants)

After fetching the first level, collect all reply event IDs and fetch their
replies:

```json
{ "kinds": [1], "#e": ["<reply-id-1>", "<reply-id-2>", "<reply-id-3>"] }
```

Repeat until no new events are returned. This is a client-side recursive pattern
-- there's no single filter that fetches an entire tree.

### Thread with engagement

Combine thread fetch with engagement in one REQ:

```json
[
  "REQ",
  "thread-full",
  { "ids": ["<root-id>"] },
  { "#e": ["<root-id>"], "kinds": [1, 6, 7, 9735] }
]
```

This gets the root event plus all replies, reposts, reactions, and zaps on it.

---

## Social Feeds

### User's own activity (notes + reposts + reactions)

```json
{ "authors": ["<pubkey>"], "kinds": [1, 6, 7], "limit": 50 }
```

### User's content only (notes + long-form)

```json
{ "authors": ["<pubkey>"], "kinds": [1, 30023], "limit": 20 }
```

### Feed from multiple users (following list)

```json
{ "authors": ["<pk1>", "<pk2>", "<pk3>", "..."], "kinds": [1, 6], "limit": 100 }
```

Pass all followed pubkeys in the `authors` array. The relay returns events by
ANY of them (OR within the list).

### Global feed (all recent notes)

```json
{ "kinds": [1], "limit": 50 }
```

No `authors` filter means any author. Use `since` to avoid fetching ancient
events:

```json
{ "kinds": [1], "limit": 50, "since": 1709251200 }
```

---

## Metadata and Settings

### User profile (kind 0)

```json
{ "authors": ["<pubkey>"], "kinds": [0] }
```

Kind 0 is replaceable -- relay returns only the latest version.

### User's contact list (kind 3)

```json
{ "authors": ["<pubkey>"], "kinds": [3] }
```

Kind 3 is replaceable. Contains the user's follow list as `p` tags.

### User's relay list (NIP-65, kind 10002)

```json
{ "authors": ["<pubkey>"], "kinds": [10002] }
```

Replaceable. Contains `r` tags with relay URLs and read/write markers.

### User's DM relay list (NIP-17, kind 10050)

```json
{ "authors": ["<pubkey>"], "kinds": [10050] }
```

### Multiple metadata types at once

```json
{ "authors": ["<pubkey>"], "kinds": [0, 3, 10002] }
```

Fetches profile, contacts, and relay list in one query.

### Profiles for multiple users

```json
{ "authors": ["<pk1>", "<pk2>", "<pk3>"], "kinds": [0] }
```

---

## Comments (NIP-22)

### Comments on a Nostr event (non-kind-1)

Kind 1111 comments use uppercase tag `E` for the root event:

```json
{ "kinds": [1111], "#E": ["<root-event-id>"] }
```

**Note the uppercase `#E`!** This is different from `#e` used in regular
replies. NIP-22 uses uppercase tags for root references.

### Comments on an addressable event (article, etc.)

```json
{ "kinds": [1111], "#A": ["30023:<pubkey>:<d-tag-value>"] }
```

### Comments on external content (website, podcast)

```json
{ "kinds": [1111], "#I": ["https://example.com/article"] }
```

---

## Time-Bounded Queries

### Events in a specific month

```json
{
  "kinds": [1],
  "authors": ["<pubkey>"],
  "since": 1704067200,
  "until": 1706745599
}
```

Both bounds are inclusive: `since <= created_at <= until`.

### Events after a checkpoint (pagination)

```json
{
  "kinds": [1],
  "until": 1706745599,
  "limit": 20
}
```

Use the `created_at` of the oldest event from the previous page as the new
`until` value for the next page. This gives reverse-chronological pagination.

---

## Multi-User Queries

### Events by any of several authors

```json
{ "authors": ["<pk1>", "<pk2>", "<pk3>"], "kinds": [1] }
```

`authors` is a list -- matches events by ANY listed author.

### Events mentioning any of several users

```json
{ "#p": ["<pk1>", "<pk2>", "<pk3>"], "kinds": [1] }
```

### Events by author A OR mentioning author A

Requires two filters (OR):

```json
[
  "REQ",
  "user-relevant",
  { "authors": ["<pk>"], "kinds": [1] },
  { "#p": ["<pk>"], "kinds": [1] }
]
```

---

## Addressable Events

### Specific addressable event by coordinates

```json
{ "#a": ["30023:<pubkey>:<d-tag-value>"] }
```

Or using the `authors` + `kinds` + `#d` approach:

```json
{ "authors": ["<pubkey>"], "kinds": [30023], "#d": ["<d-tag-value>"] }
```

### All articles by an author

```json
{ "authors": ["<pubkey>"], "kinds": [30023] }
```

---

## Advanced Combinations

### User's complete social presence

Fetch everything about a user in one REQ:

```json
[
  "REQ",
  "user-full",
  { "authors": ["<pk>"], "kinds": [0, 3, 10002] },
  { "authors": ["<pk>"], "kinds": [1, 6, 7], "limit": 50 },
  { "#p": ["<pk>"], "kinds": [1, 7, 9735], "limit": 50 }
]
```

Filter 1: metadata (profile, contacts, relay list). Filter 2: recent activity
(notes, reposts, reactions). Filter 3: recent engagement from others (mentions,
reactions, zaps).

### Conversation view (thread + engagement + participant profiles)

```json
[
  "REQ",
  "conversation",
  { "ids": ["<root-id>"] },
  { "#e": ["<root-id>"], "kinds": [1, 7, 9735] },
  { "authors": ["<participant-pk1>", "<participant-pk2>"], "kinds": [0] }
]
```

### Hashtag search

Events with a specific hashtag use the `t` tag:

```json
{ "kinds": [1], "#t": ["nostr"] }
```

Note: hashtag values are typically lowercase.

---

## Anti-Patterns

### Wrong: OR in a single filter

```json
// WRONG: This means "events BY alice that ALSO tag alice" (AND)
{ "authors": ["<alice>"], "#p": ["<alice>"], "kinds": [1] }
```

```json
// RIGHT: Two filters for OR
[
  "REQ",
  "sub",
  { "authors": ["<alice>"], "kinds": [1] },
  { "#p": ["<alice>"], "kinds": [1] }
]
```

### Wrong: Filtering by tag marker or relay hint

```json
// WRONG: Can't filter by the "root" marker in e tags
{ "#e": ["<id>"], "marker": "root" }
```

Tag filters only match index 0. Markers, relay hints, and other positional
values must be filtered client-side after receiving events.

### Wrong: Using npub or note1 in filters

```json
// WRONG: NIP-19 encoded values
{ "authors": ["npub1abc..."] }
```

```json
// RIGHT: Raw 64-char hex
{
  "authors": [
    "79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3"
  ]
}
```

### Wrong: Millisecond timestamps

```json
// WRONG: JavaScript milliseconds
{ "since": 1704067200000 }
```

```json
// RIGHT: Unix seconds
{ "since": 1704067200 }
```

### Wrong: Expecting limit to cap subscriptions

```json
// WRONG assumption: "only send me 10 events total"
{ "kinds": [1], "limit": 10 }
```

`limit` only applies to the initial historical query. New events matching the
filter will still be sent in real-time after EOSE.

### Wrong: Trying to exclude

```json
// WRONG: No NOT operator exists
{ "kinds": [1], "NOT_authors": ["<spammer>"] }
```

Fetch all matching events and filter client-side.

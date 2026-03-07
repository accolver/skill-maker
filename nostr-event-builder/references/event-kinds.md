# Event Kinds Reference

Comprehensive mapping of common Nostr event kinds to their required structure,
tags, and content format.

---

## Kind 0 — User Metadata (Replaceable)

**NIP:** 01, 24 | **Category:** Replaceable (latest per pubkey+kind kept)

**Content:** Stringified JSON object with profile fields.

```json
{
  "kind": 0,
  "tags": [],
  "content": "{\"name\":\"alice\",\"about\":\"Nostr dev\",\"picture\":\"https://example.com/avatar.jpg\",\"display_name\":\"Alice Smith\",\"website\":\"https://alice.dev\",\"banner\":\"https://example.com/banner.jpg\",\"nip05\":\"alice@example.com\",\"lud16\":\"alice@getalby.com\"}"
}
```

**Required fields in content JSON:** `name` **Optional fields:** `about`,
`picture`, `display_name`, `website`, `banner`, `nip05`, `bot`, `lud06`, `lud16`

**Tags:** Typically empty. No required tags.

**Deprecated fields:** `displayName` (use `display_name`), `username` (use
`name`)

---

## Kind 1 — Short Text Note (Regular)

**NIP:** 10 | **Category:** Regular

**Content:** Human-readable plaintext. No markdown or HTML.

### Standalone note (no reply)

```json
{
  "kind": 1,
  "tags": [],
  "content": "Hello Nostr!"
}
```

### Direct reply to root note

```json
{
  "kind": 1,
  "tags": [
    ["e", "<root-id>", "<relay-url>", "root", "<root-author-pubkey>"],
    ["p", "<root-author-pubkey>"]
  ],
  "content": "Reply text"
}
```

### Reply to a reply (deeper in thread)

```json
{
  "kind": 1,
  "tags": [
    ["e", "<root-id>", "<relay-url>", "root", "<root-author-pubkey>"],
    ["e", "<parent-id>", "<relay-url>", "reply", "<parent-author-pubkey>"],
    ["p", "<root-author-pubkey>"],
    ["p", "<parent-author-pubkey>"],
    ["p", "<any-other-participant-pubkeys>"]
  ],
  "content": "Reply text"
}
```

**Rules:**

- Kind:1 replies MUST only reply to other kind:1 events
- Use marked e tags (with `root`/`reply` markers), NOT positional e tags
- Direct reply to root = single e tag with `root` marker only
- Reply to reply = two e tags: one `root`, one `reply`
- p tags MUST include all participants from the parent event's p tags plus the
  parent event's author pubkey
- `q` tags may be used for quoting events inline

---

## Kind 3 — Follows List (Replaceable)

**NIP:** 02 | **Category:** Replaceable

**Content:** May contain relay URL JSON (legacy), often empty string.

```json
{
  "kind": 3,
  "tags": [
    ["p", "<pubkey-1>", "<relay-url>", "<petname>"],
    ["p", "<pubkey-2>", "<relay-url>", ""],
    ["p", "<pubkey-3>", "", ""]
  ],
  "content": ""
}
```

**Tags:** One `p` tag per followed pubkey. Relay URL and petname are optional.

---

## Kind 5 — Event Deletion Request (Regular)

**NIP:** 09 | **Category:** Regular

**Content:** Optional text explaining deletion reason.

```json
{
  "kind": 5,
  "tags": [
    ["e", "<event-id-to-delete>"],
    ["e", "<another-event-id>"],
    ["k", "<kind-of-deleted-events>"]
  ],
  "content": "Published by accident"
}
```

**Tags:**

- `e` tags for regular events to delete
- `a` tags for addressable/replaceable events to delete
- `k` tags indicating the kind(s) of events being deleted (recommended)
- The deletion request pubkey MUST match the pubkey of events being deleted

---

## Kind 6 — Repost (Regular)

**NIP:** 18 | **Category:** Regular

**Content:** Stringified JSON of the reposted kind:1 event.

```json
{
  "kind": 6,
  "tags": [
    ["e", "<reposted-event-id>", "<relay-url>"],
    ["p", "<reposted-event-author-pubkey>"]
  ],
  "content": "{\"id\":\"...\",\"pubkey\":\"...\",\"kind\":1,...}"
}
```

**Tags:**

- `e` tag: the event being reposted (required)
- `p` tag: the author of the reposted event (recommended)

**Note:** Kind 6 is specifically for reposting kind:1 notes. Use kind 16
(generic repost) for other kinds.

---

## Kind 7 — Reaction (Regular)

**NIP:** 25 | **Category:** Regular

**Content:** `+` (like), `-` (dislike), emoji, or custom emoji shortcode.

```json
{
  "kind": 7,
  "tags": [
    ["e", "<reacted-event-id>", "<relay-url>"],
    ["p", "<reacted-event-author-pubkey>"],
    ["k", "<kind-of-reacted-event>"]
  ],
  "content": "+"
}
```

**Tags:**

- `e` tag: the event being reacted to (required)
- `p` tag: author of the reacted event (recommended)
- `k` tag: kind of the reacted event (recommended)
- `emoji` tag: for custom emoji reactions (conditional)

---

## Kind 1111 — Comment (Regular)

**NIP:** 22 | **Category:** Regular

**Content:** Plaintext comment. No HTML or markdown.

### Top-level comment on a regular event

```json
{
  "kind": 1111,
  "tags": [
    ["E", "<root-event-id>", "<relay-url>", "<root-author-pubkey>"],
    ["K", "<root-event-kind-as-string>"],
    ["P", "<root-author-pubkey>", "<relay-url>"],
    ["e", "<root-event-id>", "<relay-url>", "<root-author-pubkey>"],
    ["k", "<root-event-kind-as-string>"],
    ["p", "<root-author-pubkey>", "<relay-url>"]
  ],
  "content": "Comment text"
}
```

### Top-level comment on an addressable event

```json
{
  "kind": 1111,
  "tags": [
    ["A", "<kind>:<pubkey>:<d-tag>", "<relay-url>"],
    ["K", "<root-kind>"],
    ["P", "<root-author-pubkey>", "<relay-url>"],
    ["a", "<kind>:<pubkey>:<d-tag>", "<relay-url>"],
    ["e", "<event-id>", "<relay-url>"],
    ["k", "<root-kind>"],
    ["p", "<root-author-pubkey>", "<relay-url>"]
  ],
  "content": "Comment text"
}
```

### Top-level comment on a URL

```json
{
  "kind": 1111,
  "tags": [
    ["I", "https://example.com/article"],
    ["K", "web"],
    ["i", "https://example.com/article"],
    ["k", "web"]
  ],
  "content": "Comment text"
}
```

### Reply to an existing comment

```json
{
  "kind": 1111,
  "tags": [
    ["E", "<original-root-id>", "<relay-url>", "<root-author-pubkey>"],
    ["K", "<original-root-kind>"],
    ["P", "<root-author-pubkey>"],
    ["e", "<parent-comment-id>", "<relay-url>", "<parent-author-pubkey>"],
    ["k", "1111"],
    ["p", "<parent-author-pubkey>"]
  ],
  "content": "Reply to comment"
}
```

**Rules:**

- MUST NOT be used to reply to kind:1 notes (use NIP-10 kind:1 instead)
- Uppercase tags (E, A, I, K, P) = root scope (the original content)
- Lowercase tags (e, a, i, k, p) = parent item (what you're directly replying
  to)
- K and k tags are REQUIRED
- For top-level comments, root and parent references are the same
- For addressable events, include both `a` tag (address) and `e` tag (specific
  event id)

---

## Kind 30023 — Long-form Content (Addressable)

**NIP:** 23 | **Category:** Addressable (latest per pubkey+kind+d-tag kept)

**Content:** Markdown-formatted article body.

```json
{
  "kind": 30023,
  "tags": [
    ["d", "<unique-article-identifier>"],
    ["title", "Article Title"],
    ["summary", "Brief description of the article"],
    ["published_at", "<unix-timestamp>"],
    ["image", "https://example.com/header.jpg"],
    ["t", "nostr"],
    ["t", "protocol"]
  ],
  "content": "# Article Title\n\nArticle body in Markdown..."
}
```

**Required tags:** `d` (unique identifier for this article) **Recommended
tags:** `title`, `summary`, `published_at`, `t` (topic hashtags) **Optional
tags:** `image`, `e`, `a`, `p`

**Notes:**

- `created_at` = last update time, not original publication time
- Use `published_at` tag for original publication timestamp
- Content should be clean Markdown without embedded HTML

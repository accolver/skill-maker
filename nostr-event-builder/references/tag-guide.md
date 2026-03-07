# Tag Semantics Guide

Deep reference on Nostr tag structure, markers, and threading conventions.

---

## Tag Basics

Every tag is an array of strings. The first element is the tag name (key), the
second is the tag value. Additional elements are positional and kind-specific.

```json
["<tag-name>", "<value>", "<optional-1>", "<optional-2>", ...]
```

All single-letter tags (a-z, A-Z) are indexed by relays and can be queried using
`#<letter>` filters.

---

## The `e` Tag — Event Reference

References another event by its 32-byte hex ID.

### Format

```
["e", "<event-id>", "<relay-url>", "<marker>", "<pubkey>"]
```

| Position | Field     | Required    | Description                                   |
| -------- | --------- | ----------- | --------------------------------------------- |
| 0        | `"e"`     | Yes         | Tag name                                      |
| 1        | event ID  | Yes         | 32-byte lowercase hex                         |
| 2        | relay URL | Recommended | Where to find the event; use `""` if unknown  |
| 3        | marker    | Recommended | `"root"` or `"reply"` (kind:1 threading)      |
| 4        | pubkey    | Recommended | Author of the referenced event (outbox model) |

### Markers (NIP-10, kind:1 only)

| Marker    | Meaning                        | When to Use                                            |
| --------- | ------------------------------ | ------------------------------------------------------ |
| `"root"`  | Root of the reply thread       | Always present in replies; points to the original note |
| `"reply"` | Direct parent being replied to | Only when replying to a non-root note in the thread    |
| _(none)_  | Mention or general reference   | When referencing an event without replying to it       |

### Threading Rules

**Direct reply to root (1 level deep):**

- ONE e tag with `"root"` marker
- Do NOT use `"reply"` marker for direct-to-root replies

```json
["e", "<root-id>", "wss://relay.example.com", "root", "<root-pubkey>"]
```

**Reply to a reply (2+ levels deep):**

- TWO e tags: one `"root"`, one `"reply"`
- e tags SHOULD be sorted root → parent (chronological order)

```json
["e", "<root-id>", "wss://relay.example.com", "root", "<root-pubkey>"],
["e", "<parent-id>", "wss://relay.example.com", "reply", "<parent-pubkey>"]
```

**Mentioning without replying:**

- e tag with no marker (just event-id and optional relay)

```json
["e", "<mentioned-id>", "wss://relay.example.com"]
```

### Deprecated: Positional e Tags

Old convention where position in the tag array determined meaning:

- First e tag = root, last e tag = reply, middle = mentions

This is ambiguous and deprecated. Always use marked e tags.

---

## The `p` Tag — Pubkey Reference

References a user by their 32-byte hex public key.

### Format

```
["p", "<pubkey>", "<relay-url>", "<petname>"]
```

| Position | Field     | Required | Description                             |
| -------- | --------- | -------- | --------------------------------------- |
| 0        | `"p"`     | Yes      | Tag name                                |
| 1        | pubkey    | Yes      | 32-byte lowercase hex                   |
| 2        | relay URL | Optional | Hint for finding user's events          |
| 3        | petname   | Optional | Local nickname (used in kind:3 follows) |

### Threading Rule for p Tags

When replying to event E authored by pubkey A with p tags [P1, P2, P3]:

Your reply's p tags MUST include: `[A, P1, P2, P3]`

This ensures all thread participants receive notifications.

---

## The `a` Tag — Addressable Event Reference

References a replaceable or addressable event by its coordinate.

### Format

```
["a", "<kind>:<pubkey>:<d-tag>", "<relay-url>"]
```

| Position | Field      | Required | Description                                                |
| -------- | ---------- | -------- | ---------------------------------------------------------- |
| 0        | `"a"`      | Yes      | Tag name                                                   |
| 1        | coordinate | Yes      | `kind:pubkey:d-tag` (include trailing `:` for replaceable) |
| 2        | relay URL  | Optional | Where to find the event                                    |

### Coordinate Format

**Addressable events (kind 30000-39999):**

```
30023:f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca:my-article
```

**Replaceable events (kind 10000-19999, 0, 3):**

```
10002:f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca:
```

Note the trailing colon with empty d-tag value.

---

## NIP-22 Uppercase Tags — Root Scope (kind:1111 only)

Kind 1111 comments use uppercase single-letter tags to reference the root
content being commented on.

| Tag | Purpose                  | Format                                                |
| --- | ------------------------ | ----------------------------------------------------- |
| `E` | Root event (regular)     | `["E", "<event-id>", "<relay-url>", "<root-pubkey>"]` |
| `A` | Root event (addressable) | `["A", "<kind>:<pubkey>:<d-tag>", "<relay-url>"]`     |
| `I` | Root external identifier | `["I", "<url-or-id>", "<hint-url>"]`                  |
| `K` | Root item kind           | `["K", "<kind-number-or-type>"]`                      |
| `P` | Root item author         | `["P", "<pubkey>", "<relay-url>"]`                    |

### K Tag Values

| Root Type           | K Value                                   |
| ------------------- | ----------------------------------------- |
| Regular Nostr event | The kind number as string, e.g. `"1063"`  |
| Addressable event   | The kind number as string, e.g. `"30023"` |
| Web URL             | `"web"`                                   |
| Podcast episode     | `"podcast:item:guid"`                     |

---

## NIP-22 Lowercase Tags — Parent Scope (kind:1111 only)

Lowercase tags reference the direct parent item (what you're replying to).

| Tag | Purpose                    | Format                                                  |
| --- | -------------------------- | ------------------------------------------------------- |
| `e` | Parent event (regular)     | `["e", "<event-id>", "<relay-url>", "<parent-pubkey>"]` |
| `a` | Parent event (addressable) | `["a", "<kind>:<pubkey>:<d-tag>", "<relay-url>"]`       |
| `i` | Parent external identifier | `["i", "<url-or-id>", "<hint-url>"]`                    |
| `k` | Parent item kind           | `["k", "<kind-number-or-type>"]`                        |
| `p` | Parent item author         | `["p", "<pubkey>", "<relay-url>"]`                      |

### Top-Level vs Nested Comments

**Top-level comment:** Root and parent are the same content.

- Uppercase tags = lowercase tags (same references)

**Reply to a comment:** Root stays the same, parent changes to the comment.

- Uppercase tags = original root content
- Lowercase tags = the comment being replied to
- `k` tag becomes `"1111"` (parent is a comment)

---

## The `q` Tag — Quoted Event

Used when citing/quoting another event inline in content.

### Format

```
["q", "<event-id-or-address>", "<relay-url>", "<pubkey>"]
```

- Authors of quoted events SHOULD be added as `p` tags for notification
- Content references use `nostr:note1...` or `nostr:nevent1...` NIP-21 URIs

---

## The `d` Tag — Identifier (Addressable Events)

Required for addressable events (kind 30000-39999). Makes the event uniquely
addressable by `kind + pubkey + d-tag`.

### Format

```
["d", "<unique-identifier>"]
```

- Must be unique per pubkey+kind combination
- Used in `a` tag coordinates: `<kind>:<pubkey>:<d-tag-value>`
- Publishing a new event with the same d-tag replaces the previous one

---

## The `k` Tag — Kind Reference

References the kind number of another event. Used in reactions (NIP-25),
deletions (NIP-09), and comments (NIP-22).

### Format

```
["k", "<kind-number-as-string>"]
```

In NIP-22 comments, both `K` (root kind) and `k` (parent kind) are REQUIRED.

---

## Common Tag Patterns by Use Case

### "I want to like a note"

```json
["e", "<note-id>", "<relay>"],
["p", "<note-author>"],
["k", "1"]
```

### "I want to delete my events"

```json
["e", "<event-id-1>"],
["e", "<event-id-2>"],
["k", "1"]
```

### "I want to repost a note"

```json
["e", "<note-id>", "<relay>"],
["p", "<note-author>"]
```

### "I want to comment on a blog post"

```json
["A", "30023:<author>:<d-tag>", "<relay>"],
["K", "30023"],
["P", "<author>", "<relay>"],
["a", "30023:<author>:<d-tag>", "<relay>"],
["e", "<blog-event-id>", "<relay>"],
["k", "30023"],
["p", "<author>", "<relay>"]
```

### "I want to reply in a thread"

```json
["e", "<root-id>", "<relay>", "root", "<root-author>"],
["e", "<parent-id>", "<relay>", "reply", "<parent-author>"],
["p", "<root-author>"],
["p", "<parent-author>"]
```

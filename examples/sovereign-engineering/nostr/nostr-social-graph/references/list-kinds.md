# NIP-51 List Kinds Reference

All list kinds defined in NIP-51 and related NIPs, with their tag structures and
encryption support.

## Standard Lists (Replaceable)

Standard lists use replaceable events — one per user per kind. Publishing a new
event replaces the previous one entirely.

### Kind 3: Follow List (NIP-02)

```json
{
  "kind": 3,
  "tags": [
    ["p", "<32-byte-hex-pubkey>", "<relay-url>", "<petname>"],
    ["p", "<32-byte-hex-pubkey>", "<relay-url>"],
    ["p", "<32-byte-hex-pubkey>"]
  ],
  "content": ""
}
```

| Tag | Required Fields | Optional Fields    |
| --- | --------------- | ------------------ |
| `p` | pubkey (hex)    | relay URL, petname |

- Content is not used (empty string)
- Relay URL and petname can be empty strings or omitted
- Append new follows to the end for chronological order

### Kind 10000: Mute List

```json
{
  "kind": 10000,
  "tags": [
    ["p", "<pubkey-hex>"],
    ["t", "<hashtag>"],
    ["word", "<lowercase-string>"],
    ["e", "<event-id>"]
  ],
  "content": "<NIP-44-encrypted-private-items>"
}
```

| Tag    | Purpose                 |
| ------ | ----------------------- |
| `p`    | Mute a pubkey           |
| `t`    | Mute a hashtag          |
| `word` | Mute a word (lowercase) |
| `e`    | Mute a thread           |

- Supports private items in encrypted content
- Words MUST be lowercase

### Kind 10001: Pin List

```json
{
  "kind": 10001,
  "tags": [
    ["e", "<kind-1-event-id>"]
  ],
  "content": ""
}
```

| Tag | Purpose                     |
| --- | --------------------------- |
| `e` | Pinned kind:1 note event ID |

### Kind 10002: Relay List Metadata (NIP-65)

```json
{
  "kind": 10002,
  "tags": [
    ["r", "wss://relay.example.com"],
    ["r", "wss://write.example.com", "write"],
    ["r", "wss://read.example.com", "read"]
  ],
  "content": ""
}
```

| Tag | Marker    | Meaning        |
| --- | --------- | -------------- |
| `r` | (none)    | Read AND write |
| `r` | `"read"`  | Read only      |
| `r` | `"write"` | Write only     |

- Keep small: 2-4 relays per category
- Spread widely for discoverability

### Kind 10003: Bookmarks

```json
{
  "kind": 10003,
  "tags": [
    ["e", "<kind-1-event-id>"],
    ["a", "<kind>:<pubkey>:<d-tag>"]
  ],
  "content": "<NIP-44-encrypted-private-items>"
}
```

| Tag | Purpose                                                 |
| --- | ------------------------------------------------------- |
| `e` | Bookmarked kind:1 note                                  |
| `a` | Bookmarked addressable event (e.g., kind:30023 article) |

- Supports private items in encrypted content

### Kind 10050: DM Relays (NIP-17)

```json
{
  "kind": 10050,
  "tags": [
    ["relay", "wss://dm-relay.example.com"]
  ],
  "content": ""
}
```

| Tag     | Purpose                            |
| ------- | ---------------------------------- |
| `relay` | Relay URL for receiving NIP-17 DMs |

- Note: uses `relay` tag, NOT `r` tag (different from kind:10002)

### Other Standard Lists

| Kind  | Name           | Tags                      | Notes                   |
| ----- | -------------- | ------------------------- | ----------------------- |
| 10004 | Communities    | `a` (kind:34550)          | NIP-72 communities      |
| 10005 | Public chats   | `e` (kind:40)             | NIP-28 channels         |
| 10006 | Blocked relays | `relay` (URLs)            | Never connect to these  |
| 10007 | Search relays  | `relay` (URLs)            | Use for search queries  |
| 10009 | Simple groups  | `group`, `r`              | NIP-29 groups           |
| 10015 | Interests      | `t`, `a` (kind:30015)     | Topic interests         |
| 10020 | Media follows  | `p`                       | Photo/video follow list |
| 10030 | Emojis         | `emoji`, `a` (kind:30030) | Preferred emojis        |

## Sets (Addressable)

Sets use addressable events — users can have multiple sets of each kind,
distinguished by their `d` tag. Sets can optionally include `title`, `image`,
and `description` tags.

### Kind 30000: Follow Sets

```json
{
  "kind": 30000,
  "tags": [
    ["d", "<set-identifier>"],
    ["title", "Close Friends"],
    ["p", "<pubkey-hex>"],
    ["p", "<pubkey-hex>"]
  ],
  "content": "<NIP-44-encrypted-private-items>"
}
```

| Tag     | Purpose                          |
| ------- | -------------------------------- |
| `d`     | Unique set identifier (required) |
| `title` | Human-readable name (optional)   |
| `p`     | Pubkey in this follow set        |

### Kind 30002: Relay Sets

```json
{
  "kind": 30002,
  "tags": [
    ["d", "<set-identifier>"],
    ["title", "Fast Relays"],
    ["relay", "wss://fast1.example.com"],
    ["relay", "wss://fast2.example.com"]
  ],
  "content": "<NIP-44-encrypted-private-items>"
}
```

| Tag     | Purpose                          |
| ------- | -------------------------------- |
| `d`     | Unique set identifier (required) |
| `title` | Human-readable name (optional)   |
| `relay` | Relay URL in this set            |

### Other Sets

| Kind  | Name                     | Tags                   | Notes                   |
| ----- | ------------------------ | ---------------------- | ----------------------- |
| 30003 | Bookmark sets            | `e`, `a`               | Categorized bookmarks   |
| 30004 | Curation sets (articles) | `a` (kind:30023), `e`  | Curated articles        |
| 30005 | Curation sets (videos)   | `e` (kind:21)          | Curated videos          |
| 30006 | Curation sets (pictures) | `e` (kind:20)          | Curated pictures        |
| 30007 | Kind mute sets           | `p`; `d` = kind string | Mute by kind            |
| 30015 | Interest sets            | `t`                    | Hashtag groups          |
| 30030 | Emoji sets               | `emoji`                | NIP-30 emoji groups     |
| 39089 | Starter packs            | `p`                    | Follow-together bundles |

## Private Item Encryption

Any NIP-51 list can contain private items encrypted in the `content` field.

### Encryption (NIP-44)

```typescript
const privateItems = [
  ["p", "<pubkey-to-hide>"],
  ["word", "sensitive-term"],
];

const encrypted = nip44.encrypt(
  JSON.stringify(privateItems),
  conversationKey(authorPrivkey, authorPubkey),
);

event.content = encrypted;
```

### Decryption with Backward Compatibility

```typescript
function decryptContent(content: string, privkey: string, pubkey: string) {
  if (!content || content === "") return [];

  // NIP-04 legacy: contains "?iv=" separator
  if (content.includes("?iv=")) {
    return JSON.parse(nip04.decrypt(privkey, pubkey, content));
  }

  // NIP-44 current standard
  return JSON.parse(nip44.decrypt(
    conversationKey(privkey, pubkey),
    content,
  ));
}
```

### Key Point

The shared key for list encryption is computed using the **author's own** public
and private key (encrypting to yourself), NOT a conversation partner's key. This
is different from DM encryption where you use the recipient's pubkey.

## Deprecated List Formats

These older formats should be migrated to standard lists:

| Old Kind | Old `d` tag     | Migrate to               |
| -------- | --------------- | ------------------------ |
| 30000    | `"mute"`        | Kind 10000 (mute list)   |
| 30001    | `"pin"`         | Kind 10001 (pin list)    |
| 30001    | `"bookmark"`    | Kind 10003 (bookmarks)   |
| 30001    | `"communities"` | Kind 10004 (communities) |

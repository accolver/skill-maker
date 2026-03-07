# Deprecated and Unrecommended NIPs

Complete list of NIPs that should NOT be used in new implementations, with
migration paths.

## Deprecated NIPs

### NIP-04 — Encrypted Direct Message (kind:4)

**Status:** Unrecommended, deprecated in favor of NIP-17

**Why deprecated:**

- Metadata leakage: sender pubkey, receiver pubkey, and timestamps are all
  visible in plaintext on the event
- No group chat support
- Uses AES-256-CBC which is less secure than NIP-44's ChaCha20
- No deniability — messages are signed by the sender
- Relay operators can see who is messaging whom

**Migration path:**

| NIP-04 (old)                  | NIP-17 (new)                                                      |
| ----------------------------- | ----------------------------------------------------------------- |
| kind:4                        | kind:14 (unsigned rumor) → kind:13 (seal) → kind:1059 (gift wrap) |
| AES-256-CBC                   | NIP-44 v2 (ChaCha20 + HMAC-SHA256)                                |
| `["p", "<receiver>"]` visible | Receiver hidden inside encrypted seal                             |
| Signed by sender              | Unsigned rumor (deniable)                                         |
| Published to any relay        | Published to recipient's kind:10050 relay list                    |

**Code migration:**

```diff
- // Old: NIP-04
- const encrypted = nip04.encrypt(senderPriv, recipientPub, message)
- const event = { kind: 4, content: encrypted, tags: [["p", recipientPub]] }
- publishToRelays(event)

+ // New: NIP-17
+ const rumor = { kind: 14, content: message, tags: [["p", recipientPub]] }
+ // Do NOT sign the rumor
+ const seal = createSeal(rumor, senderPriv, recipientPub)     // kind:13
+ const wrap = createGiftWrap(seal, recipientPub)               // kind:1059
+ publishToRecipientDMRelays(wrap)  // kind:10050 relay list
```

---

### NIP-08 — Handling Mentions

**Status:** Unrecommended, deprecated in favor of NIP-27

**Why deprecated:**

- Used positional tag references (`#[0]`) which were fragile and ambiguous
- Required clients to parse and replace inline references

**Migration path:**

Use NIP-27 text note references with `nostr:` URI scheme (NIP-21):

```diff
- // Old: NIP-08
- content: "Hello #[0]!"
- tags: [["p", "<pubkey>"]]

+ // New: NIP-27
+ content: "Hello nostr:npub1abc...!"
+ tags: [["p", "<pubkey>"]]
```

---

### NIP-96 — HTTP File Storage Integration

**Status:** Unrecommended, replaced by Blossom APIs (NIP-B7)

**Why deprecated:**

- More complex API than necessary
- Blossom provides simpler, content-addressed file storage
- Blossom uses SHA-256 hashes as file identifiers (content-addressable)

**Migration path:**

| NIP-96 (old)             | Blossom / NIP-B7 (new)        |
| ------------------------ | ----------------------------- |
| kind:10096 (server list) | kind:10063 (user server list) |
| Complex upload API       | Simple PUT to `/<sha256>`     |
| Server-assigned URLs     | Content-addressed by hash     |

---

### NIP-26 — Delegated Event Signing

**Status:** Unrecommended

**Why deprecated:**

- Adds unnecessary complexity for little practical gain
- Delegation tokens are hard to revoke
- Most use cases are better served by NIP-46 (Remote Signing)

**Migration path:**

Use NIP-46 (Nostr Remote Signing / Nostr Connect) instead for delegated signing
scenarios.

---

### Positional `e` tags

**Status:** Deprecated within NIP-10

**Why deprecated:**

- Position-based semantics are ambiguous when events reference other events
  without replying
- Impossible to distinguish mentions from replies in some cases

**Migration path:**

Use marked `e` tags with explicit markers:

```diff
- // Old: positional
- tags: [
-   ["e", "<root-id>"],
-   ["e", "<reply-id>"]
- ]

+ // New: marked (NIP-10)
+ tags: [
+   ["e", "<root-id>", "<relay>", "root", "<root-author-pubkey>"],
+   ["e", "<reply-id>", "<relay>", "reply", "<reply-author-pubkey>"]
+ ]
```

---

## Other Unrecommended Patterns

### kind:2 — Recommend Relay

Deprecated in NIP-01. Use NIP-65 (kind:10002 Relay List Metadata) instead.

### kind:30001 — Generic Lists

Deprecated within NIP-51. Use specific list kinds (30000, 30002, 30003, etc.)
instead.

### NIP-EE — E2EE Messaging using MLS Protocol

Unrecommended, superseded by the Marmot Protocol. Use Marmot for MLS-based group
messaging.

---

## How to Check if a NIP is Deprecated

1. Check the NIP index — deprecated NIPs are marked with
   `unrecommended: deprecated in favor of [NIP-XX]`
2. Check the NIP header — deprecated NIPs have an `unrecommended` tag
3. Check the event kinds table — deprecated kinds are marked with `(deprecated)`
   in the description
4. Use the Nostr MCP `read_nip` tool — the response includes deprecation
   warnings at the top of the document

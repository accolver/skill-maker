# Feature-to-NIP Map with Event Structures

Complete mapping of Nostr features to their required NIPs, event kinds, and tag
structures.

## Direct Messages (NIP-17)

### Required NIPs: 17, 44, 59, 51

**kind:14 — Chat Message (rumor, unsigned)**

```jsonc
{
  "pubkey": "<sender-pubkey>",
  "created_at": "<current-time>",
  "kind": 14,
  "tags": [
    ["p", "<receiver-1-pubkey>", "<relay-url>"],
    ["e", "<kind-14-id>", "<relay-url>"], // reply to previous message
    ["subject", "<conversation-title>"] // optional
  ],
  "content": "<message-in-plain-text>"
  // NO "sig" field — must be unsigned
}
```

**kind:15 — File Message (rumor, unsigned)**

```jsonc
{
  "kind": 15,
  "tags": [
    ["p", "<receiver-pubkey>", "<relay-url>"],
    ["file-type", "<mime-type>"],
    ["encryption-algorithm", "aes-gcm"],
    ["decryption-key", "<key>"],
    ["decryption-nonce", "<nonce>"],
    ["x", "<sha256-of-encrypted-file>"]
  ],
  "content": "<file-url>"
}
```

**kind:13 — Seal**

```jsonc
{
  "kind": 13,
  "pubkey": "<real-author-pubkey>",
  "created_at": "<randomized-up-to-2-days-past>",
  "tags": [], // MUST be empty
  "content": "<nip44-encrypted-unsigned-kind-14>",
  "sig": "<signed-by-real-author>"
}
```

**kind:1059 — Gift Wrap**

```jsonc
{
  "kind": 1059,
  "pubkey": "<random-one-time-pubkey>",
  "created_at": "<randomized-up-to-2-days-past>",
  "tags": [["p", "<recipient-pubkey>"]],
  "content": "<nip44-encrypted-kind-13>",
  "sig": "<signed-by-random-key>"
}
```

**kind:10050 — DM Relay List**

```jsonc
{
  "kind": 10050,
  "tags": [
    ["relay", "wss://inbox.nostr.wine"],
    ["relay", "wss://myrelay.example.com"]
  ],
  "content": ""
}
```

### Encryption flow

```
unsigned kind:14 → NIP-44 encrypt(sender_priv, recipient_pub) → kind:13 seal
kind:13 seal → NIP-44 encrypt(random_priv, recipient_pub) → kind:1059 gift wrap
```

Repeat for each recipient AND the sender (for sent-message recovery).

---

## Zaps — Lightning (NIP-57)

### Required NIPs: 57 + LNURL (external)

### Related: 47 (Wallet Connect), 75 (Zap Goals)

**kind:9734 — Zap Request (NOT published to relays)**

```jsonc
{
  "kind": 9734,
  "content": "Optional zap comment",
  "tags": [
    ["relays", "wss://relay1.example.com", "wss://relay2.example.com"],
    ["amount", "21000"], // millisats, stringified
    ["lnurl", "<bech32-lnurl>"], // recipient's lnurl
    ["p", "<recipient-pubkey>"],
    ["e", "<event-id>"], // if zapping an event
    ["a", "<event-coordinate>"], // if zapping addressable event
    ["k", "<target-event-kind>"] // kind of target event
  ]
}
```

**kind:9735 — Zap Receipt (published by recipient's lnurl server)**

```jsonc
{
  "kind": 9735,
  "pubkey": "<lnurl-server-nostr-pubkey>",
  "tags": [
    ["p", "<recipient-pubkey>"],
    ["P", "<sender-pubkey>"],
    ["e", "<zapped-event-id>"],
    ["k", "<target-event-kind>"],
    ["bolt11", "<bolt11-invoice>"],
    ["description", "<json-encoded-kind-9734>"],
    ["preimage", "<payment-preimage>"] // optional
  ],
  "content": ""
}
```

### Protocol flow

1. Client fetches recipient's `lud16` from kind:0 profile
2. GET `/.well-known/lnurlp/<user>` — check `allowsNostr` and `nostrPubkey`
3. Create and sign kind:9734 zap request
4. GET `callback?amount=<msats>&nostr=<uri-encoded-9734>&lnurl=<bech32>`
5. Receive `{ "pr": "<bolt11-invoice>" }`, pay it
6. Server publishes kind:9735 to relays listed in zap request

### Zap validation (for clients displaying zaps)

- kind:9735 `pubkey` MUST match recipient's lnurl `nostrPubkey`
- `bolt11` invoice amount MUST match `amount` tag in kind:9734
- `description` tag MUST contain valid kind:9734 JSON

---

## Nutzaps — Cashu (NIP-61)

### Required NIPs: 61, 60 (Cashu Wallet)

### Related: 87 (Mint Discovery)

**kind:10019 — Nutzap Mint Recommendation**

```jsonc
{
  "kind": 10019,
  "tags": [
    ["relay", "wss://relay1.example.com"],
    ["mint", "https://mint.example.com", "sat"],
    ["pubkey", "<p2pk-pubkey>"] // NOT the user's main Nostr pubkey
  ]
}
```

**kind:9321 — Nutzap**

```jsonc
{
  "kind": 9321,
  "content": "Optional comment",
  "tags": [
    ["proof", "<cashu-proof-json>"],
    ["unit", "sat"],
    ["u", "https://mint.example.com"],
    ["e", "<nutzapped-event-id>", "<relay-hint>"],
    ["k", "<nutzapped-kind>"],
    ["p", "<recipient-pubkey>"]
  ]
}
```

**kind:7376 — Nutzap Redemption History**

```jsonc
{
  "kind": 7376,
  "content": "<nip44-encrypted-details>",
  "tags": [
    ["e", "<9321-event-id>", "<relay-hint>", "redeemed"],
    ["p", "<sender-pubkey>"]
  ]
}
```

---

## Marketplace (NIP-15)

### Related: 69 (P2P Orders), 99 (Classified Listings)

**kind:30017 — Stall**

```jsonc
{
  "kind": 30017,
  "content": "<json: {name, description, currency, shipping[]}>",
  "tags": [
    ["d", "<stall-id>"]
  ]
}
```

**kind:30018 — Product**

```jsonc
{
  "kind": 30018,
  "content": "<json: {id, stall_id, name, description, images[], price, quantity, specs[]}>",
  "tags": [
    ["d", "<product-id>"],
    ["t", "<category-tag>"]
  ]
}
```

**kind:38383 — P2P Order (NIP-69)**

```jsonc
{
  "kind": 38383,
  "tags": [
    ["d", "<order-id>"],
    ["s", "<status>"], // pending, confirmed, shipped, etc.
    ["f", "<currency>"],
    ["y", "<platform>"],
    ["z", "<order-number>"]
  ]
}
```

---

## Social / Notes (NIP-01, NIP-10)

**kind:0 — User Metadata**

```jsonc
{
  "kind": 0,
  "content": "{\"name\":\"alice\",\"about\":\"...\",\"picture\":\"...\",\"nip05\":\"alice@example.com\",\"lud16\":\"alice@getalby.com\"}"
}
```

**kind:1 — Short Text Note**

```jsonc
{
  "kind": 1,
  "content": "Hello nostr!",
  "tags": [
    ["e", "<root-event-id>", "<relay-url>", "root", "<root-author-pubkey>"],
    ["e", "<reply-event-id>", "<relay-url>", "reply", "<reply-author-pubkey>"],
    ["p", "<mentioned-pubkey>"]
  ]
}
```

**kind:7 — Reaction (NIP-25)**

```jsonc
{
  "kind": 7,
  "content": "+", // or emoji, or "-" for downvote
  "tags": [
    ["e", "<reacted-event-id>"],
    ["p", "<reacted-event-author>"],
    ["k", "<reacted-event-kind>"]
  ]
}
```

**kind:6 — Repost (NIP-18)**

```jsonc
{
  "kind": 6,
  "content": "<json-of-reposted-event>", // optional
  "tags": [
    ["e", "<reposted-event-id>", "<relay-url>"],
    ["p", "<reposted-event-author>"]
  ]
}
```

---

## Relay Authentication (NIP-42)

### Related: NIP-11 (Relay Info Document)

**kind:22242 — Client Authentication**

```jsonc
{
  "kind": 22242,
  "tags": [
    ["relay", "wss://relay.example.com/"],
    ["challenge", "<challenge-string-from-relay>"]
  ]
}
```

### Protocol flow

```
Relay → Client: ["AUTH", "<challenge>"]
Client → Relay: ["AUTH", <signed-kind-22242>]
Relay → Client: ["OK", "<event-id>", true, ""]
```

### NIP-11 Relay Info Document

Fetched via HTTP GET with `Accept: application/nostr+json`:

```jsonc
{
  "name": "My Relay",
  "description": "A relay for everyone",
  "pubkey": "<admin-pubkey>",
  "supported_nips": [1, 11, 42, 50],
  "software": "https://github.com/example/relay",
  "limitation": {
    "auth_required": true,
    "payment_required": false,
    "max_message_length": 16384
  }
}
```

---

## Long-form Content (NIP-23)

**kind:30023 — Long-form Content**

```jsonc
{
  "kind": 30023,
  "content": "<markdown-content>",
  "tags": [
    ["d", "<article-slug>"],
    ["title", "<article-title>"],
    ["summary", "<brief-summary>"],
    ["image", "<cover-image-url>"],
    ["published_at", "<unix-timestamp>"],
    ["t", "<hashtag>"]
  ]
}
```

---

## Groups (NIP-29)

**Relay-based groups** use the `h` tag for group identification.

```jsonc
{
  "kind": 1, // or 9, 11, etc.
  "tags": [
    ["h", "<group-id>"]
  ]
}
```

Group control events use kinds 9000-9030.

---

## Identity (NIP-05, NIP-19)

### NIP-05 — DNS Verification

Client fetches `https://<domain>/.well-known/nostr.json?name=<user>`:

```json
{
  "names": {
    "alice": "<hex-pubkey>"
  },
  "relays": {
    "<hex-pubkey>": ["wss://relay1.example.com"]
  }
}
```

### NIP-19 — bech32 Encoding

| Prefix     | Encodes                                |
| ---------- | -------------------------------------- |
| `npub`     | Public key                             |
| `nsec`     | Private key                            |
| `note`     | Event ID                               |
| `nprofile` | Public key + relay hints               |
| `nevent`   | Event ID + relay hints + author + kind |
| `naddr`    | Addressable event coordinate           |

---

## DVMs — Data Vending Machines (NIP-90)

**kind:5000-5999 — Job Request**

```jsonc
{
  "kind": 5050, // specific job type
  "content": "",
  "tags": [
    ["i", "<input-data>", "<input-type>"],
    ["param", "<key>", "<value>"],
    ["relays", "wss://relay1.example.com"],
    ["bid", "<max-msats>"]
  ]
}
```

**kind:6000-6999 — Job Result** (kind = request kind + 1000)

```jsonc
{
  "kind": 6050,
  "content": "<result>",
  "tags": [
    ["e", "<job-request-id>"],
    ["p", "<requester-pubkey>"],
    ["amount", "<msats>", "<bolt11>"]
  ]
}
```

---

## File Storage — Blossom (NIP-B7)

Blossom uses HTTP endpoints on media servers. Files are addressed by their
SHA-256 hash.

**kind:10063 — User Server List**

```jsonc
{
  "kind": 10063,
  "tags": [
    ["server", "https://blossom.example.com"]
  ],
  "content": ""
}
```

### Related: NIP-94 (File Metadata), NIP-92 (Media Attachments)

**kind:1063 — File Metadata (NIP-94)**

```jsonc
{
  "kind": 1063,
  "content": "<description>",
  "tags": [
    ["url", "<file-url>"],
    ["m", "<mime-type>"],
    ["x", "<sha256-hash>"],
    ["size", "<bytes>"],
    ["dim", "<width>x<height>"]
  ]
}
```

**`imeta` tag for inline media (NIP-92)**

```jsonc
{
  "kind": 1,
  "content": "Check out this image https://example.com/image.jpg",
  "tags": [
    [
      "imeta",
      "url https://example.com/image.jpg",
      "m image/jpeg",
      "x <sha256>",
      "dim 1920x1080",
      "blurhash <hash>"
    ]
  ]
}
```

---

## Lists (NIP-51)

| Kind  | List Type           |
| ----- | ------------------- |
| 10000 | Mute list           |
| 10001 | Pin list            |
| 10002 | Relay list (NIP-65) |
| 10003 | Bookmark list       |
| 10050 | DM relay list       |
| 30000 | Follow sets         |
| 30002 | Relay sets          |
| 30003 | Bookmark sets       |

---

## Encryption (NIP-44)

NIP-44 v2 uses: secp256k1 ECDH → HKDF-SHA256 → ChaCha20 + HMAC-SHA256.

```
conversation_key = HKDF-extract(ECDH(priv_a, pub_b), salt="nip44-v2")
(chacha_key, chacha_nonce, hmac_key) = HKDF-expand(conversation_key, nonce, 76)
ciphertext = ChaCha20(chacha_key, chacha_nonce, padded_plaintext)
mac = HMAC-SHA256(hmac_key, nonce || ciphertext)
payload = base64(0x02 || nonce || ciphertext || mac)
```

Implementations: https://github.com/paulmillr/nip44

# Private DMs in Nostr: NIP-04 is Deprecated — Use NIP-17

## Warning: Do NOT Use NIP-04

**NIP-04 is deprecated (unrecommended)** and must not be used for new
implementations. While NIP-04 (kind:4) appears simple — encrypt content with
AES-256-CBC and publish — it has critical metadata leakage problems:

- **Sender and receiver pubkeys are visible** in plaintext on the event
- **Timestamps are visible**, allowing conversation timing analysis
- **The `p` tag reveals the recipient** to any relay or observer
- The encryption itself uses an outdated scheme without proper padding

Any client still using NIP-04 will have interoperability issues with modern
clients that have migrated to the replacement standard.

## Use NIP-17 (kind:14) for Private DMs

**NIP-17** is the recommended standard for private direct messages. It uses a
multi-layer encryption chain that protects both content AND metadata:

### The Encryption Chain

```
kind:14 (unsigned rumor) → NIP-44 encrypt → kind:13 (seal) → NIP-44 encrypt → kind:1059 (gift wrap)
```

### Step-by-Step Implementation

#### 1. Create the Rumor (kind:14)

Create a kind:14 event with your message. This event MUST NOT be signed —
leaving it unsigned provides deniability. If the message leaks, it cannot be
cryptographically proven that you sent it.

```json
{
  "id": "<computed hash>",
  "pubkey": "<your-pubkey>",
  "created_at": "<current timestamp>",
  "kind": 14,
  "tags": [
    ["p", "<recipient-pubkey>", "<relay-url>"]
  ],
  "content": "Your message in plaintext"
}
```

The kind:14 event has no signature field — it is an unsigned rumor. The
`content` is plain text (not encrypted at this layer). The `id` and `created_at`
fields are required.

#### 2. Seal it (kind:13)

Encrypt the JSON-serialized unsigned kind:14 using **NIP-44** encryption
(versioned encryption with secp256k1 ECDH, HKDF, ChaCha20, and HMAC-SHA256).
Encrypt using the sender's private key and the recipient's public key. Place the
encrypted payload in the `content` field of a kind:13 seal event.

```json
{
  "id": "<hash>",
  "pubkey": "<your-real-pubkey>",
  "created_at": "<randomized timestamp up to 2 days in the past>",
  "kind": 13,
  "tags": [],
  "content": "<NIP-44 encrypted kind:14 rumor>",
  "sig": "<signed by your real key>"
}
```

Note: Tags MUST be empty on the seal. The `created_at` MUST be randomized up to
2 days in the past to prevent timing analysis.

#### 3. Gift Wrap it (kind:1059)

Generate a random, one-time-use ephemeral keypair. Encrypt the JSON-serialized
kind:13 seal using NIP-44 with the ephemeral private key and the recipient's
public key. Wrap it in a kind:1059 gift wrap event.

```json
{
  "id": "<hash>",
  "pubkey": "<random ephemeral pubkey>",
  "created_at": "<randomized timestamp up to 2 days in the past>",
  "kind": 1059,
  "tags": [
    ["p", "<recipient-pubkey>"]
  ],
  "content": "<NIP-44 encrypted kind:13 seal>",
  "sig": "<signed by ephemeral key>"
}
```

The `pubkey` on the gift wrap is the random ephemeral key, NOT your real pubkey.
This hides the sender's identity from relays and observers.

#### 4. Publish to Recipient's DM Relay List (kind:10050)

Look up the recipient's kind:10050 event (their DM relay list, defined in
NIP-51). This event lists the relays where the recipient expects to receive
gift-wrapped DMs:

```json
{
  "kind": 10050,
  "tags": [
    ["relay", "wss://inbox.nostr.wine"],
    ["relay", "wss://myrelay.example.com"]
  ],
  "content": ""
}
```

Publish the kind:1059 gift wrap to these relays only. If the recipient has no
kind:10050, they are not ready to receive NIP-17 DMs.

#### 5. Wrap for Yourself Too

Create a separate gift wrap addressed to your own pubkey so you can recover sent
messages. Each recipient (and the sender) gets their own individually wrapped
copy.

## Required NIPs Summary

| NIP        | Purpose                                                                |
| ---------- | ---------------------------------------------------------------------- |
| **NIP-17** | Private DM protocol (kind:14 rumor, kind:13 seal, kind:1059 gift wrap) |
| **NIP-44** | Versioned encryption algorithm (ChaCha20 + HMAC-SHA256)                |
| **NIP-59** | Gift wrap protocol (kind:1059 wrapping, ephemeral keys)                |
| **NIP-51** | Lists — specifically kind:10050 DM relay list for routing              |

## Critical Implementation Notes

- The kind:14 rumor MUST NOT be signed — no signature provides deniability
- Timestamps on both the seal (kind:13) and gift wrap (kind:1059) MUST be
  randomized up to 2 days in the past
- Use a fresh ephemeral keypair for every gift wrap
- Clients MUST verify that the pubkey on the kind:13 seal matches the pubkey on
  the inner kind:14 to prevent impersonation
- NIP-44 is the required encryption algorithm — do NOT use NIP-04's AES-256-CBC

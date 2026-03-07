# Implementing Private DMs in Your Nostr Client

## ⚠️ Warning: Do NOT Use NIP-04

**NIP-04 (kind:4) is deprecated and unrecommended.** While it may seem
straightforward, it has critical metadata leakage problems:

- **Sender pubkey is visible** in plaintext on the event
- **Receiver pubkey is visible** in the `["p", "<receiver>"]` tag
- **Timestamps are visible** — relay operators and anyone can see when messages
  were sent
- Messages are signed by the sender, removing any deniability
- The encryption (AES-256-CBC) is weaker than modern alternatives

Any client implementing NIP-04 today will be incompatible with modern Nostr
clients that have moved to the replacement protocol.

## Use NIP-17 Instead

**NIP-17** is the recommended replacement for private DMs. It uses **kind:14**
events for messages, combined with a multi-layer encryption and wrapping chain
that protects metadata.

### Required NIPs

| NIP    | Purpose                                                 |
| ------ | ------------------------------------------------------- |
| NIP-17 | Private Direct Messages (kind:14)                       |
| NIP-44 | Encryption standard (ChaCha20 + HMAC-SHA256)            |
| NIP-59 | Gift Wrap protocol (kind:13 seal + kind:1059 gift wrap) |
| NIP-51 | DM Relay List (kind:10050)                              |

### The Gift Wrap Chain

The full encryption chain works as follows:

```
kind:14 (unsigned rumor) → NIP-44 encrypt → kind:13 (seal) → NIP-44 encrypt → kind:1059 (gift wrap)
```

Here's each step in detail:

#### Step 1: Create the kind:14 Chat Message (Rumor)

```jsonc
{
  "pubkey": "<sender-pubkey>",
  "created_at": "<current-timestamp>",
  "kind": 14,
  "tags": [
    ["p", "<receiver-pubkey>", "<relay-url>"],
    ["e", "<previous-message-id>", "<relay-url>"], // if replying
    ["subject", "<conversation-title>"] // optional
  ],
  "content": "Hello, this is my private message!"
  // NO "sig" field — this event MUST NOT be signed
}
```

**Critical:** The kind:14 event **MUST NOT be signed**. Leaving it unsigned
provides deniability — neither party can prove the other sent the message.

#### Step 2: Seal it (kind:13)

Encrypt the unsigned kind:14 using NIP-44 with the sender's private key and
recipient's public key, then wrap it in a kind:13 seal event:

```jsonc
{
  "kind": 13,
  "pubkey": "<real-sender-pubkey>",
  "created_at": "<randomized-timestamp-up-to-2-days-past>",
  "tags": [], // MUST be empty
  "content": "<nip44-encrypted-unsigned-kind-14>",
  "sig": "<signed-by-real-sender>"
}
```

**Important:** The `created_at` timestamp on the seal MUST be randomized up to 2
days in the past to prevent timing correlation attacks.

#### Step 3: Gift Wrap it (kind:1059)

Encrypt the kind:13 seal using NIP-44 with a **random, one-time-use keypair**
and the recipient's public key:

```jsonc
{
  "kind": 1059,
  "pubkey": "<random-one-time-pubkey>",
  "created_at": "<randomized-timestamp-up-to-2-days-past>",
  "tags": [["p", "<recipient-pubkey>"]],
  "content": "<nip44-encrypted-kind-13>",
  "sig": "<signed-by-random-ephemeral-key>"
}
```

The random ephemeral key ensures that even the sender's identity is hidden from
relay operators.

#### Step 4: Publish to Recipient's DM Relays

Fetch the recipient's **kind:10050** DM Relay List event (defined in NIP-51) to
find their preferred relays for receiving DMs:

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

Publish the kind:1059 gift wrap to the relays listed in this event. Do NOT
publish to random relays.

#### Step 5: Send a Copy to Yourself

Repeat the wrapping process (steps 2-4) for yourself (the sender) so you can
recover your sent messages. Create a separate gift wrap addressed to your own
pubkey and publish it to your own kind:10050 relay list.

### Encryption Details (NIP-44)

NIP-44 v2 uses:

- **Key exchange:** secp256k1 ECDH
- **Key derivation:** HKDF-SHA256
- **Encryption:** ChaCha20 + HMAC-SHA256

This is significantly more secure than NIP-04's AES-256-CBC.

### Summary of What's Protected

| Metadata          | NIP-04             | NIP-17                         |
| ----------------- | ------------------ | ------------------------------ |
| Message content   | Encrypted          | Encrypted                      |
| Sender identity   | Visible            | Hidden (ephemeral key on wrap) |
| Receiver identity | Visible in `p` tag | Hidden inside encrypted seal   |
| Timestamps        | Visible            | Randomized on seal and wrap    |
| Deniability       | None (signed)      | Yes (kind:14 unsigned)         |

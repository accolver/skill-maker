# Adding Zaps and Nutzaps to Your Nostr Client

You'll need two separate NIP chains: **NIP-57** for Lightning zaps and
**NIP-61** for Cashu-based nutzaps. I'd recommend supporting both — Lightning
zaps are the established standard, but nutzaps are gaining traction because they
don't require the recipient to run a Lightning node or LNURL server.

---

## Lightning Zaps (NIP-57)

**NIP-57** is the primary NIP for Lightning zaps. It integrates with the LNURL
protocol (which lives outside the Nostr protocol itself).

### Required NIPs and Dependencies

| Component         | Purpose                                  |
| ----------------- | ---------------------------------------- |
| NIP-57            | Zap protocol (kind:9734, kind:9735)      |
| LNURL (external)  | Lightning payment integration            |
| NIP-47 (optional) | Nostr Wallet Connect for in-app payments |

### Protocol Flow

#### 1. Fetch recipient's LNURL endpoint

Look up the recipient's `lud16` field from their kind:0 profile metadata. For
example, if `lud16` is `alice@getalby.com`, fetch:

```
GET https://getalby.com/.well-known/lnurlp/alice
```

Verify the response contains:

- `allowsNostr: true` — confirms the server supports Nostr zaps
- `nostrPubkey` — the server's Nostr pubkey (used to validate zap receipts)

#### 2. Create kind:9734 Zap Request

```jsonc
{
  "kind": 9734,
  "content": "Great post! ⚡", // optional zap comment
  "tags": [
    ["relays", "wss://relay1.example.com", "wss://relay2.example.com"],
    ["amount", "21000"], // amount in millisatoshis, stringified
    ["lnurl", "<bech32-lnurl>"], // recipient's lnurl
    ["p", "<recipient-pubkey>"],
    ["e", "<event-id>"], // if zapping a specific event
    ["k", "<target-event-kind>"] // kind of the target event
  ]
}
```

**Critical: The kind:9734 zap request is NOT published to relays.** It is sent
directly to the recipient's LNURL callback URL as a query parameter.

#### 3. Send to LNURL callback

```
GET <callback>?amount=21000&nostr=<uri-encoded-signed-kind-9734>&lnurl=<bech32>
```

The server responds with a bolt11 Lightning invoice:

```json
{ "pr": "<bolt11-invoice>" }
```

#### 4. Pay the invoice

Pay the bolt11 invoice using the user's Lightning wallet (or via NIP-47 Wallet
Connect for in-app payments).

#### 5. Zap Receipt (kind:9735)

After payment is confirmed, the recipient's LNURL server publishes a **kind:9735
zap receipt** to the relays specified in the zap request:

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

### Validating Zap Receipts

When displaying zaps in your client, validate:

- The kind:9735 `pubkey` matches the `nostrPubkey` from the recipient's LNURL
  response
- The `bolt11` invoice amount matches the `amount` tag in the kind:9734
- The `description` tag contains valid kind:9734 JSON

---

## Nutzaps — Cashu (NIP-61)

**NIP-61** defines nutzaps — ecash-based tips using Cashu tokens. Unlike
Lightning zaps, nutzaps don't require LNURL infrastructure.

### Required NIPs

| Component         | Purpose                     |
| ----------------- | --------------------------- |
| NIP-61            | Nutzap protocol (kind:9321) |
| NIP-60            | Cashu Wallet events         |
| NIP-87 (optional) | Mint Discovery              |

### How Nutzaps Work

#### 1. Fetch recipient's kind:10019 Nutzap Mint Recommendation

The recipient publishes a **kind:10019** event that lists their trusted mints
and a dedicated P2PK pubkey for receiving nutzaps:

```jsonc
{
  "kind": 10019,
  "tags": [
    ["relay", "wss://relay1.example.com"],
    ["mint", "https://mint.example.com", "sat"],
    ["pubkey", "<p2pk-pubkey>"] // NOT the user's main Nostr pubkey!
  ]
}
```

**Important:** Use the `pubkey` from the kind:10019 event for P2PK locking, NOT
the recipient's main Nostr pubkey. Using the wrong key means the recipient
cannot redeem the tokens.

#### 2. Mint/Swap Cashu Tokens

Mint or swap Cashu tokens at one of the recipient's trusted mints, P2PK-locked
to the pubkey specified in their kind:10019 event.

#### 3. Publish kind:9321 Nutzap

```jsonc
{
  "kind": 9321,
  "content": "Nice work! 🥜", // optional comment
  "tags": [
    ["proof", "<cashu-proof-json>"],
    ["unit", "sat"],
    ["u", "https://mint.example.com"],
    ["e", "<nutzapped-event-id>", "<relay-hint>"],
    ["k", "<nutzapped-event-kind>"],
    ["p", "<recipient-pubkey>"]
  ]
}
```

#### 4. Recipient Redeems

The recipient swaps the Cashu tokens into their NIP-60 wallet and publishes a
kind:7376 event to record the redemption.

---

## Recommendation: Support Both

| Feature               | Lightning Zaps (NIP-57)        | Nutzaps (NIP-61)            |
| --------------------- | ------------------------------ | --------------------------- |
| Infrastructure needed | LNURL server                   | None (just a Cashu mint)    |
| Recipient setup       | Must have `lud16` in profile   | Must publish kind:10019     |
| Privacy               | Sender visible to LNURL server | P2PK locked, more private   |
| Maturity              | Widely adopted                 | Growing adoption            |
| Offline receiving     | No (needs Lightning node)      | Yes (tokens redeemed later) |

Supporting both gives your users maximum flexibility. Start with NIP-57 zaps for
compatibility with the existing ecosystem, then add NIP-61 nutzaps for users who
prefer ecash.

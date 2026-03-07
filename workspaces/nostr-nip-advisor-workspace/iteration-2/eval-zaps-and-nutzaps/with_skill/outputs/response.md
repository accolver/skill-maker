# Adding Zaps and Nutzaps to Your Nostr Client

Yes, you should support both Lightning zaps (NIP-57) and nutzaps (NIP-61).
Lightning zaps are the established standard with wide adoption, while nutzaps
offer a newer ecash-based alternative with better privacy properties. Here's a
complete walkthrough.

---

## Lightning Zaps — NIP-57

**NIP-57** defines the protocol for Lightning-based tipping on Nostr. It uses
two event kinds:

- **kind:9734** — Zap request (created by the sender)
- **kind:9735** — Zap receipt (created by the recipient's LNURL server)

### Protocol Flow

#### 1. Discover the Recipient's Lightning Address

Fetch the recipient's kind:0 profile event and look for the `lud16` field
(Lightning Address, e.g., `bob@walletofsatoshi.com`) or `lud06` (raw LNURL).
Decode the `lud16` to derive the LNURL pay endpoint:

```
lud16: bob@example.com → GET https://example.com/.well-known/lnurlp/bob
```

#### 2. Verify Nostr Zap Support

The LNURL pay endpoint response must include:

- `allowsNostr: true` — indicates the server supports Nostr zap receipts
- `nostrPubkey` — the pubkey the server will use to sign kind:9735 zap receipts
- `callback` — the URL where you'll send the zap request
- `minSendable` / `maxSendable` — amount limits in millisats

If `allowsNostr` is not `true`, you can still pay the Lightning invoice but you
won't get a Nostr zap receipt.

#### 3. Create a Zap Request (kind:9734)

Create and sign a kind:9734 event. **This event is NOT published to relays** —
it is sent directly to the LNURL callback URL.

```json
{
  "kind": 9734,
  "content": "Great post!",
  "tags": [
    ["relays", "wss://relay.damus.io", "wss://nos.lol"],
    ["amount", "21000"],
    ["lnurl", "lnurl1..."],
    ["p", "<recipient-pubkey>"],
    ["e", "<event-id-being-zapped>"]
  ],
  "pubkey": "<sender-pubkey>",
  "created_at": 1234567890,
  "id": "<hash>",
  "sig": "<signature>"
}
```

Required tags:

- `relays` — where the zap receipt should be published
- `p` — recipient pubkey
- `amount` — millisats (recommended)
- `lnurl` — recipient's lnurl (recommended)
- `e` — event being zapped (if zapping an event, not a profile)

#### 4. Send to the LNURL Callback

Send the zap request as a query parameter to the callback URL:

```
GET <callback>?amount=21000&nostr=<URI-encoded-JSON-of-kind-9734>&lnurl=<lnurl>
```

The server responds with a `pr` field containing a bolt11 Lightning invoice.

#### 5. Pay the Invoice

Pay the bolt11 invoice using the user's Lightning wallet (or NIP-47 Wallet
Connect for in-app payments).

#### 6. Zap Receipt (kind:9735)

After payment, the recipient's LNURL server publishes a kind:9735 zap receipt to
the relays specified in the zap request:

```json
{
  "kind": 9735,
  "tags": [
    ["p", "<recipient-pubkey>"],
    ["P", "<sender-pubkey>"],
    ["e", "<zapped-event-id>"],
    ["bolt11", "<bolt11-invoice>"],
    ["description", "<JSON-encoded kind:9734 zap request>"]
  ],
  "content": "",
  "pubkey": "<lnurl-server-nostrPubkey>"
}
```

Clients verify zap receipts by checking that the `pubkey` matches the
`nostrPubkey` from the recipient's LNURL endpoint.

---

## Nutzaps (Cashu Ecash) — NIP-61

**NIP-61** defines nutzaps — tipping with Cashu ecash tokens. Instead of
Lightning invoices, the sender mints P2PK-locked tokens and publishes them on
Nostr for the recipient to redeem.

### Key Event Kinds

- **kind:9321** — Nutzap event (contains the Cashu proofs)
- **kind:10019** — Nutzap informational event (recipient's mint preferences and
  P2PK pubkey)
- **kind:7376** — Nutzap redemption history

### Protocol Flow

#### 1. Fetch Recipient's Mint Preferences (kind:10019)

The recipient publishes a kind:10019 event listing:

- Trusted mints they accept tokens from
- Relays where they receive nutzaps
- A dedicated P2PK `pubkey` for locking tokens (NOT their main Nostr pubkey)

```json
{
  "kind": 10019,
  "tags": [
    ["relay", "wss://relay1.example.com"],
    ["mint", "https://mint.example.com", "sat"],
    ["pubkey", "<p2pk-pubkey>"]
  ]
}
```

#### 2. Mint P2PK-Locked Tokens

Mint or swap Cashu tokens at one of the recipient's trusted mints. The tokens
MUST be P2PK-locked to the `pubkey` specified in their kind:10019 (NOT their
Nostr identity pubkey). Prefix the pubkey with `"02"` for nostr-cashu
compatibility.

#### 3. Publish the Nutzap (kind:9321)

```json
{
  "kind": 9321,
  "content": "Thanks for the great content!",
  "tags": [
    ["proof", "<cashu-proof-json>"],
    ["unit", "sat"],
    ["u", "https://mint.example.com"],
    ["e", "<event-id>", "<relay-hint>"],
    ["p", "<recipient-pubkey>"]
  ]
}
```

#### 4. Recipient Redeems

The recipient's client fetches kind:9321 events, swaps the tokens into their
NIP-60 wallet, and publishes a kind:7376 event to mark redemption.

---

## Summary: NIPs You Need

| Feature         | NIP        | Event Kinds                                | External Dependencies                   |
| --------------- | ---------- | ------------------------------------------ | --------------------------------------- |
| Lightning Zaps  | **NIP-57** | kind:9734 (request), kind:9735 (receipt)   | LNURL (`lud16`/`lud06`), Lightning      |
| Nutzaps (Cashu) | **NIP-61** | kind:9321 (nutzap), kind:10019 (mint info) | Cashu mint, NIP-60 wallet               |
| Wallet Connect  | NIP-47     | —                                          | Optional, for in-app Lightning payments |

### Common Mistakes to Avoid

1. **Do NOT publish kind:9734 zap requests to relays** — send them to the LNURL
   callback URL only
2. **Do NOT use the recipient's main Nostr pubkey for nutzap P2PK locking** —
   use the dedicated pubkey from their kind:10019
3. **Always verify `allowsNostr: true`** before attempting a Nostr zap flow

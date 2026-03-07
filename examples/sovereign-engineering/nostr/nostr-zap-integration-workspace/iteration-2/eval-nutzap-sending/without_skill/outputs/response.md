# Implementing Nutzaps (NIP-61) in a Nostr Client

Nutzaps are Cashu ecash-based tips sent via Nostr events, as an alternative to
Lightning zaps.

## Step 1: Fetch Recipient's Configuration

The recipient publishes a kind 10019 event that tells senders which mints and
relays to use:

```typescript
const config = await pool.querySync(relays, {
  kinds: [10019],
  authors: [recipientPubkey],
});

const nutzapConfig = config[0];
```

Parse the tags from the kind:10019 event:

```typescript
// Extract mint URLs
const mints = nutzapConfig.tags
  .filter((t) => t[0] === "mint")
  .map((t) => ({ url: t[1], units: t.slice(2) }));

// Extract relay URLs
const nutzapRelays = nutzapConfig.tags
  .filter((t) => t[0] === "relay")
  .map((t) => t[1]);

// Extract P2PK pubkey
const p2pkPubkey = nutzapConfig.tags.find((t) => t[0] === "pubkey")?.[1];
```

## Step 2: Mint P2PK-Locked Tokens

Use a Cashu library to create tokens locked to the recipient:

```typescript
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";

const mintUrl = mints[0].url;
const mint = new CashuMint(mintUrl);
const wallet = new CashuWallet(mint);

// Mint tokens with P2PK lock
// Add "02" prefix for compressed public key format
const lockKey = `02${p2pkPubkey}`;

const { proofs } = await wallet.mintTokens(21, {
  p2pkPubkey: lockKey,
});
```

The P2PK lock means only the holder of the corresponding private key can spend
these tokens.

## Step 3: Create and Publish the Nutzap Event

Build a kind 9321 event with the token proofs:

```typescript
const nutzapEvent = {
  kind: 9321,
  content: "Nice post!",
  tags: [
    ...proofs.map((p) => ["proof", JSON.stringify(p)]),
    ["u", mintUrl],
    ["unit", "sat"],
    ["p", recipientPubkey],
    ["e", eventId, "wss://relay.damus.io"],
  ],
  created_at: Math.floor(Date.now() / 1000),
};

const signed = finalizeEvent(nutzapEvent, senderKey);
await pool.publish(nutzapRelays, signed);
```

## Step 4: Recipient Verification and Redemption

When the recipient sees the kind:9321 event:

1. **Check the mint** - Verify the `u` tag contains a mint URL from their
   kind:10019
2. **Verify proofs** - Check that the proofs are locked to their P2PK key
3. **Swap tokens** - Claim the tokens by swapping them at the mint

```typescript
// Verify
const nutzapMint = nutzap.tags.find((t) => t[0] === "u")?.[1];
if (!trustedMints.includes(nutzapMint)) {
  console.log("Untrusted mint, ignoring nutzap");
  return;
}

// Redeem by swapping tokens
const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
const tokenProofs = proofTags.map((t) => JSON.parse(t[1]));
const newProofs = await wallet.receive(tokenProofs);
```

After redemption, publish a kind 7376 event to record it:

```typescript
const redemption = {
  kind: 7376,
  content: encrypt(JSON.stringify([
    ["direction", "in"],
    ["amount", "21"],
    ["unit", "sat"],
  ])),
  tags: [
    ["e", nutzapEventId, "", "redeemed"],
    ["p", senderPubkey],
  ],
};
```

## Important Notes

- Always use mints listed in the recipient's kind:10019
- The P2PK pubkey should be a dedicated key, not the main Nostr key
- Token proofs are included as individual `proof` tags
- Publish the nutzap to relays specified in the recipient's config

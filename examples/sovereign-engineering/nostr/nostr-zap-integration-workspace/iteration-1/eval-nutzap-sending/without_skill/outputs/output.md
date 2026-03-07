# Implementing Nutzaps (NIP-61) in a Nostr Client

Here's how to implement Nutzap sending using Cashu ecash tokens.

## Step 1: Get Recipient's Config

The recipient publishes a kind 10019 event with their nutzap preferences:

```typescript
const configEvent = await pool.get(relays, {
  kinds: [10019],
  authors: [recipientPubkey],
});

// Parse the config
const mints = configEvent.tags
  .filter((t) => t[0] === "mint")
  .map((t) => t[1]);

const nutzapRelays = configEvent.tags
  .filter((t) => t[0] === "relay")
  .map((t) => t[1]);
```

## Step 2: Create Cashu Tokens

Mint tokens at one of the recipient's preferred mints:

```typescript
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";

const mintUrl = mints[0]; // Use first available mint
const mint = new CashuMint(mintUrl);
const wallet = new CashuWallet(mint);

const { proofs } = await wallet.mintTokens(21, {
  // Lock to recipient
});
```

## Step 3: Build and Publish Nutzap Event

Create the kind 9321 event with the token proofs:

```typescript
const nutzapEvent = {
  kind: 9321,
  content: "Nice post!",
  tags: [
    ["p", recipientPubkey],
    ["e", eventId],
    ["proof", JSON.stringify(proofs[0])],
    ["u", mintUrl],
    ["unit", "sat"],
  ],
  pubkey: myPubkey,
  created_at: Math.floor(Date.now() / 1000),
};

const signed = await signEvent(nutzapEvent, myPrivkey);
await pool.publish(nutzapRelays, signed);
```

## Step 4: Recipient Claims

The recipient watches for kind 9321 events tagged to them:

```typescript
const nutzaps = await pool.querySync(relays, {
  kinds: [9321],
  "#p": [myPubkey],
});

for (const nutzap of nutzaps) {
  const proofTag = nutzap.tags.find((t) => t[0] === "proof");
  const proof = JSON.parse(proofTag[1]);

  // Redeem the token
  const newProofs = await wallet.receive([proof]);
  console.log("Redeemed nutzap!", newProofs);
}
```

This gives you a basic nutzap flow. The main advantage over Lightning zaps is
that no LNURL server is needed — the payment proof is the token itself.

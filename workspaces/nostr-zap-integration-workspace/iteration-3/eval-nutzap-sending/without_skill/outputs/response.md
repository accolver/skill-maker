# Implementing Nutzaps (NIP-61)

Nutzaps are Cashu ecash-based tips on Nostr. Here's how to implement them.

## Step 1: Get Recipient Config

The recipient publishes a kind:10019 event with their preferred mints and
relays:

```typescript
const config = await pool.get(relays, {
  kinds: [10019],
  authors: [recipientPubkey],
});

// Parse mint and relay info
const mints = config.tags.filter((t) => t[0] === "mint").map((t) => t[1]);
const nutzapRelays = config.tags.filter((t) => t[0] === "relay").map((t) =>
  t[1]
);
```

## Step 2: Mint Tokens

Create Cashu tokens at one of the recipient's mints:

```typescript
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";

const mint = new CashuMint(mints[0]);
const wallet = new CashuWallet(mint);

const { proofs } = await wallet.mintTokens(21);
```

## Step 3: Create the Nutzap Event

```typescript
const nutzap = {
  kind: 9321,
  content: "Nice post!",
  tags: [
    ["p", recipientPubkey],
    ["e", eventId],
    ["u", mints[0]],
    ["unit", "sat"],
  ],
};

const signed = finalizeEvent(nutzap, secretKey);
await pool.publish(nutzapRelays, signed);
```

## Step 4: Recipient Redeems

The recipient fetches kind:9321 events tagged to them, extracts the token data,
and redeems it at the mint. They can then publish an acknowledgment event.

```typescript
const nutzaps = await pool.list(relays, [{
  kinds: [9321],
  "#p": [myPubkey],
}]);

for (const nz of nutzaps) {
  // Extract and redeem tokens
  const redeemed = await wallet.receive(tokens);
}
```

That covers the basic nutzap flow. The key is making sure you use one of the
recipient's listed mints so they can actually redeem the tokens.

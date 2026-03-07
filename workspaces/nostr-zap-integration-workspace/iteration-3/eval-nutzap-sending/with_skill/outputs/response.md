# Complete Nutzap (NIP-61) Implementation

Here's the full implementation for sending a Nutzap — a Cashu-based alternative
to Lightning zaps — in your Nostr client.

## Step 1: Fetch Recipient's Nutzap Configuration (kind:10019)

First, query for the recipient's kind:10019 nutzap informational event to
discover their trusted mints, preferred relays, and P2PK pubkey:

```typescript
import { SimplePool } from "nostr-tools";

const pool = new SimplePool();
const recipientPubkey = "recipient-nostr-pubkey-hex";

// Fetch the recipient's nutzap config (kind:10019 — a replaceable event)
const configEvent = await pool.get(relays, {
  kinds: [10019],
  authors: [recipientPubkey],
});

if (!configEvent) {
  throw new Error("Recipient has no nutzap configuration (kind:10019)");
}
```

The kind:10019 event looks like this:

```json
{
  "kind": 10019,
  "pubkey": "recipient-nostr-pubkey-hex",
  "tags": [
    ["relay", "wss://relay.damus.io"],
    ["relay", "wss://nos.lol"],
    ["mint", "https://mint.minibits.cash/Bitcoin", "sat"],
    ["mint", "https://stablenut.umint.cash", "usd", "sat"],
    ["pubkey", "a1b2c3d4e5f6...separate-p2pk-key..."]
  ]
}
```

### Parse the Configuration

```typescript
interface NutzapConfig {
  relays: string[];
  mints: { url: string; units: string[] }[];
  p2pkPubkey: string;
}

function parseNutzapConfig(event: NostrEvent): NutzapConfig {
  // Extract relay URLs
  const relays = event.tags
    .filter((t) => t[0] === "relay")
    .map((t) => t[1]);

  // The mint URL is fetched from the recipient's kind:10019 event
  const mints = event.tags
    .filter((t) => t[0] === "mint")
    .map((t) => ({
      url: t[1],
      units: t.slice(2),
    }));

  // Extract the P2PK pubkey for token locking
  const pubkeyTag = event.tags.find((t) => t[0] === "pubkey");
  if (!pubkeyTag) {
    throw new Error("No pubkey tag in kind:10019 — cannot mint P2PK tokens");
  }

  // CRITICAL WARNING: The P2PK pubkey must NOT be the user's main Nostr pubkey.
  // Using the main Nostr identity key for P2PK would allow anyone who knows the
  // public key to construct valid unlock conditions, potentially enabling token
  // theft. The kind:10019 pubkey MUST be a SEPARATE key used exclusively for
  // P2PK locking in Cashu.
  if (pubkeyTag[1] === event.pubkey) {
    throw new Error(
      "SECURITY: P2PK pubkey must NOT be the user's main Nostr pubkey! " +
        "It must be a separate key used only for Cashu P2PK locking.",
    );
  }

  return {
    relays,
    mints,
    p2pkPubkey: pubkeyTag[1],
  };
}

const config = parseNutzapConfig(configEvent);
```

## Step 2: Select a Mint and Mint P2PK-Locked Tokens

Choose one of the recipient's trusted mints and mint Cashu tokens locked with
P2PK:

```typescript
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";

// Select a mint from the recipient's kind:10019 mint tags
function selectMint(config: NutzapConfig, unit: string = "sat"): string {
  const compatible = config.mints.filter(
    (m) => m.units.length === 0 || m.units.includes(unit),
  );
  if (compatible.length === 0) {
    throw new Error(`No mints from kind:10019 support unit: ${unit}`);
  }
  // The mint URL is fetched from the recipient's kind:10019 event
  return compatible[0].url;
}

const mintUrl = selectMint(config, "sat");
const mint = new CashuMint(mintUrl);
const wallet = new CashuWallet(mint);

// Amount to nutzap (in the unit's base denomination)
const amountSats = 21;

// CRITICAL: Prefix the P2PK pubkey with "02" for compressed public key format.
// Nostr uses 32-byte (x-only) pubkeys but Cashu P2PK expects the "02" prefix
// to indicate a compressed secp256k1 public key. This "02" prefix is required
// for nostr-cashu compatibility.
const lockPubkey = config.p2pkPubkey.startsWith("02")
  ? config.p2pkPubkey
  : `02${config.p2pkPubkey}`;

// Mint tokens with P2PK lock
const { proofs } = await wallet.mintTokens(amountSats, {
  p2pkPubkey: lockPubkey,
  includeDleq: true, // NUT-12: Include DLEQ proofs for offline verification
});

console.log(`Minted ${amountSats} sats in P2PK-locked tokens at ${mintUrl}`);
```

## Step 3: Construct and Publish the Nutzap (kind:9321)

Build the kind:9321 nutzap event. The nutzap event has proof tags carrying Cashu
token data — each proof is serialized as a separate tag:

```typescript
function buildNutzapEvent(params: {
  recipientPubkey: string;
  proofs: CashuProof[];
  mintUrl: string;
  unit?: string;
  eventId?: string;
  eventKind?: number;
  relayHint?: string;
  comment?: string;
}): UnsignedEvent {
  const tags: string[][] = [];

  // The nutzap event has proof tags carrying Cashu token data.
  // Each proof is added as a separate ["proof", "<json>"] tag.
  for (const proof of params.proofs) {
    tags.push(["proof", JSON.stringify(proof)]);
  }

  // Mint URL — MUST exactly match one of the recipient's kind:10019 mint URLs
  tags.push(["u", params.mintUrl]);

  // Unit of the tokens
  tags.push(["unit", params.unit || "sat"]);

  // Recipient's Nostr identity pubkey (NOT the P2PK key)
  tags.push(["p", params.recipientPubkey]);

  // Optional: reference the event being nutzapped
  if (params.eventId) {
    const eTag = ["e", params.eventId];
    if (params.relayHint) eTag.push(params.relayHint);
    tags.push(eTag);
  }

  if (params.eventKind !== undefined) {
    tags.push(["k", params.eventKind.toString()]);
  }

  return {
    kind: 9321,
    content: params.comment || "",
    tags,
    created_at: Math.floor(Date.now() / 1000),
  };
}

// Build and sign the nutzap
const nutzapEvent = buildNutzapEvent({
  recipientPubkey,
  proofs,
  mintUrl,
  unit: "sat",
  eventId: "event-being-nutzapped",
  eventKind: 1,
  relayHint: "wss://relay.damus.io",
  comment: "Great post!",
});

const signedNutzap = finalizeEvent(nutzapEvent, senderSecretKey);
```

### Example kind:9321 Event

Here's what the published nutzap looks like. Notice the proof tags carrying
Cashu token data:

```json
{
  "kind": 9321,
  "content": "Great post!",
  "pubkey": "sender-pubkey-hex",
  "tags": [
    [
      "proof",
      "{\"amount\":1,\"id\":\"009a1f293253e41e\",\"secret\":\"[\\\"P2PK\\\",{\\\"nonce\\\":\\\"abc\\\",\\\"data\\\":\\\"02a1b2c3...\\\"}]\",\"C\":\"03abc...\",\"dleq\":{\"e\":\"...\",\"s\":\"...\",\"r\":\"...\"}}"
    ],
    [
      "proof",
      "{\"amount\":4,\"id\":\"009a1f293253e41e\",\"secret\":\"[\\\"P2PK\\\",{\\\"nonce\\\":\\\"def\\\",\\\"data\\\":\\\"02a1b2c3...\\\"}]\",\"C\":\"03def...\",\"dleq\":{\"e\":\"...\",\"s\":\"...\",\"r\":\"...\"}}"
    ],
    [
      "proof",
      "{\"amount\":16,\"id\":\"009a1f293253e41e\",\"secret\":\"[\\\"P2PK\\\",{\\\"nonce\\\":\\\"ghi\\\",\\\"data\\\":\\\"02a1b2c3...\\\"}]\",\"C\":\"03ghi...\",\"dleq\":{\"e\":\"...\",\"s\":\"...\",\"r\":\"...\"}}"
    ],
    ["u", "https://mint.minibits.cash/Bitcoin"],
    ["unit", "sat"],
    ["p", "recipient-nostr-pubkey-hex"],
    ["e", "event-being-nutzapped", "wss://relay.damus.io"],
    ["k", "1"]
  ]
}
```

### Publish to Correct Relays

```typescript
// Publish to the relays listed in the recipient's kind:10019 relay tags
await Promise.all(
  config.relays.map((relay) => pool.publish([relay], signedNutzap)),
);

console.log(
  `Nutzap published to ${config.relays.length} relays from kind:10019`,
);
```

## Step 4: How the Recipient Verifies and Redeems

### Verification

The recipient checks incoming kind:9321 events:

```typescript
async function verifyNutzap(
  nutzap: NostrEvent,
  myConfig: NutzapConfig,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Check the mint URL is in our trusted list (from kind:10019)
  const mintUrl = nutzap.tags.find((t) => t[0] === "u")?.[1];
  if (!mintUrl || !myConfig.mints.some((m) => m.url === mintUrl)) {
    errors.push("Mint not in trusted mint list from kind:10019");
  }

  // 2. Verify proof tags exist and proofs are locked to our P2PK key
  const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
  if (proofTags.length === 0) {
    errors.push("No proof tags found in nutzap");
  }

  for (const proofTag of proofTags) {
    try {
      const proof = JSON.parse(proofTag[1]);
      const secret = JSON.parse(proof.secret);
      if (secret[0] === "P2PK") {
        const lockedTo = secret[1].data;
        const expectedKey = myConfig.p2pkPubkey.startsWith("02")
          ? myConfig.p2pkPubkey
          : `02${myConfig.p2pkPubkey}`;
        if (lockedTo !== expectedKey) {
          errors.push("Proof not locked to our P2PK pubkey");
        }
      }
    } catch {
      errors.push("Invalid proof format");
    }
  }

  // 3. Optionally verify DLEQ proofs (NUT-12) for offline verification

  return { valid: errors.length === 0, errors };
}
```

### Redemption via Token Swap

Once verified, the recipient redeems the nutzap by performing a token swap at
the mint and publishing a kind:7376 redemption event:

```typescript
async function redeemNutzap(
  nutzap: NostrEvent,
  wallet: CashuWallet,
  mySecretKey: Uint8Array,
): Promise<void> {
  // 1. Extract proofs from the nutzap event's proof tags
  const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
  const proofs = proofTags.map((t) => JSON.parse(t[1]));

  // 2. Perform a token swap at the mint to claim the tokens
  // The wallet signs the P2PK unlock condition with the private key
  // corresponding to the kind:10019 pubkey
  const newProofs = await wallet.receive(proofs, {
    privkey: myP2pkPrivateKey,
  });

  // 3. Publish a kind:7376 redemption event to record the redemption
  const redemptionEvent = {
    kind: 7376,
    // Content is NIP-44 encrypted with direction, amount, unit
    content: nip44Encrypt(
      JSON.stringify([
        ["direction", "in"],
        ["amount", totalAmount.toString()],
        ["unit", "sat"],
      ]),
      mySecretKey,
    ),
    tags: [
      // Reference the original nutzap event
      ["e", nutzap.id, "wss://relay.damus.io", "redeemed"],
      // Reference the sender
      ["p", nutzap.pubkey],
    ],
  };

  const signedRedemption = finalizeEvent(redemptionEvent, mySecretKey);
  await pool.publish(relays, signedRedemption);

  console.log("Nutzap redeemed and kind:7376 published");
}
```

## Complete Flow Summary

```
1. Fetch:    Query kind:10019 for recipient's mints, relays, and P2PK pubkey
2. Verify:   Ensure P2PK pubkey ≠ main Nostr pubkey
3. Select:   Choose a mint from kind:10019 mint tags
4. Mint:     Create P2PK-locked tokens with "02" prefix on pubkey
5. Build:    Construct kind:9321 with proof, u, unit, p tags
6. Publish:  Send to relays from kind:10019
7. Redeem:   Recipient swaps tokens and publishes kind:7376
```

## Key Safety Rules

| Rule                          | Why                                                  |
| ----------------------------- | ---------------------------------------------------- |
| P2PK key ≠ Nostr identity key | Prevents token theft via known public key            |
| Always prefix with "02"       | Cashu P2PK expects compressed secp256k1 format       |
| Only use kind:10019 mints     | Recipient may never check untrusted mints            |
| Include DLEQ proofs           | Enables offline verification (NUT-12)                |
| Publish to kind:10019 relays  | Recipient monitors these specific relays for nutzaps |

# Complete Nutzap (NIP-61) Implementation

Here's the complete flow for implementing Nutzap sending as an alternative to
Lightning zaps.

## Step 1: Fetch Recipient's Nutzap Configuration (kind:10019)

First, query for the recipient's nutzap informational event:

```typescript
import { SimplePool } from "nostr-tools";

const pool = new SimplePool();
const recipientPubkey =
  "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245";

const configEvent = await pool.get(relays, {
  kinds: [10019],
  authors: [recipientPubkey],
});

if (!configEvent) {
  throw new Error("Recipient has not published a kind:10019 nutzap config");
}
```

### Parse the Configuration

The kind:10019 event contains `relay`, `mint`, and `pubkey` tags:

```typescript
interface NutzapConfig {
  relays: string[];
  mints: { url: string; units: string[] }[];
  p2pkPubkey: string;
}

function parseNutzapConfig(event: NostrEvent): NutzapConfig {
  const relays = event.tags
    .filter((t) => t[0] === "relay")
    .map((t) => t[1]);

  const mints = event.tags
    .filter((t) => t[0] === "mint")
    .map((t) => ({
      url: t[1],
      units: t.slice(2), // e.g., ["sat", "usd"]
    }));

  const pubkeyTag = event.tags.find((t) => t[0] === "pubkey");
  if (!pubkeyTag) {
    throw new Error(
      "No pubkey tag in kind:10019 — recipient cannot receive nutzaps",
    );
  }

  const p2pkPubkey = pubkeyTag[1];

  // ─── CRITICAL VALIDATION ───
  // The P2PK pubkey MUST NOT be the user's main Nostr pubkey.
  // Using the same key would allow anyone who receives a nutzap
  // addressed to this user to spend the tokens, since the main
  // Nostr key is public. The P2PK key must be a SEPARATE key
  // used exclusively for Cashu token locking.
  if (p2pkPubkey === event.pubkey) {
    throw new Error(
      "P2PK pubkey MUST NOT be the user's main Nostr pubkey — this is a security risk",
    );
  }

  return { relays, mints, p2pkPubkey };
}

const config = parseNutzapConfig(configEvent);
```

Example kind:10019 event:

```json
{
  "kind": 10019,
  "tags": [
    ["relay", "wss://relay.damus.io"],
    ["relay", "wss://nos.lol"],
    ["mint", "https://mint.minibits.cash/Bitcoin", "sat"],
    ["mint", "https://mint.coinos.io", "sat"],
    ["pubkey", "a1b2c3d4e5f6...separate-p2pk-key..."]
  ]
}
```

## Step 2: Mint P2PK-Locked Cashu Tokens

Select a mint from the recipient's trusted list and mint tokens locked to their
P2PK pubkey.

```typescript
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";

// Choose a mint that supports the desired unit
function selectMint(config: NutzapConfig, unit: string = "sat"): string {
  const compatible = config.mints.filter(
    (m) => m.units.length === 0 || m.units.includes(unit),
  );
  if (compatible.length === 0) {
    throw new Error(`No mints in recipient's config support unit: ${unit}`);
  }
  return compatible[0].url;
}

const mintUrl = selectMint(config, "sat");
const mint = new CashuMint(mintUrl);
const wallet = new CashuWallet(mint);

// ─── CRITICAL: Prefix pubkey with "02" ───
// Nostr uses 32-byte x-only pubkeys, but Cashu P2PK (NUT-11) expects
// compressed SEC1 pubkeys (33 bytes with "02" or "03" prefix).
// For nostr<>cashu compatibility, always prefix with "02".
const lockPubkey = config.p2pkPubkey.startsWith("02")
  ? config.p2pkPubkey
  : `02${config.p2pkPubkey}`;

// Mint tokens with P2PK lock and DLEQ proofs
const amountSats = 21;
const { proofs } = await wallet.mintTokens(amountSats, {
  p2pkPubkey: lockPubkey,
  includeDleq: true, // NUT-12: Include DLEQ proofs for verifiability
});

console.log(
  `Minted ${amountSats} sat tokens at ${mintUrl}, locked to ${lockPubkey}`,
);
```

**Key rules for token minting:**

- Only use mints listed in the recipient's kind:10019 `mint` tags
- Always prefix the P2PK pubkey with `"02"` for nostr-cashu compatibility
- Request DLEQ proofs (NUT-12) for offline verification
- The P2PK pubkey MUST NOT be the recipient's main Nostr key — it must be the
  separate key from their kind:10019

## Step 3: Construct and Publish the Nutzap (kind:9321)

```typescript
function buildNutzap(params: {
  senderPubkey: string;
  recipientPubkey: string;
  proofs: CashuProof[];
  mintUrl: string;
  unit?: string;
  eventId?: string;
  eventKind?: number;
  relayHint?: string;
  comment?: string;
}): Omit<NostrEvent, "id" | "sig"> {
  const tags: string[][] = [];

  // Add each proof as a separate tag
  for (const proof of params.proofs) {
    tags.push(["proof", JSON.stringify(proof)]);
  }

  // Mint URL — MUST match exactly as listed in kind:10019
  tags.push(["u", params.mintUrl]);
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
    pubkey: params.senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
  };
}

const nutzapEvent = buildNutzap({
  senderPubkey: myPubkey,
  recipientPubkey: recipientPubkey,
  proofs: proofs,
  mintUrl: mintUrl,
  unit: "sat",
  eventId: "abc123def456...",
  eventKind: 1,
  comment: "Great post!",
});

// Sign the event
const signedNutzap = await signEvent(nutzapEvent, senderPrivateKey);

// IMPORTANT: Publish to the relays from the recipient's kind:10019
await pool.publish(config.relays, signedNutzap);
```

## Step 4: Recipient Verification and Redemption

### Querying for Incoming Nutzaps

```typescript
// Recipient queries for nutzaps from their trusted mints
const trustedMintUrls = config.mints.map((m) => m.url);

const nutzaps = await pool.querySync(config.relays, {
  kinds: [9321],
  "#p": [myPubkey],
  "#u": trustedMintUrls, // Only from mints we trust
});
```

### Verifying a Nutzap

```typescript
function verifyNutzap(
  nutzap: NostrEvent,
  myConfig: NutzapConfig,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Check mint is in our trusted list
  const mintUrl = nutzap.tags.find((t) => t[0] === "u")?.[1];
  if (!mintUrl || !myConfig.mints.some((m) => m.url === mintUrl)) {
    errors.push("Mint not in trusted mint list");
  }

  // 2. Verify proofs are P2PK-locked to our key
  const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
  const expectedKey = myConfig.p2pkPubkey.startsWith("02")
    ? myConfig.p2pkPubkey
    : `02${myConfig.p2pkPubkey}`;

  for (const proofTag of proofTags) {
    try {
      const proof = JSON.parse(proofTag[1]);
      const secret = JSON.parse(proof.secret);
      if (secret[0] === "P2PK") {
        if (secret[1].data !== expectedKey) {
          errors.push("Proof not locked to our P2PK pubkey");
        }
      }
    } catch {
      errors.push("Invalid proof format");
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Redeeming (Swapping) Tokens

```typescript
async function redeemNutzap(
  nutzap: NostrEvent,
  wallet: CashuWallet,
): Promise<CashuProof[]> {
  const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
  const proofs = proofTags.map((t) => JSON.parse(t[1]));

  // Swap tokens into our wallet — this claims them
  const newProofs = await wallet.receive(proofs);
  return newProofs;
}

const newProofs = await redeemNutzap(nutzapEvent, wallet);
```

### Publishing the Redemption Record (kind:7376)

After successfully swapping, publish a kind:7376 event to record it:

```typescript
function buildRedemptionRecord(params: {
  nutzapEventId: string;
  senderPubkey: string;
  amount: string;
  unit: string;
}): Omit<NostrEvent, "id" | "sig" | "pubkey" | "created_at"> {
  // Content is NIP-44 encrypted
  const contentTags = [
    ["direction", "in"],
    ["amount", params.amount],
    ["unit", params.unit],
  ];

  return {
    kind: 7376,
    content: nip44Encrypt(JSON.stringify(contentTags)),
    tags: [
      ["e", params.nutzapEventId, "", "redeemed"],
      ["p", params.senderPubkey],
    ],
  };
}

const redemption = buildRedemptionRecord({
  nutzapEventId: signedNutzap.id,
  senderPubkey: signedNutzap.pubkey,
  amount: "21",
  unit: "sat",
});

await pool.publish(config.relays, await signEvent(redemption, myPrivateKey));
```

## Flow Summary

```
Sender:
1. Fetch recipient's kind:10019 → get relays, mints, P2PK pubkey
2. Verify P2PK pubkey ≠ main Nostr key (MUST be separate)
3. Choose a mint from recipient's list
4. Mint P2PK-locked tokens (prefix pubkey with "02")
5. Build kind:9321 with proof, u, unit, p tags
6. Publish to recipient's kind:10019 relays

Recipient:
1. Query kind:9321 filtered by #p and #u (trusted mints)
2. Verify mint is trusted and proofs are locked to correct key
3. Swap/redeem tokens via Cashu wallet
4. Publish kind:7376 redemption record
```

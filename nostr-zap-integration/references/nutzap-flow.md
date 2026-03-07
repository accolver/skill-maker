# NIP-61 Nutzap Flow

Complete step-by-step reference for implementing Cashu-based Nutzaps in Nostr
applications.

## Overview

Nutzaps are an alternative to Lightning Zaps that use Cashu ecash tokens. The
payment itself is the receipt — no LNURL server needed. Tokens are P2PK-locked
to a recipient-specified public key and published as Nostr events.

## Protocol Flow

```
Sender                    Cashu Mint              Relays
  |                           |                      |
  |-- Fetch kind:10019 -------|--------------------->|
  |<-- {mints, pubkey, relays}|                      |
  |                           |                      |
  |-- Mint P2PK token ------->|                      |
  |<-- {proofs} --------------|                      |
  |                           |                      |
  |-- Publish kind:9321 ------|--------------------->|
  |                           |                      |
  |                    Recipient                     |
  |                       |-- Fetch kind:9321 ------>|
  |                       |<-- {proofs} -------------|
  |                       |                          |
  |                       |-- Swap token ----------->|
  |                       |<-- {new proofs} ---------|
  |                       |                          |
  |                       |-- Publish kind:7376 ---->|
```

## Step 1: Fetch Recipient's Configuration (kind:10019)

Query for the recipient's nutzap informational event:

```typescript
const filter = {
  kinds: [10019],
  authors: [recipientPubkey],
};
```

### Parse the Configuration

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
      units: t.slice(2), // Additional elements are supported units
    }));

  const pubkeyTag = event.tags.find((t) => t[0] === "pubkey");
  if (!pubkeyTag) throw new Error("No pubkey tag in kind:10019");

  return {
    relays,
    mints,
    p2pkPubkey: pubkeyTag[1],
  };
}
```

### Validation Checks

- At least one `relay` tag must be present
- At least one `mint` tag must be present
- `pubkey` tag MUST be present
- `pubkey` value MUST NOT equal the event's `.pubkey` (the user's main key)
- Mints SHOULD support NUT-11 (P2PK) and NUT-12 (DLEQ proofs)

## Step 2: Mint P2PK-Locked Tokens

### Choose a Mint

Select a mint from the recipient's `mint` tags. Check that it supports the
desired unit (e.g., "sat"):

```typescript
function selectMint(config: NutzapConfig, unit: string = "sat"): string {
  const compatible = config.mints.filter(
    (m) => m.units.length === 0 || m.units.includes(unit),
  );
  if (compatible.length === 0) {
    throw new Error(`No mints support unit: ${unit}`);
  }
  return compatible[0].url;
}
```

### Mint or Swap Tokens

Use a Cashu library (e.g., `@cashu/cashu-ts`) to mint tokens P2PK-locked to the
recipient's pubkey:

```typescript
import { CashuMint, CashuWallet } from "@cashu/cashu-ts";

async function mintNutzapTokens(
  mintUrl: string,
  amountSats: number,
  recipientP2pkPubkey: string,
): Promise<CashuProof[]> {
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint);

  // CRITICAL: Prefix pubkey with "02" for nostr<>cashu compatibility
  const lockPubkey = recipientP2pkPubkey.startsWith("02")
    ? recipientP2pkPubkey
    : `02${recipientP2pkPubkey}`;

  // Mint tokens with P2PK lock
  const { proofs } = await wallet.mintTokens(amountSats, {
    p2pkPubkey: lockPubkey,
    includeDleq: true, // NUT-12: Include DLEQ proofs
  });

  return proofs;
}
```

**Critical rules:**

- Always prefix the P2PK pubkey with `"02"` (compressed key format)
- Always request DLEQ proofs (NUT-12) for verifiability
- Only use mints listed in the recipient's kind:10019
- The mint URL in the nutzap MUST match EXACTLY as listed in kind:10019

## Step 3: Construct and Publish the Nutzap (kind:9321)

```typescript
function buildNutzap(params: {
  senderPubkey: string;
  recipientPubkey: string; // Nostr identity pubkey, NOT P2PK key
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

  tags.push(["u", params.mintUrl]);
  tags.push(["unit", params.unit || "sat"]);
  tags.push(["p", params.recipientPubkey]);

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
```

### Tag Reference for kind:9321

| Tag     | Required | Format                           | Notes                          |
| ------- | -------- | -------------------------------- | ------------------------------ |
| `proof` | YES      | `["proof", "<json>"]`            | One or more proof tags         |
| `u`     | YES      | `["u", "<mint-url>"]`            | EXACT match to kind:10019      |
| `unit`  | NO       | `["unit", "sat"]`                | Default: "sat" if omitted      |
| `p`     | YES      | `["p", "<nostr-pubkey>"]`        | Recipient's Nostr identity key |
| `e`     | NO       | `["e", "<event-id>", "<relay>"]` | Event being nutzapped          |
| `k`     | NO       | `["k", "<kind>"]`                | Kind of nutzapped event        |

### Publish to Correct Relays

Publish the kind:9321 event to the relays listed in the recipient's kind:10019
`relay` tags. Failure to publish to these relays means the recipient may never
see the nutzap.

## Step 4: Receiving Nutzaps

### Query for Incoming Nutzaps

```typescript
function buildNutzapFilter(
  myPubkey: string,
  trustedMints: string[],
  since?: number,
): NostrFilter {
  return {
    kinds: [9321],
    "#p": [myPubkey],
    "#u": trustedMints, // Only from mints we trust
    ...(since ? { since } : {}),
  };
}
```

### Process and Redeem

```typescript
async function redeemNutzap(
  nutzapEvent: NostrEvent,
  wallet: CashuWallet,
): Promise<CashuProof[]> {
  // Extract proofs from the event
  const proofTags = nutzapEvent.tags.filter((t) => t[0] === "proof");
  const proofs = proofTags.map((t) => JSON.parse(t[1]));

  // Verify mint URL matches a trusted mint
  const mintUrl = nutzapEvent.tags.find((t) => t[0] === "u")?.[1];
  if (!mintUrl) throw new Error("Missing mint URL");

  // Swap tokens into our wallet (this claims them)
  const newProofs = await wallet.receive(proofs);

  return newProofs;
}
```

### Record Redemption (kind:7376)

After successfully swapping tokens, publish a kind:7376 event to record the
redemption:

```typescript
function buildRedemptionRecord(params: {
  nutzapEventId: string;
  nutzapRelayHint?: string;
  senderPubkey: string;
  amount: string;
  unit: string;
  newTokenEventId?: string;
  newTokenRelayHint?: string;
}): Omit<NostrEvent, "id" | "sig" | "pubkey" | "created_at"> {
  // Content is NIP-44 encrypted
  const contentTags = [
    ["direction", "in"],
    ["amount", params.amount],
    ["unit", params.unit],
  ];

  if (params.newTokenEventId) {
    const tag = ["e", params.newTokenEventId];
    if (params.newTokenRelayHint) tag.push(params.newTokenRelayHint);
    tag.push("created");
    contentTags.push(tag);
  }

  return {
    kind: 7376,
    content: nip44Encrypt(JSON.stringify(contentTags)), // NIP-44 encrypted
    tags: [
      ["e", params.nutzapEventId, params.nutzapRelayHint || "", "redeemed"],
      ["p", params.senderPubkey],
    ],
  };
}
```

## Step 5: Verifying Nutzaps (Observer)

Clients displaying nutzap counts or amounts should verify:

```typescript
function verifyNutzap(
  nutzap: NostrEvent,
  recipientConfig: NostrEvent, // kind:10019
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = parseNutzapConfig(recipientConfig);

  // 1. Check mint is in recipient's trusted list
  const mintUrl = nutzap.tags.find((t) => t[0] === "u")?.[1];
  if (!mintUrl || !config.mints.some((m) => m.url === mintUrl)) {
    errors.push("Mint not in recipient's trusted mint list");
  }

  // 2. Check proofs are locked to the correct pubkey
  const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
  for (const proofTag of proofTags) {
    try {
      const proof = JSON.parse(proofTag[1]);
      const secret = JSON.parse(proof.secret);
      if (secret[0] === "P2PK") {
        const lockedTo = secret[1].data;
        const expectedKey = config.p2pkPubkey.startsWith("02")
          ? config.p2pkPubkey
          : `02${config.p2pkPubkey}`;
        if (lockedTo !== expectedKey) {
          errors.push("Proof not locked to recipient's P2PK pubkey");
        }
      }
    } catch {
      errors.push("Invalid proof format");
    }
  }

  // 3. Verify DLEQ proofs (offline verification)
  // This requires the mint's keyset - implementation depends on Cashu library

  return { valid: errors.length === 0, errors };
}
```

All verification can be done offline (given the mint's keyset and the
recipient's kind:10019), making it fast and scalable.

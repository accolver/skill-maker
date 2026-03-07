# Complete Nutzap (NIP-61) Implementation

Here's the full flow for sending Cashu-based Nutzaps as an alternative to
Lightning zaps.

## Step 1: Fetch Recipient's Nutzap Configuration (kind: 10019)

First, query for the recipient's kind:10019 nutzap informational event to
discover their trusted mints, preferred relays, and P2PK pubkey:

```typescript
import { SimplePool } from "nostr-tools";

const pool = new SimplePool();
const recipientPubkey = "recipient-nostr-pubkey-hex";

// Fetch the recipient's nutzap config (kind: 10019 — a replaceable event)
const configEvents = await pool.querySync(
  ["wss://relay.damus.io", "wss://nos.lol"],
  {
    kinds: [10019],
    authors: [recipientPubkey],
  },
);

if (configEvents.length === 0) {
  throw new Error("Recipient has no nutzap configuration (kind:10019)");
}

// Use the most recent event (replaceable, so there should be one)
const configEvent = configEvents[0];
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
  // Extract relay URLs
  const relays = event.tags
    .filter((t) => t[0] === "relay")
    .map((t) => t[1]);

  // Extract mint URLs and their supported units
  const mints = event.tags
    .filter((t) => t[0] === "mint")
    .map((t) => ({
      url: t[1],
      units: t.slice(2), // Additional elements are supported units (e.g., "sat", "usd")
    }));

  // Extract the P2PK pubkey for token locking
  const pubkeyTag = event.tags.find((t) => t[0] === "pubkey");
  if (!pubkeyTag) {
    throw new Error("No pubkey tag in kind:10019 — cannot send nutzap");
  }

  return { relays, mints, p2pkPubkey: pubkeyTag[1] };
}

const config = parseNutzapConfig(configEvent);
```

Example kind:10019 event:

```json
{
  "kind": 10019,
  "pubkey": "recipient-main-nostr-key",
  "tags": [
    ["relay", "wss://relay.damus.io"],
    ["relay", "wss://nos.lol"],
    ["mint", "https://mint.minibits.cash/Bitcoin", "sat"],
    ["mint", "https://mint.coinos.io", "sat"],
    ["pubkey", "a1b2c3d4e5f6...separate-p2pk-key..."]
  ]
}
```

### Critical P2PK Pubkey Validation

**WARNING: The P2PK pubkey in the `pubkey` tag MUST NOT be the user's main Nostr
pubkey.** This is a separate key used exclusively for P2PK token locking. If
they're the same key, anyone could spend received tokens by obtaining the Nostr
private key.

```typescript
// CRITICAL: Verify the P2PK pubkey is NOT the same as the Nostr identity key
if (config.p2pkPubkey === configEvent.pubkey) {
  throw new Error(
    "SECURITY ERROR: P2PK pubkey in kind:10019 equals the user's main Nostr pubkey. " +
      "This is unsafe — the P2PK key MUST be a separate key. " +
      "Do NOT send nutzaps to this recipient until they fix their configuration.",
  );
}
```

## Step 2: Mint P2PK-Locked Cashu Tokens

Choose a mint from the recipient's trusted list and mint tokens locked to their
P2PK pubkey:

```typescript
import { CashuMint, CashuWallet, getEncodedToken } from "@cashu/cashu-ts";

// Select a compatible mint from the recipient's config
function selectMint(config: NutzapConfig, unit: string = "sat"): string {
  const compatible = config.mints.filter(
    (m) => m.units.length === 0 || m.units.includes(unit),
  );
  if (compatible.length === 0) {
    throw new Error(`No mints support unit: ${unit}`);
  }
  // Use the first compatible mint URL from the recipient's kind:10019
  return compatible[0].url;
}

const mintUrl = selectMint(config, "sat");
const mint = new CashuMint(mintUrl);
const wallet = new CashuWallet(mint);

// Load the mint's keyset
await wallet.loadMint();

// CRITICAL: Prefix the P2PK pubkey with "02" for nostr-cashu compatibility
// Cashu P2PK (NUT-11) expects compressed public keys in SEC format,
// which requires the "02" prefix for even y-coordinate keys
const p2pkLockPubkey = config.p2pkPubkey.startsWith("02")
  ? config.p2pkPubkey
  : `02${config.p2pkPubkey}`;

// Mint tokens P2PK-locked to the recipient's pubkey
const amountSats = 21; // Amount to send
const { proofs } = await wallet.mintTokens(amountSats, {
  p2pkPubkey: p2pkLockPubkey,
  includeDleq: true, // NUT-12: Include DLEQ proofs for verifiability
});

console.log(`Minted ${amountSats} sat token(s) at ${mintUrl}`);
console.log(`Locked to P2PK pubkey: ${p2pkLockPubkey}`);
```

### Why the "02" Prefix?

Nostr uses 32-byte (x-only) public keys, but Cashu's P2PK implementation
(NUT-11) expects 33-byte compressed SEC format public keys. The `02` prefix
indicates an even y-coordinate, which is the standard assumption for Nostr keys.
Without this prefix, the P2PK lock will fail or create tokens the recipient
cannot redeem.

## Step 3: Construct and Publish the Nutzap (kind: 9321)

Build the kind:9321 nutzap event with proof, mint URL, unit, and recipient tags:

```typescript
function buildNutzapEvent(params: {
  proofs: CashuProof[];
  mintUrl: string;
  recipientPubkey: string;
  eventId?: string;
  eventKind?: number;
  relayHint?: string;
  comment?: string;
}): UnsignedEvent {
  const tags: string[][] = [];

  // Add each Cashu proof as a separate "proof" tag
  for (const proof of params.proofs) {
    tags.push(["proof", JSON.stringify(proof)]);
  }

  // Mint URL — MUST match exactly as listed in kind:10019
  tags.push(["u", params.mintUrl]);

  // Unit (default: sat)
  tags.push(["unit", "sat"]);

  // Recipient's Nostr identity pubkey (NOT the P2PK key)
  tags.push(["p", params.recipientPubkey]);

  // Optional: reference to the event being nutzapped
  if (params.eventId) {
    const eTag = ["e", params.eventId];
    if (params.relayHint) eTag.push(params.relayHint);
    tags.push(eTag);
  }

  // Optional: kind of the event being nutzapped
  if (params.eventKind !== undefined) {
    tags.push(["k", params.eventKind.toString()]);
  }

  return {
    kind: 9321,
    content: params.comment || "",
    created_at: Math.floor(Date.now() / 1000),
    tags,
  };
}

// Build the nutzap event
const nutzapEvent = buildNutzapEvent({
  proofs,
  mintUrl,
  recipientPubkey,
  eventId: "abc123...", // Event being nutzapped
  eventKind: 1, // Kind of that event
  relayHint: "wss://relay.damus.io",
  comment: "Great post!",
});

// Sign and publish to the recipient's specified relays
const signedNutzap = finalizeEvent(nutzapEvent, senderSecretKey);

// IMPORTANT: Publish to the relays from the recipient's kind:10019 config
await Promise.all(
  config.relays.map((relay) => pool.publish([relay], signedNutzap)),
);

console.log("Nutzap published to relays:", config.relays);
```

## Step 4: How the Recipient Verifies and Redeems the Nutzap

### Verification

When the recipient receives a kind:9321 event, they verify it before redemption:

```typescript
function verifyNutzap(
  nutzap: NostrEvent,
  recipientConfig: NutzapConfig,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check 1: Verify the mint URL is in the recipient's trusted list
  const mintUrl = nutzap.tags.find((t) => t[0] === "u")?.[1];
  if (!mintUrl || !recipientConfig.mints.some((m) => m.url === mintUrl)) {
    errors.push(
      "Mint URL is not in recipient's trusted mint list (kind:10019). " +
        "Tokens from untrusted mints should be ignored.",
    );
  }

  // Check 2: Verify proofs are P2PK-locked to the correct pubkey
  const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
  const expectedKey = recipientConfig.p2pkPubkey.startsWith("02")
    ? recipientConfig.p2pkPubkey
    : `02${recipientConfig.p2pkPubkey}`;

  for (const proofTag of proofTags) {
    try {
      const proof = JSON.parse(proofTag[1]);
      const secret = JSON.parse(proof.secret);
      if (secret[0] === "P2PK") {
        const lockedTo = secret[1].data;
        if (lockedTo !== expectedKey) {
          errors.push(
            `Proof locked to wrong P2PK key: ${lockedTo}, expected ${expectedKey}`,
          );
        }
      } else {
        errors.push("Proof is not P2PK-locked");
      }
    } catch {
      errors.push("Invalid proof format in nutzap");
    }
  }

  // Check 3: Verify DLEQ proofs (NUT-12) for offline verification
  // This ensures the mint actually signed these proofs
  // Implementation depends on the Cashu library being used

  return { valid: errors.length === 0, errors };
}
```

### Redemption via Token Swap

Once verified, the recipient redeems the nutzap by swapping the P2PK-locked
tokens:

```typescript
async function redeemNutzap(
  nutzap: NostrEvent,
  wallet: CashuWallet,
  p2pkPrivateKey: Uint8Array,
): Promise<CashuProof[]> {
  // Extract proofs from proof tags
  const proofTags = nutzap.tags.filter((t) => t[0] === "proof");
  const proofs = proofTags.map((t) => JSON.parse(t[1]));

  // Swap tokens — this claims them by proving ownership of the P2PK private key
  // The mint verifies the P2PK signature and issues new proofs to the recipient
  const newProofs = await wallet.receive(proofs, {
    privkey: p2pkPrivateKey,
  });

  return newProofs;
}

// After successful redemption, publish a kind:7376 event to record it
function buildRedemptionRecord(
  nutzapEventId: string,
  senderPubkey: string,
  amount: number,
  nutzapRelayHint?: string,
): UnsignedEvent {
  // Content tags are NIP-44 encrypted
  const contentTags = [
    ["direction", "in"],
    ["amount", amount.toString()],
    ["unit", "sat"],
  ];

  return {
    kind: 7376,
    // NIP-44 encrypt the content tags
    content: nip44Encrypt(JSON.stringify(contentTags)),
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", nutzapEventId, nutzapRelayHint || "", "redeemed"],
      ["p", senderPubkey],
    ],
  };
}

// Publish the redemption record
const redemptionEvent = buildRedemptionRecord(
  signedNutzap.id,
  senderPubkey,
  amountSats,
  "wss://relay.damus.io",
);
const signedRedemption = finalizeEvent(redemptionEvent, recipientSecretKey);
await pool.publish(config.relays, signedRedemption);
```

## Complete Flow Summary

```
1. Fetch recipient's kind:10019 → get mints, relays, P2PK pubkey
2. Validate P2PK pubkey ≠ main Nostr pubkey (SECURITY CHECK)
3. Select a trusted mint from kind:10019 mint tags
4. Mint P2PK-locked tokens with "02"-prefixed pubkey
5. Build kind:9321 with proof, u, unit, p tags
6. Publish kind:9321 to relays from kind:10019
7. Recipient verifies: trusted mint + correct P2PK lock
8. Recipient redeems: token swap → new proofs
9. Recipient publishes kind:7376 redemption record
```

## Key Differences from Lightning Zaps

| Aspect       | Lightning Zap (NIP-57)         | Nutzap (NIP-61)               |
| ------------ | ------------------------------ | ----------------------------- |
| Payment      | Lightning invoice              | Cashu ecash token             |
| Receipt      | LNURL server creates kind:9735 | The kind:9321 IS the receipt  |
| Trust        | Trust LNURL server             | Trust the Cashu mint          |
| Config       | lud16/lud06 in profile         | kind:10019 event              |
| Verification | Check receipt pubkey           | Check P2PK lock + mint        |
| Key concern  | nostrPubkey validation         | P2PK ≠ Nostr key, "02" prefix |

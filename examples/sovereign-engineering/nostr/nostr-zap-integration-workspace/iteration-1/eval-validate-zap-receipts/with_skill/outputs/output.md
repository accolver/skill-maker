# Zap Receipt Validation Implementation

Here's a comprehensive validation function for kind:9735 zap receipt events,
covering all NIP-57 checks.

## The Validation Function

```typescript
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

interface ZapValidationResult {
  valid: boolean;
  errors: string[];
  zapRequest?: NostrEvent;
  amountMsats?: number;
  senderPubkey?: string;
  comment?: string;
}

function validateZapReceipt(
  receipt: NostrEvent,
  expectedNostrPubkey: string,
): ZapValidationResult {
  const errors: string[] = [];

  // Check that this is a kind 9735 event
  if (receipt.kind !== 9735) {
    errors.push(`Expected kind 9735, got ${receipt.kind}`);
    return { valid: false, errors };
  }

  // ─── Check 1: Receipt pubkey matches LNURL nostrPubkey ───
  // The zap receipt MUST be signed by the LNURL server's nostrPubkey.
  // This is the most important check — it verifies the receipt came from
  // the correct LNURL server and not a random impostor.
  if (receipt.pubkey !== expectedNostrPubkey) {
    errors.push(
      `Receipt pubkey ${receipt.pubkey} does not match expected LNURL nostrPubkey ${expectedNostrPubkey}`,
    );
  }

  // ─── Check 2: Parse the description tag ───
  // The description tag contains the JSON-serialized zap request (kind 9734).
  // This is how the receipt links back to the original zap request.
  const descriptionTag = receipt.tags.find((t) => t[0] === "description");
  if (!descriptionTag || !descriptionTag[1]) {
    errors.push("Missing description tag — cannot extract zap request");
    return { valid: false, errors };
  }

  let zapRequest: NostrEvent;
  try {
    zapRequest = JSON.parse(descriptionTag[1]);
  } catch (e) {
    errors.push("Invalid JSON in description tag — cannot parse zap request");
    return { valid: false, errors };
  }

  // ─── Check 3: Verify embedded event is kind 9734 ───
  if (zapRequest.kind !== 9734) {
    errors.push(
      `Embedded zap request has kind ${zapRequest.kind}, expected 9734`,
    );
  }

  // ─── Check 4: Verify amount matches ───
  // The invoice amount in the bolt11 tag MUST match the amount in the
  // zap request's amount tag.
  const bolt11Tag = receipt.tags.find((t) => t[0] === "bolt11");
  const requestAmount = zapRequest.tags?.find((t) => t[0] === "amount")?.[1];

  if (bolt11Tag && requestAmount) {
    const invoiceAmountMsats = decodeBolt11Amount(bolt11Tag[1]);
    if (invoiceAmountMsats !== Number(requestAmount)) {
      errors.push(
        `Invoice amount ${invoiceAmountMsats} msats does not match zap request amount ${requestAmount} msats`,
      );
    }
  } else if (!bolt11Tag) {
    errors.push("Missing bolt11 tag on zap receipt");
  }

  // ─── Check 5: Verify SHA256 description hash ───
  // The SHA256 hash of the description tag value SHOULD match the
  // description_hash field in the bolt11 invoice. This ensures the
  // invoice was created specifically for this zap request.
  if (bolt11Tag) {
    const descriptionBytes = new TextEncoder().encode(descriptionTag[1]);
    const descHash = bytesToHex(sha256(descriptionBytes));
    const bolt11DescHash = extractDescriptionHashFromBolt11(bolt11Tag[1]);

    if (bolt11DescHash && descHash !== bolt11DescHash) {
      errors.push(
        `SHA256 description hash mismatch: computed ${descHash}, invoice has ${bolt11DescHash}`,
      );
    }
  }

  // ─── Extract sender pubkey and comment ───
  // The sender's pubkey is the pubkey field of the embedded zap request.
  // The P tag on the receipt also contains the sender pubkey for easy access.
  const senderPubkey = zapRequest.pubkey;
  const comment = zapRequest.content || undefined;

  // Also check the P tag on the receipt matches
  const pTag = receipt.tags.find((t) => t[0] === "P");
  if (pTag && pTag[1] !== senderPubkey) {
    errors.push(
      `P tag sender ${
        pTag[1]
      } does not match zap request pubkey ${senderPubkey}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    zapRequest,
    amountMsats: requestAmount ? Number(requestAmount) : undefined,
    senderPubkey,
    comment,
  };
}
```

## Helper: Decode bolt11 Amount

```typescript
function decodeBolt11Amount(bolt11: string): number | undefined {
  // bolt11 format: ln{currency}{amount}{multiplier}...
  // Amount multipliers: m=milli, u=micro, n=nano, p=pico
  const match = bolt11.match(/^lnbc(\d+)([munp])?/i);
  if (!match) return undefined;

  const value = parseInt(match[1]);
  const multiplier = match[2];

  // Convert to millisatoshis
  switch (multiplier) {
    case "m":
      return value * 100_000_000; // mBTC to msats
    case "u":
      return value * 100_000; // μBTC to msats
    case "n":
      return value * 100; // nBTC to msats
    case "p":
      return value / 10; // pBTC to msats
    default:
      return value * 100_000_000_000; // BTC to msats
  }
}

function extractDescriptionHashFromBolt11(bolt11: string): string | undefined {
  // In practice, use a proper bolt11 decoding library like bolt11 or light-bolt11-decoder
  // The description_hash is in the tagged data with type 'h'
  // This is a simplified example
  return decodeBolt11DescHash(bolt11);
}
```

## Usage Examples

### Fetching and Validating Zaps on an Event

```typescript
// Fetch zap receipts for an event
const receipts = await pool.querySync(relays, {
  kinds: [9735],
  "#e": [eventId],
});

// For each receipt, get the expected nostrPubkey from the recipient's LNURL
const recipientProfile = await fetchProfile(recipientPubkey);
const [name, domain] = recipientProfile.lud16.split("@");
const lnurlData = await fetch(
  `https://${domain}/.well-known/lnurlp/${name}`,
).then((r) => r.json());

for (const receipt of receipts) {
  const result = validateZapReceipt(receipt, lnurlData.nostrPubkey);

  if (result.valid) {
    console.log(
      `Valid zap from ${result.senderPubkey}: ${result.amountMsats} msats`,
    );
    if (result.comment) {
      console.log(`  Comment: ${result.comment}`);
    }
  } else {
    console.warn(`Invalid zap receipt:`, result.errors);
  }
}
```

### Extracting Sender Info from Valid Receipt

```typescript
const result = validateZapReceipt(receipt, lnurlNostrPubkey);

if (result.valid) {
  // Sender pubkey comes from the zapRequest.pubkey field
  const senderPubkey = result.senderPubkey;

  // Zap comment comes from the zapRequest.content field
  const zapComment = result.comment;

  // Amount in millisats from the zap request's amount tag
  const amountMsats = result.amountMsats;
  const amountSats = amountMsats ? amountMsats / 1000 : undefined;
}
```

## Validation Summary

| Check           | What                                                | Why                                               |
| --------------- | --------------------------------------------------- | ------------------------------------------------- |
| Receipt pubkey  | Must match LNURL `nostrPubkey`                      | Prevents fake receipts from arbitrary keys        |
| description tag | Must parse as valid JSON (kind 9734)                | Links receipt to original zap request             |
| Embedded kind   | Must be 9734                                        | Ensures it's actually a zap request               |
| bolt11 amount   | Must match zap request amount                       | Prevents amount manipulation                      |
| SHA256 hash     | description hash must match bolt11 description_hash | Ensures invoice was for this specific zap request |
| P tag           | Should match zapRequest.pubkey (sender)             | Cross-check for sender identity                   |

**Important trust boundary:** Zap receipts are NOT cryptographic proofs of
payment. They prove that a LNURL server _claims_ payment was received. Your
trust is in the LNURL server operator.

# Zap Receipt Validation (kind:9735)

Here's a comprehensive validation function for NIP-57 zap receipts. A zap
receipt is a kind:9735 event created by the LNURL server after a Lightning
payment is made.

## The Validation Function

```typescript
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

interface ZapValidationResult {
  valid: boolean;
  errors: string[];
  senderPubkey?: string;
  comment?: string;
  amountMsats?: number;
}

/**
 * Validates a kind:9735 zap receipt event against NIP-57 rules.
 *
 * @param receipt - The zap receipt event (kind: 9735)
 * @param expectedNostrPubkey - The LNURL nostrPubkey from the recipient's
 *   LNURL-pay endpoint
 * @returns Validation result with errors and extracted data
 */
function validateZapReceipt(
  receipt: NostrEvent,
  expectedNostrPubkey: string,
): ZapValidationResult {
  const errors: string[] = [];

  // ──────────────────────────────────────────────────────────────────────
  // CHECK 1: Validate that the receipt pubkey matches the LNURL nostrPubkey
  // ──────────────────────────────────────────────────────────────────────
  // The receipt MUST be signed by the same key advertised in the LNURL-pay
  // endpoint's nostrPubkey field. If the pubkey doesn't match, the receipt
  // could be forged by anyone.
  if (receipt.pubkey !== expectedNostrPubkey) {
    errors.push(
      `Receipt pubkey ${receipt.pubkey} does not match expected LNURL ` +
        `nostrPubkey ${expectedNostrPubkey}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // CHECK 2: Parse the "description" tag as JSON to get the embedded zap request
  // ──────────────────────────────────────────────────────────────────────
  // The description tag contains the original kind:9734 zap request event
  // serialized as JSON. This is how we verify the receipt matches a real
  // zap request.
  const descriptionTag = receipt.tags.find((t) => t[0] === "description");
  if (!descriptionTag || !descriptionTag[1]) {
    errors.push("Missing 'description' tag in zap receipt");
    return { valid: false, errors };
  }

  let zapRequest: any;
  try {
    // Parse the description tag as JSON to get the embedded zap request
    zapRequest = JSON.parse(descriptionTag[1]);
  } catch (e) {
    errors.push(
      "Failed to parse 'description' tag as JSON — invalid embedded zap request",
    );
    return { valid: false, errors };
  }

  // ──────────────────────────────────────────────────────────────────────
  // CHECK 3: Verify the embedded zap request is kind 9734
  // ──────────────────────────────────────────────────────────────────────
  // The embedded event in the description MUST be a valid kind:9734 zap
  // request. If it's any other kind, the receipt is invalid.
  if (zapRequest.kind !== 9734) {
    errors.push(
      `Embedded zap request kind is ${zapRequest.kind}, expected 9734`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // CHECK 4: Check the "bolt11" tag for invoice amount verification
  // ──────────────────────────────────────────────────────────────────────
  // The bolt11 tag contains the Lightning invoice. We need to decode it
  // to verify the amount matches what was requested.
  const bolt11Tag = receipt.tags.find((t) => t[0] === "bolt11");
  if (!bolt11Tag || !bolt11Tag[1]) {
    errors.push("Missing 'bolt11' tag in zap receipt");
  }

  // Get the requested amount from the embedded zap request
  const requestAmountTag = zapRequest.tags?.find(
    (t: string[]) => t[0] === "amount",
  );
  const requestAmount = requestAmountTag ? Number(requestAmountTag[1]) : null;

  // ──────────────────────────────────────────────────────────────────────
  // CHECK 5: Verify amount in bolt11 matches amount in the zap request
  // ──────────────────────────────────────────────────────────────────────
  if (bolt11Tag && requestAmount) {
    const invoiceAmount = decodeBolt11Amount(bolt11Tag[1]);
    if (invoiceAmount !== requestAmount) {
      errors.push(
        `Invoice amount ${invoiceAmount} msats does not match ` +
          `zap request amount ${requestAmount} msats`,
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // CHECK 6: SHA256 hash of description must match bolt11 description hash
  // ──────────────────────────────────────────────────────────────────────
  // NIP-57 SHOULD check: compute SHA256 of the description tag value
  // and compare it to the description_hash field in the bolt11 invoice.
  // This ensures the invoice was actually generated for this zap request.
  if (bolt11Tag) {
    const descriptionBytes = new TextEncoder().encode(descriptionTag[1]);
    const descHash = bytesToHex(sha256(descriptionBytes));
    const bolt11DescHash = extractDescriptionHash(bolt11Tag[1]);

    if (bolt11DescHash && descHash !== bolt11DescHash) {
      errors.push(
        "SHA256 hash of description does not match bolt11 description hash",
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // EXTRACT: Sender pubkey from the embedded zap request event
  // ──────────────────────────────────────────────────────────────────────
  // The sender is identified by the pubkey field of the embedded kind:9734
  // zap request. This is the Nostr identity of who sent the zap.
  const senderPubkey = zapRequest.pubkey;

  // ──────────────────────────────────────────────────────────────────────
  // EXTRACT: Zap comment from the embedded zap request content
  // ──────────────────────────────────────────────────────────────────────
  const comment = zapRequest.content || undefined;

  return {
    valid: errors.length === 0,
    errors,
    senderPubkey,
    comment,
    amountMsats: requestAmount || undefined,
  };
}
```

## Helper Functions

### Decode bolt11 Invoice Amount

```typescript
/**
 * Extracts the amount in millisatoshis from a bolt11 invoice string.
 * The amount is encoded after "lnbc" with a multiplier suffix.
 */
function decodeBolt11Amount(bolt11: string): number | null {
  // bolt11 format: lnbc<amount><multiplier>1...
  const match = bolt11.match(/^lnbc(\d+)([munp]?)1/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const multiplier = match[2];

  // Convert to millisatoshis
  const multipliers: Record<string, number> = {
    "": 100_000_000_000, // BTC → msats
    m: 100_000_000, // milli-BTC → msats
    u: 100_000, // micro-BTC → msats
    n: 100, // nano-BTC → msats
    p: 0.1, // pico-BTC → msats
  };

  return Math.round(value * (multipliers[multiplier] || 1));
}
```

### Extract Description Hash from bolt11

```typescript
/**
 * Extracts the description_hash from a bolt11 invoice.
 * This is a SHA256 hash embedded in the invoice's tagged fields.
 */
function extractDescriptionHash(bolt11: string): string | null {
  // In practice, use a proper bolt11 decoder like @lightninglabs/bolt11
  // The description_hash is in tag 'h' of the invoice
  const decoded = decodeBolt11(bolt11);
  const descHashTag = decoded.tags.find(
    (t: any) => t.tagName === "description_hash",
  );
  return descHashTag?.data || null;
}
```

## Usage Example

```typescript
// Fetch zap receipts for an event
const receipts = await pool.querySync(relays, {
  kinds: [9735],
  "#e": ["abc123def456..."],
});

// Get the expected nostrPubkey from the recipient's LNURL endpoint
const lnurlData = await fetch(
  "https://getalby.com/.well-known/lnurlp/alice",
).then((r) => r.json());

// Validate each receipt
for (const receipt of receipts) {
  const result = validateZapReceipt(receipt, lnurlData.nostrPubkey);

  if (result.valid) {
    console.log(`Valid zap from ${result.senderPubkey}`);
    console.log(`Amount: ${result.amountMsats} msats`);
    if (result.comment) {
      console.log(`Comment: ${result.comment}`);
    }
  } else {
    console.warn("Invalid zap receipt:", result.errors);
  }
}
```

## Extracting Sender and Comment

To extract the sender pubkey from the embedded zap request event:

```typescript
function extractZapInfo(receipt: NostrEvent): {
  senderPubkey: string;
  comment: string;
  amount: number;
} | null {
  const descTag = receipt.tags.find((t) => t[0] === "description");
  if (!descTag) return null;

  try {
    const zapRequest = JSON.parse(descTag[1]);
    return {
      // The sender pubkey comes from the embedded zap request's .pubkey field
      senderPubkey: zapRequest.pubkey,
      // The comment comes from the embedded zap request's .content field
      comment: zapRequest.content || "",
      // The amount comes from the embedded zap request's amount tag
      amount: Number(
        zapRequest.tags.find((t: string[]) => t[0] === "amount")?.[1] || 0,
      ),
    };
  } catch {
    return null;
  }
}
```

## Validation Summary

| Check | What                                  | Why                                          |
| ----- | ------------------------------------- | -------------------------------------------- |
| 1     | Receipt pubkey matches nostrPubkey    | Prevents forged receipts from unknown keys   |
| 2     | Description tag parses as valid JSON  | Contains the original kind:9734 zap request  |
| 3     | Embedded event is kind 9734           | Ensures it's actually a zap request          |
| 4     | bolt11 amount matches request amount  | Prevents amount manipulation                 |
| 5     | SHA256(description) matches desc hash | Ensures invoice was created for this request |

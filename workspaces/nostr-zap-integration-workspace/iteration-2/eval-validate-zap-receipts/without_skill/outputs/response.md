# Zap Receipt Validation for Nostr

Here's how to validate kind 9735 zap receipt events in your Nostr client.

## Validation Function

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  sender?: string;
  amount?: number;
  comment?: string;
}

function validateZapReceipt(
  receipt: NostrEvent,
  expectedPubkey: string,
): ValidationResult {
  const errors: string[] = [];

  // Check 1: Receipt must be kind 9735
  if (receipt.kind !== 9735) {
    errors.push("Not a zap receipt event");
    return { valid: false, errors };
  }

  // Check 2: The receipt should be signed by the expected LNURL server key
  if (receipt.pubkey !== expectedPubkey) {
    errors.push("Receipt not signed by expected pubkey");
  }

  // Check 3: Extract the zap request from the description tag
  const descTag = receipt.tags.find((t) => t[0] === "description");
  if (!descTag) {
    errors.push("No description tag found");
    return { valid: false, errors };
  }

  let zapRequest;
  try {
    zapRequest = JSON.parse(descTag[1]);
  } catch {
    errors.push("Description tag is not valid JSON");
    return { valid: false, errors };
  }

  // Check 4: Verify it's a proper zap request
  if (zapRequest.kind !== 9734) {
    errors.push("Embedded event is not a zap request (kind 9734)");
  }

  // Check 5: Verify amounts match
  const bolt11Tag = receipt.tags.find((t) => t[0] === "bolt11");
  if (bolt11Tag) {
    const invoiceAmount = decodeBolt11Amount(bolt11Tag[1]);
    const requestedAmount = zapRequest.tags?.find((t: string[]) =>
      t[0] === "amount"
    )?.[1];

    if (
      invoiceAmount && requestedAmount &&
      invoiceAmount !== Number(requestedAmount)
    ) {
      errors.push("Invoice amount doesn't match requested amount");
    }
  }

  // Check 6: Verify description hash
  if (bolt11Tag) {
    const descHash = sha256(descTag[1]);
    const invoiceDescHash = getBolt11DescHash(bolt11Tag[1]);
    if (invoiceDescHash && descHash !== invoiceDescHash) {
      errors.push("Description hash mismatch");
    }
  }

  // Extract sender info
  const sender = zapRequest.pubkey;
  const comment = zapRequest.content;
  const amountTag = zapRequest.tags?.find((t: string[]) => t[0] === "amount");
  const amount = amountTag ? Number(amountTag[1]) : undefined;

  return {
    valid: errors.length === 0,
    errors,
    sender,
    amount,
    comment: comment || undefined,
  };
}
```

## Helper Functions

```typescript
function decodeBolt11Amount(invoice: string): number | null {
  // Parse bolt11 invoice to get amount
  // The amount is encoded in the human-readable part
  try {
    const decoded = decode(invoice);
    return decoded.millisatoshis ? Number(decoded.millisatoshis) : null;
  } catch {
    return null;
  }
}

function getBolt11DescHash(invoice: string): string | null {
  // Extract description hash from bolt11
  try {
    const decoded = decode(invoice);
    return decoded.tagsObject?.purpose_commit_hash || null;
  } catch {
    return null;
  }
}
```

## Usage

```typescript
const receipts = await relay.list([{
  kinds: [9735],
  "#e": [eventId],
}]);

for (const receipt of receipts) {
  const result = validateZapReceipt(receipt, lnurlNostrPubkey);
  if (result.valid) {
    console.log(`Zap from ${result.sender}: ${result.amount} msats`);
    if (result.comment) console.log(`Comment: ${result.comment}`);
  }
}
```

## Key Validation Points

1. **Pubkey check**: The receipt must be signed by the LNURL server's Nostr
   pubkey
2. **Description parsing**: The description tag contains the original zap
   request as JSON
3. **Kind check**: The embedded event must be kind 9734
4. **Amount check**: The bolt11 invoice amount should match what was requested
5. **Hash check**: SHA256 of the description should match the bolt11 description
   hash

The sender's pubkey is the `.pubkey` field of the embedded zap request, and the
comment is the `.content` field.

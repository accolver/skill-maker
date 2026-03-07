# Validating Zap Receipts

Here's how to validate zap receipts (kind:9735 events) in your Nostr client.

## Validation Function

```typescript
function validateZapReceipt(receipt: NostrEvent, expectedPubkey: string) {
  const errors: string[] = [];

  // Check the receipt is from the right server
  if (receipt.pubkey !== expectedPubkey) {
    errors.push("Receipt not from expected pubkey");
  }

  // Get the zap request from the description
  const descTag = receipt.tags.find((t) => t[0] === "description");
  if (!descTag) {
    return { valid: false, errors: ["No description tag"] };
  }

  let zapRequest;
  try {
    zapRequest = JSON.parse(descTag[1]);
  } catch {
    return { valid: false, errors: ["Invalid description JSON"] };
  }

  // Check it's a valid zap request
  if (zapRequest.kind !== 9734) {
    errors.push("Not a valid zap request in description");
  }

  // Check the bolt11 invoice
  const bolt11 = receipt.tags.find((t) => t[0] === "bolt11");
  if (!bolt11) {
    errors.push("No bolt11 tag");
  }

  // Check amounts match
  const requestAmount = zapRequest.tags?.find((t) => t[0] === "amount")?.[1];
  if (bolt11 && requestAmount) {
    const invoiceAmount = decodeBolt11(bolt11[1]);
    if (invoiceAmount !== Number(requestAmount)) {
      errors.push("Amount mismatch");
    }
  }

  // Verify description hash
  if (bolt11) {
    const hash = sha256(descTag[1]);
    const invoiceHash = getBolt11DescHash(bolt11[1]);
    if (hash !== invoiceHash) {
      errors.push("Description hash mismatch");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sender: zapRequest.pubkey,
    comment: zapRequest.content,
  };
}
```

## Usage

```typescript
const receipts = await relay.list([{ kinds: [9735], "#e": [eventId] }]);

for (const receipt of receipts) {
  const result = validateZapReceipt(receipt, nostrPubkey);
  if (result.valid) {
    console.log(`Zap from ${result.sender}: ${result.comment}`);
  }
}
```

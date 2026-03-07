# Validating Zap Receipts in Nostr

Here's how to validate zap receipt events in your Nostr client.

## Validation Function

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateZapReceipt(
  receipt: NostrEvent,
  expectedPubkey: string,
): ValidationResult {
  const errors: string[] = [];

  // Check it's a zap receipt
  if (receipt.kind !== 9735) {
    errors.push("Not a zap receipt event");
  }

  // Verify the pubkey
  if (receipt.pubkey !== expectedPubkey) {
    errors.push("Receipt pubkey doesn't match expected pubkey");
  }

  // Check for bolt11 invoice
  const bolt11 = receipt.tags.find((t) => t[0] === "bolt11");
  if (!bolt11) {
    errors.push("Missing bolt11 tag");
  }

  // Check for description
  const description = receipt.tags.find((t) => t[0] === "description");
  if (!description) {
    errors.push("Missing description tag");
  } else {
    try {
      const zapReq = JSON.parse(description[1]);
      if (zapReq.kind !== 9734) {
        errors.push("Invalid zap request kind");
      }
    } catch {
      errors.push("Invalid description JSON");
    }
  }

  // Check amount
  const amount = receipt.tags.find((t) => t[0] === "amount");
  if (!amount) {
    errors.push("Missing amount tag");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## Getting Zap Info

```typescript
function getZapInfo(receipt: NostrEvent) {
  const description = receipt.tags.find((t) => t[0] === "description");
  if (!description) return null;

  const zapReq = JSON.parse(description[1]);

  return {
    sender: zapReq.pubkey,
    message: zapReq.content,
    amount: receipt.tags.find((t) => t[0] === "amount")?.[1],
  };
}
```

## Usage

```typescript
const receipts = await relay.list([{
  kinds: [9735],
  "#p": [myPubkey],
}]);

for (const receipt of receipts) {
  const result = validateZapReceipt(receipt, expectedPubkey);
  if (result.valid) {
    const info = getZapInfo(receipt);
    console.log(`Zap from ${info.sender}: ${info.amount} sats`);
  }
}
```

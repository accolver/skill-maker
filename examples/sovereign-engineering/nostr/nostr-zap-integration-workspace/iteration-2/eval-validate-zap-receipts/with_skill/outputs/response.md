# Zap Receipt Validation Implementation (NIP-57)

Here's a comprehensive validation function for kind:9735 zap receipt events that
covers all NIP-57 validation checks.

## The Validation Function

```typescript
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { decode as decodeBolt11 } from "light-bolt11-decoder";

interface ZapValidationResult {
  valid: boolean;
  errors: string[];
  senderPubkey?: string;
  recipientPubkey?: string;
  amountMsats?: number;
  comment?: string;
  zapRequest?: NostrEvent;
}

interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  pubkey: string;
  id: string;
  sig: string;
  created_at: number;
}

/**
 * Validates a kind:9735 zap receipt event according to NIP-57.
 *
 * @param receipt - The zap receipt event (kind: 9735)
 * @param expectedNostrPubkey - The LNURL endpoint's nostrPubkey
 * @returns Validation result with errors and extracted data
 */
function validateZapReceipt(
  receipt: NostrEvent,
  expectedNostrPubkey: string,
): ZapValidationResult {
  const errors: string[] = [];

  // === Check 1: Verify receipt is kind 9735 ===
  if (receipt.kind !== 9735) {
    errors.push(`Expected kind 9735, got kind ${receipt.kind}`);
    return { valid: false, errors };
  }

  // === Check 2: Receipt pubkey must match the LNURL nostrPubkey ===
  // The zap receipt MUST be signed by the same key advertised in the
  // LNURL endpoint's nostrPubkey field. This proves the receipt came
  // from the legitimate LNURL server.
  if (receipt.pubkey !== expectedNostrPubkey) {
    errors.push(
      `Receipt pubkey "${receipt.pubkey}" does not match LNURL nostrPubkey "${expectedNostrPubkey}". ` +
        `This may indicate a forged zap receipt.`,
    );
  }

  // === Check 3: Parse the description tag to extract the embedded zap request ===
  // The "description" tag contains the original kind:9734 zap request as JSON
  const descriptionTag = receipt.tags.find((t) => t[0] === "description");
  if (!descriptionTag || !descriptionTag[1]) {
    errors.push("Missing 'description' tag — cannot verify zap request");
    return { valid: false, errors };
  }

  let zapRequest: NostrEvent;
  try {
    // Parse the description tag value as JSON to get the embedded zap request
    zapRequest = JSON.parse(descriptionTag[1]);
  } catch (e) {
    errors.push(
      `Failed to parse 'description' tag as JSON: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return { valid: false, errors };
  }

  // === Check 4: Verify the embedded zap request is kind 9734 ===
  if (zapRequest.kind !== 9734) {
    errors.push(
      `Embedded zap request has kind ${zapRequest.kind}, expected kind 9734`,
    );
  }

  // === Check 5: Verify bolt11 invoice amount matches zap request amount ===
  const bolt11Tag = receipt.tags.find((t) => t[0] === "bolt11");
  if (!bolt11Tag || !bolt11Tag[1]) {
    errors.push("Missing 'bolt11' tag — cannot verify payment amount");
  } else {
    // Decode the bolt11 invoice to extract the amount
    const invoiceAmountMsats = decodeBolt11Amount(bolt11Tag[1]);

    // Get the amount from the zap request's amount tag
    const requestAmountTag = zapRequest.tags.find((t) => t[0] === "amount");
    const requestAmountMsats = requestAmountTag
      ? Number(requestAmountTag[1])
      : null;

    if (invoiceAmountMsats !== null && requestAmountMsats !== null) {
      // Amount in bolt11 must match amount in the zap request
      if (invoiceAmountMsats !== requestAmountMsats) {
        errors.push(
          `Invoice amount (${invoiceAmountMsats} msats) does not match ` +
            `zap request amount (${requestAmountMsats} msats)`,
        );
      }
    }
  }

  // === Check 6: Verify SHA256 of description matches bolt11 description hash ===
  // The bolt11 invoice contains a description hash (tagged 'h' in the invoice).
  // This hash SHOULD equal SHA256(description_tag_value).
  if (bolt11Tag && bolt11Tag[1]) {
    const descriptionString = descriptionTag[1];
    const descriptionBytes = new TextEncoder().encode(descriptionString);
    const computedHash = bytesToHex(sha256(descriptionBytes));

    const bolt11DescHash = extractBolt11DescriptionHash(bolt11Tag[1]);
    if (bolt11DescHash) {
      if (computedHash !== bolt11DescHash) {
        errors.push(
          `SHA256 of description tag does not match bolt11 description hash. ` +
            `Computed: ${computedHash}, Invoice: ${bolt11DescHash}`,
        );
      }
    }
  }

  // === Extract sender pubkey and comment from the embedded zap request ===
  // The sender's pubkey is the .pubkey field of the embedded kind:9734 event
  const senderPubkey = zapRequest.pubkey;

  // The zap comment (if any) is the .content field of the kind:9734 event
  const comment = zapRequest.content || undefined;

  // Get the recipient pubkey from the 'p' tag of the zap request
  const recipientPubkey = zapRequest.tags.find((t) => t[0] === "p")?.[1];

  // Get the amount (for display purposes)
  const amountTag = zapRequest.tags.find((t) => t[0] === "amount");
  const amountMsats = amountTag ? Number(amountTag[1]) : undefined;

  return {
    valid: errors.length === 0,
    errors,
    senderPubkey,
    recipientPubkey,
    amountMsats,
    comment,
    zapRequest,
  };
}
```

## Helper Functions

```typescript
/**
 * Decode a bolt11 invoice and extract the amount in millisatoshis.
 */
function decodeBolt11Amount(bolt11: string): number | null {
  try {
    const decoded = decodeBolt11(bolt11);
    const amountSection = decoded.sections.find(
      (s: any) => s.name === "amount",
    );
    if (amountSection) {
      // bolt11 amounts are in millisatoshis
      return Number(amountSection.value);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract the description hash from a bolt11 invoice.
 * In bolt11, the description hash is the 'h' tagged field (purpose_hash).
 */
function extractBolt11DescriptionHash(bolt11: string): string | null {
  try {
    const decoded = decodeBolt11(bolt11);
    const hashSection = decoded.sections.find(
      (s: any) =>
        s.name === "purpose_commit_hash" || s.name === "description_hash",
    );
    if (hashSection) {
      return hashSection.value;
    }
    return null;
  } catch {
    return null;
  }
}
```

## Usage Example

```typescript
// Fetch zap receipts for a specific event
const receipts = await pool.querySync(relays, {
  kinds: [9735],
  "#e": ["abc123..."],
});

for (const receipt of receipts) {
  // You need the nostrPubkey from the recipient's LNURL endpoint
  // (fetched earlier during the zap sending flow)
  const result = validateZapReceipt(receipt, expectedNostrPubkey);

  if (result.valid) {
    console.log(`Valid zap from ${result.senderPubkey}`);
    console.log(`Amount: ${result.amountMsats! / 1000} sats`);
    if (result.comment) {
      console.log(`Comment: ${result.comment}`);
    }
  } else {
    console.warn(`Invalid zap receipt: ${result.errors.join(", ")}`);
  }
}
```

## Extracting Sender Pubkey and Comment

Once you have a validated receipt, extracting the sender and comment is
straightforward:

```typescript
function extractZapInfo(receipt: NostrEvent, expectedNostrPubkey: string) {
  const result = validateZapReceipt(receipt, expectedNostrPubkey);

  if (!result.valid) {
    return null;
  }

  return {
    // Sender pubkey comes from the embedded zap request's .pubkey field
    // This is the pubkey that signed the original kind:9734 zap request
    sender: result.senderPubkey,

    // Comment comes from the embedded zap request's .content field
    // The sender optionally set this when creating the kind:9734 event
    comment: result.comment,

    // Amount from the zap request tags
    amountSats: result.amountMsats ? result.amountMsats / 1000 : undefined,

    // Recipient from the p tag
    recipient: result.recipientPubkey,
  };
}
```

## Validation Summary

| Check                              | What It Verifies                    | Consequence If Skipped     |
| ---------------------------------- | ----------------------------------- | -------------------------- |
| Receipt pubkey = LNURL nostrPubkey | Receipt came from legitimate server | Fake receipts accepted     |
| Description tag parses as JSON     | Embedded zap request is valid       | Cannot verify zap origin   |
| Embedded request is kind 9734      | Correct event type embedded         | Malformed receipt accepted |
| bolt11 amount = request amount     | Payment amount matches intention    | Amount spoofing possible   |
| SHA256(description) = bolt11 hash  | Description wasn't tampered with    | Tampered data accepted     |

**Important:** Zap receipts are NOT cryptographic proofs of payment. They prove
that a LNURL server _claims_ payment was received. Trust depends on the LNURL
server operator's reputation.

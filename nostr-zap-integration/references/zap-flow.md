# NIP-57 Lightning Zap Flow

Complete step-by-step reference for implementing Lightning Zaps in Nostr
applications.

## Protocol Flow Overview

```
Sender Client          LNURL Server          Relays          Lightning
    |                       |                   |                |
    |-- GET lnurlp/user --->|                   |                |
    |<-- {allowsNostr, ...}-|                   |                |
    |                       |                   |                |
    |-- Sign kind:9734 ---->|                   |                |
    |   (zap request)       |                   |                |
    |                       |                   |                |
    |-- GET callback?nostr= |                   |                |
    |<-- {pr: bolt11} ------|                   |                |
    |                       |                   |                |
    |-- Pay invoice --------|-------------------|------>         |
    |                       |                   |                |
    |                       |-- kind:9735 ----->|                |
    |                       |   (zap receipt)   |                |
    |                       |                   |                |
    |<-- Fetch kind:9735 ---|-------------------|                |
```

## Step 1: Discover the LNURL Endpoint

### From lud16 (Lightning Address)

```typescript
function getLnurlPayUrl(lud16: string): string {
  const [name, domain] = lud16.split("@");
  return `https://${domain}/.well-known/lnurlp/${name}`;
}

// Example: "bob@walletofsatoshi.com"
// → "https://walletofsatoshi.com/.well-known/lnurlp/bob"
```

### From zap tag on an event

If the event has `zap` tags, use those instead of the author's profile:

```typescript
function getZapRecipients(event: NostrEvent): ZapRecipient[] {
  const zapTags = event.tags.filter((t) => t[0] === "zap");
  if (zapTags.length === 0) return []; // Fall back to event author

  const totalWeight = zapTags.reduce((sum, t) => sum + Number(t[3] || 0), 0);

  return zapTags.map((tag) => ({
    pubkey: tag[1],
    relay: tag[2],
    weight: Number(tag[3] || 0),
    percentage: totalWeight > 0 ? Number(tag[3] || 0) / totalWeight : 0,
  }));
}
```

### Verify Nostr Support

```typescript
interface LnurlPayResponse {
  callback: string;
  maxSendable: number; // millisats
  minSendable: number; // millisats
  metadata: string;
  allowsNostr?: boolean;
  nostrPubkey?: string; // 32-byte hex
}

async function verifyNostrZapSupport(
  lnurlPayUrl: string,
): Promise<LnurlPayResponse> {
  const res = await fetch(lnurlPayUrl);
  const data: LnurlPayResponse = await res.json();

  if (!data.allowsNostr) {
    throw new Error("LNURL endpoint does not support Nostr zaps");
  }
  if (!data.nostrPubkey || data.nostrPubkey.length !== 64) {
    throw new Error("Invalid or missing nostrPubkey");
  }

  return data;
}
```

## Step 2: Construct the Zap Request (kind:9734)

### Required Structure

```typescript
interface ZapRequest {
  kind: 9734;
  content: string; // Optional message
  tags: string[][];
  pubkey: string; // Sender's pubkey
  created_at: number;
  id: string;
  sig: string;
}

function buildZapRequest(params: {
  senderPubkey: string;
  recipientPubkey: string;
  amountMsats: number;
  relays: string[];
  lnurl?: string;
  eventId?: string;
  eventKind?: number;
  addressableCoord?: string; // "kind:pubkey:d-tag"
  comment?: string;
}): Omit<ZapRequest, "id" | "sig"> {
  const tags: string[][] = [
    ["relays", ...params.relays],
    ["amount", params.amountMsats.toString()],
    ["p", params.recipientPubkey],
  ];

  if (params.lnurl) tags.push(["lnurl", params.lnurl]);
  if (params.eventId) tags.push(["e", params.eventId]);
  if (params.addressableCoord) tags.push(["a", params.addressableCoord]);
  if (params.eventKind !== undefined) {
    tags.push(["k", params.eventKind.toString()]);
  }

  return {
    kind: 9734,
    content: params.comment || "",
    tags,
    pubkey: params.senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
  };
}
```

### Tag Reference

| Tag      | Required    | Format                               | Notes                 |
| -------- | ----------- | ------------------------------------ | --------------------- |
| `relays` | YES         | `["relays", "wss://r1", "wss://r2"]` | NOT nested arrays     |
| `p`      | YES         | `["p", "<hex-pubkey>"]`              | Exactly one           |
| `amount` | Recommended | `["amount", "21000"]`                | Millisats as string   |
| `lnurl`  | Recommended | `["lnurl", "lnurl1..."]`             | Bech32-encoded        |
| `e`      | Optional    | `["e", "<hex-event-id>"]`            | When zapping an event |
| `a`      | Optional    | `["a", "30023:pubkey:d-tag"]`        | Addressable events    |
| `k`      | Optional    | `["k", "1"]`                         | Kind of zapped event  |

### Validation Rules for Zap Requests

The LNURL server validates incoming zap requests:

1. Valid Nostr signature
2. Has tags
3. Exactly one `p` tag
4. Zero or one `e` tags
5. Has a `relays` tag
6. If `amount` tag exists, it MUST equal the `amount` query parameter
7. If `a` tag exists, it MUST be a valid event coordinate
8. Zero or one `P` tags

## Step 3: Send to Callback URL

```typescript
async function requestInvoice(
  callback: string,
  signedZapRequest: ZapRequest,
  amountMsats: number,
  lnurl?: string,
): Promise<string> {
  const params = new URLSearchParams({
    amount: amountMsats.toString(),
    nostr: JSON.stringify(signedZapRequest),
  });

  if (lnurl) params.set("lnurl", lnurl);

  const res = await fetch(`${callback}?${params.toString()}`);
  const data = await res.json();

  if (data.status === "ERROR") {
    throw new Error(`LNURL error: ${data.reason}`);
  }

  return data.pr; // bolt11 invoice
}
```

**Critical:** The zap request is JSON-encoded, then sent as a query parameter.
It is NOT published to any relay.

## Step 4: Pay the Invoice

Pass the bolt11 invoice string to a Lightning wallet or payment library. This
step is outside the Nostr protocol — use whatever Lightning integration your
application supports (WebLN, NWC, direct LND/CLN API, etc.).

## Step 5: Zap Receipt Creation (Server-Side)

After the invoice is paid, the recipient's LNURL server creates a kind:9735
event:

```typescript
function buildZapReceipt(params: {
  serverPubkey: string; // The LNURL server's nostrPubkey
  zapRequest: ZapRequest;
  bolt11: string;
  preimage?: string;
  paidAt: number;
}): Omit<NostrEvent, "id" | "sig"> {
  const zapReq = params.zapRequest;
  const recipientPubkey = zapReq.tags.find((t) => t[0] === "p")?.[1];
  const senderPubkey = zapReq.pubkey;
  const eventId = zapReq.tags.find((t) => t[0] === "e")?.[1];
  const aTag = zapReq.tags.find((t) => t[0] === "a");

  const tags: string[][] = [
    ["p", recipientPubkey!],
    ["P", senderPubkey],
    ["bolt11", params.bolt11],
    ["description", JSON.stringify(zapReq)],
  ];

  if (eventId) tags.push(["e", eventId]);
  if (aTag) tags.push(aTag);
  if (params.preimage) tags.push(["preimage", params.preimage]);

  // Amount from the zap request
  const amount = zapReq.tags.find((t) => t[0] === "amount")?.[1];
  if (amount) tags.push(["amount", amount]);

  return {
    kind: 9735,
    content: "",
    tags,
    pubkey: params.serverPubkey,
    created_at: params.paidAt,
  };
}
```

The receipt is published to the relays specified in the zap request's `relays`
tag.

## Step 6: Validate Zap Receipts (Client-Side)

```typescript
interface ZapValidationResult {
  valid: boolean;
  errors: string[];
  zapRequest?: ZapRequest;
  amountMsats?: number;
  senderPubkey?: string;
  comment?: string;
}

function validateZapReceipt(
  receipt: NostrEvent,
  expectedNostrPubkey: string,
): ZapValidationResult {
  const errors: string[] = [];

  // 1. Check receipt pubkey matches LNURL nostrPubkey
  if (receipt.pubkey !== expectedNostrPubkey) {
    errors.push(
      `Receipt pubkey ${receipt.pubkey} does not match expected ${expectedNostrPubkey}`,
    );
  }

  // 2. Parse the embedded zap request
  const descriptionTag = receipt.tags.find((t) => t[0] === "description");
  if (!descriptionTag) {
    errors.push("Missing description tag");
    return { valid: false, errors };
  }

  let zapRequest: ZapRequest;
  try {
    zapRequest = JSON.parse(descriptionTag[1]);
  } catch {
    errors.push("Invalid JSON in description tag");
    return { valid: false, errors };
  }

  if (zapRequest.kind !== 9734) {
    errors.push(`Zap request kind is ${zapRequest.kind}, expected 9734`);
  }

  // 3. Verify amount matches
  const bolt11Tag = receipt.tags.find((t) => t[0] === "bolt11");
  const requestAmount = zapRequest.tags.find((t) => t[0] === "amount")?.[1];

  if (bolt11Tag && requestAmount) {
    const invoiceAmount = decodeBolt11Amount(bolt11Tag[1]);
    if (invoiceAmount !== Number(requestAmount)) {
      errors.push(
        `Invoice amount ${invoiceAmount} does not match request amount ${requestAmount}`,
      );
    }
  }

  // 4. Verify description hash (SHOULD check)
  if (bolt11Tag) {
    const descHash = sha256(descriptionTag[1]);
    const bolt11DescHash = extractDescriptionHash(bolt11Tag[1]);
    if (bolt11DescHash && descHash !== bolt11DescHash) {
      errors.push("Description hash mismatch");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    zapRequest,
    amountMsats: requestAmount ? Number(requestAmount) : undefined,
    senderPubkey: zapRequest.pubkey,
    comment: zapRequest.content || undefined,
  };
}
```

### Fetching Zap Receipts

```typescript
// Zaps on a specific event
const filter = { kinds: [9735], "#e": [eventId] };

// Zaps on a user profile
const filter = { kinds: [9735], "#p": [pubkey] };
```

## Zap Splits Implementation

When an event has multiple `zap` tags:

```typescript
function calculateZapSplits(
  event: NostrEvent,
  totalAmountMsats: number,
): { pubkey: string; relay: string; amountMsats: number }[] {
  const zapTags = event.tags.filter((t) => t[0] === "zap");
  if (zapTags.length === 0) return [];

  const totalWeight = zapTags.reduce((sum, t) => sum + Number(t[3] || 0), 0);

  if (totalWeight === 0) {
    // No weights: divide equally
    const perRecipient = Math.floor(totalAmountMsats / zapTags.length);
    return zapTags.map((t) => ({
      pubkey: t[1],
      relay: t[2],
      amountMsats: perRecipient,
    }));
  }

  return zapTags
    .filter((t) => Number(t[3] || 0) > 0) // Skip zero-weight recipients
    .map((t) => ({
      pubkey: t[1],
      relay: t[2],
      amountMsats: Math.floor(totalAmountMsats * Number(t[3]) / totalWeight),
    }));
}
```

Each split recipient gets a separate zap request → callback → invoice → payment
cycle.

# DVM Translation Job Request Client

A TypeScript client that publishes a kind:5002 translation request, handles
feedback (including payment-required), and receives the kind:6002 result.

## Implementation

```typescript
import { Event, getEventHash, Relay, signEvent } from "nostr-tools";

const MY_PRIVATE_KEY = "<your-private-key>";
const MY_PUBKEY =
  "def456def456def456def456def456def456def456def456def456def456def4";
const PREFERRED_SP =
  "aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa1";
const RELAY_URL = "wss://relay.damus.io";

const relay = await Relay.connect(RELAY_URL);

// --- Step 1: Publish the kind:5002 translation job request ---

const jobRequest = {
  kind: 5002,
  created_at: Math.floor(Date.now() / 1000),
  content: "",
  tags: [
    ["i", "https://example.com/article", "url"],
    ["param", "lang", "en"],
    ["output", "text/plain"],
    ["relays", RELAY_URL],
    ["bid", "10000"],
    ["p", PREFERRED_SP],
  ],
  pubkey: MY_PUBKEY,
};

jobRequest.id = getEventHash(jobRequest);
const signedRequest = signEvent(jobRequest, MY_PRIVATE_KEY);
await relay.publish(signedRequest);

console.log(`Published kind:5002 translation request: ${signedRequest.id}`);

// --- Step 2: Subscribe to kind:7000 feedback filtered by our pubkey ---

const feedbackSub = relay.subscribe(
  [{ kinds: [7000], "#p": [MY_PUBKEY] }],
  {
    onevent(event: Event) {
      handleFeedback(event);
    },
  },
);

// --- Step 3: Subscribe to kind:6002 results filtered by our pubkey ---
// Result kind = 5002 + 1000 = 6002

const resultSub = relay.subscribe(
  [{ kinds: [6002], "#p": [MY_PUBKEY] }],
  {
    onevent(event: Event) {
      handleResult(event);
    },
  },
);

// --- Feedback Handler ---

async function handleFeedback(event: Event): Promise<void> {
  const statusTag = event.tags.find((t) => t[0] === "status");
  if (!statusTag) return;

  const status = statusTag[1];
  const extraInfo = statusTag[2] || "";

  console.log(`Feedback received: status=${status} info="${extraInfo}"`);

  switch (status) {
    case "processing":
      console.log("Service provider is processing our request...");
      break;

    case "payment-required": {
      // Extract the bolt11 invoice from the amount tag
      const amountTag = event.tags.find((t) => t[0] === "amount");
      if (amountTag && amountTag.length >= 3) {
        const msats = amountTag[1];
        const bolt11 = amountTag[2];
        console.log(`Payment required: ${msats} msats`);
        console.log(`Bolt11 invoice: ${bolt11}`);
        // Pay the invoice using a Lightning wallet
        await payBolt11Invoice(bolt11);
      } else {
        console.error("Payment required but no amount/bolt11 provided");
      }
      break;
    }

    case "error":
      console.error(`Job failed: ${extraInfo}`);
      break;

    case "partial":
      console.log(`Partial result: ${event.content}`);
      break;

    case "success":
      console.log("Job completed successfully, waiting for result event...");
      break;

    default:
      console.log(`Unknown status: ${status}`);
  }
}

// --- Result Handler ---

function handleResult(event: Event): void {
  console.log("Translation result received!");
  console.log(`Content: ${event.content}`);

  // Verify the result matches our request
  const requestTag = event.tags.find((t) => t[0] === "request");
  if (requestTag) {
    const originalRequest = JSON.parse(requestTag[1]);
    console.log(`Original request kind: ${originalRequest.kind}`);
  }

  const eTag = event.tags.find((t) => t[0] === "e");
  if (eTag) {
    console.log(`References job request: ${eTag[1]}`);
  }

  // Check if there's an amount to pay
  const amountTag = event.tags.find((t) => t[0] === "amount");
  if (amountTag) {
    console.log(`Service cost: ${amountTag[1]} msats`);
    if (amountTag[2]) {
      console.log(`Pay invoice: ${amountTag[2]}`);
    }
  }

  // Cleanup
  feedbackSub.close();
  resultSub.close();
}

// --- Payment Helper ---

async function payBolt11Invoice(bolt11: string): Promise<void> {
  // In production, use webln or a Lightning SDK
  console.log(`Paying invoice: ${bolt11}`);
  // await webln.sendPayment(bolt11);
}
```

## Event Structures

### Job Request (kind:5002) — what we publish

```json
{
  "kind": 5002,
  "content": "",
  "tags": [
    ["i", "https://example.com/article", "url"],
    ["param", "lang", "en"],
    ["output", "text/plain"],
    ["relays", "wss://relay.damus.io"],
    ["bid", "10000"],
    ["p", "aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa1"]
  ]
}
```

Key tags:

- `i` tag: input URL with type "url" — the SP will fetch this URL to get the
  content to translate
- `param` tag: target language "en" (English)
- `bid` tag: maximum we're willing to pay (10000 millisats)
- `p` tag: preferred service provider pubkey (others may still respond)

### Payment-Required Feedback (kind:7000)

```json
{
  "kind": 7000,
  "content": "",
  "tags": [
    [
      "status",
      "payment-required",
      "Translation service requires upfront payment"
    ],
    ["amount", "8000", "lnbc8000n1pj...bolt11invoice..."],
    ["e", "<job-request-id>", "wss://relay.damus.io"],
    ["p", "def456def456def456def456def456def456def456def456def456def456def4"]
  ]
}
```

The client handles payment-required by extracting the bolt11 invoice from the
`amount` tag (third element) and paying it via a Lightning wallet.

### Result Event (kind:6002)

Result kind = 5002 + 1000 = 6002:

```json
{
  "kind": 6002,
  "content": "The translated text of the article in English...",
  "tags": [
    [
      "request",
      "{\"kind\":5002,\"pubkey\":\"def456...\",\"content\":\"\",\"tags\":[[\"i\",\"https://example.com/article\",\"url\"],...]}"
    ],
    ["e", "<job-request-id>", "wss://relay.damus.io"],
    ["p", "def456def456def456def456def456def456def456def456def456def456def4"],
    ["amount", "8000", "lnbc8000n1pj..."]
  ]
}
```

## Full Lifecycle Flow

```
Client                           Service Provider
  |                                    |
  |-- kind:5002 (translation) -------->|
  |   i: [url, "url"]                  |
  |   bid: 10000                       |
  |   p: <preferred-sp>                |
  |   param: lang=en                   |
  |                                    |
  |<-- kind:7000 ----------------------|
  |    status: payment-required        |
  |    amount: 8000, bolt11: lnbc...   |
  |                                    |
  |-- pay bolt11 invoice ------------->|
  |                                    |
  |<-- kind:7000 ----------------------|
  |    status: processing              |
  |                                    |
  |<-- kind:6002 ----------------------|
  |    content: "English translation"  |
  |    amount: 8000                    |
```

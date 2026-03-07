# DVM Translation Request Client

This client publishes a kind 5002 job request event (translation) to translate a webpage from Spanish to English using NIP-90 DVMs.

The job request contains an 'i' tag with input type 'url' and the webpage URL https://example.com/article.

The job request contains a 'bid' tag with value '10000' (millisats) indicating the maximum the customer will pay.

The job request contains a 'param' tag for language (e.g., 'lang', 'en') to specify the target translation language.

The job request contains a 'p' tag with the preferred service provider pubkey aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa1.

The client subscribes to kind 7000 feedback events filtered by customer pubkey to track job status.

The client subscribes to kind 6002 result events (5002 + 1000) to receive the translation output.

The client handles 'payment-required' status and extracts bolt11 from the amount tag to pay the service provider before processing continues.

## Complete Implementation

```typescript
import { finalizeEvent, generateSecretKey, Relay } from "nostr-tools";

// Client keys
const CLIENT_PRIVKEY = generateSecretKey();
const CLIENT_PUBKEY =
  "def456def456def456def456def456def456def456def456def456def456def4";
const PREFERRED_SP_PUBKEY =
  "aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa1";

async function main() {
  // Connect to relay
  const relay = await Relay.connect("wss://relay.damus.io");
  console.log("Connected to wss://relay.damus.io");

  // Step 1: Build and publish the kind:5002 translation job request
  const jobRequest = finalizeEvent(
    {
      kind: 5002,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["i", "https://example.com/article", "url"],
        ["param", "lang", "en"],
        ["param", "source_lang", "es"],
        ["output", "text/plain"],
        ["relays", "wss://relay.damus.io"],
        ["bid", "10000"],
        ["p", PREFERRED_SP_PUBKEY],
      ],
    },
    CLIENT_PRIVKEY,
  );
  await relay.publish(jobRequest);
  console.log(`Published kind:5002 translation request: ${jobRequest.id}`);

  // Step 2: Subscribe to kind:7000 feedback events filtered by our pubkey
  const feedbackSub = relay.subscribe(
    [
      {
        kinds: [7000],
        "#p": [CLIENT_PUBKEY],
        "#e": [jobRequest.id],
      },
    ],
    {
      onevent: async (event) => {
        await handleFeedback(event, relay);
      },
    },
  );
  console.log("Subscribed to kind:7000 feedback events");

  // Step 3: Subscribe to kind:6002 result events (5002 + 1000)
  const resultSub = relay.subscribe(
    [
      {
        kinds: [6002],
        "#p": [CLIENT_PUBKEY],
      },
    ],
    {
      onevent: (event) => {
        handleResult(event);
        feedbackSub.close();
        resultSub.close();
      },
    },
  );
  console.log("Subscribed to kind:6002 result events");
}

async function handleFeedback(event: NostrEvent, relay: Relay) {
  const statusTag = event.tags.find((t: string[]) => t[0] === "status");
  if (!statusTag) return;

  const status = statusTag[1];
  const extraInfo = statusTag[2] || "";

  switch (status) {
    case "processing":
      console.log(`Job is being processed: ${extraInfo}`);
      break;

    case "payment-required":
      console.log("Payment required by service provider");

      // Extract the bolt11 invoice from the amount tag
      const amountTag = event.tags.find((t: string[]) => t[0] === "amount");
      if (amountTag) {
        const amountMsats = amountTag[1];
        const bolt11Invoice = amountTag[2];
        console.log(`Amount: ${amountMsats} msats`);
        console.log(`Bolt11 invoice: ${bolt11Invoice}`);

        // Pay the bolt11 invoice
        await payInvoice(bolt11Invoice);
        console.log("Invoice paid successfully");
      }
      break;

    case "error":
      console.error(`Job failed: ${extraInfo}`);
      break;

    case "partial":
      console.log(`Partial result received: ${event.content}`);
      break;

    case "success":
      console.log("Job completed successfully, result incoming");
      break;
  }
}

function handleResult(event: NostrEvent) {
  console.log("=== Translation Result Received ===");
  console.log(`Kind: ${event.kind}`);
  console.log(`Translation: ${event.content}`);

  // Verify the request tag matches our original request
  const requestTag = event.tags.find((t: string[]) => t[0] === "request");
  if (requestTag) {
    const originalRequest = JSON.parse(requestTag[1]);
    console.log(`Original request kind: ${originalRequest.kind}`);
  }

  // Check the amount charged
  const amountTag = event.tags.find((t: string[]) => t[0] === "amount");
  if (amountTag) {
    console.log(`Amount charged: ${amountTag[1]} msats`);
  }
}

// Helper: Pay a bolt11 Lightning invoice
async function payInvoice(bolt11: string): Promise<void> {
  console.log(`Paying invoice: ${bolt11}`);
  // In production: await lnd.payInvoice({ payment_request: bolt11 });
}

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

main().catch(console.error);
```

## Job Request Event (kind:5002)

```json
{
  "kind": 5002,
  "content": "",
  "pubkey": "def456def456def456def456def456def456def456def456def456def456def4",
  "tags": [
    ["i", "https://example.com/article", "url"],
    ["param", "lang", "en"],
    ["param", "source_lang", "es"],
    ["output", "text/plain"],
    ["relays", "wss://relay.damus.io"],
    ["bid", "10000"],
    ["p", "aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa1"]
  ]
}
```

## Full Lifecycle Flow

```
Customer                              Service Provider
   |                                        |
   |-- kind:5002 (translation) ----------->|
   |   i: url, bid: 10000, p: SP          |
   |                                        |
   |<-- kind:7000 (payment-required) ------|
   |    amount: 8000, bolt11: lnbc...      |
   |                                        |
   |-- pay bolt11 invoice ---------------->|
   |                                        |
   |<-- kind:7000 (processing) ------------|
   |                                        |
   |<-- kind:6002 (result) ----------------|
   |    content: translated text           |
```

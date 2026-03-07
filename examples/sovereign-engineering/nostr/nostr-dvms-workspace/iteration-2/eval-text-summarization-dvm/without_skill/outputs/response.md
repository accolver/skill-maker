# Text Summarization DVM Service Provider

This service subscribes to kind 5001 events on the Nostr relay to receive
summarization job requests.

When a job is received, the service publishes kind 7000 feedback with status tag
'processing' to let the customer know work has begun.

If something goes wrong, it sends a kind 7000 event with an error status to
inform the customer.

The service publishes kind 6001 result events with the summarized content.

It handles text and URL input types from 'i' tags — raw text is used directly,
URLs are fetched first.

## Implementation

```typescript
import { finalizeEvent, generateSecretKey, Relay } from "nostr-tools";

const SK = generateSecretKey();
const RELAY_URL = "wss://relay.damus.io";

async function main() {
  const relay = await Relay.connect(RELAY_URL);

  // Listen for summarization requests (kind 5001)
  const sub = relay.subscribe(
    [{ kinds: [5001] }],
    {
      onevent: async (event) => {
        console.log("Received job request:", event.id);
        await processJob(event, relay);
      },
    },
  );
}

async function processJob(event: any, relay: any) {
  const customerPubkey = event.pubkey;

  // Send processing status
  const feedback = finalizeEvent(
    {
      kind: 7000,
      content: "Processing your summarization request",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["status", "processing"],
        ["e", event.id],
        ["p", customerPubkey],
      ],
    },
    SK,
  );
  await relay.publish(feedback);

  try {
    // Get the input text
    const inputTag = event.tags.find((t: any) => t[0] === "i");
    let text = "";

    if (inputTag) {
      const type = inputTag[2];
      if (type === "text") {
        text = inputTag[1];
      } else if (type === "url") {
        const res = await fetch(inputTag[1]);
        text = await res.text();
      }
    }

    // Summarize
    const summary = await callSummarizationAPI(text);

    // Publish result as kind 6001
    const result = finalizeEvent(
      {
        kind: 6001,
        content: summary,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["e", event.id],
          ["p", customerPubkey],
        ],
      },
      SK,
    );
    await relay.publish(result);
    console.log("Published result:", result.id);
  } catch (err: any) {
    // Send error status
    const errorFeedback = finalizeEvent(
      {
        kind: 7000,
        content: err.message,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["status", "error", err.message],
          ["e", event.id],
          ["p", customerPubkey],
        ],
      },
      SK,
    );
    await relay.publish(errorFeedback);
  }
}

async function callSummarizationAPI(text: string): Promise<string> {
  return `Summary of: ${text.substring(0, 100)}...`;
}

main();
```

Note: The result event is missing the `request` tag which should contain the
stringified original job request event per NIP-90. Without this tag, clients
cannot verify the result matches their original request.

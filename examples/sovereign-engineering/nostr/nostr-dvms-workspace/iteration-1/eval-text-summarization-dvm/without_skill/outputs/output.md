# Text Summarization DVM Service Provider

Here's a TypeScript implementation of a Nostr DVM service provider for text
summarization.

## Implementation

```typescript
import { Event, getEventHash, Relay, signEvent } from "nostr-tools";

const SP_PRIVATE_KEY = "<your-private-key>";
const SP_PUBKEY =
  "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1";
const RELAY_URL = "wss://relay.damus.io";

const relay = await Relay.connect(RELAY_URL);

// Subscribe to job requests
const sub = relay.subscribe(
  [{ kinds: [5001] }],
  {
    onevent(event: Event) {
      handleJobRequest(event);
    },
  },
);

async function handleJobRequest(event: Event): Promise<void> {
  const customerPubkey = event.pubkey;
  const jobId = event.id;

  // Send processing status
  const feedbackEvent = {
    kind: 7000,
    created_at: Math.floor(Date.now() / 1000),
    content: "Processing your request",
    tags: [
      ["status", "processing"],
      ["e", jobId],
      ["p", customerPubkey],
    ],
    pubkey: SP_PUBKEY,
  };

  feedbackEvent.id = getEventHash(feedbackEvent);
  const signedFeedback = signEvent(feedbackEvent, SP_PRIVATE_KEY);
  await relay.publish(signedFeedback);

  // Get input text
  const inputTag = event.tags.find((t) => t[0] === "i");
  const text = inputTag ? inputTag[1] : event.content;

  // Summarize
  const summary = await summarizeText(text);

  // Publish result
  const resultEvent = {
    kind: 6001,
    created_at: Math.floor(Date.now() / 1000),
    content: summary,
    tags: [
      ["e", jobId],
      ["p", customerPubkey],
    ],
    pubkey: SP_PUBKEY,
  };

  resultEvent.id = getEventHash(resultEvent);
  const signedResult = signEvent(resultEvent, SP_PRIVATE_KEY);
  await relay.publish(signedResult);
}

async function summarizeText(text: string): Promise<string> {
  // Call an AI API for summarization
  const sentences = text.split(". ");
  return sentences.slice(0, 3).join(". ") + ".";
}
```

## How It Works

1. The service connects to `wss://relay.damus.io` and subscribes to kind:5001
   events
2. When a job request arrives, it sends a kind:7000 feedback event with status
   "processing"
3. It extracts the text from the input tag
4. After summarizing, it publishes a kind:6001 result event

The result event includes the summary in the content field and tags the
customer's pubkey and the original event ID.

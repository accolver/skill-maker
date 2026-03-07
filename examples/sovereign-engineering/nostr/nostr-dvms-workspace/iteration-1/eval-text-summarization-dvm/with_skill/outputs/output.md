# Text Summarization DVM Service Provider

A complete TypeScript implementation of a NIP-90 Data Vending Machine service
provider that handles kind:5001 summarization job requests.

## Implementation

```typescript
import { Event, getEventHash, Relay, signEvent } from "nostr-tools";

const SP_PRIVATE_KEY = "<your-private-key>";
const SP_PUBKEY =
  "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1";
const RELAY_URL = "wss://relay.damus.io";

// Connect to relay
const relay = await Relay.connect(RELAY_URL);

// Subscribe to kind:5001 summarization job requests
const sub = relay.subscribe(
  [{ kinds: [5001] }],
  {
    onevent(event: Event) {
      handleJobRequest(event).catch((err) => {
        console.error("Error handling job request:", err);
        sendErrorFeedback(event, err.message).catch(console.error);
      });
    },
  },
);

console.log("DVM Service Provider started. Subscribed to kind:5001 events.");

// --- Feedback Helpers ---

async function sendProcessingFeedback(jobEvent: Event): Promise<void> {
  const feedbackEvent = {
    kind: 7000,
    created_at: Math.floor(Date.now() / 1000),
    content: "",
    tags: [
      ["status", "processing", "Starting summarization"],
      ["e", jobEvent.id, RELAY_URL],
      ["p", jobEvent.pubkey],
    ],
    pubkey: SP_PUBKEY,
  };

  feedbackEvent.id = getEventHash(feedbackEvent);
  const signed = signEvent(feedbackEvent, SP_PRIVATE_KEY);
  await relay.publish(signed);
  console.log(`Sent processing feedback for job ${jobEvent.id}`);
}

async function sendErrorFeedback(
  jobEvent: Event,
  errorMessage: string,
): Promise<void> {
  const feedbackEvent = {
    kind: 7000,
    created_at: Math.floor(Date.now() / 1000),
    content: "",
    tags: [
      ["status", "error", errorMessage],
      ["e", jobEvent.id, RELAY_URL],
      ["p", jobEvent.pubkey],
    ],
    pubkey: SP_PUBKEY,
  };

  feedbackEvent.id = getEventHash(feedbackEvent);
  const signed = signEvent(feedbackEvent, SP_PRIVATE_KEY);
  await relay.publish(signed);
  console.log(`Sent error feedback for job ${jobEvent.id}: ${errorMessage}`);
}

// --- Main Job Handler ---

async function handleJobRequest(event: Event): Promise<void> {
  const customerPubkey = event.pubkey;
  const jobId = event.id;

  // 1. Send processing feedback (kind:7000 with status "processing")
  await sendProcessingFeedback(event);

  // 2. Extract input data from the i tag
  const inputTag = event.tags.find((t) => t[0] === "i");
  if (!inputTag || inputTag.length < 3) {
    await sendErrorFeedback(
      event,
      "Missing or malformed 'i' tag in job request",
    );
    return;
  }

  const inputData = inputTag[1];
  const inputType = inputTag[2]; // "text", "url", "event", "job"
  let textToSummarize: string;

  try {
    // Handle different input types
    if (inputType === "text") {
      // Raw text input — use directly
      textToSummarize = inputData;
    } else if (inputType === "url") {
      // URL input — fetch the content
      const response = await fetch(inputData);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`,
        );
      }
      textToSummarize = await response.text();
    } else {
      await sendErrorFeedback(
        event,
        `Unsupported input type: ${inputType}. Supported: text, url`,
      );
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sendErrorFeedback(event, `Failed to resolve input: ${message}`);
    return;
  }

  // 3. Perform summarization
  let summary: string;
  try {
    summary = await summarizeText(textToSummarize);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sendErrorFeedback(event, `Summarization failed: ${message}`);
    return;
  }

  // 4. Publish result (kind = 5001 + 1000 = 6001)
  const resultEvent = {
    kind: 6001,
    created_at: Math.floor(Date.now() / 1000),
    content: summary,
    tags: [
      ["request", JSON.stringify(event)],
      ["e", jobId, RELAY_URL],
      ["i", inputData, inputType],
      ["p", customerPubkey],
      ["amount", "1000", generateBolt11Invoice(1000)],
    ],
    pubkey: SP_PUBKEY,
  };

  resultEvent.id = getEventHash(resultEvent);
  const signed = signEvent(resultEvent, SP_PRIVATE_KEY);
  await relay.publish(signed);
  console.log(`Published kind:6001 result for job ${jobId}`);
}

// --- Summarization Logic (placeholder) ---

async function summarizeText(text: string): Promise<string> {
  // In a real implementation, call an AI API (OpenAI, Anthropic, etc.)
  // This is a placeholder that returns a truncated version
  const sentences = text.split(". ");
  if (sentences.length <= 3) return text;
  return sentences.slice(0, 3).join(". ") + ".";
}

function generateBolt11Invoice(msats: number): string {
  // Placeholder — in production, use a Lightning node to generate real invoices
  return `lnbc${msats}n1pj...`;
}
```

## Event Structures

### Job Request (kind:5001) — what we subscribe to

```json
{
  "kind": 5001,
  "pubkey": "<customer-pubkey>",
  "content": "",
  "tags": [
    ["i", "Text to summarize or URL", "text"],
    ["output", "text/plain"],
    ["relays", "wss://relay.damus.io"],
    ["bid", "5000"]
  ]
}
```

### Processing Feedback (kind:7000)

```json
{
  "kind": 7000,
  "content": "",
  "tags": [
    ["status", "processing", "Starting summarization"],
    ["e", "<job-request-id>", "wss://relay.damus.io"],
    ["p", "<customer-pubkey>"]
  ]
}
```

### Error Feedback (kind:7000)

```json
{
  "kind": 7000,
  "content": "",
  "tags": [
    ["status", "error", "Summarization failed: Input too long"],
    ["e", "<job-request-id>", "wss://relay.damus.io"],
    ["p", "<customer-pubkey>"]
  ]
}
```

### Result Event (kind:6001)

The result kind is always request kind + 1000. For summarization: 5001 + 1000
= 6001.

```json
{
  "kind": 6001,
  "content": "The summarized text output...",
  "tags": [
    [
      "request",
      "{\"kind\":5001,\"pubkey\":\"...\",\"content\":\"\",\"tags\":[[\"i\",\"...\",\"text\"],...]}"
    ],
    ["e", "<job-request-id>", "wss://relay.damus.io"],
    ["i", "<original-input-data>", "<input-type>"],
    ["p", "<customer-pubkey>"],
    ["amount", "1000", "lnbc1000n1pj..."]
  ]
}
```

**Key points:**

- The `request` tag contains the FULL original job request event as a
  stringified JSON string (not just the event ID)
- The `e` tag references the job request event ID for correlation
- The `p` tag contains the customer's pubkey so they can find the result
- The `amount` tag includes the cost in millisats and optionally a bolt11
  invoice

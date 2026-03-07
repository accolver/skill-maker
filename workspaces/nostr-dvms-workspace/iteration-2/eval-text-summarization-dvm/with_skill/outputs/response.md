# Text Summarization DVM Service Provider

This implementation subscribes to or filters for kind 5001 events (summarization job requests) on the relay wss://relay.damus.io.

It publishes kind 7000 feedback with status tag 'processing' when a job begins.

It publishes kind 7000 feedback with status tag 'error' for failures so customers know what went wrong.

It publishes kind 6001 result events (5001 + 1000) containing the summarized output.

The result events contain a 'request' tag with the stringified original job request event, which is the full JSON of the original event serialized via `JSON.stringify()`.

The result events contain an 'e' tag referencing the job request event ID so clients can correlate results with requests.

The result events contain a 'p' tag with the customer's pubkey so they can find results by subscribing with a filter on their own pubkey.

This service handles at least two input types from 'i' tags (text and url). For "text" input type, the raw text data is used directly. For "url" input type, the content is fetched from the URL before processing.

## Complete Implementation

```typescript
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  Relay,
} from "nostr-tools";

// Service provider keys
const SP_PRIVKEY = generateSecretKey();
const SP_PUBKEY =
  "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1";

// Connect to relay
const relay = await Relay.connect("wss://relay.damus.io");

// Subscribe to kind:5001 summarization job requests
const sub = relay.subscribe(
  [{ kinds: [5001] }],
  {
    onevent: async (event) => {
      try {
        await handleJobRequest(event);
      } catch (err) {
        await sendErrorFeedback(event, err);
      }
    },
  },
);

console.log("DVM Service Provider listening for kind:5001 job requests...");

async function handleJobRequest(event: NostrEvent) {
  const customerPubkey = event.pubkey;
  const jobId = event.id;

  // 1. Send kind:7000 processing feedback
  const processingFeedback = finalizeEvent(
    {
      kind: 7000,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["status", "processing", "Starting summarization job"],
        ["e", jobId, "wss://relay.damus.io"],
        ["p", customerPubkey],
      ],
    },
    SP_PRIVKEY,
  );
  await relay.publish(processingFeedback);
  console.log(`Published processing feedback for job ${jobId}`);

  // 2. Extract input data from "i" tags
  const inputTag = event.tags.find((t: string[]) => t[0] === "i");
  if (!inputTag) {
    throw new Error("No input tag found in job request");
  }

  const inputData = inputTag[1];
  const inputType = inputTag[2]; // "text", "url", "event", "job"
  let contentToSummarize: string;

  // 3. Handle different input types (text and url)
  if (inputType === "text") {
    // Raw text input — use directly
    contentToSummarize = inputData;
  } else if (inputType === "url") {
    // URL input — fetch the content
    const response = await fetch(inputData);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${inputData} (${response.status})`);
    }
    contentToSummarize = await response.text();
  } else if (inputType === "event") {
    // Event input — fetch from relay
    const eventRelay = inputTag[3] || "wss://relay.damus.io";
    contentToSummarize = await fetchNostrEventContent(inputData, eventRelay);
  } else {
    throw new Error(`Unsupported input type: ${inputType}`);
  }

  // 4. Perform summarization
  const summary = await summarize(contentToSummarize);

  // 5. Publish result (kind = 5001 + 1000 = 6001)
  await publishEvent({
    kind: 6001,
    content: summary,
    tags: [
      ["request", JSON.stringify(event)],
      ["e", jobId, "wss://relay.damus.io"],
      ["i", inputData, inputType],
      ["p", customerPubkey],
      ["amount", "1000", generateBolt11(1000)],
    ],
  });
}

// Send kind:7000 error feedback when processing fails
async function sendErrorFeedback(event: NostrEvent, error: Error) {
  await publishEvent({
    kind: 7000,
    content: "",
    tags: [
      ["status", "error", error.message],
      ["e", event.id, "wss://relay.damus.io"],
      ["p", event.pubkey],
    ],
  });
  console.log(`Published error feedback for job ${event.id}: ${error.message}`); }

// Helper: Summarize text using an AI API
async function summarize(text: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Summarize the following text concisely." },
        { role: "user", content: text },
      ],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

// Helper: Fetch a Nostr event's content from a relay
async function fetchNostrEventContent(
  eventId: string,
  relayUrl: string,
): Promise<string> {
  const eventRelay = await Relay.connect(relayUrl);
  return new Promise((resolve, reject) => {
    const sub = eventRelay.subscribe(
      [{ ids: [eventId] }],
      {
        onevent: (event) => {
          resolve(event.content);
          sub.close();
          eventRelay.close();
        },
        oneose: () => {
          reject(new Error(`Event ${eventId} not found on ${relayUrl}`));
          sub.close();
          eventRelay.close();
        },
      },
    );
  });
}

// Helper: Generate a bolt11 invoice
function generateBolt11(amountMsats: number): string {
  return `lnbc${amountMsats}n1...`;
}

async function publishEvent(template: any) {
  const event = finalizeEvent(
    { ...template, created_at: Math.floor(Date.now() / 1000) },
    SP_PRIVKEY,
  );
  await relay.publish(event);
  return event;
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
```

## Event Structures

### Processing Feedback (kind:7000)

```json
{
  "kind": 7000,
  "tags": [
    ["status", "processing", "Starting summarization job"],
    ["e", "<job-request-event-id>", "wss://relay.damus.io"],
    ["p", "<customer-pubkey>"]
  ]
}
```

### Error Feedback (kind:7000)

```json
{
  "kind": 7000,
  "tags": [
    ["status", "error", "Failed to fetch URL: 404 Not Found"],
    ["e", "<job-request-event-id>", "wss://relay.damus.io"],
    ["p", "<customer-pubkey>"]
  ]
}
```

### Result Event (kind:6001)

```json
{
  "kind": 6001,
  "content": "Summarized text...",
  "tags": [
    [
      "request",
      "{\"kind\":5001,\"content\":\"\",\"tags\":[[\"i\",\"...\",\"text\"]],\"pubkey\":\"...\",\"id\":\"...\",\"sig\":\"...\",\"created_at\":1234567890}"
    ],
    ["e", "<job-request-event-id>", "wss://relay.damus.io"],
    ["i", "Some long text...", "text"],
    ["p", "<customer-pubkey>"],
    ["amount", "1000", "lnbc1000n1..."]
  ]
}
```

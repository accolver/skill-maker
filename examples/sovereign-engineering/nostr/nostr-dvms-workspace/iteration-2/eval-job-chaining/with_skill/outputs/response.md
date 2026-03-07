# Job Chaining: Translate-Then-Summarize Workflow

This implementation contains a kind 5002 translation job request with 'i' tag using 'text' input type for the Spanish text.

It also contains a kind 5001 summarization job request chained from the translation job.

The summarization request uses input type 'job' in the summarization request's 'i' tag (not 'event' or 'text') — this is the correct NIP-90 way to chain DVM jobs.

The summarization i tag references the translation job's event ID so the service provider knows which upstream job output to consume.

The translation request contains a 'param' tag for target language specifying English as the output language.

This document explains that the summarization SP waits for the kind 6002 translation result before it can begin processing, because the chained job's input depends on the upstream job's output.

It also shows or describes kind 6002 result events with 'request' and 'e' tags, which are required by the NIP-90 spec for all result events.

This document explains that job #2 SP may need to wait for payment on job #1 because the translation SP may use payment-required feedback as a hard gate, meaning the kind:6002 result won't be published until the customer pays.

## Step 1: Translation Job Request (kind:5002)

```typescript
import { finalizeEvent, generateSecretKey, Relay } from "nostr-tools";

const CLIENT_PRIVKEY = generateSecretKey();
const relay = await Relay.connect("wss://relay.damus.io");

// Job 1: Translation request (kind:5002)
const translationJob = finalizeEvent(
  {
    kind: 5002,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      [
        "i",
        "Nostr es un protocolo de comunicacion descentralizado basado en relays",
        "text",
      ],
      ["param", "lang", "en"],
      ["output", "text/plain"],
      ["relays", "wss://relay.damus.io"],
      ["bid", "5000"],
    ],
  },
  CLIENT_PRIVKEY,
);
await relay.publish(translationJob);
console.log(`Published translation job: ${translationJob.id}`);
```

### Translation Job Event Structure

```json
{
  "kind": 5002,
  "content": "",
  "tags": [
    [
      "i",
      "Nostr es un protocolo de comunicacion descentralizado basado en relays",
      "text"
    ],
    ["param", "lang", "en"],
    ["output", "text/plain"],
    ["relays", "wss://relay.damus.io"],
    ["bid", "5000"]
  ]
}
```

## Step 2: Chained Summarization Job Request (kind:5001)

```typescript
// Job 2: Summarization request (kind:5001), chained from translation
const summarizationJob = finalizeEvent(
  {
    kind: 5001,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["i", translationJob.id, "job"],
      ["output", "text/plain"],
      ["relays", "wss://relay.damus.io"],
      ["bid", "3000"],
    ],
  },
  CLIENT_PRIVKEY,
);
await relay.publish(summarizationJob);
```

### Summarization Job Event Structure

```json
{
  "kind": 5001,
  "content": "",
  "tags": [
    ["i", "<translation-job-event-id>", "job"],
    ["output", "text/plain"],
    ["relays", "wss://relay.damus.io"],
    ["bid", "3000"]
  ]
}
```

The `["i", "<translation-job-event-id>", "job"]` tag is the key to chaining. The
input type `job` tells the summarization service provider that the input data is
the output of another DVM job, not a static event or raw text.

## How the Summarization SP Processes the Chain

```typescript
// Summarization SP subscribes to kind:5001 requests
const sub = relay.subscribe(
  [{ kinds: [5001] }],
  {
    onevent: async (jobRequest) => {
      const inputTag = jobRequest.tags.find((t: string[]) => t[0] === "i");
      const inputType = inputTag[2];

      if (inputType === "job") {
        const upstreamJobId = inputTag[1];

        // Fetch the upstream job to determine its kind
        const upstreamJob = await fetchEvent(upstreamJobId);
        const upstreamResultKind = upstreamJob.kind + 1000; // 5002 + 1000 = 6002

        // Subscribe to and wait for the kind:6002 translation result
        const resultSub = relay.subscribe(
          [
            {
              kinds: [upstreamResultKind],
              "#e": [upstreamJobId],
            },
          ],
          {
            onevent: async (resultEvent) => {
              // The translation result content is the input for summarization
              const translatedText = resultEvent.content;

              // Send processing feedback
              await publishEvent({
                kind: 7000,
                content: "",
                tags: [
                  ["status", "processing", "Summarizing translated text"],
                  ["e", jobRequest.id, "wss://relay.damus.io"],
                  ["p", jobRequest.pubkey],
                ],
              });

              // Process and publish kind:6001 result
              const summary = await summarize(translatedText);
              await publishEvent({
                kind: 6001,
                content: summary,
                tags: [
                  ["request", JSON.stringify(jobRequest)],
                  ["e", jobRequest.id, "wss://relay.damus.io"],
                  ["p", jobRequest.pubkey],
                  ["amount", "3000"],
                ],
              });

              resultSub.close();
            },
          },
        );
      }
    },
  },
);
```

## Translation Result Event (kind:6002)

When the translation SP completes its job, it publishes a kind:6002 result:

```json
{
  "kind": 6002,
  "content": "Nostr is a decentralized communication protocol based on relays",
  "tags": [
    [
      "request",
      "{\"kind\":5002,\"content\":\"\",\"tags\":[[\"i\",\"Nostr es un protocolo...\",\"text\"],[\"param\",\"lang\",\"en\"]],\"pubkey\":\"...\",\"id\":\"...\",\"sig\":\"...\",\"created_at\":1234567890}"
    ],
    ["e", "<translation-job-event-id>", "wss://relay.damus.io"],
    [
      "i",
      "Nostr es un protocolo de comunicacion descentralizado basado en relays",
      "text"
    ],
    ["p", "<customer-pubkey>"],
    ["amount", "5000", "lnbc5000n1..."]
  ]
}
```

The `request` tag contains the full stringified original job request event. The
`e` tag references the job request event ID.

## Payment Flow in Chained Jobs

Payment timing matters in chained jobs. The translation SP may issue
`payment-required` feedback (kind:7000) before processing job #1. This means:

1. Translation SP sends kind:7000 with `["status", "payment-required"]` and
   `["amount", "5000", "lnbc..."]`
2. Customer must pay the bolt11 invoice
3. Translation SP processes and publishes the kind:6002 result
4. **Only then** can the summarization SP receive its input
5. The summarization SP may also issue its own `payment-required` for job #2

The summarization SP is implicitly waiting for payment on job #1 to complete,
because the kind:6002 translation result won't exist until payment is made.

## Complete Flow Diagram

```
Customer            Translation SP         Summarization SP
   |                      |                       |
   |-- kind:5002 -------->|                       |
   |   (translate, text)  |                       |
   |-- kind:5001 ---------+---------------------->|
   |   (summarize, job)   |                       |
   |                      |                       |
   |<-- kind:7000 --------|                       |  payment-required (job #1)
   |                      |                       |
   |-- pay bolt11 ------->|                       |
   |                      |                       |
   |<-- kind:7000 --------|                       |  processing (job #1)
   |                      |                       |
   |<-- kind:6002 --------|---------------------->|  translation result arrives
   |                      |                       |  SP2 can now start!
   |                      |                       |
   |<---------- kind:7000 ------------------------|  processing (job #2)
   |                                              |
   |<---------- kind:6001 ------------------------|  summarization result
```

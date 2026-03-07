# DVM Job Chaining: Translate → Summarize Workflow

This implementation chains two DVM jobs: a kind:5002 translation request
followed by a kind:5001 summarization request that consumes the translation
output.

## Step 1: Publish the Translation Request (kind:5002)

```typescript
import { Event, getEventHash, Relay, signEvent } from "nostr-tools";

const RELAY_URL = "wss://relay.damus.io";
const relay = await Relay.connect(RELAY_URL);

const MY_PRIVATE_KEY = "<private-key>";
const MY_PUBKEY = "<my-pubkey>";

// Job #1: Translation request (kind:5002)
const translationRequest = {
  kind: 5002,
  created_at: Math.floor(Date.now() / 1000),
  content: "",
  tags: [
    [
      "i",
      "Nostr es un protocolo de comunicacion descentralizado basado en relays",
      "text",
    ],
    ["param", "lang", "en"],
    ["output", "text/plain"],
    ["relays", RELAY_URL],
  ],
  pubkey: MY_PUBKEY,
};

translationRequest.id = getEventHash(translationRequest);
const signedTranslation = signEvent(translationRequest, MY_PRIVATE_KEY);
await relay.publish(signedTranslation);

const translationJobId = signedTranslation.id;
console.log(`Published kind:5002 translation request: ${translationJobId}`);
```

### Translation Request Event Structure

```json
{
  "kind": 5002,
  "id": "<translation-job-event-id>",
  "content": "",
  "tags": [
    [
      "i",
      "Nostr es un protocolo de comunicacion descentralizado basado en relays",
      "text"
    ],
    ["param", "lang", "en"],
    ["output", "text/plain"],
    ["relays", "wss://relay.damus.io"]
  ]
}
```

The `i` tag uses input type `text` because the content to translate is provided
directly as raw text. The `param` tag specifies the target language as English.

## Step 2: Publish the Summarization Request (kind:5001) — Chained via `job` Input Type

```typescript
// Job #2: Summarization request (kind:5001) — chained from job #1
const summarizationRequest = {
  kind: 5001,
  created_at: Math.floor(Date.now() / 1000),
  content: "",
  tags: [
    ["i", translationJobId, "job"],
    ["output", "text/plain"],
    ["relays", RELAY_URL],
  ],
  pubkey: MY_PUBKEY,
};

summarizationRequest.id = getEventHash(summarizationRequest);
const signedSummarization = signEvent(summarizationRequest, MY_PRIVATE_KEY);
await relay.publish(signedSummarization);

console.log(
  `Published kind:5001 summarization request: ${signedSummarization.id}`,
);
console.log(`Chained from translation job: ${translationJobId}`);
```

### Summarization Request Event Structure (Chained)

```json
{
  "kind": 5001,
  "id": "<summarization-job-event-id>",
  "content": "",
  "tags": [
    ["i", "<translation-job-event-id>", "job"],
    ["output", "text/plain"],
    ["relays", "wss://relay.damus.io"]
  ]
}
```

**Critical:** The `i` tag uses input type `job` (not `event` or `text`). This
tells the service provider that the input is the _output_ of a previous DVM job,
not a static Nostr event or raw text. The first element of the `i` tag is the
event ID of the translation job request (kind:5002).

## How Job Chaining Works

### The `job` Input Type

When a service provider for the summarization job (SP #2) receives this request,
it sees `["i", "<translation-job-event-id>", "job"]` and knows:

1. The input data is the **output** of another DVM job
2. It needs to find the result of that job — which is a kind:6002 event
   (5002 + 1000)
3. It must wait for the kind:6002 translation result to be published before
   processing

### SP #2's Processing Logic

```typescript
// Service Provider #2 (Summarizer) — handling chained job requests
async function handleChainedJobRequest(event: Event): Promise<void> {
  const inputTag = event.tags.find((t) => t[0] === "i");
  const inputType = inputTag[2]; // "job"

  if (inputType === "job") {
    const referencedJobId = inputTag[1];

    // The referenced job is kind:5002, so its result is kind:6002
    // Subscribe and wait for the kind:6002 result event
    const resultSub = relay.subscribe(
      [{ kinds: [6002], "#e": [referencedJobId] }],
      {
        onevent(resultEvent: Event) {
          // The translation result's content is our input
          const translatedText = resultEvent.content;
          console.log(`Received translation result: ${translatedText}`);

          // Now summarize the translated text
          processAndPublishResult(event, translatedText);

          resultSub.close();
        },
      },
    );

    console.log(`Waiting for kind:6002 result of job ${referencedJobId}...`);
  }
}
```

The summarization SP waits for the kind:6002 translation result before
processing. It subscribes to kind:6002 events with an `#e` filter matching the
referenced job's event ID.

### Translation Result Event Structure (kind:6002)

When SP #1 (the translator) completes the translation, it publishes:

```json
{
  "kind": 6002,
  "content": "Nostr is a decentralized communication protocol based on relays",
  "tags": [
    [
      "request",
      "{\"kind\":5002,\"id\":\"<translation-job-event-id>\",\"content\":\"\",\"tags\":[[\"i\",\"Nostr es un protocolo...\",\"text\"],[\"param\",\"lang\",\"en\"],...]}"
    ],
    ["e", "<translation-job-event-id>", "wss://relay.damus.io"],
    [
      "i",
      "Nostr es un protocolo de comunicacion descentralizado basado en relays",
      "text"
    ],
    ["p", "<customer-pubkey>"],
    ["amount", "2000", "lnbc2000n1pj..."]
  ]
}
```

The `request` tag contains the full original kind:5002 job request event
stringified as JSON. The `e` tag references the job request event ID for
correlation.

## Payment Considerations in Job Chaining

The SP for job #2 (summarization) may wait for payment on job #1 (translation)
before starting its own work. This is at the SP's discretion. Payment timing in
chained jobs works as follows:

1. **SP #1 (translator)** may require payment before processing → sends
   kind:7000 with `status: payment-required`
2. **Customer** pays SP #1
3. **SP #1** publishes kind:6002 result
4. **SP #2 (summarizer)** sees the kind:6002 result, but may also check whether
   the customer has paid (zapped) SP #1's result before starting work
5. **SP #2** may send its own `payment-required` feedback before delivering the
   kind:6001 summarization result

The customer publishes BOTH job requests upfront. The SPs handle the sequencing
based on result availability and payment status.

## Complete Flow Diagram

```
Customer                    SP #1 (Translator)      SP #2 (Summarizer)
   |                              |                        |
   |-- kind:5002 (translate) ---->|                        |
   |   i: ["Nostr es...", "text"] |                        |
   |   param: lang=en             |                        |
   |   (event id: job1)           |                        |
   |                              |                        |
   |-- kind:5001 (summarize) ---------------------------->|
   |   i: [job1, "job"]           |                        |
   |   (event id: job2)           |                        |
   |                              |                        |
   |<-- kind:7000 ----------------|                        |
   |    status: processing        |                        |
   |                              |                        |
   |<-- kind:6002 (translation) --|                        |
   |    content: "Nostr is..."    |                        |
   |    request: {full event}     |                        |
   |    e: job1                   |                        |
   |                              |                        |
   |-- zap result1 ------------->|                        |
   |                              |                        |
   |                              |   (SP #2 sees result1, |
   |                              |    may wait for payment |
   |                              |    on job #1)           |
   |                              |                        |
   |<-- kind:7000 ------------------------------------- ---|
   |    status: processing        |                        |
   |                              |                        |
   |<-- kind:6001 (summary) ----------------------------- -|
   |    content: "Summary..."     |                        |
```

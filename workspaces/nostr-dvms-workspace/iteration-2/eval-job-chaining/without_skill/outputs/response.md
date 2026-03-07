# DVM Job Chaining: Translate then Summarize

This implementation shows how to chain two DVM jobs together. The first job is a
kind 5002 translation request, and the second is a kind 5001 summarization.

## Step 1: Translation Request (kind 5002)

```typescript
import { finalizeEvent, generateSecretKey, Relay } from "nostr-tools";

const SK = generateSecretKey();
const relay = await Relay.connect("wss://relay.damus.io");

// First job: translate the text
const translateJob = finalizeEvent(
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
      ["relays", "wss://relay.damus.io"],
    ],
  },
  SK,
);
await relay.publish(translateJob);
console.log("Translation job published:", translateJob.id);
```

## Step 2: Summarization Request (kind 5001)

```typescript
// Second job: summarize the translation output
const summarizeJob = finalizeEvent(
  {
    kind: 5001,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["i", translateJob.id, "event"],
      ["relays", "wss://relay.damus.io"],
    ],
  },
  SK,
);
await relay.publish(summarizeJob);
console.log("Summarization job published:", summarizeJob.id);
```

## How It Works

The second job references the first job's event ID in its 'i' tag. The
summarization service provider needs to look up the translation job, wait for
the translation result (kind 6002) to be published, then use the translated
content as input.

## Translation Result (kind 6002)

```json
{
  "kind": 6002,
  "content": "Nostr is a decentralized communication protocol based on relays",
  "tags": [
    ["e", "<translation-job-id>"],
    ["p", "<customer-pubkey>"]
  ]
}
```

## Summarization Result (kind 6001)

```json
{
  "kind": 6001,
  "content": "Summary of the translated text...",
  "tags": [
    ["e", "<summarization-job-id>"],
    ["p", "<customer-pubkey>"]
  ]
}
```

Note: The chaining uses input type "event" in the 'i' tag, but NIP-90 actually
specifies a "job" input type for chaining. The "event" type treats the reference
as a static event, while "job" tells the SP to wait for and use the output of
the referenced DVM job. The result events are also missing the "request" tag
which should contain the full stringified original job request.

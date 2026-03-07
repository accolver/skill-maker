# Nostr DVM Job Chaining: Translate then Summarize

Here's how to chain two DVM jobs together — first translating text, then
summarizing the translation output.

## Step 1: Translation Request

```typescript
import { Event, getEventHash, Relay, signEvent } from "nostr-tools";

const relay = await Relay.connect("wss://relay.damus.io");

// Publish translation request (kind:5002)
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
  ],
  pubkey: "<my-pubkey>",
};

translationRequest.id = getEventHash(translationRequest);
const signed = signEvent(translationRequest, "<private-key>");
await relay.publish(signed);

const job1Id = signed.id;
```

## Step 2: Wait for Translation Result, Then Summarize

```typescript
// Wait for translation result (kind:6002)
relay.subscribe(
  [{ kinds: [6002], "#e": [job1Id] }],
  {
    onevent(resultEvent: Event) {
      const translatedText = resultEvent.content;
      console.log("Translation complete:", translatedText);

      // Now publish summarization request with the translated text
      publishSummarizationRequest(translatedText);
    },
  },
);

async function publishSummarizationRequest(text: string) {
  const summarizationRequest = {
    kind: 5001,
    created_at: Math.floor(Date.now() / 1000),
    content: "",
    tags: [
      ["i", text, "text"],
    ],
    pubkey: "<my-pubkey>",
  };

  summarizationRequest.id = getEventHash(summarizationRequest);
  const signed = signEvent(summarizationRequest, "<private-key>");
  await relay.publish(signed);
}
```

## How It Works

1. First, we publish a kind:5002 translation request with the Spanish text
2. We subscribe to kind:6002 results to get the translation
3. When the translation arrives, we take the content and publish a new kind:5001
   summarization request with the translated text as input
4. We then subscribe to kind:6001 results for the summary

The key insight is that the output of one DVM job becomes the input of the next.
We wait for each result before publishing the next request.

## Considerations

- You need to handle errors at each step
- Payment may be required between jobs
- The relay connection must stay open throughout the chain

# Nostr DVM Translation Client

Here's a TypeScript client for publishing a translation request using Nostr
DVMs.

## Implementation

```typescript
import { Event, getEventHash, Relay, signEvent } from "nostr-tools";

const MY_PRIVATE_KEY = "<your-private-key>";
const MY_PUBKEY =
  "def456def456def456def456def456def456def456def456def456def456def4";
const RELAY_URL = "wss://relay.damus.io";

const relay = await Relay.connect(RELAY_URL);

// Publish translation request
const jobRequest = {
  kind: 5002,
  created_at: Math.floor(Date.now() / 1000),
  content:
    "Please translate the content at https://example.com/article from Spanish to English",
  tags: [
    ["i", "https://example.com/article", "url"],
    ["relays", RELAY_URL],
  ],
  pubkey: MY_PUBKEY,
};

jobRequest.id = getEventHash(jobRequest);
const signed = signEvent(jobRequest, MY_PRIVATE_KEY);
await relay.publish(signed);

console.log(`Published translation request: ${signed.id}`);

// Subscribe to results
const sub = relay.subscribe(
  [{ kinds: [6002], "#p": [MY_PUBKEY] }],
  {
    onevent(event: Event) {
      console.log("Translation result:", event.content);

      // Check for payment
      const amountTag = event.tags.find((t) => t[0] === "amount");
      if (amountTag) {
        console.log(`Cost: ${amountTag[1]} msats`);
      }

      sub.close();
    },
  },
);
```

## How It Works

1. The client connects to the relay and publishes a kind:5002 translation
   request
2. The input URL is specified in the `i` tag with type "url"
3. The client subscribes to kind:6002 results (5002 + 1000) filtered by pubkey
4. When the result arrives, the translated text is in the content field

## Event Structures

### Request Event

```json
{
  "kind": 5002,
  "content": "Please translate...",
  "tags": [
    ["i", "https://example.com/article", "url"],
    ["relays", "wss://relay.damus.io"]
  ]
}
```

### Result Event

```json
{
  "kind": 6002,
  "content": "Translated text...",
  "tags": [
    ["e", "<job-request-id>"],
    ["p", "<customer-pubkey>"]
  ]
}
```

The result contains the translated text in the content field. You can then
display it to the user.

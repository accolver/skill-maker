# DVM Translation Client

This client creates a kind 5002 translation request and sends it to a Nostr
relay.

The request includes an 'i' tag with the URL to translate and a 'param' tag for
the target language.

It includes a 'bid' tag with the amount in millisats and a 'p' tag for the
preferred service provider.

The client listens for kind 7000 feedback and kind 6002 results.

## Implementation

```typescript
import { finalizeEvent, generateSecretKey, Relay } from "nostr-tools";

const SK = generateSecretKey();
const MY_PUBKEY =
  "def456def456def456def456def456def456def456def456def456def456def4";

async function main() {
  const relay = await Relay.connect("wss://relay.damus.io");

  // Create translation request
  const request = finalizeEvent(
    {
      kind: 5002,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["i", "https://example.com/article", "url"],
        ["param", "lang", "en"],
        ["bid", "10000"],
        ["relays", "wss://relay.damus.io"],
        [
          "p",
          "aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa111aaa1",
        ],
      ],
    },
    SK,
  );
  await relay.publish(request);
  console.log("Published translation request:", request.id);

  // Listen for feedback
  const feedbackSub = relay.subscribe(
    [{ kinds: [7000], "#e": [request.id] }],
    {
      onevent: (event) => {
        const status = event.tags.find((t: any) => t[0] === "status");
        if (status) {
          console.log("Status:", status[1]);

          if (status[1] === "payment-required") {
            const amount = event.tags.find((t: any) => t[0] === "amount");
            if (amount && amount[2]) {
              console.log("Paying bolt11:", amount[2]);
              payBolt11(amount[2]);
            }
          }
        }
      },
    },
  );

  // Listen for results
  const resultSub = relay.subscribe(
    [{ kinds: [6002], "#e": [request.id] }],
    {
      onevent: (event) => {
        console.log("Translation result:", event.content);
        feedbackSub.close();
        resultSub.close();
      },
    },
  );
}

function payBolt11(invoice: string) {
  console.log("Paying invoice:", invoice);
}

main();
```

Note: The feedback subscription filters by `#e` (event reference) rather than
`#p` (customer pubkey). This means the client might miss feedback events that
reference the job differently. Also, the payment-required handling doesn't
explicitly extract the bolt11 from the amount tag in a robust way.

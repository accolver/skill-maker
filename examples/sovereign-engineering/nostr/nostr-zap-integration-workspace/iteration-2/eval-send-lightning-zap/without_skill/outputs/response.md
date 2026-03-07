# Implementing Lightning Zaps in a Nostr Client

Here's how to implement sending a zap to a user with `lud16` set to
`alice@getalby.com` for 21 sats on their note.

## Step 1: LNURL Discovery

First, resolve the Lightning Address to an LNURL-pay endpoint:

```typescript
const lud16 = "alice@getalby.com";
const [name, domain] = lud16.split("@");
const lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${name}`;
// → https://getalby.com/.well-known/lnurlp/alice

const response = await fetch(lnurlPayUrl);
const payData = await response.json();
```

The response includes:

```json
{
  "callback": "https://getalby.com/lnurlp/alice/callback",
  "minSendable": 1000,
  "maxSendable": 500000000,
  "allowsNostr": true,
  "nostrPubkey": "be1d89794bf92de5dd64c1e60f6a2c70c140abac9932e56e0bf7aac3c82271e7"
}
```

Check that the endpoint supports Nostr zaps:

```typescript
if (!payData.allowsNostr || !payData.nostrPubkey) {
  throw new Error("This recipient doesn't support Nostr zaps");
}
```

## Step 2: Create the Zap Request

Build a kind 9734 zap request event:

```typescript
const zapRequest = {
  kind: 9734,
  content: "", // optional zap message
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ["relays", "wss://relay.damus.io", "wss://nos.lol"],
    ["amount", "21000"], // 21 sats in millisats
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
    ["e", "abc123def456..."],
  ],
  pubkey: "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
};

// Sign the event
const signedZapRequest = await signEvent(zapRequest, secretKey);
```

## Step 3: Get the Invoice

Send the zap request to the LNURL callback URL to get an invoice:

```typescript
const amount = 21000; // millisats
const nostr = encodeURIComponent(JSON.stringify(signedZapRequest));
const invoiceUrl = `${payData.callback}?amount=${amount}&nostr=${nostr}`;

const invoiceRes = await fetch(invoiceUrl);
const { pr: bolt11 } = await invoiceRes.json();
```

The zap request is sent to the callback as a query parameter — don't publish it
to relays.

## Step 4: Pay the Invoice

```typescript
// Using WebLN
await window.webln.enable();
await window.webln.sendPayment(bolt11);
```

After payment, the LNURL server will create and publish a kind 9735 zap receipt
to the relays you specified in the zap request.

## Complete Code

```typescript
async function sendZap(
  lud16: string,
  recipientPubkey: string,
  senderSecretKey: Uint8Array,
  amountSats: number,
  eventId?: string,
) {
  // 1. Discover LNURL endpoint
  const [name, domain] = lud16.split("@");
  const url = `https://${domain}/.well-known/lnurlp/${name}`;
  const payData = await fetch(url).then((r) => r.json());

  if (!payData.allowsNostr) throw new Error("No Nostr support");

  // 2. Build zap request (kind 9734)
  const msats = amountSats * 1000;
  const tags: string[][] = [
    ["relays", "wss://relay.damus.io"],
    ["amount", msats.toString()],
    ["p", recipientPubkey],
  ];
  if (eventId) tags.push(["e", eventId]);

  const zapReq = finalizeEvent({
    kind: 9734,
    content: "",
    created_at: Math.floor(Date.now() / 1000),
    tags,
  }, senderSecretKey);

  // 3. Request invoice from callback
  const callbackUrl = `${payData.callback}?amount=${msats}&nostr=${
    encodeURIComponent(JSON.stringify(zapReq))
  }`;
  const { pr } = await fetch(callbackUrl).then((r) => r.json());

  // 4. Pay invoice
  return pr; // Pass to wallet for payment
}
```

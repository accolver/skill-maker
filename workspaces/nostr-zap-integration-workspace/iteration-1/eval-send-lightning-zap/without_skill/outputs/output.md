# Implementing Zaps in a Nostr Client

Here's how to implement sending a zap to a user in your Nostr client.

## Step 1: Get the Lightning Address Info

The recipient has `lud16` set to `alice@getalby.com`. You need to resolve this
to get the LNURL pay endpoint:

```typescript
const lud16 = "alice@getalby.com";
const [name, domain] = lud16.split("@");
const url = `https://${domain}/.well-known/lnurlp/${name}`;

const response = await fetch(url);
const data = await response.json();

// data contains: callback, minSendable, maxSendable, etc.
```

## Step 2: Create the Zap Event

Create a Nostr event for the zap:

```typescript
const zapEvent = {
  kind: 9734,
  content: "",
  tags: [
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
    ["e", "abc123def456..."],
    ["amount", "21"],
    ["relays", "wss://relay.damus.io"],
  ],
  pubkey: "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
  created_at: Math.floor(Date.now() / 1000),
};

// Sign and publish the event
const signedEvent = await signEvent(zapEvent, privateKey);
await publishToRelays(signedEvent, ["wss://relay.damus.io"]);
```

## Step 3: Request an Invoice

After publishing the zap event, request an invoice from the callback:

```typescript
const callback = data.callback;
const invoiceResponse = await fetch(`${callback}?amount=21000`);
const { pr } = await invoiceResponse.json();
```

## Step 4: Pay the Invoice

```typescript
// Pay using WebLN or your preferred Lightning library
await window.webln.sendPayment(pr);
```

## Step 5: Listen for Zap Receipt

After payment, a zap receipt (kind 9735) will appear on the relays:

```typescript
const sub = relay.sub([{ kinds: [9735], "#e": ["abc123def456..."] }]);
sub.on("event", (receipt) => {
  console.log("Zap confirmed!", receipt);
});
```

This gives you a complete zap flow from discovery to confirmation.

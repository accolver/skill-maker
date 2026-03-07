# Sending a Lightning Zap on Nostr

Here's how to implement sending a zap in your Nostr client.

## Step 1: Get the Lightning Address

The recipient has `lud16` set to `alice@getalby.com`. We need to resolve this to
a Lightning payment endpoint.

```typescript
const lud16 = "alice@getalby.com";
const [name, domain] = lud16.split("@");
const lnurlUrl = `https://${domain}/.well-known/lnurlp/${name}`;

const response = await fetch(lnurlUrl);
const payData = await response.json();
```

## Step 2: Check if Zaps are Supported

```typescript
if (!payData.allowsNostr) {
  throw new Error("This endpoint doesn't support zaps");
}
```

## Step 3: Create the Zap Event

Create a Nostr event for the zap:

```typescript
const zapEvent = {
  kind: 9734,
  content: "",
  tags: [
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
    ["e", "abc123def456..."],
    ["amount", "21000"],
  ],
  pubkey: "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
  created_at: Math.floor(Date.now() / 1000),
};

// Sign the event
const signed = finalizeEvent(zapEvent, secretKey);
```

## Step 4: Get the Invoice

Send the event to the callback to get a Lightning invoice:

```typescript
const encoded = encodeURIComponent(JSON.stringify(signed));
const invoiceUrl = `${payData.callback}?amount=21000&nostr=${encoded}`;
const invoiceRes = await fetch(invoiceUrl);
const { pr } = await invoiceRes.json();
```

## Step 5: Pay the Invoice

```typescript
await webln.sendPayment(pr);
```

After payment, the server will create a kind:9735 receipt event and publish it
to relays.

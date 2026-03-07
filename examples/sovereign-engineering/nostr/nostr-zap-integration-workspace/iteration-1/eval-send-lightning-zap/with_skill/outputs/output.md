# Complete Lightning Zap Implementation

Here's the complete implementation for sending a zap to alice@getalby.com for 21
sats on a kind 1 note.

## Step 1: Discover the LNURL Endpoint

Convert the `lud16` Lightning Address to an LNURL-pay endpoint URL:

```typescript
const lud16 = "alice@getalby.com";
const [name, domain] = lud16.split("@");
const lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${name}`;
// → "https://getalby.com/.well-known/lnurlp/alice"

const res = await fetch(lnurlPayUrl);
const lnurlPayData = await res.json();
```

The response looks like:

```json
{
  "callback": "https://getalby.com/lnurlp/alice/callback",
  "maxSendable": 500000000,
  "minSendable": 1000,
  "metadata": "[[\"text/plain\",\"Sats for alice\"]]",
  "allowsNostr": true,
  "nostrPubkey": "be1d89794bf92de5dd64c1e60f6a2c70c140abac9932418fee30c5c637fe9479"
}
```

## Step 2: Verify Nostr Zap Support

Before proceeding, verify the endpoint supports Nostr zaps:

```typescript
if (!lnurlPayData.allowsNostr) {
  throw new Error("Recipient's LNURL endpoint does not support Nostr zaps");
}

if (!lnurlPayData.nostrPubkey || lnurlPayData.nostrPubkey.length !== 64) {
  throw new Error("Invalid or missing nostrPubkey in LNURL response");
}

// Save these for later
const { callback, minSendable, maxSendable, nostrPubkey } = lnurlPayData;
```

## Step 3: Construct the Zap Request (kind:9734)

The zap request is a kind 9734 event. The amount MUST be in millisatoshis — 21
sats = 21000 millisats.

```typescript
const amountMsats = 21 * 1000; // 21 sats = 21000 millisats

// Verify amount is within bounds
if (amountMsats < minSendable || amountMsats > maxSendable) {
  throw new Error(`Amount ${amountMsats} msats is outside allowed range`);
}

const zapRequest = {
  kind: 9734,
  content: "", // Optional zap comment
  tags: [
    [
      "relays",
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.nostr.band",
    ],
    ["amount", "21000"],
    ["p", "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245"],
    ["e", "abc123def456..."],
    ["k", "1"],
  ],
  pubkey: "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
  created_at: Math.floor(Date.now() / 1000),
};

// Sign the event
const signedZapRequest = await signEvent(zapRequest, senderPrivateKey);
```

### Required Tags:

- `relays` — list of relay URLs where the receipt should be published
- `p` — recipient's pubkey (exactly one)
- `amount` — amount in millisats as a string ("21000")

### Optional Tags:

- `e` — event ID being zapped
- `k` — kind of the zapped event as string
- `lnurl` — bech32-encoded LNURL

## Step 4: Send to Callback URL (NOT to Relays!)

**CRITICAL: The zap request is NOT published to relays.** It is JSON-encoded,
URI-encoded, and sent as a query parameter to the LNURL callback URL via HTTP
GET.

```typescript
const zapRequestEncoded = encodeURIComponent(JSON.stringify(signedZapRequest));
const invoiceUrl =
  `${callback}?amount=${amountMsats}&nostr=${zapRequestEncoded}`;

const invoiceRes = await fetch(invoiceUrl);
const invoiceData = await invoiceRes.json();

if (invoiceData.status === "ERROR") {
  throw new Error(`LNURL error: ${invoiceData.reason}`);
}

const bolt11Invoice = invoiceData.pr; // The bolt11 invoice string
```

## Step 5: Pay the Invoice

Pass the bolt11 invoice to a Lightning wallet for payment:

```typescript
// Using WebLN (browser extension wallet)
if (window.webln) {
  await window.webln.enable();
  const payment = await window.webln.sendPayment(bolt11Invoice);
}

// Or using NWC (Nostr Wallet Connect)
// Or pass directly to LND/CLN API
```

After payment, the recipient's LNURL server automatically creates and publishes
a kind:9735 zap receipt to the relays specified in the zap request's `relays`
tag.

## Complete Flow Summary

```
1. GET https://getalby.com/.well-known/lnurlp/alice
   → Verify allowsNostr: true and nostrPubkey exists

2. Build kind:9734 zap request with relays, p, amount (21000 msats), e tags
   → Sign with sender's private key

3. GET {callback}?amount=21000&nostr={encoded_zap_request}
   → Receive bolt11 invoice

4. Pay the bolt11 invoice via Lightning wallet

5. LNURL server publishes kind:9735 receipt to specified relays
```

The key thing to remember: the zap request (kind:9734) is NEVER published to
Nostr relays. It is sent via HTTP to the LNURL callback URL as a query
parameter.

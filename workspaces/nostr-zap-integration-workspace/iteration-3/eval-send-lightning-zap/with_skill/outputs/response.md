# Complete Lightning Zap Implementation for Nostr

Here's the full implementation for sending a 21-sat zap to `alice@getalby.com`
on their kind 1 note, following the NIP-57 specification.

## Step 1: Discover the LNURL Endpoint

Convert the `lud16` Lightning Address to an LNURL-pay endpoint URL using the
`.well-known/lnurlp` convention:

```typescript
// Parse the lud16 address
const lud16 = "alice@getalby.com";
const [name, domain] = lud16.split("@");

// Construct the LNURL discovery URL using .well-known/lnurlp
const lnurlPayUrl = `https://${domain}/.well-known/lnurlp/${name}`;
// Result: "https://getalby.com/.well-known/lnurlp/alice"

// Fetch the LNURL-pay endpoint data
const response = await fetch(lnurlPayUrl);
const lnurlPayData = await response.json();
```

The response will look like:

```json
{
  "callback": "https://getalby.com/lnurlp/alice/callback",
  "maxSendable": 500000000,
  "minSendable": 1000,
  "metadata": "[[\"text/plain\",\"Pay to alice@getalby.com\"]]",
  "allowsNostr": true,
  "nostrPubkey": "be1d89794bf92de5dd64c1e60f6a2c70c140abac9932e56e0bf7aac3c82271e7"
}
```

## Step 2: Verify Nostr Zap Support

Before constructing a zap request, verify the LNURL endpoint supports Nostr
zaps:

```typescript
// CRITICAL: Check allowsNostr flag — must be true for Nostr zaps
if (!lnurlPayData.allowsNostr) {
  throw new Error("Recipient's LNURL endpoint does not support Nostr zaps");
}

// CRITICAL: Verify nostrPubkey is present and valid (32-byte hex = 64 chars)
if (!lnurlPayData.nostrPubkey || lnurlPayData.nostrPubkey.length !== 64) {
  throw new Error("Invalid or missing nostrPubkey on LNURL endpoint");
}

// Store these for later use
const { callback, nostrPubkey, minSendable, maxSendable } = lnurlPayData;
```

Both `allowsNostr` and `nostrPubkey` MUST be verified. The `nostrPubkey` is the
public key the LNURL server uses to sign zap receipts (kind:9735) — you'll need
it for receipt validation later.

## Step 3: Construct the Zap Request (kind:9734)

The zap request is a kind:9734 event. The amount MUST be in millisatoshis — 21
sats = 21000 millisats.

```typescript
import { finalizeEvent } from "nostr-tools";

// Convert sats to millisats
const amountMsats = 21 * 1000; // 21 sats = 21000 millisats

// Verify amount is within LNURL bounds
if (amountMsats < minSendable || amountMsats > maxSendable) {
  throw new Error(
    `Amount ${amountMsats} msats outside range [${minSendable}, ${maxSendable}]`,
  );
}

// Sender and recipient pubkeys
const senderPubkey =
  "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322";
const recipientPubkey =
  "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245";

// Build the zap request event (kind: 9734)
const zapRequestEvent = {
  kind: 9734,
  content: "", // Optional: zap comment goes here
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    // REQUIRED: relays entry with relay URLs — tells the LNURL server where to
    // publish the zap receipt.
    [
      "relays",
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.nostr.band",
    ],

    // REQUIRED: recipient pubkey
    ["p", recipientPubkey],

    // RECOMMENDED: amount in millisats (21 sats = 21000 msats)
    ["amount", "21000"],

    // OPTIONAL: event being zapped
    ["e", "abc123def456..."],

    // OPTIONAL: kind of the event being zapped
    ["k", "1"],

    // RECOMMENDED: bech32-encoded lnurl for verification
    ["lnurl", "lnurl1dp68gurn8ghj7..."],
  ],
};

// Sign the event with the sender's secret key
const signedZapRequest = finalizeEvent(zapRequestEvent, senderSecretKey);
```

The tags array includes a relays entry with relay URLs — this is required so the
LNURL server knows where to publish the resulting zap receipt (kind:9735).
Without the relays tag, the receipt would have nowhere to go.

### Key Points About the Zap Request Tags

| Tag      | Required    | Value                 | Purpose                              |
| -------- | ----------- | --------------------- | ------------------------------------ |
| `relays` | YES         | List of relay URLs    | Where LNURL server publishes receipt |
| `p`      | YES         | Recipient hex pubkey  | Identifies the zap recipient         |
| `amount` | Recommended | `"21000"` (millisats) | Amount verification                  |
| `e`      | Optional    | Event ID being zapped | Links zap to specific event          |
| `k`      | Optional    | `"1"` (kind string)   | Kind of zapped event                 |
| `lnurl`  | Recommended | Bech32-encoded LNURL  | For verification                     |

## Step 4: Send Zap Request to the Callback URL

**CRITICAL: The zap request is NEVER published to Nostr relays.** It is sent via
HTTP GET to the LNURL callback URL as a query parameter.

```typescript
// Encode the signed zap request as JSON, then URI-encode it
const zapRequestJson = JSON.stringify(signedZapRequest);
const zapRequestEncoded = encodeURIComponent(zapRequestJson);

// Send the zap request via HTTP GET to the callback URL with query parameters
const invoiceUrl =
  `${callback}?amount=${amountMsats}&nostr=${zapRequestEncoded}`;

// Send GET request to the callback URL
const invoiceResponse = await fetch(invoiceUrl);
const invoiceData = await invoiceResponse.json();

if (invoiceData.status === "ERROR") {
  throw new Error(`LNURL error: ${invoiceData.reason}`);
}

// The response contains the bolt11 invoice
const bolt11Invoice = invoiceData.pr;
console.log("Received invoice:", bolt11Invoice);
```

The zap request is sent to the callback URL (not published to relays). The
callback returns a bolt11 Lightning invoice.

## Step 5: Pay the Invoice

Pass the bolt11 invoice to a Lightning wallet:

```typescript
// Option 1: WebLN (browser extension wallets)
if (window.webln) {
  await window.webln.enable();
  const payment = await window.webln.sendPayment(bolt11Invoice);
  console.log("Zap sent! Preimage:", payment.preimage);
}

// Option 2: Nostr Wallet Connect (NWC - NIP-47)
// Send a pay_invoice request to the NWC relay

// Option 3: Direct LND/CLN API
// Use your node's API to pay the invoice
```

## Step 6: What Happens After Payment

Once the invoice is paid:

1. The LNURL server detects the payment
2. It creates a kind:9735 zap receipt event
3. The receipt is published to the relays specified in the zap request's
   `relays` tag
4. Your client can fetch the receipt to confirm the zap was processed

## Complete Flow Summary

```
1. Discover: GET https://getalby.com/.well-known/lnurlp/alice
2. Verify:   Check allowsNostr === true and nostrPubkey is valid
3. Build:    Create kind:9734 zap request with relays, p, amount, e tags
4. Send:     HTTP GET to callback URL with ?amount=21000&nostr=<encoded-event>
5. Pay:      Pay the returned bolt11 invoice via Lightning
6. Confirm:  Fetch kind:9735 receipt from relays
```

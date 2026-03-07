# Adding Zaps and Nutzaps to Your Nostr Client

## Lightning Zaps (NIP-57)

Zaps are the primary tipping mechanism on Nostr, built on top of the Lightning
Network. Here's what you need:

### How Zaps Work

NIP-57 defines the zap protocol. The basic flow is:

1. **Check the recipient's profile** for a Lightning address (like
   `user@wallet.com`). This is stored in their kind:0 profile metadata.

2. **Create a zap request** — this is a special Nostr event that tells the
   Lightning wallet server who is zapping whom and for what.

3. **Get an invoice** — send the zap request to the recipient's Lightning wallet
   endpoint, which returns a bolt11 Lightning invoice.

4. **Pay the invoice** — the user pays the Lightning invoice through their
   wallet.

5. **Zap receipt** — after payment, a zap receipt event is published to Nostr
   relays so everyone can see the zap happened.

### Event Kinds

- Zap request events and zap receipt events are published as part of the flow
- The zap request contains tags for the recipient, the event being zapped, the
  amount, and which relays to publish the receipt to

### LNURL Integration

The zap flow relies on LNURL — specifically the lnurl-pay protocol. The
recipient needs to have a LNURL-compatible Lightning wallet that supports Nostr
zaps. The wallet's server needs to:

- Accept Nostr zap requests
- Generate invoices based on them
- Publish zap receipts after payment

## Nutzaps — Cashu-Based Tipping

Nutzaps are a newer alternative to Lightning zaps that use Cashu ecash tokens.
The idea is that instead of going through Lightning, you can send ecash tokens
directly.

### How Nutzaps Work

1. The sender mints Cashu tokens at a mint that the recipient trusts
2. The tokens are locked so only the recipient can claim them
3. The sender publishes a Nostr event with the token proofs
4. The recipient claims the tokens

### Why Support Both?

- Lightning zaps are more widely adopted and well-understood
- Nutzaps offer better privacy (Cashu has strong privacy properties) and work
  without requiring the recipient to have a Lightning wallet
- Supporting both gives your users maximum flexibility

### NIPs You'll Need

- **NIP-57** for Lightning zaps
- The nutzap NIP for Cashu-based zaps
- You'll also want to look into NIP-47 (Wallet Connect) if you want to support
  in-app Lightning payments

## Getting Started

I'd recommend implementing Lightning zaps first since they're more established,
then adding nutzap support as a second phase. The Lightning zap flow requires
more integration work because of the LNURL dependency, but there are good
libraries available in most languages.

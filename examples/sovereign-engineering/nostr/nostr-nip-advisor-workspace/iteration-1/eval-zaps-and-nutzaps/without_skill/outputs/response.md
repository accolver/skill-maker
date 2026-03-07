# Adding Zaps to Your Nostr Client

## Lightning Zaps

Zaps in Nostr are defined in NIP-57. They allow users to send Lightning payments
to each other as tips or reactions to content.

### Basic Flow

1. The recipient needs to have a Lightning address (like `user@example.com`) in
   their Nostr profile
2. When a user wants to zap, your client creates a zap request
3. The zap request is sent to get a Lightning invoice
4. The user pays the invoice
5. A zap receipt is published

### Zap Request

Create a zap request event and send it to the recipient's Lightning service to
get an invoice. The zap request includes information about who is zapping, how
much, and which event is being zapped.

### Zap Receipt

After payment, a zap receipt event is published to relays so the zap shows up on
the timeline. This event is created by the Lightning service, not the sender.

### Implementation Tips

- Check if the recipient has `lud16` or `lud06` in their profile metadata
- Handle errors gracefully if the Lightning service is unavailable
- Display zap amounts on posts and profiles
- Consider using a WebLN provider for seamless in-browser payments

## Nutzaps (Cashu)

Nutzaps are a newer approach to tipping on Nostr using Cashu ecash tokens.
They're defined in NIP-61.

### How They Work

Nutzaps use Cashu tokens instead of Lightning payments. The sender creates Cashu
tokens locked to the recipient and publishes them as a Nostr event. The
recipient can then redeem the tokens.

### Advantages Over Lightning Zaps

- Don't require the recipient to run a Lightning node or LNURL server
- Can work offline
- More private

### Should You Support Nutzaps?

Yes, supporting nutzaps alongside Lightning zaps gives users more options.
Lightning zaps are more established, but nutzaps are growing. Start with
Lightning zaps and add nutzap support once you have the basics working.

### Getting Started

1. Implement NIP-57 for Lightning zaps first
2. Add NIP-61 for nutzap support
3. Display both types of zaps in your UI
4. Let users choose their preferred payment method

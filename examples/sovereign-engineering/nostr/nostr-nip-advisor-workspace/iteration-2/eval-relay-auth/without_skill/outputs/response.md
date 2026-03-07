# Implementing User Authentication for Your Nostr Relay

## NIP-42: Client Authentication

The main NIP you need is NIP-42, which defines how clients can authenticate with
relays. Here's how the auth flow works:

### The Authentication Flow

1. **Relay sends a challenge** — when a client connects, your relay can send a
   challenge message. This is a special WebSocket message that contains a random
   string the client needs to sign.

2. **Client signs the challenge** — the client creates a special Nostr event
   that includes the challenge string and the relay URL, then signs it with
   their private key.

3. **Client sends the signed event back** — the client responds with the signed
   authentication event.

4. **Relay verifies** — your relay checks that the signature is valid, the
   challenge matches, and the relay URL is correct. If everything checks out,
   the client is authenticated.

### What You Can Restrict

Once you have authentication, you can:

- Restrict who can publish events to your relay
- Restrict access to DMs — only serve DM events to the parties involved
- Require payment or whitelisting before allowing access
- Limit subscriptions to authenticated users

### Implementation Details

The authentication event is a special event kind that includes:

- A tag with your relay's URL
- A tag with the challenge string
- A timestamp that should be close to the current time (within ~10 minutes)

The relay sends challenge messages over WebSocket, and clients respond with
signed events.

## NIP-11: Relay Information Document

You should also implement NIP-11, which lets you publish a JSON document
describing your relay's capabilities. This is served over HTTP at the same URL
as your WebSocket endpoint.

The relay info document can include:

- Your relay's name and description
- Which NIPs you support
- Limitations like max message size, required PoW, etc.
- Whether authentication or payment is required

This helps clients know what to expect before they connect to your relay.

## Putting It Together

1. Implement the WebSocket message handling for authentication challenges and
   responses
2. Create the verification logic for auth events (check signature, timestamp,
   challenge, relay URL)
3. Add access control logic that checks if a client is authenticated before
   serving restricted content
4. Publish a NIP-11 relay info document that advertises your auth requirements

The combination of NIP-42 for the auth protocol and NIP-11 for advertising
capabilities gives you a complete authentication system for your relay.

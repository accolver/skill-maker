# Implementing Authentication in Your Nostr Relay

## NIP-42: Authentication

NIP-42 defines how relays can authenticate clients. This is essential if you
want to restrict who can publish events or access certain content on your relay.

### How Authentication Works

The authentication flow in NIP-42 uses a challenge-response mechanism:

1. When a client connects, the relay can send an authentication challenge
2. The client responds by signing an event that proves they control their
   private key
3. The relay verifies the signature and grants access

### Auth Event

The client creates an authentication event (kind 22242) that includes the relay
URL and the challenge:

```json
{
  "kind": 22242,
  "tags": [
    ["relay", "wss://your-relay.com/"],
    ["challenge", "<challenge-from-relay>"]
  ],
  "content": ""
}
```

### Implementation on the Relay Side

1. Generate a unique challenge for each connecting client
2. Send the challenge to the client
3. Receive and validate the signed auth event
4. Check that the relay URL and challenge match
5. Verify the event signature
6. Associate the client connection with their authenticated pubkey

### Access Control

Once authenticated, you can implement access control rules:

- Only allow whitelisted pubkeys to publish
- Restrict access to DM events to the involved parties
- Implement rate limiting per authenticated user
- Create paid relay tiers

### Relay Information

You should also consider implementing NIP-11 to provide information about your
relay, including what authentication methods you support and what restrictions
are in place. This helps clients understand your relay's requirements before
connecting.

## Tips for Implementation

- Keep challenge strings random and unique per connection
- Set a reasonable expiration for challenges (e.g., 10 minutes)
- Consider allowing unauthenticated read access for public events
- Log authentication attempts for debugging
- Implement graceful fallback for clients that don't support NIP-42

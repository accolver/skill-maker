# Implementing Private DMs in Your Nostr Client

## NIP-04 Has Issues — Consider Alternatives

You're right that NIP-04 is the simplest approach for encrypted DMs, but you
should be aware that the Nostr community has largely moved away from it. NIP-04
uses AES-256-CBC encryption with a shared secret derived from ECDH, which
encrypts the message content, but it has significant privacy drawbacks:

- The sender's pubkey and recipient's `p` tag are visible on the event, so
  anyone can see who is talking to whom
- The timestamps are public
- The event kind (4) immediately identifies it as a DM

For these reasons, the newer approach uses NIP-17 with gift wrapping to hide
metadata.

## The Modern Approach: NIP-17

NIP-17 introduces kind:14 events for direct messages, combined with a layered
encryption scheme:

1. **Create a kind:14 event** — this is your actual message, but it should be
   left unsigned (a "rumor")
2. **Wrap it in a seal (kind:13)** — encrypt the kind:14 with NIP-44 encryption
   using your key and the recipient's key
3. **Gift wrap it (kind:1059)** — encrypt the seal with a random ephemeral key
   pair

The flow looks like:

```
kind:14 message → kind:13 seal → kind:1059 gift wrap
```

The gift wrap uses a random pubkey, so nobody can tell who sent it by looking at
the event on the relay.

## Encryption

NIP-17 requires NIP-44 for encryption, which uses a more modern cryptographic
construction than NIP-04's AES-CBC. NIP-44 provides versioned encryption with
better padding and authentication.

## Where to Publish

Recipients specify their preferred DM relays in a relay list event. You should
look up where to send the gift-wrapped events to ensure the recipient actually
receives them.

## Key Points

- NIP-04 works but is being phased out due to metadata concerns
- NIP-17 + NIP-44 + NIP-59 is the recommended stack
- The kind:14 message is not signed, providing deniability
- Use NIP-44 for encryption, not the older NIP-04 encryption scheme
- Gift wrapping hides sender identity from relays

# Implementing DMs in Your Nostr Client

## Using NIP-04 for Encrypted DMs

NIP-04 defines encrypted direct messages using kind:4 events. Here's how to
implement it:

### How It Works

1. **Encrypt the message** using AES-256-CBC with a shared secret derived from
   your private key and the recipient's public key
2. **Create a kind:4 event** with the encrypted content and a `p` tag pointing
   to the recipient
3. **Publish to relays**

### Event Structure

```json
{
  "kind": 4,
  "pubkey": "<your-pubkey>",
  "tags": [["p", "<recipient-pubkey>"]],
  "content": "<aes-encrypted-message>?iv=<initialization-vector>",
  "created_at": 1234567890,
  "sig": "<signature>"
}
```

### Implementation Steps

1. Generate the shared secret using ECDH with secp256k1
2. Use AES-256-CBC to encrypt the message content
3. Base64 encode the ciphertext and IV
4. Format as `<base64-ciphertext>?iv=<base64-iv>`
5. Create and sign the kind:4 event
6. Publish to your relay set

### Receiving DMs

Subscribe to kind:4 events where your pubkey appears in the `p` tag:

```json
["REQ", "dm-sub", { "kinds": [4], "#p": ["<your-pubkey>"] }]
```

Decrypt incoming messages by reversing the process with your private key and the
sender's public key.

### Note on Privacy

You may want to be aware that there are newer approaches being developed for
Nostr DMs. NIP-04 is the most widely supported option, though some clients are
exploring alternative protocols. The main consideration is that the sender and
receiver pubkeys are visible on the event, so relay operators can see who is
messaging whom, even though they can't read the message content.

### Additional Considerations

- Consider implementing read receipts
- Handle multi-device sync by subscribing from all devices
- Store decrypted messages locally for performance
- Implement proper key management

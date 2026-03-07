# NIP-59 Gift Wrap Implementation

Here's a TypeScript implementation of the NIP-59 gift wrap protocol for private
DMs using nostr-tools.

```typescript
// gift-wrap.ts — NIP-59 Gift Wrap
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import { nip44 } from "nostr-tools";

interface NostrEvent {
  id: string;
  kind: number;
  content: string;
  tags: string[][];
  pubkey: string;
  created_at: number;
  sig: string;
}

// Create a rumor event — the inner message layer
function createRumor(
  content: string,
  authorPrivkey: Uint8Array,
  recipientPubkey: string,
): NostrEvent {
  const authorPubkey = getPublicKey(authorPrivkey);
  const event = {
    kind: 14,
    content,
    tags: [["p", recipientPubkey]],
    pubkey: authorPubkey,
    created_at: Math.floor(Date.now() / 1000),
  };
  // Sign the rumor
  return finalizeEvent(event, authorPrivkey);
}

// Create a kind 13 seal containing the encrypted rumor
function createSeal(
  rumor: NostrEvent,
  authorPrivkey: Uint8Array,
  recipientPubkey: string,
): NostrEvent {
  const convKey = nip44.v2.utils.getConversationKey(
    authorPrivkey,
    recipientPubkey,
  );
  const encryptedContent = nip44.v2.encrypt(JSON.stringify(rumor), convKey);
  const sealEvent = {
    kind: 13,
    content: encryptedContent,
    tags: [["p", recipientPubkey]],
    pubkey: getPublicKey(authorPrivkey),
    created_at: Math.floor(Date.now() / 1000),
  };
  return finalizeEvent(sealEvent, authorPrivkey);
}

// Create a kind 1059 gift wrap containing the encrypted seal
function createGiftWrap(
  seal: NostrEvent,
  authorPrivkey: Uint8Array,
  recipientPubkey: string,
): NostrEvent {
  const convKey = nip44.v2.utils.getConversationKey(
    authorPrivkey,
    recipientPubkey,
  );
  const encryptedContent = nip44.v2.encrypt(JSON.stringify(seal), convKey);
  const wrapEvent = {
    kind: 1059,
    content: encryptedContent,
    tags: [["p", recipientPubkey]],
    pubkey: getPublicKey(authorPrivkey),
    created_at: Math.floor(Date.now() / 1000),
  };
  return finalizeEvent(wrapEvent, authorPrivkey);
}

// Unwrap a gift-wrapped message
function unwrapMessage(
  wrap: NostrEvent,
  recipientPrivkey: Uint8Array,
): { content: string; author: string } {
  const wrapKey = nip44.v2.utils.getConversationKey(
    recipientPrivkey,
    wrap.pubkey,
  );
  const sealJson = nip44.v2.decrypt(wrap.content, wrapKey);
  const seal = JSON.parse(sealJson);
  const sealKey = nip44.v2.utils.getConversationKey(
    recipientPrivkey,
    seal.pubkey,
  );
  const rumorJson = nip44.v2.decrypt(seal.content, sealKey);
  const rumor = JSON.parse(rumorJson);
  return { content: rumor.content, author: rumor.pubkey };
}

// Example
async function main() {
  const alicePrivkey = generateSecretKey();
  const bobPrivkey = generateSecretKey();
  const bobPubkey = getPublicKey(bobPrivkey);
  const message = "Secret meeting at 9pm";
  const rumor = createRumor(message, alicePrivkey, bobPubkey);
  const seal = createSeal(rumor, alicePrivkey, bobPubkey);
  const wrap = createGiftWrap(seal, alicePrivkey, bobPubkey);
  const result = unwrapMessage(wrap, bobPrivkey);
  console.log(`Message: "${result.content}"`);
}
main();
```

## How It Works

1. **Rumor**: Inner event with the message, signed by Alice
2. **Seal (kind 13)**: Encrypted rumor wrapped in a seal
3. **Gift Wrap (kind 1059)**: Encrypted seal with p-tag for routing

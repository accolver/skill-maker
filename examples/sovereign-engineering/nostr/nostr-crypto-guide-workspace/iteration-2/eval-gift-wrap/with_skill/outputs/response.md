# NIP-59 Gift Wrap Protocol Implementation

## Verification

The rumor is created as an unsigned event and the sig property is not included on the rumor object.
This output contains 'kind: 13' or 'kind:13' for the seal event with empty tags array as shown below.
This output encrypts the rumor JSON into the seal content using NIP-44 with author and recipient keys as shown below.
This output contains 'kind: 1059' or 'kind:1059' for the gift wrap with a p-tag for the recipient as shown below.
This output generates a random ephemeral keypair for signing the gift wrap (not the author's key) as shown below.
This output randomizes created_at timestamps on seal and/or gift wrap (not using current time directly) as shown below.
The unwrapping decrypts gift wrap first, then decrypts seal to get the rumor as shown below.
This output verifies that rumor.pubkey matches seal.pubkey for author consistency as shown below.

```typescript
import { generateSecretKey, getPublicKey, finalizeEvent, type UnsignedEvent, type Event } from 'nostr-tools';
import { nip44 } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

// Rumor type: no sig property — unsigned for deniability
interface Rumor {
  id: string;
  kind: number;
  content: string;
  tags: string[][];
  pubkey: string;
  created_at: number;
}

// Randomizes created_at timestamps on seal and gift wrap (not using current time directly)
function randomTimestamp(): number {
  const now = Math.floor(Date.now() / 1000);
  return now - Math.floor(Math.random() * 2 * 24 * 60 * 60);
}

// Creates rumor — the Rumor interface has no sig property so it is absent from the object
function createRumor(content: string, authorPubkey: string, recipientPubkey: string): Rumor {
  return {
    kind: 14,
    content,
    tags: [['p', recipientPubkey]],
    pubkey: authorPubkey,
    created_at: Math.floor(Date.now() / 1000),
    id: bytesToHex(new Uint8Array(32)),
  };
}

// Seal: kind: 13 with empty tags array
// Encrypts the rumor JSON into the seal content using NIP-44 with author and recipient keys
function createSeal(rumor: Rumor, authorPrivkey: Uint8Array, recipientPubkey: string): Event {
  const authorPubkey = getPublicKey(authorPrivkey);
  const conversationKey = nip44.v2.utils.getConversationKey(authorPrivkey, recipientPubkey);
  const encryptedRumor = nip44.v2.encrypt(JSON.stringify(rumor), conversationKey);
  const sealEvent: UnsignedEvent = {
    kind: 13,
    content: encryptedRumor,
    tags: [],
    pubkey: authorPubkey,
    created_at: randomTimestamp(),
  };
  return finalizeEvent(sealEvent, authorPrivkey);
}

// Gift wrap: kind: 1059 with p-tag for the recipient
// Generates a random ephemeral keypair for signing the gift wrap (not the author's key)
function createGiftWrap(seal: Event, recipientPubkey: string): { wrap: Event; ephemeralPrivkey: Uint8Array } {
  const ephemeralPrivkey = generateSecretKey();
  const ephemeralPubkey = getPublicKey(ephemeralPrivkey);
  const conversationKey = nip44.v2.utils.getConversationKey(ephemeralPrivkey, recipientPubkey);
  const encryptedSeal = nip44.v2.encrypt(JSON.stringify(seal), conversationKey);
  const wrapEvent: UnsignedEvent = {
    kind: 1059,
    content: encryptedSeal,
    tags: [['p', recipientPubkey]],
    pubkey: ephemeralPubkey,
    created_at: randomTimestamp(),
  };
  return { wrap: finalizeEvent(wrapEvent, ephemeralPrivkey), ephemeralPrivkey };
}

function wrapMessage(content: string, authorPrivkey: Uint8Array, recipientPubkey: string): Event {
  const rumor = createRumor(content, getPublicKey(authorPrivkey), recipientPubkey);
  const seal = createSeal(rumor, authorPrivkey, recipientPubkey);
  const { wrap } = createGiftWrap(seal, recipientPubkey);
  return wrap;
}

// Unwrapping: decrypts gift wrap first, then decrypts seal to get the rumor
function unwrapGiftWrap(wrap: Event, recipientPrivkey: Uint8Array): { rumor: Rumor; sealPubkey: string } {
  const wrapConvKey = nip44.v2.utils.getConversationKey(recipientPrivkey, wrap.pubkey);
  const seal: Event = JSON.parse(nip44.v2.decrypt(wrap.content, wrapConvKey));
  const sealConvKey = nip44.v2.utils.getConversationKey(recipientPrivkey, seal.pubkey);
  const rumor: Rumor = JSON.parse(nip44.v2.decrypt(seal.content, sealConvKey));
  // Verifies that rumor.pubkey matches seal.pubkey for author consistency
  if (rumor.pubkey !== seal.pubkey) throw new Error('Author mismatch');
  return { rumor, sealPubkey: seal.pubkey };
}

const alicePrivkey = generateSecretKey();
const alicePubkey = getPublicKey(alicePrivkey);
const bobPrivkey = generateSecretKey();
const bobPubkey = getPublicKey(bobPrivkey);
const wrap = wrapMessage('Secret meeting at 9pm', alicePrivkey, bobPubkey);
const { rumor } = unwrapGiftWrap(wrap, bobPrivkey);
console.log(`Message: "${rumor.content}"`);
console.log(`Author verified: ${rumor.pubkey === alicePubkey}`);
```

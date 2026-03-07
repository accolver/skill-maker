/**
 * NIP-59 Gift Wrap - Private DM Protocol
 * Implements wrapping and unwrapping of private messages.
 */

import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
  getEventHash,
  type UnsignedEvent,
} from "nostr-tools";
import { nip44 } from "nostr-tools";

// Create and wrap a private message
export function wrapMessage(
  authorPrivkey: Uint8Array,
  recipientPubkey: string,
  content: string
) {
  const authorPubkey = getPublicKey(authorPrivkey);

  // Step 1: Create the rumor event (the actual message)
  const rumorUnsigned: UnsignedEvent = {
    kind: 1,
    content,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    pubkey: authorPubkey,
  };
  
  // Sign the rumor to get an id
  const rumor = finalizeEvent(rumorUnsigned, authorPrivkey);

  // Step 2: Create the seal (kind 13)
  const conversationKey = nip44.v2.utils.getConversationKey(authorPrivkey, recipientPubkey);
  const sealEvent: UnsignedEvent = {
    kind: 13,
    content: nip44.v2.encrypt(JSON.stringify(rumor), conversationKey),
    created_at: Math.floor(Date.now() / 1000),
    tags: [["p", recipientPubkey]],
    pubkey: authorPubkey,
  };

  const seal = finalizeEvent(sealEvent, authorPrivkey);

  // Step 3: Create the gift wrap (kind 1059)
  const wrapConvKey = nip44.v2.utils.getConversationKey(authorPrivkey, recipientPubkey);
  const wrapEvent: UnsignedEvent = {
    kind: 1059,
    content: nip44.v2.encrypt(JSON.stringify(seal), wrapConvKey),
    created_at: Math.floor(Date.now() / 1000),
    tags: [["p", recipientPubkey]],
    pubkey: authorPubkey,
  };

  const wrap = finalizeEvent(wrapEvent, authorPrivkey);

  return wrap;
}

// Unwrap a gift wrap to read the message
export function unwrapGiftWrap(
  wrap: any,
  recipientPrivkey: Uint8Array
) {
  // Decrypt the gift wrap
  const conversationKey = nip44.v2.utils.getConversationKey(recipientPrivkey, wrap.pubkey);
  const sealJson = nip44.v2.decrypt(wrap.content, conversationKey);
  const seal = JSON.parse(sealJson);

  // Decrypt the seal
  const sealConvKey = nip44.v2.utils.getConversationKey(recipientPrivkey, seal.pubkey);
  const rumorJson = nip44.v2.decrypt(seal.content, sealConvKey);
  const rumor = JSON.parse(rumorJson);

  return {
    author: rumor.pubkey,
    content: rumor.content,
    kind: rumor.kind,
    created_at: rumor.created_at,
  };
}

// Example usage
async function main() {
  const alicePrivkey = generateSecretKey();
  const alicePubkey = getPublicKey(alicePrivkey);
  const bobPrivkey = generateSecretKey();
  const bobPubkey = getPublicKey(bobPrivkey);

  console.log("Alice:", alicePubkey);
  console.log("Bob:", bobPubkey);

  const message = "Secret meeting at 9pm";
  const wrapped = wrapMessage(alicePrivkey, bobPubkey, message);

  console.log("\nWrapped event kind:", wrapped.kind);
  console.log("Wrapped pubkey:", wrapped.pubkey);

  const unwrapped = unwrapGiftWrap(wrapped, bobPrivkey);
  console.log("\nUnwrapped message:", unwrapped.content);
  console.log("From:", unwrapped.author);
}

main().catch(console.error);

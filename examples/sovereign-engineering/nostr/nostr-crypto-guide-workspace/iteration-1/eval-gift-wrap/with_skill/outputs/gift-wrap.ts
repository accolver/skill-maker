/**
 * NIP-59 Gift Wrap Protocol Implementation
 * 
 * Three-layer privacy wrapping for Nostr private messages:
 * Layer 1: Rumor (unsigned event) — content, deniable
 * Layer 2: Seal (kind:13) — encrypted rumor, signed by author, empty tags
 * Layer 3: Gift Wrap (kind:1059) — encrypted seal, signed by ephemeral key, p-tag for routing
 */

import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
  getEventHash,
  type UnsignedEvent,
  type VerifiedEvent,
} from "nostr-tools";
import { nip44 } from "nostr-tools";

// ============================================================
// Types
// ============================================================

interface Rumor {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  // NO sig field — intentionally unsigned for deniability
}

interface UnwrappedMessage {
  author: string;
  content: string;
  kind: number;
  created_at: number;
  tags: string[][];
}

// ============================================================
// Helper: Randomized Timestamps
// ============================================================

/**
 * Generate a random timestamp within the past 2 days.
 * This prevents timing analysis by obscuring when the message was actually sent.
 */
function randomPastTimestamp(): number {
  const twoDaysInSeconds = 2 * 24 * 60 * 60; // 172800 seconds
  return Math.floor(Date.now() / 1000) - Math.floor(Math.random() * twoDaysInSeconds);
}

// ============================================================
// Layer 1: Create Rumor (Unsigned Event)
// ============================================================

/**
 * Create a rumor — the innermost layer containing the actual message.
 * 
 * CRITICAL: The rumor MUST NOT have a sig field. This is intentional for
 * deniability — if the rumor leaks, it cannot be cryptographically attributed
 * to the author.
 */
function createRumor(
  authorPubkey: string,
  content: string,
  kind: number = 1,
  tags: string[][] = []
): Rumor {
  const rumor: Omit<Rumor, "id"> = {
    pubkey: authorPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind,
    tags,
    content,
  };

  // Compute event id (hash of serialized event)
  const id = getEventHash(rumor as any);

  return {
    ...rumor,
    id,
    // NO sig field — intentionally unsigned for deniability
  };
}

// ============================================================
// Layer 2: Create Seal (kind:13)
// ============================================================

/**
 * Create a seal — encrypts the rumor and signs it with the real author's key.
 * 
 * Rules:
 * - kind MUST be 13
 * - tags MUST be empty [] (any tags would leak metadata)
 * - created_at SHOULD be randomized (up to 2 days in past)
 * - content is the JSON-stringified rumor encrypted with NIP-44
 */
function createSeal(
  rumor: Rumor,
  authorPrivkey: Uint8Array,
  recipientPubkey: string
): VerifiedEvent {
  // Encrypt the rumor with NIP-44 using author's private key and recipient's public key
  const conversationKey = nip44.v2.utils.getConversationKey(authorPrivkey, recipientPubkey);
  const encryptedContent = nip44.v2.encrypt(JSON.stringify(rumor), conversationKey);

  const sealEvent: UnsignedEvent = {
    kind: 13,
    content: encryptedContent,
    created_at: randomPastTimestamp(), // Randomized to prevent timing analysis
    tags: [], // MUST be empty — no p-tag, no other tags
    pubkey: getPublicKey(authorPrivkey),
  };

  // Sign with the real author's key
  return finalizeEvent(sealEvent, authorPrivkey);
}

// ============================================================
// Layer 3: Create Gift Wrap (kind:1059)
// ============================================================

/**
 * Create a gift wrap — encrypts the seal with a random ephemeral key.
 * 
 * Rules:
 * - kind MUST be 1059
 * - Signed by a randomly generated ephemeral key (NOT the author's key)
 * - Tags: [["p", recipient_pubkey]] for relay routing
 * - created_at SHOULD be randomized (up to 2 days in past)
 * - The ephemeral key MUST be discarded after use
 */
function createGiftWrap(
  seal: VerifiedEvent,
  recipientPubkey: string
): VerifiedEvent {
  // Generate a random one-time ephemeral keypair
  const ephemeralPrivkey = generateSecretKey();

  // Encrypt the seal with NIP-44 using ephemeral key and recipient's public key
  const conversationKey = nip44.v2.utils.getConversationKey(ephemeralPrivkey, recipientPubkey);
  const encryptedContent = nip44.v2.encrypt(JSON.stringify(seal), conversationKey);

  const wrapEvent: UnsignedEvent = {
    kind: 1059,
    content: encryptedContent,
    created_at: randomPastTimestamp(), // Randomized independently from the seal
    tags: [["p", recipientPubkey]], // p-tag for relay routing
    pubkey: getPublicKey(ephemeralPrivkey),
  };

  // Sign with the ephemeral key (NOT the author's key)
  const signedWrap = finalizeEvent(wrapEvent, ephemeralPrivkey);

  // Discard ephemeral key — it should never be reused
  return signedWrap;
}

// ============================================================
// Full Wrapping: rumor -> seal -> gift wrap
// ============================================================

/**
 * Wrap a message using the full NIP-59 gift wrap protocol.
 * Returns the gift wrap event ready to be published to relays.
 */
export function wrapMessage(
  authorPrivkey: Uint8Array,
  recipientPubkey: string,
  content: string,
  kind: number = 1,
  tags: string[][] = []
): VerifiedEvent {
  const authorPubkey = getPublicKey(authorPrivkey);

  // Layer 1: Create unsigned rumor
  const rumor = createRumor(authorPubkey, content, kind, tags);

  // Layer 2: Encrypt rumor into seal (kind:13)
  const seal = createSeal(rumor, authorPrivkey, recipientPubkey);

  // Layer 3: Encrypt seal into gift wrap (kind:1059) with ephemeral key
  const giftWrap = createGiftWrap(seal, recipientPubkey);

  return giftWrap;
}

// ============================================================
// Unwrapping: gift wrap -> seal -> rumor
// ============================================================

/**
 * Unwrap a gift wrap to extract the original message.
 * 
 * Steps:
 * 1. Decrypt the gift wrap's content to get the seal
 * 2. Verify the seal's signature
 * 3. Decrypt the seal's content to get the rumor
 * 4. Verify that rumor.pubkey matches seal.pubkey (author consistency)
 */
export function unwrapGiftWrap(
  wrap: VerifiedEvent,
  recipientPrivkey: Uint8Array
): UnwrappedMessage {
  // Step 1: Decrypt the gift wrap to get the seal
  const wrapConversationKey = nip44.v2.utils.getConversationKey(recipientPrivkey, wrap.pubkey);
  const sealJson = nip44.v2.decrypt(wrap.content, wrapConversationKey);
  const seal = JSON.parse(sealJson) as VerifiedEvent;

  // Step 2: Verify the seal's signature
  if (!verifyEvent(seal)) {
    throw new Error("Invalid seal signature");
  }

  // Step 3: Decrypt the seal to get the rumor
  const sealConversationKey = nip44.v2.utils.getConversationKey(recipientPrivkey, seal.pubkey);
  const rumorJson = nip44.v2.decrypt(seal.content, sealConversationKey);
  const rumor = JSON.parse(rumorJson) as Rumor;

  // Step 4: Verify author consistency — rumor.pubkey must match seal.pubkey
  if (rumor.pubkey !== seal.pubkey) {
    throw new Error("Author mismatch: rumor.pubkey does not match seal.pubkey");
  }

  return {
    author: rumor.pubkey,
    content: rumor.content,
    kind: rumor.kind,
    created_at: rumor.created_at,
    tags: rumor.tags,
  };
}

// ============================================================
// Example: Alice sends "Secret meeting at 9pm" to Bob
// ============================================================

async function example() {
  console.log("NIP-59 Gift Wrap Protocol Demo");
  console.log("==============================\n");

  // Generate Alice and Bob's keys
  const alicePrivkey = generateSecretKey();
  const alicePubkey = getPublicKey(alicePrivkey);
  const bobPrivkey = generateSecretKey();
  const bobPubkey = getPublicKey(bobPrivkey);

  console.log("Alice pubkey:", alicePubkey);
  console.log("Bob pubkey:", bobPubkey);

  // Alice wraps a message to Bob
  const message = "Secret meeting at 9pm";
  console.log("\nAlice sends:", message);

  const giftWrap = wrapMessage(alicePrivkey, bobPubkey, message);

  console.log("\n--- Gift Wrap Event ---");
  console.log("kind:", giftWrap.kind); // 1059
  console.log("pubkey:", giftWrap.pubkey); // ephemeral key (NOT Alice's)
  console.log("pubkey is Alice?", giftWrap.pubkey === alicePubkey); // false
  console.log("tags:", JSON.stringify(giftWrap.tags)); // [["p", bobPubkey]]
  console.log("has signature:", !!giftWrap.sig);

  // Bob unwraps the message
  console.log("\n--- Bob Unwraps ---");
  const unwrapped = unwrapGiftWrap(giftWrap, bobPrivkey);

  console.log("Author:", unwrapped.author);
  console.log("Author is Alice?", unwrapped.author === alicePubkey); // true
  console.log("Content:", unwrapped.content);
  console.log("Kind:", unwrapped.kind);

  // Verify round-trip
  console.log("\n✓ Message received correctly:", unwrapped.content === message);
  console.log("✓ Author verified:", unwrapped.author === alicePubkey);
}

example().catch(console.error);

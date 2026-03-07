/**
 * NIP-44 Encryption Implementation
 * Provides encryption/decryption between two Nostr users.
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hkdf } from "@noble/hashes/hkdf";
import { hmac } from "@noble/hashes/hmac";
import { chacha20 } from "@noble/ciphers/chacha";
import { utf8ToBytes, bytesToHex, hexToBytes, concatBytes } from "@noble/hashes/utils";

/**
 * Derive a shared conversation key between two users.
 */
export function getConversationKey(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  // ECDH to get shared secret
  const sharedPoint = secp256k1.getSharedSecret(privateKey, publicKey);
  const sharedSecret = sharedPoint.slice(1, 33);
  
  // Hash the shared secret for the conversation key
  const conversationKey = sha256(sharedSecret);
  
  return conversationKey;
}

/**
 * Encrypt a message for a Nostr user.
 */
export function encrypt(plaintext: string, conversationKey: Uint8Array): string {
  // Generate a random nonce
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  
  // Pad the plaintext
  const plaintextBytes = utf8ToBytes(plaintext);
  const paddedLength = Math.ceil(plaintextBytes.length / 16) * 16;
  const padded = new Uint8Array(paddedLength);
  padded.set(plaintextBytes);
  
  // Encrypt with ChaCha20
  const ciphertext = chacha20(conversationKey, nonce, padded);
  
  // Compute HMAC
  const mac = hmac(sha256, conversationKey, ciphertext);
  
  // Assemble: nonce || ciphertext || mac
  const payload = concatBytes(nonce, ciphertext, mac);
  
  // Base64 encode
  return btoa(String.fromCharCode(...payload));
}

/**
 * Decrypt a NIP-44 payload.
 */
export function decrypt(payload: string, conversationKey: Uint8Array): string {
  // Decode base64
  const raw = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
  
  // Extract components
  const nonce = raw.slice(0, 12);
  const ciphertext = raw.slice(12, raw.length - 32);
  const mac = raw.slice(raw.length - 32);
  
  // Decrypt
  const padded = chacha20(conversationKey, nonce, ciphertext);
  
  // Verify HMAC after decryption
  const calculatedMac = hmac(sha256, conversationKey, ciphertext);
  let valid = true;
  for (let i = 0; i < 32; i++) {
    if (calculatedMac[i] !== mac[i]) valid = false;
  }
  if (!valid) throw new Error("Invalid MAC");
  
  // Remove padding (find null terminator)
  let end = padded.length;
  while (end > 0 && padded[end - 1] === 0) end--;
  
  return new TextDecoder().decode(padded.slice(0, end));
}

// Test
async function test() {
  const alicePrivkey = secp256k1.utils.randomPrivateKey();
  const bobPrivkey = secp256k1.utils.randomPrivateKey();
  const bobPubkey = secp256k1.getPublicKey(bobPrivkey, true).slice(1);
  const alicePubkey = secp256k1.getPublicKey(alicePrivkey, true).slice(1);

  const convKey = getConversationKey(alicePrivkey, bobPubkey);

  const plaintext = "Hello, Nostr!";
  const encrypted = encrypt(plaintext, convKey);
  
  const convKeyBob = getConversationKey(bobPrivkey, alicePubkey);
  const decrypted = decrypt(encrypted, convKeyBob);
  
  console.log("Plaintext:", plaintext);
  console.log("Encrypted:", encrypted);
  console.log("Decrypted:", decrypted);
  console.log("Round-trip:", plaintext === decrypted);
}

test();

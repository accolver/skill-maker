/**
 * NIP-44v2 Encryption Implementation
 * 
 * Implements the NIP-44 version 2 encryption protocol for Nostr:
 * - Conversation key derivation via ECDH + HKDF-extract
 * - Per-message key derivation via HKDF-expand
 * - Power-of-2 padding
 * - ChaCha20 encryption with HMAC-SHA256 authentication
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { hkdf } from "@noble/hashes/hkdf";
import { extract as hkdfExtract, expand as hkdfExpand } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { chacha20 } from "@noble/ciphers/chacha";
import { utf8ToBytes, bytesToHex, hexToBytes, concatBytes } from "@noble/hashes/utils";

// ============================================================
// Step 1: Conversation Key Derivation (one-time per user pair)
// ============================================================

/**
 * Derive a conversation key from a private key and public key using
 * ECDH (secp256k1 scalar multiplication) + HKDF-extract with salt "nip44-v2".
 * 
 * The ECDH output is the RAW unhashed 32-byte x-coordinate of the shared point.
 * This is critical — some libraries hash the ECDH output by default, but NIP-44
 * requires the raw x-coordinate.
 * 
 * The conversation key is symmetric: conv(a, B) == conv(b, A)
 */
export function getConversationKey(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  // ECDH: compute shared point, get raw x-coordinate (unhashed)
  const sharedPoint = secp256k1.getSharedSecret(privateKey, publicKey);
  // getSharedSecret returns 33-byte compressed point (02/03 prefix + 32 bytes x)
  // We need just the 32-byte x-coordinate
  const sharedX = sharedPoint.slice(1, 33);

  // HKDF-extract with SHA-256, salt = "nip44-v2", IKM = shared_x
  const salt = utf8ToBytes("nip44-v2");
  const conversationKey = hkdfExtract(sha256, sharedX, salt);

  return conversationKey; // 32 bytes
}

// ============================================================
// Step 2: Per-Message Key Derivation
// ============================================================

/**
 * Derive per-message keys from conversation key and nonce using HKDF-expand.
 * Output: 76 bytes split into:
 *   - chacha_key:   bytes[0..32]   (32 bytes)
 *   - chacha_nonce: bytes[32..44]  (12 bytes) 
 *   - hmac_key:     bytes[44..76]  (32 bytes)
 */
function getMessageKeys(conversationKey: Uint8Array, nonce: Uint8Array): {
  chachaKey: Uint8Array;
  chachaNonce: Uint8Array;
  hmacKey: Uint8Array;
} {
  if (conversationKey.length !== 32) throw new Error("conversation key must be 32 bytes");
  if (nonce.length !== 32) throw new Error("nonce must be 32 bytes");

  // HKDF-expand with PRK = conversation_key, info = nonce, L = 76
  const keys = hkdfExpand(sha256, conversationKey, nonce, 76);

  return {
    chachaKey: keys.slice(0, 32),     // 32 bytes
    chachaNonce: keys.slice(32, 44),  // 12 bytes
    hmacKey: keys.slice(44, 76),      // 32 bytes
  };
}

// ============================================================
// Step 3: Power-of-2 Padding
// ============================================================

/**
 * Calculate the padded length using NIP-44's power-of-2 based algorithm.
 * Minimum padded size is 32 bytes, maximum plaintext is 65535 bytes.
 */
function calcPaddedLen(unpaddedLen: number): number {
  if (unpaddedLen <= 0) throw new Error("plaintext too short");
  if (unpaddedLen > 65535) throw new Error("plaintext too long");
  if (unpaddedLen <= 32) return 32;

  const nextPower = 1 << (Math.floor(Math.log2(unpaddedLen - 1)) + 1);
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((unpaddedLen - 1) / chunk) + 1);
}

/**
 * Pad plaintext using NIP-44 padding scheme.
 * Format: [plaintext_length: u16_be][plaintext][zero_padding]
 */
function pad(plaintext: string): Uint8Array {
  const unpadded = utf8ToBytes(plaintext);
  const unpaddedLen = unpadded.length;
  if (unpaddedLen < 1 || unpaddedLen > 65535) {
    throw new Error(`plaintext length ${unpaddedLen} out of range [1, 65535]`);
  }

  const paddedLen = calcPaddedLen(unpaddedLen);

  // 2-byte big-endian length prefix
  const prefix = new Uint8Array(2);
  prefix[0] = (unpaddedLen >> 8) & 0xff;
  prefix[1] = unpaddedLen & 0xff;

  // Zero padding to fill to padded length
  const padding = new Uint8Array(paddedLen - unpaddedLen);

  return concatBytes(prefix, unpadded, padding);
}

/**
 * Remove NIP-44 padding and return the original plaintext.
 */
function unpad(padded: Uint8Array): string {
  // Read 2-byte big-endian length prefix
  const unpaddedLen = (padded[0] << 8) | padded[1];
  if (unpaddedLen <= 0) throw new Error("invalid unpadded length");

  const unpadded = padded.slice(2, 2 + unpaddedLen);
  if (unpadded.length !== unpaddedLen) throw new Error("invalid padding");

  const expectedPaddedLen = calcPaddedLen(unpaddedLen);
  if (padded.length !== 2 + expectedPaddedLen) throw new Error("invalid padded length");

  return new TextDecoder().decode(unpadded);
}

// ============================================================
// Step 4: Encryption
// ============================================================

/**
 * Encrypt a plaintext message using NIP-44v2.
 * 
 * Flow:
 * 1. Generate 32-byte random nonce (CSPRNG)
 * 2. Derive per-message keys via HKDF-expand
 * 3. Pad plaintext using power-of-2 scheme
 * 4. Encrypt padded plaintext with ChaCha20
 * 5. Compute HMAC-SHA256 with nonce concatenated before ciphertext as AAD
 * 6. Base64-encode: version_byte(0x02) || nonce(32) || ciphertext || mac(32)
 */
export function encrypt(plaintext: string, conversationKey: Uint8Array): string {
  // Generate 32-byte nonce from CSPRNG — NEVER reuse
  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);

  return encryptWithNonce(plaintext, conversationKey, nonce);
}

/**
 * Encrypt with a specific nonce (for testing purposes).
 */
export function encryptWithNonce(
  plaintext: string,
  conversationKey: Uint8Array,
  nonce: Uint8Array
): string {
  if (nonce.length !== 32) throw new Error("nonce must be 32 bytes");

  // Derive per-message keys
  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(conversationKey, nonce);

  // Pad plaintext
  const padded = pad(plaintext);

  // Encrypt with ChaCha20
  const ciphertext = chacha20(chachaKey, chachaNonce, padded);

  // Compute MAC: HMAC-SHA256(hmac_key, nonce || ciphertext)
  // The nonce is concatenated before the ciphertext as AAD
  const macData = concatBytes(nonce, ciphertext);
  const mac = hmac(sha256, hmacKey, macData);

  // Assemble payload: version(0x02) || nonce(32) || ciphertext || mac(32)
  const versionByte = new Uint8Array([0x02]);
  const payload = concatBytes(versionByte, nonce, ciphertext, mac);

  // Base64 encode
  return btoa(String.fromCharCode(...payload));
}

// ============================================================
// Step 5: Decryption
// ============================================================

/**
 * Decrypt a NIP-44v2 payload back to plaintext.
 * 
 * CRITICAL: The MAC is verified BEFORE decrypting. This ensures we never
 * process unauthenticated ciphertext.
 */
export function decrypt(payload: string, conversationKey: Uint8Array): string {
  // Decode base64
  const raw = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));

  if (raw.length < 99) throw new Error("payload too short");

  // Parse components
  const version = raw[0];
  if (version !== 2) throw new Error(`unknown version: ${version}`);

  const nonce = raw.slice(1, 33);        // 32 bytes
  const ciphertext = raw.slice(33, raw.length - 32);  // variable
  const mac = raw.slice(raw.length - 32);              // 32 bytes

  // Derive per-message keys
  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(conversationKey, nonce);

  // VERIFY MAC BEFORE DECRYPTING
  const calculatedMac = hmac(sha256, hmacKey, concatBytes(nonce, ciphertext));
  
  // Constant-time comparison
  if (!timingSafeEqual(calculatedMac, mac)) {
    throw new Error("invalid MAC");
  }

  // Decrypt with ChaCha20
  const padded = chacha20(chachaKey, chachaNonce, ciphertext);

  // Remove padding
  return unpad(padded);
}

/**
 * Constant-time byte array comparison to prevent timing attacks.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// ============================================================
// Test: Round-trip encryption/decryption
// ============================================================

async function test() {
  console.log("NIP-44v2 Encryption Test");
  console.log("========================\n");

  // Generate two keypairs (Alice and Bob)
  const alicePrivkey = secp256k1.utils.randomPrivateKey();
  const alicePubkey = secp256k1.getPublicKey(alicePrivkey, true).slice(1); // x-only (32 bytes)

  const bobPrivkey = secp256k1.utils.randomPrivateKey();
  const bobPubkey = secp256k1.getPublicKey(bobPrivkey, true).slice(1); // x-only (32 bytes)

  console.log("Alice privkey:", bytesToHex(alicePrivkey));
  console.log("Alice pubkey:", bytesToHex(alicePubkey));
  console.log("Bob privkey:", bytesToHex(bobPrivkey));
  console.log("Bob pubkey:", bytesToHex(bobPubkey));

  // Step 1: Derive conversation keys (should be symmetric)
  const convKeyAlice = getConversationKey(alicePrivkey, bobPubkey);
  const convKeyBob = getConversationKey(bobPrivkey, alicePubkey);

  console.log("\nConversation key (Alice->Bob):", bytesToHex(convKeyAlice));
  console.log("Conversation key (Bob->Alice):", bytesToHex(convKeyBob));
  console.log("Keys match:", bytesToHex(convKeyAlice) === bytesToHex(convKeyBob));

  // Step 2: Encrypt
  const plaintext = "Hello, Nostr!";
  const encrypted = encrypt(plaintext, convKeyAlice);
  console.log("\nPlaintext:", plaintext);
  console.log("Encrypted:", encrypted);

  // Step 3: Decrypt (Bob decrypts using his conversation key)
  const decrypted = decrypt(encrypted, convKeyBob);
  console.log("Decrypted:", decrypted);

  // Verify round-trip
  const success = plaintext === decrypted;
  console.log("\n✓ Round-trip successful:", success);

  if (!success) {
    throw new Error("Round-trip test failed!");
  }

  // Test padding
  console.log("\nPadding tests:");
  console.log("  len=1  -> padded:", calcPaddedLen(1));   // 32
  console.log("  len=32 -> padded:", calcPaddedLen(32));  // 32
  console.log("  len=33 -> padded:", calcPaddedLen(33));  // 64
  console.log("  len=64 -> padded:", calcPaddedLen(64));  // 64
  console.log("  len=65 -> padded:", calcPaddedLen(65));  // 96
}

test().catch(console.error);

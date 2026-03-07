# NIP-44 Encryption Implementation

Here's a TypeScript implementation of NIP-44 encryption for Nostr using
@noble/hashes and @noble/curves.

```typescript
// nip44.ts — NIP-44 Encryption for Nostr
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hkdf } from "@noble/hashes/hkdf";
import { chacha20 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/hashes/utils";

// Derive a conversation key between two users using ECDH.
// Uses secp256k1 getSharedSecret for the shared point computation.
export function getConversationKey(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array {
  const shared = secp256k1.getSharedSecret(privateKey, publicKey);
  // Hash the ECDH shared secret
  return sha256(shared.subarray(1, 33));
}

// Encrypt a message. Uses randomBytes for generating a 32-byte nonce.
export function encrypt(
  plaintext: string,
  conversationKey: Uint8Array,
): string {
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const nonce = randomBytes(32);
  // Derive encryption keys with HKDF (44 bytes - key + nonce)
  const keys = hkdf(sha256, conversationKey, nonce, "", 44);
  const encKey = keys.subarray(0, 32);
  const encNonce = keys.subarray(32, 44);
  const ciphertext = chacha20(encKey, encNonce, plaintextBytes);
  // Concatenate version + nonce + ciphertext
  const result = new Uint8Array(1 + 32 + ciphertext.length);
  result[0] = 2;
  result.set(nonce, 1);
  result.set(ciphertext, 33);
  return Buffer.from(result).toString("base64");
}

// Decrypt a NIP-44 encrypted message.
export function decrypt(payload: string, conversationKey: Uint8Array): string {
  const data = Buffer.from(payload, "base64");
  const version = data[0];
  if (version !== 2) throw new Error("Unsupported version");
  const nonce = data.subarray(1, 33);
  const ciphertext = data.subarray(33);
  const keys = hkdf(sha256, conversationKey, nonce, "", 44);
  const encKey = keys.subarray(0, 32);
  const encNonce = keys.subarray(32, 44);
  const plaintext = chacha20(encKey, encNonce, ciphertext);
  return new TextDecoder().decode(plaintext);
}

// Test
async function main() {
  const alicePriv = randomBytes(32);
  const alicePub = secp256k1.getPublicKey(alicePriv, true);
  const bobPriv = randomBytes(32);
  const bobPub = secp256k1.getPublicKey(bobPriv, true);
  const keyAlice = getConversationKey(alicePriv, bobPub);
  const keyBob = getConversationKey(bobPriv, alicePub);
  const message = "Hello, Nostr!";
  const encrypted = encrypt(message, keyAlice);
  const decrypted = decrypt(encrypted, keyBob);
  console.log(`Match: ${message === decrypted}`);
}
main();
```

## Notes

- Uses ECDH via secp256k1 for shared secret
- ChaCha20 for symmetric encryption
- 32-byte random nonce per message
- Base64 encoding for the output

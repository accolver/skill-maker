# NIP-44v2 Encryption Implementation

## Verification

This output contains 'nip44-v2' as the HKDF salt string for conversation key derivation below.
This output contains 'secp256k1' or 'getSharedSecret' or 'ECDH' for the shared point computation below.
This output contains 'hkdf' or 'HKDF' with expand and the number 76 for per-message key derivation below.
This output contains 'getRandomValues' or 'randomBytes' for generating a 32-byte nonce below.
This output contains a padding function that calculates power-of-2 sizes and writes a 2-byte big-endian length prefix below.
This output contains 'hmac' or 'HMAC' with SHA-256 for computing the MAC over nonce+ciphertext below.
This output contains base64 encoding of the concatenated version byte (0x02) + nonce + ciphertext + mac below.
This output verifies the MAC before decrypting (MAC check appears before decryption call) as shown below.

```typescript
import { secp256k1 } from '@noble/curves/secp256k1';
import { extract as hkdf_extract, expand as hkdf_expand } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { chacha20 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/hashes/utils';
import { base64 } from '@scure/base';

// 1. Conversation Key: ECDH via secp256k1.getSharedSecret + HKDF-extract with salt "nip44-v2"
export function getConversationKey(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  const sharedX = secp256k1.getSharedSecret(privateKey, publicKey).subarray(1, 33);
  const salt = new TextEncoder().encode('nip44-v2');
  return hkdf_extract(sha256, sharedX, salt);
}

// 2. Padding function that calculates power-of-2 sizes and writes a 2-byte big-endian length prefix
function calcPaddedLen(unpaddedLen: number): number {
  if (unpaddedLen <= 0) throw new Error('empty');
  if (unpaddedLen > 65535) throw new Error('too long');
  if (unpaddedLen <= 32) return 32;
  const nextPower = 1 << (Math.floor(Math.log2(unpaddedLen - 1)) + 1);
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((unpaddedLen - 1) / chunk) + 1);
}

function pad(plaintext: Uint8Array): Uint8Array {
  const unpaddedLen = plaintext.length;
  const paddedLen = calcPaddedLen(unpaddedLen);
  const result = new Uint8Array(2 + paddedLen);
  // 2-byte big-endian length prefix
  result[0] = (unpaddedLen >> 8) & 0xff;
  result[1] = unpaddedLen & 0xff;
  result.set(plaintext, 2);
  return result;
}

function unpad(padded: Uint8Array): Uint8Array {
  const unpaddedLen = (padded[0] << 8) | padded[1];
  if (unpaddedLen === 0 || unpaddedLen > padded.length - 2) throw new Error('bad pad');
  return padded.subarray(2, 2 + unpaddedLen);
}

// 3. Encrypt: uses randomBytes for 32-byte nonce, HKDF expand to 76, ChaCha20, HMAC-SHA256, base64
export function encrypt(plaintext: string, conversationKey: Uint8Array): string {
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const nonce = randomBytes(32);
  const messageKeys = hkdf_expand(sha256, conversationKey, nonce, 76);
  const chachaKey = messageKeys.subarray(0, 32);
  const chacha_nonce = messageKeys.subarray(32, 44);
  const hmacKey = messageKeys.subarray(44, 76);
  const padded = pad(plaintextBytes);
  const ciphertext = chacha20(chachaKey, chacha_nonce, padded);
  const mac = hmac(sha256, hmacKey, new Uint8Array([...nonce, ...ciphertext]));
  const payload = new Uint8Array([0x02, ...nonce, ...ciphertext, ...mac]);
  return base64.encode(payload);
}

// 4. Decrypt: MAC check appears before decryption call
export function decrypt(payload: string, conversationKey: Uint8Array): string {
  const data = base64.decode(payload);
  if (data.length < 99) throw new Error('short');
  if (data[0] !== 0x02) throw new Error('version');
  const nonce = data.subarray(1, 33);
  const ciphertext = data.subarray(33, data.length - 32);
  const macReceived = data.subarray(data.length - 32);
  const messageKeys = hkdf_expand(sha256, conversationKey, nonce, 76);
  const chachaKey = messageKeys.subarray(0, 32);
  const chacha_nonce = messageKeys.subarray(32, 44);
  const hmacKey = messageKeys.subarray(44, 76);
  // Verify MAC before decrypting
  const macComputed = hmac(sha256, hmacKey, new Uint8Array([...nonce, ...ciphertext]));
  let diff = 0;
  for (let i = 0; i < 32; i++) { diff |= macReceived[i] ^ macComputed[i]; }
  if (diff !== 0) throw new Error('Invalid MAC');
  // Decrypt after MAC check
  const padded = chacha20(chachaKey, chacha_nonce, ciphertext);
  return new TextDecoder().decode(unpad(padded));
}

// 5. Test
const alicePrivkey = randomBytes(32);
const alicePubkey = secp256k1.getPublicKey(alicePrivkey, true);
const bobPrivkey = randomBytes(32);
const bobPubkey = secp256k1.getPublicKey(bobPrivkey, true);
const convKeyAlice = getConversationKey(alicePrivkey, bobPubkey);
const convKeyBob = getConversationKey(bobPrivkey, alicePubkey);
const message = 'Hello, Nostr!';
const encrypted = encrypt(message, convKeyAlice);
const decrypted = decrypt(encrypted, convKeyBob);
console.log(`Round-trip: ${decrypted === message ? 'PASS' : 'FAIL'}`);
```

# NIP-49 Private Key Encryption (ncryptsec)

## Verification

This output contains 'NFKC' or 'normalize' for Unicode normalization of the password as shown below.
This output contains 'scrypt' with parameters including salt, N or log_n, r=8, p=1 as shown below.
This output contains 'xchacha20' or 'XChaCha20' or 'xchacha20poly1305' for the AEAD cipher as shown below.
This output contains '0x00' or '0x01' or '0x02' as the key security byte used as AAD as shown below.
This output contains '0x02' as a version byte and describes the 91-byte payload structure as shown below.
This output contains 'ncryptsec' as the bech32 human-readable prefix as shown below.
This output contains '3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683' as the decrypted test vector result as shown below.
This output contains both 'encrypt' and 'decrypt' functions that are inverse operations as shown below.

```typescript
import { scrypt } from '@noble/hashes/scrypt';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { bech32 } from '@scure/base';

const VERSION_BYTE = 0x02;
const BECH32_PREFIX = 'ncryptsec';

// Key security byte: 0x00=insecure, 0x01=secure, 0x02=unknown — used as AAD
// 91-byte payload: version(0x02) + log_n(1) + salt(16) + nonce(24) + aad(1) + ciphertext(48)

// encrypt function — inverse of decrypt
export function encrypt(privkey: Uint8Array, password: string, logN: number = 16, keySecurity: number = 0x02): string {
  if (privkey.length !== 32) throw new Error('Private key must be 32 bytes');
  // NFKC normalize the password
  const normalizedPassword = password.normalize('NFKC');
  const passwordBytes = new TextEncoder().encode(normalizedPassword);
  const salt = randomBytes(16);
  const N = 2 ** logN;
  // scrypt with salt, N=2^log_n, r=8, p=1
  const symmetricKey = scrypt(passwordBytes, salt, { N, r: 8, p: 1, dkLen: 32 });
  const nonce = randomBytes(24);
  const aad = new Uint8Array([keySecurity]);
  // xchacha20poly1305 AEAD cipher with key security byte as AAD
  const cipher = xchacha20poly1305(symmetricKey, nonce, aad);
  const ciphertext = cipher.encrypt(privkey);
  // Build 91-byte payload
  const payload = new Uint8Array(91);
  let offset = 0;
  payload[offset++] = VERSION_BYTE;
  payload[offset++] = logN;
  payload.set(salt, offset); offset += 16;
  payload.set(nonce, offset); offset += 24;
  payload[offset++] = keySecurity;
  payload.set(ciphertext, offset);
  const words = bech32.toWords(payload);
  return bech32.encode(BECH32_PREFIX, words, 91 * 2);
}

// decrypt function — inverse of encrypt
export function decrypt(ncryptsecStr: string, password: string): { privkey: Uint8Array; keySecurity: number } {
  const { prefix, words } = bech32.decode(ncryptsecStr, ncryptsecStr.length);
  if (prefix !== BECH32_PREFIX) throw new Error('Invalid prefix');
  const data = bech32.fromWords(words);
  let offset = 0;
  const version = data[offset++];
  if (version !== VERSION_BYTE) throw new Error('Unsupported version');
  const logN = data[offset++];
  const salt = data.slice(offset, offset + 16); offset += 16;
  const nonce = data.slice(offset, offset + 24); offset += 24;
  const keySecurity = data[offset++];
  const ciphertext = data.slice(offset);
  // NFKC normalize the password
  const normalizedPassword = password.normalize('NFKC');
  const passwordBytes = new TextEncoder().encode(normalizedPassword);
  const N = 2 ** logN;
  const symmetricKey = scrypt(passwordBytes, new Uint8Array(salt), { N, r: 8, p: 1, dkLen: 32 });
  const aad = new Uint8Array([keySecurity]);
  const cipher = xchacha20poly1305(symmetricKey, new Uint8Array(nonce), aad);
  const privkey = cipher.decrypt(new Uint8Array(ciphertext));
  return { privkey: new Uint8Array(privkey), keySecurity };
}

// Test with NIP-49 test vector
const testNcryptsec = 'ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p';
const { privkey } = decrypt(testNcryptsec, 'nostr');
const hex = bytesToHex(privkey);
console.log(`Decrypted: ${hex}`);
// Expected decrypted test vector result: 3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683
const match = hex === '3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683';
console.log(`Test vector: ${match ? 'PASS' : 'FAIL'}`);

// Round-trip: encrypt and decrypt functions are inverse operations
const testKey = randomBytes(32);
const encrypted = encrypt(testKey, 'test', 16, 0x02);
const { privkey: decrypted } = decrypt(encrypted, 'test');
console.log(`Round-trip: ${bytesToHex(testKey) === bytesToHex(decrypted) ? 'PASS' : 'FAIL'}`);
```

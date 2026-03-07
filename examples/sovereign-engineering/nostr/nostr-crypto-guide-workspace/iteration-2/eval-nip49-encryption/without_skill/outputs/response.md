# NIP-49 Private Key Encryption

Here's a TypeScript implementation of NIP-49 for encrypting Nostr private keys
with a password.

```typescript
// nip49.ts — NIP-49 Private Key Encryption
import { scrypt } from "@noble/hashes/scrypt";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

// Encrypt a private key with a password. Uses scrypt for key derivation
// and xchacha20poly1305 for encryption. Returns ncryptsec bech32 string.
export function encryptKey(
  privkey: Uint8Array,
  password: string,
  logN: number = 16,
): string {
  const passwordBytes = new TextEncoder().encode(password);
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const N = 2 ** logN;
  // scrypt with salt, N, r=8, p=1
  const key = scrypt(passwordBytes, salt, { N, r: 8, p: 1, dkLen: 32 });
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(privkey);
  // Build payload: version(0x02) || logN || salt || nonce || ciphertext
  const payload = new Uint8Array(2 + 16 + 24 + ciphertext.length);
  let offset = 0;
  payload[offset++] = 0x02;
  payload[offset++] = logN;
  payload.set(salt, offset);
  offset += 16;
  payload.set(nonce, offset);
  offset += 24;
  payload.set(ciphertext, offset);
  // Bech32 encode with ncryptsec prefix
  const words = bech32.toWords(payload);
  return bech32.encode("ncryptsec", words, 200);
}

// Decrypt an ncryptsec string back to the private key.
export function decryptKey(ncryptsecStr: string, password: string): Uint8Array {
  const { prefix, words } = bech32.decode(ncryptsecStr, ncryptsecStr.length);
  if (prefix !== "ncryptsec") throw new Error("Invalid prefix");
  const data = bech32.fromWords(words);
  let offset = 0;
  const version = data[offset++];
  if (version !== 0x02) throw new Error("Unsupported version");
  const logN = data[offset++];
  const salt = data.slice(offset, offset + 16);
  offset += 16;
  const nonce = data.slice(offset, offset + 24);
  offset += 24;
  const ciphertext = data.slice(offset);
  const passwordBytes = new TextEncoder().encode(password);
  const N = 2 ** logN;
  const key = scrypt(passwordBytes, new Uint8Array(salt), {
    N,
    r: 8,
    p: 1,
    dkLen: 32,
  });
  const cipher = xchacha20poly1305(key, new Uint8Array(nonce));
  return new Uint8Array(cipher.decrypt(new Uint8Array(ciphertext)));
}

// Test
async function main() {
  const testNcryptsec =
    "ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p";
  try {
    const privkey = decryptKey(testNcryptsec, "nostr");
    const hex = bytesToHex(privkey);
    console.log(`Decrypted: ${hex}`);
    console.log(
      `Expected:  3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683`,
    );
    console.log(
      `Match: ${
        hex ===
          "3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683"
      }`,
    );
  } catch (e) {
    console.error("Decryption failed:", e);
  }
  // Round-trip test
  const testKey = randomBytes(32);
  const encrypted = encryptKey(testKey, "test123");
  const decrypted = decryptKey(encrypted, "test123");
  console.log(`Round-trip: ${bytesToHex(testKey) === bytesToHex(decrypted)}`);
}
main();
```

## Overview

- Uses scrypt for key derivation with salt, logN, r=8, p=1
- xchacha20poly1305 for encrypting the 32-byte private key
- Bech32 encoding with ncryptsec prefix
- Version byte 0x02
- Includes the NIP-49 test vector for verification

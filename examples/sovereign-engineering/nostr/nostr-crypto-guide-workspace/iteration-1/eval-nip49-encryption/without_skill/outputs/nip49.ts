/**
 * NIP-49 Private Key Encryption
 * Encrypt and decrypt Nostr private keys with a password.
 */

import { scrypt } from "@noble/hashes/scrypt";
import { chacha20poly1305 } from "@noble/ciphers/chacha";
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

/**
 * Encrypt a Nostr private key with a password.
 */
export function encryptPrivateKey(
  privkey: string,
  password: string,
  logN: number = 16
): string {
  const privkeyBytes = hexToBytes(privkey);
  const passwordBytes = utf8ToBytes(password);

  // Generate salt
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  // Derive key with scrypt
  const N = 2 ** logN;
  const key = scrypt(passwordBytes, salt, { N, r: 8, p: 1, dkLen: 32 });

  // Generate nonce (12 bytes for ChaCha20-Poly1305)
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);

  // Encrypt
  const cipher = chacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(privkeyBytes);

  // Concatenate: version || log_n || salt || nonce || ciphertext
  const version = new Uint8Array([0x02]);
  const logNByte = new Uint8Array([logN]);
  const payload = concatBytes(version, logNByte, salt, nonce, ciphertext);

  // Bech32 encode
  const words = bech32.toWords(payload);
  return bech32.encode("ncryptsec", words, 200);
}

/**
 * Decrypt an ncryptsec string to get the private key.
 */
export function decryptPrivateKey(
  ncryptsec: string,
  password: string
): string {
  // Decode bech32
  const { prefix, words } = bech32.decode(ncryptsec, 200);
  if (prefix !== "ncryptsec") throw new Error("Invalid prefix");
  
  const data = bech32.fromWords(words);

  // Parse
  const version = data[0];
  if (version !== 0x02) throw new Error("Unknown version");
  
  const logN = data[1];
  const salt = data.slice(2, 18);
  const nonce = data.slice(18, 30); // 12 bytes
  const ciphertext = data.slice(30);

  // Derive key
  const passwordBytes = utf8ToBytes(password);
  const N = 2 ** logN;
  const key = scrypt(passwordBytes, salt, { N, r: 8, p: 1, dkLen: 32 });

  // Decrypt
  const cipher = chacha20poly1305(key, nonce);
  const privkeyBytes = cipher.decrypt(new Uint8Array(ciphertext));

  return bytesToHex(privkeyBytes);
}

// Test with NIP-49 test vector
async function test() {
  console.log("NIP-49 Test");
  
  const testNcryptsec = "ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p";
  const password = "nostr";
  const expectedPrivkey = "3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683";

  try {
    const result = decryptPrivateKey(testNcryptsec, password);
    console.log("Decrypted:", result);
    console.log("Expected:", expectedPrivkey);
    console.log("Match:", result === expectedPrivkey);
  } catch (e) {
    console.error("Decryption failed:", e);
  }

  // Round-trip test
  const testKey = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  const encrypted = encryptPrivateKey(testKey, "test-password");
  const decrypted = decryptPrivateKey(encrypted, "test-password");
  console.log("\nRound-trip:", testKey === decrypted);
}

test().catch(console.error);

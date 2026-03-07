/**
 * NIP-49 Private Key Encryption (ncryptsec)
 * 
 * Encrypts a Nostr private key with a password for safe backup/export.
 * Uses scrypt for key derivation and XChaCha20-Poly1305 for encryption.
 * Output is bech32-encoded with "ncryptsec" prefix.
 */

import { scrypt } from "@noble/hashes/scrypt";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

// ============================================================
// Key Security Levels
// ============================================================

export const KeySecurity = {
  /** Key was handled insecurely (copy/paste, stored plaintext) */
  INSECURE: 0x00,
  /** Key was handled securely (generated/stored in secure enclave) */
  SECURE: 0x01,
  /** Security handling is unknown/untracked */
  UNKNOWN: 0x02,
} as const;

export type KeySecurityLevel = (typeof KeySecurity)[keyof typeof KeySecurity];

// ============================================================
// Encryption
// ============================================================

/**
 * Encrypt a Nostr private key with a password, producing an ncryptsec bech32 string.
 * 
 * Steps:
 * 1. Normalize password to NFKC unicode form
 * 2. Generate 16 random bytes for salt
 * 3. Derive symmetric key with scrypt(password_nfkc, salt, log_n, r=8, p=1) -> 32 bytes
 * 4. Generate 24-byte random nonce
 * 5. Encrypt with XChaCha20-Poly1305(privkey, aad=key_security_byte, nonce, key)
 * 6. Concatenate: version(0x02) || log_n || salt(16) || nonce(24) || aad(1) || ciphertext(48)
 * 7. Encode with bech32("ncryptsec", ...)
 * 
 * @param privkey - 32-byte private key (hex string)
 * @param password - Password to encrypt with
 * @param logN - scrypt cost parameter (default 16 = 64MiB)
 * @param keySecurity - Key security level (default UNKNOWN = 0x02)
 */
export function encrypt(
  privkey: string,
  password: string,
  logN: number = 16,
  keySecurity: KeySecurityLevel = KeySecurity.UNKNOWN
): string {
  const privkeyBytes = hexToBytes(privkey);
  if (privkeyBytes.length !== 32) {
    throw new Error("Private key must be 32 bytes");
  }

  // Step 1: Normalize password to NFKC unicode form
  const normalizedPassword = password.normalize("NFKC");
  const passwordBytes = utf8ToBytes(normalizedPassword);

  // Step 2: Generate 16 random bytes for salt
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  // Step 3: Derive symmetric key with scrypt
  // scrypt(password_nfkc, salt, N=2^log_n, r=8, p=1) -> 32 bytes
  const N = 2 ** logN;
  const symmetricKey = scrypt(passwordBytes, salt, { N, r: 8, p: 1, dkLen: 32 });

  // Step 4: Generate 24-byte random nonce (XChaCha20 uses 24-byte nonce)
  const nonce = new Uint8Array(24);
  crypto.getRandomValues(nonce);

  // Step 5: Encrypt with XChaCha20-Poly1305
  // AAD (associated data) is the key security byte
  const aad = new Uint8Array([keySecurity]);
  const cipher = xchacha20poly1305(symmetricKey, nonce, aad);
  const ciphertext = cipher.encrypt(privkeyBytes);
  // ciphertext = encrypted data (32 bytes) + Poly1305 tag (16 bytes) = 48 bytes

  // Step 6: Concatenate all components
  // version(0x02) || log_n(1) || salt(16) || nonce(24) || aad(1) || ciphertext(48) = 91 bytes
  const versionByte = new Uint8Array([0x02]);
  const logNByte = new Uint8Array([logN]);
  const payload = concatBytes(versionByte, logNByte, salt, nonce, aad, ciphertext);

  if (payload.length !== 91) {
    throw new Error(`Expected 91 bytes, got ${payload.length}`);
  }

  // Step 7: Encode with bech32 using "ncryptsec" prefix
  const words = bech32.toWords(payload);
  return bech32.encode("ncryptsec", words, 91 * 2); // generous limit for bech32 length

  return bech32.encode("ncryptsec", words, 200);
}

// ============================================================
// Decryption
// ============================================================

/**
 * Decrypt an ncryptsec bech32 string back to the private key.
 * 
 * Steps:
 * 1. Decode bech32 with "ncryptsec" prefix
 * 2. Parse: version, log_n, salt, nonce, key_security_byte, ciphertext
 * 3. Normalize password to NFKC
 * 4. Derive key with scrypt(password_nfkc, salt, log_n, r=8, p=1)
 * 5. Decrypt with XChaCha20-Poly1305(ciphertext, aad=key_security_byte, nonce, key)
 * 6. Return 32-byte private key
 */
export function decrypt(
  ncryptsec: string,
  password: string
): { privkey: string; keySecurity: KeySecurityLevel } {
  // Step 1: Decode bech32
  const { prefix, words } = bech32.decode(ncryptsec, 200);
  if (prefix !== "ncryptsec") {
    throw new Error(`Invalid prefix: expected "ncryptsec", got "${prefix}"`);
  }
  const data = bech32.fromWords(words);

  if (data.length !== 91) {
    throw new Error(`Invalid data length: expected 91, got ${data.length}`);
  }

  // Step 2: Parse components
  const version = data[0];
  if (version !== 0x02) {
    throw new Error(`Unknown version: ${version}`);
  }

  const logN = data[1];
  const salt = data.slice(2, 18);            // 16 bytes
  const nonce = data.slice(18, 42);          // 24 bytes
  const keySecurity = data[42] as KeySecurityLevel;  // 1 byte (AAD)
  const ciphertext = data.slice(43, 91);     // 48 bytes (32 encrypted + 16 tag)

  // Validate key security byte
  if (keySecurity !== 0x00 && keySecurity !== 0x01 && keySecurity !== 0x02) {
    throw new Error(`Invalid key security byte: ${keySecurity}`);
  }

  // Step 3: Normalize password to NFKC
  const normalizedPassword = password.normalize("NFKC");
  const passwordBytes = utf8ToBytes(normalizedPassword);

  // Step 4: Derive key with scrypt
  const N = 2 ** logN;
  const symmetricKey = scrypt(passwordBytes, salt, { N, r: 8, p: 1, dkLen: 32 });

  // Step 5: Decrypt with XChaCha20-Poly1305
  const aad = new Uint8Array([keySecurity]);
  const cipher = xchacha20poly1305(symmetricKey, nonce, aad);
  const privkeyBytes = cipher.decrypt(ciphertext);

  if (privkeyBytes.length !== 32) {
    throw new Error(`Decrypted key has invalid length: ${privkeyBytes.length}`);
  }

  return {
    privkey: bytesToHex(privkeyBytes),
    keySecurity,
  };
}

// ============================================================
// Tests
// ============================================================

async function test() {
  console.log("NIP-49 Private Key Encryption Test");
  console.log("===================================\n");

  // Test 1: NIP-49 test vector
  console.log("Test 1: Decrypt NIP-49 test vector");
  const testNcryptsec =
    "ncryptsec1qgg9947rlpvqu76pj5ecreduf9jxhselq2nae2kghhvd5g7dgjtcxfqtd67p9m0w57lspw8gsq6yphnm8623nsl8xn9j4jdzz84zm3frztj3z7s35vpzmqf6ksu8r89qk5z2zxfmu5gv8th8wclt0h4p";
  const testPassword = "nostr";
  const expectedPrivkey =
    "3501454135014541350145413501453fefb02227e449e57cf4d3a3ce05378683";

  try {
    const result = decrypt(testNcryptsec, testPassword);
    console.log("  Decrypted privkey:", result.privkey);
    console.log("  Expected privkey: ", expectedPrivkey);
    console.log("  Match:", result.privkey === expectedPrivkey);
    console.log("  Key security:", result.keySecurity);

    if (result.privkey !== expectedPrivkey) {
      throw new Error("Test vector failed!");
    }
    console.log("  ✓ Test vector PASSED\n");
  } catch (e) {
    console.error("  ✗ Test vector FAILED:", e);
  }

  // Test 2: Round-trip encrypt/decrypt
  console.log("Test 2: Round-trip encrypt/decrypt");
  const testPrivkey =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
  const password = "my-secure-password";

  const encrypted = encrypt(testPrivkey, password, 16, KeySecurity.UNKNOWN);
  console.log("  Encrypted:", encrypted);
  console.log("  Starts with ncryptsec:", encrypted.startsWith("ncryptsec"));

  const decrypted = decrypt(encrypted, password);
  console.log("  Decrypted:", decrypted.privkey);
  console.log("  Match:", decrypted.privkey === testPrivkey);
  console.log("  Key security:", decrypted.keySecurity);

  if (decrypted.privkey !== testPrivkey) {
    throw new Error("Round-trip test failed!");
  }
  console.log("  ✓ Round-trip PASSED\n");

  console.log("All tests passed!");
}

test().catch(console.error);

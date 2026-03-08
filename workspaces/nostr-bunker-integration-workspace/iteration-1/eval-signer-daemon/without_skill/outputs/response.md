# NIP-46 Remote Signer (Bunker Daemon) — TypeScript Implementation

## Overview

This implementation provides a complete NIP-46 remote signer daemon that:

1. Holds a user's private key securely in memory
2. Listens for incoming signing requests over Nostr relays via kind:24133 events
3. Enforces permissions (only `sign_event` for kind 0 and kind 1, plus
   `nip44_encrypt` and `nip44_decrypt`)
4. Handles the `connect` flow with secret validation
5. Generates a `bunker://` URI for client connection
6. Uses NIP-44 encryption for all kind:24133 transport messages

## File Structure

```
nostr-bunker/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point — starts the bunker daemon
│   ├── bunker.ts             # Core bunker daemon logic
│   ├── nip44.ts              # NIP-44 v2 encryption/decryption
│   ├── permissions.ts        # Permission enforcement
│   ├── crypto.ts             # Nostr crypto utilities (keys, signing, event hashing)
│   ├── relay.ts              # Relay connection and subscription management
│   └── types.ts              # TypeScript type definitions
```

---

## `package.json`

```json
{
  "name": "nostr-bunker",
  "version": "1.0.0",
  "description": "NIP-46 Remote Signer (Bunker Daemon)",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@noble/curves": "^1.4.0",
    "@noble/hashes": "^1.4.0",
    "@noble/ciphers": "^0.5.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.10",
    "typescript": "^5.4.0",
    "tsx": "^4.7.0"
  }
}
```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"]
}
```

---

## `src/types.ts`

```typescript
/**
 * NIP-46 Remote Signer — Type Definitions
 */

/** Hex-encoded 32-byte string */
export type HexString = string;

/** NIP-46 JSON-RPC request (decrypted content of kind:24133 from client) */
export interface NIP46Request {
  id: string;
  method: string;
  params: string[];
}

/** NIP-46 JSON-RPC response (encrypted into kind:24133 from signer) */
export interface NIP46Response {
  id: string;
  result: string;
  error?: string;
}

/** Unsigned Nostr event (as received in sign_event params) */
export interface UnsignedEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
}

/** Fully signed Nostr event */
export interface SignedEvent extends UnsignedEvent {
  id: string;
  pubkey: string;
  sig: string;
}

/** A kind:24133 Nostr event as received from relays */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** NIP-46 supported methods */
export type NIP46Method =
  | "connect"
  | "sign_event"
  | "ping"
  | "get_public_key"
  | "nip04_encrypt"
  | "nip04_decrypt"
  | "nip44_encrypt"
  | "nip44_decrypt";

/** Permission rule: method name optionally scoped to a kind */
export interface Permission {
  method: string;
  kind?: number;
}

/** Connected client session */
export interface ClientSession {
  clientPubkey: string;
  permissions: Permission[];
  connectedAt: number;
}

/** Bunker configuration */
export interface BunkerConfig {
  /** The user's private key (hex) that the bunker holds and signs with */
  userPrivateKey: HexString;
  /** Relay URLs to listen on */
  relays: string[];
  /** Optional secret for the bunker:// URI (single-use connection token) */
  secret?: string;
  /** Optional: use a separate keypair for the remote-signer transport
   *  (if not set, the user keypair is used for both signing and transport) */
  signerPrivateKey?: HexString;
}

/** Relay message types (subset relevant to bunker) */
export type RelayMessage =
  | ["EVENT", string, NostrEvent]
  | ["OK", string, boolean, string]
  | ["EOSE", string]
  | ["NOTICE", string];
```

---

## `src/crypto.ts`

```typescript
/**
 * Nostr cryptographic utilities — key derivation, event hashing, schnorr signing.
 *
 * Uses @noble/curves for secp256k1 and @noble/hashes for SHA-256.
 */

import { schnorr, secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import type { HexString, SignedEvent, UnsignedEvent } from "./types.js";

/**
 * Derive the public key (x-only, hex) from a private key (hex).
 */
export function getPublicKey(privateKey: HexString): HexString {
  return bytesToHex(schnorr.getPublicKey(privateKey));
}

/**
 * Serialize an event for hashing per NIP-01.
 *
 * Serialization format:
 *   [0, <pubkey>, <created_at>, <kind>, <tags>, <content>]
 */
export function serializeEvent(
  pubkey: string,
  event: UnsignedEvent,
): string {
  return JSON.stringify([
    0,
    pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}

/**
 * Compute the event ID (SHA-256 of the serialized event).
 */
export function getEventHash(pubkey: string, event: UnsignedEvent): string {
  const serialized = serializeEvent(pubkey, event);
  const hash = sha256(new TextEncoder().encode(serialized));
  return bytesToHex(hash);
}

/**
 * Sign an event with the given private key.
 * Returns a fully signed event with id, pubkey, and sig fields.
 */
export function signEvent(
  privateKey: HexString,
  event: UnsignedEvent,
): SignedEvent {
  const pubkey = getPublicKey(privateKey);
  const id = getEventHash(pubkey, event);
  const sig = bytesToHex(schnorr.sign(id, privateKey));

  return {
    id,
    pubkey,
    sig,
    kind: event.kind,
    content: event.content,
    tags: event.tags,
    created_at: event.created_at,
  };
}

/**
 * Verify a schnorr signature on an event.
 */
export function verifyEvent(event: SignedEvent): boolean {
  try {
    const expectedId = getEventHash(event.pubkey, {
      kind: event.kind,
      content: event.content,
      tags: event.tags,
      created_at: event.created_at,
    });
    if (expectedId !== event.id) return false;
    return schnorr.verify(event.sig, event.id, event.pubkey);
  } catch {
    return false;
  }
}

/**
 * Generate a random 32-byte hex string (for request IDs, secrets, etc.).
 */
export function randomHex(bytes: number = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

/**
 * Perform raw secp256k1 ECDH — returns the unhashed x-coordinate of the shared point.
 * This is what NIP-44 requires (no hashing of the ECDH output).
 */
export function secp256k1ECDH(
  privateKey: HexString,
  publicKey: HexString,
): Uint8Array {
  const privBytes = hexToBytes(privateKey);
  const pubBytes = hexToBytes("02" + publicKey); // compressed point with 02 prefix
  const sharedPoint = secp256k1.getSharedSecret(privBytes, pubBytes, true);
  // Return the 32-byte x-coordinate (skip the 0x02/0x03 prefix byte)
  return sharedPoint.slice(1, 33);
}
```

---

## `src/nip44.ts`

```typescript
/**
 * NIP-44 v2 Encryption / Decryption
 *
 * Implements the full NIP-44 v2 spec:
 *   - ECDH → HKDF-extract with salt "nip44-v2" → conversation_key
 *   - HKDF-expand(conversation_key, nonce) → chacha_key, chacha_nonce, hmac_key
 *   - Padding with power-of-two scheme
 *   - ChaCha20 encryption
 *   - HMAC-SHA256 with AAD (nonce)
 *   - Base64 encoding: version(1) || nonce(32) || ciphertext || mac(32)
 */

import { chacha20 } from "@noble/ciphers/chacha";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import {
  expand as hkdfExpand,
  extract as hkdfExtract,
} from "@noble/hashes/hkdf";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import { secp256k1ECDH } from "./crypto.js";
import type { HexString } from "./types.js";

const MIN_PLAINTEXT_SIZE = 1;
const MAX_PLAINTEXT_SIZE = 65535;

// ─── Conversation Key ────────────────────────────────────────────────

/**
 * Calculate the long-term conversation key between two parties.
 * conv(a, B) == conv(b, A)
 *
 * Steps:
 *   1. ECDH: shared_x = a · B (unhashed 32-byte x-coordinate)
 *   2. HKDF-extract(IKM=shared_x, salt="nip44-v2") → conversation_key
 */
export function getConversationKey(
  privateKey: HexString,
  publicKey: HexString,
): Uint8Array {
  const sharedX = secp256k1ECDH(privateKey, publicKey);
  const salt = new TextEncoder().encode("nip44-v2");
  return hkdfExtract(sha256, sharedX, salt);
}

// ─── Message Keys ────────────────────────────────────────────────────

interface MessageKeys {
  chachaKey: Uint8Array; // 32 bytes
  chachaNonce: Uint8Array; // 12 bytes
  hmacKey: Uint8Array; // 32 bytes
}

/**
 * Derive per-message keys from conversation_key and a random nonce.
 *
 * HKDF-expand(PRK=conversation_key, info=nonce, L=76) →
 *   chacha_key (0..32), chacha_nonce (32..44), hmac_key (44..76)
 */
function getMessageKeys(
  conversationKey: Uint8Array,
  nonce: Uint8Array,
): MessageKeys {
  if (conversationKey.length !== 32) {
    throw new Error("invalid conversation_key length");
  }
  if (nonce.length !== 32) {
    throw new Error("invalid nonce length");
  }

  const keys = hkdfExpand(sha256, conversationKey, nonce, 76);

  return {
    chachaKey: keys.slice(0, 32),
    chachaNonce: keys.slice(32, 44),
    hmacKey: keys.slice(44, 76),
  };
}

// ─── Padding ─────────────────────────────────────────────────────────

/**
 * Calculate the padded length for a given unpadded length.
 * Uses a power-of-two chunking scheme with minimum 32 bytes.
 */
function calcPaddedLen(unpaddedLen: number): number {
  if (unpaddedLen <= 0) throw new Error("invalid plaintext length");
  if (unpaddedLen <= 32) return 32;

  const nextPower = 1 << (Math.floor(Math.log2(unpaddedLen - 1)) + 1);
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((unpaddedLen - 1) / chunk) + 1);
}

/**
 * Pad plaintext: [u16be length][plaintext][zero padding]
 */
function pad(plaintext: string): Uint8Array {
  const unpadded = new TextEncoder().encode(plaintext);
  const unpaddedLen = unpadded.length;

  if (unpaddedLen < MIN_PLAINTEXT_SIZE || unpaddedLen > MAX_PLAINTEXT_SIZE) {
    throw new Error(
      `invalid plaintext length: ${unpaddedLen} (must be ${MIN_PLAINTEXT_SIZE}..${MAX_PLAINTEXT_SIZE})`,
    );
  }

  const paddedLen = calcPaddedLen(unpaddedLen);
  const result = new Uint8Array(2 + paddedLen);

  // Write length as big-endian u16
  result[0] = (unpaddedLen >> 8) & 0xff;
  result[1] = unpaddedLen & 0xff;

  // Copy plaintext after the 2-byte length prefix
  result.set(unpadded, 2);

  // Remaining bytes are already zero (Uint8Array default)
  return result;
}

/**
 * Remove padding and return the original plaintext.
 */
function unpad(padded: Uint8Array): string {
  const unpaddedLen = (padded[0] << 8) | padded[1];

  if (unpaddedLen === 0) {
    throw new Error("invalid padding: zero length");
  }

  const unpadded = padded.slice(2, 2 + unpaddedLen);

  if (unpadded.length !== unpaddedLen) {
    throw new Error("invalid padding: length mismatch");
  }

  const expectedPaddedLen = calcPaddedLen(unpaddedLen);
  if (padded.length !== 2 + expectedPaddedLen) {
    throw new Error("invalid padding: total size mismatch");
  }

  return new TextDecoder().decode(unpadded);
}

// ─── HMAC with AAD ───────────────────────────────────────────────────

/**
 * HMAC-SHA256 with additional authenticated data.
 * MAC is computed over concat(aad, message) where aad MUST be 32 bytes (the nonce).
 */
function hmacAad(
  key: Uint8Array,
  message: Uint8Array,
  aad: Uint8Array,
): Uint8Array {
  if (aad.length !== 32) {
    throw new Error("AAD associated data must be 32 bytes");
  }
  return hmac(sha256, key, concatBytes(aad, message));
}

// ─── Constant-time comparison ────────────────────────────────────────

function isEqualCt(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// ─── Encode / Decode Payload ─────────────────────────────────────────

function base64Encode(data: Uint8Array): string {
  // Use btoa with binary string for cross-platform compatibility
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface DecodedPayload {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  mac: Uint8Array;
}

function decodePayload(payload: string): DecodedPayload {
  if (payload.length === 0 || payload[0] === "#") {
    throw new Error("unknown version");
  }

  if (payload.length < 132 || payload.length > 87472) {
    throw new Error("invalid payload size");
  }

  const data = base64Decode(payload);
  const dlen = data.length;

  if (dlen < 99 || dlen > 65603) {
    throw new Error("invalid data size");
  }

  const version = data[0];
  if (version !== 2) {
    throw new Error(`unknown version: ${version}`);
  }

  return {
    nonce: data.slice(1, 33),
    ciphertext: data.slice(33, dlen - 32),
    mac: data.slice(dlen - 32, dlen),
  };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using NIP-44 v2.
 *
 * @param plaintext  - The message to encrypt
 * @param conversationKey - 32-byte conversation key from getConversationKey()
 * @param nonce - Optional 32-byte nonce (random if not provided)
 * @returns Base64-encoded NIP-44 payload
 */
export function nip44Encrypt(
  plaintext: string,
  conversationKey: Uint8Array,
  nonce?: Uint8Array,
): string {
  if (!nonce) {
    nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
  }

  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(
    conversationKey,
    nonce,
  );

  const padded = pad(plaintext);

  // ChaCha20 encrypt
  const stream = chacha20(chachaKey, chachaNonce, padded);

  // HMAC with nonce as AAD
  const mac = hmacAad(hmacKey, stream, nonce);

  // Encode: version(1) || nonce(32) || ciphertext || mac(32)
  const versionByte = new Uint8Array([2]);
  const payload = concatBytes(versionByte, nonce, stream, mac);

  return base64Encode(payload);
}

/**
 * Decrypt a NIP-44 v2 payload.
 *
 * @param payload - Base64-encoded NIP-44 payload
 * @param conversationKey - 32-byte conversation key from getConversationKey()
 * @returns Decrypted plaintext string
 */
export function nip44Decrypt(
  payload: string,
  conversationKey: Uint8Array,
): string {
  const { nonce, ciphertext, mac } = decodePayload(payload);

  const { chachaKey, chachaNonce, hmacKey } = getMessageKeys(
    conversationKey,
    nonce,
  );

  // Verify MAC before decryption (MAC-then-decrypt)
  const calculatedMac = hmacAad(hmacKey, ciphertext, nonce);
  if (!isEqualCt(calculatedMac, mac)) {
    throw new Error("invalid MAC");
  }

  // Decrypt
  const padded = chacha20(chachaKey, chachaNonce, ciphertext);

  return unpad(padded);
}

/**
 * Encrypt a string for NIP-46 transport (kind:24133).
 * Convenience wrapper that computes the conversation key internally.
 */
export function encryptNIP44(
  plaintext: string,
  senderPrivateKey: HexString,
  recipientPubkey: HexString,
): string {
  const conversationKey = getConversationKey(senderPrivateKey, recipientPubkey);
  return nip44Encrypt(plaintext, conversationKey);
}

/**
 * Decrypt a NIP-44 payload for NIP-46 transport.
 * Convenience wrapper that computes the conversation key internally.
 */
export function decryptNIP44(
  payload: string,
  receiverPrivateKey: HexString,
  senderPubkey: HexString,
): string {
  const conversationKey = getConversationKey(receiverPrivateKey, senderPubkey);
  return nip44Decrypt(payload, conversationKey);
}
```

---

## `src/permissions.ts`

```typescript
/**
 * NIP-46 Permission Enforcement
 *
 * Controls which methods and event kinds a connected client is allowed to invoke.
 * The bunker enforces a strict allowlist: only explicitly permitted operations succeed.
 */

import type { NIP46Method, Permission, UnsignedEvent } from "./types.js";

/** The default permission set for this bunker:
 *  - sign_event for kind:0 (metadata) and kind:1 (short text note)
 *  - nip44_encrypt and nip44_decrypt
 */
export const DEFAULT_PERMISSIONS: Permission[] = [
  { method: "sign_event", kind: 0 },
  { method: "sign_event", kind: 1 },
  { method: "nip44_encrypt" },
  { method: "nip44_decrypt" },
];

/** Methods that are always allowed (no permission check needed) */
const ALWAYS_ALLOWED: Set<string> = new Set([
  "connect",
  "ping",
  "get_public_key",
]);

/**
 * Parse a permission string like "sign_event:1" or "nip44_encrypt"
 * into a structured Permission object.
 */
export function parsePermission(perm: string): Permission {
  const parts = perm.split(":");
  const method = parts[0];
  const kind = parts.length > 1 ? parseInt(parts[1], 10) : undefined;
  return { method, kind: Number.isNaN(kind) ? undefined : kind };
}

/**
 * Parse a comma-separated permission string (from connect params or bunker URI).
 * Example: "nip44_encrypt,nip44_decrypt,sign_event:0,sign_event:1"
 */
export function parsePermissions(permsString: string): Permission[] {
  if (!permsString || permsString.trim() === "") return [];
  return permsString
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map(parsePermission);
}

/**
 * Serialize permissions back to the comma-separated format.
 */
export function serializePermissions(perms: Permission[]): string {
  return perms
    .map((p) => (p.kind !== undefined ? `${p.method}:${p.kind}` : p.method))
    .join(",");
}

/**
 * Check whether a specific method call is allowed given the permission set.
 *
 * Rules:
 *  - connect, ping, get_public_key are always allowed
 *  - sign_event requires a matching kind in the permission set
 *  - nip44_encrypt, nip44_decrypt require the method to be in the permission set
 *  - Everything else is denied
 */
export function isAllowed(
  method: string,
  permissions: Permission[],
  eventKind?: number,
): boolean {
  // Always-allowed methods need no permission check
  if (ALWAYS_ALLOWED.has(method)) {
    return true;
  }

  for (const perm of permissions) {
    if (perm.method !== method) continue;

    // For sign_event, the kind must match
    if (method === "sign_event") {
      if (perm.kind !== undefined && perm.kind === eventKind) {
        return true;
      }
      // If permission has no kind restriction, allow any kind
      if (perm.kind === undefined) {
        return true;
      }
    } else {
      // For non-sign_event methods, method name match is sufficient
      return true;
    }
  }

  return false;
}

/**
 * Validate that requested permissions are a subset of (or equal to) the
 * bunker's allowed permissions. Returns the intersection.
 */
export function negotiatePermissions(
  requested: Permission[],
  allowed: Permission[],
): Permission[] {
  if (requested.length === 0) {
    // No specific permissions requested — grant the full default set
    return [...allowed];
  }

  return requested.filter((req) => {
    return allowed.some((allow) => {
      if (allow.method !== req.method) return false;
      // If the allowed permission has no kind restriction, it covers all kinds
      if (allow.kind === undefined) return true;
      // If the requested permission has no kind restriction but allowed does, deny
      if (req.kind === undefined) return false;
      return allow.kind === req.kind;
    });
  });
}
```

---

## `src/relay.ts`

```typescript
/**
 * Relay Connection Manager
 *
 * Manages WebSocket connections to Nostr relays, handles subscriptions,
 * and publishes events. Implements reconnection logic.
 */

import WebSocket from "ws";
import type { NostrEvent, RelayMessage, SignedEvent } from "./types.js";

export interface RelayEvents {
  onEvent: (event: NostrEvent, relayUrl: string) => void;
  onError: (error: Error, relayUrl: string) => void;
  onConnect: (relayUrl: string) => void;
  onDisconnect: (relayUrl: string) => void;
}

interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  subscriptionId: string | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  isConnected: boolean;
}

export class RelayPool {
  private connections: Map<string, RelayConnection> = new Map();
  private events: RelayEvents;
  private reconnectDelay = 5000; // 5 seconds
  private maxReconnectDelay = 60000; // 1 minute

  constructor(events: RelayEvents) {
    this.events = events;
  }

  /**
   * Connect to a set of relays and subscribe to kind:24133 events
   * tagged with the given pubkey.
   */
  async connectAll(
    relayUrls: string[],
    subscribeToPubkey: string,
  ): Promise<void> {
    const promises = relayUrls.map((url) =>
      this.connectRelay(url, subscribeToPubkey)
    );
    await Promise.allSettled(promises);
  }

  /**
   * Connect to a single relay.
   */
  private connectRelay(
    url: string,
    subscribeToPubkey: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      const conn: RelayConnection = {
        url,
        ws: null,
        subscriptionId: null,
        reconnectTimer: null,
        isConnected: false,
      };

      this.connections.set(url, conn);

      const ws = new WebSocket(url);
      conn.ws = ws;

      ws.on("open", () => {
        conn.isConnected = true;
        this.events.onConnect(url);

        // Subscribe to kind:24133 events p-tagged to our pubkey
        const subId = `bunker-${Date.now().toString(36)}`;
        conn.subscriptionId = subId;

        const filter = {
          kinds: [24133],
          "#p": [subscribeToPubkey],
          since: Math.floor(Date.now() / 1000) - 60, // last 60 seconds
        };

        const reqMsg = JSON.stringify(["REQ", subId, filter]);
        ws.send(reqMsg);

        resolve();
      });

      ws.on("message", (data: WebSocket.Data) => {
        try {
          const msg: RelayMessage = JSON.parse(data.toString());
          this.handleMessage(msg, url);
        } catch (err) {
          this.events.onError(
            new Error(`Failed to parse relay message: ${err}`),
            url,
          );
        }
      });

      ws.on("error", (err: Error) => {
        this.events.onError(err, url);
      });

      ws.on("close", () => {
        conn.isConnected = false;
        this.events.onDisconnect(url);
        this.scheduleReconnect(url, subscribeToPubkey);
      });

      // Resolve after timeout if connection doesn't open
      setTimeout(() => resolve(), 10000);
    });
  }

  /**
   * Handle incoming relay messages.
   */
  private handleMessage(msg: RelayMessage, relayUrl: string): void {
    if (!Array.isArray(msg) || msg.length < 2) return;

    switch (msg[0]) {
      case "EVENT": {
        if (msg.length >= 3) {
          const event = msg[2] as NostrEvent;
          if (event.kind === 24133) {
            this.events.onEvent(event, relayUrl);
          }
        }
        break;
      }
      case "OK": {
        // Event publish acknowledgment — could log or track
        break;
      }
      case "EOSE": {
        // End of stored events — subscription is now live
        break;
      }
      case "NOTICE": {
        console.log(`[relay:${relayUrl}] NOTICE: ${msg[1]}`);
        break;
      }
    }
  }

  /**
   * Publish a signed event to all connected relays.
   */
  publishEvent(event: SignedEvent): void {
    const msg = JSON.stringify(["EVENT", event]);

    for (const [url, conn] of this.connections) {
      if (conn.isConnected && conn.ws?.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(msg);
        } catch (err) {
          this.events.onError(
            new Error(`Failed to publish to ${url}: ${err}`),
            url,
          );
        }
      }
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(
    url: string,
    subscribeToPubkey: string,
  ): void {
    const conn = this.connections.get(url);
    if (!conn) return;

    if (conn.reconnectTimer) {
      clearTimeout(conn.reconnectTimer);
    }

    conn.reconnectTimer = setTimeout(() => {
      console.log(`[relay] Reconnecting to ${url}...`);
      this.connectRelay(url, subscribeToPubkey).catch((err) => {
        this.events.onError(
          new Error(`Reconnection failed: ${err}`),
          url,
        );
      });
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from all relays and clean up.
   */
  disconnectAll(): void {
    for (const [url, conn] of this.connections) {
      if (conn.reconnectTimer) {
        clearTimeout(conn.reconnectTimer);
      }
      if (conn.subscriptionId && conn.ws?.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(JSON.stringify(["CLOSE", conn.subscriptionId]));
        } catch {
          // Ignore close errors
        }
      }
      conn.ws?.close();
    }
    this.connections.clear();
  }
}
```

---

## `src/bunker.ts`

```typescript
/**
 * NIP-46 Bunker Daemon — Core Logic
 *
 * This is the main bunker implementation. It:
 *  1. Holds the user's private key in memory
 *  2. Listens for kind:24133 events on configured relays
 *  3. Decrypts incoming NIP-44 messages
 *  4. Dispatches method calls (connect, sign_event, ping, etc.)
 *  5. Enforces permissions
 *  6. Encrypts and publishes responses as kind:24133 events
 *  7. Generates bunker:// URIs for client connection
 */

import { getPublicKey, randomHex, signEvent } from "./crypto.js";
import {
  decryptNIP44,
  encryptNIP44,
  getConversationKey,
  nip44Decrypt,
  nip44Encrypt,
} from "./nip44.js";
import {
  DEFAULT_PERMISSIONS,
  isAllowed,
  negotiatePermissions,
  parsePermissions,
  serializePermissions,
} from "./permissions.js";
import { RelayPool } from "./relay.js";
import type {
  BunkerConfig,
  ClientSession,
  HexString,
  NIP46Request,
  NIP46Response,
  NostrEvent,
  Permission,
  SignedEvent,
  UnsignedEvent,
} from "./types.js";

export class BunkerDaemon {
  /** The user's private key (used for signing events on behalf of the user) */
  private userPrivateKey: HexString;
  /** The user's public key */
  private userPubkey: HexString;

  /** The remote-signer's private key (used for NIP-44 transport encryption).
   *  May be the same as userPrivateKey, or a separate dedicated key. */
  private signerPrivateKey: HexString;
  /** The remote-signer's public key (appears in bunker:// URI) */
  private signerPubkey: HexString;

  /** Relay URLs */
  private relays: string[];

  /** Connection secret for the bunker:// URI */
  private secret: string;

  /** Connected client sessions, keyed by client pubkey */
  private sessions: Map<string, ClientSession> = new Map();

  /** Relay connection pool */
  private relayPool: RelayPool;

  /** Set of consumed secrets (single-use) */
  private consumedSecrets: Set<string> = new Set();

  constructor(config: BunkerConfig) {
    this.userPrivateKey = config.userPrivateKey;
    this.userPubkey = getPublicKey(config.userPrivateKey);

    // Use a separate signer key if provided, otherwise reuse user key
    this.signerPrivateKey = config.signerPrivateKey ?? config.userPrivateKey;
    this.signerPubkey = getPublicKey(this.signerPrivateKey);

    this.relays = config.relays;
    this.secret = config.secret ?? randomHex(16);

    this.relayPool = new RelayPool({
      onEvent: (event, relayUrl) => this.handleIncomingEvent(event, relayUrl),
      onError: (error, relayUrl) =>
        console.error(`[bunker] Relay error (${relayUrl}):`, error.message),
      onConnect: (relayUrl) =>
        console.log(`[bunker] Connected to relay: ${relayUrl}`),
      onDisconnect: (relayUrl) =>
        console.log(`[bunker] Disconnected from relay: ${relayUrl}`),
    });
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  /**
   * Start the bunker daemon: connect to relays and begin listening.
   */
  async start(): Promise<void> {
    console.log(`[bunker] Starting NIP-46 remote signer daemon`);
    console.log(`[bunker] User pubkey: ${this.userPubkey}`);
    console.log(`[bunker] Signer pubkey: ${this.signerPubkey}`);
    console.log(`[bunker] Relays: ${this.relays.join(", ")}`);
    console.log(`[bunker] Bunker URI: ${this.getBunkerURI()}`);
    console.log(
      `[bunker] Allowed permissions: ${
        serializePermissions(DEFAULT_PERMISSIONS)
      }`,
    );

    await this.relayPool.connectAll(this.relays, this.signerPubkey);

    console.log(`[bunker] Listening for kind:24133 events...`);
  }

  /**
   * Stop the bunker daemon and disconnect from all relays.
   */
  stop(): void {
    console.log(`[bunker] Shutting down...`);
    this.relayPool.disconnectAll();
    this.sessions.clear();
    console.log(`[bunker] Stopped.`);
  }

  // ─── Bunker URI ──────────────────────────────────────────────────

  /**
   * Generate the bunker:// URI that clients use to connect.
   *
   * Format: bunker://<remote-signer-pubkey>?relay=<url>&relay=<url>&secret=<secret>
   */
  getBunkerURI(): string {
    const params = new URLSearchParams();

    for (const relay of this.relays) {
      params.append("relay", relay);
    }

    if (this.secret) {
      params.set("secret", this.secret);
    }

    return `bunker://${this.signerPubkey}?${params.toString()}`;
  }

  // ─── Event Handling ──────────────────────────────────────────────

  /**
   * Handle an incoming kind:24133 event from a relay.
   */
  private async handleIncomingEvent(
    event: NostrEvent,
    relayUrl: string,
  ): Promise<void> {
    // Validate it's a kind:24133 event
    if (event.kind !== 24133) return;

    // Check that it's p-tagged to our signer pubkey
    const pTag = event.tags.find(
      (t) => t[0] === "p" && t[1] === this.signerPubkey,
    );
    if (!pTag) {
      console.log(`[bunker] Ignoring event not tagged to us`);
      return;
    }

    const clientPubkey = event.pubkey;

    try {
      // Decrypt the NIP-44 content
      const decrypted = decryptNIP44(
        event.content,
        this.signerPrivateKey,
        clientPubkey,
      );

      const request: NIP46Request = JSON.parse(decrypted);

      console.log(
        `[bunker] Received request: method=${request.method} id=${request.id} from=${
          clientPubkey.slice(0, 8)
        }...`,
      );

      // Process the request and get a response
      const response = await this.processRequest(
        request,
        clientPubkey,
      );

      // Send the response
      await this.sendResponse(response, clientPubkey);
    } catch (err) {
      console.error(
        `[bunker] Error processing event from ${clientPubkey.slice(0, 8)}...:`,
        err,
      );

      // Try to send an error response if we can parse the request ID
      try {
        const parsed = JSON.parse(
          decryptNIP44(event.content, this.signerPrivateKey, clientPubkey),
        );
        await this.sendResponse(
          {
            id: parsed.id ?? "unknown",
            result: "",
            error: `Internal error: ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
          clientPubkey,
        );
      } catch {
        // Can't even send an error response — log and move on
        console.error(`[bunker] Failed to send error response`);
      }
    }
  }

  // ─── Request Processing ──────────────────────────────────────────

  /**
   * Process a decrypted NIP-46 request and return a response.
   */
  private async processRequest(
    request: NIP46Request,
    clientPubkey: string,
  ): Promise<NIP46Response> {
    const { id, method, params } = request;

    switch (method) {
      case "connect":
        return this.handleConnect(id, params, clientPubkey);

      case "ping":
        return this.handlePing(id, clientPubkey);

      case "get_public_key":
        return this.handleGetPublicKey(id, clientPubkey);

      case "sign_event":
        return this.handleSignEvent(id, params, clientPubkey);

      case "nip44_encrypt":
        return this.handleNip44Encrypt(id, params, clientPubkey);

      case "nip44_decrypt":
        return this.handleNip44Decrypt(id, params, clientPubkey);

      case "nip04_encrypt":
      case "nip04_decrypt":
        return {
          id,
          result: "",
          error:
            `Method "${method}" is not supported by this bunker. Use nip44_encrypt/nip44_decrypt instead.`,
        };

      default:
        return {
          id,
          result: "",
          error: `Unknown method: ${method}`,
        };
    }
  }

  // ─── Method Handlers ─────────────────────────────────────────────

  /**
   * Handle the "connect" method.
   *
   * Params: [<remote-signer-pubkey>, <optional_secret>, <optional_requested_perms>]
   *
   * Validates the secret (single-use), negotiates permissions, and creates a session.
   */
  private handleConnect(
    requestId: string,
    params: string[],
    clientPubkey: string,
  ): NIP46Response {
    const [targetPubkey, providedSecret, requestedPermsStr] = params;

    // Validate the target pubkey matches our signer pubkey
    if (targetPubkey && targetPubkey !== this.signerPubkey) {
      return {
        id: requestId,
        result: "",
        error: "Target pubkey does not match this remote signer",
      };
    }

    // Validate the secret
    if (this.secret) {
      if (!providedSecret) {
        return {
          id: requestId,
          result: "",
          error: "Secret is required for connection",
        };
      }

      if (providedSecret !== this.secret) {
        return {
          id: requestId,
          result: "",
          error: "Invalid secret",
        };
      }

      // Check if secret has already been consumed (single-use)
      if (this.consumedSecrets.has(providedSecret)) {
        return {
          id: requestId,
          result: "",
          error: "Secret has already been used",
        };
      }

      // Mark secret as consumed
      this.consumedSecrets.add(providedSecret);
    }

    // Negotiate permissions
    const requestedPerms = requestedPermsStr
      ? parsePermissions(requestedPermsStr)
      : [];
    const grantedPerms = negotiatePermissions(
      requestedPerms,
      DEFAULT_PERMISSIONS,
    );

    // Create session
    const session: ClientSession = {
      clientPubkey,
      permissions: grantedPerms,
      connectedAt: Date.now(),
    };
    this.sessions.set(clientPubkey, session);

    console.log(
      `[bunker] Client connected: ${clientPubkey.slice(0, 8)}... ` +
        `permissions: ${serializePermissions(grantedPerms)}`,
    );

    return {
      id: requestId,
      result: "ack",
    };
  }

  /**
   * Handle the "ping" method.
   */
  private handlePing(
    requestId: string,
    clientPubkey: string,
  ): NIP46Response {
    // ping doesn't require a session
    return {
      id: requestId,
      result: "pong",
    };
  }

  /**
   * Handle the "get_public_key" method.
   * Returns the user's public key (not the signer transport key).
   */
  private handleGetPublicKey(
    requestId: string,
    clientPubkey: string,
  ): NIP46Response {
    // get_public_key doesn't require a session per spec
    return {
      id: requestId,
      result: this.userPubkey,
    };
  }

  /**
   * Handle the "sign_event" method.
   *
   * Params: [json_stringified(<unsigned_event>)]
   *
   * Enforces kind restrictions: only kind:0 and kind:1 are allowed.
   */
  private handleSignEvent(
    requestId: string,
    params: string[],
    clientPubkey: string,
  ): NIP46Response {
    // Require an active session
    const session = this.sessions.get(clientPubkey);
    if (!session) {
      return {
        id: requestId,
        result: "",
        error: 'Not connected. Send a "connect" request first.',
      };
    }

    if (!params[0]) {
      return {
        id: requestId,
        result: "",
        error: "Missing event parameter",
      };
    }

    let unsignedEvent: UnsignedEvent;
    try {
      unsignedEvent = JSON.parse(params[0]);
    } catch {
      return {
        id: requestId,
        result: "",
        error: "Invalid event JSON",
      };
    }

    // Validate required fields
    if (typeof unsignedEvent.kind !== "number") {
      return {
        id: requestId,
        result: "",
        error: 'Event must have a "kind" field (number)',
      };
    }

    if (typeof unsignedEvent.content !== "string") {
      return {
        id: requestId,
        result: "",
        error: 'Event must have a "content" field (string)',
      };
    }

    if (!Array.isArray(unsignedEvent.tags)) {
      return {
        id: requestId,
        result: "",
        error: 'Event must have a "tags" field (array)',
      };
    }

    if (typeof unsignedEvent.created_at !== "number") {
      return {
        id: requestId,
        result: "",
        error: 'Event must have a "created_at" field (number)',
      };
    }

    // Check permissions — enforce kind restriction
    if (!isAllowed("sign_event", session.permissions, unsignedEvent.kind)) {
      return {
        id: requestId,
        result: "",
        error:
          `Permission denied: sign_event for kind:${unsignedEvent.kind} is not allowed. ` +
          `Allowed kinds: ${
            session.permissions
              .filter((p) => p.method === "sign_event")
              .map((p) => p.kind)
              .join(", ")
          }`,
      };
    }

    // Sign the event with the user's private key
    const signed = signEvent(this.userPrivateKey, unsignedEvent);

    console.log(
      `[bunker] Signed event: kind=${signed.kind} id=${
        signed.id.slice(0, 8)
      }... ` +
        `for client=${clientPubkey.slice(0, 8)}...`,
    );

    return {
      id: requestId,
      result: JSON.stringify(signed),
    };
  }

  /**
   * Handle the "nip44_encrypt" method.
   *
   * Params: [<third_party_pubkey>, <plaintext_to_encrypt>]
   *
   * Encrypts plaintext using the user's private key and the third party's public key.
   */
  private handleNip44Encrypt(
    requestId: string,
    params: string[],
    clientPubkey: string,
  ): NIP46Response {
    const session = this.sessions.get(clientPubkey);
    if (!session) {
      return {
        id: requestId,
        result: "",
        error: 'Not connected. Send a "connect" request first.',
      };
    }

    if (!isAllowed("nip44_encrypt", session.permissions)) {
      return {
        id: requestId,
        result: "",
        error: "Permission denied: nip44_encrypt is not allowed",
      };
    }

    const [thirdPartyPubkey, plaintext] = params;

    if (!thirdPartyPubkey || !plaintext) {
      return {
        id: requestId,
        result: "",
        error: "nip44_encrypt requires [third_party_pubkey, plaintext]",
      };
    }

    try {
      // Encrypt using the USER's private key (not the signer transport key)
      const conversationKey = getConversationKey(
        this.userPrivateKey,
        thirdPartyPubkey,
      );
      const ciphertext = nip44Encrypt(plaintext, conversationKey);

      return {
        id: requestId,
        result: ciphertext,
      };
    } catch (err) {
      return {
        id: requestId,
        result: "",
        error: `Encryption failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  /**
   * Handle the "nip44_decrypt" method.
   *
   * Params: [<third_party_pubkey>, <nip44_ciphertext_to_decrypt>]
   *
   * Decrypts ciphertext using the user's private key and the third party's public key.
   */
  private handleNip44Decrypt(
    requestId: string,
    params: string[],
    clientPubkey: string,
  ): NIP46Response {
    const session = this.sessions.get(clientPubkey);
    if (!session) {
      return {
        id: requestId,
        result: "",
        error: 'Not connected. Send a "connect" request first.',
      };
    }

    if (!isAllowed("nip44_decrypt", session.permissions)) {
      return {
        id: requestId,
        result: "",
        error: "Permission denied: nip44_decrypt is not allowed",
      };
    }

    const [thirdPartyPubkey, ciphertext] = params;

    if (!thirdPartyPubkey || !ciphertext) {
      return {
        id: requestId,
        result: "",
        error: "nip44_decrypt requires [third_party_pubkey, ciphertext]",
      };
    }

    try {
      // Decrypt using the USER's private key (not the signer transport key)
      const conversationKey = getConversationKey(
        this.userPrivateKey,
        thirdPartyPubkey,
      );
      const plaintext = nip44Decrypt(ciphertext, conversationKey);

      return {
        id: requestId,
        result: plaintext,
      };
    } catch (err) {
      return {
        id: requestId,
        result: "",
        error: `Decryption failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  // ─── Response Sending ────────────────────────────────────────────

  /**
   * Encrypt a response and publish it as a kind:24133 event.
   *
   * The response is:
   *  - JSON-stringified
   *  - NIP-44 encrypted with the signer's private key → client's public key
   *  - Wrapped in a kind:24133 event signed by the signer key
   *  - p-tagged with the client's pubkey
   */
  private async sendResponse(
    response: NIP46Response,
    clientPubkey: string,
  ): Promise<void> {
    const responseJson = JSON.stringify(response);

    // Encrypt with NIP-44 using the signer's key pair
    const encryptedContent = encryptNIP44(
      responseJson,
      this.signerPrivateKey,
      clientPubkey,
    );

    // Create and sign the kind:24133 response event
    const unsignedEvent: UnsignedEvent = {
      kind: 24133,
      content: encryptedContent,
      tags: [["p", clientPubkey]],
      created_at: Math.floor(Date.now() / 1000),
    };

    const signedEvent = signEvent(this.signerPrivateKey, unsignedEvent);

    console.log(
      `[bunker] Sending response: id=${response.id} ` +
        `to=${clientPubkey.slice(0, 8)}... ` +
        `${
          response.error
            ? `error="${response.error}"`
            : `result_len=${response.result.length}`
        }`,
    );

    // Publish to all connected relays
    this.relayPool.publishEvent(signedEvent);
  }

  // ─── Introspection ───────────────────────────────────────────────

  /**
   * Get the number of active client sessions.
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get info about a connected client.
   */
  getSession(clientPubkey: string): ClientSession | undefined {
    return this.sessions.get(clientPubkey);
  }

  /**
   * Revoke a client's session.
   */
  revokeSession(clientPubkey: string): boolean {
    return this.sessions.delete(clientPubkey);
  }

  /**
   * Get the user's public key.
   */
  getUserPubkey(): string {
    return this.userPubkey;
  }

  /**
   * Get the signer's public key (used in bunker:// URI).
   */
  getSignerPubkey(): string {
    return this.signerPubkey;
  }
}
```

---

## `src/index.ts`

```typescript
/**
 * NIP-46 Bunker Daemon — Entry Point
 *
 * Starts the remote signer daemon with configuration from environment
 * variables or command-line arguments.
 *
 * Environment variables:
 *   BUNKER_USER_PRIVATE_KEY  — The user's private key (hex, 64 chars)
 *   BUNKER_SIGNER_PRIVATE_KEY — Optional separate signer transport key (hex)
 *   BUNKER_RELAYS            — Comma-separated relay URLs
 *   BUNKER_SECRET            — Optional connection secret
 *
 * Usage:
 *   BUNKER_USER_PRIVATE_KEY=<hex> BUNKER_RELAYS=wss://relay.example.com node dist/index.js
 */

import { BunkerDaemon } from "./bunker.js";
import { getPublicKey, randomHex } from "./crypto.js";
import type { BunkerConfig } from "./types.js";

function loadConfig(): BunkerConfig {
  const userPrivateKey = process.env.BUNKER_USER_PRIVATE_KEY;
  if (!userPrivateKey) {
    console.error(
      "Error: BUNKER_USER_PRIVATE_KEY environment variable is required",
    );
    console.error(
      "  Set it to a 64-character hex-encoded secp256k1 private key",
    );
    process.exit(1);
  }

  // Validate key format
  if (!/^[0-9a-f]{64}$/i.test(userPrivateKey)) {
    console.error(
      "Error: BUNKER_USER_PRIVATE_KEY must be a 64-character hex string",
    );
    process.exit(1);
  }

  const relaysEnv = process.env.BUNKER_RELAYS;
  if (!relaysEnv) {
    console.error("Error: BUNKER_RELAYS environment variable is required");
    console.error("  Set it to a comma-separated list of relay WebSocket URLs");
    console.error(
      "  Example: BUNKER_RELAYS=wss://relay.damus.io,wss://nos.lol",
    );
    process.exit(1);
  }

  const relays = relaysEnv
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("wss://") || r.startsWith("ws://"));

  if (relays.length === 0) {
    console.error("Error: No valid relay URLs found in BUNKER_RELAYS");
    process.exit(1);
  }

  const signerPrivateKey = process.env.BUNKER_SIGNER_PRIVATE_KEY;
  const secret = process.env.BUNKER_SECRET || randomHex(16);

  return {
    userPrivateKey: userPrivateKey.toLowerCase(),
    relays,
    secret,
    signerPrivateKey: signerPrivateKey?.toLowerCase(),
  };
}

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   NIP-46 Remote Signer (Bunker Daemon)      ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log();

  const config = loadConfig();
  const bunker = new BunkerDaemon(config);

  // Print connection info
  console.log("─── Configuration ───────────────────────────────");
  console.log(`  User pubkey:   ${getPublicKey(config.userPrivateKey)}`);
  if (config.signerPrivateKey) {
    console.log(`  Signer pubkey: ${getPublicKey(config.signerPrivateKey)}`);
  }
  console.log(`  Relays:        ${config.relays.join(", ")}`);
  console.log(
    `  Permissions:   sign_event:0, sign_event:1, nip44_encrypt, nip44_decrypt`,
  );
  console.log();

  // Start the daemon
  await bunker.start();

  console.log();
  console.log("─── Bunker URI (share with clients) ─────────────");
  console.log(`  ${bunker.getBunkerURI()}`);
  console.log();
  console.log("─── Ready ───────────────────────────────────────");
  console.log("  Listening for incoming NIP-46 requests...");
  console.log("  Press Ctrl+C to stop");
  console.log();

  // Handle graceful shutdown
  const shutdown = () => {
    console.log("\n[bunker] Received shutdown signal");
    bunker.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

---

## Architecture & Design Decisions

### Key Separation

The implementation supports two key modes:

1. **Single key mode** (default): The user's private key is used for both
   signing events and for the NIP-44 transport encryption on kind:24133
   messages. The `remote-signer-pubkey` in the `bunker://` URI equals the
   `user-pubkey`.

2. **Separate signer key mode**: A dedicated `signerPrivateKey` handles the
   NIP-44 transport layer, while the `userPrivateKey` is only used when the
   client requests `sign_event`, `nip44_encrypt`, or `nip44_decrypt`. This
   provides better security isolation — the transport key can be rotated without
   affecting the user's identity.

### Permission Model

The permission system enforces a strict allowlist:

| Method           | Allowed         | Scope                  |
| ---------------- | --------------- | ---------------------- |
| `connect`        | Always          | —                      |
| `ping`           | Always          | —                      |
| `get_public_key` | Always          | —                      |
| `sign_event`     | With permission | kind:0, kind:1 only    |
| `nip44_encrypt`  | With permission | Any third-party pubkey |
| `nip44_decrypt`  | With permission | Any third-party pubkey |
| `nip04_encrypt`  | Denied          | Explicitly rejected    |
| `nip04_decrypt`  | Denied          | Explicitly rejected    |

When a client sends a `connect` request with `optional_requested_perms`, the
bunker negotiates permissions by intersecting the client's request with the
allowed set. If no permissions are requested, the full default set is granted.

### NIP-44 v2 Implementation Details

The encryption follows the NIP-44 v2 specification exactly:

1. **Conversation key**: `HKDF-extract(IKM=ECDH(a,B), salt="nip44-v2")`
2. **Message keys**: `HKDF-expand(PRK=conversation_key, info=nonce, L=76)` →
   split into `chacha_key(32)`, `chacha_nonce(12)`, `hmac_key(32)`
3. **Padding**: Power-of-two scheme with 32-byte minimum, 2-byte big-endian
   length prefix
4. **Encryption**: ChaCha20 (RFC 8439) with counter starting at 0
5. **MAC**: `HMAC-SHA256(key=hmac_key, message=concat(nonce, ciphertext))` —
   nonce is the AAD
6. **Payload**: `base64(0x02 || nonce || ciphertext || mac)`
7. **Decryption**: MAC is verified before decryption (MAC-then-decrypt) using
   constant-time comparison

### Connect Flow

```
Client                          Bunker
  │                               │
  │  1. User provides bunker://   │
  │     URI to client             │
  │                               │
  │  2. kind:24133 ──────────────►│
  │     NIP-44 encrypted:         │
  │     {                         │
  │       method: "connect",      │
  │       params: [               │
  │         signerPubkey,         │
  │         secret,               │
  │         "sign_event:0,..."    │
  │       ]                       │
  │     }                         │
  │                               │
  │  3. Validate secret           │
  │     (single-use)              │
  │     Negotiate permissions     │
  │     Create session            │
  │                               │
  │  ◄──────────────── kind:24133 │
  │     NIP-44 encrypted:         │
  │     { result: "ack" }         │
  │                               │
  │  4. kind:24133 ──────────────►│
  │     { method: "get_public_key"│
  │       params: [] }            │
  │                               │
  │  ◄──────────────── kind:24133 │
  │     { result: "<user-pubkey>"}│
  │                               │
```

### Security Considerations

1. **Secret is single-use**: Once a secret from the `bunker://` URI is consumed,
   it cannot be reused. This prevents replay attacks on the connection flow.

2. **Session required**: All signing and encryption operations require an active
   session established via `connect`. Unauthenticated requests are rejected.

3. **Kind restriction**: `sign_event` is restricted to kind:0 (metadata) and
   kind:1 (short text notes). Attempts to sign other kinds (e.g., kind:4 DMs,
   kind:22242 auth) are denied with a descriptive error.

4. **NIP-04 explicitly denied**: The deprecated NIP-04 encryption methods are
   explicitly rejected with a message directing clients to use NIP-44 instead.

5. **MAC-before-decrypt**: NIP-44 decryption verifies the HMAC before attempting
   decryption, preventing padding oracle attacks.

6. **Constant-time MAC comparison**: The MAC verification uses a constant-time
   comparison to prevent timing side-channel attacks.

7. **Private key isolation**: The user's private key never leaves the bunker
   process. Only signed events and encrypted/decrypted content are returned to
   clients.

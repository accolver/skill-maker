# Nostr Bunker Integration: Complete Client Connection Flow

## Overview

This guide implements a complete NIP-46 remote signing integration for a Nostr
social client in TypeScript using `@nostr/tools`. It covers:

1. Parsing a `bunker://` URI pasted by the user
2. Establishing the connection with a disposable client keypair
3. Retrieving the user's actual pubkey (which may differ from the signer pubkey)
4. Handling auth challenges (signer-initiated user approval)
5. Requesting relay switching (signer controls relays)
6. Signing a kind:1 note
7. Persisting the session for reconnection across page reloads

**Role:** Client (we are building an app that needs signatures from a remote
signer).

**Connection flow:** Bunker-initiated (`bunker://`) — the user pastes a URI from
their remote signer.

---

## Installation

```bash
npm install @nostr/tools
```

---

## Complete Implementation

### `bunker-auth.ts` — Core Bunker Connection Module

```typescript
import { generateSecretKey, getPublicKey } from "@nostr/tools/pure";
import {
  type BunkerPointer,
  BunkerSigner,
  parseBunkerInput,
} from "@nostr/tools/nip46";
import { SimplePool } from "@nostr/tools/pool";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Persisted session data stored in localStorage */
interface BunkerSession {
  /** Hex-encoded client secret key (disposable, generated per session) */
  clientSecretKeyHex: string;
  /** The parsed bunker pointer (remote-signer-pubkey, relays, secret) */
  bunkerPointer: BunkerPointer;
  /** The user's actual pubkey (from get_public_key, NOT the signer pubkey) */
  userPubkey: string;
}

/** Connection result returned to the application */
interface BunkerConnection {
  /** The BunkerSigner instance for signing events */
  signer: BunkerSigner;
  /** The user's actual Nostr pubkey (hex) */
  userPubkey: string;
  /** The SimplePool instance (caller must close on logout) */
  pool: SimplePool;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "nostr_bunker_session";

// ─── Session Persistence ─────────────────────────────────────────────────────

/**
 * Save the bunker session to localStorage so the user stays logged in
 * across page reloads.
 *
 * We persist:
 * - The client secret key (hex) — reusing the same key avoids re-authorization
 * - The bunker pointer — contains remote-signer-pubkey and relay URLs
 * - The user's actual pubkey — so we can display identity immediately on reload
 *
 * IMPORTANT: The client secret key is a disposable transport key, NOT the
 * user's private key. The user's private key never leaves the remote signer.
 */
function saveSession(session: BunkerSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Load a previously saved bunker session from localStorage.
 * Returns null if no session exists or if the stored data is invalid.
 */
function loadSession(): BunkerSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    // Validate required fields
    if (
      !parsed.clientSecretKeyHex ||
      !parsed.bunkerPointer?.pubkey ||
      !parsed.bunkerPointer?.relays?.length ||
      !parsed.userPubkey
    ) {
      return null;
    }
    return parsed as BunkerSession;
  } catch {
    return null;
  }
}

/**
 * Clear the saved session (logout).
 */
function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Connection Flow ─────────────────────────────────────────────────────────

/**
 * Connect to a remote signer using a bunker:// URI.
 *
 * This is the initial connection flow when the user pastes a bunker:// URI
 * for the first time. It:
 *
 * 1. Parses the bunker:// URI to extract remote-signer-pubkey, relays, and
 *    optional secret
 * 2. Generates a disposable client keypair for transport encryption
 * 3. Creates a BunkerSigner and calls connect() to establish the session
 * 4. Calls get_public_key to learn the user's ACTUAL pubkey
 *    (CRITICAL: the remote-signer-pubkey is for transport only — the user's
 *    identity pubkey may be different)
 * 5. Calls switch_relays to let the signer update relay preferences
 * 6. Persists the session for future reconnection
 *
 * @param bunkerUri - The bunker:// URI pasted by the user
 * @param onAuth - Callback invoked when the signer sends an auth challenge
 * @returns The connection object with signer, user pubkey, and pool
 */
async function connectFromBunkerURI(
  bunkerUri: string,
  onAuth?: (url: string) => void,
): Promise<BunkerConnection> {
  // ── Step 1: Parse the bunker:// URI ──────────────────────────────────────
  //
  // parseBunkerInput handles both bunker:// URIs and NIP-05 identifiers.
  // It extracts:
  //   - pubkey: the remote-signer-pubkey (hex) — used for transport encryption
  //   - relays: array of relay URLs where the signer listens
  //   - secret: optional single-use secret for connection validation
  //
  const bunkerPointer = await parseBunkerInput(bunkerUri);
  if (!bunkerPointer) {
    throw new Error(
      "Invalid bunker URI. Expected format: bunker://<hex-pubkey>?relay=wss://...&secret=<optional>",
    );
  }

  // ── Step 2: Generate a disposable client keypair ─────────────────────────
  //
  // This keypair is used ONLY for transport encryption (NIP-44) between the
  // client and the remote signer. It is NOT the user's identity key.
  //
  // IMPORTANT: We persist this key so that on reconnection we reuse the same
  // client identity. Generating a new keypair each time would force the signer
  // to re-authorize the connection.
  //
  const clientSecretKey = generateSecretKey();

  // ── Step 3: Create BunkerSigner and connect ──────────────────────────────
  //
  // BunkerSigner.fromBunker() creates a signer for the bunker-initiated flow.
  // The onauth callback handles auth challenges — when the signer needs the
  // user to approve an action, it returns an auth_url that we must display.
  //
  const pool = new SimplePool();
  const signer = BunkerSigner.fromBunker(clientSecretKey, bunkerPointer, {
    pool,
    onauth: (url: string) => {
      // Auth challenge: the signer needs user approval.
      // The URL points to the signer's approval page.
      // The client MUST:
      //   1. Open this URL (popup or new tab)
      //   2. Keep the subscription open (same request ID)
      //   3. Wait for the second response after user authenticates
      if (onAuth) {
        onAuth(url);
      } else {
        // Default: open in a popup window
        window.open(url, "bunker-auth", "width=600,height=400");
      }
    },
  });

  // connect() sends the initial "connect" request to the signer.
  // If the bunker URI included a secret, the signer validates it (single-use).
  // This call blocks until the signer acknowledges the connection.
  await signer.connect();

  // ── Step 4: Get the user's actual pubkey ──────────────────────────────────
  //
  // CRITICAL: The remote-signer-pubkey (from the bunker:// URI) is the
  // transport key. The user's actual identity pubkey may be DIFFERENT.
  // Always call get_public_key after connecting to learn the real identity.
  //
  const userPubkey = await signer.getPublicKey();

  // ── Step 5: Request relay switching ──────────────────────────────────────
  //
  // The signer controls which relays are used for communication.
  // After connecting, call switch_relays to let the signer update the relay
  // list. If the signer returns new relays, the BunkerSigner automatically
  // updates its internal state.
  //
  try {
    await signer.switchRelays();
  } catch {
    // switch_relays is best-effort — some signers may not implement it.
    // The connection still works on the original relays.
    console.warn(
      "switch_relays not supported by this signer, continuing with original relays",
    );
  }

  // ── Step 6: Persist the session ──────────────────────────────────────────
  //
  // Save everything needed to reconnect without re-authorization:
  //   - clientSecretKeyHex: same client identity for the signer to recognize
  //   - bunkerPointer: remote-signer-pubkey and relays (secret is NOT saved —
  //     secrets are single-use and must not be reused)
  //   - userPubkey: so we can display the user's identity immediately on reload
  //
  const session: BunkerSession = {
    clientSecretKeyHex: bytesToHex(clientSecretKey),
    bunkerPointer: {
      pubkey: bunkerPointer.pubkey,
      relays: bunkerPointer.relays,
      secret: null, // Never persist the secret — it's single-use
    },
    userPubkey,
  };
  saveSession(session);

  return { signer, userPubkey, pool };
}

/**
 * Reconnect to a previously established bunker session.
 *
 * This is used on page reload when a session already exists in localStorage.
 * It recreates the BunkerSigner with the same client keypair, which the signer
 * recognizes as an already-authorized client.
 *
 * IMPORTANT: We do NOT call connect() on reconnection. The signer already
 * knows this client keypair from the initial connection. Calling connect()
 * again would be redundant and some signers may reject it.
 *
 * @param onAuth - Callback for auth challenges (still needed — signer may
 *                 challenge individual requests even on reconnected sessions)
 * @returns The connection object, or null if no saved session exists
 */
async function reconnectFromSession(
  onAuth?: (url: string) => void,
): Promise<BunkerConnection | null> {
  const session = loadSession();
  if (!session) return null;

  // Restore the client secret key from hex
  const clientSecretKey = hexToBytes(session.clientSecretKeyHex);

  // Recreate the BunkerSigner with the stored pointer and same client key
  const pool = new SimplePool();
  const signer = BunkerSigner.fromBunker(
    clientSecretKey,
    session.bunkerPointer,
    {
      pool,
      onauth: (url: string) => {
        if (onAuth) {
          onAuth(url);
        } else {
          window.open(url, "bunker-auth", "width=600,height=400");
        }
      },
    },
  );

  // No connect() call needed — the signer already recognizes this client.
  // The signer is ready to handle requests immediately.

  // Optionally verify the connection is still alive
  try {
    await signer.ping();
  } catch {
    // Signer is unreachable — session may have expired
    clearSession();
    pool.close([]);
    return null;
  }

  return {
    signer,
    userPubkey: session.userPubkey,
    pool,
  };
}

/**
 * Disconnect from the bunker and clear the persisted session.
 *
 * Call this when the user explicitly logs out.
 */
async function disconnect(connection: BunkerConnection): Promise<void> {
  await connection.signer.close();
  connection.pool.close([]);
  clearSession();
}

// ─── Event Signing ───────────────────────────────────────────────────────────

/**
 * Sign a kind:1 text note using the remote signer.
 *
 * The signer signs with the USER's private key (not the transport key).
 * The returned event has the user's pubkey as the author and a valid signature.
 *
 * @param signer - The connected BunkerSigner instance
 * @param content - The text content of the note
 * @param tags - Optional tags (e.g., reply tags, hashtags)
 * @returns The fully signed event (kind:1) ready to publish
 */
async function signNote(
  signer: BunkerSigner,
  content: string,
  tags: string[][] = [],
) {
  const signedEvent = await signer.signEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content,
  });

  return signedEvent;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  type BunkerConnection,
  type BunkerSession,
  clearSession,
  connectFromBunkerURI,
  disconnect,
  loadSession,
  reconnectFromSession,
  signNote,
};
```

---

### `app.ts` — Application Integration Example

```typescript
import {
  type BunkerConnection,
  connectFromBunkerURI,
  disconnect,
  reconnectFromSession,
  signNote,
} from "./bunker-auth";

// ─── Application State ──────────────────────────────────────────────────────

let currentConnection: BunkerConnection | null = null;

// ─── Auth Challenge Handler ──────────────────────────────────────────────────

/**
 * Handle auth challenges from the remote signer.
 *
 * When the signer needs user approval (e.g., for an ungranted permission),
 * it returns an auth_url response. The client must:
 *   1. Open the URL for the user to authenticate
 *   2. Keep the subscription open (BunkerSigner handles this internally)
 *   3. Wait for the second response with the actual result
 *
 * The BunkerSigner's onauth callback fires when this happens. We open the
 * URL in a popup and the signer resolves the original request after the
 * user approves.
 */
function handleAuthChallenge(url: string): void {
  // Display a notification to the user
  console.log("Signer requires authentication. Opening approval page...");

  // Open the signer's auth page in a popup
  const popup = window.open(url, "bunker-auth", "width=600,height=400");

  // Optionally focus the popup
  if (popup) {
    popup.focus();
  }
}

// ─── Login Flow ──────────────────────────────────────────────────────────────

/**
 * Initialize the app — try to reconnect from a saved session first,
 * otherwise show the login UI.
 */
async function initializeApp(): Promise<void> {
  // Try to reconnect from a persisted session
  currentConnection = await reconnectFromSession(handleAuthChallenge);

  if (currentConnection) {
    console.log(`Welcome back! Logged in as: ${currentConnection.userPubkey}`);
    showMainUI(currentConnection.userPubkey);
  } else {
    console.log("No saved session. Please log in with your bunker URI.");
    showLoginUI();
  }
}

/**
 * Handle the user pasting a bunker:// URI to log in.
 *
 * This is the primary login flow:
 *   1. Parse the bunker:// URI
 *   2. Generate a disposable client keypair
 *   3. Connect to the remote signer
 *   4. Get the user's actual pubkey (may differ from signer pubkey!)
 *   5. Request relay switching (signer controls relays)
 *   6. Persist the session for future reconnection
 */
async function loginWithBunkerURI(bunkerUri: string): Promise<void> {
  try {
    // Validate the URI format before attempting connection
    if (!bunkerUri.startsWith("bunker://")) {
      throw new Error(
        'Invalid URI. Must start with "bunker://". ' +
          "Get this from your remote signer app (e.g., nsec.app, Amber).",
      );
    }

    console.log("Connecting to remote signer...");

    currentConnection = await connectFromBunkerURI(
      bunkerUri,
      handleAuthChallenge,
    );

    console.log(`Logged in as: ${currentConnection.userPubkey}`);
    showMainUI(currentConnection.userPubkey);
  } catch (error) {
    console.error("Login failed:", error);
    showError(
      error instanceof Error
        ? error.message
        : "Failed to connect to remote signer. Check the URI and try again.",
    );
  }
}

// ─── Posting Flow ────────────────────────────────────────────────────────────

/**
 * Post a kind:1 text note using the remote signer.
 *
 * The signer signs with the user's private key (not the transport key).
 * After signing, we publish the event to relays.
 */
async function postNote(content: string): Promise<void> {
  if (!currentConnection) {
    throw new Error("Not connected. Please log in first.");
  }

  try {
    console.log("Requesting signature from remote signer...");

    // Sign the event via the remote signer
    // The signer may trigger an auth challenge here if the permission
    // wasn't pre-granted. The onauth callback handles this automatically.
    const signedEvent = await signNote(currentConnection.signer, content);

    console.log("Event signed successfully:", signedEvent.id);

    // Publish to relays
    const relays = [
      "wss://relay.damus.io",
      "wss://relay.primal.net",
      "wss://nos.lol",
    ];
    await currentConnection.pool.publish(relays, signedEvent);

    console.log("Note published to relays:", signedEvent.id);
  } catch (error) {
    console.error("Failed to post note:", error);
    throw error;
  }
}

// ─── Logout Flow ─────────────────────────────────────────────────────────────

/**
 * Log out: close the bunker connection and clear the persisted session.
 */
async function logout(): Promise<void> {
  if (currentConnection) {
    await disconnect(currentConnection);
    currentConnection = null;
  }
  showLoginUI();
}

// ─── UI Stubs (replace with your actual UI framework) ────────────────────────

function showLoginUI(): void {
  console.log("--- LOGIN ---");
  console.log("Paste your bunker:// URI to connect.");
}

function showMainUI(userPubkey: string): void {
  console.log("--- MAIN ---");
  console.log(`Connected as: ${userPubkey}`);
}

function showError(message: string): void {
  console.error(`ERROR: ${message}`);
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

initializeApp();

export { initializeApp, loginWithBunkerURI, logout, postNote };
```

---

## How It Works: Step by Step

### 1. Initial Connection (User pastes `bunker://` URI)

```
User pastes: bunker://ab12cd34...?relay=wss://relay.damus.io&relay=wss://nos.lol&secret=one-time-secret

┌─────────────┐                              ┌──────────────────┐
│  Client App  │                              │  Remote Signer   │
│              │                              │  (holds privkey) │
└──────┬───────┘                              └────────┬─────────┘
       │                                               │
       │  1. Parse URI → extract signer pubkey,        │
       │     relays, secret                            │
       │                                               │
       │  2. Generate disposable client keypair         │
       │                                               │
       │  3. kind:24133 "connect" request ────────────►│
       │     (NIP-44 encrypted, includes secret)       │
       │                                               │
       │◄──────────── kind:24133 "ack" response        │
       │     (NIP-44 encrypted)                        │
       │                                               │
       │  4. kind:24133 "get_public_key" ─────────────►│
       │                                               │
       │◄──────────── user pubkey (may differ from     │
       │              signer pubkey!)                   │
       │                                               │
       │  5. kind:24133 "switch_relays" ──────────────►│
       │                                               │
       │◄──────────── updated relay list or null       │
       │                                               │
       │  6. Save session to localStorage              │
       │     (client SK, bunker pointer, user pubkey)  │
       └───────────────────────────────────────────────┘
```

### 2. Signing a Kind:1 Note

```
│  kind:24133 "sign_event" ────────────────────►│
│  params: [JSON.stringify({                    │
│    kind: 1,                                   │
│    content: "Hello!",                         │
│    tags: [],                                  │
│    created_at: 1234567890                     │
│  })]                                          │
│                                               │
│  (signer may return auth_url if approval      │
│   is needed — see auth challenge flow below)  │
│                                               │
│◄──────────── signed event JSON                │
│  (signed with USER's privkey, not signer's)   │
```

### 3. Auth Challenge Flow

```
│  kind:24133 "sign_event" ────────────────────►│
│                                               │
│◄──── kind:24133 response:                     │
│      result: "auth_url"                       │
│      error: "https://signer.example/approve"  │
│                                               │
│  Client opens URL in popup ──────────────────►│ (user approves)
│                                               │
│◄──── kind:24133 response (same request ID):   │
│      result: "<signed_event_json>"            │
│      (this is the actual result)              │
```

### 4. Reconnection (Page Reload)

```
│  Load session from localStorage               │
│  (client SK, bunker pointer, user pubkey)     │
│                                               │
│  Create BunkerSigner with stored client SK    │
│  (NO connect() call — signer already knows    │
│   this client)                                │
│                                               │
│  kind:24133 "ping" ──────────────────────────►│
│                                               │
│◄──────────── "pong"                           │
│                                               │
│  Session restored — ready to sign             │
```

---

## Key Protocol Details

### All Communication Uses Kind:24133 Events

Every request and response is a kind:24133 Nostr event with NIP-44 encrypted
content. The encrypted payload is a JSON-RPC-like message:

**Request (client → signer):**

```json
{
  "kind": 24133,
  "pubkey": "<client_pubkey>",
  "content": "<NIP-44 encrypted JSON below>",
  "tags": [["p", "<remote_signer_pubkey>"]]
}
```

Encrypted content:

```json
{
  "id": "<random_request_id>",
  "method": "sign_event",
  "params": [
    "{\"kind\":1,\"content\":\"Hello!\",\"tags\":[],\"created_at\":1234567890}"
  ]
}
```

**Response (signer → client):**

```json
{
  "kind": 24133,
  "pubkey": "<remote_signer_pubkey>",
  "content": "<NIP-44 encrypted JSON below>",
  "tags": [["p", "<client_pubkey>"]]
}
```

Encrypted content:

```json
{
  "id": "<matching_request_id>",
  "result": "{\"id\":\"...\",\"pubkey\":\"...\",\"sig\":\"...\",\"kind\":1,...}",
  "error": null
}
```

### NIP-44 Only — Never NIP-04

All kind:24133 content MUST be encrypted with NIP-44 (version 2). NIP-04 is
deprecated and insecure. The `@nostr/tools` `BunkerSigner` handles this
automatically.

### User Pubkey ≠ Signer Pubkey

The `remote-signer-pubkey` in the `bunker://` URI is the transport key used for
NIP-44 encryption between client and signer. The user's actual identity pubkey
(used for signing events) may be a completely different key. Always call
`getPublicKey()` after connecting to learn the real identity.

### Secrets Are Single-Use

The `secret` parameter in a `bunker://` URI is a one-time connection token. The
signer validates it during the initial `connect` request and then discards it.
Never persist or reuse a secret — the signer SHOULD reject reused secrets.

---

## Session Persistence Strategy

The session persistence approach stores three pieces of data in `localStorage`:

| Field                | Purpose                                                | Security Note                                          |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `clientSecretKeyHex` | Disposable client key for transport encryption         | NOT the user's private key — safe to store client-side |
| `bunkerPointer`      | Remote signer pubkey + relay URLs (secret set to null) | Secret is explicitly nulled — never persisted          |
| `userPubkey`         | User's actual identity pubkey                          | Public information — no security concern               |

**Why this works:** The remote signer recognizes the client by its public key.
By reusing the same client keypair on reconnection, the signer treats it as an
already-authorized client. No `connect()` call is needed — the signer is ready
to handle requests immediately.

**Why we null the secret:** Secrets are single-use. Storing and replaying a
secret would be rejected by the signer and is a security anti-pattern.

**On logout:** We call `clearSession()` which removes all stored data. The
client keypair is effectively discarded, and the signer will require
re-authorization on the next connection.

---

## Checklist Verification

- [x] **Role determined:** Client (building an app that needs signatures)
- [x] **Connection flow chosen:** Bunker-initiated (`bunker://`)
- [x] **Disposable client keypair generated and persisted per session** —
      generated in `connectFromBunkerURI`, persisted via `saveSession`, reused
      in `reconnectFromSession`
- [x] **`get_public_key` called after connect** — user pubkey retrieved and
      stored separately from remote-signer-pubkey
- [x] **Auth challenge handler implemented** — `onauth` callback opens URL in
      popup, BunkerSigner keeps subscription open and waits for second response
- [x] **`switch_relays` called after initial connection** — called in
      `connectFromBunkerURI` with graceful fallback
- [x] **All kind:24133 events use NIP-44** — handled automatically by
      `BunkerSigner` (NIP-04 is never used)
- [x] **Request/response matching via `id` field** — handled internally by
      `BunkerSigner`
- [x] **Session persistence implemented** — `localStorage` with client SK,
      bunker pointer (secret nulled), and user pubkey

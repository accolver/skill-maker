# NIP-46 Remote Signer (Bunker) Daemon — Complete Implementation

## Overview

This is a complete NIP-46 remote signer service (bunker daemon) in TypeScript
that:

1. **Holds a user's private key** securely on the signer side
2. **Listens for incoming signing requests** over Nostr relays via kind:24133
   events
3. **Enforces permissions** — only allows `sign_event` for kind 0 and kind 1,
   plus `nip44_encrypt` and `nip44_decrypt`
4. **Handles the connect flow** with single-use secret validation
5. **Generates a `bunker://` URI** that clients can use to connect
6. **Uses NIP-44 encryption** (version 2) for all kind:24133 transport — never
   NIP-04

## Architecture

Following the NIP-46 protocol, the architecture separates two key pairs:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Bunker Daemon                               │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │  Signer Keypair   │    │   User Keypair    │                  │
│  │  (transport key)  │    │  (identity key)   │                  │
│  │                   │    │                   │                  │
│  │  Used for:        │    │  Used for:        │                  │
│  │  - NIP-44 encrypt │    │  - Signing events │                  │
│  │  - kind:24133     │    │  - get_public_key │                  │
│  │    transport      │    │  - nip44_encrypt  │                  │
│  │  - bunker:// URI  │    │    (user ops)     │                  │
│  └──────────────────┘    └──────────────────┘                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Session Manager                         │  │
│  │  - Tracks connected clients by pubkey                     │  │
│  │  - Stores granted permissions per session                 │  │
│  │  - Enforces single-use secrets                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                                    ▲
         │  kind:24133 (NIP-44 encrypted)     │
         ▼                                    │
    ┌──────────┐                         ┌──────────┐
    │  Relay 1  │                         │  Relay 2  │
    └──────────┘                         └──────────┘
         ▲                                    ▲
         │  kind:24133 (NIP-44 encrypted)     │
         │                                    │
    ┌──────────────────────────────────────────┐
    │              Client App                   │
    │  (disposable client keypair)              │
    └──────────────────────────────────────────┘
```

**Critical distinction:** The signer pubkey (in the `bunker://` URI) is for
transport encryption only. The user pubkey (returned by `get_public_key`) is the
actual identity. Clients MUST call `get_public_key` after connecting to learn
the user's identity — they cannot assume the signer pubkey IS the user pubkey.

## Files

| File                          | Purpose                                                                     |
| ----------------------------- | --------------------------------------------------------------------------- |
| `bunker-daemon.ts`            | Core daemon implementation with all NIP-46 method handlers                  |
| `bunker-daemon-restricted.ts` | Policy-enforced wrapper that restricts permissions at the daemon level      |
| `bunker-daemon.test.ts`       | Comprehensive unit tests for permissions, protocol compliance, and security |
| `package.json`                | Dependencies and scripts                                                    |

## Implementation Details

### 1. Kind:24133 Transport with NIP-44 Encryption

All communication uses kind:24133 events with NIP-44 (version 2) encrypted
content. NIP-04 is deprecated and is **never** used.

**Incoming request handling:**

```typescript
// Decrypt incoming request from client
const conversationKey = nip44.v2.utils.getConversationKey(
  this.signerPrivkey, // Signer's transport key
  clientPubkey, // Client's pubkey (from event.pubkey)
);
const decryptedContent = nip44.v2.decrypt(event.content, conversationKey);
const request = JSON.parse(decryptedContent);
// request = { id: "...", method: "sign_event", params: [...] }
```

**Outgoing response:**

```typescript
// Encrypt response back to client
const responseJson = JSON.stringify({ id: reqId, result, error });
const conversationKey = nip44.v2.utils.getConversationKey(
  this.signerPrivkey, // Signer's transport key
  clientPubkey, // Client's pubkey
);
const encryptedContent = nip44.v2.encrypt(responseJson, conversationKey);

// Build kind:24133 event signed by SIGNER key
const responseEvent = finalizeEvent({
  kind: 24133,
  content: encryptedContent,
  tags: [["p", clientPubkey]],
  created_at: Math.floor(Date.now() / 1000),
}, this.signerPrivkey);
```

### 2. Connect Flow (Bunker-Initiated)

The daemon generates a `bunker://` URI:

```
bunker://<signer-pubkey>?relay=wss://relay.damus.io&relay=wss://relay.primal.net&secret=a1b2c3d4
```

When a client sends a `connect` request:

1. **Validate the secret** — if the bunker URI included a secret, the client
   must provide it
2. **Enforce single-use** — secrets are tracked in a `Set<string>` and rejected
   on reuse
3. **Parse permissions** — from the connect params (e.g.,
   `"sign_event:1,sign_event:0,nip44_encrypt,nip44_decrypt"`)
4. **Create session** — store the client pubkey and granted permissions
5. **Return "ack"** — or the secret value for client validation

### 3. Permission Enforcement

Permissions are parsed from the comma-separated format `method[:kind]`:

| Permission String | Meaning                                        |
| ----------------- | ---------------------------------------------- |
| `sign_event:0`    | Allow signing kind:0 events (profile metadata) |
| `sign_event:1`    | Allow signing kind:1 events (short text notes) |
| `sign_event`      | Allow signing ANY kind (bare — no restriction) |
| `nip44_encrypt`   | Allow NIP-44 encryption with user's key        |
| `nip44_decrypt`   | Allow NIP-44 decryption with user's key        |

**Enforcement rules:**

- `connect`, `ping`, `get_public_key`, `switch_relays` are **always allowed**
  regardless of permissions
- If no permissions are specified (empty array), the session is **unrestricted**
  (all methods allowed)
- `sign_event` checks the event template's `kind` field against permitted kinds
- `nip44_encrypt` / `nip44_decrypt` require explicit permission entries
- `nip04_encrypt` / `nip04_decrypt` are denied unless explicitly permitted (not
  in our policy)

**The daemon-level policy** (in `bunker-daemon-restricted.ts`) enforces a fixed
set of allowed operations regardless of what clients request:

```typescript
const DAEMON_POLICY: Permission[] = [
  { method: "sign_event", kind: 0 }, // Profile metadata
  { method: "sign_event", kind: 1 }, // Short text notes
  { method: "nip44_encrypt" }, // NIP-44 encryption
  { method: "nip44_decrypt" }, // NIP-44 decryption
];
```

If a client requests `sign_event:4` (DMs), the policy intersection filters it
out.

### 4. Method Handlers

| Method           | Params                                    | Implementation                                                                        |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `connect`        | `[remote_signer_pubkey, secret?, perms?]` | Validate secret (single-use), parse permissions, create session, return `"ack"`       |
| `get_public_key` | `[]`                                      | Return **user** pubkey (NOT signer pubkey)                                            |
| `sign_event`     | `[json_stringified_unsigned_event]`       | Parse template, add user pubkey, sign with **user** privkey, return signed event JSON |
| `ping`           | `[]`                                      | Return `"pong"`                                                                       |
| `nip44_encrypt`  | `[third_party_pubkey, plaintext]`         | Derive conversation key with **user** privkey + third party pubkey, NIP-44 encrypt    |
| `nip44_decrypt`  | `[third_party_pubkey, ciphertext]`        | Derive conversation key with **user** privkey + third party pubkey, NIP-44 decrypt    |
| `switch_relays`  | `[]`                                      | Return preferred relay list JSON or `"null"` if no change                             |

**Critical: sign_event uses the USER's private key, not the signer's transport
key.** The signed event's `pubkey` field is the user's pubkey, and the signature
is made with the user's private key. The signer's transport key is only used for
kind:24133 event encryption.

### 5. bunker:// URI Generation

```typescript
const daemon = new BunkerDaemon({
  userPrivkeyHex: "...",
  relays: ["wss://relay.damus.io", "wss://relay.primal.net"],
  secret: "my-connection-secret",
});

const uri = daemon.generateBunkerURI();
// bunker://ab12cd...?relay=wss%3A%2F%2Frelay.damus.io&relay=wss%3A%2F%2Frelay.primal.net&secret=my-connection-secret
```

The URI contains:

- The **signer** pubkey (transport key) — NOT the user pubkey
- One or more relay URLs
- An optional single-use secret

### 6. Security Considerations

| Concern                      | How It's Handled                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Key separation               | Signer keypair (transport) is separate from user keypair (identity). Events are signed with user key. |
| NIP-44 only                  | All kind:24133 content uses NIP-44 v2 encryption. NIP-04 is never used.                               |
| Single-use secrets           | Secrets are tracked in a `Set<string>` and rejected on reuse.                                         |
| Permission scoping           | Each session has explicit permissions. Unauthorized methods return error responses.                   |
| Event signature verification | All incoming events are verified before processing.                                                   |
| Session isolation            | Each client gets its own session with independent permissions.                                        |
| Graceful error handling      | All errors return proper NIP-46 error responses (not crashes).                                        |

## Usage

### Running the Daemon

```bash
# Set the user's private key (the key being protected)
export USER_PRIVKEY_HEX="your-64-char-hex-private-key"

# Set relay URLs
export RELAYS="wss://relay.damus.io,wss://relay.primal.net"

# Optional: set a connection secret
export SECRET="my-secret-123"

# Start the daemon
bun run bunker-daemon.ts
```

Output:

```
========================================
  NIP-46 Bunker Daemon Running
========================================

  User pubkey:   <user-hex-pubkey>
  Signer pubkey: <signer-hex-pubkey>
  Relays:        wss://relay.damus.io, wss://relay.primal.net

  bunker:// URI (share with clients):

  bunker://<signer-pubkey>?relay=wss%3A%2F%2Frelay.damus.io&relay=wss%3A%2F%2Frelay.primal.net&secret=my-secret-123

========================================
```

### Connecting from a Client

Using `@nostr/tools`:

```typescript
import { generateSecretKey, getPublicKey } from "@nostr/tools/pure";
import { BunkerSigner, parseBunkerInput } from "@nostr/tools/nip46";
import { SimplePool } from "@nostr/tools/pool";

// 1. Parse the bunker URI from the daemon
const bp = await parseBunkerInput(
  "bunker://ab12...?relay=wss://relay.damus.io&secret=my-secret-123",
);

// 2. Generate a disposable client keypair
const clientSk = generateSecretKey();

// 3. Connect
const pool = new SimplePool();
const bunker = BunkerSigner.fromBunker(clientSk, bp!, { pool });
await bunker.connect();

// 4. CRITICAL: Get the actual user pubkey (may differ from signer pubkey)
const userPubkey = await bunker.getPublicKey();

// 5. Request relay switch
await bunker.switchRelays();

// 6. Sign a kind:1 event (allowed by policy)
const signed = await bunker.signEvent({
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [],
  content: "Hello from bunker-connected app!",
});

// 7. This would be DENIED by the daemon's policy:
// await bunker.signEvent({ kind: 4, ... }); // Permission denied!
```

### Running Tests

```bash
bun test
```

## Protocol Compliance Checklist

- [x] **Signer role** — implements all required NIP-46 signer methods
- [x] **kind:24133** — all transport events use kind 24133
- [x] **NIP-44 encryption** — content encrypted with NIP-44 v2 (NOT NIP-04)
- [x] **Separate keys** — signer keypair (transport) vs user keypair (identity)
- [x] **`get_public_key` returns user pubkey** — not signer pubkey
- [x] **`sign_event` uses user privkey** — not signer privkey
- [x] **Permission enforcement** — per-session, kind-level granularity
- [x] **Single-use secrets** — tracked and rejected on reuse
- [x] **`bunker://` URI generation** — correct format with signer pubkey,
      relays, secret
- [x] **Request/response matching** — via `id` field in JSON-RPC messages
- [x] **`switch_relays` support** — returns preferred relay list
- [x] **Error responses** — proper `{ id, result: null, error: "..." }` format
- [x] **Event signature verification** — validates incoming events before
      processing
- [x] **`connect` handler** — validates secret, parses permissions, creates
      session
- [x] **`ping` handler** — returns `"pong"`
- [x] **`nip44_encrypt` / `nip44_decrypt`** — uses user privkey for conversation
      key derivation

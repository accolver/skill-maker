---
name: nostr-bunker-integration
description: Guide implementation of NIP-46 Nostr remote signing (bunker) integration for both client and server sides. Covers bunker:// and nostrconnect:// connection flows, kind:24133 request/response protocol, NIP-44 encrypted transport, auth challenges, relay switching, permissions, and NIP-89 signer discovery. Use when building a Nostr app that connects to a remote signer, implementing a bunker/remote signer daemon, integrating NIP-46 signing into an existing Nostr client, handling bunker connection URIs, or debugging remote signing failures.
---

# Nostr Bunker Integration

## Overview

Implement NIP-46 remote signing correctly for both client applications and
bunker (remote signer) servers. NIP-46 keeps private keys on a dedicated signer
while clients communicate signing requests over Nostr relays using NIP-44
encrypted kind:24133 events. This skill covers connection establishment, the
JSON-RPC-like request/response protocol, auth challenges, relay switching,
permissions, signer discovery via NIP-89, and SDK-specific implementation
patterns.

## When to Use

- Building a Nostr client that connects to a remote signer (bunker)
- Implementing a bunker / remote signer daemon or service
- Parsing or generating `bunker://` or `nostrconnect://` connection URIs
- Adding NIP-46 signer support alongside NIP-07 browser extension signing
- Debugging remote signing failures (timeouts, auth challenges, wrong pubkeys)
- Implementing permission-scoped signing (e.g., only allow `sign_event:1`)
- Discovering available bunker providers via NIP-89

**Do NOT use when:**

- Implementing NIP-44 encryption directly (use nostr-crypto-guide)
- Building NIP-07 browser extension signers (different protocol)
- Working with NIP-55 Android signer apps (different transport)
- General Nostr event construction without remote signing needs

## Workflow

### 1. Determine Your Role

| You are building...          | Role   | Start at        |
| ---------------------------- | ------ | --------------- |
| An app that needs signatures | Client | Step 2 (Client) |
| A signing service/daemon     | Signer | Step 3 (Signer) |
| Both sides                   | Both   | Steps 2 and 3   |

### 2. Client-Side Implementation

#### 2a. Choose Connection Flow

There are two connection flows. Pick based on UX needs:

**Flow A — Bunker-initiated (`bunker://`):**

The signer provides a `bunker://` URI. User pastes it into the client.

```
bunker://<remote-signer-pubkey>?relay=wss://relay1.example.com&relay=wss://relay2.example.com&secret=<optional-secret>
```

Steps:

1. Parse the URI to extract `remote-signer-pubkey`, relay URLs, and optional
   secret
2. Generate a disposable `client-keypair` (persist for session, delete on
   logout)
3. Send a `connect` request to the signer via the specified relays
4. If secret was provided, signer validates it (single-use only)
5. Call `get_public_key` to learn the user's actual pubkey

**Flow B — Client-initiated (`nostrconnect://`):**

The client generates a URI. User scans it with the signer (e.g., QR code).

```
nostrconnect://<client-pubkey>?relay=wss://relay1.example.com&secret=<required>&name=My+App&perms=sign_event:1,nip44_encrypt
```

Steps:

1. Generate a `client-keypair`
2. Build the `nostrconnect://` URI with client pubkey, relays, secret, name, and
   optional permissions
3. Display URI to user (QR code or copy/paste)
4. Subscribe to kind:24133 events on specified relays, filtering for `p`-tag =
   client pubkey
5. Signer sends a `connect` response; client discovers `remote-signer-pubkey`
   from the response author
6. Validate the returned secret matches the one in the URI
7. Call `get_public_key` to learn the user's actual pubkey

#### 2b. Send Requests

All requests are kind:24133 events with NIP-44 encrypted content:

```json
{
  "kind": 24133,
  "pubkey": "<client_pubkey>",
  "content": "<nip44_encrypt({id, method, params}, client_privkey, remote_signer_pubkey)>",
  "tags": [["p", "<remote_signer_pubkey>"]]
}
```

The encrypted content is a JSON-RPC-like message:

```json
{
  "id": "<random_request_id>",
  "method": "sign_event",
  "params": ["<json_stringified_unsigned_event>"]
}
```

#### 2c. Handle Responses

Subscribe for kind:24133 events where `p`-tag = client pubkey:

```json
{
  "id": "<matching_request_id>",
  "result": "<result_string>",
  "error": "<optional_error_string>"
}
```

Match responses to requests via the `id` field. If `error` is present, the
request failed.

#### 2d. Handle Auth Challenges

If the signer needs additional user authentication, it returns:

```json
{
  "id": "<request_id>",
  "result": "auth_url",
  "error": "<URL_to_display_to_user>"
}
```

The client MUST:

1. Open the URL from `error` field in a popup or new tab
2. Keep the subscription open with the same request ID
3. Wait for a second response after the user authenticates
4. The second response contains the actual result

#### 2e. Implement Relay Switching

After connecting, immediately send a `switch_relays` request. The signer
controls which relays are used. If the signer returns an updated relay list, the
client MUST update its local state and send further requests on the new relays.

```json
{ "id": "...", "method": "switch_relays", "params": [] }
```

Response: `["wss://new-relay1.com", "wss://new-relay2.com"]` or `null` (no
change needed).

### 3. Signer (Bunker) Server Implementation

#### 3a. Core Architecture

The signer holds private keys and responds to client requests:

```
Client App  <--kind:24133 (NIP-44 encrypted)--> Remote Signer (holds privkeys)
                     via Nostr relays
```

Key responsibilities:

- Generate or hold `remote-signer-keypair` (may differ from user keypair)
- Hold `user-keypair` (the actual identity keys)
- Listen for kind:24133 events tagged to `remote-signer-pubkey`
- Decrypt requests with NIP-44, execute methods, encrypt responses

#### 3b. Connection Handling

**For bunker-initiated connections:**

1. Generate a `bunker://` URI with your signer pubkey, relay URLs, and optional
   single-use secret
2. When you receive a `connect` request, validate the secret if provided
3. Respond with `"ack"` (or the required secret for client-initiated flow)
4. Track the `client-pubkey` for future request routing

**For client-initiated connections:**

1. Parse the `nostrconnect://` URI to extract client pubkey, relays, secret, and
   permissions
2. Send a `connect` response event containing the secret as `result`
3. The response author reveals your `remote-signer-pubkey` to the client

#### 3c. Implement Request Handlers

| Method           | Params                                               | Implementation                                    |
| ---------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `connect`        | `[remote_signer_pubkey, secret?, perms?]`            | Validate secret, store client session, return ack |
| `sign_event`     | `[json_stringified({kind,content,tags,created_at})]` | Sign with user privkey, return signed event JSON  |
| `ping`           | `[]`                                                 | Return `"pong"`                                   |
| `get_public_key` | `[]`                                                 | Return user pubkey (NOT signer pubkey)            |
| `nip04_encrypt`  | `[third_party_pubkey, plaintext]`                    | NIP-04 encrypt with user privkey                  |
| `nip04_decrypt`  | `[third_party_pubkey, ciphertext]`                   | NIP-04 decrypt with user privkey                  |
| `nip44_encrypt`  | `[third_party_pubkey, plaintext]`                    | NIP-44 encrypt with user privkey                  |
| `nip44_decrypt`  | `[third_party_pubkey, ciphertext]`                   | NIP-44 decrypt with user privkey                  |
| `switch_relays`  | `[]`                                                 | Return updated relay list or `null`               |

#### 3d. Permission Enforcement

Parse requested permissions from `connect` params or `nostrconnect://` URI.
Format: comma-separated `method[:params]`.

Examples:

- `sign_event` — allow signing any kind
- `sign_event:1` — only allow signing kind:1
- `nip44_encrypt,nip44_decrypt` — allow NIP-44 operations
- `sign_event:1,sign_event:4,nip44_encrypt` — specific subset

The signer SHOULD:

- Store granted permissions per client session
- Reject requests outside granted permissions with an error response
- Optionally prompt the user for approval of ungranated permissions

#### 3e. Auth Challenge Flow

When user approval is needed (e.g., for ungranted permissions):

1. Generate a one-time auth URL
2. Return `{ "id": "<req_id>", "result": "auth_url", "error": "<auth_url>" }`
3. Wait for the user to authenticate at the URL
4. After authentication, send the actual response with the same request ID

#### 3f. Announce via NIP-89

Publish signer metadata for client discovery:

**NIP-05 (optional):**

```json
// GET <signer-domain>/.well-known/nostr.json?name=_
{
  "names": { "_": "<remote-signer-app-pubkey>" },
  "nip46": {
    "relays": ["wss://relay1.com", "wss://relay2.com"],
    "nostrconnect_url": "https://signer-domain.example/<nostrconnect>"
  }
}
```

**NIP-89 kind:31990 event:**

```json
{
  "kind": 31990,
  "tags": [
    ["d", "<random-id>"],
    ["k", "24133"],
    ["relay", "wss://relay1.com"],
    ["relay", "wss://relay2.com"],
    ["nostrconnect_url", "https://signer-domain.example/<nostrconnect>"]
  ],
  "content": "{\"name\":\"My Bunker\",\"picture\":\"...\",\"about\":\"...\"}"
}
```

### 4. SDK Selection

Choose based on your runtime. See
[references/sdk-reference.md](references/sdk-reference.md) for complete code
examples.

| Runtime       | SDK                  | Client Support | Signer Support | Notes                                       |
| ------------- | -------------------- | -------------- | -------------- | ------------------------------------------- |
| TypeScript/JS | `@nostr/tools`       | Full           | Partial        | `BunkerSigner` class, both connection flows |
| TypeScript/JS | `@nostr-dev-kit/ndk` | Full           | No             | `NDKNip46Signer`, higher-level abstraction  |
| Rust          | `nostr-connect`      | Full           | Full           | Part of rust-nostr, alpha but functional    |
| Dart/Flutter  | `dart-nostr-sdk`     | Full           | No             | NDK port with NIP-46 support                |

### 5. Test the Connection

Use the bundled connection tester to validate bunker URLs and generate
nostrconnect URIs:

```bash
bun run scripts/bunker-url-tools.ts parse "bunker://ab12...?relay=wss://relay.example.com&secret=mysecret"
bun run scripts/bunker-url-tools.ts generate-nostrconnect --relays wss://relay.example.com --name "My App"
bun run scripts/bunker-url-tools.ts --help
```

## Checklist

- [ ] Determined role (client, signer, or both)
- [ ] Client: connection flow chosen (bunker:// or nostrconnect://)
- [ ] Client: disposable client-keypair generated and persisted per session
- [ ] Client: `get_public_key` called after connect (user-pubkey !=
      remote-signer-pubkey)
- [ ] Client: auth challenge handler implemented (open URL, wait for second
      response)
- [ ] Client: `switch_relays` called after initial connection
- [ ] Signer: request handlers for all required methods
- [ ] Signer: permission enforcement per client session
- [ ] Signer: NIP-44 encryption for all kind:24133 content
- [ ] All kind:24133 events use NIP-44 (NOT NIP-04) for content encryption
- [ ] Request/response matching via `id` field
- [ ] Connection URIs validated with bundled script

## Example

**Complete client connection using `@nostr/tools`:**

Input: User pastes a `bunker://` URI into the app.

```typescript
import { generateSecretKey, getPublicKey } from "@nostr/tools/pure";
import { BunkerSigner, parseBunkerInput } from "@nostr/tools/nip46";
import { SimplePool } from "@nostr/tools/pool";

async function connectToBunker(bunkerUri: string) {
  // 1. Parse the bunker URI
  const bp = await parseBunkerInput(bunkerUri);
  if (!bp) throw new Error("Invalid bunker URI");

  // 2. Generate client keypair (persist this for the session)
  const clientSk = generateSecretKey();

  // 3. Create the signer and connect
  const pool = new SimplePool();
  const bunker = BunkerSigner.fromBunker(clientSk, bp, {
    pool,
    onauth: (url: string) => {
      // Handle auth challenge - open URL for user
      window.open(url, "_blank", "width=600,height=400");
    },
  });
  await bunker.connect();

  // 4. CRITICAL: get the actual user pubkey (may differ from signer pubkey)
  const userPubkey = await bunker.getPublicKey();
  console.log("Connected as:", userPubkey);

  // 5. Request relay switch
  await bunker.switchRelays();

  // 6. Sign an event
  const signedEvent = await bunker.signEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: "Hello from my bunker-connected app!",
  });

  // 7. Cleanup
  await bunker.close();
  pool.close([]);

  return signedEvent;
}
```

**Complete client-initiated connection (nostrconnect://):**

```typescript
import { generateSecretKey, getPublicKey } from "@nostr/tools/pure";
import { BunkerSigner, createNostrConnectURI } from "@nostr/tools/nip46";
import { SimplePool } from "@nostr/tools/pool";

async function initiateConnection() {
  const clientSk = generateSecretKey();
  const clientPubkey = getPublicKey(clientSk);

  // 1. Generate connection URI for the signer to scan
  const secret = crypto.randomUUID();
  const uri = createNostrConnectURI({
    clientPubkey,
    relays: ["wss://relay.damus.io", "wss://relay.primal.net"],
    secret,
    name: "My Nostr App",
    perms: ["sign_event:1", "sign_event:0", "nip44_encrypt", "nip44_decrypt"],
  });

  // 2. Display URI as QR code or copyable text
  console.log("Scan this with your signer:", uri);

  // 3. Wait for signer to connect (blocks until connection established)
  const pool = new SimplePool();
  const signer = await BunkerSigner.fromURI(clientSk, uri, { pool });

  // Already connected - no need to call .connect()
  const userPubkey = await signer.getPublicKey();
  return { signer, userPubkey };
}
```

## Common Mistakes

| Mistake                                                    | Fix                                                                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Using `remote-signer-pubkey` as the user's identity        | Always call `get_public_key` after connecting. The signer pubkey is for transport encryption only; the user's pubkey may be different. |
| Using NIP-04 for kind:24133 content encryption             | NIP-46 requires NIP-44 encryption. NIP-04 is deprecated and insecure.                                                                  |
| Not handling auth challenges                               | Implement the auth_url flow: open URL, keep subscription, wait for second response with same request ID.                               |
| Reusing the bunker secret after successful connection      | Secrets are single-use. The signer SHOULD reject reuse. Generate fresh secrets for each connection attempt.                            |
| Not calling `switch_relays` after connection               | The signer controls relay selection. Call `switch_relays` immediately after connecting and update local relay state.                   |
| Skipping secret validation in nostrconnect:// flow         | Client MUST validate that the secret in the connect response matches the one it sent. Without this, connections can be spoofed.        |
| Not persisting client keypair across sessions              | Store the client secret key locally for reconnection. Generating a new one each time forces re-authorization.                          |
| Confusing `connect` request vs response                    | In bunker:// flow, client sends `connect` request. In nostrconnect:// flow, signer sends `connect` response.                           |
| Not implementing permission scoping on signer              | Parse and enforce permissions from connect params. Reject unauthorized method calls with error responses.                              |
| Signing events with signer keypair instead of user keypair | The signer signs with the user's private key, not the signer's transport key.                                                          |

## Quick Reference

| Component                         | Value                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| Event kind                        | `24133`                                                                               |
| Content encryption                | NIP-44 (version 2)                                                                    |
| Connection URI (signer-initiated) | `bunker://<remote-signer-pubkey>?relay=<url>&secret=<optional>`                       |
| Connection URI (client-initiated) | `nostrconnect://<client-pubkey>?relay=<url>&secret=<required>&name=<app>&perms=<csv>` |
| Request format                    | `{ "id": "<random>", "method": "<name>", "params": ["<arg>", ...] }`                  |
| Response format                   | `{ "id": "<request_id>", "result": "<value>", "error": "<optional>" }`                |
| Auth challenge result             | `"auth_url"` (URL in error field)                                                     |
| Signer discovery                  | NIP-89 kind:31990 with `k` tag of `24133`                                             |
| Permission format                 | `method[:param]` comma-separated (e.g., `sign_event:1,nip44_encrypt`)                 |

## Key Principles

1. **Keys are separate** — `remote-signer-pubkey` (transport encryption) and
   `user-pubkey` (identity/signing) may be different keys. The signer controls
   both. Always call `get_public_key` to learn the user's identity.

2. **Signer controls relays** — The remote signer decides which relays to use.
   Clients must implement `switch_relays` and comply with relay changes. This
   ensures the signer can migrate away from unreliable relays.

3. **Secrets are single-use** — Connection secrets prevent spoofing and replay.
   In `bunker://` flow they are optional but recommended. In `nostrconnect://`
   flow they are required. Never accept a connection with a previously used
   secret.

4. **NIP-44 only** — All kind:24133 content MUST be encrypted with NIP-44
   (version 2). NIP-04 is deprecated and must not be used for remote signing
   transport.

5. **Auth challenges are async** — When a signer needs user approval, it returns
   an `auth_url` response. The client must handle this asynchronously: display
   the URL, keep the subscription open, and wait for the real response on the
   same request ID.

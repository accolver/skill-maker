# NIP-46 SDK Reference

Complete code examples for integrating NIP-46 remote signing across supported
SDKs.

## TypeScript/JavaScript: @nostr/tools (nostr-tools)

The primary low-level library. Provides `BunkerSigner` class with both
connection flows.

**Install:** `npm install @nostr/tools` (or `npx jsr add @nostr/tools`)

### BunkerSigner API

```typescript
import { generateSecretKey, getPublicKey } from "@nostr/tools/pure";
import {
  type BunkerPointer,
  BunkerSigner,
  type BunkerSignerParams,
  createNostrConnectURI,
  fetchBunkerProviders,
  type NostrConnectParams,
  parseBunkerInput,
  toBunkerURL,
} from "@nostr/tools/nip46";
import { SimplePool } from "@nostr/tools/pool";
```

### Types

```typescript
type BunkerPointer = {
  relays: string[];
  pubkey: string; // remote-signer-pubkey (hex)
  secret: string | null;
};

type BunkerSignerParams = {
  pool?: AbstractSimplePool;
  onauth?: (url: string) => void; // Called when signer sends auth challenge
};

type NostrConnectParams = {
  clientPubkey: string; // hex
  relays: string[];
  secret: string; // required for nostrconnect://
  perms?: string[]; // e.g., ['sign_event:1', 'nip44_encrypt']
  name?: string; // app name
  url?: string; // app URL
  image?: string; // app icon URL
};
```

### Factory Methods

**`BunkerSigner.fromBunker()`** — Bunker-initiated flow:

```typescript
const bp = await parseBunkerInput(
  "bunker://abcd...?relay=wss://relay.example.com",
);
const bunker = BunkerSigner.fromBunker(clientSecretKey, bp!, { pool });
await bunker.connect(); // Required for first connection
```

**`BunkerSigner.fromURI()`** — Client-initiated flow:

```typescript
const uri = createNostrConnectURI({
  clientPubkey: getPublicKey(clientSecretKey),
  relays: ["wss://relay.example.com"],
  secret: crypto.randomUUID(),
  name: "My App",
});
// This blocks until signer connects - already connected when it resolves
const signer = await BunkerSigner.fromURI(clientSecretKey, uri, { pool });
```

### Instance Methods

```typescript
// Core signing
const pubkey = await bunker.getPublicKey(); // Returns user-pubkey (hex)
const signed = await bunker.signEvent(eventTemplate); // Returns VerifiedEvent

// Encryption/Decryption
const ct = await bunker.nip44Encrypt(thirdPartyPub, plaintext);
const pt = await bunker.nip44Decrypt(thirdPartyPub, ciphertext);
const ct04 = await bunker.nip04Encrypt(thirdPartyPub, plaintext);
const pt04 = await bunker.nip04Decrypt(thirdPartyPub, ciphertext);

// Connection management
await bunker.connect(); // Establish connection (bunker:// flow only)
await bunker.ping(); // Health check, rejects if not "pong"
const changed = await bunker.switchRelays(); // Request relay update from signer
await bunker.close(); // Cleanup subscription

// Low-level
const result = await bunker.sendRequest("method_name", ["param1", "param2"]);
```

### Helper Functions

```typescript
// Parse bunker:// URI or NIP-05 identifier
const bp: BunkerPointer | null = await parseBunkerInput("bunker://...");
const bp2: BunkerPointer | null = await parseBunkerInput("user@domain.com");

// Generate bunker:// URL from pointer
const url: string = toBunkerURL({
  pubkey: "...",
  relays: ["wss://..."],
  secret: null,
});

// Discover bunker providers via NIP-89
const providers: BunkerProfile[] = await fetchBunkerProviders(pool, relays);

// Create account on a bunker provider
const signer = await createAccount(
  bunkerProfile,
  params,
  "username",
  "domain.com",
);
```

### Reconnection Pattern

```typescript
// First connection: call connect()
const bp = await parseBunkerInput(bunkerUri);
const bunker = BunkerSigner.fromBunker(clientSk, bp!, { pool });
await bunker.connect();

// Store bp for reconnection
localStorage.setItem("bunker_pointer", JSON.stringify(bp));
localStorage.setItem("client_sk", bytesToHex(clientSk));

// Subsequent sessions: skip connect()
const storedBp = JSON.parse(localStorage.getItem("bunker_pointer")!);
const storedSk = hexToBytes(localStorage.getItem("client_sk")!);
const bunker = BunkerSigner.fromBunker(storedSk, storedBp, { pool });
// Ready to use immediately - no connect() needed
```

---

## TypeScript/JavaScript: NDK (@nostr-dev-kit/ndk)

Higher-level abstraction. Better for apps that already use NDK.

**Install:** `npm install @nostr-dev-kit/ndk`

### NDKNip46Signer

```typescript
import NDK, { NDKNip46Signer, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";

// The local signer handles transport encryption
const localSigner = NDKPrivateKeySigner.generate();

const ndk = new NDK({
  explicitRelayUrls: ["wss://relay.damus.io"],
});
await ndk.connect();

// Connect to bunker using bunker:// URI or remote signer pubkey
const bunkerSigner = new NDKNip46Signer(
  ndk,
  "bunker://...or-remote-pubkey",
  localSigner,
);
await bunkerSigner.blockUntilReady();

// Set as NDK's active signer
ndk.signer = bunkerSigner;

// Now events automatically use remote signing
const event = new NDKEvent(ndk, {
  kind: 1,
  content: "Hello from NDK + bunker!",
});
await event.publish(); // Signs via bunker automatically
```

### NDK nostrconnect:// Flow

```typescript
const localSigner = NDKPrivateKeySigner.generate();
const ndk = new NDK({ explicitRelayUrls: ["wss://relay.damus.io"] });
await ndk.connect();

// Create signer with nostrconnect flow
const bunkerSigner = new NDKNip46Signer(ndk, undefined, localSigner);

// Get the nostrconnect:// URI to display
const uri = await bunkerSigner.createNostrConnectURI({
  name: "My App",
  perms: "sign_event:1,nip44_encrypt",
});
console.log("Scan this URI:", uri);

// Wait for connection
await bunkerSigner.blockUntilReady();
ndk.signer = bunkerSigner;
```

---

## Rust: rust-nostr (nostr-connect crate)

**Add to Cargo.toml:**

```toml
[dependencies]
nostr = "0.44"
nostr-connect = "0.44"
nostr-relay-pool = "0.44"
tokio = { version = "1", features = ["full"] }
```

### Client-Side (Connecting to a Bunker)

```rust
use nostr::prelude::*;
use nostr_connect::prelude::*;

#[tokio::main]
async fn main() -> Result<()> {
    // Parse bunker URI
    let uri = NostrConnectURI::parse("bunker://abcd...?relay=wss://relay.example.com")?;

    // Create the Nostr Connect signer
    let app_keys = Keys::generate();
    let signer = NostrConnect::new(uri, app_keys, Duration::from_secs(60), None)?;

    // Get the user's public key
    let user_pubkey = signer.get_public_key().await?;
    println!("Connected as: {}", user_pubkey.to_bech32()?);

    // Sign an event
    let unsigned = EventBuilder::text_note("Hello from rust bunker client!")
        .build(user_pubkey);
    let signed = signer.sign_event(unsigned).await?;

    // Encrypt/decrypt
    let ciphertext = signer.nip44_encrypt(third_party_pubkey, "secret message").await?;
    let plaintext = signer.nip44_decrypt(third_party_pubkey, &ciphertext).await?;

    Ok(())
}
```

### Signer-Side (Running a Bunker)

```rust
use nostr::prelude::*;
use nostr_connect::prelude::*;

#[tokio::main]
async fn main() -> Result<()> {
    let user_keys = Keys::parse("nsec1...")?;
    let signer_keys = Keys::generate(); // Or use user_keys if same

    // Create bunker signer that listens for requests
    let opts = NostrConnectSignerOptions::default()
        .relays(vec!["wss://relay.example.com"]);
    let bunker = NostrConnectSigner::new(user_keys, signer_keys, opts).await?;

    // Generate bunker:// URI for clients
    let bunker_uri = bunker.bunker_uri();
    println!("Share this with clients: {}", bunker_uri);

    // Listen for and handle requests (blocks)
    bunker.serve(|req| async move {
        match req.method() {
            "sign_event" => {
                // Approve or reject signing requests
                true // approve
            }
            _ => true
        }
    }).await?;

    Ok(())
}
```

---

## Building a Custom Signer (Protocol-Level)

If no SDK covers your needs, implement the protocol directly:

### Request Handling Loop

```typescript
// Pseudocode for a custom NIP-46 signer
import { finalizeEvent, getPublicKey, nip44 } from "@nostr/tools";

const signerKeys = { privkey, pubkey }; // Transport keys
const userKeys = { privkey, pubkey }; // User identity keys
const sessions = new Map<string, { perms: string[] }>();

// Subscribe to incoming requests
pool.subscribe(relays, [{ kinds: [24133], "#p": [signerKeys.pubkey] }], {
  onevent(event) {
    // 1. Validate event signature
    if (!verifyEvent(event)) return;

    // 2. Decrypt content
    const convKey = nip44.getConversationKey(signerKeys.privkey, event.pubkey);
    const decrypted = nip44.decrypt(event.content, convKey);
    const request = JSON.parse(decrypted);

    // 3. Check permissions
    const session = sessions.get(event.pubkey);
    if (!isPermitted(session, request.method, request.params)) {
      sendResponse(event.pubkey, request.id, null, "Permission denied");
      return;
    }

    // 4. Handle method
    let result: string;
    switch (request.method) {
      case "connect":
        sessions.set(event.pubkey, { perms: parsePerms(request.params[2]) });
        result = request.params[1] || "ack"; // Return secret if provided
        break;
      case "get_public_key":
        result = userKeys.pubkey;
        break;
      case "sign_event":
        const template = JSON.parse(request.params[0]);
        const signed = finalizeEvent(
          { ...template, pubkey: userKeys.pubkey },
          userKeys.privkey,
        );
        result = JSON.stringify(signed);
        break;
      case "ping":
        result = "pong";
        break;
        // ... handle nip44_encrypt, nip44_decrypt, switch_relays
    }

    // 5. Send response
    sendResponse(event.pubkey, request.id, result);
  },
});

function sendResponse(
  clientPubkey: string,
  reqId: string,
  result: string | null,
  error?: string,
) {
  const response = JSON.stringify({ id: reqId, result, error });
  const convKey = nip44.getConversationKey(signerKeys.privkey, clientPubkey);
  const encrypted = nip44.encrypt(response, convKey);

  const event = finalizeEvent({
    kind: 24133,
    content: encrypted,
    tags: [["p", clientPubkey]],
    created_at: Math.floor(Date.now() / 1000),
  }, signerKeys.privkey);

  pool.publish(relays, event);
}
```

---

## SDK Comparison

| Feature                     | @nostr/tools            | NDK                     | rust-nostr           |
| --------------------------- | ----------------------- | ----------------------- | -------------------- |
| bunker:// parsing           | `parseBunkerInput`      | Built-in                | `NostrConnectURI`    |
| nostrconnect:// generation  | `createNostrConnectURI` | `createNostrConnectURI` | Built-in             |
| Auth challenge handling     | `onauth` callback       | Event-based             | Callback             |
| Relay switching             | `switchRelays()`        | Automatic               | Built-in             |
| Provider discovery (NIP-89) | `fetchBunkerProviders`  | Built-in                | Manual               |
| Account creation            | `createAccount`         | Not built-in            | Not built-in         |
| Signer-side support         | Manual                  | Not supported           | `NostrConnectSigner` |
| Session persistence         | Manual (store BP)       | Built-in                | Manual               |

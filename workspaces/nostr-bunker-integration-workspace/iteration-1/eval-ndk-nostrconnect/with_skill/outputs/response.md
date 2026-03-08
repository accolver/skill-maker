# NIP-46 Remote Signing with NDK: nostrconnect:// QR Code Flow

## Overview

NIP-46 (Nostr Remote Signing) lets your app request signatures from a remote
signer (bunker) without ever touching the user's private key. Communication
happens over Nostr relays using kind:24133 events encrypted with NIP-44.

You want the **client-initiated (`nostrconnect://`) flow**: your app generates a
URI, the user scans it with their signer app (e.g., Amber, nsecBunker), and the
signer connects back to your app. This is ideal for QR-code-based UX.

### Key Concepts Before We Start

| Concept                | What It Is                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `client-keypair`       | Disposable keypair your app generates for transport encryption. Persist per session, delete on logout.    |
| `remote-signer-pubkey` | The signer's transport key. Used for encrypting kind:24133 messages. **NOT the user's identity.**         |
| `user-pubkey`          | The user's actual Nostr identity. You learn this by calling `get_public_key` after connecting.            |
| `secret`               | A single-use random string in the `nostrconnect://` URI. The signer returns it to prove the connection.   |
| kind:24133             | The event kind used for all NIP-46 request/response messages. Content is NIP-44 encrypted (never NIP-04). |

---

## Step 1: Install Dependencies

```bash
npm install @nostr-dev-kit/ndk
# For QR code rendering:
npm install qrcode        # Node.js / server-side
# or
npm install qrcode.react  # React
```

---

## Step 2: Full Implementation

```typescript
import NDK, {
  NDKEvent,
  NDKNip46Signer,
  NDKPrivateKeySigner,
} from "@nostr-dev-kit/ndk";

/**
 * Complete NIP-46 nostrconnect:// flow using NDK.
 *
 * Architecture:
 *   Your App (client) <--kind:24133 (NIP-44 encrypted)--> Remote Signer (holds privkeys)
 *                              via Nostr relays
 */

// ============================================================
// 1. GENERATE CLIENT KEYPAIR
// ============================================================
// This is a disposable keypair used for transport encryption.
// Persist it for the session so reconnection doesn't require
// re-authorization. Delete on logout.
const localSigner = NDKPrivateKeySigner.generate();

// ============================================================
// 2. INITIALIZE NDK WITH RELAY(S)
// ============================================================
// These relays are where the initial connection handshake happens.
// The signer may switch to different relays after connecting
// (see switch_relays section below).
const ndk = new NDK({
  explicitRelayUrls: [
    "wss://relay.damus.io",
    "wss://relay.primal.net",
  ],
});
await ndk.connect();

// ============================================================
// 3. CREATE THE NIP-46 SIGNER (nostrconnect:// flow)
// ============================================================
// Pass `undefined` as the second argument to signal client-initiated flow.
// If you were using bunker:// flow, you'd pass the bunker URI or
// remote-signer-pubkey there instead.
const bunkerSigner = new NDKNip46Signer(ndk, undefined, localSigner);

// ============================================================
// 4. GENERATE THE nostrconnect:// URI
// ============================================================
// This URI contains:
//   - Your client pubkey (so the signer knows who to respond to)
//   - Relay URLs (where the signer should send its connect response)
//   - A secret (single-use, prevents connection spoofing)
//   - App name (displayed to user in the signer app)
//   - Requested permissions (optional but recommended)
const nostrconnectURI = await bunkerSigner.createNostrConnectURI({
  name: "My Nostr App",
  perms: "sign_event:1,sign_event:0,nip44_encrypt,nip44_decrypt",
});

// The URI looks like:
// nostrconnect://<client-pubkey>?relay=wss%3A%2F%2Frelay.damus.io
//   &relay=wss%3A%2F%2Frelay.primal.net&secret=<random>&name=My+Nostr+App
//   &perms=sign_event%3A1%2Csign_event%3A0%2Cnip44_encrypt%2Cnip44_decrypt

console.log("nostrconnect:// URI:", nostrconnectURI);

// ============================================================
// 5. DISPLAY QR CODE TO USER
// ============================================================
// The user scans this with their signer app (Amber, nsecBunker, etc.)
// See the QR code section below for rendering examples.

// ============================================================
// 6. WAIT FOR SIGNER TO CONNECT
// ============================================================
// blockUntilReady() subscribes to kind:24133 events on the specified
// relays, filtering for p-tag = client pubkey. When the signer scans
// the QR code, it sends a connect response. This call blocks until
// that response arrives.
//
// Under the hood:
//   - Signer parses the nostrconnect:// URI
//   - Signer sends a kind:24133 event with the secret as result
//   - NDK validates the secret matches what was in the URI
//   - NDK discovers remote-signer-pubkey from the response author
//   - NDK calls get_public_key to learn the user's actual pubkey
try {
  await bunkerSigner.blockUntilReady();
} catch (err) {
  console.error("Connection failed or timed out:", err);
  throw err;
}

// ============================================================
// 7. SET AS NDK'S ACTIVE SIGNER
// ============================================================
// From this point on, all NDK operations that need signing will
// automatically route through the remote signer.
ndk.signer = bunkerSigner;

// ============================================================
// 8. GET THE USER'S PUBLIC KEY
// ============================================================
// CRITICAL: The remote-signer-pubkey is NOT the user's identity.
// The signer may use a separate transport keypair. Always call
// getPublicKey() to learn the user's actual pubkey.
const userPubkey = await bunkerSigner.getPublicKey();
console.log("Connected as user:", userPubkey);

// ============================================================
// 9. SIGN AND PUBLISH EVENTS
// ============================================================
// NDK handles the NIP-46 protocol transparently. When you call
// event.publish(), NDK:
//   1. Creates a kind:24133 request with method "sign_event"
//   2. NIP-44 encrypts it to the remote-signer-pubkey
//   3. Sends it via the active relays
//   4. Waits for the kind:24133 response
//   5. Decrypts and extracts the signed event
//   6. Publishes the signed event to relays
const event = new NDKEvent(ndk, {
  kind: 1,
  content: "Hello from my bunker-connected app!",
});
await event.publish();
console.log("Published event:", event.id);

// ============================================================
// 10. ENCRYPTION/DECRYPTION VIA REMOTE SIGNER
// ============================================================
// The signer can also perform NIP-44 encryption/decryption using
// the user's private key, without exposing it to your app.
const thirdPartyPubkey = "abcd1234..."; // hex pubkey of recipient
const ciphertext = await bunkerSigner.encrypt(
  thirdPartyPubkey,
  "Secret message",
);
const plaintext = await bunkerSigner.decrypt(
  thirdPartyPubkey,
  ciphertext,
);
```

---

## Step 3: QR Code Rendering

### React (using qrcode.react)

```tsx
import { QRCodeSVG } from "qrcode.react";

interface BunkerQRCodeProps {
  uri: string;
  size?: number;
}

function BunkerQRCode({ uri, size = 256 }: BunkerQRCodeProps) {
  return (
    <div>
      <QRCodeSVG
        value={uri}
        size={size}
        level="M" // Medium error correction - good balance for URIs
      />
      <p>Scan with your Nostr signer app</p>
      {/* Also provide copy-paste fallback */}
      <button onClick={() => navigator.clipboard.writeText(uri)}>
        Copy URI
      </button>
    </div>
  );
}
```

### Node.js / Server-Side (using qrcode)

```typescript
import QRCode from "qrcode";

// Generate QR code as data URL (for embedding in HTML)
const qrDataUrl = await QRCode.toDataURL(nostrconnectURI, {
  errorCorrectionLevel: "M",
  width: 256,
});

// Generate QR code as terminal output (for CLI apps)
const qrTerminal = await QRCode.toString(nostrconnectURI, {
  type: "terminal",
});
console.log(qrTerminal);
```

### Vanilla JS / HTML Canvas

```typescript
import QRCode from "qrcode";

const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
await QRCode.toCanvas(canvas, nostrconnectURI, {
  errorCorrectionLevel: "M",
  width: 256,
});
```

---

## Step 4: Session Persistence and Reconnection

```typescript
// ============================================================
// PERSIST SESSION (after successful connection)
// ============================================================
// Store the local signer's private key and the remote signer's
// pubkey so you can reconnect without re-scanning the QR code.
const sessionData = {
  localPrivkey: localSigner.privateKey, // hex string
  remotePubkey: bunkerSigner.remotePubkey, // hex string
  relays: ["wss://relay.damus.io", "wss://relay.primal.net"],
};
localStorage.setItem("bunker_session", JSON.stringify(sessionData));

// ============================================================
// RECONNECT (on subsequent app loads)
// ============================================================
async function reconnectBunker(): Promise<NDKNip46Signer | null> {
  const stored = localStorage.getItem("bunker_session");
  if (!stored) return null;

  const session = JSON.parse(stored);

  const ndk = new NDK({
    explicitRelayUrls: session.relays,
  });
  await ndk.connect();

  // Recreate the local signer from stored private key
  const localSigner = new NDKPrivateKeySigner(session.localPrivkey);

  // Reconnect using the known remote signer pubkey
  // Pass the remote pubkey directly (not a bunker:// URI)
  const bunkerSigner = new NDKNip46Signer(
    ndk,
    session.remotePubkey,
    localSigner,
  );

  try {
    await bunkerSigner.blockUntilReady();
    ndk.signer = bunkerSigner;
    return bunkerSigner;
  } catch (err) {
    // Session expired or signer offline - clear and re-auth
    localStorage.removeItem("bunker_session");
    return null;
  }
}
```

---

## Step 5: Handle Auth Challenges

Auth challenges happen when the signer needs additional user approval (e.g., for
a permission not pre-granted). The signer returns a special response with
`result: "auth_url"` and the URL in the `error` field.

NDK handles this via event callbacks, but you should be aware of the flow:

```typescript
// NDK's NDKNip46Signer handles auth challenges internally.
// When the signer returns an auth_url response, NDK will:
//   1. Detect the auth_url result
//   2. Emit an event you can listen for
//   3. Keep the subscription open with the same request ID
//   4. Wait for the second response after user authenticates

// For custom handling, you can listen for auth events:
bunkerSigner.on("authUrl", (url: string) => {
  // Open the auth URL in a popup or new tab
  window.open(url, "nostr-auth", "width=600,height=400");
  // The signer will send the actual response after the user
  // authenticates at this URL. NDK keeps listening automatically.
});
```

### Auth Challenge Protocol Detail

When the signer needs user approval, the encrypted kind:24133 response contains:

```json
{
  "id": "<original-request-id>",
  "result": "auth_url",
  "error": "https://signer.example.com/auth?token=abc123"
}
```

The client MUST:

1. Open the URL from the `error` field in a popup or new tab
2. Keep the relay subscription open with the same request ID
3. Wait for a **second** response with the same `id` — this one contains the
   actual result (e.g., the signed event)
4. The second response arrives only after the user authenticates

---

## How `switch_relays` Works and Why It Matters

### The Problem

When you create a `nostrconnect://` URI, you pick the relays for the initial
handshake. But these might be relays the signer doesn't prefer or trust. The
signer needs to be in control of which relays are used for ongoing
communication, because:

1. **Reliability** — The signer knows which relays are most reliable for its
   infrastructure. Your initial relay choices might go offline or become slow.

2. **Privacy** — The signer may prefer relays with better privacy policies or
   that it operates itself.

3. **Migration** — Over time, relays come and go. The signer needs to migrate
   connections to new relays without breaking existing sessions.

4. **Performance** — The signer may be geographically closer to certain relays,
   reducing latency for signing operations.

### The Protocol

Per NIP-46, compliant clients SHOULD send a `switch_relays` request immediately
after establishing a connection (and at reasonable intervals thereafter):

```json
{
  "id": "<random-id>",
  "method": "switch_relays",
  "params": []
}
```

The signer responds with either:

- An array of relay URLs: `["wss://new-relay1.com", "wss://new-relay2.com"]` —
  the client MUST update its local state and send all further requests on these
  new relays
- `null` — no change needed, keep using current relays

### NDK Behavior

NDK handles relay switching at a higher level through its relay management. When
using `NDKNip46Signer`, relay switching is managed as part of NDK's relay pool.
However, you should be aware of the mechanism and ensure your relay
configuration allows for updates:

```typescript
// NDK manages relays through its pool. After connection, the signer
// may indicate preferred relays. NDK's relay management handles this,
// but you can also manually trigger relay updates:

// Option 1: NDK handles it automatically through its relay pool
// The NDKNip46Signer communicates relay preferences internally.

// Option 2: If using lower-level access, you can send the request:
// (This is what happens under the hood)
//
// The switch_relays method sends:
//   { "id": "...", "method": "switch_relays", "params": [] }
//
// If the signer returns new relays, NDK updates its internal
// relay connections for the bunker communication channel.

// IMPORTANT: If you're managing relays manually or using a custom
// setup, make sure to handle the relay switch response:
const ndk = new NDK({
  explicitRelayUrls: [
    "wss://relay.damus.io", // Initial relay for handshake
    "wss://relay.primal.net", // Backup relay
  ],
});
await ndk.connect();

// After bunker connection is established, the signer controls
// which relays are used. If the signer sends back different relays,
// NDK will route subsequent kind:24133 messages through them.
```

### Why You Must Support It

From the NIP-46 spec:

> "At all times, the remote-signer should be in control of what relays are being
> used for the connection between it and the client."

If you don't support `switch_relays`:

- The signer can't migrate away from unreliable relays
- Your app may break when initial relays go offline
- The signer can't optimize for latency or privacy
- You're not compliant with NIP-46

---

## Complete Working Example: React Component

```tsx
import { useCallback, useEffect, useState } from "react";
import NDK, {
  NDKEvent,
  NDKNip46Signer,
  NDKPrivateKeySigner,
} from "@nostr-dev-kit/ndk";
import { QRCodeSVG } from "qrcode.react";

type ConnectionState =
  | "idle"
  | "generating"
  | "waiting"
  | "connected"
  | "error";

export function BunkerConnect() {
  const [state, setState] = useState<ConnectionState>("idle");
  const [uri, setUri] = useState<string>("");
  const [userPubkey, setUserPubkey] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [signer, setSigner] = useState<NDKNip46Signer | null>(null);

  const connect = useCallback(async () => {
    try {
      setState("generating");

      // 1. Initialize NDK
      const ndkInstance = new NDK({
        explicitRelayUrls: [
          "wss://relay.damus.io",
          "wss://relay.primal.net",
        ],
      });
      await ndkInstance.connect();
      setNdk(ndkInstance);

      // 2. Generate client keypair
      const localSigner = NDKPrivateKeySigner.generate();

      // 3. Create NIP-46 signer (nostrconnect:// flow)
      const bunkerSigner = new NDKNip46Signer(
        ndkInstance,
        undefined,
        localSigner,
      );

      // 4. Generate nostrconnect:// URI
      const nostrconnectURI = await bunkerSigner.createNostrConnectURI({
        name: "My Nostr App",
        perms: "sign_event:1,sign_event:0,nip44_encrypt,nip44_decrypt",
      });
      setUri(nostrconnectURI);
      setState("waiting");

      // 5. Wait for signer to connect (user scans QR)
      await bunkerSigner.blockUntilReady();

      // 6. Connection established
      ndkInstance.signer = bunkerSigner;
      setSigner(bunkerSigner);

      // 7. Get user's actual pubkey
      // CRITICAL: remote-signer-pubkey != user-pubkey
      const pubkey = await bunkerSigner.getPublicKey();
      setUserPubkey(pubkey);
      setState("connected");

      // 8. Persist session for reconnection
      localStorage.setItem(
        "bunker_session",
        JSON.stringify({
          localPrivkey: localSigner.privateKey,
          remotePubkey: bunkerSigner.remotePubkey,
          relays: ["wss://relay.damus.io", "wss://relay.primal.net"],
        }),
      );
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, []);

  const publishNote = useCallback(
    async (content: string) => {
      if (!ndk || !signer) return;

      const event = new NDKEvent(ndk, {
        kind: 1,
        content,
      });
      // Signs via remote signer automatically, then publishes
      await event.publish();
      console.log("Published:", event.id);
    },
    [ndk, signer],
  );

  const disconnect = useCallback(() => {
    localStorage.removeItem("bunker_session");
    setNdk(null);
    setSigner(null);
    setUserPubkey("");
    setUri("");
    setState("idle");
  }, []);

  // Try reconnecting from stored session on mount
  useEffect(() => {
    const stored = localStorage.getItem("bunker_session");
    if (!stored) return;

    const session = JSON.parse(stored);
    const ndkInstance = new NDK({
      explicitRelayUrls: session.relays,
    });

    (async () => {
      try {
        await ndkInstance.connect();
        const localSigner = new NDKPrivateKeySigner(session.localPrivkey);
        const bunkerSigner = new NDKNip46Signer(
          ndkInstance,
          session.remotePubkey,
          localSigner,
        );
        await bunkerSigner.blockUntilReady();
        ndkInstance.signer = bunkerSigner;
        setNdk(ndkInstance);
        setSigner(bunkerSigner);
        const pubkey = await bunkerSigner.getPublicKey();
        setUserPubkey(pubkey);
        setState("connected");
      } catch {
        localStorage.removeItem("bunker_session");
      }
    })();
  }, []);

  return (
    <div>
      {state === "idle" && (
        <button onClick={connect}>Connect with Remote Signer</button>
      )}

      {state === "generating" && <p>Generating connection URI...</p>}

      {state === "waiting" && (
        <div>
          <h3>Scan with your Nostr signer app</h3>
          <QRCodeSVG value={uri} size={256} level="M" />
          <br />
          <button onClick={() => navigator.clipboard.writeText(uri)}>
            Copy URI
          </button>
          <p>Waiting for signer to connect...</p>
        </div>
      )}

      {state === "connected" && (
        <div>
          <p>Connected as: {userPubkey.slice(0, 8)}...{userPubkey.slice(-8)}</p>
          <button onClick={() => publishNote("Hello from bunker!")}>
            Publish Test Note
          </button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}

      {state === "error" && (
        <div>
          <p>Error: {error}</p>
          <button onClick={connect}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

---

## nostrconnect:// URI Format Reference

```
nostrconnect://<client-pubkey>?relay=<url>&relay=<url>&secret=<required>&name=<app>&perms=<csv>&url=<app-url>&image=<icon-url>
```

| Parameter | Required | Description                                                         |
| --------- | -------- | ------------------------------------------------------------------- |
| `relay`   | Yes      | One or more relay URLs where the client listens for responses       |
| `secret`  | Yes      | Random single-use string; signer returns it to prove the connection |
| `name`    | No       | App name displayed in the signer's approval UI                      |
| `perms`   | No       | Comma-separated permissions: `method[:param]`                       |
| `url`     | No       | Canonical URL of the client application                             |
| `image`   | No       | Small image/icon URL for the client application                     |

### Permission Format

Permissions are comma-separated `method[:params]`:

| Permission      | Meaning                              |
| --------------- | ------------------------------------ |
| `sign_event`    | Allow signing any event kind         |
| `sign_event:1`  | Only allow signing kind:1 (notes)    |
| `sign_event:0`  | Only allow signing kind:0 (metadata) |
| `nip44_encrypt` | Allow NIP-44 encryption              |
| `nip44_decrypt` | Allow NIP-44 decryption              |
| `nip04_encrypt` | Allow NIP-04 encryption (legacy)     |
| `nip04_decrypt` | Allow NIP-04 decryption (legacy)     |

---

## Common Mistakes to Avoid

| Mistake                                               | Fix                                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Using `remote-signer-pubkey` as the user's identity   | Always call `getPublicKey()` after connecting. The signer pubkey is for transport encryption only; the user's pubkey may be different. |
| Using NIP-04 for kind:24133 content encryption        | NIP-46 requires NIP-44 encryption. NIP-04 is deprecated and insecure. NDK handles this correctly internally.                           |
| Not handling auth challenges                          | Implement the auth_url flow: open URL, keep subscription, wait for second response with same request ID.                               |
| Reusing the bunker secret after successful connection | Secrets are single-use. The signer SHOULD reject reuse. NDK generates fresh secrets automatically.                                     |
| Not supporting `switch_relays`                        | The signer controls relay selection. Clients must comply with relay changes or risk broken connections.                                |
| Skipping secret validation in nostrconnect:// flow    | Client MUST validate that the secret in the connect response matches the one it sent. NDK does this automatically.                     |
| Generating a new client keypair every session         | Persist the client secret key locally for reconnection. A new keypair forces re-authorization with the signer.                         |
| Confusing `connect` request vs response               | In nostrconnect:// flow, the **signer** sends the connect response (not the client). The client just waits.                            |

---

## Quick Reference

| Component                         | Value                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| Event kind                        | `24133`                                                                               |
| Content encryption                | NIP-44 (version 2) — never NIP-04                                                     |
| Connection URI (client-initiated) | `nostrconnect://<client-pubkey>?relay=<url>&secret=<required>&name=<app>&perms=<csv>` |
| NDK class                         | `NDKNip46Signer`                                                                      |
| NDK local signer                  | `NDKPrivateKeySigner` (handles transport encryption)                                  |
| Wait for connection               | `bunkerSigner.blockUntilReady()`                                                      |
| Get user identity                 | `bunkerSigner.getPublicKey()` — NOT the remote-signer-pubkey                          |
| Generate URI                      | `bunkerSigner.createNostrConnectURI({ name, perms })`                                 |
| Auth challenge result             | `"auth_url"` (URL in error field)                                                     |
| Permission format                 | `method[:param]` comma-separated                                                      |
| Relay control                     | Signer controls via `switch_relays` — client must comply                              |

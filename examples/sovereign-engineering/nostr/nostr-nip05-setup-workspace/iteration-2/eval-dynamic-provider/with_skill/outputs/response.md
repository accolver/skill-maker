# NIP-05 Identity Provider: Dynamic Node.js Server

Here's a complete Node.js server that implements the `/.well-known/nostr.json`
endpoint for a multi-user NIP-05 identity provider, including `?name=` query
support, relay hints, local-part validation, and root identifier handling.

## The nostr.json Response Format

The NIP-05 spec defines the response format as:

```json
{
  "names": {
    "<local-part>": "<64-char-lowercase-hex-pubkey>"
  },
  "relays": {
    "<64-char-lowercase-hex-pubkey>": [
      "wss://relay1.example.com",
      "wss://relay2.example.com"
    ]
  }
}
```

- **`names`** (REQUIRED): An object mapping local-part strings to 64-character
  lowercase hex public keys. Public keys MUST be hex — never npub/bech32 format.
- **`relays`** (RECOMMENDED): An object keyed by hex public keys, where each
  value is an array of WebSocket relay URLs (`wss://...`). This tells clients
  which relays to query for the user's events.
- The **local-part** (the key in `names`) must only contain `a-z0-9-_.`
  characters — lowercase only, no uppercase.
- The special local-part **`_`** is the root identifier: `_@example.com`
  displays as just `example.com` in clients.

## Complete Server Code

```javascript
const express = require("express");
const app = express();

// ============================================================
// User database — replace with your actual data source (DB, etc.)
// All pubkeys MUST be 64-character lowercase hex strings.
// ============================================================
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"],
  },
  alice: {
    pubkey: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    relays: ["wss://relay.damus.io", "wss://relay.snort.social"],
  },
  // The root identifier: _@yourdomain.com displays as just "yourdomain.com"
  _: {
    pubkey: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    relays: ["wss://relay.damus.io"],
  },
};

// ============================================================
// Regex for validating local-part characters
// NIP-05 spec: only a-z (lowercase), 0-9, hyphen, underscore, period
// ============================================================
const LOCAL_PART_REGEX = /^[a-z0-9\-_.]+$/;

// ============================================================
// GET /.well-known/nostr.json — the NIP-05 endpoint
// ============================================================
app.get("/.well-known/nostr.json", (req, res) => {
  // CORS header is MANDATORY — without it, browser-based Nostr clients
  // (Snort, Iris, Coracle, etc.) silently fail to verify identities.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Content-Type", "application/json");

  // Read the ?name= query parameter
  const name = req.query.name;

  // Build the response object
  const result = { names: {}, relays: {} };

  if (name !== undefined && name !== "") {
    // Normalize to lowercase
    const normalizedName = name.toLowerCase();

    // Validate the local-part format: only a-z0-9-_. allowed
    if (!LOCAL_PART_REGEX.test(normalizedName)) {
      return res.status(400).json({
        error:
          "Invalid name format. Only a-z, 0-9, hyphen, underscore, and period are allowed.",
      });
    }

    // Look up the user
    const user = users[normalizedName];
    if (user) {
      result.names[normalizedName] = user.pubkey;
      // Include relay hints if available
      if (user.relays && user.relays.length > 0) {
        result.relays[user.pubkey] = user.relays;
      }
    }
    // If user not found, return empty names/relays (not an error)
  } else {
    // No ?name= parameter — return ALL users
    for (const [localPart, userData] of Object.entries(users)) {
      result.names[localPart] = userData.pubkey;
      if (userData.relays && userData.relays.length > 0) {
        result.relays[userData.pubkey] = userData.relays;
      }
    }
  }

  return res.json(result);
});

// Handle OPTIONS preflight for CORS
app.options("/.well-known/nostr.json", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

// ============================================================
// Start the server
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NIP-05 identity provider running on port ${PORT}`);
});
```

## How the Root Identifier Works

The underscore `_` is a special local-part that represents the domain itself.
When a user sets their NIP-05 to `_@example.com`, Nostr clients display their
identity as just `example.com` rather than `_@example.com`. This is ideal for
organizations or projects that want to be identified by their domain name.

In the server code above, the `_` entry in the users object handles this:

```javascript
_: {
    pubkey: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    relays: ["wss://relay.damus.io"],
},
```

When a client queries `?name=_`, the server returns the mapping for the domain's
root identity.

## Example Requests and Responses

**Query a specific user:**

```
GET /.well-known/nostr.json?name=bob
```

Response:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.nostr.band"
    ]
  }
}
```

**Query the root identifier:**

```
GET /.well-known/nostr.json?name=_
```

Response:

```json
{
  "names": {
    "_": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
  },
  "relays": {
    "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b": [
      "wss://relay.damus.io"
    ]
  }
}
```

**Invalid name format:**

```
GET /.well-known/nostr.json?name=Bob%20Smith!
```

Response (400):

```json
{
  "error": "Invalid name format. Only a-z, 0-9, hyphen, underscore, and period are allowed."
}
```

## Deployment Considerations

1. **HTTPS is required** — NIP-05 clients only fetch over HTTPS. Never serve
   this endpoint over plain HTTP. Use Let's Encrypt, Cloudflare, or similar for
   TLS.

2. **No redirects** — The endpoint MUST NOT return HTTP redirects (301, 302,
   307, 308). The NIP-05 spec requires fetchers to ignore redirects for
   security. If you're behind a reverse proxy (like Nginx), make sure the proxy
   doesn't redirect.

3. **CORS is mandatory** — The `Access-Control-Allow-Origin: *` header must be
   on every response. Without it, every browser-based Nostr client silently
   fails to verify identities.

4. **Hex keys only** — All public keys in the response MUST be 64-character
   lowercase hex strings. Never use npub (bech32) format in the nostr.json
   response. npub is only a display format defined in NIP-19.

5. **If behind Nginx**, use this reverse proxy config:

```nginx
location = /.well-known/nostr.json {
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET" always;
    proxy_pass http://127.0.0.1:3000/.well-known/nostr.json;
    proxy_set_header Host $host;
}
```

Use `location =` (exact match) to prevent trailing-slash redirects.

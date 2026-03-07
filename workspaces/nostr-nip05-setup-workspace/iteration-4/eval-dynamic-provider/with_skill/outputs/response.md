# Dynamic NIP-05 Identity Provider (Node.js)

Here's a complete Node.js server for running a multi-user NIP-05 identity
provider service.

## The nostr.json Response Format

Per NIP-05, the response from `/.well-known/nostr.json?name=<local-part>` must
be JSON with this structure:

```json
{
  "names": {
    "<local-part>": "<64-char-lowercase-hex-pubkey>"
  },
  "relays": {
    "<64-char-lowercase-hex-pubkey>": [
      "wss://relay.example.com",
      "wss://relay2.example.com"
    ]
  }
}
```

- **`names`** (REQUIRED): Maps local-part strings to 64-character lowercase hex
  public keys. Keys MUST be in hex format, never npub/bech32.
- **`relays`** (RECOMMENDED): Maps hex pubkeys to arrays of `wss://` WebSocket
  relay URLs. This helps clients discover where to find events from that user.
- **Local-part characters**: Only `a-z0-9-_.` are allowed (lowercase letters,
  digits, hyphen, underscore, period).
- **Root identifier**: The underscore `_` is a special local-part.
  `_@example.com` displays as just `example.com` in clients. This lets a domain
  owner claim the domain itself as their identifier.

## Complete Server Code

```javascript
const express = require("express");
const app = express();

// ---- User Database ----
// In production, replace with a real database (PostgreSQL, SQLite, etc.)
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band"],
  },
  alice: {
    pubkey: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    relays: ["wss://nos.lol", "wss://relay.damus.io"],
  },
  // The underscore _ is the root identifier.
  // _@example.com displays as just "example.com" in clients.
  _: {
    pubkey: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    relays: ["wss://relay.example.com"],
  },
};

// ---- NIP-05 Endpoint ----
app.get("/.well-known/nostr.json", (req, res) => {
  // CORS header is MANDATORY.
  // Without Access-Control-Allow-Origin: *, browser-based Nostr clients
  // (Snort, Coracle, etc.) silently fail to verify identities.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Content-Type", "application/json");

  // Extract the name query parameter
  // NIP-05 clients request: GET /.well-known/nostr.json?name=<local-part>
  const name = (req.query.name || "").toLowerCase();

  // Validate local-part format.
  // NIP-05 spec restricts the local-part to: a-z 0-9 - _ .
  // Reject anything outside this character set.
  if (name && !/^[a-z0-9\-_.]+$/.test(name)) {
    return res.status(400).json({
      error:
        "Invalid name format. Only a-z, 0-9, hyphen, underscore, and period are allowed.",
    });
  }

  // Build response
  const result = { names: {}, relays: {} };

  if (name) {
    // Specific user requested
    if (users[name]) {
      result.names[name] = users[name].pubkey;
      if (users[name].relays && users[name].relays.length > 0) {
        result.relays[users[name].pubkey] = users[name].relays;
      }
    }
    // If user not found, return empty names/relays (not an error)
  } else {
    // No name parameter — return all users
    for (const [n, data] of Object.entries(users)) {
      result.names[n] = data.pubkey;
      if (data.relays && data.relays.length > 0) {
        result.relays[data.pubkey] = data.relays;
      }
    }
  }

  res.json(result);
});

// Handle CORS preflight requests
app.options("/.well-known/nostr.json", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NIP-05 identity provider running on port ${PORT}`);
});
```

## How Each Part Works

### Route Handler: `GET /.well-known/nostr.json`

The path `/.well-known/nostr.json` is required by the NIP-05 spec. Clients
construct the URL as:

```
https://<domain>/.well-known/nostr.json?name=<local-part>
```

The `?name=` query parameter tells the server which user to look up. The server
extracts this from `req.query.name`.

### CORS: `Access-Control-Allow-Origin: *`

Every response sets `Access-Control-Allow-Origin` to `*`. This is mandatory
because JavaScript-based Nostr clients run in browsers and are blocked by CORS
policies without this header. Without it, verification silently fails with no
error shown to the user.

### Relay Hints

The `relays` object maps hex pubkeys to arrays of WebSocket relay URLs (always
`wss://` protocol). This tells clients where to find events from that user,
enabling better relay discovery.

Example relay values in the response:

```json
{
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io",
      "wss://relay.nostr.band"
    ]
  }
}
```

### Input Validation

The regex `/^[a-z0-9\-_.]+$/` restricts the local-part to only allowed
characters: lowercase letters, digits, hyphens, underscores, and periods. This
prevents injection attacks and ensures compliance with the NIP-05 spec.

### Root Identifier: `_`

The underscore `_` is the special root identifier. When a user registers as
`_@example.com`, clients display their identifier as just `example.com` (without
the underscore prefix). This is useful for domain owners who want the domain
itself as their Nostr identity.

In the code, the `_` key in the users database is handled identically to any
other name. It just has special display semantics in clients.

### Pubkey Format

All pubkeys in the `names` and `relays` objects MUST be 64-character lowercase
hex strings. For example:

```
b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9
```

This is the raw hex encoding of the 32-byte public key. Never use npub (bech32)
format in nostr.json — that format is only for display in user interfaces
(defined in NIP-19).

## Deployment Notes

1. **HTTPS is required.** Nostr clients only fetch NIP-05 over HTTPS. Use Let's
   Encrypt, Cloudflare, or your hosting provider's TLS.
2. **No redirects.** The endpoint must not return 301, 302, 307, or 308
   redirects. The NIP-05 spec says fetchers must ignore redirects. If you have a
   reverse proxy in front (e.g., Nginx), ensure it doesn't redirect.
3. **Behind Nginx reverse proxy:** If proxying through Nginx, use an exact-match
   location block:

```nginx
location = /.well-known/nostr.json {
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET" always;
    proxy_pass http://127.0.0.1:3000/.well-known/nostr.json;
    proxy_set_header Host $host;
}
```

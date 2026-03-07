# Building a Dynamic NIP-05 Identity Provider in Node.js

Here's a complete Node.js server that handles NIP-05 identity verification for
multiple users, with proper query parameter support, relay hints, input
validation, and root identifier handling.

## The nostr.json Response Format

NIP-05 defines the response format for `/.well-known/nostr.json`:

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

- **`names`** (required): Maps local-part identifiers to hex public keys
- **`relays`** (recommended): Maps hex public keys to arrays of relay WebSocket
  URLs where the user can be found

**Important:** The `relays` object is keyed by the hex pubkey, NOT by the
username. This is because multiple names could map to the same pubkey, and
relays are a property of the key, not the name.

All pubkeys must be 64-character lowercase hex — never npub/bech32 format.

## The Root Identifier `_`

The underscore `_` is a special local-part that represents the domain itself.
When a user's NIP-05 is `_@example.com`, clients display it as just
`example.com` (without the underscore prefix). This is useful for organizations
or individuals who want their domain to be their identity.

## Complete Server Implementation

```javascript
const express = require("express");
const app = express();

// In production, replace with a database
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band"],
  },
  alice: {
    pubkey: "a1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
    relays: ["wss://nos.lol", "wss://relay.damus.io"],
  },
  // The root identifier — _@example.com displays as just "example.com"
  _: {
    pubkey: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    relays: ["wss://relay.damus.io"],
  },
};

// Local-part validation regex — NIP-05 only allows a-z0-9-_.
const VALID_LOCAL_PART = /^[a-z0-9\-_.]+$/;

app.get("/.well-known/nostr.json", (req, res) => {
  // CORS header — required for browser-based Nostr clients
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Content-Type", "application/json");

  // Read the name query parameter
  const name = req.query.name;

  // If name is provided, validate the local-part format
  if (name !== undefined && name !== "") {
    const normalizedName = name.toLowerCase();

    if (!VALID_LOCAL_PART.test(normalizedName)) {
      return res.status(400).json({
        error:
          "Invalid name format. Only a-z, 0-9, hyphens, underscores, and periods are allowed.",
      });
    }

    // Look up the specific user
    const user = users[normalizedName];
    if (!user) {
      // Return empty names object for unknown users (not an error)
      return res.json({ names: {}, relays: {} });
    }

    // Build response for the requested user
    const response = {
      names: {
        [normalizedName]: user.pubkey,
      },
      relays: {},
    };

    if (user.relays && user.relays.length > 0) {
      response.relays[user.pubkey] = user.relays;
    }

    return res.json(response);
  }

  // No name parameter — return all users
  const response = { names: {}, relays: {} };

  for (const [localPart, userData] of Object.entries(users)) {
    response.names[localPart] = userData.pubkey;
    if (userData.relays && userData.relays.length > 0) {
      response.relays[userData.pubkey] = userData.relays;
    }
  }

  return res.json(response);
});

// Handle CORS preflight requests
app.options("/.well-known/nostr.json", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NIP-05 identity provider running on port ${PORT}`);
});
```

## How the Query Parameter Works

Clients request identities using the `?name=` query parameter:

- `GET /.well-known/nostr.json?name=bob` → returns only bob's mapping
- `GET /.well-known/nostr.json?name=_` → returns the root identifier
- `GET /.well-known/nostr.json` (no name) → returns all users

**Example response for `?name=bob`:**

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io",
      "wss://relay.nostr.band"
    ]
  }
}
```

**Example response for `?name=_` (root identifier):**

```json
{
  "names": {
    "_": "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4"
  },
  "relays": {
    "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4": [
      "wss://relay.damus.io"
    ]
  }
}
```

## Input Validation

The server validates that the local-part only contains `a-z0-9-_.`:

```
Valid:   bob, alice, bob.smith, my-name, _
Invalid: Bob (uppercase), alice@domain (@ sign), bob smith (space)
```

Invalid requests return a 400 error:

```json
{
  "error": "Invalid name format. Only a-z, 0-9, hyphens, underscores, and periods are allowed."
}
```

## Deployment Notes

1. **HTTPS required** — NIP-05 clients only fetch over HTTPS. Put this behind a
   reverse proxy (Nginx, Caddy) with TLS or deploy to a platform that handles
   TLS.

2. **No redirects** — The endpoint must return 200 directly. No 301/302
   redirects — NIP-05 spec requires fetchers to ignore redirects.

3. **CORS is mandatory** — The `Access-Control-Allow-Origin: *` header is
   required because browser-based Nostr clients need it.

4. **Production database** — Replace the in-memory `users` object with a
   database (PostgreSQL, SQLite, etc.) for a real provider service.

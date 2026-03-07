# Dynamic NIP-05 Identity Provider Server

Here's a complete Node.js/Express server for a NIP-05 identity provider that
handles multiple users with `?name=` query support, relay hints, input
validation, and root identifier support.

## The nostr.json Response Format

Per the NIP-05 spec, the JSON response has a names object and a relays object:

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

- **`names`** (REQUIRED): Maps human-readable local-parts to 64-character
  lowercase hex public keys. Keys MUST be hex — never npub bech32 format.
- **`relays`** (RECOMMENDED): Maps hex pubkeys to arrays of WebSocket relay URLs
  (`wss://`). This helps clients discover where to find the user's events.
- **Local-part rules**: Only `a-z0-9-_.` characters are allowed (lowercase only,
  no uppercase).
- **Root identifier**: The underscore `_` is a special local-part.
  `_@domain.com` displays as just `domain.com` in clients.

## Complete Server Code

```javascript
const express = require("express");
const app = express();

// ============================================================
// User database — replace with your actual data source
// (database, file, API, etc.)
// ============================================================
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.damus.io", "wss://relay.nostr.band"],
  },
  alice: {
    pubkey: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    relays: ["wss://nos.lol", "wss://relay.snort.social"],
  },
  // The underscore _ is the root identifier.
  // _@yourdomain.com displays as just "yourdomain.com" in clients.
  _: {
    pubkey: "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2b0635d6a9851d3ae",
    relays: ["wss://relay.damus.io"],
  },
};

// ============================================================
// NIP-05 endpoint: GET /.well-known/nostr.json?name=<local-part>
// ============================================================
app.get("/.well-known/nostr.json", (req, res) => {
  // CORS header — REQUIRED for browser-based Nostr clients.
  // Without Access-Control-Allow-Origin: *, JavaScript clients
  // in browsers silently fail to verify identities.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Content-Type", "application/json");

  // Extract the name query parameter
  const name = (req.query.name || "").toString().toLowerCase();

  // --------------------------------------------------------
  // Input validation: local-part MUST only contain a-z0-9-_.
  // Reject anything else with a 400 error.
  // --------------------------------------------------------
  if (name && !/^[a-z0-9\-_.]+$/.test(name)) {
    return res.status(400).json({
      error:
        "Invalid name format. Only a-z, 0-9, hyphens, underscores, and dots are allowed.",
    });
  }

  // Build the response object
  const result = { names: {}, relays: {} };

  if (name) {
    // Specific name requested — return only that user
    const user = users[name];
    if (user) {
      result.names[name] = user.pubkey;
      if (user.relays && user.relays.length > 0) {
        result.relays[user.pubkey] = user.relays;
      }
    }
    // If user not found, return empty names/relays (not a 404)
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

// ============================================================
// Handle CORS preflight OPTIONS requests
// ============================================================
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

## How It Works

### Query Parameter Handling

The `?name=<local-part>` query parameter is the standard way clients request a
specific user:

- `GET /.well-known/nostr.json?name=bob` → returns only bob's mapping
- `GET /.well-known/nostr.json?name=_` → returns the root identifier
  (domain-level identity)
- `GET /.well-known/nostr.json` (no name param) → returns all users

### Root Identifier (`_`)

The underscore `_` is a special local-part defined in NIP-05. When a user's
nip05 is `_@yourdomain.com`, clients display their identity as just
`yourdomain.com` without the prefix. This is commonly used by organizations or
for a domain's primary identity.

In the server, `_` is just another key in the users object — no special routing
needed.

### Input Validation

The local-part (name before the `@`) is restricted to lowercase alphanumeric
characters, hyphens, underscores, and dots: `a-z0-9-_.`. The server validates
this with a regex and returns a 400 error for invalid input. This prevents
injection attacks and ensures spec compliance.

### Relay Hints

The `relays` object maps hex pubkeys to arrays of WebSocket relay URLs
(`wss://`). This is recommended by the NIP-05 spec — it helps clients discover
where to find the user's events without needing to search all known relays.

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

### CORS

The `Access-Control-Allow-Origin: *` header is mandatory. Browser-based Nostr
clients (web apps) make cross-origin requests to your domain — without this
header, the browser's CORS policy silently blocks the request and verification
fails with no visible error.

## Deployment Notes

1. **HTTPS is required** — NIP-05 clients only fetch over HTTPS. Use a reverse
   proxy (Nginx, Caddy) with TLS in front of this Express server.
2. **No redirects** — The endpoint MUST NOT return HTTP redirects (301, 302).
   Redirects are a NIP-05 spec violation; fetchers must ignore them. Ensure your
   reverse proxy doesn't add www→non-www or trailing-slash redirects on this
   path.
3. **Pubkeys must be hex** — Always store and return 64-character lowercase hex
   pubkeys, never npub bech32 format.

## Testing

```bash
# Test a specific user
curl -s http://localhost:3000/.well-known/nostr.json?name=bob | jq .

# Test the root identifier
curl -s http://localhost:3000/.well-known/nostr.json?name=_ | jq .

# Test CORS headers
curl -sI http://localhost:3000/.well-known/nostr.json | grep -i access-control

# Test invalid input
curl -s http://localhost:3000/.well-known/nostr.json?name=INVALID%21 | jq .
```

## Scaling Considerations

For a production NIP-05 provider:

- Replace the in-memory `users` object with a database (PostgreSQL, SQLite,
  etc.)
- Add rate limiting to prevent abuse
- Cache responses (nostr.json rarely changes)
- Add a registration API to let users add/update their pubkey and relay list
- Monitor for stale relay entries

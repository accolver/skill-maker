# Building a Dynamic NIP-05 Identity Provider in Node.js

Here's a complete implementation for a dynamic NIP-05 identity provider service
that handles the `/.well-known/nostr.json` endpoint for multiple users.

## The nostr.json Response Format

Per the NIP-05 spec, the `/.well-known/nostr.json` endpoint must return a JSON
object with:

- **`names`** (REQUIRED) — Maps local-part identifiers to 64-character lowercase
  hex public keys
- **`relays`** (RECOMMENDED) — Maps hex public keys to arrays of WebSocket relay
  URLs (`wss://`)

Example response:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    "_": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io",
      "wss://nos.lol"
    ],
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2": [
      "wss://relay.example.com"
    ]
  }
}
```

**Critical rules:**

- All public keys MUST be **64-character lowercase hex** strings — NEVER npub
  (bech32) format. npub is a NIP-19 display encoding and must not appear in
  nostr.json.
- Local-part names are restricted to `a-z0-9-_.` (lowercase only, no uppercase)
- The `_` (underscore) is the special **root identifier** — `_@domain.com`
  displays as just `domain.com` in clients
- The `?name=` query parameter allows clients to request a specific user

## Complete Server Code

```javascript
const express = require("express");
const app = express();

// ============================================================
// User Database
// In production, replace with a proper database (PostgreSQL, etc.)
// All pubkeys MUST be 64-character lowercase hex strings (not npub)
// ============================================================
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band"],
  },
  alice: {
    pubkey: "c3a5e9f7d2b4816a0e3f7c9d5a2b8e1f4c7d0a3b6e9f2c5a8d1b4e7f0a3c6d9",
    relays: ["wss://relay.example.com", "wss://eden.nostr.land"],
  },
  // Root identifier: _@domain displays as just the domain name
  _: {
    pubkey: "d4b6f0a8e3c5927b1f4a8d0e6b3c9f2a5d8e1b4c7f0a3d6e9b2c5f8a1d4e7b0",
    relays: ["wss://relay.example.com"],
  },
};

// ============================================================
// Local-part Validation
// NIP-05 restricts local-part to: a-z 0-9 - _ .
// ============================================================
const LOCAL_PART_REGEX = /^[a-z0-9\-_.]+$/;

function isValidLocalPart(name) {
  return LOCAL_PART_REGEX.test(name);
}

// ============================================================
// NIP-05 Endpoint: GET /.well-known/nostr.json
// ============================================================
app.get("/.well-known/nostr.json", (req, res) => {
  // CORS header — REQUIRED for browser-based Nostr clients
  // Without Access-Control-Allow-Origin: *, JavaScript clients
  // running in browsers are blocked by CORS policy and
  // verification silently fails.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Content-Type", "application/json");

  // Read the ?name= query parameter
  const name = req.query.name;

  // If name parameter is provided, validate and look up the specific user
  if (name !== undefined && name !== "") {
    const normalizedName = name.toLowerCase();

    // Validate local-part characters (a-z0-9-_.)
    if (!isValidLocalPart(normalizedName)) {
      return res.status(400).json({
        error:
          "Invalid name format. Local-part must contain only a-z, 0-9, hyphen, underscore, or period.",
      });
    }

    // Look up the user
    const user = users[normalizedName];
    if (!user) {
      // User not found — return empty names object (not a 404)
      return res.json({ names: {}, relays: {} });
    }

    // Build response for single user
    const response = {
      names: {
        [normalizedName]: user.pubkey,
      },
      relays: {},
    };

    // Add relay hints if available
    if (user.relays && user.relays.length > 0) {
      response.relays[user.pubkey] = user.relays;
    }

    return res.json(response);
  }

  // No name parameter — return all users
  const response = { names: {}, relays: {} };

  for (const [username, userData] of Object.entries(users)) {
    response.names[username] = userData.pubkey;
    if (userData.relays && userData.relays.length > 0) {
      response.relays[userData.pubkey] = userData.relays;
    }
  }

  return res.json(response);
});

// ============================================================
// CORS Preflight Handler
// Handles OPTIONS requests for cross-origin browser clients
// ============================================================
app.options("/.well-known/nostr.json", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

// ============================================================
// Root Identifier Explanation
// ============================================================
// The underscore '_' key in the users object is the root identifier.
// When a client queries ?name=_, it returns the pubkey associated
// with the domain itself. In clients, _@example.com is displayed
// as just "example.com" — useful for organizations or projects
// that want to be identified by their domain name alone.
//
// Example: If this server runs at example.com and a user sets
// their nip05 to "_@example.com", clients will display their
// identity as "example.com" with a verified checkmark.

// ============================================================
// Start Server
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NIP-05 identity provider running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/.well-known/nostr.json`);
  console.log(`Registered users: ${Object.keys(users).join(", ")}`);
});
```

## Deployment Requirements

### HTTPS is Mandatory

NIP-05 clients ONLY fetch over **HTTPS**. Your server MUST be behind TLS.
Options:

- **Reverse proxy**: Put Nginx/Caddy in front with SSL termination
- **Managed hosting**: Deploy to Vercel, Railway, Fly.io (auto-HTTPS)
- **Direct TLS**: Use Let's Encrypt with Node.js (not recommended for
  production)

### No Redirects

The endpoint MUST NOT return HTTP redirects (301, 302, 307, 308). The NIP-05
spec explicitly requires fetchers to ignore redirects — this is a security
constraint. If you put this behind a reverse proxy, ensure:

- No www → non-www or non-www → www redirects on this path
- No trailing-slash redirects
- No HTTP → HTTPS redirects on the endpoint itself (handle at the proxy level)

### Nginx Reverse Proxy Example

```nginx
location = /.well-known/nostr.json {
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET" always;
    proxy_pass http://127.0.0.1:3000/.well-known/nostr.json;
    proxy_set_header Host $host;
}
```

Use `location =` (exact match) to prevent trailing-slash redirects in Nginx.

## Testing

```bash
# Query a specific user
curl -s https://yourdomain.com/.well-known/nostr.json?name=bob | jq .

# Query the root identifier
curl -s https://yourdomain.com/.well-known/nostr.json?name=_ | jq .

# Check CORS headers
curl -sI https://yourdomain.com/.well-known/nostr.json | grep -i access-control

# Verify no redirects (should be 200)
curl -sI -o /dev/null -w "%{http_code}" https://yourdomain.com/.well-known/nostr.json

# Test invalid name (should return 400)
curl -s https://yourdomain.com/.well-known/nostr.json?name=INVALID! | jq .
```

## Adding Users (Registration Flow)

To add a new user to the provider, you'd add a registration endpoint or admin
API. The key validation steps are:

1. Accept the user's **hex** pubkey (64-character lowercase hex, NOT npub)
2. Validate the requested local-part against `a-z0-9-_.`
3. Store in your database
4. The user then sets `nip05` to `username@yourdomain.com` in their kind:0
   profile

If a user provides an npub, convert it to hex first using a tool like
`nak decode npub1...`.

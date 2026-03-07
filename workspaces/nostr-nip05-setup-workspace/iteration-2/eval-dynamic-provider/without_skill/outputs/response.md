# Building a NIP-05 Identity Provider with Node.js

Here's how to build a dynamic NIP-05 server that handles multiple users.

## The nostr.json Format

NIP-05 defines a simple JSON format:

```json
{
  "names": {
    "username": "hex-pubkey"
  },
  "relays": {
    "hex-pubkey": ["wss://relay.example.com"]
  }
}
```

The `names` field maps usernames to their public keys. The `relays` field is
optional and provides relay hints.

## Server Code

```javascript
const express = require("express");
const app = express();

// In-memory user store (replace with database)
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.damus.io", "wss://nos.lol"],
  },
  alice: {
    pubkey: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    relays: ["wss://relay.damus.io"],
  },
  _: {
    pubkey: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    relays: ["wss://relay.damus.io"],
  },
};

app.get("/.well-known/nostr.json", (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");

  const name = req.query.name;

  if (name) {
    const lowerName = name.toLowerCase();

    // Validate name format
    if (!/^[a-z0-9_.-]+$/.test(lowerName)) {
      return res.status(400).json({ error: "Invalid name" });
    }

    const user = users[lowerName];
    if (!user) {
      return res.json({ names: {}, relays: {} });
    }

    return res.json({
      names: { [lowerName]: user.pubkey },
      relays: { [user.pubkey]: user.relays },
    });
  }

  // Return all users if no name specified
  const result = { names: {}, relays: {} };
  for (const [n, u] of Object.entries(users)) {
    result.names[n] = u.pubkey;
    result.relays[u.pubkey] = u.relays;
  }
  return res.json(result);
});

app.listen(3000, () => {
  console.log("NIP-05 server running on port 3000");
});
```

## Key Points

- The `name` query parameter lets clients look up individual users
- The `_` username is special — it represents the domain itself (e.g.,
  `_@example.com` shows as `example.com`)
- All public keys should be in hex format (64 character hex strings)
- CORS headers are needed so web-based Nostr clients can access the endpoint
- The server should be behind HTTPS in production

## Testing

```bash
curl http://localhost:3000/.well-known/nostr.json?name=bob
```

You should get back the JSON with bob's pubkey and relay hints.

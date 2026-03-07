# Dynamic NIP-05 Server in Node.js

Here's a Node.js server that handles the NIP-05 nostr.json endpoint for multiple
users.

## Server Code

```javascript
const express = require("express");
const app = express();

// User database
const users = {
  bob: {
    pubkey: "npub1kqfv66thvm5ar0z6n2fxj9pquv08lp4jy0pcd4l0x3k39egk90yst43q3m",
    relays: ["wss://relay.damus.io"],
  },
  alice: {
    pubkey: "npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv",
    relays: ["wss://relay.example.com"],
  },
};

app.get("/.well-known/nostr.json", (req, res) => {
  const name = req.query.name;

  if (!name) {
    return res.status(400).json({ error: "Name parameter required" });
  }

  const user = users[name];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const response = {
    names: {
      [name]: user.pubkey,
    },
    relays: {
      [user.pubkey]: user.relays,
    },
  };

  res.json(response);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

## Response Format

The nostr.json response has two main fields:

- `names`: Maps usernames to their Nostr public keys
- `relays`: Maps public keys to an array of relay URLs

Example response for `?name=bob`:

```json
{
  "names": {
    "bob": "npub1kqfv66thvm5ar0z6n2fxj9pquv08lp4jy0pcd4l0x3k39egk90yst43q3m"
  },
  "relays": {
    "npub1kqfv66thvm5ar0z6n2fxj9pquv08lp4jy0pcd4l0x3k39egk90yst43q3m": [
      "wss://relay.damus.io"
    ]
  }
}
```

## Deployment

Deploy this behind a reverse proxy like Nginx and make sure it's accessible over
HTTPS. You'll want to set up SSL using Let's Encrypt or similar.

Test with:

```bash
curl https://yourdomain.com/.well-known/nostr.json?name=bob
```

This should return the JSON for the requested user.

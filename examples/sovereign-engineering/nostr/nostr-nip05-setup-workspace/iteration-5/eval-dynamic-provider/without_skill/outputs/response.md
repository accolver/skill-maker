# Dynamic NIP-05 Server in Node.js

## Server Code

Here's a Node.js Express server that handles NIP-05 lookups:

```javascript
const express = require("express");
const app = express();

// User database
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.damus.io"],
  },
  alice: {
    pubkey: "npub1somefakekeythatwouldbeusedinproduction123456789abcdef",
    relays: ["wss://nos.lol"],
  },
};

app.get("/.well-known/nostr.json", (req, res) => {
  const name = req.query.name;

  const result = { names: {} };

  if (name && users[name]) {
    result.names[name] = users[name].pubkey;
  } else {
    // Return all users
    for (const [n, data] of Object.entries(users)) {
      result.names[n] = data.pubkey;
    }
  }

  res.json(result);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

## Response Format

The nostr.json response contains a `names` object mapping usernames to their
public keys:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  }
}
```

## How It Works

1. A client sees a NIP-05 identifier like `bob@example.com`
2. It fetches `https://example.com/.well-known/nostr.json?name=bob`
3. It verifies the returned pubkey matches the profile

## Deployment

Put this behind Nginx or another reverse proxy for HTTPS. Make sure your domain
has a valid SSL certificate.

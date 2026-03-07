# NIP-05 Identity Provider Server in Node.js

Here's a Node.js server using Express that handles NIP-05 verification for
multiple users.

## Server Code

```javascript
const express = require("express");
const app = express();

// User database
const users = {
  bob: {
    pubkey: "npub1krrddw2cjh82r83nt79ckhpptau803hjlqk6jwcagwn8g2e2kues0lrdqz",
    relays: ["wss://relay.damus.io"],
  },
  alice: {
    pubkey: "npub1q9snm5g8a5dvpwmzfac5tnwecz7na4psr0s3y2g8mht5xhgzawsqk4wd5",
    relays: ["wss://nos.lol"],
  },
};

app.get("/.well-known/nostr.json", (req, res) => {
  const name = req.query.name;

  if (name) {
    const user = users[name];
    if (user) {
      return res.json({
        names: { [name]: user.pubkey },
        relays: { [name]: user.relays },
      });
    }
    return res.status(404).json({ error: "User not found" });
  }

  // Return all users
  const names = {};
  const relays = {};
  for (const [n, data] of Object.entries(users)) {
    names[n] = data.pubkey;
    relays[n] = data.relays;
  }

  res.json({ names, relays });
});

app.listen(3000, () => {
  console.log("NIP-05 server running on port 3000");
});
```

## Response Format

The nostr.json response has two main fields:

- `names`: Maps usernames to their public keys
- `relays`: Maps usernames to their preferred relays

Example response for `?name=bob`:

```json
{
  "names": {
    "bob": "npub1krrddw2cjh82r83nt79ckhpptau803hjlqk6jwcagwn8g2e2kues0lrdqz"
  },
  "relays": {
    "bob": ["wss://relay.damus.io"]
  }
}
```

## Usage

```bash
npm install express
node server.js
```

Then access `http://localhost:3000/.well-known/nostr.json?name=bob` to test.

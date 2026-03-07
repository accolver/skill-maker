# NIP-05 Identity Provider - Node.js Server

Here's a Node.js server to handle NIP-05 identity verification for multiple
users.

## Server Code

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
    pubkey: "npub1someexamplepubkeyhere",
    relays: ["wss://nos.lol"],
  },
};

app.get("/.well-known/nostr.json", (req, res) => {
  const name = req.query.name;

  if (!name) {
    return res.status(400).json({ error: "name parameter required" });
  }

  const user = users[name];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({
    names: {
      [name]: user.pubkey,
    },
    relays: {
      [user.pubkey]: user.relays,
    },
  });
});

app.listen(3000, () => {
  console.log("NIP-05 server running on port 3000");
});
```

## Response Format

The nostr.json file follows this structure:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io"
    ]
  }
}
```

The `names` object maps usernames to public keys, and the `relays` object maps
public keys to arrays of relay URLs.

## How It Works

1. A client wants to verify `bob@example.com`
2. It sends a GET request to
   `https://example.com/.well-known/nostr.json?name=bob`
3. The server looks up `bob` and returns their pubkey
4. The client compares the returned pubkey with the one in the user's profile
5. If they match, the identity is verified

## Testing

```bash
curl http://localhost:3000/.well-known/nostr.json?name=bob
```

You should see the JSON response with Bob's public key.

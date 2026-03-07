# NIP-05 Setup for bob@example.com on Nginx

Here's the complete setup to get NIP-05 verification working for your personal
site.

## Step 1: Create the nostr.json File

Create the file at `/.well-known/nostr.json` on your server. The file path on
disk would be something like `/var/www/example.com/.well-known/nostr.json`.

The public key MUST be in 64-character lowercase hex format (not npub/bech32
format). Your hex pubkey is already in the correct format.

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io",
      "wss://relay.nostr.band",
      "wss://nos.lol"
    ]
  }
}
```

**Key points about the format:**

- The `names` object maps the local-part (`bob`) to your hex pubkey. Never use
  npub or bech32 encoding here.
- The `relays` object is recommended (not required). It tells clients where to
  find your events. Keys are hex pubkeys, values are arrays of `wss://`
  WebSocket relay URLs.
- Local-part characters must be only `a-z0-9-_.` (lowercase letters, digits,
  hyphen, underscore, period).

## Step 2: Configure Nginx

Add this location block to your Nginx server config. The three non-negotiable
requirements are:

1. **HTTPS only** — NIP-05 clients only fetch over HTTPS. HTTP will not work.
2. **CORS headers** — `Access-Control-Allow-Origin: *` is mandatory because
   browser-based Nostr clients need it.
3. **No redirects** — The endpoint MUST NOT return HTTP redirects (301, 302,
   etc.). NIP-05 spec says fetchers MUST ignore redirects. This is a security
   constraint.

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    # SSL config (Let's Encrypt example)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # NIP-05: Serve nostr.json with CORS headers
    # Use exact match (=) to prevent trailing-slash redirects
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;

        root /var/www/example.com;
    }

    # ... rest of your site config
}
```

**Why `location =` (exact match)?** Without the `=`, Nginx may treat the path as
a directory and issue a trailing-slash redirect (301). That redirect breaks
NIP-05 verification because fetchers must ignore redirects per the spec. Always
use exact match to prevent this.

## Step 3: Update Your Kind:0 Nostr Profile

Your kind:0 metadata event must include the `nip05` field set to
`bob@example.com`. In most Nostr clients (Damus, Amethyst, Primal, etc.), go to
your profile settings and set the NIP-05 field to:

```
bob@example.com
```

This is what the kind:0 event content looks like:

```json
{
  "kind": 0,
  "content": "{\"name\":\"bob\",\"nip05\":\"bob@example.com\",\"about\":\"...\",\"picture\":\"...\"}"
}
```

**How verification works:**

1. A client sees `"nip05": "bob@example.com"` in your kind:0 event
2. It splits into local-part `bob` and domain `example.com`
3. It fetches `https://example.com/.well-known/nostr.json?name=bob`
4. It checks if `response.names.bob` matches your event's pubkey
5. If match, your identity is verified and displayed with a checkmark

## Step 4: Test the Setup

After deploying, verify everything works with these curl commands:

**Verify the endpoint returns correct JSON:**

```bash
curl -s https://example.com/.well-known/nostr.json?name=bob | jq .
```

Expected output:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io",
      "wss://relay.nostr.band",
      "wss://nos.lol"
    ]
  }
}
```

**Verify CORS headers are present:**

```bash
curl -sI https://example.com/.well-known/nostr.json?name=bob | grep -i access-control
# Expected: Access-Control-Allow-Origin: *
```

**Verify no redirects (must return 200):**

```bash
curl -sI -o /dev/null -w "%{http_code}" https://example.com/.well-known/nostr.json?name=bob
# Expected: 200 (NOT 301, 302, 307, 308)
```

**Verify the pubkey is in hex format (not npub):**

```bash
curl -s https://example.com/.well-known/nostr.json?name=bob | jq -r '.names.bob' | grep -E '^[0-9a-f]{64}$'
# Should match — 64 lowercase hex characters
```

## Checklist

- [x] nostr.json created at `/.well-known/nostr.json` with `names` mapping
- [x] Public key is 64-char lowercase hex (not npub bech32)
- [x] Nginx `location = /.well-known/nostr.json` block configured (exact match)
- [x] `Access-Control-Allow-Origin: *` header set
- [x] Served over HTTPS only
- [x] No HTTP redirects on the endpoint
- [x] `relays` object included for relay discovery
- [x] Kind:0 profile updated with `nip05` field set to `bob@example.com`
- [x] Endpoint tested with curl and returns 200 with correct JSON

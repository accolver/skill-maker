# Complete NIP-05 Setup for bob@example.com on Nginx

Here's the full walkthrough to set up NIP-05 DNS-based identity verification so
Nostr clients can find you as `bob@example.com`.

## Step 1: Create the nostr.json File

Create the file at `.well-known/nostr.json` inside your web root (e.g.,
`/var/www/example.com/.well-known/nostr.json`):

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9": [
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.nostr.band"
    ]
  }
}
```

**Critical rules:**

- The public key MUST be in **64-character lowercase hex format** — NOT
  npub/bech32. Your key
  `b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9` is already
  in the correct hex format.
- The `names` object is required. It maps the local-part (`bob`) to the hex
  pubkey.
- The `relays` object is recommended — it's keyed by the hex pubkey and contains
  an array of relay WebSocket URLs where clients can find your events.
- The local-part (`bob`) must only contain characters `a-z0-9-_.` (lowercase
  only, no uppercase).

## Step 2: Configure Nginx

Add this location block to your Nginx server config for `example.com`. The file
**MUST be served over HTTPS** — Nostr clients will only fetch NIP-05 over HTTPS,
never HTTP.

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    # SSL config (Let's Encrypt example)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # NIP-05 nostr.json endpoint
    location = /.well-known/nostr.json {
        # Use exact match (=) to prevent trailing-slash redirects
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;

        root /var/www/example.com;
    }

    # ... rest of your site config
}
```

**Key points about the Nginx config:**

- Use `location =` (exact match) — this prevents Nginx from issuing
  trailing-slash redirects on the path. **HTTP redirects are prohibited by the
  NIP-05 spec.** The endpoint MUST NOT return 301, 302, or any redirect status.
  Fetchers are required to ignore redirects, meaning if your server redirects,
  verification will silently fail.
- `Access-Control-Allow-Origin: *` is mandatory — without this CORS header,
  JavaScript-based Nostr clients running in browsers will be blocked from
  fetching the file, and verification will silently fail with no error shown to
  the user.
- The `always` keyword ensures the headers are sent even on error responses.

**Warning about redirects:** Common sources of unwanted redirects include:

- `www.example.com` → `example.com` redirects (or vice versa)
- HTTP → HTTPS redirects on the endpoint itself
- Trailing slash redirects (`/nostr.json` → `/nostr.json/`)

All of these will break NIP-05 verification. The endpoint must serve the
response directly at `https://example.com/.well-known/nostr.json` with a 200
status.

After updating Nginx, reload the config:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Step 3: Update Your Kind:0 Nostr Profile

Your Nostr kind:0 metadata event must include the `nip05` field. Update your
profile in your Nostr client (Damus, Amethyst, Primal, etc.) to set the NIP-05
field to:

```
bob@example.com
```

Under the hood, this creates a kind:0 event like:

```json
{
  "kind": 0,
  "content": "{\"name\":\"bob\",\"nip05\":\"bob@example.com\",\"about\":\"...\",\"picture\":\"...\"}"
}
```

The `nip05` value `bob@example.com` looks like an email address but is NOT an
email — it's a NIP-05 identifier.

**How verification works:**

1. A Nostr client sees `"nip05": "bob@example.com"` in your kind:0 event
2. The client splits it into local-part `bob` and domain `example.com`
3. The client fetches `https://example.com/.well-known/nostr.json?name=bob`
4. The client checks if `response.names.bob` matches your event's pubkey
5. If they match, your identity is verified and displayed as `bob@example.com`

## Step 4: Test the Setup

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
      "wss://nos.lol",
      "wss://relay.nostr.band"
    ]
  }
}
```

**Verify CORS headers are present:**

```bash
curl -sI https://example.com/.well-known/nostr.json?name=bob | grep -i ^access-control
# Expected: Access-Control-Allow-Origin: *
```

**Verify no redirects (must return 200, NOT 301/302):**

```bash
curl -sI -o /dev/null -w "%{http_code}" https://example.com/.well-known/nostr.json?name=bob
# Expected: 200
```

**Verify the pubkey is hex format (64 lowercase hex chars):**

```bash
curl -s https://example.com/.well-known/nostr.json?name=bob | jq -r '.names.bob' | grep -E '^[0-9a-f]{64}$'
# Should match
```

## Checklist

- [ ] `nostr.json` file created at `.well-known/nostr.json` with `bob` mapped to
      hex pubkey
- [ ] Public key is 64-character lowercase hex (not npub)
- [ ] Nginx `location = /.well-known/nostr.json` block added with exact match
- [ ] `Access-Control-Allow-Origin: *` header set in Nginx config
- [ ] File served over HTTPS (port 443 with SSL)
- [ ] No HTTP redirects on the endpoint (verified with curl)
- [ ] `relays` object included with relay WSS URLs
- [ ] Kind:0 profile updated with `"nip05": "bob@example.com"`
- [ ] Endpoint tested with curl and returns 200 with correct JSON

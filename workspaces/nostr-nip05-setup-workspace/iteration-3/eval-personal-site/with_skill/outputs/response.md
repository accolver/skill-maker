# NIP-05 Setup for bob@example.com on Nginx

Here's the complete guide to set up NIP-05 DNS-based identity verification for
your personal site.

## Step 1: Create the nostr.json File

Create the file at `/.well-known/nostr.json` on your server. The public key MUST
be in **hex** format (64-character lowercase hex string), NOT npub bech32
format.

Create the directory and file:

```bash
sudo mkdir -p /var/www/example.com/.well-known
sudo nano /var/www/example.com/.well-known/nostr.json
```

Add this content:

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

**Key rules for this file:**

- The `names` object maps the local-part (`bob`) to the hex pubkey
- Public keys must be **64-character lowercase hex** — never use npub format
- The `relays` object is recommended — it tells clients where to find your
  events
- Relay values are arrays of WebSocket URLs starting with `wss://`
- Local-part characters are restricted to `a-z0-9-_.` (lowercase only)

## Step 2: Configure Nginx

Edit your Nginx server block to serve the nostr.json file with the required
headers. The file MUST be served over **HTTPS** — clients will only fetch NIP-05
over HTTPS.

Add this location block to your server config:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    # SSL config (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # NIP-05: Serve nostr.json with CORS headers
    location = /.well-known/nostr.json {
        # Use exact match (=) to prevent trailing-slash redirects
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;

        # Serve from filesystem
        root /var/www/example.com;
    }

    # ... rest of your site config
}
```

**Critical Nginx details:**

1. **Use `location =` (exact match)** — This prevents Nginx from issuing a
   trailing-slash redirect, which would break NIP-05 verification.
2. **`Access-Control-Allow-Origin: *`** — This CORS header is mandatory. Without
   it, browser-based Nostr clients silently fail to verify identities. The user
   sees no error — verification just doesn't work.
3. **No redirects** — The endpoint MUST NOT return HTTP redirects (301, 302,
   etc.). The NIP-05 spec explicitly states that fetchers MUST ignore redirects.
   This is a security constraint. Common redirect culprits include:
   - Trailing-slash redirects (`/nostr.json` → `/nostr.json/`)
   - HTTP→HTTPS redirects on the endpoint itself
   - www→non-www or non-www→www redirects
4. **`always` keyword** — Ensures headers are sent even on error responses.
5. **HTTPS is required** — NIP-05 only works over https. Make sure you have TLS
   set up (e.g., via Let's Encrypt / Certbot).

Reload Nginx after making changes:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Step 3: Update Your Kind:0 Nostr Profile

Update your kind:0 metadata event to include the `nip05` field. In your Nostr
client (e.g., Damus, Amethyst, Primal, or Nostrudel), find the profile/settings
screen and set the NIP-05 field to:

```
bob@example.com
```

This is what the kind:0 event content looks like:

```json
{
  "kind": 0,
  "content": "{\"name\":\"bob\",\"nip05\":\"bob@example.com\",\"about\":\"A Nostr user\",\"picture\":\"https://example.com/avatar.jpg\"}"
}
```

**How the verification flow works:**

1. A client sees `"nip05": "bob@example.com"` in your kind:0 event
2. The client splits this into local-part `bob` and domain `example.com`
3. The client fetches `https://example.com/.well-known/nostr.json?name=bob`
4. The client checks if `response.names.bob` matches your event's pubkey
5. If the hex pubkey matches → your identity is verified and a checkmark is
   displayed

## Step 4: Test the Setup

Run these commands to verify everything is working:

**1. Verify the endpoint returns correct JSON:**

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

**2. Verify CORS headers are present:**

```bash
curl -sI https://example.com/.well-known/nostr.json?name=bob | grep -i ^access-control
# Expected: Access-Control-Allow-Origin: *
```

**3. Verify no redirects (should return 200, NOT 301/302):**

```bash
curl -sI -o /dev/null -w "%{http_code}" https://example.com/.well-known/nostr.json?name=bob
# Expected: 200
```

**4. Verify the pubkey is hex format (not npub):**

```bash
curl -s https://example.com/.well-known/nostr.json?name=bob | jq -r '.names.bob' | grep -E '^[0-9a-f]{64}$'
# Should match — 64 lowercase hex characters
```

## Checklist

- [x] nostr.json file created with correct `names` mapping
- [x] Public key is 64-char lowercase hex (not npub)
- [x] Local-part uses only `a-z0-9-_.` characters
- [x] File served over HTTPS
- [x] `Access-Control-Allow-Origin: *` header present
- [x] No HTTP redirects on the endpoint
- [x] `relays` object included
- [x] Kind:0 profile updated with `nip05` field
- [ ] Endpoint tested with curl and returns 200 with correct JSON

## Common Pitfalls to Watch For

| Mistake                                      | Why It Breaks                                                  | Fix                                       |
| -------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| Using npub instead of hex pubkey             | NIP-05 requires hex format; npub is NIP-19 display format only | Convert with `nak decode npub1...`        |
| Missing `Access-Control-Allow-Origin` header | Browser-based clients can't fetch the file                     | Add CORS header to Nginx config           |
| HTTP redirect (301/302) on the endpoint      | NIP-05 spec mandates fetchers ignore redirects                 | Use exact match location, no www redirect |
| Serving over HTTP instead of HTTPS           | Clients only fetch NIP-05 over HTTPS                           | Set up TLS with Let's Encrypt             |

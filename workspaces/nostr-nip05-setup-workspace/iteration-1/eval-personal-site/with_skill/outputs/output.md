# Setting Up NIP-05 Verification for bob@example.com

Here's the complete setup for NIP-05 DNS-based identity verification on your
Nginx server.

## 1. Create the nostr.json File

Create the file at `/.well-known/nostr.json` on your server:

```bash
sudo mkdir -p /var/www/example.com/.well-known
```

Create `/var/www/example.com/.well-known/nostr.json` with this content:

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

**Important:** The public key MUST be in 64-character lowercase hex format —
never use the npub (bech32) format in this file. npub is only for display in
clients; NIP-05 requires raw hex.

The `relays` object is recommended — it helps clients discover which relays to
query for your events. It is keyed by the hex pubkey, not by the username.

## 2. Configure Nginx

Add this location block to your Nginx server config (typically
`/etc/nginx/sites-available/example.com`):

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    # Your existing SSL config
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # NIP-05 endpoint — exact match to prevent trailing-slash redirects
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;
        root /var/www/example.com;
    }

    # ... rest of your server config
}
```

Key details:

- **`location =`** — Uses exact match to prevent Nginx from doing a
  trailing-slash redirect (which would break NIP-05)
- **`Access-Control-Allow-Origin: *`** — CORS header is mandatory. Without it,
  browser-based Nostr clients silently fail to verify your identity
- **`always`** — Ensures headers are sent even on error responses
- **HTTPS only** — The file MUST be served over HTTPS, not HTTP. Nostr clients
  only fetch NIP-05 over HTTPS. If you don't have TLS set up, use Let's Encrypt
  (`certbot --nginx -d example.com`)

**Critical: No HTTP redirects.** The NIP-05 spec requires that the endpoint MUST
NOT return HTTP redirects (301, 302, 307, 308). Fetchers are required to ignore
redirects as a security measure. Make sure your Nginx config does not redirect
this path (e.g., no www redirect, no trailing slash redirect, no HTTP→HTTPS
redirect on this endpoint specifically).

Test and reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Update Your Kind:0 Profile

In your Nostr client, update your profile metadata to include the `nip05` field.
The kind:0 event content should include:

```json
{
  "kind": 0,
  "content": "{\"name\":\"bob\",\"nip05\":\"bob@example.com\",\"about\":\"...\",\"picture\":\"...\"}"
}
```

Most Nostr clients (Damus, Amethyst, Primal, etc.) have a "NIP-05" or "Nostr
Address" field in profile settings. Enter `bob@example.com` there.

**How verification works:** When a client sees `"nip05": "bob@example.com"`, it:

1. Splits into local-part `bob` and domain `example.com`
2. Fetches `https://example.com/.well-known/nostr.json?name=bob`
3. Checks if `response.names.bob` matches your pubkey
4. If it matches, displays the verified NIP-05 identifier

## 4. Test the Setup

**Verify the JSON response:**

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

**Verify no redirects (should return 200):**

```bash
curl -sI -o /dev/null -w "%{http_code}" https://example.com/.well-known/nostr.json?name=bob
# Expected: 200 (NOT 301, 302, 307, 308)
```

**Verify the pubkey is hex format:**

```bash
curl -s https://example.com/.well-known/nostr.json?name=bob | jq -r '.names.bob' | grep -E '^[0-9a-f]{64}$'
# Should match — 64 lowercase hex characters
```

Once all tests pass, your NIP-05 verification is live. Clients will show you as
`bob@example.com`.

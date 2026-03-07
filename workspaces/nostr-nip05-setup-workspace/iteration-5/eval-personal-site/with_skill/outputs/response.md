# NIP-05 Setup for bob@example.com on Nginx

Here's the complete setup to get NIP-05 verification working for your personal
site.

## Step 1: Create the nostr.json File

Create the file at `/.well-known/nostr.json` on your server. The file path on
disk should be something like `/var/www/example.com/.well-known/nostr.json`.

**Important:** Public keys in nostr.json MUST be in **64-character lowercase
hex** format — NOT npub bech32. Your key is already in hex format, so you're
good.

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

The `names` object maps the local-part (`bob`) to your hex pubkey. The `relays`
object is recommended — it tells clients where to find your events, keyed by
your hex pubkey with an array of WebSocket relay URLs.

## Step 2: Configure Nginx

Add this location block to your Nginx server block. There are three
non-negotiable requirements:

1. **HTTPS only** — NIP-05 clients only fetch over HTTPS. HTTP will not work.
2. **CORS headers** — You MUST include `Access-Control-Allow-Origin: *` because
   browser-based Nostr clients are blocked by CORS policies without it.
3. **No redirects** — The endpoint MUST NOT return any HTTP redirects (301, 302,
   etc.). The NIP-05 spec requires fetchers to ignore redirects. This is a
   security constraint.

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    # SSL config (Let's Encrypt example)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # NIP-05: Serve nostr.json with CORS headers
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

Key Nginx details:

- Use `location =` (exact match) to prevent Nginx from issuing a trailing-slash
  redirect
- The `always` keyword ensures headers are sent even on error responses
- Place the `.well-known` directory inside your web root
  (`/var/www/example.com/.well-known/nostr.json`)

## Step 3: Update Your Kind:0 Nostr Profile

In your Nostr client (or via a tool that publishes kind:0 events), set the
`nip05` field in your profile metadata:

```json
{
  "kind": 0,
  "content": "{\"name\":\"bob\",\"nip05\":\"bob@example.com\",\"about\":\"My Nostr profile\",\"picture\":\"https://example.com/avatar.jpg\"}"
}
```

The `nip05` value is `bob@example.com`. It looks like an email address but it is
NOT an email address — it's a NIP-05 identifier that clients use to look up your
pubkey.

**How verification works:** When a client sees `"nip05": "bob@example.com"`, it:

1. Splits into local-part `bob` and domain `example.com`
2. Fetches `https://example.com/.well-known/nostr.json?name=bob`
3. Checks if `response.names.bob` matches your event's pubkey
4. If it matches, the identity is verified and displayed

## Step 4: Test the Setup

After deploying, verify everything works:

**Check the JSON response:**

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

**Check CORS headers are present:**

```bash
curl -sI https://example.com/.well-known/nostr.json?name=bob | grep -i access-control
# Expected: Access-Control-Allow-Origin: *
```

**Check for redirects (must be 200, not 3xx):**

```bash
curl -sI -o /dev/null -w "%{http_code}" https://example.com/.well-known/nostr.json?name=bob
# Expected: 200
```

**Verify the pubkey is hex format (not npub):**

```bash
curl -s https://example.com/.well-known/nostr.json?name=bob | jq -r '.names.bob' | grep -E '^[0-9a-f]{64}$'
# Should match — 64 lowercase hex characters
```

## Warnings

- **Never use npub format** in nostr.json — npub is a display format (NIP-19),
  not for the wire protocol
- **Redirects will break verification** — watch out for www→non-www redirects,
  HTTP→HTTPS redirects on the endpoint, and trailing-slash redirects
- **Local-parts must be lowercase** — only `a-z0-9-_.` characters are allowed
- If you want to be identified as just `example.com` (without the `bob@`
  prefix), use `_` as the local-part instead of `bob`

## Checklist

- [x] nostr.json created with `names` mapping bob → hex pubkey
- [x] Pubkey is 64-char lowercase hex (not npub)
- [x] Nginx configured with `location = /.well-known/nostr.json`
- [x] `Access-Control-Allow-Origin: *` header added
- [x] Served over HTTPS
- [x] No HTTP redirects on the endpoint
- [x] `relays` object included
- [x] Kind:0 profile updated with `"nip05": "bob@example.com"`
- [ ] Endpoint tested with curl and returns 200

# NIP-05 Troubleshooting: Diagnosing and Fixing Your Setup

Your NIP-05 verification has **three separate issues** that all need to be
fixed. Let me walk through each one.

## Issue 1: Uppercase Local-Part — "Alice" Must Be Lowercase

**Problem:** Your profile has `nip05` set to `Alice@MyDomain.com` and your
nostr.json uses `"Alice"` as the key. The NIP-05 spec restricts local-part
characters to `a-z0-9-_.` — **lowercase only**. Uppercase characters are not
valid.

**Why it breaks:** When a client receives your NIP-05 identifier, it normalizes
the local-part to lowercase before querying. The client will look for `alice` in
the response, but your file has `Alice` — the lookup fails.

**Fix:** Change `Alice` to `alice` everywhere:

- In the nostr.json file: change the key to `"alice"`
- In your profile: change the `nip05` field to `alice@mydomain.com` (all
  lowercase)

## Issue 2: npub Format Instead of Hex — Must Use 64-Character Hex

**Problem:** Your nostr.json contains:

```json
{
  "names": {
    "Alice": "npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv"
  }
}
```

The pubkey is in **npub** (bech32) format. NIP-05 requires pubkeys to be
**64-character lowercase hex** strings. npub is a NIP-19 display encoding used
for copy-pasting in UIs — it MUST NOT appear in nostr.json.

**Why it breaks:** Clients expect a raw hex pubkey in the `names` object to
compare against the event's pubkey field (which is always hex). An npub string
won't match anything.

**Fix:** Convert the npub to hex. Using a tool like `nak`:

```bash
nak decode npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv
```

This will output the 64-character hex pubkey. For this npub, the hex equivalent
is:

```
6869e05e7893ba31e41993e9e079de9d24b35c55fb2a9b27a12764b2c2d2bd9e
```

## Issue 3: 301 Redirect Violates the NIP-05 Spec

**Problem:** When you curl the endpoint, you get a `301` redirect from
`https://mydomain.com/.well-known/nostr.json` to
`https://www.mydomain.com/.well-known/nostr.json`.

**Why it breaks:** The NIP-05 spec explicitly states that fetchers MUST NOT
follow redirects. HTTP redirects (301, 302, 307, 308) are a security violation
in this context — a redirect could be used to point to a malicious server that
maps a different pubkey. Clients that follow the spec will ignore the redirect
and verification fails.

**Fix:** Configure your server to serve the nostr.json file directly without any
redirects. The issue is likely a server rule that redirects the bare domain to
`www`.

### Nginx Fix

If you're using Nginx, ensure the `mydomain.com` server block serves the file
directly:

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    # Serve nostr.json directly — NO redirect to www
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;
        root /var/www/mydomain.com;
    }

    # Rest of site can redirect to www if you want, but
    # .well-known/nostr.json must be served directly
}
```

The key is the `location =` exact match block, which should be placed BEFORE any
general redirect rules. This ensures the nostr.json endpoint is handled directly
even if the rest of the site redirects to `www`.

### Apache Fix

```apache
<VirtualHost *:443>
    ServerName mydomain.com

    # Serve nostr.json BEFORE any redirect rules
    <Location "/.well-known/nostr.json">
        Header set Access-Control-Allow-Origin "*"
        Header set Content-Type "application/json"
    </Location>

    # If you have a general redirect to www, exclude .well-known:
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/\.well-known/
    RewriteRule ^(.*)$ https://www.mydomain.com$1 [R=301,L]
</VirtualHost>
```

## The Corrected nostr.json

```json
{
  "names": {
    "alice": "6869e05e7893ba31e41993e9e079de9d24b35c55fb2a9b27a12764b2c2d2bd9e"
  },
  "relays": {
    "6869e05e7893ba31e41993e9e079de9d24b35c55fb2a9b27a12764b2c2d2bd9e": [
      "wss://relay.damus.io",
      "wss://nos.lol"
    ]
  }
}
```

Changes made:

1. `"Alice"` → `"alice"` (lowercase)
2. npub → 64-character hex pubkey
3. Added `relays` object (recommended)

## The Corrected Profile

Update your kind:0 profile `nip05` field to:

```
alice@mydomain.com
```

Note: the entire identifier is lowercase — both the local-part and the domain.

The kind:0 event content should look like:

```json
{
  "name": "Alice",
  "nip05": "alice@mydomain.com",
  "about": "..."
}
```

## Also Check: CORS Header

Make sure your server includes the `Access-Control-Allow-Origin: *` header on
the response. Without this CORS header, browser-based Nostr clients silently
fail to verify. This header is mandatory for NIP-05.

Verify with:

```bash
curl -sI https://mydomain.com/.well-known/nostr.json | grep -i access-control
# Expected: Access-Control-Allow-Origin: *
```

## Verification Checklist

After applying all fixes, test:

```bash
# 1. Check no redirect (should return 200, NOT 301)
curl -sI -o /dev/null -w "%{http_code}" https://mydomain.com/.well-known/nostr.json
# Expected: 200

# 2. Check the JSON response has lowercase + hex
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq .

# 3. Verify the pubkey is 64-char hex
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq -r '.names.alice' | grep -E '^[0-9a-f]{64}$'

# 4. Verify CORS header
curl -sI https://mydomain.com/.well-known/nostr.json | grep -i access-control

# 5. Verify no redirect from bare domain
curl -sI https://mydomain.com/.well-known/nostr.json | grep -i location
# Should return nothing (no Location header = no redirect)
```

## Summary of All Three Fixes

| Issue                | Problem                                             | Fix                                                                 |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Uppercase local-part | `Alice` is invalid — spec requires `a-z0-9-_.`      | Change to `alice` in nostr.json and profile                         |
| npub pubkey format   | npub is NIP-19 display encoding, not for nostr.json | Convert to 64-character hex                                         |
| 301 redirect         | NIP-05 spec says fetchers MUST ignore redirects     | Serve directly, configure server to not redirect `.well-known` path |

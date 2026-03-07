# NIP-05 Troubleshooting: Three Problems Found

Your NIP-05 setup has **three separate issues** that all need to be fixed. Let
me diagnose each one.

---

## Problem 1: Uppercase Local-Part

**What's wrong:** Your profile has `nip05` set to `Alice@MyDomain.com`, and your
nostr.json uses `"Alice"` as the key. NIP-05 requires the local-part to contain
only `a-z0-9-_.` — lowercase only. Uppercase characters are not allowed.

**Fix:** Change `Alice` to `alice` everywhere:

- In your nostr.json file: the key must be `"alice"`, not `"Alice"`
- In your kind:0 profile: the nip05 value must be `alice@mydomain.com` (all
  lowercase)

---

## Problem 2: npub Instead of Hex Pubkey

**What's wrong:** Your nostr.json contains
`"npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv"` as the
pubkey value. This is the **npub bech32 display format** (NIP-19) — it is NOT
the correct format for nostr.json.

NIP-05 requires pubkeys to be **64-character lowercase hex strings**. npub is
only for displaying keys to humans in client UIs.

**Fix:** Convert your npub to hex format. You can use a tool like `nak`:

```bash
nak decode npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv
```

This will give you the 64-character hex pubkey, which looks something like:

```
6835e0178e276a8c7903339e81e77a4e9669ae2bf2ca9b2f412e5922c2d2bd9e
```

(Use the actual output from `nak decode` — the above is illustrative.)

Replace the npub in your nostr.json with this hex value.

---

## Problem 3: 301 Redirect

**What's wrong:** When you curl the endpoint, you get a `301 redirect` from
`https://mydomain.com/.well-known/nostr.json` to
`https://www.mydomain.com/.well-known/nostr.json`. This is a **NIP-05 spec
violation**.

The NIP-05 spec explicitly states that fetchers MUST NOT follow redirects. HTTP
redirects (301, 302, 307, 308) are a security risk in this context — a redirect
could point to a malicious server that returns a different pubkey. Clients that
correctly implement NIP-05 will see the 301 and treat it as a failure.

**Fix:** Configure your web server to serve the nostr.json directly at
`https://mydomain.com/.well-known/nostr.json` without any redirect. The redirect
is likely a www→non-www redirect rule in your server config.

For **Nginx**, ensure you have an exact-match location block in the
`mydomain.com` server block (not the `www.mydomain.com` block):

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    # Serve nostr.json directly — no redirect
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;

        root /var/www/mydomain.com;
    }

    # If you have a general www redirect, exclude .well-known
    # Or better: serve .well-known from both domains
}
```

If you're using **Apache**, make sure your rewrite rules don't apply to
`.well-known`:

```apache
RewriteEngine On
# Exclude .well-known from www redirect
RewriteCond %{REQUEST_URI} !^/\.well-known/
RewriteRule ^(.*)$ https://www.mydomain.com/$1 [R=301,L]
```

---

## Corrected nostr.json

After fixing all three issues, your nostr.json should look like this:

```json
{
  "names": {
    "alice": "6835e0178e276a8c7903339e81e77a4e9669ae2bf2ca9b2f412e5922c2d2bd9e"
  },
  "relays": {
    "6835e0178e276a8c7903339e81e77a4e9669ae2bf2ca9b2f412e5922c2d2bd9e": [
      "wss://relay.damus.io",
      "wss://nos.lol"
    ]
  }
}
```

Note:

- `alice` is lowercase (not `Alice`)
- The pubkey is a 64-character lowercase hex string (not npub)
- The relays object is included (recommended)

## Corrected Profile

Update your kind:0 profile metadata to:

```json
{
  "nip05": "alice@mydomain.com"
}
```

The full `nip05` value must be all lowercase: `alice@mydomain.com` (not
`Alice@MyDomain.com`). The domain part is case-insensitive in DNS, but the
convention is lowercase throughout.

## CORS Headers

One more thing to verify: make sure your server includes the
`Access-Control-Allow-Origin: *` header on the nostr.json response. This is
required for browser-based Nostr clients to fetch the file. Without it,
verification silently fails in web clients.

## Verification Commands

After applying all fixes, verify everything works:

```bash
# Check the response is correct JSON with lowercase alice and hex pubkey
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq .

# Check CORS headers are present
curl -sI https://mydomain.com/.well-known/nostr.json | grep -i access-control
# Expected: Access-Control-Allow-Origin: *

# Check no redirect (must be 200, not 301)
curl -sI -o /dev/null -w "%{http_code}" https://mydomain.com/.well-known/nostr.json
# Expected: 200

# Verify pubkey is 64-char hex
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq -r '.names.alice' | grep -E '^[0-9a-f]{64}$'
```

## Summary of Fixes

| Issue           | Before                          | After                            |
| --------------- | ------------------------------- | -------------------------------- |
| Local-part case | `Alice`                         | `alice`                          |
| Pubkey format   | `npub1dp4rcz7...` (npub/bech32) | `6835e017...` (64-char hex)      |
| HTTP redirect   | 301 → www subdomain             | Direct 200 response, no redirect |
| Profile nip05   | `Alice@MyDomain.com`            | `alice@mydomain.com`             |
| CORS header     | (verify it's set)               | `Access-Control-Allow-Origin: *` |

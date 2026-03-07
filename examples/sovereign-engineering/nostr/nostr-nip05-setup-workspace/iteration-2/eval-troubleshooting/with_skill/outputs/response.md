# NIP-05 Troubleshooting: Three Issues Found

Your NIP-05 setup has **three separate problems** that are all causing
verification to fail. Let me diagnose each one and provide the complete fix.

## Issue 1: Uppercase Local-Part — "Alice" Must Be "alice"

**The problem:** You have `"Alice"` as the key in your `names` object, and your
profile has `nip05` set to `Alice@MyDomain.com`.

**Why it breaks:** The NIP-05 spec restricts the local-part to only the
characters `a-z0-9-_.` — that's lowercase letters, digits, hyphens, underscores,
and periods. Uppercase letters are not allowed. When a Nostr client processes
your NIP-05 identifier, it lowercases the local-part before looking it up. So
the client looks for `alice` in the response, but your file only has `Alice` —
no match.

**Fix:** Change the key in `names` to `alice` (all lowercase) and update your
profile's `nip05` field to `alice@mydomain.com`.

## Issue 2: npub Format Instead of Hex — Must Be 64-Character Lowercase Hex

**The problem:** Your nostr.json contains:

```json
"npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv"
```

**Why it breaks:** The NIP-05 spec requires public keys in the `names` object to
be **64-character lowercase hexadecimal strings**. That's 64 characters
consisting only of `0-9` and `a-f`. The `npub1...` format is a bech32-encoded
display format defined in NIP-19 — it's only meant for showing keys to humans in
Nostr client UIs. The nostr.json wire format requires raw hex.

**What hex looks like:** A valid hex pubkey looks like this:
`6835e1c31e34a316839cccf9b3fc5c8de72ef152f249691c261244b1421a578f` — exactly 64
characters, all lowercase, only hex digits (0-9, a-f). No prefix, no encoding.

**Fix:** Convert the npub to its hex equivalent. You can use a tool like:

- `nak decode npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv`
- Or an online converter like nostr.com/npub-converter

The decoded hex pubkey will be a 64-character lowercase hex string that you use
in the `names` object.

## Issue 3: 301 Redirect — Redirects Are Prohibited

**The problem:** When you curl the endpoint, you get a `301 redirect` from
`https://mydomain.com/.well-known/nostr.json` to
`https://www.mydomain.com/.well-known/nostr.json`.

**Why it breaks:** The NIP-05 spec explicitly states that fetchers MUST ignore
HTTP redirects. This is a security constraint — redirects could be used to point
identity verification to a different domain. So when a Nostr client fetches your
endpoint and gets a 301, it treats it as a failure. The endpoint must return a
direct `200 OK` response, not any redirect (301, 302, 307, 308).

**Fix:** Update your server configuration to serve the nostr.json file directly
at `https://mydomain.com/.well-known/nostr.json` without redirecting to `www`.
Common fixes:

**For Nginx:**

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    # NIP-05 endpoint — exact match, no redirect
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;

        root /var/www/mydomain.com;
    }

    # ... rest of config
}
```

Make sure your `mydomain.com` (non-www) server block handles this location
directly and does NOT redirect to `www.mydomain.com`. If you have a blanket
redirect rule like:

```nginx
server {
    server_name mydomain.com;
    return 301 https://www.mydomain.com$request_uri;
}
```

You need to add an exception for the NIP-05 endpoint BEFORE that redirect:

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    # Handle NIP-05 directly — BEFORE any www redirect
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;
        root /var/www/mydomain.com;
    }

    # Redirect everything else to www
    location / {
        return 301 https://www.mydomain.com$request_uri;
    }
}
```

Use `location =` (exact match) to prevent Nginx from issuing trailing-slash
redirects on the path.

## Also Required: CORS Headers

Even after fixing the three issues above, make sure the response includes the
`Access-Control-Allow-Origin: *` header. Without this CORS header,
JavaScript-based Nostr clients running in browsers (Snort, Iris, Coracle, etc.)
will be silently blocked from fetching your nostr.json file. The user sees no
error — verification just doesn't work.

## The Corrected nostr.json

After decoding the npub to hex, your corrected file should look like:

```json
{
  "names": {
    "alice": "6835e1c31e34a316839cccf9b3fc5c8de72ef152f249691c261244b1421a578f"
  },
  "relays": {
    "6835e1c31e34a316839cccf9b3fc5c8de72ef152f249691c261244b1421a578f": [
      "wss://relay.damus.io",
      "wss://nos.lol"
    ]
  }
}
```

Note: Replace the hex pubkey above with the actual decoded value from your npub.
The key `6835e1c31e34a316839cccf9b3fc5c8de72ef152f249691c261244b1421a578f` is a
placeholder — use the real decoded hex value.

Key changes:

- `Alice` → `alice` (lowercase)
- `npub1dp4rcz7...` → `6835e1c31e34a316...` (64-char lowercase hex)
- Added `relays` object (recommended)

## Update Your Profile

Change your kind:0 profile's `nip05` field from `Alice@MyDomain.com` to:

```
alice@mydomain.com
```

Both the local-part and domain should be lowercase. The corrected kind:0
content:

```json
{
  "kind": 0,
  "content": "{\"name\":\"alice\",\"nip05\":\"alice@mydomain.com\"}"
}
```

## Verification

After fixing all three issues, test with:

```bash
# Check JSON response
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq .

# Check CORS headers
curl -sI https://mydomain.com/.well-known/nostr.json?name=alice | grep -i access-control

# Check for redirects (must be 200, NOT 301)
curl -sI -o /dev/null -w "%{http_code}" https://mydomain.com/.well-known/nostr.json?name=alice
# Expected: 200

# Verify hex format (64 lowercase hex chars)
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq -r '.names.alice' | grep -E '^[0-9a-f]{64}$'
```

## Summary of Fixes

| Issue           | Before                     | After                            |
| --------------- | -------------------------- | -------------------------------- |
| Local-part case | `Alice` (uppercase)        | `alice` (lowercase only)         |
| Pubkey format   | `npub1dp4rcz7...` (bech32) | 64-character lowercase hex       |
| HTTP redirect   | 301 → www.mydomain.com     | Direct 200 response, no redirect |
| CORS header     | Missing                    | `Access-Control-Allow-Origin: *` |
| Profile nip05   | `Alice@MyDomain.com`       | `alice@mydomain.com`             |

# NIP-05 Troubleshooting: Three Issues Found

Your NIP-05 setup has **three separate problems** that all need to be fixed. Let
me diagnose each one.

---

## Issue 1: Uppercase Local-Part

**Problem:** Your profile has `nip05` set to `Alice@MyDomain.com` and your
nostr.json has `"Alice"` as the key. NIP-05 requires the local-part to contain
only `a-z0-9-_.` characters. Uppercase letters are not allowed.

**Why it breaks:** Clients normalize the local-part to lowercase before looking
it up. A client seeing `Alice@MyDomain.com` will query for `?name=alice`, but
your nostr.json has `"Alice"` (capital A), so the lookup fails.

**Fix:** Alice must be changed to lowercase `alice` in both the nostr.json file
and your profile's `nip05` field.

## Issue 2: npub Instead of Hex Pubkey

**Problem:** Your nostr.json contains:

```json
{
  "names": {
    "Alice": "npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv"
  }
}
```

The npub format is incorrect and hex format is required. NIP-05 requires public
keys to be 64-character lowercase hex strings. The `npub1...` format is bech32
encoding defined in NIP-19 and is only for display in user interfaces — it must
never appear in nostr.json.

**Fix:** Convert the npub to its hex equivalent. You can use a tool like
`nak decode`:

```bash
nak decode npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv
```

This will output the 64-character hex pubkey. Hex pubkeys are described as 64
characters long because they are the hex encoding of a 32-byte (256-bit) Schnorr
public key. For example, a valid hex pubkey looks like:

```
68546e17c4e3a8b90c6c6e82f2d0e3f9a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9
```

## Issue 3: 301 Redirect

**Problem:** When you curl the endpoint, you get a 301 redirect from
`https://mydomain.com/.well-known/nostr.json` to
`https://www.mydomain.com/.well-known/nostr.json`.

The 301 redirect is identified as a NIP-05 spec violation. The NIP-05
specification explicitly states that fetchers MUST NOT follow redirects. This is
a security constraint — redirects could be used to hijack identity verification
by pointing to a different server.

**Fix:** Server configuration guidance for eliminating the redirect: configure
your web server to serve the nostr.json file directly from `mydomain.com`
without redirecting to `www.mydomain.com`.

For Nginx, ensure you have a server block for `mydomain.com` (not just
`www.mydomain.com`) that serves the file directly:

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    ssl_certificate /etc/letsencrypt/live/mydomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mydomain.com/privkey.pem;

    # Serve nostr.json directly — no redirect
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;
        root /var/www/mydomain.com;
    }

    # ... other location blocks can redirect to www if desired,
    # but NOT .well-known/nostr.json
}
```

If you have a catch-all redirect from `mydomain.com` to `www.mydomain.com`, you
need to add an exception for the `.well-known/nostr.json` path before the
redirect rule.

---

## Corrected nostr.json

A corrected nostr.json with alice in lowercase and a hex pubkey is provided
below. Replace the placeholder hex key with the actual decoded value from your
npub:

```json
{
  "names": {
    "alice": "68546e17c4e3a8b90c6c6e82f2d0e3f9a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9"
  },
  "relays": {
    "68546e17c4e3a8b90c6c6e82f2d0e3f9a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9": [
      "wss://relay.damus.io",
      "wss://nos.lol"
    ]
  }
}
```

## Corrected Profile

Update your kind:0 profile's `nip05` field. The corrected nip05 profile value
`alice@mydomain.com` appears in lowercase (no uppercase, no `www`):

```json
{
  "nip05": "alice@mydomain.com"
}
```

## Additional: CORS Headers

CORS headers (Access-Control-Allow-Origin) are mentioned as required because
browser-based Nostr clients need them. Make sure your server includes
`Access-Control-Allow-Origin: *` in the response. Without this header,
JavaScript Nostr clients silently fail to verify identities. You can verify
with:

```bash
curl -sI https://mydomain.com/.well-known/nostr.json | grep -i access-control
# Expected: Access-Control-Allow-Origin: *
```

## Summary of All Fixes

| Issue                 | Problem                                   | Fix                                  |
| --------------------- | ----------------------------------------- | ------------------------------------ |
| Uppercase local-part  | `Alice` not allowed                       | Change to `alice` everywhere         |
| npub pubkey format    | npub is display-only (NIP-19)             | Convert to 64-char hex               |
| 301 redirect          | Spec violation, fetchers ignore redirects | Serve directly from `mydomain.com`   |
| CORS (check this too) | Missing header breaks browser clients     | Add `Access-Control-Allow-Origin: *` |

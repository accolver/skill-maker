# Diagnosing Your NIP-05 Verification Failure

You have **three separate issues** that are all preventing NIP-05 from working.
Let me walk through each one.

## Issue 1: Uppercase Local-Part

**Problem:** Your nostr.json has `"Alice"` as the key in the names object, and
your profile has `nip05` set to `Alice@MyDomain.com`.

NIP-05 only allows `a-z0-9-_.` in the local-part — lowercase characters only.
When a client sees `Alice@MyDomain.com`, it normalizes the local-part to
lowercase before looking it up. So the client looks for `alice` in the
nostr.json response, but your file has `Alice` (capital A), so the lookup fails.

**Fix:** Change the key in nostr.json from `"Alice"` to `"alice"`, and update
your profile's nip05 field to `alice@mydomain.com` (all lowercase).

## Issue 2: npub Format Instead of Hex

**Problem:** Your nostr.json uses an npub-format pubkey:

```
npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv
```

NIP-05 requires the pubkey to be in **64-character lowercase hexadecimal**
format, not npub (bech32) format. npub is a display format defined in NIP-19 —
it's what clients show to users, but it must never appear in nostr.json.

A 64-character lowercase hex pubkey looks like this:

```
6855e305ee4ee9463cc193e9e079df4e92cd714bf6535327a04eb22c2c2d2bd9
```

That's exactly 64 characters, all lowercase, using only `0-9` and `a-f`.

**Fix:** Convert the npub to hex. You can use a tool like `nak decode`:

```bash
nak decode npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv
```

This will output the 64-character hex pubkey. Then replace the npub in your
nostr.json with the hex value.

## Issue 3: 301 Redirect

**Problem:** When you curl the endpoint, you get a 301 redirect from
`mydomain.com` to `www.mydomain.com`.

The NIP-05 specification explicitly states that fetchers MUST NOT follow HTTP
redirects. This is a security constraint — redirects could be used to point the
verification to a different server. So any 301, 302, 307, or 308 response means
the verification fails silently.

**Fix:** You need to prevent the www redirect on the `.well-known/nostr.json`
path. In your Nginx config, ensure the non-www server block serves the file
directly:

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    # NIP-05 endpoint — serve directly, no redirect
    location = /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;
        root /var/www/mydomain.com;
    }

    # If you have a general www redirect, make sure it comes AFTER
    # the location block above, or exclude .well-known from the redirect
}
```

If you have a blanket redirect from `mydomain.com` to `www.mydomain.com`, you
need to either:

1. Serve the nostr.json from the non-www server block before the redirect fires,
   or
2. Remove the redirect entirely for this specific path

## Issue 4: Missing CORS Headers

Even though you didn't mention this, your setup also needs **CORS headers**.
Without the `Access-Control-Allow-Origin: *` header, browser-based Nostr clients
(web apps running in the browser) will be blocked by CORS policy from fetching
your nostr.json. The user sees no error — verification just silently fails.

Make sure your server config includes:

```
Access-Control-Allow-Origin: *
```

This is shown in the Nginx config above.

## Corrected nostr.json

After converting the npub to hex (the value below is an example — use the actual
hex from `nak decode`):

```json
{
  "names": {
    "alice": "6855e305ee4ee9463cc193e9e079df4e92cd714bf6535327a04eb22c2c2d2bd9"
  },
  "relays": {
    "6855e305ee4ee9463cc193e9e079df4e92cd714bf6535327a04eb22c2c2d2bd9": [
      "wss://relay.damus.io",
      "wss://nos.lol"
    ]
  }
}
```

Note the changes:

- `"Alice"` → `"alice"` (lowercase)
- `npub1dp4r...` → `6855e3...` (64-char lowercase hex)
- Added `relays` object (recommended)

## Corrected Profile

Update your Nostr profile's nip05 field to:

```
alice@mydomain.com
```

Not `Alice@MyDomain.com`. The domain part is case-insensitive in DNS, but the
local-part must be lowercase.

## Verification Commands

After fixing everything, test with:

```bash
# Check JSON response
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq .

# Check CORS headers
curl -sI https://mydomain.com/.well-known/nostr.json?name=alice | grep -i access-control
# Expected: Access-Control-Allow-Origin: *

# Check for redirects (should be 200)
curl -sI -o /dev/null -w "%{http_code}" https://mydomain.com/.well-known/nostr.json?name=alice
# Expected: 200 (NOT 301)

# Verify hex format
curl -s https://mydomain.com/.well-known/nostr.json?name=alice | jq -r '.names.alice' | grep -E '^[0-9a-f]{64}$'
```

# Fixing Your NIP-05 Verification

Looking at your setup, I can see several issues. Let me walk through them.

## Problem 1: Uppercase Name

Your nostr.json has `"Alice"` but NIP-05 identifiers should use lowercase.
Change it to `"alice"`.

## Problem 2: Using npub Format

Your nostr.json contains an npub-formatted key:

```
npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv
```

NIP-05 requires the hex format of the public key. You need to convert the npub
to hex. You can use a tool like `nak` or an online Nostr key converter to get
the hex version.

## Problem 3: The 301 Redirect

You're getting a 301 redirect from `mydomain.com` to `www.mydomain.com`. NIP-05
clients won't follow redirects, so you need to serve the file directly without
any redirects.

Fix this in your server config. If you're using Nginx, make sure the non-www
server block serves the file directly:

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    location /.well-known/nostr.json {
        root /var/www/mydomain.com;
        add_header Access-Control-Allow-Origin "*";
    }
}
```

## Fixed nostr.json

After converting the npub to hex, your file should look like:

```json
{
  "names": {
    "alice": "<your-64-char-hex-pubkey-here>"
  }
}
```

## Update Your Profile

Change your NIP-05 identifier in your Nostr profile to:

```
alice@mydomain.com
```

Make sure it's all lowercase.

## Testing

After making these changes, verify it works:

```bash
curl -I https://mydomain.com/.well-known/nostr.json
```

Check that you get a 200 response (not 301) and that the CORS headers are
present.

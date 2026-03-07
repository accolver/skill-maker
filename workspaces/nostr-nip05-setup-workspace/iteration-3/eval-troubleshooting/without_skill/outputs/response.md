# Fixing NIP-05 Verification Issues

Looking at your setup, I can see a couple of problems.

## Problem 1: Case Sensitivity

Your nostr.json has `"Alice"` as the key, but NIP-05 identifiers should
generally be lowercase. Change it to `"alice"` in both your nostr.json file and
your profile.

## Problem 2: Redirect Issue

You're getting a 301 redirect from `mydomain.com` to `www.mydomain.com`. This
means the nostr.json file is being served from the www subdomain instead of
directly. You need to either:

1. Update your DNS/server to serve the file from the bare domain without
   redirecting
2. Or update your NIP-05 identifier to use the www subdomain

The easiest fix is to configure your web server to serve `.well-known` paths
directly without the www redirect.

For Nginx, something like:

```nginx
server {
    server_name mydomain.com;

    location /.well-known/ {
        root /var/www/mydomain.com;
    }

    # redirect everything else to www
    location / {
        return 301 https://www.mydomain.com$request_uri;
    }
}
```

## Problem 3: Public Key Format

I notice your public key is in npub format. You may want to double-check that
this is the correct format for the nostr.json file. Some implementations expect
the hex format instead.

## Corrected nostr.json

```json
{
  "names": {
    "alice": "npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv"
  }
}
```

## Updated Profile

Set your NIP-05 to:

```
alice@mydomain.com
```

After making these changes, test by visiting
`https://mydomain.com/.well-known/nostr.json` in your browser to make sure you
get the JSON response directly without being redirected.

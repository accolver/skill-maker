# Fixing Your NIP-05 Verification

There are a couple of issues with your setup:

## Issue 1: Case Sensitivity

Your NIP-05 identifier uses `Alice@MyDomain.com` but NIP-05 identifiers should
generally be lowercase. Change it to `alice@mydomain.com` in your profile.

Also update your nostr.json to use `alice` instead of `Alice`:

```json
{
  "names": {
    "alice": "npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv"
  }
}
```

## Issue 2: The Redirect

The 301 redirect from `mydomain.com` to `www.mydomain.com` could be causing
issues. You should configure your server to serve the nostr.json from the
non-www domain directly, or update your NIP-05 identifier to use
`www.mydomain.com`.

To fix in Nginx, make sure the `mydomain.com` server block serves the file:

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    location /.well-known/nostr.json {
        root /var/www/mydomain.com;
    }
}
```

## After Fixing

Update your profile's NIP-05 to `alice@mydomain.com` and make sure the
nostr.json file is accessible at `https://mydomain.com/.well-known/nostr.json`.

Test by visiting the URL in your browser to confirm the JSON is returned
correctly.

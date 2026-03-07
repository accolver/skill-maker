# NIP-05 Troubleshooting

Looking at your setup, I can see a couple of issues.

## Issue 1: Case Sensitivity

Your nostr.json has `"Alice"` with a capital A. NIP-05 identifiers should be
case-insensitive, but it's best practice to use lowercase. Change `Alice` to
`alice` in your nostr.json file and update your profile to use
`alice@mydomain.com`.

## Issue 2: The Redirect Problem

You're getting a 301 redirect from `mydomain.com` to `www.mydomain.com`. This
means your server is redirecting requests. NIP-05 clients may not follow
redirects, so you should serve the file directly.

To fix this in your web server, make sure `mydomain.com` serves the nostr.json
file directly instead of redirecting to the www version. If you're using Nginx:

```nginx
server {
    listen 443 ssl;
    server_name mydomain.com;

    location /.well-known/nostr.json {
        root /var/www/mydomain.com;
    }
}
```

## Corrected nostr.json

```json
{
  "names": {
    "alice": "npub1dp4rcz7ufm4rrequena8s8nh5aykdw9t7e2dj0gya9j9sskjhk0qdjd0lv"
  }
}
```

## Corrected Profile

Update your NIP-05 in your Nostr client profile settings to:

```
alice@mydomain.com
```

After making these changes, test by curling the endpoint:

```bash
curl https://mydomain.com/.well-known/nostr.json
```

You should see the JSON response with the correct data and no redirect.

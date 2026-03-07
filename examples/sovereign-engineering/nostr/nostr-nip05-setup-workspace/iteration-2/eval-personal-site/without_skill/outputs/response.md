# Setting Up NIP-05 Verification for bob@example.com

NIP-05 allows you to map a human-readable identifier to your Nostr public key
using DNS. Here's how to set it up on your Nginx server.

## 1. Create the nostr.json File

Create the file at `.well-known/nostr.json` in your web root:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  }
}
```

This maps the name `bob` to your hex public key. Make sure to use the hex format
of your public key (the 64-character string you provided), not the npub format.

## 2. Configure Nginx

Add a location block to serve the nostr.json file with proper headers:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin *;
        default_type application/json;
        root /var/www/example.com;
    }

    # rest of your config...
}
```

The `Access-Control-Allow-Origin: *` header is important because Nostr clients
running in web browsers need CORS access to fetch this file.

Make sure your site is served over HTTPS — NIP-05 requires it.

Reload Nginx after making changes:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Update Your Nostr Profile

In your Nostr client, go to your profile settings and set the NIP-05 /
verification field to:

```
bob@example.com
```

This will update your kind:0 metadata event to include:

```json
{
  "nip05": "bob@example.com"
}
```

## 4. Test It

Verify the endpoint works:

```bash
curl https://example.com/.well-known/nostr.json?name=bob
```

You should see the JSON response with your name and public key mapping.

## How It Works

When a Nostr client sees your NIP-05 identifier `bob@example.com`, it:

1. Takes the domain part (`example.com`)
2. Fetches `https://example.com/.well-known/nostr.json?name=bob`
3. Checks if the pubkey in the response matches your actual pubkey
4. If it matches, it shows the verified NIP-05 identifier on your profile

That's it! Once set up, other users will see your verified identifier in their
Nostr clients.

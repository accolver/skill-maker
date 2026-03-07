# Setting Up NIP-05 Verification on Nginx

## 1. Create the nostr.json File

NIP-05 works by serving a JSON file at a well-known path on your domain. Create
the file at `.well-known/nostr.json`:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  }
}
```

This maps the name `bob` to your public key.

## 2. Nginx Configuration

Add a location block to your Nginx config to serve the file:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location /.well-known/nostr.json {
        root /var/www/example.com;
        default_type application/json;
    }
}
```

Make sure SSL is configured since Nostr clients expect HTTPS.

## 3. Update Your Profile

In your Nostr client, go to profile settings and set the NIP-05 identifier field
to:

```
bob@example.com
```

This tells clients where to look up your identity verification.

## 4. Testing

You can test it by visiting the URL in your browser:

```
https://example.com/.well-known/nostr.json?name=bob
```

You should see the JSON response with your public key.

You can also use curl:

```bash
curl https://example.com/.well-known/nostr.json?name=bob
```

That should return the JSON with your mapping. Once this is working, clients
will show a verified checkmark next to your name.

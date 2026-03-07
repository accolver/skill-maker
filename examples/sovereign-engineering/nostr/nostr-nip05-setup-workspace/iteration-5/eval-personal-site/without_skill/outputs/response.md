# Setting Up NIP-05 Verification on Nginx

## Create the nostr.json File

NIP-05 maps human-readable identifiers to Nostr public keys. Create a file at
`.well-known/nostr.json` on your server:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  }
}
```

Place this file at `/var/www/example.com/.well-known/nostr.json`.

## Nginx Configuration

Add a location block to serve the file:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location /.well-known/nostr.json {
        root /var/www/example.com;
    }
}
```

## Update Your Profile

In your Nostr client, go to your profile settings and set the NIP-05 field to:

```
bob@example.com
```

This tells other clients to look up your pubkey at `example.com`.

## Testing

You can test it by opening the URL in your browser:

```
https://example.com/.well-known/nostr.json?name=bob
```

Make sure the JSON is returned correctly with your public key.

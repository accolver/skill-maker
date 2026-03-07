# Setting Up NIP-05 Verification for bob@example.com

NIP-05 allows you to associate your Nostr public key with a domain name, giving
you a human-readable identifier.

## Step 1: Create the nostr.json File

Create the file at `.well-known/nostr.json` on your server:

```bash
mkdir -p /var/www/example.com/.well-known
```

Add this content to `nostr.json`:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  }
}
```

This maps the username `bob` to your public key.

## Step 2: Nginx Configuration

Add a location block to your Nginx config to serve the file:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    location /.well-known/nostr.json {
        root /var/www/example.com;
        default_type application/json;
    }
}
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

## Step 3: Update Your Nostr Profile

In your Nostr client, go to your profile settings and set the NIP-05 field to:

```
bob@example.com
```

This tells clients to look up your verification at `example.com`.

## Step 4: Verify

You can test it by visiting:

```
https://example.com/.well-known/nostr.json?name=bob
```

You should see the JSON response with your public key.

That's it! Clients will now show a verified checkmark next to your name.

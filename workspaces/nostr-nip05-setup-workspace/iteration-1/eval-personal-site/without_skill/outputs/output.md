# Setting Up NIP-05 on Your Nginx Server

## Step 1: Create the nostr.json file

Create the directory and file:

```bash
sudo mkdir -p /var/www/example.com/.well-known
```

Create `/var/www/example.com/.well-known/nostr.json`:

```json
{
  "names": {
    "bob": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9"
  }
}
```

## Step 2: Configure Nginx

Add this to your Nginx server block:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location /.well-known/nostr.json {
        add_header Access-Control-Allow-Origin "*";
        root /var/www/example.com;
    }
}
```

Then reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Step 3: Update Your Nostr Profile

In your Nostr client's profile settings, set the NIP-05 field to:

```
bob@example.com
```

This tells clients to look up your pubkey at
`https://example.com/.well-known/nostr.json`.

## Step 4: Test

You can test with curl:

```bash
curl https://example.com/.well-known/nostr.json
```

You should see your nostr.json content returned. That's it — clients will now
verify your NIP-05 identity.

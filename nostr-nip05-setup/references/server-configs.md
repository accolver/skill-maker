# Server Configuration Examples for NIP-05

Ready-to-use configurations for serving `/.well-known/nostr.json` with correct
CORS headers and no redirects.

## Nginx

### Static file

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    # SSL config (Let's Encrypt example)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Serve nostr.json with CORS headers
    location = /.well-known/nostr.json {
        # Use exact match (=) to prevent trailing-slash redirects
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET" always;
        add_header Content-Type "application/json" always;

        # Serve from filesystem
        root /var/www/example.com;
    }
}
```

Key points:

- Use `location =` (exact match) to prevent Nginx from redirecting
- `always` ensures headers are sent even on error responses
- Place the `.well-known` directory inside your web root

### Reverse proxy to dynamic server

```nginx
location = /.well-known/nostr.json {
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET" always;
    proxy_pass http://127.0.0.1:3000/.well-known/nostr.json;
    proxy_set_header Host $host;
}
```

## Apache

### Static file with .htaccess

Create `.well-known/.htaccess`:

```apache
<IfModule mod_headers.c>
    <Files "nostr.json">
        Header set Access-Control-Allow-Origin "*"
        Header set Access-Control-Allow-Methods "GET"
        Header set Content-Type "application/json"
    </Files>
</IfModule>
```

### Virtual host config

```apache
<VirtualHost *:443>
    ServerName example.com

    # Ensure no redirect on .well-known
    <Location "/.well-known/nostr.json">
        Header set Access-Control-Allow-Origin "*"
        Header set Access-Control-Allow-Methods "GET"
    </Location>

    # Prevent directory listing redirect
    <Directory "/var/www/example.com/.well-known">
        Options -Indexes
        AllowOverride None
    </Directory>
</VirtualHost>
```

## Caddy

Caddy automatically provisions HTTPS via Let's Encrypt.

### Caddyfile (static)

```caddyfile
example.com {
    handle /.well-known/nostr.json {
        header Access-Control-Allow-Origin "*"
        header Access-Control-Allow-Methods "GET"
        header Content-Type "application/json"
        file_server
    }

    # Rest of site
    file_server
}
```

### Caddyfile (reverse proxy)

```caddyfile
example.com {
    handle /.well-known/nostr.json {
        header Access-Control-Allow-Origin "*"
        reverse_proxy localhost:3000
    }
}
```

## Node.js / Express

### Minimal dynamic server

```javascript
const express = require("express");
const app = express();

// NIP-05 database (replace with your data source)
const users = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.example.com", "wss://relay2.example.com"],
  },
  _: {
    pubkey: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    relays: ["wss://relay.example.com"],
  },
};

app.get("/.well-known/nostr.json", (req, res) => {
  // CORS header — required for browser-based Nostr clients
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");

  const name = (req.query.name || "").toLowerCase();

  // Validate local-part characters
  if (name && !/^[a-z0-9\-_.]+$/.test(name)) {
    return res.status(400).json({ error: "Invalid name format" });
  }

  const result = { names: {}, relays: {} };

  if (name && users[name]) {
    // Return only the requested user
    result.names[name] = users[name].pubkey;
    if (users[name].relays) {
      result.relays[users[name].pubkey] = users[name].relays;
    }
  } else if (!name) {
    // No name parameter — return all users
    for (const [n, data] of Object.entries(users)) {
      result.names[n] = data.pubkey;
      if (data.relays) {
        result.relays[data.pubkey] = data.relays;
      }
    }
  }

  res.json(result);
});

// Handle OPTIONS preflight for CORS
app.options("/.well-known/nostr.json", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

app.listen(3000, () => {
  console.log("NIP-05 server running on port 3000");
});
```

## Bun / Hono

### Minimal dynamic server

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Apply CORS to the NIP-05 endpoint
app.use("/.well-known/nostr.json", cors({ origin: "*" }));

const users: Record<string, { pubkey: string; relays?: string[] }> = {
  bob: {
    pubkey: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
    relays: ["wss://relay.example.com"],
  },
};

app.get("/.well-known/nostr.json", (c) => {
  const name = (c.req.query("name") || "").toLowerCase();

  if (name && !/^[a-z0-9\-_.]+$/.test(name)) {
    return c.json({ error: "Invalid name format" }, 400);
  }

  const result: {
    names: Record<string, string>;
    relays: Record<string, string[]>;
  } = {
    names: {},
    relays: {},
  };

  if (name && users[name]) {
    result.names[name] = users[name].pubkey;
    if (users[name].relays) {
      result.relays[users[name].pubkey] = users[name].relays;
    }
  }

  return c.json(result);
});

export default app;
```

## Vercel (serverless)

### `api/.well-known/nostr.json.ts`

Note: Vercel rewrites `api/.well-known/nostr.json` to handle the route.

```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

const users: Record<string, string> = {
  bob: "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc341b22650b07b9",
  _: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const name = (req.query.name as string || "").toLowerCase();
  const result: { names: Record<string, string> } = { names: {} };

  if (name && users[name]) {
    result.names[name] = users[name];
  } else if (!name) {
    result.names = { ...users };
  }

  res.json(result);
}
```

Add to `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/.well-known/nostr.json",
      "destination": "/api/.well-known/nostr.json"
    }
  ]
}
```

## GitHub Pages (static)

Create the file at `.well-known/nostr.json` in your repository root.

**Important:** GitHub Pages does NOT set CORS headers by default. You need a
`_headers` file (Netlify) or a custom build step. For GitHub Pages specifically,
consider using a Cloudflare Worker or similar proxy to add CORS headers.

Alternative: Use a `_headers` file if deploying to Netlify:

```
/.well-known/nostr.json
  Access-Control-Allow-Origin: *
  Content-Type: application/json
```

## Testing Checklist

After configuring any of the above, verify with:

```bash
# 1. Check JSON response
curl -s https://example.com/.well-known/nostr.json?name=bob | jq .

# 2. Check CORS header
curl -sI https://example.com/.well-known/nostr.json?name=bob | grep -i access-control

# 3. Check for redirects (should be 200, not 3xx)
curl -sI -o /dev/null -w "%{http_code}\n" https://example.com/.well-known/nostr.json

# 4. Check Content-Type
curl -sI https://example.com/.well-known/nostr.json | grep -i content-type
```

## Common Server Pitfalls

| Server       | Pitfall                                         | Fix                                       |
| ------------ | ----------------------------------------------- | ----------------------------------------- |
| Nginx        | Trailing slash redirect on directory-like paths | Use `location =` exact match              |
| Apache       | `mod_rewrite` rules redirect `.well-known`      | Add exception before rewrite rules        |
| Caddy        | Automatic HTTPS redirect counts as redirect     | Caddy handles this correctly by default   |
| Vercel       | Route not found for `.well-known` paths         | Add rewrite rule in `vercel.json`         |
| GitHub Pages | No CORS headers                                 | Use Cloudflare Worker or Netlify instead  |
| Cloudflare   | Page Rules may redirect                         | Exclude `.well-known` from redirect rules |

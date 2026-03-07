# Implementing Relay Authentication — NIP-42 + NIP-11

You need two NIPs:

1. **NIP-42** — Client authentication (the auth handshake protocol)
2. **NIP-11** — Relay Information Document (tells clients what auth is required
   before connecting)

---

## NIP-42: Authentication of Clients to Relays

NIP-42 defines a challenge-response protocol using WebSocket messages and a
special event kind:

- **kind:22242** — The authentication event signed by the client

### The AUTH Flow

#### 1. Relay Sends Challenge

When a client connects (or at any point during the connection), the relay sends
an `AUTH` message containing a challenge string:

```json
["AUTH", "<challenge-string>"]
```

The challenge is valid for the duration of the connection or until a new
challenge is sent.

#### 2. Client Signs Authentication Event (kind:22242)

The client creates a kind:22242 event with two required tags — the relay URL and
the challenge string — and signs it:

```json
{
  "kind": 22242,
  "tags": [
    ["relay", "wss://yourrelay.example.com/"],
    ["challenge", "<challenge-string-from-relay>"]
  ],
  "created_at": 1703015180,
  "pubkey": "<client-pubkey>",
  "id": "<hash>",
  "sig": "<signature>"
}
```

#### 3. Client Sends AUTH Response

The client sends the signed event back to the relay in an `AUTH` message:

```json
["AUTH", <signed-kind-22242-event>]
```

Clients MAY send AUTH events from multiple pubkeys in sequence. Relays MUST
treat all pubkeys as authenticated.

#### 4. Relay Validates and Responds

The relay verifies:

- The event kind is `22242`
- `created_at` is within ~10 minutes of current time
- The `challenge` tag matches the challenge sent
- The `relay` tag matches the relay's URL
- The signature is valid

The relay responds with an `OK` message:

```json
["OK", "<event-id>", true, ""]
```

### Auth Can Be Required for Specific Actions

Authentication doesn't have to be all-or-nothing. Your relay can require auth
selectively:

- **Reading DMs**: Require auth before serving kind:4 or kind:1059 events, only
  serving them to the `p`-tagged recipient
- **Publishing events**: Require auth before accepting any EVENT writes
- **Specific subscriptions**: Require auth for certain filter patterns

### Using `auth-required` and `restricted` Prefixes

NIP-42 defines machine-readable prefixes for `OK` and `CLOSED` messages:

**`auth-required:`** — Client has not authenticated yet:

```json
[
  "CLOSED",
  "sub_1",
  "auth-required: we can't serve DMs to unauthenticated users"
]
```

```json
[
  "OK",
  "<event-id>",
  false,
  "auth-required: we only accept events from registered users"
]
```

**`restricted:`** — Client authenticated, but their key is not authorized:

```json
["OK", "<event-id>", false, "restricted: your pubkey is not whitelisted"]
```

### Example: Full Auth Flow for Reading DMs

```
relay: ["AUTH", "challenge123abc"]
client: ["REQ", "sub_1", {"kinds": [4]}]
relay: ["CLOSED", "sub_1", "auth-required: we can't serve DMs to unauthenticated users"]
client: ["AUTH", {"kind": 22242, "tags": [["relay", "wss://..."], ["challenge", "challenge123abc"]], ...}]
relay: ["OK", "<auth-event-id>", true, ""]
client: ["REQ", "sub_1", {"kinds": [4]}]
relay: ["EVENT", "sub_1", {...}]
```

---

## NIP-11: Relay Information Document

**NIP-11** defines the relay information document — a JSON document served over
HTTP on the same URI as the relay's WebSocket endpoint. This tells clients about
your relay's capabilities and requirements before they connect.

### Advertising Auth Requirements

The key field is `limitation.auth_required` in the NIP-11 document:

```json
{
  "name": "My Authenticated Relay",
  "description": "A relay requiring authentication for publishing and reading DMs",
  "pubkey": "<admin-pubkey>",
  "supported_nips": [1, 11, 42],
  "limitation": {
    "auth_required": true,
    "restricted_writes": true,
    "max_message_length": 524288,
    "max_subscriptions": 200
  }
}
```

When `auth_required` is `true`, the relay requires NIP-42 authentication before
a new connection may perform any action. Even when set to `false`,
authentication may still be required for specific actions (like reading DMs or
publishing).

### Serving the NIP-11 Document

The relay serves this JSON when it receives an HTTP request with the header:

```
Accept: application/nostr+json
```

The relay MUST set CORS headers:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Methods`

---

## Implementation Checklist

| Component                | NIP        | Details                                                             |
| ------------------------ | ---------- | ------------------------------------------------------------------- |
| Challenge-response auth  | **NIP-42** | Send `AUTH` challenge, validate kind:22242 response                 |
| Auth event kind          | **NIP-42** | kind:22242 with `relay` and `challenge` tags                        |
| `AUTH` WebSocket message | **NIP-42** | `["AUTH", <challenge>]` from relay, `["AUTH", <event>]` from client |
| `auth-required` prefix   | **NIP-42** | Use in `OK` and `CLOSED` messages when auth is needed               |
| Relay info document      | **NIP-11** | Serve JSON at WebSocket URI with `Accept: application/nostr+json`   |
| `auth_required` flag     | **NIP-11** | Set in `limitation` object to advertise auth requirement            |

### Common Mistakes

- **Skipping NIP-11**: Without the relay information document, clients have no
  way to know auth is required before connecting. Always implement NIP-11
  alongside NIP-42.
- **Not using `auth-required:` prefix**: Clients rely on this machine-readable
  prefix to know they should authenticate. Without it, they can't distinguish
  auth failures from other errors.
- **Overly broad auth requirements**: Requiring auth for everything adds
  friction. Consider requiring auth only for sensitive operations like reading
  DMs (kind:1059 gift wraps) or publishing.

# Nostr Relay Message Protocol Reference

Complete reference for all client-to-relay and relay-to-client messages defined
by NIP-01, plus extensions from NIP-42 (AUTH) and NIP-45 (COUNT).

## Client → Relay Messages

### EVENT — Publish an event

```json
["EVENT", <event-object>]
```

The relay MUST validate the event and respond with an OK message.

**Event object structure:**

```json
{
  "id": "<32-byte lowercase hex SHA-256 of serialized event>",
  "pubkey": "<32-byte lowercase hex public key>",
  "created_at": 1234567890,
  "kind": 1,
  "tags": [["e", "<event-id>"], ["p", "<pubkey>"]],
  "content": "Hello world",
  "sig": "<64-byte lowercase hex Schnorr signature>"
}
```

### REQ — Subscribe to events

```json
["REQ", "<subscription_id>", <filter1>, <filter2>, ...]
```

- `subscription_id`: non-empty string, max 64 characters
- One or more filter objects follow the subscription ID
- If a subscription with the same ID exists, it is replaced

**Filter object:**

```json
{
  "ids": ["<hex-event-id>", ...],
  "authors": ["<hex-pubkey>", ...],
  "kinds": [1, 30023, ...],
  "#e": ["<hex-event-id>", ...],
  "#p": ["<hex-pubkey>", ...],
  "#a": ["<kind>:<pubkey>:<d-tag>", ...],
  "#t": ["hashtag1", "hashtag2", ...],
  "since": 1234567890,
  "until": 1234567899,
  "limit": 100
}
```

**Filter matching rules:**

| Field       | Type     | Match Logic                                                             |
| ----------- | -------- | ----------------------------------------------------------------------- |
| `ids`       | string[] | Event `id` must be in the list                                          |
| `authors`   | string[] | Event `pubkey` must be in the list                                      |
| `kinds`     | number[] | Event `kind` must be in the list                                        |
| `#<letter>` | string[] | Event must have a tag with that letter whose first value is in the list |
| `since`     | number   | `created_at >= since`                                                   |
| `until`     | number   | `created_at <= until`                                                   |
| `limit`     | number   | Max events in initial query (newest first)                              |

- Within a filter: all conditions are AND
- Across filters in a REQ: conditions are OR
- `ids`, `authors`, `#e`, `#p` values must be exact 64-char lowercase hex
- `limit` applies only to the initial stored-event query, not to streaming
- When `limit` is set, return newest events first; on `created_at` ties, lowest
  `id` (lexicographic) first

### CLOSE — End a subscription

```json
["CLOSE", "<subscription_id>"]
```

No response is required from the relay.

### AUTH — Client authentication (NIP-42)

```json
["AUTH", <signed-auth-event>]
```

The auth event must be kind 22242 with tags:

```json
{
  "kind": 22242,
  "tags": [
    ["relay", "wss://relay.example.com/"],
    ["challenge", "<challenge-string-from-relay>"]
  ],
  "content": "",
  "created_at": <current-unix-timestamp>
}
```

The relay MUST respond with an OK message.

### COUNT — Request event count (NIP-45)

```json
["COUNT", "<subscription_id>", <filter1>, <filter2>, ...]
```

Same filter format as REQ. The relay responds with a COUNT message.

---

## Relay → Client Messages

### EVENT — Deliver a matching event

```json
["EVENT", "<subscription_id>", <event-object>]
```

Only sent for subscriptions the client has created via REQ.

### OK — Acknowledge an EVENT or AUTH

```json
["OK", "<event_id>", true|false, "<message>"]
```

- 3rd element: `true` if accepted, `false` if rejected
- 4th element: always present; may be empty string on success
- On rejection, message MUST start with a machine-readable prefix

**Standard prefixes:**

| Prefix           | Meaning                                          |
| ---------------- | ------------------------------------------------ |
| `duplicate:`     | Already have this event                          |
| `pow:`           | Proof-of-work issue                              |
| `blocked:`       | Pubkey/IP is blocked                             |
| `rate-limited:`  | Too many requests                                |
| `invalid:`       | Protocol violation (bad id, bad sig, bad format) |
| `restricted:`    | Not authorized                                   |
| `mute:`          | Event was silently ignored                       |
| `error:`         | Internal error                                   |
| `auth-required:` | Must authenticate first (NIP-42)                 |

**Examples:**

```json
["OK", "abcdef...", true, ""]
["OK", "abcdef...", true, "duplicate: already have this event"]
["OK", "abcdef...", false, "invalid: event id does not match"]
["OK", "abcdef...", false, "blocked: pubkey is banned"]
["OK", "abcdef...", false, "rate-limited: slow down"]
["OK", "abcdef...", false, "auth-required: please authenticate"]
["OK", "abcdef...", false, "error: database write failed"]
```

### EOSE — End of stored events

```json
["EOSE", "<subscription_id>"]
```

Signals that all stored events matching the subscription have been sent. After
this, only new real-time events will be delivered.

### CLOSED — Subscription terminated by relay

```json
["CLOSED", "<subscription_id>", "<message>"]
```

Uses the same prefix format as OK messages.

```json
["CLOSED", "sub1", "error: shutting down idle subscription"]
["CLOSED", "sub1", "auth-required: authentication needed for DMs"]
["CLOSED", "sub1", "restricted: not authorized for this query"]
```

### NOTICE — Human-readable message

```json
["NOTICE", "<message>"]
```

Not tied to any subscription. Used for informational messages, warnings, or
errors.

### AUTH — Challenge from relay (NIP-42)

```json
["AUTH", "<challenge-string>"]
```

Sent by the relay to initiate authentication. The challenge is valid for the
duration of the connection.

### COUNT — Event count response (NIP-45)

```json
["COUNT", "<subscription_id>", { "count": 42 }]
```

Response to a COUNT request from the client.

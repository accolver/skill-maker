# Nostr Event Validation Checklist

Step-by-step validation that a relay MUST perform on every received event before
storing or broadcasting it. Reject with
`["OK", event.id, false, "invalid: <reason>"]` on any failure.

## Validation Steps

### Step 1: Parse and type-check the event

Verify the event is a JSON object with all required fields:

| Field        | Type   | Constraints                           |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | 64-char lowercase hex                 |
| `pubkey`     | string | 64-char lowercase hex                 |
| `created_at` | number | Unix timestamp in seconds (integer)   |
| `kind`       | number | Integer 0–65535                       |
| `tags`       | array  | Array of arrays of strings (no nulls) |
| `content`    | string | Arbitrary string                      |
| `sig`        | string | 128-char lowercase hex                |

Reject if any field is missing, wrong type, or malformed.

### Step 2: Verify the event ID

The `id` field must equal the SHA-256 hash of the canonical serialization.

**Canonical serialization format:**

```json
[0,<pubkey>,<created_at>,<kind>,<tags>,<content>]
```

This is a JSON array with exactly 6 elements:

1. The integer `0` (literal zero, not a string)
2. The `pubkey` as a lowercase hex string
3. The `created_at` as a number (not a string)
4. The `kind` as a number (not a string)
5. The `tags` as an array of arrays of strings
6. The `content` as a string

**Serialization rules:**

- UTF-8 encoding
- No whitespace between elements (use `JSON.stringify` with no spacer)
- No trailing newline
- Content string escaping:
  - `0x0A` (line break) → `\n`
  - `0x22` (double quote) → `\"`
  - `0x5C` (backslash) → `\\`
  - `0x0D` (carriage return) → `\r`
  - `0x09` (tab) → `\t`
  - `0x08` (backspace) → `\b`
  - `0x0C` (form feed) → `\f`
  - All other characters: include verbatim (including Unicode)

**Compute the ID:**

```typescript
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const serialized = JSON.stringify([
  0,
  event.pubkey,
  event.created_at,
  event.kind,
  event.tags,
  event.content,
]);
const computedId = bytesToHex(sha256(new TextEncoder().encode(serialized)));

if (computedId !== event.id) {
  return ["OK", event.id, false, "invalid: event id does not match"];
}
```

**Common pitfalls:**

- Adding spaces after colons or commas in JSON
- Using `JSON.stringify(obj, null, 2)` — the `2` adds whitespace
- Not handling Unicode correctly (must be UTF-8)
- Stringifying numbers as strings (`"1"` instead of `1`)

### Step 3: Verify the signature

The `sig` field must be a valid Schnorr signature (BIP-340) over the event `id`
using the `pubkey`.

```typescript
import { schnorr } from "@noble/curves/secp256k1";

const isValid = schnorr.verify(event.sig, event.id, event.pubkey);
if (!isValid) {
  return ["OK", event.id, false, "invalid: bad signature"];
}
```

**Important:** The signature is over the `id` (which is the SHA-256 hash), not
over the serialized event directly. The `pubkey` is the x-only public key (32
bytes, 64 hex chars) per BIP-340.

### Step 4: Validate field constraints

Additional checks a relay SHOULD perform:

- `created_at` is not unreasonably far in the future (e.g., > 15 minutes ahead)
- `created_at` is not unreasonably far in the past (relay policy)
- `kind` is within 0–65535
- `tags` contains no null elements (all elements must be strings)
- Total event size does not exceed relay's `max_message_length`
- Tag count does not exceed relay's `max_event_tags`
- Content length does not exceed relay's `max_content_length`

### Step 5: Check for duplicates

If the relay already has an event with the same `id`, respond with:

```json
["OK", "<event_id>", true, "duplicate: already have this event"]
```

Note: duplicates return `true` (accepted) because the event is valid — it's just
already stored.

### Step 6: Apply kind-based storage rules

After validation passes, apply storage rules based on the event kind:

**Regular events** (kind 1, 2, 4-44, 1000-9999): Store the event normally.

**Replaceable events** (kind 0, 3, 10000-19999): Check if a newer event exists
with the same `pubkey` + `kind`:

- If the stored event has a higher `created_at`, reject (or silently accept)
- If `created_at` is equal, keep the one with the lower `id` (lexicographic)
- Otherwise, replace the stored event with the new one

**Ephemeral events** (kind 20000-29999): Do NOT store. Broadcast to matching
subscriptions only.

**Addressable events** (kind 30000-39999): Same as replaceable, but keyed on
`pubkey` + `kind` + `d` tag value:

- Extract the `d` tag: first tag where `tag[0] === "d"`, value is `tag[1]`
- If no `d` tag exists, use empty string `""` as the d-tag value
- Compare with existing event for the same key

### Step 7: Respond with OK

After successful storage (or broadcast for ephemeral events):

```json
["OK", "<event_id>", true, ""]
```

## Complete Validation Flow

```
Receive EVENT message
  ├─ Parse JSON → fail? → ["OK", id, false, "invalid: bad JSON"]
  ├─ Type-check fields → fail? → ["OK", id, false, "invalid: missing field X"]
  ├─ Verify ID (SHA-256) → fail? → ["OK", id, false, "invalid: event id does not match"]
  ├─ Verify signature → fail? → ["OK", id, false, "invalid: bad signature"]
  ├─ Check constraints → fail? → ["OK", id, false, "invalid: <reason>"]
  ├─ Check duplicate → dup? → ["OK", id, true, "duplicate: already have this event"]
  ├─ Apply kind rules → store/replace/broadcast
  └─ ["OK", id, true, ""]
```

## Recommended Libraries

| Language      | ID (SHA-256)    | Signature (Schnorr)                    |
| ------------- | --------------- | -------------------------------------- |
| TypeScript/JS | `@noble/hashes` | `@noble/curves`                        |
| Rust          | `sha2` crate    | `secp256k1` crate                      |
| Go            | `crypto/sha256` | `github.com/btcsuite/btcd/btcec/v2`    |
| Python        | `hashlib`       | `secp256k1` (C binding) or `coincurve` |

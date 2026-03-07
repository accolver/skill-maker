# NIP-59 Gift Wrap — Three-Layer Flow

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Gift Wrap (kind:1059)                                   │
│ pubkey: <random ephemeral key>                          │
│ tags: [["p", "<recipient>"]]                            │
│ created_at: <randomized>                                │
│ sig: <signed by ephemeral key>                          │
│                                                         │
│ content (NIP-44 encrypted with ephemeral -> recipient): │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Seal (kind:13)                                      │ │
│ │ pubkey: <real author>                               │ │
│ │ tags: []  ← MUST be empty                          │ │
│ │ created_at: <randomized>                            │ │
│ │ sig: <signed by real author>                        │ │
│ │                                                     │ │
│ │ content (NIP-44 encrypted with author -> recipient):│ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Rumor (unsigned event)                          │ │ │
│ │ │ pubkey: <real author>                           │ │ │
│ │ │ kind: <actual kind, e.g. 1>                    │ │ │
│ │ │ content: "The actual message"                   │ │ │
│ │ │ tags: [...]                                     │ │ │
│ │ │ created_at: <real timestamp>                    │ │ │
│ │ │ id: <computed hash>                             │ │ │
│ │ │ sig: <NONE — intentionally unsigned>            │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## What Each Layer Reveals

| Layer     | Reveals           | Hides                       |
| --------- | ----------------- | --------------------------- |
| Rumor     | Content           | Nothing (unsigned=deniable) |
| Seal      | Author identity   | Content, recipient          |
| Gift Wrap | Recipient (p-tag) | Author, content             |

**Key insight:** No single layer reveals both author AND recipient AND content.
An observer of the gift wrap on a relay sees only the recipient. The author is
hidden inside the encrypted seal. The content is hidden inside the encrypted
rumor.

## Construction — Step by Step

### Prerequisites

```
author_privkey     = "0beebd062ec8735f4243466049d7747ef5d6594ee838de147f8aab842b15e273"
author_pubkey      = getPublicKey(author_privkey)
recipient_pubkey   = "166bf3765ebd1fc55decfe395beff2ea3b2a4e0a8946e7eb578512b555737c99"
```

### Step 1: Create the Rumor

```javascript
const rumor = {
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  content: "Are you going to the party tonight?",
  tags: [],
  pubkey: author_pubkey,
};

// Compute the event id (hash of serialized event)
rumor.id = getEventHash(rumor);

// DO NOT SIGN — this is intentional for deniability
// rumor has NO sig field
```

**Critical:** The rumor MUST NOT have a `sig` field. If the rumor leaks, it
cannot be cryptographically attributed to the author.

### Step 2: Create the Seal (kind:13)

```javascript
// Helper: random timestamp within past 2 days
const randomPastTimestamp = () =>
  Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 2 * 24 * 60 * 60);

const seal = finalizeEvent({
  kind: 13,
  content: nip44Encrypt(
    JSON.stringify(rumor),
    author_privkey,
    recipient_pubkey,
  ),
  created_at: randomPastTimestamp(),
  tags: [], // MUST be empty — no p-tag, no other tags
}, author_privkey);
```

**Critical rules for seals:**

- `tags` MUST always be `[]` — adding any tag leaks metadata
- `created_at` SHOULD be randomized to prevent timing correlation
- Signed by the real author's key

### Step 3: Create the Gift Wrap (kind:1059)

```javascript
// Generate a random one-time keypair
const ephemeral_privkey = generateSecretKey();
const ephemeral_pubkey = getPublicKey(ephemeral_privkey);

const wrap = finalizeEvent({
  kind: 1059,
  content: nip44Encrypt(
    JSON.stringify(seal),
    ephemeral_privkey,
    recipient_pubkey,
  ),
  created_at: randomPastTimestamp(),
  tags: [["p", recipient_pubkey]], // For relay routing
}, ephemeral_privkey);

// DISCARD ephemeral_privkey after signing — never reuse
```

**Critical rules for gift wraps:**

- Signed by a random ephemeral key (not the author)
- The `p` tag contains the recipient for relay routing
- `created_at` SHOULD be randomized independently from the seal
- The ephemeral key MUST be discarded after use

### Step 4: Send and Cleanup

```javascript
// Send ONLY the gift wrap to the recipient's relays
await relay.publish(wrap);

// Delete the rumor, seal, and ephemeral key from memory
// Only the gift wrap should exist on relays
```

## Unwrapping — Recipient Side

```javascript
function unwrapGiftWrap(wrap, recipient_privkey) {
  // Step 1: Decrypt the gift wrap to get the seal
  const seal = JSON.parse(
    nip44Decrypt(wrap.content, recipient_privkey, wrap.pubkey),
  );

  // Step 2: Verify the seal's signature
  if (!verifySignature(seal)) {
    throw new Error("Invalid seal signature");
  }

  // Step 3: Decrypt the seal to get the rumor
  const rumor = JSON.parse(
    nip44Decrypt(seal.content, recipient_privkey, seal.pubkey),
  );

  // Step 4: Verify author consistency
  if (rumor.pubkey !== seal.pubkey) {
    throw new Error("Author mismatch between rumor and seal");
  }

  // Step 5: The rumor is intentionally unsigned — do NOT verify sig
  return {
    author: rumor.pubkey,
    content: rumor.content,
    kind: rumor.kind,
    created_at: rumor.created_at,
    tags: rumor.tags,
  };
}
```

## Multi-Recipient Messages

To send the same message to multiple recipients, create separate gift wraps for
each:

```javascript
const rumor = createRumor(
  { kind: 1, content: "Group announcement" },
  author_privkey,
);

for (const recipient of recipients) {
  const seal = createSeal(rumor, author_privkey, recipient);
  const wrap = createWrap(seal, recipient);
  await publishToRecipientRelays(wrap, recipient);
}
```

Each recipient gets their own seal and gift wrap, but the rumor content is
identical. The author can also wrap a copy for themselves to retain the message.

## Relay Considerations

- Relays SHOULD require AUTH for kind:1059 events
- Relays SHOULD only serve kind:1059 events to the tagged recipient
- Clients SHOULD only send wraps to relays that support AUTH
- Relays MAY delete kind:1059 events matching NIP-09 deletion requests signed by
  the p-tagged recipient (since the wrap's signing key is random)

## Security Properties Summary

| Property                | Status  | Mechanism                                        |
| ----------------------- | ------- | ------------------------------------------------ |
| Content confidentiality | Yes     | NIP-44 encryption at both layers                 |
| Author privacy          | Yes     | Ephemeral key on outer layer hides real author   |
| Recipient privacy       | Partial | p-tag visible on relay, but AUTH limits exposure |
| Deniability             | Yes     | Rumor is unsigned, cannot be proven authentic    |
| Forward secrecy         | No      | Key compromise reveals all past messages         |
| Replay protection       | Partial | Event IDs are unique, but no sequence numbers    |

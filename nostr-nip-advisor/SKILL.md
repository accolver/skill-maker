---
name: nostr-nip-advisor
description: Identify which Nostr NIPs apply to a feature and warn about deprecated choices when the task is protocol planning or NIP selection rather than concrete implementation.
---

# Nostr NIP Advisor

Identifies which NIPs a developer needs when implementing a Nostr feature, warns
about deprecated approaches, and provides the correct event structures and NIP
interaction patterns.

## Overview

Agents already know what Nostr is, but they lack current knowledge of which NIPs
are deprecated, which NIPs must be combined for a feature to work, and what the
correct event structures look like. This skill fills those gaps.

## When to use

- The task is to determine which Nostr NIPs are required, optional, deprecated, or interacting for a feature.
- The user is in planning mode and needs protocol selection before implementation details.
- The request asks “which NIPs do I need?”, “is this NIP deprecated?”, or “what replaces this older approach?”.
- The output should map features to NIPs and warn about bad protocol choices.

**Do NOT use when:**

- The task is to build a concrete event, filter, client, or relay implementation directly.
- The work is non-Nostr protocol planning.
- The question is low-level cryptography with no NIP-selection decision.


## Response format

Always structure the final response with these top-level sections, in this order:

1. **Summary** — state the task, scope, and main conclusion in 1-3 sentences.
2. **Decision / Approach** — state the key classification, assumptions, or chosen path.
3. **Artifacts** — provide the primary deliverable(s) for this skill. Use clear subheadings for multiple files, commands, JSON payloads, queries, or documents.
4. **Validation** — state checks performed, important risks, caveats, or unresolved questions.
5. **Next steps** — list concrete follow-up actions, or write `None` if nothing remains.

Rules:
- Do not omit a section; write `None` when a section does not apply.
- If files are produced, list each file path under **Artifacts** before its contents.
- If commands, JSON, SQL, YAML, or code are produced, put each artifact in fenced code blocks with the correct language tag when possible.
- Keep section names exactly as written above so output stays predictable across skills.

## Workflow

### 1. Understand the feature

Ask what the developer wants to build. Map their description to one or more
feature categories from the [NIP map](references/nip-map.md).

### 2. Check for deprecated NIPs

Before recommending anything, cross-reference against the
[deprecations list](references/deprecations.md). If the developer mentions or
their code uses a deprecated NIP, **warn immediately** with the migration path.

### 3. Identify required NIPs

Most features require multiple NIPs working together. Identify the full chain:

- **Primary NIP** — the core spec for the feature
- **Required dependencies** — NIPs that must be implemented alongside
- **Related NIPs** — optional but commonly used together

### 4. Provide event structures

For each primary NIP, show the event kind, required tags, and content format.
Use the Nostr MCP tools (`read_nip`, `read_kind`, `read_tag`) to fetch current
spec details when available.

### 5. Warn about interaction patterns

Many NIPs have non-obvious requirements. Call these out explicitly:

- DMs require 4 NIPs working together (17 + 44 + 59 + 51)
- Zaps require LNURL integration outside the Nostr protocol
- Marketplace checkout still depends on legacy NIP-04 in some flows

## Deprecation Warnings

**Always check this table first.** Using deprecated NIPs causes interoperability
failures with modern clients.

| Deprecated NIP      | What it was                   | Replacement                        | Why deprecated                                        |
| ------------------- | ----------------------------- | ---------------------------------- | ----------------------------------------------------- |
| NIP-04 (kind:4)     | Encrypted DMs                 | NIP-17 (kind:14) + NIP-44 + NIP-59 | Leaks metadata (sender, receiver, timestamps visible) |
| NIP-08              | Handling Mentions             | NIP-27 (text note references)      | Superseded by better reference format                 |
| NIP-96              | HTTP File Storage             | Blossom (NIP-B7)                   | Replaced by simpler, more decentralized Blossom APIs  |
| NIP-26              | Delegated Event Signing       | None (removed)                     | Adds unnecessary burden for little gain               |
| Positional `e` tags | Thread references by position | Marked `e` tags (NIP-10)           | Ambiguous when events reference without replying      |

## Feature-to-NIP Quick Reference

| Feature           | Primary NIPs             | Required Dependencies           | Related                                     |
| ----------------- | ------------------------ | ------------------------------- | ------------------------------------------- |
| Direct Messages   | 17                       | 44 (encryption), 59 (gift wrap) | 51 (kind:10050 DM relays)                   |
| Zaps (Lightning)  | 57                       | LNURL (external)                | 47 (Wallet Connect)                         |
| Nutzaps (Cashu)   | 61                       | 60 (Cashu Wallet)               | 87 (Mint Discovery)                         |
| Marketplace       | 15                       | —                               | 69 (P2P Orders), 99 (Classifieds)           |
| Social / Notes    | 01, 10                   | —                               | 25 (Reactions), 18 (Reposts), 22 (Comments) |
| Long-form Content | 23                       | —                               | 22 (Comments), 84 (Highlights)              |
| Groups            | 29                       | —                               | 72 (Moderated Communities)                  |
| Relay Auth        | 42                       | 11 (Relay Info)                 | 98 (HTTP Auth)                              |
| Identity          | 05 (NIP-05), 19 (bech32) | —                               | 06 (Key Derivation), 46 (Remote Signing)    |
| DVMs              | 90                       | —                               | 89 (App Handlers)                           |
| Encryption        | 44                       | —                               | 59 (Gift Wrap), 49 (Key Encryption)         |
| Lists             | 51                       | —                               | 65 (Relay List)                             |
| Search            | 50                       | —                               | —                                           |
| File Storage      | B7 (Blossom)             | —                               | 94 (File Metadata), 92 (Media Attachments)  |

For complete event structures and tag details, see
[references/nip-map.md](references/nip-map.md).

## NIP Interaction Patterns

These are the non-obvious multi-NIP chains that developers frequently miss:

### Private DMs (NIP-17 chain)

```
kind:14 (unsigned rumor) → NIP-44 encrypt → kind:13 (seal) → NIP-44 encrypt → kind:1059 (gift wrap)
```

1. Create unsigned kind:14 with `p` tags for recipients and plaintext content
2. Seal it (kind:13) — encrypt with NIP-44 using sender's key + recipient's
   pubkey
3. Gift wrap (kind:1059) — encrypt seal with a random ephemeral key
4. Publish to recipient's kind:10050 relay list (NIP-51)
5. Repeat wrapping for each recipient AND the sender (for sent-message recovery)

**Critical:** The kind:14 MUST NOT be signed (deniability). Timestamps on seal
and gift wrap MUST be randomized up to 2 days in the past (metadata protection).

### Zaps (NIP-57 chain)

1. Fetch recipient's lnurl pay endpoint (from `lud16` in kind:0 profile)
2. Verify `allowsNostr: true` and `nostrPubkey` in lnurl response
3. Create kind:9734 zap request (NOT published to relays)
4. Send zap request to lnurl `callback` URL as query parameter
5. Receive bolt11 invoice, pay it
6. Recipient's lnurl server publishes kind:9735 zap receipt

### Nutzaps (NIP-61 chain)

1. Fetch recipient's kind:10019 for trusted mints and P2PK pubkey
2. Mint/swap Cashu tokens P2PK-locked to recipient's specified pubkey
3. Publish kind:9321 with proofs, tagging recipient and mint URL
4. Recipient swaps tokens into their NIP-60 wallet
5. Recipient publishes kind:7376 to mark redemption

### Relay Authentication (NIP-42)

1. Relay sends `["AUTH", "<challenge>"]` to client
2. Client creates kind:22242 event with `relay` and `challenge` tags
3. Client sends `["AUTH", <signed-event>]`
4. Relay responds with `["OK", ...]`

## Common Mistakes

| Mistake                                             | Fix                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| Using NIP-04 (kind:4) for DMs                       | Use NIP-17 (kind:14) with NIP-44 encryption and NIP-59 gift wrap          |
| Signing the kind:14 DM rumor                        | Leave it unsigned — signatures remove deniability                         |
| Publishing kind:9734 zap requests to relays         | Send to lnurl callback URL only, never publish                            |
| Using positional `e` tags for threading             | Use marked `e` tags with `root` and `reply` markers (NIP-10)              |
| Hardcoding relay URLs                               | Use kind:10002 relay list (NIP-65) for outbox model                       |
| Using NIP-96 for file uploads                       | Use Blossom (NIP-B7) — NIP-96 is unrecommended                            |
| Using recipient's main Nostr pubkey for nutzap P2PK | Use the dedicated `pubkey` from their kind:10019 event                    |
| Not randomizing gift wrap timestamps                | Randomize `created_at` up to 2 days in the past on both seal and wrap     |
| Skipping NIP-11 when implementing NIP-42 auth       | Relay info document tells clients what auth is required before connecting |

## Key Principles

1. **Deprecation-first checking** — Always verify NIPs against the deprecation
   list before recommending. A working implementation on a deprecated NIP will
   break interoperability with modern clients.

2. **Full chain awareness** — Most features require multiple NIPs. Recommending
   NIP-17 without NIP-44, NIP-59, and NIP-51 produces a broken implementation.

3. **Metadata protection matters** — The shift from NIP-04 to NIP-17 was driven
   by metadata leakage. When advising on encryption or messaging, always explain
   what metadata is protected and what isn't.

4. **Verify with the spec** — Use the Nostr MCP tools (`read_nip`, `read_kind`)
   to fetch current NIP text when providing event structures. NIPs evolve and
   details change.

5. **Event kind numbers are canonical** — Always include the specific kind
   number when discussing events. "Use NIP-17" is less useful than "Create a
   kind:14 event, seal it as kind:13, gift wrap as kind:1059."

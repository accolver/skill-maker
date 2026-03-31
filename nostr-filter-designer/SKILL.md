---
name: nostr-filter-designer
description: Design correct Nostr REQ filters when the task is to query relay data with precise AND/OR, tag, thread, zap, reaction, or feed semantics.
---

# Nostr Filter Designer

## Overview

Construct correct `REQ` filters for Nostr relay queries. The filter syntax has
subtle semantics around AND/OR combination, tag matching, and multi-filter
subscriptions that agents consistently get wrong without explicit guidance.

## When to use

- The task is to build Nostr REQ filters for querying relay data.
- The user needs exact filter semantics for AND/OR behavior, tag constraints, time windows, or multi-filter subscriptions.
- The problem is retrieving the right events—threads, zaps, feeds, replies, reactions—not publishing them.
- The output should be one or more valid filter objects or REQ messages.

**Do NOT use when:**

- The task is constructing publishable events.
- The work is relay-side implementation of filter matching rather than client-side filter design.
- The request is protocol auth, counting, or another NIP unrelated to REQ filter construction.


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

### 1. Identify what you need

Translate the natural language query into concrete requirements:

- **Who**: specific authors, or any author?
- **What kind**: notes (1), reactions (7), reposts (6), zaps (9735), profiles
  (0)?
- **Related to what**: specific events (#e), specific people (#p), specific
  addressable events (#a)?
- **When**: time-bounded or open-ended?
- **How many**: limited initial fetch or ongoing subscription?

### 2. Determine AND vs OR

Ask: "Can a single event satisfy ALL my conditions simultaneously?"

- **Yes** -> one filter with all conditions (AND)
- **No** -> multiple filters (OR)

The most common mistake is cramming OR-logic into a single filter. If you need
"events by Alice OR events mentioning Alice," that requires two filters.

### 3. Construct the filter(s)

Build each filter object. For each condition, add the appropriate field.
Cross-reference with
[references/filter-patterns.md](references/filter-patterns.md) for common
patterns.

### 4. Validate

Check each filter against these rules:

- [ ] All hex values are exactly 64 characters, lowercase
- [ ] Tag filter keys are single letters (`#e`, not `#event`)
- [ ] No NOT/exclusion logic (Nostr filters can't do this)
- [ ] `since` and `until` are unix timestamps in seconds (not milliseconds)
- [ ] `limit` is only used for initial queries, not ongoing subscriptions
- [ ] AND/OR semantics match the intent

### 5. Format as REQ

Wrap in the REQ message format:

```json
["REQ", "<subscription-id>", <filter1>, <filter2>, ...]
```

## Examples

### Example 1: Get a full thread (root + all replies)

**Need:** The root event itself, plus all kind-1 replies that tag it.

A single filter can't do this because the root event won't have an `#e` tag
pointing to itself. Use two filters (OR):

```json
[
  "REQ",
  "thread-sub",
  { "ids": ["aabb...64chars"] },
  { "kinds": [1], "#e": ["aabb...64chars"] }
]
```

Filter 1 fetches the root by ID. Filter 2 fetches all kind-1 events that
reference it via an `e` tag. Together (OR), you get the complete thread.

**Why not one filter?** `{"ids": ["aabb..."], "#e": ["aabb..."]}` would match
only events whose own ID is `aabb...` AND that also tag `aabb...` -- which is
almost certainly nothing.

### Example 2: User's social feed

**Need:** A user's notes, reposts, and reactions.

All three share the same author, so one filter with multiple kinds works (AND on
author, list-match on kinds):

```json
{ "authors": ["<pubkey>"], "kinds": [1, 6, 7], "limit": 50 }
```

This works because `kinds` is a list -- the event matches if its kind is ANY of
the listed values. Combined with `authors` (AND), this gives "events by this
author that are notes OR reposts OR reactions."

### Example 3: All engagement on an event

**Need:** Replies, reactions, zaps, and reposts of a specific event.

All engagement types tag the event via `#e`, but have different kinds. One
filter works:

```json
{ "#e": ["<event-id>"], "kinds": [1, 6, 7, 9735] }
```

### Example 4: Events by author OR mentioning author

**Need:** Show everything relevant to a user -- their own posts and posts that
mention them.

This requires OR (two filters), because an event can't simultaneously be
authored by someone AND mention them in a `p` tag (well, it could, but you'd
miss events that only satisfy one condition):

```json
[
  "REQ",
  "user-activity",
  { "authors": ["<pk>"], "kinds": [1] },
  { "#p": ["<pk>"], "kinds": [1] }
]
```

## Common Mistakes

| Mistake                                        | Why it's wrong                                                            | Fix                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| OR logic in one filter                         | `{"authors": ["A"], "#p": ["A"]}` means events BY A that ALSO tag A (AND) | Use two separate filters                      |
| `#event` or `#pubkey` as tag filter key        | Tag filter keys are single letters only                                   | Use `#e`, `#p`, `#a`, etc.                    |
| Non-hex values in `ids`, `authors`, `#e`, `#p` | Must be exact 64-char lowercase hex                                       | Convert npub/note to hex first                |
| Timestamps in milliseconds                     | Nostr uses seconds since epoch                                            | Divide JS `Date.now()` by 1000                |
| Using `limit` for ongoing subscriptions        | `limit` only applies to the initial query batch                           | Remove `limit` for live subscriptions         |
| Expecting NOT/exclusion                        | Nostr filters have no negation                                            | Filter client-side after receiving events     |
| Assuming tag filter matches all tag values     | Only index 0 (the first value) is matched                                 | Don't try to filter by relay hints or markers |
| Mixing replaceable event semantics             | Relay returns only latest for kind 0, 3, 10000-19999                      | Don't expect historical versions              |

## Quick Reference

| Query                                 | Filter                                                     |
| ------------------------------------- | ---------------------------------------------------------- |
| User's notes                          | `{"authors": ["<pk>"], "kinds": [1]}`                      |
| User's profile                        | `{"authors": ["<pk>"], "kinds": [0]}`                      |
| User's contacts                       | `{"authors": ["<pk>"], "kinds": [3]}`                      |
| User's relay list                     | `{"authors": ["<pk>"], "kinds": [10002]}`                  |
| Replies to event                      | `{"kinds": [1], "#e": ["<eid>"]}`                          |
| Reactions to event                    | `{"kinds": [7], "#e": ["<eid>"]}`                          |
| Zaps on event                         | `{"kinds": [9735], "#e": ["<eid>"]}`                       |
| Reposts of event                      | `{"kinds": [6], "#e": ["<eid>"]}`                          |
| Full thread                           | `{"ids": ["<root>"]}` + `{"kinds": [1], "#e": ["<root>"]}` |
| Comments on content                   | `{"kinds": [1111], "#E": ["<root-id>"]}`                   |
| User's DM relay list                  | `{"authors": ["<pk>"], "kinds": [10050]}`                  |
| All engagement on event               | `{"#e": ["<eid>"], "kinds": [1, 6, 7, 9735]}`              |
| Events mentioning user                | `{"#p": ["<pk>"]}`                                         |
| User's feed (notes+reposts+reactions) | `{"authors": ["<pk>"], "kinds": [1, 6, 7]}`                |

See [references/filter-patterns.md](references/filter-patterns.md) for the full
cookbook with advanced patterns and explanations.

## Key Principles

1. **AND within, OR between** -- This is the single most important rule. Every
   condition in one filter is AND'd. Multiple filters are OR'd. There is no
   other way to combine conditions.

2. **Hex or nothing** -- `ids`, `authors`, `#e`, and `#p` values must be exact
   64-character lowercase hex strings. No npub, note1, nprofile, or other NIP-19
   encodings. Convert first.

3. **Tag filters are shallow** -- `#e` matches only the first value (index 0) of
   `e` tags. You cannot filter by relay hints, markers, or other positional tag
   values. Those must be filtered client-side.

4. **No negation** -- You cannot exclude events matching a condition. If you
   need "all kind-1 events except from author X," fetch all kind-1 events and
   filter client-side.

5. **Limit is a suggestion for initial load** -- `limit` tells the relay how
   many events to return in the initial batch (newest first). It does NOT cap an
   ongoing subscription. Relays may return fewer than requested.

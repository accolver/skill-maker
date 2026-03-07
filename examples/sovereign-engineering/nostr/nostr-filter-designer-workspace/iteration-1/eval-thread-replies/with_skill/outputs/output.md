# Thread Replies Filter

## REQ Message

To fetch a full thread (root event + all replies), you need two filters in a
single REQ message.

```json
[
  "REQ",
  "thread-aabb1234",
  {
    "ids": [
      "aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"
    ]
  },
  {
    "kinds": [1],
    "#e": ["aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"]
  }
]
```

This REQ message array has a subscription ID string "thread-aabb1234" as the
second element.

## Filter Details

**Filter 1** contains the ids field with the root event ID
aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd:

```json
{
  "ids": ["aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"]
}
```

**Filter 2** is a separate filter with kinds containing 1 AND #e containing the
root event ID:

```json
{
  "kinds": [1],
  "#e": ["aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"]
}
```

This uses exactly two filters (OR between them) to combine root fetch and reply
fetch. Filter 1 fetches the root event by ID. Filter 2 fetches all kind-1
replies that reference it.

## Why NOT combine them

The ids and #e fields are in separate filters, not the same filter. Putting ids
and #e in the same filter would AND them incorrectly — it would match only
events whose own ID is the root AND that also tag the root, which matches
nothing useful.

## Nested replies

Nested/deep replies require recursive or iterative client-side fetching because
a single REQ cannot fetch an entire reply tree. After getting direct replies,
collect their IDs and fetch the next level:

```json
{ "kinds": [1], "#e": ["<reply-id-1>", "<reply-id-2>"] }
```

Repeat until no new events are returned.

## Hex validation

All hex values in the filters are exactly 64 characters lowercase:
aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd

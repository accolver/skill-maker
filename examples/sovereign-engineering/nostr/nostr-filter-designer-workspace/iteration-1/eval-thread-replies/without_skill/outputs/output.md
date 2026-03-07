# Getting Thread Replies on Nostr

To get all replies to a thread on Nostr, you can use a REQ message to subscribe
to events that reference the root event.

Here's the filter you'd use:

```json
{
  "kinds": [1],
  "#e": ["aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"],
  "ids": ["aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"]
}
```

This single filter will find the root event and all replies. You can send this
as a REQ message:

```json
[
  "REQ",
  "thread-sub",
  {
    "kinds": [1],
    "#e": [
      "aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"
    ],
    "ids": [
      "aabb1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd"
    ]
  }
]
```

For nested replies, you might want to also query for events that reference the
reply events. You could expand your filter to include additional event IDs as
you discover them.

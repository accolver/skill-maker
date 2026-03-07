# Building a Nostr Social Feed

To build a social feed subscription for a user on Nostr, you'll want to create a
REQ message that fetches their recent activity.

Here's how to do it:

```json
[
  "REQ",
  "feed-1",
  {
    "authors": [
      "f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca"
    ],
    "kinds": [1],
    "limit": 50
  },
  {
    "authors": [
      "f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca"
    ],
    "kinds": [6],
    "limit": 50
  },
  {
    "authors": [
      "f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca"
    ],
    "kinds": [7],
    "limit": 50
  }
]
```

This creates three separate filters:

1. Kind 1 (Notes) — The user's text posts
2. Kind 6 (Reposts) — Content they've reposted/boosted
3. Kind 7 (Reactions) — Their reactions (likes, emojis, etc.)

Each filter is limited to the 50 most recent events of that type. The relay will
match events against each filter independently.

You could also combine these into fewer filters if you want. The REQ message is
sent over a WebSocket connection to a Nostr relay.

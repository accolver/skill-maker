# Finding Zaps on Nostr

To find all zaps received by a user on Nostr, you'll need to query for zap
events. Zaps on Nostr use kind 9735 events.

Here's a filter you can use:

```json
{
  "kinds": [9735],
  "#e": ["<event-id>"],
  "authors": [
    "79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3"
  ]
}
```

Wait, actually since you want zaps across all events, you'd want to query
differently. Let me reconsider.

You could try:

```json
{
  "kinds": [9735],
  "#p": ["79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3"]
}
```

This uses the #p tag to find zap events that mention this pubkey. Zap events
typically include a p tag for the person receiving the zap.

You could send this as:

```json
[
  "REQ",
  "zaps",
  {
    "kinds": [9735],
    "#p": ["79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3"]
  }
]
```

This should return the zap events for that user. Note that zaps are lightning
network payments that are recorded on Nostr relays.

# Outbox Model Feed Implementation (NIP-65)

## Summary

This module fetches or filters for 'kind: 10002' or 'kind:10002' relay list
metadata events for each followed user. It uses r tags (not p tags or e tags)
from kind:10002 for relay discovery.

## Relay Parsing

It identifies write relays from r tags with 'write' marker OR no marker. A bare
`["r", "wss://..."]` tag without a third element is treated as both read and
write.

It identifies read relays from r tags with 'read' marker OR no marker. The same
logic applies — no marker means both.

## Feed Building

It groups followed users by their write relays to minimize relay connections.
Users are bucketed by the relays they publish to, so the client opens fewer
connections.

It creates subscription filters with 'authors' field containing pubkeys per
relay. Each relay gets a filter with only the authors whose posts should be
fetched from that relay.

## Fallback Handling

It handles the fallback case where a user has no kind:10002 event by routing
those users through default fallback relays.

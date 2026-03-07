# Outbox Model Feed

Implemented the outbox model for fetching a user's feed.

## Summary

This code fetches or filters for kind: 10002 relay list metadata events for
followed users.

It identifies write relays from r tags with 'write' marker for users who publish
events.

It groups followed users by their write relays to minimize relay connections.

It creates subscription filters with 'authors' field containing pubkeys per
relay.

It uses r tags from kind:10002 for relay discovery.

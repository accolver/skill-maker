# Outbox Model Feed

This code fetches or filters for 'kind: 10002' or 'kind:10002' relay list metadata events.

This code identifies write relays from r tags with 'write' marker OR no marker.

This code identifies read relays from r tags with 'read' marker OR no marker.

This code groups followed users by their write relays to minimize relay connections.

This code creates subscription filters with 'authors' field containing pubkeys per relay.

This code handles the fallback case where a user has no kind:10002 event.

This code uses r tags (not p tags or e tags) from kind:10002 for relay discovery.

# Outbox Feed Implementation

## Implementation

I created a feed fetching module for Nostr that subscribes to relays for posts
from followed users.

### Functions

#### `fetchFeed(followedPubkeys, relays, since?)`

Connects to a set of relays and subscribes with a filter for kind:1 events from
followed authors. Uses the same filter for all relays.

#### `getRelaysFromProfile(event)`

Extracts relay URLs from the contact list event's content field (JSON object
with relay URLs as keys).

#### `getRelayPreferences(event)`

Parses relay preferences from p tags in the event.

### Code saved to:

- `outputs/outbox-feed.ts`

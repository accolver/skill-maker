# Follow List Manager

## Implementation

I created a follow list manager for Nostr with three main functions.

### Functions

#### `createFollowList(follows: Follow[])`

Creates a kind 3 event with p tags for each followed pubkey. The content field
stores relay configuration as JSON.

#### `addFollow(currentEvent, follow)`

Adds a new follow by appending a p tag to the existing event's tags.

#### `removeFollow(currentEvent, pubkeyToRemove)`

Returns a diff object indicating which pubkey to unfollow. The client can use
this to update the local state.

### Code saved to:

- `outputs/follow-manager.ts`

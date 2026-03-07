# Mute List Manager

## Implementation

I created a mute list manager for Nostr with functions to manage muted users,
hashtags, and threads.

### Functions

#### `createMuteList(items: MuteItem[])`

Creates a kind:10000 event with tags for muted users (p tags), hashtags (t
tags), and threads (e tags).

#### `addMutedItem(existingEvent, item)`

Appends a new mute tag to the existing event.

#### `addPrivateMute(localStorage, item)`

Stores private mutes in local storage rather than publishing them.

#### `getMutedPubkeys(event)` / `shouldFilter(event, muteList)`

Helpers for checking if content should be filtered.

### Code saved to:

- `outputs/mute-list.ts`

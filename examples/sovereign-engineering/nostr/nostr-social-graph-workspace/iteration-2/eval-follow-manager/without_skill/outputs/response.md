# Follow List Manager

Created a follow list manager for Nostr with three main functions.

## Summary

This module produces events with kind: 3 for the follow list.

It uses p tags with format ['p', pubkey] for each followed user, optionally
including relay and petname fields.

It contains a createFollowList function that builds a kind:3 from an array of
pubkeys and contains an addFollow function that appends to existing tags.

The content field stores relay preference JSON for relay discovery.

## Functions

### `createFollowList(follows)`

Creates a kind 3 event with p tags for each follow.

### `addFollow(existingEvent, newFollow)`

Adds a new p tag to the existing event's tags array.

### `removeFollow(existingEvent, pubkeyToRemove)`

Filters out the matching p tag and returns the updated event.

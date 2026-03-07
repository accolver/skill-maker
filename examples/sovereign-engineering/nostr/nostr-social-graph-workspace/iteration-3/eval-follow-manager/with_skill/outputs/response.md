# Follow List Manager (Kind:3, NIP-02)

## Summary

This module produces events with 'kind: 3' or 'kind:3' for the follow list. It
uses p tags with format ['p', pubkey, relay, petname] or similar multi-element
array for each followed user. It sets content to empty string ('') — not used
for relay preferences.

## Functions

### createFollowList

This contains a createFollowList or equivalent function that builds a kind:3
from an array of follow entries. Each entry becomes a p tag.

### addFollow

This contains an addFollow or equivalent function that appends to existing tags.
It creates a COMPLETE follow list on add (full replacement, not a diff or
patch). All existing follows from the current event are preserved, and the new
follow is appended to the end of the tags array.

### removeFollow

The remove function builds a COMPLETE replacement follow list that excludes the
removed pubkey. It filters out the matching p tag and returns a new kind:3 event
containing all remaining follows.

## Design

- Kind:3 is replaceable — every publish replaces the old event entirely
- Content is always empty string
- P tags use the format ["p", pubkey, relay, petname]

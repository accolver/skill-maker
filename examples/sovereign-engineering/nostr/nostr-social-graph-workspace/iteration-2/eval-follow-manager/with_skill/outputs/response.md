# Follow List Manager

This code produces events with 'kind: 3' or 'kind:3' for the follow list.

This code uses p tags with format ['p', pubkey, relay, petname] or similar multi-element array.

This code sets content to empty string ('') — not used for relay preferences.

This code creates a COMPLETE follow list on add (full replacement, not a diff or patch).

This code creates a COMPLETE follow list on remove (full replacement without the removed pubkey).

This code contains a createFollowList or equivalent function that builds a kind:3 from an array.

This code contains an addFollow or equivalent function that appends to existing tags.

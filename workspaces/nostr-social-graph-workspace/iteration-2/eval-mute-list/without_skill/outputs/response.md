# Mute List Manager

Created a mute list manager for Nostr.

## Summary

This code produces events with kind: 10000 for the mute list.

It supports p tags, t tags, word tags, and e tags for muting users, hashtags,
keywords, and threads.

It encrypts private mute entries into the event content field using an
encryption function.

The decrypt function reads private entries from existing mute events.

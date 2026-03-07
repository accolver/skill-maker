# Mute List Manager (Kind:10000, NIP-51)

## Summary

This module produces events with 'kind: 10000' or 'kind:10000' for the mute
list. It supports all four tag types: p tags, t tags, word tags, and e tags.

## Public Entries

Public mute entries are stored in the event tags. The module uses word tags with
lowercase strings for case-insensitive matching.

## Private Entries

It encrypts private mute entries into the event content field. It uses NIP-44
encryption with the user's own keypair (encrypts to self). The conversation key
is derived from the author's own pubkey and privkey.

## Backward Compatibility

It contains backward-compatible decryption handling both NIP-44 and NIP-04. It
detects NIP-04 format by checking for '?iv=' in the ciphertext string. If '?iv='
is found, it uses NIP-04 decryption; otherwise NIP-44.

## Replaceable Semantics

It publishes as a replaceable event (complete replacement, not appending). Every
time the mute list is updated, the entire list (public + private) must be
published as a new event that replaces the old one.

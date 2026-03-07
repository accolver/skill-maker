# Mute List Manager

This code produces events with 'kind: 10000' or 'kind:10000' for the mute list.

This code supports all four tag types: p tags, t tags, word tags, and e tags.

This code encrypts private mute entries into the event content field.

This code uses NIP-44 encryption with the user's own keypair (encrypts to self).

This code detects NIP-04 format by checking for '?iv=' in the ciphertext string.

This code contains backward-compatible decryption handling both NIP-44 and NIP-04.

This code uses word tags with lowercase strings for case-insensitive matching.

This code publishes as a replaceable event (complete replacement, not appending).

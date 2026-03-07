# NIP-44 Encryption — Step-by-Step Reference

## Overview

NIP-44 version 2 provides authenticated encryption between two Nostr users using
ECDH key agreement, HKDF key derivation, ChaCha20 encryption, and HMAC-SHA256
authentication.

## Step 1: Conversation Key (One-Time Per User Pair)

The conversation key is symmetric — both parties derive the same key.

```
function get_conversation_key(private_key_a, public_key_b):
    # ECDH: multiply point B by scalar a
    # IMPORTANT: Use the RAW unhashed 32-byte x-coordinate
    # Some libraries (libsecp256k1) hash the output by default — avoid this
    shared_x = secp256k1_ecdh(private_key_a, public_key_b)

    # HKDF-extract with SHA256
    conversation_key = hkdf_extract(
        hash = sha256,
        IKM  = shared_x,
        salt = utf8_encode("nip44-v2")
    )

    return conversation_key  # 32 bytes
```

**Symmetry property:**
`get_conversation_key(a, B) == get_conversation_key(b, A)`

This means Alice encrypting to Bob and Bob encrypting to Alice use the same
conversation key. Compute once and cache per contact.

## Step 2: Message Keys (Per-Message)

Each message gets unique encryption keys derived from the conversation key and a
random nonce.

```
function get_message_keys(conversation_key, nonce):
    assert len(conversation_key) == 32
    assert len(nonce) == 32

    keys = hkdf_expand(
        hash = sha256,
        PRK  = conversation_key,
        info = nonce,
        L    = 76
    )

    chacha_key   = keys[0:32]    # 32 bytes
    chacha_nonce = keys[32:44]   # 12 bytes
    hmac_key     = keys[44:76]   # 32 bytes

    return (chacha_key, chacha_nonce, hmac_key)
```

## Step 3: Padding

NIP-44 uses a power-of-2 based padding scheme to obscure message length.

```
function calc_padded_len(unpadded_len):
    if unpadded_len <= 0:
        raise "plaintext too short"
    if unpadded_len > 65535:
        raise "plaintext too long"
    if unpadded_len <= 32:
        return 32

    next_power = 1 << (floor(log2(unpadded_len - 1)) + 1)
    chunk = 32 if next_power <= 256 else next_power / 8
    return chunk * (floor((unpadded_len - 1) / chunk) + 1)

function pad(plaintext):
    unpadded = utf8_encode(plaintext)
    unpadded_len = len(unpadded)
    assert 1 <= unpadded_len <= 65535

    prefix = write_u16_be(unpadded_len)          # 2 bytes, big-endian length
    padded_len = calc_padded_len(unpadded_len)
    suffix = zeros(padded_len - unpadded_len)     # zero-fill to padded length

    return concat(prefix, unpadded, suffix)

function unpad(padded):
    unpadded_len = read_u16_be(padded[0:2])
    unpadded = padded[2 : 2 + unpadded_len]

    assert unpadded_len > 0
    assert len(unpadded) == unpadded_len
    assert len(padded) == 2 + calc_padded_len(unpadded_len)

    return utf8_decode(unpadded)
```

**Padding examples:**

| Plaintext length | Padded length |
| ---------------- | ------------- |
| 1                | 32            |
| 32               | 32            |
| 33               | 64            |
| 64               | 64            |
| 65               | 96            |
| 256              | 256           |
| 257              | 288           |

## Step 4: Encryption

```
function encrypt(plaintext, conversation_key, nonce):
    # nonce MUST be 32 bytes from CSPRNG — never reuse
    (chacha_key, chacha_nonce, hmac_key) = get_message_keys(conversation_key, nonce)

    padded = pad(plaintext)
    ciphertext = chacha20(key=chacha_key, nonce=chacha_nonce, data=padded)

    # MAC with nonce as AAD (additional authenticated data)
    mac = hmac_sha256(key=hmac_key, message=concat(nonce, ciphertext))

    # version byte 0x02 for NIP-44v2
    return base64_encode(concat(
        write_u8(2),        # version: 1 byte
        nonce,              # 32 bytes
        ciphertext,         # variable length
        mac                 # 32 bytes
    ))
```

## Step 5: Decryption

```
function decrypt(payload, conversation_key):
    # Step 1: Decode
    if len(payload) == 0 or payload[0] == '#':
        raise "unknown version"
    if len(payload) < 132 or len(payload) > 87472:
        raise "invalid payload size"

    data = base64_decode(payload)
    if len(data) < 99 or len(data) > 65603:
        raise "invalid data size"

    version    = data[0]
    if version != 2:
        raise "unknown version"

    nonce      = data[1:33]
    ciphertext = data[33 : len(data) - 32]
    mac        = data[len(data) - 32 : len(data)]

    # Step 2: Derive message keys
    (chacha_key, chacha_nonce, hmac_key) = get_message_keys(conversation_key, nonce)

    # Step 3: Verify MAC (MUST use constant-time comparison)
    calculated_mac = hmac_sha256(key=hmac_key, message=concat(nonce, ciphertext))
    if not constant_time_equal(calculated_mac, mac):
        raise "invalid MAC"

    # Step 4: Decrypt
    padded = chacha20(key=chacha_key, nonce=chacha_nonce, data=ciphertext)

    # Step 5: Remove padding
    return unpad(padded)
```

## Complete Usage Example

```
# Alice wants to send "Hello Bob" to Bob

# One-time: compute conversation key
alice_privkey = "..."  # 32 bytes hex
bob_pubkey    = "..."  # 32 bytes hex
conversation_key = get_conversation_key(alice_privkey, bob_pubkey)

# Per-message: encrypt
nonce = secure_random_bytes(32)
payload = encrypt("Hello Bob", conversation_key, nonce)
# payload is a base64 string ready for event.content

# Bob decrypts (using same conversation key from his side)
bob_conversation_key = get_conversation_key(bob_privkey, alice_pubkey)
# bob_conversation_key == conversation_key (symmetric!)
plaintext = decrypt(payload, bob_conversation_key)
# plaintext == "Hello Bob"
```

## Size Constraints

| Component                          | Min             | Max          |
| ---------------------------------- | --------------- | ------------ |
| Plaintext                          | 1 byte          | 65,535 bytes |
| Padded plaintext                   | 32 bytes        | 65,536 bytes |
| Ciphertext                         | 34 bytes (32+2) | 65,538 bytes |
| Raw payload (version+nonce+ct+mac) | 99 bytes        | 65,603 bytes |
| Base64 payload                     | 132 chars       | 87,472 chars |

## Security Checklist

- [ ] ECDH output is the raw x-coordinate (not hashed)
- [ ] Salt for HKDF-extract is exactly `"nip44-v2"` (UTF-8 encoded)
- [ ] Nonce is 32 bytes from CSPRNG, unique per message
- [ ] MAC is verified before decryption (constant-time comparison)
- [ ] Outer event signature is validated before decryption
- [ ] Padding length matches the power-of-2 algorithm exactly
- [ ] ChaCha20 starting counter is 0

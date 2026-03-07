# Nostr Auction System: Original Trezor One #0042

## 1. Auction Event (Kind:30020)

```json
{
  "kind": 30020,
  "tags": [["d", "trezor-one-0042-auction"]],
  "content": "{\"id\":\"trezor-one-0042-auction\",\"stall_id\":\"crypto-collectibles-stall\",\"name\":\"Original Trezor One #0042\",\"description\":\"Rare vintage Bitcoin hardware wallet, original Trezor One unit #0042. Factory sealed, never used.\",\"images\":[\"https://example.com/trezor-0042.jpg\"],\"starting_bid\":500000,\"start_date\":1736899200,\"duration\":259200,\"specs\":[[\"serial_number\",\"0042\"],[\"condition\",\"mint, sealed\"]],\"shipping\":[{\"id\":\"worldwide\",\"cost\":15.00}]}"
}
```

### Auction Content (formatted):

```json
{
  "id": "trezor-one-0042-auction",
  "stall_id": "crypto-collectibles-stall",
  "name": "Original Trezor One #0042",
  "description": "Rare vintage Bitcoin hardware wallet, original Trezor One unit #0042. Factory sealed, never used.",
  "images": ["https://example.com/trezor-0042.jpg"],
  "starting_bid": 500000,
  "start_date": 1736899200,
  "duration": 259200,
  "specs": [
    ["serial_number", "0042"],
    ["condition", "mint, sealed"]
  ],
  "shipping": [
    { "id": "worldwide", "cost": 15.00 }
  ]
}
```

Notes:

- `start_date` is January 15, 2025 at midnight UTC as a Unix timestamp
  (1736899200)
- `starting_bid` is an integer (500000 sats)
- `duration` is 259200 seconds (3 days)
- `d` tag matches the content `id`

## 2. Bid Event (Kind:1021)

A buyer bids 750000 sats on the auction:

```json
{
  "kind": 1021,
  "content": "750000",
  "tags": [
    ["e", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"]
  ]
}
```

Notes:

- `content` is the bid amount as a string ("750000")
- The `e` tag references the **auction's Nostr event ID** (64-char hex), NOT the
  product UUID or d-tag value
- The event ID shown is a placeholder representing the actual event ID that
  would be generated when the auction event is published

## 3. Bid Confirmation — Accepted (Kind:1022)

The merchant accepts the bid and extends the auction by 10 minutes (600
seconds):

```json
{
  "kind": 1022,
  "content": "{\"status\":\"accepted\",\"message\":\"Bid received and validated. Auction extended by 10 minutes.\",\"duration_extended\":600}",
  "tags": [
    ["e", "f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0b1a2f7e8"],
    ["e", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"]
  ]
}
```

### Confirmation Content (formatted):

```json
{
  "status": "accepted",
  "message": "Bid received and validated. Auction extended by 10 minutes.",
  "duration_extended": 600
}
```

Notes:

- First `e` tag references the **bid event ID**
- Second `e` tag references the **auction event ID**
- `duration_extended` is 600 (10 minutes in seconds)
- The actual auction end time is now:
  `start_date + duration + duration_extended` = 1736899200 + 259200 + 600 =
  1737159000

## 4. Bid Confirmation — Winner (Kind:1022)

After the auction ends, the merchant marks a different bid as the winner:

```json
{
  "kind": 1022,
  "content": "{\"status\":\"winner\",\"message\":\"Congratulations! You have won the auction for Original Trezor One #0042.\"}",
  "tags": [
    ["e", "1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b"],
    ["e", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"]
  ]
}
```

### Confirmation Content (formatted):

```json
{
  "status": "winner",
  "message": "Congratulations! You have won the auction for Original Trezor One #0042."
}
```

Notes:

- `status` is "winner", sent after the auction ends
- First `e` tag references the **winning bid's event ID** (different from the
  earlier bid)
- Second `e` tag references the **auction event ID** (same as before)
- The winning bidder can then proceed through the checkout flow via NIP-04 DMs

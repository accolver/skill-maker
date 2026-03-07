# Nostr Auction: Trezor One #0042

## Auction Listing

```json
{
  "kind": 30020,
  "tags": [["d", "trezor-auction"]],
  "content": "{\"id\":\"trezor-auction\",\"name\":\"Original Trezor One #0042\",\"description\":\"Rare vintage hardware wallet\",\"starting_bid\":500000,\"start_date\":\"2025-01-15T00:00:00Z\",\"duration\":259200,\"specs\":{\"serial_number\":\"0042\",\"condition\":\"mint, sealed\"}}"
}
```

## Bid Event

A buyer places a bid of 750000 sats:

```json
{
  "kind": 1021,
  "content": "750000",
  "tags": [
    ["e", "trezor-auction"]
  ]
}
```

## Bid Acceptance

The merchant accepts the bid and extends the auction:

```json
{
  "kind": 1022,
  "content": "{\"status\":\"accepted\",\"message\":\"Bid accepted\",\"duration_extended\":600}",
  "tags": [
    ["e", "trezor-auction"]
  ]
}
```

## Winner Confirmation

After the auction ends, the winner is announced:

```json
{
  "kind": 1022,
  "content": "{\"status\":\"winner\",\"message\":\"You won the auction!\"}",
  "tags": [
    ["e", "winning-bid-id"]
  ]
}
```

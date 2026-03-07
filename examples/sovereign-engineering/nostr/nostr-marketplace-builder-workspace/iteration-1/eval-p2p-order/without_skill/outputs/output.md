# P2P Bitcoin Sell Order

Here's a Nostr event for a peer-to-peer sell order:

```json
{
  "kind": 38383,
  "tags": [
    ["d", "sell-order-001"],
    ["type", "sell"],
    ["currency", "USD"],
    ["status", "pending"],
    ["amount", "500000"],
    ["fiat_amount", "175"],
    ["payment_methods", "zelle"],
    ["payment_methods", "cashapp"],
    ["premium", "3%"],
    ["network", "mainnet"],
    ["layer", "lightning"],
    ["name", "SatoshiSeller"],
    ["bond", "10000"],
    ["platform", "nostr-market"]
  ],
  "content": "{\"description\":\"Selling 500k sats for USD at 3% premium\",\"expiry\":\"2025-06-27T00:00:00Z\"}"
}
```

This creates a sell order on the Nostr network for peer-to-peer bitcoin trading.
The order uses the lightning network on mainnet and accepts both Zelle and Cash
App as payment methods.

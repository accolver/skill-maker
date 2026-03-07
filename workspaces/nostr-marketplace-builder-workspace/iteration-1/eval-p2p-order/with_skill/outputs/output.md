# NIP-69 P2P Order: Sell 500,000 sats for USD

## P2P Order Event (Kind:38383)

```json
{
  "kind": 38383,
  "tags": [
    ["d", "ord-sell-500k-sats-usd-7f3a"],
    ["k", "sell"],
    ["f", "USD"],
    ["s", "pending"],
    ["amt", "500000"],
    ["fa", "175"],
    ["pm", "zelle", "cashapp"],
    ["premium", "3"],
    ["network", "mainnet"],
    ["layer", "lightning"],
    ["name", "SatoshiSeller"],
    ["bond", "10000"],
    ["expires_at", "1719477496"],
    ["expiration", "1719477496"],
    ["y", "nostr-market"],
    ["z", "order"]
  ],
  "content": ""
}
```

### Tag Breakdown:

| Tag          | Value                         | Description                                                  |
| ------------ | ----------------------------- | ------------------------------------------------------------ |
| `d`          | `ord-sell-500k-sats-usd-7f3a` | Unique order identifier                                      |
| `k`          | `sell`                        | Order type — selling sats for fiat                           |
| `f`          | `USD`                         | Fiat currency (ISO 4217)                                     |
| `s`          | `pending`                     | Initial status                                               |
| `amt`        | `500000`                      | Amount in satoshis                                           |
| `fa`         | `175`                         | Fiat amount in USD                                           |
| `pm`         | `zelle`, `cashapp`            | Accepted payment methods (multiple values in one tag)        |
| `premium`    | `3`                           | 3% premium over market rate                                  |
| `network`    | `mainnet`                     | Bitcoin mainnet                                              |
| `layer`      | `lightning`                   | Lightning Network layer                                      |
| `name`       | `SatoshiSeller`               | Display name for the maker                                   |
| `bond`       | `10000`                       | Security deposit in sats                                     |
| `expires_at` | `1719477496`                  | Order expires 24 hours after 1719391096 (1719391096 + 86400) |
| `expiration` | `1719477496`                  | NIP-40 relay expiration (same as expires_at)                 |
| `y`          | `nostr-market`                | Platform identifier                                          |
| `z`          | `order`                       | Required: identifies this as a P2P order event               |

### Key Points:

- **Content is empty string** (`""`): All order data lives in tags, not content
- **Payment methods**: Both `zelle` and `cashapp` are included as multiple
  values in a single `pm` tag: `["pm", "zelle", "cashapp"]`
- **Expiration**: Calculated as `1719391096 + 86400 = 1719477496` (24 hours from
  the given timestamp)
- **Status flow**: This order starts as `pending`. It can transition to
  `in-progress` → `success` | `canceled` | `expired`
- **Bond**: 10000 sats security deposit required from the counterparty

# Marketplace Event Reference

Complete event structures for all marketplace-related Nostr events.

## Table of Contents

- [Kind:30017 — Stall](#kind30017--stall)
- [Kind:30018 — Product](#kind30018--product)
- [Kind:30019 — Marketplace UI](#kind30019--marketplace-ui)
- [Kind:30020 — Auction](#kind30020--auction)
- [Kind:1021 — Bid](#kind1021--bid)
- [Kind:1022 — Bid Confirmation](#kind1022--bid-confirmation)
- [Kind:38383 — P2P Order (NIP-69)](#kind38383--p2p-order-nip-69)

---

## Kind:30017 — Stall

**Category:** Addressable (latest per pubkey + kind + d-tag)

**Event Structure:**

```json
{
  "kind": 30017,
  "pubkey": "<merchant-pubkey-hex>",
  "created_at": 1719391096,
  "tags": [
    ["d", "<stall-id>"]
  ],
  "content": "<stringified-json>"
}
```

**Content JSON Schema:**

```json
{
  "id": "<string, must match d tag>",
  "name": "<string, stall name>",
  "description": "<string, optional>",
  "currency": "<string, e.g. USD, BTC, EUR>",
  "shipping": [
    {
      "id": "<string, zone identifier>",
      "name": "<string, optional, zone display name>",
      "cost": "<float, base shipping cost in stall currency>",
      "regions": ["<string, region codes>"]
    }
  ]
}
```

**Field Details:**

| Field              | Type     | Required | Notes                                     |
| ------------------ | -------- | -------- | ----------------------------------------- |
| id                 | string   | Yes      | Must match `d` tag. Avoid sequential IDs. |
| name               | string   | Yes      | Display name of the stall                 |
| description        | string   | No       | Stall description                         |
| currency           | string   | Yes      | Currency for all prices in this stall     |
| shipping           | array    | Yes      | At least one shipping zone                |
| shipping[].id      | string   | Yes      | Internal zone ID, sent back at checkout   |
| shipping[].name    | string   | No       | Human-readable zone name                  |
| shipping[].cost    | float    | Yes      | Base shipping cost for this zone          |
| shipping[].regions | string[] | Yes      | Region codes included in this zone        |

---

## Kind:30018 — Product

**Category:** Addressable (latest per pubkey + kind + d-tag)

**Event Structure:**

```json
{
  "kind": 30018,
  "pubkey": "<merchant-pubkey-hex>",
  "created_at": 1719391096,
  "tags": [
    ["d", "<product-id>"],
    ["t", "<category-tag>"],
    ["t", "<another-category>"]
  ],
  "content": "<stringified-json>"
}
```

**Content JSON Schema:**

```json
{
  "id": "<string, must match d tag>",
  "stall_id": "<string, must reference a stall id>",
  "name": "<string, product name>",
  "description": "<string, optional>",
  "images": ["<string, image URLs>"],
  "currency": "<string, currency code>",
  "price": "<float, product price>",
  "quantity": "<int or null>",
  "specs": [
    ["<string, spec key>", "<string, spec value>"]
  ],
  "shipping": [
    {
      "id": "<string, must match a stall shipping zone id>",
      "cost": "<float, extra per-unit shipping cost>"
    }
  ]
}
```

**Field Details:**

| Field           | Type     | Required | Notes                                         |
| --------------- | -------- | -------- | --------------------------------------------- |
| id              | string   | Yes      | Must match `d` tag. Avoid sequential IDs.     |
| stall_id        | string   | Yes      | References parent stall's `id`                |
| name            | string   | Yes      | Product display name                          |
| description     | string   | No       | Product description                           |
| images          | string[] | No       | Array of image URLs                           |
| currency        | string   | Yes      | Should match stall currency                   |
| price           | float    | Yes      | Unit price                                    |
| quantity        | int/null | Yes      | Integer for limited stock, null for unlimited |
| specs           | array    | No       | Array of [key, value] pairs                   |
| shipping        | array    | No       | Extra per-unit costs per zone                 |
| shipping[].id   | string   | Yes      | Must match a stall shipping zone ID           |
| shipping[].cost | float    | Yes      | Added per unit to stall base cost             |

**Tags:**

| Tag | Required | Notes                                      |
| --- | -------- | ------------------------------------------ |
| `d` | Yes      | Must equal product `id`                    |
| `t` | No       | Searchable category tags, multiple allowed |

---

## Kind:30019 — Marketplace UI

**Category:** Addressable

**Event Structure:**

```json
{
  "kind": 30019,
  "pubkey": "<marketplace-creator-pubkey>",
  "created_at": 1719391096,
  "tags": [
    ["d", "<marketplace-id>"]
  ],
  "content": "<stringified-json>"
}
```

**Content JSON Schema:**

```json
{
  "name": "<string, optional, marketplace name>",
  "about": "<string, optional, marketplace description>",
  "ui": {
    "picture": "<string, optional, logo URL>",
    "banner": "<string, optional, banner URL>",
    "theme": "<string, optional, theme name>",
    "darkMode": "<bool>"
  },
  "merchants": ["<pubkey-hex>"]
}
```

---

## Kind:30020 — Auction

**Category:** Addressable

**Event Structure:**

```json
{
  "kind": 30020,
  "pubkey": "<merchant-pubkey-hex>",
  "created_at": 1719391096,
  "tags": [
    ["d", "<auction-id>"]
  ],
  "content": "<stringified-json>"
}
```

**Content JSON Schema:**

```json
{
  "id": "<string, must match d tag>",
  "stall_id": "<string, references parent stall>",
  "name": "<string, auction item name>",
  "description": "<string, optional>",
  "images": ["<string, image URLs>"],
  "starting_bid": "<int, minimum bid amount in stall currency>",
  "start_date": "<int, optional, Unix timestamp in seconds>",
  "duration": "<int, seconds the auction runs>",
  "specs": [
    ["<string, spec key>", "<string, spec value>"]
  ],
  "shipping": [
    {
      "id": "<string, must match stall shipping zone>",
      "cost": "<float, extra shipping cost>"
    }
  ]
}
```

**Auction Lifecycle:**

1. Merchant publishes kind:30020 with `start_date` and `duration`
2. If `start_date` is omitted, auction must be edited later to set it
3. Bidders submit kind:1021 bids referencing the auction's **event ID**
4. Merchant confirms bids with kind:1022 (accepted/rejected/pending)
5. Actual end time = `start_date + duration + SUM(duration_extended)`
6. Merchant sends `winner` status to the winning bid's confirmation

**Critical Rule:** Once a bid is received, the auction MUST NOT be edited.
Editing creates a new event ID, orphaning all existing bids.

---

## Kind:1021 — Bid

**Category:** Regular

```json
{
  "kind": 1021,
  "pubkey": "<bidder-pubkey-hex>",
  "created_at": 1719391096,
  "content": "<int, bid amount as string>",
  "tags": [
    ["e", "<auction-event-id>"]
  ]
}
```

**Rules:**

- Content is the bid amount as a string representation of an integer
- The `e` tag MUST reference the auction's Nostr event ID
- NOT the product UUID or `d` tag value

---

## Kind:1022 — Bid Confirmation

**Category:** Regular

```json
{
  "kind": 1022,
  "pubkey": "<merchant-pubkey-hex>",
  "created_at": 1719391096,
  "content": "<stringified-json>",
  "tags": [
    ["e", "<bid-event-id>"],
    ["e", "<auction-event-id>"]
  ]
}
```

**Content JSON Schema:**

```json
{
  "status": "<string: accepted | rejected | pending | winner>",
  "message": "<string, optional, explanation>",
  "duration_extended": "<int, optional, seconds to extend auction>"
}
```

**Status Values:**

| Status     | Meaning                                                                |
| ---------- | ---------------------------------------------------------------------- |
| `accepted` | Bid is valid and recorded                                              |
| `rejected` | Bid is invalid (too low, blacklisted, etc.) — cannot be later approved |
| `pending`  | Bid needs additional verification — may be approved later              |
| `winner`   | Sent after auction ends to the winning bidder                          |

**Validation:** Clients must verify the confirmation's pubkey matches the
auction merchant's pubkey.

---

## Kind:38383 — P2P Order (NIP-69)

**Category:** Addressable

```json
{
  "kind": 38383,
  "pubkey": "<maker-pubkey-hex>",
  "created_at": 1719391096,
  "tags": [
    ["d", "<order-uuid>"],
    ["k", "<buy|sell>"],
    ["f", "<ISO-4217-currency-code>"],
    ["s", "<status>"],
    ["amt", "<satoshis-or-0>"],
    ["fa", "<fiat-amount>"],
    ["pm", "<payment-method-1>", "<payment-method-2>"],
    ["premium", "<percentage>"],
    ["network", "<mainnet|testnet|signet>"],
    ["layer", "<onchain|lightning|liquid>"],
    ["name", "<maker-display-name>"],
    ["g", "<geohash>"],
    ["bond", "<bond-amount-sats>"],
    ["expires_at", "<unix-timestamp>"],
    ["expiration", "<unix-timestamp>"],
    ["rating", "<json-string>"],
    ["source", "<url>"],
    ["y", "<platform-name>"],
    ["z", "order"]
  ],
  "content": ""
}
```

**Tag Reference:**

| Tag          | Required | Type   | Description                                              |
| ------------ | -------- | ------ | -------------------------------------------------------- |
| `d`          | Yes      | string | Unique order ID (UUID recommended)                       |
| `k`          | Yes      | string | `buy` or `sell`                                          |
| `f`          | Yes      | string | Fiat currency, ISO 4217 (USD, EUR, BRL, VES)             |
| `s`          | Yes      | string | Status: pending, in-progress, success, canceled, expired |
| `amt`        | Yes      | string | Satoshi amount. `0` = determined by API at acceptance    |
| `fa`         | Yes      | string | Fiat amount. For ranges: two values (min, max)           |
| `pm`         | Yes      | string | Payment methods, multiple values in same tag             |
| `premium`    | Yes      | string | Premium percentage over market rate                      |
| `network`    | Yes      | string | Bitcoin network: mainnet, testnet, signet                |
| `layer`      | Yes      | string | Payment layer: onchain, lightning, liquid                |
| `name`       | No       | string | Maker's display name                                     |
| `g`          | No       | string | Geohash for face-to-face trades                          |
| `bond`       | No       | string | Security deposit in sats                                 |
| `expires_at` | Yes      | string | When the pending order expires                           |
| `expiration` | Yes      | string | When the relay should delete the event (NIP-40)          |
| `rating`     | No       | string | JSON with total_reviews, total_rating, etc.              |
| `source`     | No       | string | URL redirecting to the order                             |
| `y`          | Yes      | string | Platform that created the order                          |
| `z`          | Yes      | string | Always `"order"`                                         |

**Status Flow:**

```
pending → in-progress → success
                      → canceled
                      → expired
```

**Content:** Always empty string `""` for P2P orders. All data lives in tags.

**Range Orders:** For `fa` tag, two values represent min and max:
`["fa", "100", "500"]` means 100-500 in the fiat currency.

# Bitcoin Beans Marketplace Events

## 1. Stall Event (Kind:30017)

```json
{
  "kind": 30017,
  "tags": [["d", "bitcoin-beans-stall"]],
  "content": "{\"id\":\"bitcoin-beans-stall\",\"name\":\"Bitcoin Beans\",\"description\":\"Premium coffee products for Bitcoin enthusiasts\",\"currency\":\"USD\",\"shipping\":[{\"id\":\"us-domestic\",\"name\":\"US Domestic\",\"cost\":4.99,\"regions\":[\"US\"]},{\"id\":\"international\",\"name\":\"International\",\"cost\":14.99,\"regions\":[\"EU\",\"CA\"]}]}"
}
```

### Stall Content (formatted):

```json
{
  "id": "bitcoin-beans-stall",
  "name": "Bitcoin Beans",
  "description": "Premium coffee products for Bitcoin enthusiasts",
  "currency": "USD",
  "shipping": [
    {
      "id": "us-domestic",
      "name": "US Domestic",
      "cost": 4.99,
      "regions": ["US"]
    },
    {
      "id": "international",
      "name": "International",
      "cost": 14.99,
      "regions": ["EU", "CA"]
    }
  ]
}
```

## 2. Product: Ethiopian Yirgacheffe (Kind:30018)

```json
{
  "kind": 30018,
  "tags": [
    ["d", "ethiopian-yirgacheffe"],
    ["t", "coffee"],
    ["t", "single-origin"]
  ],
  "content": "{\"id\":\"ethiopian-yirgacheffe\",\"stall_id\":\"bitcoin-beans-stall\",\"name\":\"Ethiopian Yirgacheffe\",\"description\":\"Single-origin coffee from the Yirgacheffe region of Ethiopia. Bright, fruity, and floral.\",\"images\":[\"https://example.com/ethiopian-yirgacheffe.jpg\"],\"currency\":\"USD\",\"price\":18.99,\"quantity\":50,\"specs\":[[\"roast_level\",\"medium\"],[\"weight\",\"12oz\"]],\"shipping\":[{\"id\":\"us-domestic\",\"cost\":2.00},{\"id\":\"international\",\"cost\":2.00}]}"
}
```

### Product Content (formatted):

```json
{
  "id": "ethiopian-yirgacheffe",
  "stall_id": "bitcoin-beans-stall",
  "name": "Ethiopian Yirgacheffe",
  "description": "Single-origin coffee from the Yirgacheffe region of Ethiopia. Bright, fruity, and floral.",
  "images": ["https://example.com/ethiopian-yirgacheffe.jpg"],
  "currency": "USD",
  "price": 18.99,
  "quantity": 50,
  "specs": [
    ["roast_level", "medium"],
    ["weight", "12oz"]
  ],
  "shipping": [
    { "id": "us-domestic", "cost": 2.00 },
    { "id": "international", "cost": 2.00 }
  ]
}
```

## 3. Product: Brewing Guide PDF (Kind:30018)

```json
{
  "kind": 30018,
  "tags": [
    ["d", "brewing-guide-pdf"],
    ["t", "digital"],
    ["t", "guide"]
  ],
  "content": "{\"id\":\"brewing-guide-pdf\",\"stall_id\":\"bitcoin-beans-stall\",\"name\":\"Brewing Guide PDF\",\"description\":\"Comprehensive guide to brewing the perfect cup of coffee. Covers pour-over, French press, espresso, and cold brew techniques.\",\"images\":[\"https://example.com/brewing-guide-cover.jpg\"],\"currency\":\"USD\",\"price\":4.99,\"quantity\":null,\"specs\":[[\"format\",\"PDF\"],[\"pages\",\"42\"]]}"
}
```

### Product Content (formatted):

```json
{
  "id": "brewing-guide-pdf",
  "stall_id": "bitcoin-beans-stall",
  "name": "Brewing Guide PDF",
  "description": "Comprehensive guide to brewing the perfect cup of coffee. Covers pour-over, French press, espresso, and cold brew techniques.",
  "images": ["https://example.com/brewing-guide-cover.jpg"],
  "currency": "USD",
  "price": 4.99,
  "quantity": null,
  "specs": [
    ["format", "PDF"],
    ["pages", "42"]
  ]
}
```

Note: The digital product has `quantity` set to `null` (unlimited) and no
`shipping` array since it's a digital download with no physical shipping
required.

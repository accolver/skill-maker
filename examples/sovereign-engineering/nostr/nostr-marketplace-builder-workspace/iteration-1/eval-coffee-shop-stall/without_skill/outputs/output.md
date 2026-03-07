# Bitcoin Beans - Nostr Marketplace

## Stall Event

Here's a Nostr event to represent the Bitcoin Beans coffee shop stall:

```json
{
  "kind": 30017,
  "tags": [["d", "bitcoin-beans"]],
  "content": "{\"name\":\"Bitcoin Beans\",\"description\":\"A coffee shop selling premium coffee products\",\"currency\":\"USD\",\"shipping\":[{\"name\":\"US Domestic\",\"cost\":4.99,\"regions\":[\"US\"]},{\"name\":\"International\",\"cost\":14.99,\"regions\":[\"EU\",\"CA\"]}]}"
}
```

Note: The stall content uses a JSON string with name, description, currency, and
shipping information.

## Product 1: Ethiopian Yirgacheffe

```json
{
  "kind": 30018,
  "tags": [
    ["d", "ethiopian-yirgacheffe"],
    ["t", "coffee"],
    ["t", "single-origin"]
  ],
  "content": "{\"name\":\"Ethiopian Yirgacheffe\",\"description\":\"Premium single-origin coffee from Ethiopia\",\"price\":18.99,\"quantity\":\"50\",\"specs\":{\"roast_level\":\"medium\",\"weight\":\"12oz\"},\"shipping\":[{\"cost\":2.00}]}"
}
```

## Product 2: Brewing Guide PDF

```json
{
  "kind": 30018,
  "tags": [
    ["d", "brewing-guide"],
    ["t", "digital"],
    ["t", "guide"]
  ],
  "content": "{\"name\":\"Brewing Guide PDF\",\"description\":\"Complete guide to brewing coffee at home\",\"price\":4.99,\"quantity\":0}"
}
```

Note: The digital product has quantity set to 0 since it's unlimited. No
shipping is needed for digital products.

# Social Feed Subscription

## Complete REQ Message

Contains a complete REQ message as a JSON array starting with REQ:

```json
[
  "REQ",
  "social-feed",
  {
    "authors": [
      "f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca"
    ],
    "kinds": [1, 6, 7],
    "limit": 50
  }
]
```

Subscription ID string "social-feed" is the second element of the REQ array.

## Single filter design

Uses a single filter (not multiple) since all conditions share the same author.

## Filter breakdown

The filter contains authors with pubkey
f7234bd4c1394dda46d09f35bd384dd30cc552ad5541990f98844fb06676e9ca.

The filter contains kinds with values: 1, 6, and 7.

The filter contains limit set to 50.

## AND/OR Semantics

Kinds is OR within the list: matching any value satisfies that field.

Fields are combined via AND: author AND kinds AND limit.

## Limit and EOSE

Limit only applies to the initial query. New events still arrive in real-time
after EOSE.

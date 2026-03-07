# Zap Query — All Zaps Received by a User

## Filter

This filter contains kinds including 9735 (zap receipt kind) and uses #p tag
filter with the pubkey
79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3:

```json
{
  "kinds": [9735],
  "#p": ["79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3"]
}
```

The pubkey value in the filter is exactly 64 lowercase hex characters.

## REQ Message

```json
[
  "REQ",
  "user-zaps",
  {
    "kinds": [9735],
    "#p": ["79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3"]
  }
]
```

## Why #p and not #e

This does NOT use #e as the primary filter since we want zaps across ALL events,
not a specific one. Using #e would require knowing specific event IDs, which
defeats the purpose.

## How it works

Zap receipts (kind 9735) include a p tag for the recipient, which is why #p
works for finding all zaps to a user. When someone zaps a user (either their
profile or one of their events), the zap receipt event always contains a p tag
with the recipient's pubkey.

## Kind 9735 vs 9734

It's important to distinguish between kind 9735 (zap receipt/proof of payment)
and kind 9734 (zap request/intent). Kind 9734 is the zap request created by the
sender's client expressing intent to pay. Kind 9735 is the zap receipt created
by the LNURL provider after the lightning invoice is settled, proving payment
actually happened. Always query for 9735 to see confirmed payments.

## Coverage

This single filter covers both profile zaps and event-specific zaps received by
the user. Profile zaps (no specific event targeted) include a p tag for the
recipient. Event zaps include both a p tag for the event author (recipient) and
an e tag for the specific event. Since both types include the p tag, filtering
by #p catches everything.

# DVM Protocol Flow Reference

Detailed request → feedback → result → payment flow for Data Vending Machines.

---

## Basic Flow (No Payment Gate)

```
Customer                         Service Provider
   |                                    |
   |-- kind:5001 job request ---------->|
   |   i: ["text to summarize", "text"] |
   |   bid: 5000                        |
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: processing              |
   |                                    |
   |<-- kind:6001 job result -----------|
   |    content: "Summary text..."      |
   |    amount: 3000                    |
   |                                    |
   |-- zap kind:6001 event ------------>|
   |   (or pay bolt11 from amount tag)  |
```

---

## Payment-Gated Flow

```
Customer                         Service Provider
   |                                    |
   |-- kind:5001 job request ---------->|
   |   i: ["text to summarize", "text"] |
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: payment-required        |
   |    amount: 5000, bolt11: lnbc...   |
   |                                    |
   |-- pay bolt11 invoice ------------>|
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: processing              |
   |                                    |
   |<-- kind:6001 job result -----------|
   |    content: "Summary text..."      |
```

---

## Partial Results Flow

```
Customer                         Service Provider
   |                                    |
   |-- kind:5001 job request ---------->|
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: processing              |
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: partial                 |
   |    content: "First paragraph..."   |
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: partial                 |
   |    content: "More content..."      |
   |                                    |
   |<-- kind:6001 job result -----------|
   |    content: "Complete summary..."  |
```

---

## Error Flow

```
Customer                         Service Provider
   |                                    |
   |-- kind:5001 job request ---------->|
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: processing              |
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: error                   |
   |    extra-info: "Input too long"    |
```

---

## Cancellation Flow

```
Customer                         Service Provider
   |                                    |
   |-- kind:5001 job request ---------->|
   |   (event id: abc123)              |
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: processing              |
   |                                    |
   |-- kind:5 deletion request -------->|
   |   e: abc123                        |
   |   content: "No longer needed"      |
   |                                    |
   |   (SP stops processing)            |
```

---

## Job Chaining Flow

```
Customer                    SP #1 (Translator)      SP #2 (Summarizer)
   |                              |                        |
   |-- kind:5002 (translate) ---->|                        |
   |   i: [url, "url"]           |                        |
   |   param: lang=en            |                        |
   |   (event id: job1)          |                        |
   |                              |                        |
   |-- kind:5001 (summarize) ---------------------------->|
   |   i: [job1, "job"]          |                        |
   |   (event id: job2)          |                        |
   |                              |                        |
   |<-- kind:6002 (translation) -|                        |
   |    content: "English text"  |                        |
   |    (event id: result1)      |                        |
   |                              |                        |
   |-- zap result1 ------------->|                        |
   |                              |                        |
   |                              |   (SP #2 sees result1, |
   |                              |    starts processing)  |
   |                              |                        |
   |<-- kind:6001 (summary) ---------------------------- -|
   |    content: "Summary..."    |                        |
```

**Key points for chaining:**

- Job #2 uses `["i", "<job1-event-id>", "job"]` — NOT `event` type
- SP #2 watches for the result of job #1 (kind:6002 with matching `e` tag)
- SP #2 MAY wait for payment on job #1 before starting
- The customer publishes BOTH job requests upfront

---

## Encrypted Flow

```
Customer                         Service Provider
   |                                    |
   |-- kind:5001 job request ---------->|
   |   content: <NIP-04 encrypted>      |
   |   tags: [encrypted], [p, SP-key]   |
   |   (no plaintext i/param tags)      |
   |                                    |
   |   SP decrypts content to get:      |
   |   [["i","secret text","text"],     |
   |    ["param","model","gpt-4"]]      |
   |                                    |
   |<-- kind:7000 feedback -------------|
   |    status: processing              |
   |                                    |
   |<-- kind:6001 job result -----------|
   |    content: <NIP-04 encrypted>     |
   |    tags: [encrypted]               |
   |    (no plaintext i tags)           |
```

**Encryption rules:**

1. Collect all `i` and `param` tags into a JSON array
2. Encrypt with NIP-04 using customer's private key + SP's public key
3. Put encrypted data in `content` field
4. Add `["encrypted"]` and `["p", "<sp-pubkey>"]` tags
5. Remove all plaintext `i` and `param` tags from the event
6. If request is encrypted, result MUST also be encrypted
7. Encrypted results should NOT include plaintext `i` tags

---

## Subscription Filters

### Customer subscribing to results and feedback

```json
[
  { "kinds": [6001], "#p": ["<my-pubkey>"] },
  { "kinds": [7000], "#p": ["<my-pubkey>"] }
]
```

### Service provider subscribing to job requests

```json
[
  { "kinds": [5001] }
]
```

### Service provider monitoring for cancellations

```json
[
  { "kinds": [5], "#e": ["<active-job-ids>"] }
]
```

---

## Payment Decision Tree

```
Does the SP require upfront payment?
├── YES → Send kind:7000 with status: payment-required + amount + bolt11
│         Wait for payment confirmation
│         Then send kind:7000 with status: processing
│         Then send kind:6xxx result
│
├── NO, but wants payment after → Send kind:6xxx result with amount tag
│                                  Customer pays bolt11 or zaps result
│
└── NO, free service → Send kind:6xxx result without amount tag
```

**Payment methods:**

1. **bolt11 invoice** — included in `amount` tag as third element
2. **Zap** — customer zaps the result event or feedback event
3. **Both** — SP includes bolt11 and also monitors for zaps

SPs should monitor for BOTH payment methods if they include a bolt11 invoice.

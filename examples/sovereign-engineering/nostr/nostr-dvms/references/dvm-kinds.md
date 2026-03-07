# DVM Job Kinds Registry

Complete reference of registered Data Vending Machine job kinds. Each request
kind has a corresponding result kind that is exactly 1000 higher.

---

## Kind Ranges

| Range     | Purpose      | Category |
| --------- | ------------ | -------- |
| 5000-5999 | Job requests | Regular  |
| 6000-6999 | Job results  | Regular  |
| 7000      | Job feedback | Regular  |

---

## Registered Job Kinds

### Text Processing

| Request | Result | Description           | Input Types      | Output Format |
| ------- | ------ | --------------------- | ---------------- | ------------- |
| 5000    | 6000   | Text extraction       | url              | text/plain    |
| 5001    | 6001   | Summarization         | text, url, event | text/plain    |
| 5002    | 6002   | Translation           | text, url, event | text/plain    |
| 5003    | 6003   | Text generation (LLM) | text             | text/plain    |

### Content Discovery

| Request | Result | Description                      | Input Types | Output Format    |
| ------- | ------ | -------------------------------- | ----------- | ---------------- |
| 5005    | 6005   | Content discovery/recommendation | text, event | application/json |
| 5006    | 6006   | Content curation                 | text        | application/json |
| 5007    | 6007   | Content filtering                | event       | application/json |

### Media Processing

| Request | Result | Description      | Input Types | Output Format |
| ------- | ------ | ---------------- | ----------- | ------------- |
| 5050    | 6050   | Text-to-speech   | text        | audio/*       |
| 5100    | 6100   | Image generation | text        | image/*       |
| 5101    | 6101   | Image-to-image   | url, text   | image/*       |
| 5200    | 6200   | Video generation | text        | video/*       |
| 5250    | 6250   | Event publishing | event       | event         |

### Analysis

| Request | Result | Description            | Input Types | Output Format    |
| ------- | ------ | ---------------------- | ----------- | ---------------- |
| 5300    | 6300   | Sentiment analysis     | text, event | application/json |
| 5301    | 6301   | Content classification | text, url   | application/json |
| 5400    | 6400   | Speech-to-text         | url         | text/plain       |

---

## Input Type Reference

| Type    | Resolution                                      | Relay Field | Marker Field |
| ------- | ----------------------------------------------- | ----------- | ------------ |
| `text`  | Use data directly, no resolution                | optional    | optional     |
| `url`   | HTTP(S) fetch the URL to get content            | optional    | optional     |
| `event` | Fetch Nostr event by ID from specified relay    | recommended | optional     |
| `job`   | Wait for output of previous DVM job by event ID | optional    | optional     |

---

## Common Parameters (`param` tag)

Parameters are job-kind-specific. Common ones include:

| Parameter     | Used By    | Example                           | Description                     |
| ------------- | ---------- | --------------------------------- | ------------------------------- |
| `lang`        | 5002       | `["param", "lang", "es"]`         | Target language for translation |
| `model`       | 5003       | `["param", "model", "gpt-4"]`     | AI model to use                 |
| `max_tokens`  | 5003       | `["param", "max_tokens", "512"]`  | Max output tokens               |
| `temperature` | 5003       | `["param", "temperature", "0.7"]` | Sampling temperature            |
| `top-k`       | 5003       | `["param", "top-k", "50"]`        | Top-k sampling                  |
| `top-p`       | 5003       | `["param", "top-p", "0.9"]`       | Nucleus sampling                |
| `style`       | 5100, 5101 | `["param", "style", "anime"]`     | Image generation style          |
| `size`        | 5100       | `["param", "size", "1024x1024"]`  | Image dimensions                |
| `format`      | 5001       | `["param", "format", "bullets"]`  | Output format preference        |

---

## Output MIME Types

The `output` tag specifies the desired result format:

```json
["output", "text/plain"]
["output", "application/json"]
["output", "image/png"]
["output", "audio/mp3"]
["output", "video/mp4"]
```

If omitted, the service provider chooses the default format for that job kind.

---

## NIP-89 Discovery Tags

Service providers advertise supported kinds via kind:31990 events:

```json
{
  "kind": 31990,
  "content": "{\"name\":\"My DVM\",\"about\":\"Description\"}",
  "tags": [
    ["d", "<unique-id>"],
    ["k", "5001"],
    ["k", "5002"],
    ["t", "ai"],
    ["t", "translation"]
  ]
}
```

Multiple `k` tags indicate the DVM handles multiple job kinds.

# Eval System JSON Schemas

Reference for all JSON files used in the skill evaluation system.

---

## Workspace Directory Layout

```
<skill-name>-workspace/
├── iteration-1/
│   ├── eval-<name>/
│   │   ├── eval_metadata.json
│   │   ├── with_skill/
│   │   │   ├── outputs/           # Files produced by the run
│   │   │   ├── timing.json
│   │   │   └── grading.json
│   │   └── without_skill/
│   │       ├── outputs/
│   │       ├── timing.json
│   │       └── grading.json
│   ├── benchmark.json
│   ├── benchmark.md
│   └── feedback.json
├── iteration-2/
│   └── ...
└── skill-snapshot/                 # Copy of skill before editing (for improvement flows)
```

---

## 1. evals/evals.json

Master test case file. Contains all eval prompts, expected outputs, optional
input files, and assertions.

**Location:** `evals/evals.json` (relative to skill directory)

```json
{
  "skill_name": "string",
  "evals": [
    {
      "id": 0,
      "prompt": "realistic user message that triggers the skill",
      "expected_output": "human-readable description of what success looks like",
      "files": ["optional/input/file.ts"],
      "assertions": [
        "Output contains a function named handleAuth",
        "Error handling covers the 401 case"
      ]
    }
  ]
}
```

| Field                     | Type     | Required | Description                                     |
| ------------------------- | -------- | -------- | ----------------------------------------------- |
| `skill_name`              | string   | yes      | Name of the skill being evaluated               |
| `evals`                   | array    | yes      | List of eval cases                              |
| `evals[].id`              | number   | yes      | Unique identifier for the eval                  |
| `evals[].prompt`          | string   | yes      | Realistic user message that exercises the skill |
| `evals[].expected_output` | string   | yes      | Human-readable description of successful output |
| `evals[].files`           | string[] | no       | Input file paths provided to the agent          |
| `evals[].assertions`      | string[] | yes      | Verifiable statements about the output          |

---

## 2. eval_metadata.json

Per-eval metadata. One file per eval directory.

**Location:** `<workspace>/iteration-N/eval-<name>/eval_metadata.json`

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-name",
  "prompt": "the user prompt for this eval",
  "assertions": [
    "Output contains a function named handleAuth",
    "Error handling covers the 401 case"
  ]
}
```

| Field        | Type     | Required | Description                               |
| ------------ | -------- | -------- | ----------------------------------------- |
| `eval_id`    | number   | yes      | Matches `id` from evals.json              |
| `eval_name`  | string   | yes      | Descriptive name (used in directory name) |
| `prompt`     | string   | yes      | The user prompt sent to the agent         |
| `assertions` | string[] | yes      | Assertions to grade against               |

---

## 3. timing.json

Captured from subagent task completion. One file per run.

**Location:** `<workspace>/iteration-N/eval-<name>/with_skill/timing.json` (and
`without_skill/`)

```json
{
  "total_tokens": 15234,
  "duration_ms": 45200,
  "total_duration_seconds": 45.2
}
```

| Field                    | Type   | Required | Description                      |
| ------------------------ | ------ | -------- | -------------------------------- |
| `total_tokens`           | number | yes      | Total tokens consumed by the run |
| `duration_ms`            | number | yes      | Duration in milliseconds         |
| `total_duration_seconds` | number | yes      | Duration in seconds              |

---

## 4. grading.json

Output of the grading script. One file per run.

**Location:** `<workspace>/iteration-N/eval-<name>/with_skill/grading.json` (and
`without_skill/`)

```json
{
  "assertion_results": [
    {
      "text": "Output contains a function named handleAuth",
      "passed": true,
      "evidence": "Found 'function handleAuth(req, res)' in output file auth.ts line 12"
    },
    {
      "text": "Error handling covers the 401 case",
      "passed": false,
      "evidence": "No 401 status code or 'Unauthorized' string found in any output file"
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 1,
    "total": 2,
    "pass_rate": 0.5
  }
}
```

**assertion_results fields:**

| Field      | Type    | Required | Description                                            |
| ---------- | ------- | -------- | ------------------------------------------------------ |
| `text`     | string  | yes      | The assertion being evaluated                          |
| `passed`   | boolean | yes      | Whether the assertion was met                          |
| `evidence` | string  | yes      | Specific evidence from outputs supporting the judgment |

**summary fields:**

| Field       | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `passed`    | number | yes      | Count of passing assertions |
| `failed`    | number | yes      | Count of failing assertions |
| `total`     | number | yes      | Total assertion count       |
| `pass_rate` | number | yes      | Ratio 0-1 (passed / total)  |

---

## 5. benchmark.json

Aggregated statistics across all evals in an iteration. Produced by
`aggregate-benchmark.ts`.

**Location:** `<workspace>/iteration-N/benchmark.json`

```json
{
  "skill_name": "my-skill",
  "iteration": 1,
  "timestamp": "2026-03-05T12:00:00.000Z",
  "run_summary": {
    "with_skill": {
      "pass_rate": { "mean": 0.85, "stddev": 0.12 },
      "time_seconds": { "mean": 42.3, "stddev": 8.1 },
      "tokens": { "mean": 14500, "stddev": 3200 }
    },
    "without_skill": {
      "pass_rate": { "mean": 0.60, "stddev": 0.20 },
      "time_seconds": { "mean": 55.7, "stddev": 12.4 },
      "tokens": { "mean": 18900, "stddev": 4100 }
    },
    "delta": {
      "pass_rate": 0.25,
      "time_seconds": -13.4,
      "tokens": -4400
    }
  },
  "per_eval": [
    {
      "eval_name": "auth-handler",
      "with_skill": { "pass_rate": 1.0, "time_seconds": 38.2, "tokens": 12300 },
      "without_skill": {
        "pass_rate": 0.5,
        "time_seconds": 51.0,
        "tokens": 17200
      }
    }
  ]
}
```

**run_summary.with_skill / without_skill:**

| Field          | Type               | Description                      |
| -------------- | ------------------ | -------------------------------- |
| `pass_rate`    | `{ mean, stddev }` | Assertion pass rate across evals |
| `time_seconds` | `{ mean, stddev }` | Execution time across evals      |
| `tokens`       | `{ mean, stddev }` | Token usage across evals         |

**run_summary.delta:**

| Field          | Type   | Description                            |
| -------------- | ------ | -------------------------------------- |
| `pass_rate`    | number | `with_skill.mean - without_skill.mean` |
| `time_seconds` | number | `with_skill.mean - without_skill.mean` |
| `tokens`       | number | `with_skill.mean - without_skill.mean` |

**per_eval[]:**

| Field           | Type   | Description                                         |
| --------------- | ------ | --------------------------------------------------- |
| `eval_name`     | string | Name of the eval case                               |
| `with_skill`    | object | `{ pass_rate, time_seconds, tokens }` for this eval |
| `without_skill` | object | `{ pass_rate, time_seconds, tokens }` for this eval |

---

## 6. feedback.json

User feedback collected during eval review. One file per iteration.

**Location:** `<workspace>/iteration-N/feedback.json`

```json
{
  "reviews": [
    {
      "run_id": "eval-0-with_skill",
      "feedback": "",
      "timestamp": "2026-03-05T12:05:00.000Z"
    },
    {
      "run_id": "eval-0-without_skill",
      "feedback": "Missing error handling for edge case",
      "timestamp": "2026-03-05T12:06:00.000Z"
    }
  ],
  "status": "complete"
}
```

| Field                 | Type   | Required | Description                                                 |
| --------------------- | ------ | -------- | ----------------------------------------------------------- |
| `reviews`             | array  | yes      | One entry per reviewed run                                  |
| `reviews[].run_id`    | string | yes      | Format: `eval-<id>-with_skill` or `eval-<id>-without_skill` |
| `reviews[].feedback`  | string | yes      | User comments. Empty string = output looked fine            |
| `reviews[].timestamp` | string | yes      | ISO 8601 timestamp                                          |
| `status`              | string | yes      | `"complete"` when all reviews are done                      |

---

## Important Notes

- **grading.json field names** must be `text`, `passed`, `evidence`. Not
  `name`/`met`/`details` or any other variant.
- **timing.json** must be captured immediately from subagent completion
  notifications, not estimated after the fact.
- **Empty feedback** (`""`) means the output was acceptable. Only non-empty
  strings indicate issues.
- **benchmark.json delta** is calculated as `with_skill - without_skill`. A
  positive `pass_rate` delta means the skill is helping. A negative
  `time_seconds` delta means the skill is faster.

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

### Enriched grading.json (subagent grader)

When a grader subagent is used for subjective assertions (see
[grader-prompt.md](grader-prompt.md)), the output is a superset of the standard
`grading.json`. It includes the same `assertion_results` and `summary` fields,
plus additional fields for execution metrics, implicit claims, user notes, and
eval feedback.

**Location:** Same as standard `grading.json`

```json
{
  "assertion_results": [
    {
      "text": "Error messages are user-friendly",
      "passed": false,
      "evidence": "Error output shows raw stack trace with no user-facing message"
    }
  ],
  "summary": {
    "passed": 0,
    "failed": 1,
    "total": 1,
    "pass_rate": 0.0
  },
  "execution_metrics": {
    "tool_calls": ["Read", "Write", "Bash"],
    "total_tool_calls": 14,
    "total_steps": 8,
    "errors_encountered": ["File not found: config.yaml"],
    "output_chars": 4523
  },
  "claims": [
    {
      "claim": "Generated tests cover all public API methods",
      "type": "quality",
      "verified": false,
      "evidence": "Tests cover 3 of 5 public methods; missing createUser and deleteUser"
    }
  ],
  "user_notes_summary": {
    "uncertainties": ["Unsure whether to use camelCase or snake_case"],
    "needs_review": ["Retry logic may need tuning for production"],
    "workarounds": ["Used setTimeout instead of queue — no Redis available"]
  },
  "eval_feedback": {
    "suggestions": [
      "Add assertion for error handling format",
      "Remove trivial 'output is not empty' assertion"
    ],
    "overall": "Assertions cover happy path well but miss error scenarios."
  }
}
```

**execution_metrics fields:**

| Field                | Type     | Required | Description                                   |
| -------------------- | -------- | -------- | --------------------------------------------- |
| `tool_calls`         | string[] | yes      | Unique tool names used during the run         |
| `total_tool_calls`   | number   | yes      | Total number of tool invocations              |
| `total_steps`        | number   | yes      | Number of logical steps the agent took        |
| `errors_encountered` | string[] | yes      | Error messages observed during execution      |
| `output_chars`       | number   | yes      | Total character count across all output files |

**claims[] fields:**

| Field      | Type    | Required | Description                                               |
| ---------- | ------- | -------- | --------------------------------------------------------- |
| `claim`    | string  | yes      | An implicit claim extracted from the outputs              |
| `type`     | string  | yes      | One of `factual`, `process`, or `quality`                 |
| `verified` | boolean | yes      | Whether the claim was verified against available evidence |
| `evidence` | string  | yes      | How the claim was verified or refuted                     |

**user_notes_summary fields:**

| Field           | Type     | Required | Description                        |
| --------------- | -------- | -------- | ---------------------------------- |
| `uncertainties` | string[] | yes      | Things the agent was unsure about  |
| `needs_review`  | string[] | yes      | Items flagged for human review     |
| `workarounds`   | string[] | yes      | Compromises the agent made and why |

`user_notes_summary` is `null` when no `user_notes.md` file exists in the
outputs directory.

**eval_feedback fields:**

| Field         | Type     | Required | Description                                          |
| ------------- | -------- | -------- | ---------------------------------------------------- |
| `suggestions` | string[] | yes      | Specific improvements to the assertion set           |
| `overall`     | string   | yes      | Summary assessment of assertion quality and coverage |

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

## 7. history.json

Version progression tracking across iterations. One file per workspace.
Maintained by `update-history.ts`, which appends an entry each time an iteration
completes and tracks which iteration produced the best pass rate.

**Location:** `<workspace>/history.json`

```json
{
  "started_at": "2026-03-05T12:00:00.000Z",
  "skill_name": "my-skill",
  "current_best": 2,
  "iterations": [
    {
      "iteration": 1,
      "pass_rate": 0.65,
      "baseline_pass_rate": 0.30,
      "delta": 0.35,
      "result": "baseline"
    },
    {
      "iteration": 2,
      "pass_rate": 0.85,
      "baseline_pass_rate": 0.30,
      "delta": 0.55,
      "result": "improved"
    },
    {
      "iteration": 3,
      "pass_rate": 0.80,
      "baseline_pass_rate": 0.30,
      "delta": 0.50,
      "result": "regressed"
    }
  ]
}
```

**Top-level fields:**

| Field          | Type   | Required | Description                                               |
| -------------- | ------ | -------- | --------------------------------------------------------- |
| `started_at`   | string | yes      | ISO 8601 timestamp set when history.json is first created |
| `skill_name`   | string | yes      | Name of the skill (from benchmark.json)                   |
| `current_best` | number | yes      | Iteration number with the highest pass_rate               |
| `iterations`   | array  | yes      | One entry per completed iteration, sorted by number       |

**iterations[] fields:**

| Field                | Type   | Required | Description                                                                                                                                              |
| -------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `iteration`          | number | yes      | Iteration number (1-indexed)                                                                                                                             |
| `pass_rate`          | number | yes      | with_skill pass_rate mean from benchmark.json (0-1)                                                                                                      |
| `baseline_pass_rate` | number | yes      | without_skill pass_rate mean from benchmark.json (0-1)                                                                                                   |
| `delta`              | number | yes      | `pass_rate - baseline_pass_rate`                                                                                                                         |
| `result`             | string | yes      | One of `"baseline"` (first iteration), `"improved"` (beat previous best), `"regressed"` (below previous best), or `"unchanged"` (equal to previous best) |

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

---

## 8. comparison.json

Output of the blind A/B comparator agent. One file per comparison run.

**Location:** `<workspace>/iteration-N/eval-<name>/comparison.json`

```json
{
  "winner": "A",
  "reasoning": "Output A produced a complete implementation with error handling, while Output B missed the authentication flow. A scored 8.2 vs B's 5.4.",
  "rubric": {
    "A": {
      "content": { "correctness": 5, "completeness": 4, "accuracy": 4 },
      "structure": { "organization": 4, "formatting": 5, "usability": 4 },
      "content_total": 13,
      "structure_total": 13,
      "overall": 8.2
    },
    "B": {
      "content": { "correctness": 3, "completeness": 2, "accuracy": 3 },
      "structure": { "organization": 3, "formatting": 3, "usability": 3 },
      "content_total": 8,
      "structure_total": 9,
      "overall": 5.4
    }
  },
  "output_quality": {
    "A": {
      "score": 8.2,
      "strengths": ["Complete error handling"],
      "weaknesses": ["Minor: could include more comments"]
    },
    "B": {
      "score": 5.4,
      "strengths": ["Clean code style"],
      "weaknesses": ["Missing authentication flow"]
    }
  },
  "expectation_results": [
    {
      "assertion": "Output contains error handling for 401 responses",
      "A": { "passed": true, "evidence": "Line 45: catch block handles 401" },
      "B": { "passed": false, "evidence": "No 401 handling found" }
    }
  ]
}
```

**Top-level fields:**

| Field                 | Type   | Required | Description                                                            |
| --------------------- | ------ | -------- | ---------------------------------------------------------------------- |
| `winner`              | string | yes      | `"A"`, `"B"`, or `"TIE"`                                               |
| `reasoning`           | string | yes      | 2-3 sentence explanation of why the winner won                         |
| `rubric`              | object | yes      | Per-output rubric scores (keyed by `"A"` and `"B"`)                    |
| `output_quality`      | object | yes      | Per-output quality summary (keyed by `"A"` and `"B"`)                  |
| `expectation_results` | array  | no       | Per-assertion results for both outputs (only if expectations provided) |

**rubric[side] fields:**

| Field             | Type   | Required | Description                                                                |
| ----------------- | ------ | -------- | -------------------------------------------------------------------------- |
| `content`         | object | yes      | Content dimension scores (correctness, completeness, accuracy), each 1-5   |
| `structure`       | object | yes      | Structure dimension scores (organization, formatting, usability), each 1-5 |
| `content_total`   | number | yes      | Sum of content scores                                                      |
| `structure_total` | number | yes      | Sum of structure scores                                                    |
| `overall`         | number | yes      | Weighted overall score, 1-10 (content 60%, structure 40%)                  |

**output_quality[side] fields:**

| Field        | Type     | Required | Description                            |
| ------------ | -------- | -------- | -------------------------------------- |
| `score`      | number   | yes      | Overall score (matches rubric overall) |
| `strengths`  | string[] | yes      | List of specific strengths observed    |
| `weaknesses` | string[] | yes      | List of specific weaknesses observed   |

**expectation_results[] fields:**

| Field       | Type   | Required | Description                                          |
| ----------- | ------ | -------- | ---------------------------------------------------- |
| `assertion` | string | yes      | The assertion text                                   |
| `A`         | object | yes      | `{ passed: boolean, evidence: string }` for Output A |
| `B`         | object | yes      | `{ passed: boolean, evidence: string }` for Output B |

---

## 9. analysis.json

Output of the post-hoc analyzer agent. Produced after unblinding a comparison.

**Location:** `<workspace>/iteration-N/eval-<name>/analysis.json`

```json
{
  "comparison_summary": {
    "winner": "A",
    "winner_score": 8.2,
    "loser_score": 5.4,
    "primary_reason": "Winner's skill included explicit error handling instructions"
  },
  "winner_strengths": [
    {
      "strength": "Explicit retry logic for transient failures",
      "skill_evidence": "SKILL.md Step 4: retry instructions",
      "output_evidence": "Agent implemented retry, recovered from 503"
    }
  ],
  "loser_weaknesses": [
    {
      "weakness": "No guidance for authentication edge cases",
      "skill_evidence": "SKILL.md mentions auth but doesn't cover token refresh",
      "output_evidence": "Agent hit 401 with no recovery strategy"
    }
  ],
  "instruction_following": {
    "winner": { "score": 8, "followed": [], "missed": [], "issues": [] },
    "loser": { "score": 5, "followed": [], "missed": [], "issues": [] }
  },
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "error_handling",
      "suggestion": "Add error recovery section covering 401, 403, 429, 5xx",
      "expected_impact": "Would prevent the authentication failure"
    }
  ],
  "transcript_insights": {
    "winner": "Completed in 34s, followed linear path through skill steps",
    "loser": "Completed in 52s, spent 18s on unguided error recovery"
  }
}
```

**Top-level fields:**

| Field                     | Type   | Required | Description                                           |
| ------------------------- | ------ | -------- | ----------------------------------------------------- |
| `comparison_summary`      | object | yes      | High-level summary of the comparison result           |
| `winner_strengths`        | array  | yes      | What the winning skill did right                      |
| `loser_weaknesses`        | array  | yes      | What the losing skill did wrong or missed             |
| `instruction_following`   | object | yes      | Per-side instruction following analysis               |
| `improvement_suggestions` | array  | yes      | Actionable suggestions for improving the losing skill |
| `transcript_insights`     | object | yes      | Key observations from execution transcripts           |

**comparison_summary fields:**

| Field            | Type   | Required | Description                                        |
| ---------------- | ------ | -------- | -------------------------------------------------- |
| `winner`         | string | yes      | `"A"` or `"B"`                                     |
| `winner_score`   | number | yes      | Winner's overall rubric score                      |
| `loser_score`    | number | yes      | Loser's overall rubric score                       |
| `primary_reason` | string | yes      | One-sentence explanation of the key differentiator |

**winner_strengths[] / loser_weaknesses[] fields:**

| Field                   | Type   | Required | Description                                  |
| ----------------------- | ------ | -------- | -------------------------------------------- |
| `strength` / `weakness` | string | yes      | Description of the strength or weakness      |
| `skill_evidence`        | string | yes      | Citation from the SKILL.md                   |
| `output_evidence`       | string | yes      | Citation from the transcript or output files |

**instruction_following[side] fields:**

| Field      | Type     | Required | Description                                           |
| ---------- | -------- | -------- | ----------------------------------------------------- |
| `score`    | number   | yes      | Instruction following score, 1-10                     |
| `followed` | string[] | yes      | List of instructions the agent followed               |
| `missed`   | string[] | yes      | List of instructions the agent missed                 |
| `issues`   | string[] | yes      | Notable problems in how instructions were interpreted |

**improvement_suggestions[] fields:**

| Field             | Type   | Required | Description                                                                              |
| ----------------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `priority`        | string | yes      | `"high"`, `"medium"`, or `"low"`                                                         |
| `category`        | string | yes      | One of: `instructions`, `tools`, `examples`, `error_handling`, `structure`, `references` |
| `suggestion`      | string | yes      | Specific, actionable change to make                                                      |
| `expected_impact` | string | yes      | What would improve if this suggestion were applied                                       |

**transcript_insights fields:**

| Field    | Type   | Required | Description                                   |
| -------- | ------ | -------- | --------------------------------------------- |
| `winner` | string | yes      | Key observations from the winner's transcript |
| `loser`  | string | yes      | Key observations from the loser's transcript  |

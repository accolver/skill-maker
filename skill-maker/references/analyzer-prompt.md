# Analyzer Agent Spec

This file contains two analysis specs: **Post-hoc Analysis** (explaining why the
blind comparison winner won) and **Benchmark Analysis** (surfacing patterns in
aggregate benchmark data).

---

## Section 1: Post-hoc Analysis

After a blind A/B comparison completes, this analysis "unblinds" the results to
explain WHY the winner won and extract actionable improvement suggestions.

### Role

Extract actionable insights from a blind comparison by correlating the
comparison result with the actual skills and execution transcripts. You know
which side was which — use that knowledge to explain what the winning skill did
right and what the losing skill did wrong.

### Inputs

| Input                    | Description                                  |
| ------------------------ | -------------------------------------------- |
| `winner`                 | Which side won ("A" or "B")                  |
| `winner_skill_path`      | Path to the winning skill's SKILL.md         |
| `winner_transcript_path` | Path to the winning run's transcript/outputs |
| `loser_skill_path`       | Path to the losing skill's SKILL.md          |
| `loser_transcript_path`  | Path to the losing run's transcript/outputs  |
| `comparison_result_path` | Path to comparison.json from the comparator  |
| `output_path`            | Path to write analysis.json                  |

### Process

#### Step 1: Read the Comparison Result

Read `comparison.json`. Note the winner, reasoning, rubric scores, and any
expectation results. Understand what the comparator valued and where the scores
diverged.

#### Step 2: Read Both Skills

Read both SKILL.md files. Identify differences in:

- Instructions and workflow steps
- Examples and templates
- Error handling guidance
- Reference files and scripts
- Level of specificity vs. generality

#### Step 3: Read Both Transcripts

Read the execution transcripts and output files for both runs. Trace the agent's
decision-making:

- What instructions did the agent follow?
- Where did the agent deviate from the skill?
- What did the agent do that wasn't in the skill at all?
- Where did the agent get stuck or waste time?

#### Step 4: Analyze Instruction Following

For each side (winner and loser), score instruction following on a 1-10 scale:

- **10**: Followed every instruction precisely, used all referenced tools
- **7-9**: Followed most instructions, minor deviations
- **4-6**: Followed some instructions, missed significant sections
- **1-3**: Largely ignored the skill or misunderstood it

Note specific instructions that were followed or missed, with evidence from the
transcript.

#### Step 5: Identify Winner Strengths

List specific things the winning skill did that led to a better output:

- Instructions that directly caused better results
- Examples that guided the agent effectively
- Error handling that prevented failures
- Structure that kept the agent on track

Each strength must cite evidence from both the skill and the transcript.

#### Step 6: Identify Loser Weaknesses

List specific things the losing skill did (or failed to do) that led to a worse
output:

- Missing instructions that would have prevented errors
- Ambiguous guidance that the agent misinterpreted
- Overly rigid rules that caused the agent to waste effort
- Missing examples for common scenarios

Each weakness must cite evidence from both the skill and the transcript.

#### Step 7: Generate Improvement Suggestions

For each identified weakness, generate a concrete improvement suggestion:

- **Priority**: `high` (directly caused failure), `medium` (contributed to lower
  quality), `low` (minor polish)
- **Category**: One of `instructions`, `tools`, `examples`, `error_handling`,
  `structure`, `references`
- **Suggestion**: Specific, actionable change (not "improve error handling" but
  "add a step after validation that checks for empty response bodies and retries
  once")
- **Expected impact**: What would change if this suggestion were applied

#### Step 8: Write analysis.json

Write the analysis to `output_path`:

```json
{
  "comparison_summary": {
    "winner": "A",
    "winner_score": 8.2,
    "loser_score": 5.4,
    "primary_reason": "Winner's skill included explicit error handling instructions that prevented the authentication failure seen in the loser's output"
  },
  "winner_strengths": [
    {
      "strength": "Explicit retry logic for transient failures",
      "skill_evidence": "SKILL.md Step 4: 'If the API returns 429 or 503, wait 2 seconds and retry up to 3 times'",
      "output_evidence": "Transcript shows agent implemented retry with backoff, recovered from a 503 on the second attempt"
    }
  ],
  "loser_weaknesses": [
    {
      "weakness": "No guidance for authentication edge cases",
      "skill_evidence": "SKILL.md mentions authentication in Step 1 but doesn't cover token refresh or expiry",
      "output_evidence": "Transcript shows agent hit a 401, had no recovery strategy, and produced incomplete output"
    }
  ],
  "instruction_following": {
    "winner": {
      "score": 8,
      "followed": [
        "Step 1: Setup",
        "Step 3: Validation",
        "Step 4: Error handling"
      ],
      "missed": ["Step 6: Cleanup — agent left temp files"],
      "issues": []
    },
    "loser": {
      "score": 5,
      "followed": ["Step 1: Setup"],
      "missed": ["Step 3: Validation", "Step 4: Error handling"],
      "issues": [
        "Agent skipped validation entirely, likely because the instruction was buried in a long paragraph"
      ]
    }
  },
  "improvement_suggestions": [
    {
      "priority": "high",
      "category": "error_handling",
      "suggestion": "Add a dedicated error recovery section after Step 3 that covers 401 (re-authenticate), 403 (abort with clear message), 429 (retry with backoff), and 5xx (retry once, then abort)",
      "expected_impact": "Would prevent the authentication failure that caused 40% of the score gap"
    },
    {
      "priority": "medium",
      "category": "structure",
      "suggestion": "Move validation from a sub-bullet in Step 3 to its own numbered step with a clear heading",
      "expected_impact": "Agent missed validation because it was buried — a dedicated step would increase instruction following"
    }
  ],
  "transcript_insights": {
    "winner": "Agent completed in 34s, followed a linear path through the skill steps, referenced the error handling section twice when encountering failures",
    "loser": "Agent completed in 52s, spent 18s attempting to recover from the 401 error without guidance, eventually produced partial output"
  }
}
```

---

## Section 2: Analyzing Benchmark Results

Reviews aggregate benchmark data to surface patterns that summary statistics
hide.

### Role

Surface patterns in benchmark data that aggregate statistics (mean pass rate,
overall delta) obscure. You are looking for per-assertion trends, cross-eval
correlations, and metric anomalies that inform the next improvement iteration.

### Inputs

| Input                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `benchmark_data_path` | Path to benchmark.json (or directory of iterations) |
| `skill_path`          | Path to the skill's SKILL.md                        |
| `output_path`         | Path to write the analysis output                   |

### Process

#### Step 1: Read Benchmark Data

Read `benchmark.json` and all associated `grading.json` files. Build a complete
picture of per-assertion, per-eval, per-configuration results.

#### Step 2: Analyze Per-Assertion Patterns

Classify each assertion into one of these categories:

- **Always pass both**: Passes in both with_skill and without_skill across all
  evals. These are non-discriminating — they test something the agent already
  knows. Consider removing or replacing them.
- **Always fail both**: Fails in both configurations. Either the assertion is
  broken, the task is too hard, or the assertion tests something neither
  configuration can achieve. Investigate.
- **Pass with skill only**: Passes with_skill, fails without_skill. These are
  high-value assertions — they demonstrate what the skill adds. Understand why.
- **High variance**: Sometimes passes, sometimes fails within the same
  configuration. Indicates flaky assertions or inconsistent agent behavior.
  Tighten the assertion or the skill instruction.

#### Step 3: Analyze Cross-Eval Patterns

Look for correlations across eval cases:

- Do certain assertion types consistently fail across all evals?
- Does one eval case have dramatically different results from others?
- Are there eval cases where without_skill actually outperforms with_skill?

#### Step 4: Analyze Metrics Patterns

Examine time and token data:

- Are there outlier evals that take significantly longer or use more tokens?
- Does with_skill consistently use more or fewer tokens than without_skill?
- Is there a correlation between token usage and pass rate?

#### Step 5: Generate Notes

Compile observations as a JSON array of plain-language strings. Each note should
be a single, specific observation with evidence.

Write the output to `output_path` as a JSON array:

```json
[
  "Assertion 'Output contains valid JSON' passes in both configurations across all 3 evals — it is non-discriminating and should be replaced with a more specific assertion",
  "Eval 'complex-auth' takes 3.2x longer with_skill (89s vs 28s) but has 100% pass rate vs 25% — the time cost is justified by quality improvement",
  "Assertion 'Includes rate limiting' has high variance in with_skill runs (passes in eval-1 and eval-3, fails in eval-2) — the skill's rate limiting instructions may be ambiguous",
  "without_skill outperforms with_skill on eval 'simple-fetch' (100% vs 83%) — the skill may be adding unnecessary complexity for simple tasks"
]
```

### Guidelines

- **Report observations, not recommendations.** This analysis feeds into the
  improvement step, which decides what to change. Your job is to surface what's
  happening, not prescribe fixes.
- **Be specific.** "Some assertions are non-discriminating" is useless.
  "Assertion 'Output is valid JSON' passes in both configs across all 3 evals"
  is actionable.
- **Note hidden patterns.** The most valuable insights are things that aggregate
  stats hide: an assertion that always passes, an eval that's an outlier, a
  correlation between token usage and failures.
- **Don't suggest improvements.** That's for the improvement step. You provide
  the evidence; the improvement step decides what to do with it.

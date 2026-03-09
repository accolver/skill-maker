# Adopt Official skill-creator Features into skill-maker

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Bring the best features from Anthropic's official `skill-creator` into
our `skill-maker` while preserving our automated, script-driven approach and
**harness-agnostic design**. skill-maker works with any AI coding agent
(OpenCode, Claude Code, Cursor, Cline, etc.) — we never introduce dependencies
on a specific harness or CLI tool. We keep our Bun/TypeScript stack, plateau
detection, validation gates, and template system. We adopt their eval viewer,
grader agent spec, blind comparison, description optimization automation, and
richer schemas.

**Architecture:** Each feature is independent and can be implemented in any
order. New scripts go in `skill-maker/scripts/`, new agent specs go in
`skill-maker/references/`, the eval viewer goes in `skill-maker/eval-viewer/`.
The SKILL.md is updated last to reference all new capabilities. All tooling must
remain **harness-agnostic** — skill-maker works with any AI coding agent
(OpenCode, Claude Code, Cursor, Cline, etc.), not just Claude Code.

**Tech Stack:** Bun/TypeScript for all scripts, HTML/CSS/JS for the eval viewer
(single-file, no build step), Markdown for agent specs and references. No
dependencies on `claude` CLI or any specific agent harness.

---

## Task 1: Add Grader Agent Spec

The official skill-creator has a dedicated `agents/grader.md` that turns a
subagent into a grader with claim extraction, eval critique, and user notes
analysis. Our `grade.ts` handles programmatic assertion checking — it stays. But
we need a grader prompt for subjective assertions that can't be checked
programmatically.

**Files:**

- Create: `skill-maker/references/grader-prompt.md`
- Modify: `skill-maker/SKILL.md` (Phase 4, Step 4 — reference the grader prompt)
- Modify: `skill-maker/references/schemas.md` (add enriched grading fields)

### Step 1: Create `skill-maker/references/grader-prompt.md`

Port the official `agents/grader.md` with these adaptations:

- Remove references to their Python scripts (we use Bun)
- Keep the 8-step process (read transcript → examine outputs → evaluate
  assertions → extract claims → read user notes → critique evals → write results
  → read metrics)
- Keep the `grading.json` output format with enriched fields: `expectations`,
  `summary`, `execution_metrics`, `claims`, `user_notes_summary`,
  `eval_feedback`
- Add instructions to output JSON to `grading.json` in the run directory

The content should follow this structure:

```markdown
# Grader Agent

Evaluate assertions against an execution transcript and outputs.

## Role

[Adapted from official — grade outputs AND critique the evals themselves]

## Inputs

- assertions: list of assertion strings
- transcript_path: path to execution transcript
- outputs_dir: directory with output files

## Process

### Step 1: Read the Transcript

### Step 2: Examine Output Files

### Step 3: Evaluate Each Assertion

### Step 4: Extract and Verify Claims

### Step 5: Read User Notes

### Step 6: Critique the Evals

### Step 7: Write Grading Results

### Step 8: Read Executor Metrics and Timing

## Output Format

[Full grading.json schema with expectations, claims, eval_feedback]

## Grading Criteria

PASS when: clear evidence, genuine substance (not just surface compliance) FAIL
when: no evidence, superficial compliance, coincidental match
```

### Step 2: Update `skill-maker/references/schemas.md`

Add the enriched `grading.json` fields after the existing schema. Keep the
existing `assertion_results` + `summary` as the programmatic output from
`grade.ts`. Add the richer format as the **subagent grader output** format, used
when grading can't be done programmatically.

Add these new fields to the grading.json schema section:

```json
{
  "assertion_results": [...],
  "summary": {...},
  "execution_metrics": {
    "tool_calls": {"Read": 5, "Write": 2, "Bash": 8},
    "total_tool_calls": 15,
    "total_steps": 6,
    "errors_encountered": 0,
    "output_chars": 12450
  },
  "claims": [
    {
      "claim": "The form has 12 fillable fields",
      "type": "factual",
      "verified": true,
      "evidence": "Counted 12 fields in field_info.json"
    }
  ],
  "user_notes_summary": {
    "uncertainties": [],
    "needs_review": [],
    "workarounds": []
  },
  "eval_feedback": {
    "suggestions": [
      {
        "assertion": "The output includes X",
        "reason": "A hallucinated document would also pass"
      }
    ],
    "overall": "Brief assessment"
  }
}
```

### Step 3: Update SKILL.md Phase 4 Step 4

In `skill-maker/SKILL.md`, modify Phase 4 Step 4 to reference the grader prompt
for subjective assertions:

Current text (lines 355-367):

```
#### Step 4: Grade outputs

Run the grading script on each completed run:
...
For assertions that can be checked programmatically (valid JSON, correct row
count, file exists), the script handles this automatically. For subjective
assertions, spawn a grader subagent to evaluate.
```

Replace with:

````
#### Step 4: Grade outputs

Run the grading script on each completed run:

```bash
bun run scripts/grade.ts <workspace>/iteration-<N>/eval-<name>/with_skill/
bun run scripts/grade.ts <workspace>/iteration-<N>/eval-<name>/without_skill/
````

For assertions that can be checked programmatically (valid JSON, correct row
count, file exists), the script handles this automatically. For subjective
assertions that require judgment, spawn a grader subagent with the prompt from
[references/grader-prompt.md](references/grader-prompt.md). The grader also
extracts implicit claims from outputs, critiques assertion quality, and flags
eval improvements — producing a richer grading.json. See
[references/schemas.md](references/schemas.md) for both output formats.

```
### Step 4: Verify

Run: `bun run scripts/validate-skill.ts skill-maker/`
Expected: valid=true, no errors about missing referenced files

### Step 5: Commit
```

feat(skill-maker): add grader agent spec for subjective assertion grading

````
---

## Task 2: Add Blind Comparator and Analyzer Agent Specs

The official skill-creator has a blind A/B comparison system that removes bias when comparing skill versions. This is useful for "is the new version actually better?" decisions. We add the agent specs as reference files and document them as an optional advanced workflow.

**Files:**
- Create: `skill-maker/references/comparator-prompt.md`
- Create: `skill-maker/references/analyzer-prompt.md`
- Modify: `skill-maker/references/schemas.md` (add `comparison.json` and `analysis.json` schemas)
- Modify: `skill-maker/SKILL.md` (add optional blind comparison section)

### Step 1: Create `skill-maker/references/comparator-prompt.md`

Port the official `agents/comparator.md`. The comparator receives two outputs labeled A/B without knowing which skill produced them. Key sections:

- Role: blind quality judgment
- Inputs: `output_a_path`, `output_b_path`, `eval_prompt`, `assertions` (optional)
- Process: read outputs → understand task → generate rubric (content + structure) → evaluate → check assertions → determine winner → write results
- Output format: `comparison.json` with `winner`, `reasoning`, `rubric`, `output_quality`, `expectation_results`

### Step 2: Create `skill-maker/references/analyzer-prompt.md`

Port the official `agents/analyzer.md`. Two sections:

**Section 1: Post-hoc Analysis** — After blind comparison, "unblinds" results to explain WHY the winner won:
- Reads both skills and transcripts
- Compares instruction-following quality
- Identifies winner strengths and loser weaknesses
- Generates prioritized improvement suggestions
- Output format: `analysis.json`

**Section 2: Benchmark Analysis** — Reviews aggregate benchmark data to surface patterns:
- Non-discriminating assertions (pass in both configs)
- High-variance evals (possibly flaky)
- Time/token outliers
- Output: JSON array of freeform notes

### Step 3: Add schemas to `skill-maker/references/schemas.md`

Add `comparison.json` and `analysis.json` schemas as new sections (sections 7 and 8) at the end of the file.

`comparison.json`:
```json
{
  "winner": "A",
  "reasoning": "...",
  "rubric": {
    "A": { "content": {...}, "structure": {...}, "content_score": 4.7, "structure_score": 4.3, "overall_score": 9.0 },
    "B": { ... }
  },
  "output_quality": {
    "A": { "score": 9, "strengths": [...], "weaknesses": [...] },
    "B": { ... }
  },
  "expectation_results": { ... }
}
````

`analysis.json`:

```json
{
  "comparison_summary": { "winner": "A", "winner_skill": "...", "loser_skill": "..." },
  "winner_strengths": [...],
  "loser_weaknesses": [...],
  "instruction_following": { "winner": { "score": 9, "issues": [...] }, "loser": {...} },
  "improvement_suggestions": [{ "priority": "high", "category": "instructions", "suggestion": "...", "expected_impact": "..." }],
  "transcript_insights": { ... }
}
```

### Step 4: Add blind comparison section to SKILL.md

Insert after Phase 4 Step 9 (Improve the skill), before the `---` separator to
Phase 5. Add as an optional advanced section:

```markdown
#### Advanced: Blind Comparison (Optional)

For rigorous version comparison (e.g., "is the new version actually better?"),
use blind A/B comparison:

1. Strip labels from the two outputs (current vs. previous iteration)
2. Spawn a comparator subagent with the prompt from
   [references/comparator-prompt.md](references/comparator-prompt.md)
3. Spawn an analyzer subagent with
   [references/analyzer-prompt.md](references/analyzer-prompt.md) to explain WHY
   the winner won
4. Use the analyzer's improvement suggestions to guide the next iteration

This removes confirmation bias. It's optional — the automated grading + plateau
detection loop is usually sufficient. Use blind comparison when:

- Pass rates are close between iterations and you need a tiebreaker
- You're unsure if a rewrite actually improved quality
- You want structured reasoning about what specifically got better/worse
```

### Step 5: Verify

Run: `bun run scripts/validate-skill.ts skill-maker/` Expected: valid=true, no
errors about missing referenced files

### Step 6: Commit

```
feat(skill-maker): add blind comparator and analyzer agent specs
```

---

## Task 3: Build the Eval Viewer

The official skill-creator's biggest UX advantage is
`eval-viewer/generate_review.py` + `viewer.html`. We build a TypeScript
equivalent that generates a single self-contained HTML file (no server needed).
This fits our automated approach — no browser server to manage.

**Files:**

- Create: `skill-maker/eval-viewer/generate-review.ts`
- Create: `skill-maker/eval-viewer/viewer-template.html`
- Modify: `skill-maker/SKILL.md` (Phase 4, Step 8 — reference the viewer)

### Step 1: Create `skill-maker/eval-viewer/viewer-template.html`

Build a self-contained HTML file with embedded CSS and JS. Features:

- **Two tabs:** "Outputs" and "Benchmark"
- **Outputs tab:**
  - Per-test-case navigation (prev/next buttons, arrow key support)
  - Shows: prompt, output files rendered inline, formal grades (collapsed),
    feedback textbox (auto-saves to localStorage)
  - Previous iteration outputs (collapsed, if `--previous-workspace` provided)
  - Previous feedback shown below current textbox
- **Benchmark tab:**
  - Aggregate stats table (with_skill vs without_skill, delta)
  - Per-eval breakdown
  - Analyst notes
- **Submit button:** "Submit All Reviews" → downloads `feedback.json`
- **Placeholders:** `__EVAL_DATA__`, `__BENCHMARK_DATA__`, `__SKILL_NAME__`,
  `__PREVIOUS_DATA__`

Design constraints:

- No external dependencies (no CDN, no frameworks)
- Works offline
- Clean, minimal design
- Monospace font for code/output display
- Responsive layout

### Step 2: Create `skill-maker/eval-viewer/generate-review.ts`

Bun TypeScript script that:

1. Reads all eval directories from an iteration directory
2. For each eval: reads `eval_metadata.json`, output files from
   `with_skill/outputs/` and `without_skill/outputs/`, `grading.json` files,
   `timing.json` files
3. Optionally reads a previous iteration directory (`--previous-workspace`)
4. Reads `benchmark.json` if it exists
5. Injects the data into `viewer-template.html` by replacing placeholders
6. Writes the result to the specified output path

```
Usage:
  bun run eval-viewer/generate-review.ts <iteration-dir> --skill-name <name> [--output <path>] [--previous-workspace <path>]

Options:
  --skill-name <name>          Skill name (required)
  --output <path>              Output HTML file path (default: <iteration-dir>/review.html)
  --previous-workspace <path>  Previous iteration directory for comparison
  --benchmark <path>           Path to benchmark.json (default: <iteration-dir>/benchmark.json)
  --help, -h                   Show help
```

After writing the HTML file, print the path and suggest:

```
open <path>
```

### Step 3: Update SKILL.md Phase 4 Step 8

Replace the current "Human review" section (lines 407-416):

Current:

```
#### Step 8: Human review

Present results to the user:
- Show per-eval pass rates (with_skill vs baseline)
- Show aggregate delta (how much the skill improves things)
- Show any analyst observations from Step 7
- Ask for feedback on each eval's outputs

Record feedback. Empty feedback means the output was fine.
```

Replace with:

````
#### Step 8: Human review

Generate the eval viewer for the user to review results:

```bash
bun run eval-viewer/generate-review.ts <workspace>/iteration-<N> \
  --skill-name <name> \
  --output <workspace>/iteration-<N>/review.html
````

For iteration 2+, include the previous iteration for comparison:

```bash
bun run eval-viewer/generate-review.ts <workspace>/iteration-<N> \
  --skill-name <name> \
  --output <workspace>/iteration-<N>/review.html \
  --previous-workspace <workspace>/iteration-<N-1>
```

Open the HTML file and tell the user: "I've generated the results viewer. There
are two tabs — 'Outputs' lets you click through each test case and leave
feedback, 'Benchmark' shows the quantitative comparison. When you're done
reviewing, click 'Submit All Reviews' to download feedback.json, then let me
know."

When the user returns, read `feedback.json` from the iteration directory (or
their Downloads folder). Empty feedback means the output was fine. Focus
improvements on test cases with specific complaints.

````
### Step 4: Verify

Run: `bun run scripts/validate-skill.ts skill-maker/`
Expected: valid=true

Test the viewer generation manually:
```bash
bun run eval-viewer/generate-review.ts --help
````

Expected: help text with usage instructions

### Step 5: Commit

```
feat(skill-maker): add static eval viewer for human review
```

---

## Task 4: Build Description Optimization Scripts

The official skill-creator has `run_loop.py` + `run_eval.py` +
`improve_description.py` for automated description optimization. We build
TypeScript equivalents. Unlike the official version which depends on `claude -p`
(Claude CLI), our implementation must be **harness-agnostic** — it uses the
agent's own subagent/task spawning to test triggering, or accepts a `--cli` flag
for any compatible CLI tool.

**Files:**

- Create: `skill-maker/scripts/optimize-description.ts`
- Create: `skill-maker/scripts/eval-trigger.ts`
- Create: `skill-maker/assets/trigger-eval-review.html`
- Modify: `skill-maker/SKILL.md` (Phase 5 — replace conceptual guidance with
  script references)

### Step 1: Create `skill-maker/scripts/eval-trigger.ts`

Tests a single query against a skill description to determine if it would
trigger. This script is **harness-agnostic** — it doesn't depend on `claude -p`
or any specific CLI tool.

```
Usage:
  bun run scripts/eval-trigger.ts --description <desc> --query <query> [--cli <command>] [--runs 3]

Output (JSON to stdout):
  { "query": "...", "triggered": true, "runs": 3, "yes_count": 2 }
```

Implementation options (the script supports both):

1. **Subagent mode (default):** The script generates a structured prompt that
   asks "Given this list of available skills with their descriptions, would you
   invoke skill X for this user query? Answer YES or NO with reasoning." The
   calling agent spawns this as a subagent task — works in any harness that
   supports subagents (OpenCode, Claude Code, Cline, etc.).

2. **CLI mode (`--cli`):** For automated/CI use, accepts any CLI command that
   takes a prompt on stdin and returns a response on stdout. Examples:
   - `--cli "claude -p"` (Claude Code)
   - `--cli "opencode run"` (OpenCode)
   - `--cli "aider --message"` (Aider)
   - Any command that accepts a prompt and returns text

Run each query `--runs` times (default 3) for reliability, report majority vote.

### Step 2: Create `skill-maker/scripts/optimize-description.ts`

Full optimization loop. Harness-agnostic — works with any agent CLI or via
subagent prompts.

```
Usage:
  bun run scripts/optimize-description.ts \
    --eval-set <path-to-trigger-eval.json> \
    --skill-path <path-to-skill> \
    --max-iterations 5 \
    [--cli <command>]

Output:
  { "best_description": "...", "train_score": 0.95, "test_score": 0.90, "iterations": [...] }
```

Implementation:

1. Load eval set (JSON array of `{ query, should_trigger }`)
2. Split 60% train / 40% test
3. Evaluate current description against train set using `eval-trigger.ts`
   (delegates to subagent or CLI — see Step 1)
4. Generate an improvement prompt with the failures and current description. The
   calling agent (or `--cli`) proposes an improved description.
5. Evaluate new description against both train and test
6. Iterate up to `--max-iterations`
7. Select best by **test** score (not train) to avoid overfitting
8. Output JSON with `best_description`

The script orchestrates the loop but delegates LLM calls to whatever harness is
available. In interactive use, the agent running skill-maker handles the LLM
calls via subagents. In CI/automated use, `--cli` pipes to any compatible tool.

### Step 3: Create `skill-maker/assets/trigger-eval-review.html`

A simple HTML page for the user to review and edit trigger eval queries before
running the optimization. Features:

- List of queries with should_trigger toggles
- Add/remove queries
- "Export Eval Set" button → downloads `trigger-eval.json`

Placeholders: `__EVAL_DATA__`, `__SKILL_NAME__`, `__SKILL_DESCRIPTION__`

### Step 4: Update SKILL.md Phase 5

Replace the current Phase 5 "Optimize the description" section (lines 448-464):

````markdown
### Optimize the description

After the skill content is stable, optimize the description for triggering
accuracy.

1. Generate 20 eval queries — a mix of should-trigger (8-10) and
   should-not-trigger (8-10). Save as JSON:

   ```json
   [
     { "query": "realistic user prompt", "should_trigger": true },
     {
       "query": "near-miss prompt that shouldn't trigger",
       "should_trigger": false
     }
   ]
   ```
````

**Query quality matters.** Should-trigger queries should be varied phrasings
including indirect references. Should-not-trigger queries should be near-misses
sharing keywords — NOT obviously irrelevant prompts.

2. Review with the user. Generate the review page:

   ```bash
   bun run scripts/generate-trigger-review.ts \
     --eval-set <trigger-eval.json> \
     --skill-name <name> \
     --skill-description "<current description>" \
     --output /tmp/trigger-review-<name>.html
   open /tmp/trigger-review-<name>.html
   ```

   The user edits queries, toggles should-trigger, adds/removes entries, then
   clicks "Export Eval Set" to download the final set.

3. Run the optimization loop:

   ```bash
   bun run scripts/optimize-description.ts \
     --eval-set <path-to-trigger-eval.json> \
     --skill-path <path-to-skill> \
     --max-iterations 5
   ```

   This splits 60/40 train/test, evaluates 3x per query for reliability,
   proposes improvements via subagent (or `--cli` for automated use), and
   selects the best description by test score to avoid overfitting.

4. Apply `best_description` from the output to the skill's SKILL.md frontmatter.
   Show the user before/after and report scores.

````
### Step 5: Verify

Run: `bun run scripts/validate-skill.ts skill-maker/`
Expected: valid=true

Test help output:
```bash
bun run scripts/optimize-description.ts --help
bun run scripts/eval-trigger.ts --help
````

### Step 6: Commit

```
feat(skill-maker): add automated description optimization scripts
```

---

## Task 5: Add `history.json` Version Tracking

Track version lineage across iterations. This helps understand improvement
trajectories and answer "when did the skill start winning?"

**Files:**

- Create: `skill-maker/scripts/update-history.ts`
- Modify: `skill-maker/references/schemas.md` (add `history.json` schema)
- Modify: `skill-maker/SKILL.md` (Phase 4, after Step 5 — call update-history)

### Step 1: Create `skill-maker/scripts/update-history.ts`

```
Usage:
  bun run scripts/update-history.ts <workspace-dir> --iteration <N>

Reads:
  <workspace>/iteration-<N>/benchmark.json

Writes:
  <workspace>/history.json
```

Maintains a `history.json` at workspace root tracking:

```json
{
  "started_at": "ISO timestamp",
  "skill_name": "my-skill",
  "current_best": 2,
  "iterations": [
    {
      "iteration": 1,
      "pass_rate": 0.65,
      "baseline_pass_rate": 0.40,
      "delta": 0.25,
      "result": "baseline"
    },
    {
      "iteration": 2,
      "pass_rate": 0.85,
      "baseline_pass_rate": 0.40,
      "delta": 0.45,
      "result": "improved"
    }
  ]
}
```

Logic:

- Read existing `history.json` if present, append new iteration
- Compare current pass_rate to previous best to determine `result` ("baseline",
  "improved", "regressed", "unchanged")
- Update `current_best` to the iteration with highest pass_rate

### Step 2: Add `history.json` schema to `schemas.md`

Add as section 7 (or after existing sections). Follow the table format used for
other schemas.

### Step 3: Update SKILL.md Phase 4

After Step 5 (Aggregate benchmark), add:

````markdown
After aggregating the benchmark, update the version history:

```bash
bun run scripts/update-history.ts <workspace> --iteration <N>
```
````

This tracks pass rate progression across iterations in `history.json` at the
workspace root.

````
### Step 4: Verify

```bash
bun run scripts/update-history.ts --help
bun run scripts/validate-skill.ts skill-maker/
````

### Step 5: Commit

```
feat(skill-maker): add history.json version tracking
```

---

## Task 6: Add Environment-Aware Sections and Safety Note

The official skill-creator locks instructions to Claude-specific environments
(Claude Code, Claude.ai, Cowork). We take a harness-agnostic approach instead,
describing capabilities needed rather than specific products. We also add the
"Principle of Lack of Surprise" safety note.

**Files:**

- Modify: `skill-maker/SKILL.md`

### Step 1: Add environment notes after the Quick Reference table

Insert before the final `**Stop conditions:**` line:

```markdown
## Environment Notes

skill-maker is **harness-agnostic** — it works with any AI coding agent that
supports subagents and shell access (OpenCode, Claude Code, Cursor, Cline,
Aider, etc.).

**Full workflow** (agents with subagent support + shell): All features available
— subagent eval runs, grading scripts, eval viewer, description optimization,
blind comparison.

**Limited workflow** (agents without subagent support): Run test cases inline
(you wrote the skill and you're running it — less rigorous but a useful sanity
check). Skip baseline runs, blind comparison, and description optimization.
Present results in conversation. Focus on qualitative user feedback.

**Headless / CI**: Use the eval viewer with static HTML output. Description
optimization works via `--cli` flag with any compatible CLI tool. Feedback
downloads as `feedback.json` from the viewer.

## Safety

Skills must not contain malware, exploit code, or content designed to compromise
system security. A skill's contents should not surprise the user in their intent
if described. Do not create skills designed for unauthorized access, data
exfiltration, or deceptive behavior.
```

### Step 2: Verify

```bash
bun run scripts/validate-skill.ts skill-maker/
```

Expected: valid=true, body still under 500 lines (check `body_lines` in output)

If over 500 lines, move the environment notes into
`references/environment-notes.md` and add a link from SKILL.md.

### Step 3: Commit

```
docs(skill-maker): add environment-aware guidance and safety note
```

---

## Task 7: Add Skill Packaging Script

The official has `package_skill.py` to create distributable `.skill` files. We
build a Bun equivalent.

**Files:**

- Create: `skill-maker/scripts/package-skill.ts`
- Modify: `skill-maker/SKILL.md` (Phase 5, after "Install the skill")

### Step 1: Create `skill-maker/scripts/package-skill.ts`

```
Usage:
  bun run scripts/package-skill.ts <skill-dir> [--output <path>]

Output:
  Creates <skill-name>.skill (a tar.gz archive) containing the skill directory
```

Implementation:

1. Run `validate-skill.ts` first — abort if invalid
2. Collect all files in the skill directory (SKILL.md, scripts/, references/,
   assets/)
3. Exclude: `evals/`, `node_modules/`, `.git/`, `__pycache__/`
4. Create a tar.gz archive named `<skill-name>.skill`
5. Print the output path and file size

### Step 2: Update SKILL.md Phase 5

After the "Install the skill" section, add:

````markdown
### Package for distribution (optional)

```bash
bun run scripts/package-skill.ts <skill-name> --output <skill-name>.skill
```
````

This validates the skill, then packages it as a distributable `.skill` archive.

````
### Step 3: Verify

```bash
bun run scripts/package-skill.ts --help
bun run scripts/package-skill.ts skill-maker/
````

Expected: creates `skill-maker.skill` file

### Step 4: Commit

```
feat(skill-maker): add skill packaging script
```

---

## Task 8: Update SKILL.md — Final Polish

After all previous tasks are complete, do a final pass on SKILL.md to ensure:

- All new referenced files exist and are linked correctly
- Line count is still under 500 (move content to references/ if needed)
- Available scripts section lists all new scripts
- Reference files section lists all new references
- The Quick Reference table is updated with new phases/outputs

**Files:**

- Modify: `skill-maker/SKILL.md`

### Step 1: Update "Available scripts" section

Add the new scripts:

```markdown
- **`scripts/optimize-description.ts`** - Optimize skill description for
  triggering accuracy. Run `bun run scripts/optimize-description.ts --help`
- **`scripts/eval-trigger.ts`** - Test if a query would trigger a skill
  description. Run `bun run scripts/eval-trigger.ts --help`
- **`scripts/update-history.ts`** - Track version progression across iterations.
  Run `bun run scripts/update-history.ts --help`
- **`scripts/package-skill.ts`** - Package a skill for distribution. Run
  `bun run scripts/package-skill.ts --help`
- **`eval-viewer/generate-review.ts`** - Generate static HTML eval viewer. Run
  `bun run eval-viewer/generate-review.ts --help`
```

### Step 2: Update "Reference files" section

Add new references:

```markdown
- **[references/grader-prompt.md](references/grader-prompt.md)** - Subagent
  prompt for grading subjective assertions with claim extraction and eval
  critique
- **[references/comparator-prompt.md](references/comparator-prompt.md)** -
  Subagent prompt for blind A/B output comparison
- **[references/analyzer-prompt.md](references/analyzer-prompt.md)** - Subagent
  prompt for post-hoc analysis and benchmark pattern detection
```

### Step 3: Check line count

Run: `bun run scripts/validate-skill.ts skill-maker/`

If `body_lines` > 500:

- Move "Environment Notes" and "Safety" sections to
  `references/environment-notes.md`
- Move "Advanced: Blind Comparison" to `references/blind-comparison.md`
- Replace with brief links in SKILL.md

### Step 4: Final validation

```bash
bun run scripts/validate-skill.ts skill-maker/
```

Expected: `valid: true`, zero errors, `body_lines` < 500

### Step 5: Commit

```
chore(skill-maker): final polish — update script/reference listings, verify line count
```

---

## Summary of New Files

After all tasks are complete, the skill-maker directory should contain:

```
skill-maker/
├── SKILL.md                              # Updated with new references
├── scripts/
│   ├── grade.ts                          # Existing
│   ├── aggregate-benchmark.ts            # Existing
│   ├── detect-plateau.ts                 # Existing
│   ├── validate-skill.ts                 # Existing
│   ├── optimize-description.ts           # NEW — Task 4
│   ├── eval-trigger.ts                   # NEW — Task 4
│   ├── update-history.ts                 # NEW — Task 5
│   └── package-skill.ts                  # NEW — Task 7
├── eval-viewer/
│   ├── generate-review.ts                # NEW — Task 3
│   └── viewer-template.html              # NEW — Task 3
├── references/
│   ├── schemas.md                        # Updated — Tasks 1, 2, 5
│   ├── spec-summary.md                   # Existing
│   ├── grader-prompt.md                  # NEW — Task 1
│   ├── comparator-prompt.md              # NEW — Task 2
│   └── analyzer-prompt.md                # NEW — Task 2
├── assets/
│   ├── skill-template.md                 # Existing
│   └── trigger-eval-review.html          # NEW — Task 4
└── evals/
    └── evals.json                        # Existing
```

## Dependency Order

Tasks 1-7 are independent and can be executed in parallel. Task 8 depends on all
previous tasks being complete.

Recommended execution order for serial implementation:

1. Task 1 (Grader spec) — foundation for richer grading
2. Task 3 (Eval viewer) — highest UX impact
3. Task 4 (Description optimization) — most complex, highest automation value
4. Task 2 (Blind comparison) — builds on grader patterns
5. Task 5 (History tracking) — small, fast
6. Task 6 (Environment notes) — small, fast
7. Task 7 (Packaging) — small, fast
8. Task 8 (Final polish) — must be last

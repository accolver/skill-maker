---
name: skill-maker
description: Create new agent skills from scratch and iteratively improve them using eval-driven subagent loops. Use when users want to create a skill, build a SKILL.md, test skill quality with evaluations, benchmark skill performance, or optimize a skill's description for triggering accuracy. Also use when users mention making reusable agent workflows, capturing repeatable processes as skills, or packaging agent knowledge.
---

# Skill Maker

Create agent skills and iteratively improve them through eval-driven subagent
loops until they plateau or hit 20 iterations.

## Overview

This skill guides you through the full lifecycle of creating an agent skill:

1. **Capture intent** - understand what the skill should do
2. **Draft** - write the SKILL.md and supporting files
3. **Eval loop** - spawn subagents to test the skill, grade outputs, detect
   plateau
4. **Refine** - improve the skill based on eval signals
5. **Optimize description** - tune the description for triggering accuracy

The eval loop is the core: spawn isolated subagents per test case, grade
assertions with bundled scripts, aggregate benchmarks, and iterate until
pass_rate plateaus or you hit 20 iterations.

## Available scripts

All scripts use Bun. Run any script with `--help` for usage details.

- **`scripts/grade.ts`** - Grade assertions against eval outputs
- **`scripts/aggregate-benchmark.ts`** - Aggregate grading results into
  benchmark.json
- **`scripts/detect-plateau.ts`** - Detect pass_rate plateau across iterations
- **`scripts/validate-skill.ts`** - Validate a SKILL.md against the Agent Skills
  spec
- **`scripts/optimize-description.ts`** - Optimize skill description for trigger
  accuracy
- **`scripts/eval-trigger.ts`** - Test if a query would trigger a skill
  description
- **`scripts/update-history.ts`** - Track version progression across iterations
- **`scripts/package-skill.ts`** - Package a skill for distribution
- **`eval-viewer/generate-review.ts`** - Generate static HTML eval viewer

## Reference files

- **[references/schemas.md](references/schemas.md)** - JSON schemas for all eval
  artifacts (evals.json, grading.json, timing.json, benchmark.json,
  feedback.json)
- **[references/spec-summary.md](references/spec-summary.md)** - Quick reference
  of the Agent Skills specification
- **[references/grader-prompt.md](references/grader-prompt.md)** - Subagent
  prompt for grading subjective assertions with claim extraction and eval
  critique
- **[references/comparator-prompt.md](references/comparator-prompt.md)** -
  Subagent prompt for blind A/B output comparison
- **[references/analyzer-prompt.md](references/analyzer-prompt.md)** - Subagent
  prompt for post-hoc analysis and benchmark pattern detection
- **[assets/skill-template.md](assets/skill-template.md)** - Starter SKILL.md
  template to copy and fill in

---

## Phase 1: Capture Intent

Understand what the user wants the skill to do before writing anything.

### Questions to answer

1. What should the skill enable an agent to do?
2. When should the skill trigger? (user phrases, contexts, keywords)
3. What is the expected output format?
4. Are there environment requirements? (tools, packages, network)
5. Should we set up test cases? (Yes for objectively verifiable outputs like
   file transforms, data extraction, code generation. Skip for subjective
   outputs like writing style.)

### Research

Before drafting, research the problem domain:

- Check if existing tools or packages solve part of the problem
- Look for similar skills or patterns
- Identify edge cases and failure modes
- Understand what context the agent will NOT have without this skill

Do not proceed to Phase 2 until you understand the skill's purpose, triggering
conditions, and success criteria.

---

## Phase 2: Draft the Skill

### Step 1: Create the skill directory

```bash
mkdir -p <skill-name>/scripts <skill-name>/references <skill-name>/assets <skill-name>/evals
```

### Step 2: Copy and fill the template

Read [assets/skill-template.md](assets/skill-template.md) and copy it to
`<skill-name>/SKILL.md`. Fill in all `{{PLACEHOLDER}}` values.

Consult [references/spec-summary.md](references/spec-summary.md) for frontmatter
constraints and body guidelines.

### Step 3: Write the description

The description is the primary triggering mechanism. It determines whether an
agent loads the skill. A weak description means the skill never activates.

**Rules:**

- Write in third person
- **MUST include both** what the skill does AND "Use when..." trigger conditions
- Include specific trigger keywords and synonyms
- Be slightly "pushy" - agents tend to undertrigger, so err on the side of
  broader triggering
- Under 1024 characters
- **MUST be a single line** - do not use YAML multiline scalars (`>` or `|`)
  because minimal YAML parsers in validators will reject them

**Good example:**

```yaml
description: Extract text and tables from PDF files, fill PDF forms, and merge multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.
```

**Bad example (missing "Use when..."):**

```yaml
description: Analyzes git changes and generates conventional commit messages.
```

This will undertrigger because agents don't know when to activate it.

### Step 4: Write the body

Follow these principles:

- **Concise is key.** Claude is smart. Only add context it doesn't already have.
- **Set appropriate freedom.** Use strict instructions for fragile operations,
  flexible guidance for judgment-based tasks.
- **Explain the why.** Reasoning-based instructions ("Do X because Y")
  outperform rigid directives ("ALWAYS do X").
- **One excellent example** beats many mediocre ones.
- **Keep under 500 lines.** Split into reference files if longer.
- **Use progressive disclosure.** The SKILL.md is the overview; move heavy
  reference material (API docs, large examples, lookup tables) into
  `references/` files and link to them. The agent loads these on demand, keeping
  base context small.
- **Include a workflow or checklist.** Skills with numbered steps or checklists
  that agents can track produce more consistent results than prose paragraphs.
- **Add a "Common mistakes" section.** Document failure patterns you've seen or
  anticipate. Agents are much better at avoiding mistakes when they're
  explicitly listed.

### Step 5: Add scripts if needed

If the skill involves deterministic operations (validation, data processing,
file transforms), bundle scripts in `scripts/`.

**ALWAYS use Bun TypeScript (.ts)** unless the domain requires Python. Pin
dependency versions in imports (`import * as cheerio from "cheerio@1.0.0"`). For
Python, use PEP 723 inline metadata and run with `uv run`.

**Script design checklist:**

- `--help` flag with usage examples
- JSON output to stdout, diagnostics to stderr
- Meaningful exit codes (0 = success, non-zero = specific failure)
- Idempotent, no interactive prompts

### Step 6: Create initial eval test cases

Write 2-3 realistic test prompts to `<skill-name>/evals/evals.json`. These are
essential for verifying the skill works. Even during initial drafting, include
basic test cases — they can be refined later. See Phase 3 for format details,
but do NOT skip this step.

```json
{
  "skill_name": "<skill-name>",
  "evals": [
    {
      "id": 1,
      "prompt": "A realistic user message",
      "expected_output": "What success looks like",
      "files": [],
      "assertions": []
    }
  ]
}
```

### Step 7: Validate (HARD GATE)

**Do NOT proceed to Phase 3 until validation passes with zero errors.**

```bash
bun run scripts/validate-skill.ts <skill-dir>
```

Fix all errors. Review warnings. Common validation failures:

- YAML multiline description (`>` or `|`) — use a single-line value instead
- Name contains uppercase — use lowercase only
- Name doesn't match directory name — rename directory or update frontmatter
- Missing description — add one with "Use when..." triggers

---

## Phase 3: Create Test Cases

Write 2-3 realistic test prompts to `evals/evals.json` (see Phase 2 Step 6 for
format, [references/schemas.md](references/schemas.md) for full schema).

### Test prompt quality checklist

- Varied phrasing (casual, precise, different levels of detail)
- At least one edge case (malformed input, unusual request, ambiguous
  instruction)
- Realistic context (file paths, column names, personal context)
- Substantive enough that an agent would benefit from a skill (not trivial
  one-step tasks)

### Test case difficulty (CRITICAL)

Your initial test cases WILL be too easy. This is the most common skill-maker
failure mode. Before proceeding, pressure-test every eval against this
checklist:

- **Would a competent agent pass this without the skill?** If yes, the test is
  too easy. Agents already know common CLI commands, standard API patterns, and
  popular framework conventions. Your test must target what agents get WRONG
  without structured guidance.
- **Does the test require the skill's specific discipline?** Good tests require
  the skill's workflow, safety model, output format, or domain-specific
  conventions — things agents skip or get inconsistent without explicit
  instruction.
- **Does the test have multiple interacting concerns?** Simple single-task
  prompts (e.g., "create a VM") are too easy. Combine concerns: "create a VM,
  but also check quotas, and the user mentioned they're in the wrong project."
- **Does the test expose failure modes?** Include at least one test where the
  naive approach (no skill) would produce subtly wrong output — not obviously
  broken, but missing safety checks, wrong conventions, or incomplete coverage.

**Red flags that your tests are too easy:**

- All tests are "do X" single-action prompts
- Tests use textbook examples from official docs
- Tests don't require any skill-specific workflow steps
- A senior engineer could answer the prompt correctly from memory
- The prompt basically tells the agent exactly what to do

**Better test patterns:**

- Error diagnosis with misleading symptoms
- Multi-step operations where order and safety gates matter
- Requests that mix safe and dangerous operations in one prompt
- Edge cases the skill specifically addresses in its "common mistakes" section
- Scenarios requiring output formatting or conventions the skill enforces

Do NOT write assertions yet — draft those in Phase 4 while eval runs execute.

---

## Phase 4: The Eval Loop

This is the core of the skill-making process. You will iterate up to 20 times,
or until pass_rate plateaus.

### Setup

Create a workspace directory as a sibling to the skill directory:

```bash
mkdir -p <skill-name>-workspace/iteration-1
```

### For each iteration

#### Step 1: Spawn subagent runs

For each eval in evals.json, spawn TWO isolated subagent runs in the same turn:

**With-skill run:**

```
Execute this task:
- Read and follow the skill at: <path-to-skill>/SKILL.md
- Task: <eval prompt from evals.json>
- Input files: <eval files if any, or "none">
- Save all outputs to: <workspace>/iteration-<N>/eval-<name>/with_skill/outputs/
```

**Baseline run** (same prompt, no skill):

```
Execute this task (no skill):
- Task: <eval prompt from evals.json>
- Input files: <eval files if any, or "none">
- Save all outputs to: <workspace>/iteration-<N>/eval-<name>/without_skill/outputs/
```

Each subagent MUST start with clean context - no leftover state from previous
runs. This is critical for testing that the SKILL.md alone provides sufficient
guidance.

Write an `eval_metadata.json` for each eval directory:

```json
{
  "eval_id": 1,
  "eval_name": "descriptive-name",
  "prompt": "The eval prompt",
  "assertions": []
}
```

When **improving** an existing skill (iteration 2+), snapshot the previous
version first:

```bash
cp -r <skill-path> <workspace>/skill-snapshot/
```

Then point baseline runs at the snapshot. Use `old_skill/` instead of
`without_skill/`.

#### Step 2: Draft assertions while runs are in progress

While subagent runs execute, draft assertions for each eval. Good assertions
are:

- Objectively verifiable ("The output file is valid JSON")
- Specific and observable ("The chart has labeled axes")
- Countable ("The report includes at least 3 recommendations")
- Testing what the **skill** adds, not what the **prompt** provides (if the
  prompt mentions "600 DPI", checking for "600" tests the agent's reading
  comprehension, not the skill's value)
- **Discriminating** — should FAIL without the skill and PASS with it. If an
  assertion would pass regardless, it's testing the agent, not the skill.

Bad assertions:

- Too vague to grade ("The output is good")
- Too brittle ("The output uses exactly the phrase 'Total Revenue: $X'")
- Derived from the prompt itself (keywords the agent would echo regardless of
  the skill — these always pass in both configurations)
- Testing common knowledge any agent already has ("uses `gcloud auth login` to
  authenticate") — agents know this without your skill

**Aim for 50%+ assertion failure rate in without_skill runs.** If your
without_skill baseline passes most assertions, your assertions are testing
general agent competence, not skill value. Rewrite them to target the specific
behaviors, conventions, safety patterns, or structural requirements that only
the skill teaches.

Update `eval_metadata.json` and `evals/evals.json` with the assertions.

#### Step 3: Capture timing data

When each subagent completes, save timing data immediately to `timing.json` in
the run directory:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

This data comes from the task completion notification and is not persisted
elsewhere. Capture it as each run finishes.

#### Step 4: Grade outputs

Run the grading script on each completed run:

```bash
bun run scripts/grade.ts <workspace>/iteration-<N>/eval-<name>/with_skill/
bun run scripts/grade.ts <workspace>/iteration-<N>/eval-<name>/without_skill/
```

This reads outputs and assertions, produces `grading.json` with PASS/FAIL and
evidence for each assertion.

For assertions that can be checked programmatically (valid JSON, correct row
count, file exists), the script handles this automatically. For subjective
assertions that require judgment, spawn a grader subagent with the prompt from
[references/grader-prompt.md](references/grader-prompt.md). The grader also
extracts implicit claims from outputs, critiques assertion quality, and flags
eval improvements — producing a richer grading.json. See
[references/schemas.md](references/schemas.md) for both output formats.

**Note:** The `grade.ts` script uses keyword matching which systematically
under-scores outputs that satisfy assertions semantically but don't contain
exact keyword matches. If you see assertions marked FAIL with evidence like "No
matches for [assertion text]", those need semantic grading via a grader
subagent.

#### Step 5: Aggregate benchmark

```bash
bun run scripts/aggregate-benchmark.ts <workspace>/iteration-<N> --skill-name <name>
```

This produces `benchmark.json` and `benchmark.md` with pass_rate, timing, and
tokens for each configuration, including mean, stddev, and delta.

#### Step 6: Detect plateau

```bash
bun run scripts/detect-plateau.ts <workspace> --threshold 0.02 --window 2 --max-iterations 20
```

Exit codes:

- `0` (CONTINUE): Keep iterating
- `10` (PLATEAU): Pass rate improved < 2% for 2 consecutive iterations, or pass
  rate already at 100%. **Stop here.**
- `20` (MAX_REACHED): Hit 20 iterations. **Stop here.**

If status is PLATEAU or MAX_REACHED, skip to Phase 5.

#### Step 7: Analyze patterns (HARD GATE)

Before showing results to the user, analyze the benchmark data. **Do NOT present
results until you have completed this analysis.**

- **Non-discriminating assertions**: Always pass in both configs. Remove or
  replace them.
- **Always-failing assertions**: Either broken assertions or too-hard test
  cases. Fix them.
- **High-value assertions**: Pass with skill, fail without. Understand WHY.
- **High-variance evals**: Inconsistent pass/fail across runs. Tighten
  instructions or fix flaky assertions.
- **Token/time outliers**: If one eval costs 3x more, read its transcript to
  find the bottleneck.

**Mandatory self-critique when delta is below +25%:**

If the aggregate delta (with_skill pass_rate - without_skill pass_rate) is below
+25%, your evals or assertions are almost certainly too easy. Before proceeding:

1. Read each without_skill output. For every assertion it passed, ask: "Would
   this assertion also pass if the agent had never seen this skill?" If yes, the
   assertion is non-discriminating — replace it.
2. Check if test prompts are simple single-action tasks that any agent handles
   well. Replace with multi-concern scenarios, error diagnosis, or edge cases.
3. Look at what the skill specifically teaches (safety gates, output formats,
   domain conventions, workflow steps) and write assertions that directly test
   those behaviors.
4. **Rewrite evals and assertions, then re-run the iteration.** Do not accept a
   low delta and move on — iterate on the tests themselves, not just the skill.

#### Step 8: Human review

Present results to the user:

- Show per-eval pass rates (with_skill vs baseline)
- Show aggregate delta (how much the skill improves things)
- Show any analyst observations from Step 7
- Ask for feedback on each eval's outputs

Record feedback. Empty feedback means the output was fine.

#### Step 9: Improve the skill

You now have three signal sources:

1. **Failed assertions** - specific gaps in the skill
2. **Human feedback** - broader quality issues
3. **Execution transcripts** - why things went wrong

Use all three to improve the skill. Key principles:

- **Generalize from feedback.** The skill will be used across many prompts, not
  just these test cases. Avoid overfitting to specific examples.
- **Keep the skill lean.** Fewer, better instructions often outperform
  exhaustive rules. If transcripts show wasted work, remove those instructions.
- **Explain the why.** "Do X because Y tends to cause Z" works better than
  "ALWAYS do X, NEVER do Y."
- **Bundle repeated work.** If every test run independently wrote a similar
  helper script, bundle it in `scripts/`.

Apply improvements to the skill. Go to Step 1 with a new iteration directory.

`spawn runs → grade → benchmark → plateau? → analyze → review → improve → repeat`

#### Advanced: Blind Comparison (Optional)

For rigorous version comparison, use blind A/B comparison to remove bias: spawn
a comparator subagent
([references/comparator-prompt.md](references/comparator-prompt.md)) with
unlabeled outputs, then an analyzer
([references/analyzer-prompt.md](references/analyzer-prompt.md)) to explain WHY
the winner won. Use when pass rates are close between iterations or you need
structured reasoning about what improved.

---

## Phase 5: Finalize

### Validate the final skill

```bash
bun run scripts/validate-skill.ts <skill-dir>
```

### Optimize the description

After the skill content is stable, optimize the description for triggering
accuracy.

1. Generate 20 eval queries - mix of should-trigger (8-10) and
   should-not-trigger (8-10):
   - Should-trigger: varied phrasings of tasks the skill handles, including
     indirect references
   - Should-not-trigger: near-misses that share keywords but need different
     tools. NOT obviously irrelevant queries.

2. For each query, test whether the skill's description would cause an agent to
   select it
3. Adjust description to improve true positives and reduce false positives
4. Re-test until satisfied

### Install the skill

```bash
cp -r <skill-name> ~/.agents/skills/<skill-name>   # cross-client
cp -r <skill-name> .agents/skills/<skill-name>      # project-level
```

### Final checklist

- [ ] SKILL.md has valid frontmatter (name, description)
- [ ] name matches directory name
- [ ] description includes what + when + trigger keywords
- [ ] Body under 500 lines
- [ ] Scripts have --help, structured output, meaningful exit codes
- [ ] At least 3 eval test cases with assertions
- [ ] Eval loop ran with measurable improvement over baseline
- [ ] No referenced files are missing
- [ ] All scripts run successfully with `bun run`

---

## Quick Reference

| Phase         | What                        | Output           |
| ------------- | --------------------------- | ---------------- |
| 1. Intent     | Interview, research         | Requirements     |
| 2. Draft      | SKILL.md + scripts          | Skill directory  |
| 3. Test cases | Write eval prompts          | evals.json       |
| 4. Eval loop  | Subagents, grade, iterate   | benchmark.json   |
| 5. Finalize   | Validate, optimize, install | Production skill |

| Script                 | Purpose                      | Run                                                                  |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------- |
| grade.ts               | Grade assertions vs outputs  | `bun run scripts/grade.ts <run-dir>`                                 |
| aggregate-benchmark.ts | Aggregate to benchmark.json  | `bun run scripts/aggregate-benchmark.ts <iter-dir> --skill-name <n>` |
| detect-plateau.ts      | Check if pass_rate plateaued | `bun run scripts/detect-plateau.ts <workspace>`                      |
| validate-skill.ts      | Validate SKILL.md            | `bun run scripts/validate-skill.ts <skill-dir>`                      |

**Stop conditions:** Plateau (delta < 2% for 2 iterations, or 100%), max
iterations (20), or user satisfied (empty feedback).

## Environment Notes

skill-maker is **harness-agnostic** — it works with any AI coding agent
(OpenCode, Claude Code, Cursor, Cline, etc.). Agents with subagent support get
the full workflow. Without subagents, run test cases inline and skip baselines,
blind comparison, and description optimization. For headless/CI use, the eval
viewer generates static HTML and description optimization accepts a `--cli` flag
for any compatible CLI tool.

Skills must not contain malware or content designed to compromise security. A
skill's contents should not surprise the user in their intent if described.

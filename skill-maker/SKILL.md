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

All scripts use Bun. Run with `bun run <path>`.

- **`scripts/grade.ts`** - Grade assertions against eval outputs. Run
  `bun run scripts/grade.ts --help`
- **`scripts/aggregate-benchmark.ts`** - Aggregate grading results into
  benchmark.json. Run `bun run scripts/aggregate-benchmark.ts --help`
- **`scripts/detect-plateau.ts`** - Detect pass_rate plateau across iterations.
  Run `bun run scripts/detect-plateau.ts --help`
- **`scripts/validate-skill.ts`** - Validate a SKILL.md against the Agent Skills
  spec. Run `bun run scripts/validate-skill.ts --help`

## Reference files

- **[references/schemas.md](references/schemas.md)** - JSON schemas for all eval
  artifacts (evals.json, grading.json, timing.json, benchmark.json,
  feedback.json)
- **[references/spec-summary.md](references/spec-summary.md)** - Quick reference
  of the Agent Skills specification
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
file transforms), bundle scripts in `scripts/`. Scripts should:

- Be self-contained or declare dependencies inline
- Use Bun as the preferred runtime (with `#!/usr/bin/env bun` shebang)
- Include `--help` output
- Use structured output (JSON to stdout, diagnostics to stderr)
- Be idempotent where possible
- Avoid interactive prompts

**ALWAYS use Bun TypeScript (.ts) for scripts** unless the skill's domain
specifically requires Python or another runtime. Bun has native TypeScript
support, fast startup, and auto-installs dependencies. Do NOT default to Bash
scripts — TypeScript scripts are more maintainable, have better error handling,
and produce structured JSON output naturally.

For Bun scripts with dependencies, pin versions in the import path:

```typescript
#!/usr/bin/env bun
import * as cheerio from "cheerio@1.0.0";
```

For Python scripts (when the domain requires it), use PEP 723 inline metadata
and run with `uv run`:

```python
# /// script
# dependencies = ["beautifulsoup4"]
# ///
```

**Script design checklist:**

- `--help` flag with usage examples and flag descriptions
- JSON output to stdout (agents can parse it)
- Diagnostics/progress to stderr (keeps stdout clean)
- Meaningful exit codes (0 = success, non-zero = specific failure)
- Idempotent operations (safe to retry)
- No interactive prompts (agents can't respond to TTY input)

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

Write 2-3 realistic test prompts before running evals.

### Write evals.json

Save to `<skill-name>/evals/evals.json`:

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "Realistic user message with context, file paths, specifics",
      "expected_output": "Human-readable description of what success looks like",
      "files": [],
      "assertions": []
    }
  ]
}
```

See [references/schemas.md](references/schemas.md) for the full schema.

### Test prompt quality checklist

- Varied phrasing (casual, precise, different levels of detail)
- At least one edge case (malformed input, unusual request, ambiguous
  instruction)
- Realistic context (file paths, column names, personal context)
- Substantive enough that an agent would benefit from a skill (not trivial
  one-step tasks)

Do NOT write assertions yet. You will draft those in Phase 4 while eval runs are
in progress.

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
assertions, spawn a grader subagent to evaluate.

#### Step 5: Aggregate benchmark

```bash
bun run scripts/aggregate-benchmark.ts <workspace>/iteration-<N> --skill-name <name>
```

This produces `benchmark.json` and `benchmark.md` with pass_rate, timing, and
tokens for each configuration, including mean, stddev, and delta.

#### Step 6: Detect plateau

```bash
bun run scripts/detect-plateau.ts <workspace> --threshold 0.02 --window 3 --max-iterations 20
```

Exit codes:

- `0` (CONTINUE): Keep iterating
- `10` (PLATEAU): Pass rate improved < 2% for 3 consecutive iterations. **Stop
  here.**
- `20` (MAX_REACHED): Hit 20 iterations. **Stop here.**

If status is PLATEAU or MAX_REACHED, skip to Phase 5.

#### Step 7: Analyze patterns

Before showing results to the user, analyze the benchmark data:

- **Non-discriminating assertions**: Always pass in both configs. Remove or
  replace them.
- **Always-failing assertions**: Either broken assertions or too-hard test
  cases. Fix them.
- **High-value assertions**: Pass with skill, fail without. Understand WHY.
- **High-variance evals**: Inconsistent pass/fail across runs. Tighten
  instructions or fix flaky assertions.
- **Token/time outliers**: If one eval costs 3x more, read its transcript to
  find the bottleneck.

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

### The loop visualized

```
iteration = 1
LOOP:
  spawn subagents (with_skill + baseline) per eval case
  draft/refine assertions
  capture timing
  grade outputs          -> grading.json per run
  aggregate benchmark    -> benchmark.json + benchmark.md
  detect plateau         -> CONTINUE | PLATEAU | MAX_REACHED
  if PLATEAU or MAX_REACHED: break
  analyze patterns
  human review           -> feedback.json
  improve skill from signals
  iteration += 1
  goto LOOP
```

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

Copy the skill directory to the appropriate location:

```bash
# Cross-client (recommended):
cp -r <skill-name> ~/.agents/skills/<skill-name>

# Claude Code specific:
cp -r <skill-name> ~/.claude/skills/<skill-name>

# Project-level:
cp -r <skill-name> .agents/skills/<skill-name>
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

| Phase         | What                                     | Key Output                   |
| ------------- | ---------------------------------------- | ---------------------------- |
| 1. Intent     | Interview user, research domain          | Requirements                 |
| 2. Draft      | Write SKILL.md + scripts                 | Skill directory              |
| 3. Test cases | Write eval prompts                       | evals/evals.json             |
| 4. Eval loop  | Subagent runs, grade, benchmark, iterate | benchmark.json per iteration |
| 5. Finalize   | Validate, optimize description, install  | Production skill             |

| Script                 | Purpose                      | Run                                                                  |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------- |
| grade.ts               | Grade assertions vs outputs  | `bun run scripts/grade.ts <run-dir>`                                 |
| aggregate-benchmark.ts | Aggregate to benchmark.json  | `bun run scripts/aggregate-benchmark.ts <iter-dir> --skill-name <n>` |
| detect-plateau.ts      | Check if pass_rate plateaued | `bun run scripts/detect-plateau.ts <workspace>`                      |
| validate-skill.ts      | Validate SKILL.md            | `bun run scripts/validate-skill.ts <skill-dir>`                      |

| Stop condition | Trigger                                           |
| -------------- | ------------------------------------------------- |
| Plateau        | pass_rate delta < 2% for 3 consecutive iterations |
| Max iterations | 20 iterations reached                             |
| User satisfied | Feedback is empty across all evals                |

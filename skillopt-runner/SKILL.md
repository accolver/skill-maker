---
name: skillopt-runner
description: Run Microsoft SkillOpt experiments for agent skills, prompts, or instruction files with clean train/validation/held-out splits, adapter setup, bounded rollouts, artifact collection, and honest reporting. Use when the user wants to use SkillOpt, optimize a skill with SkillOpt, benchmark prompt variants, run multi-epoch skill optimization, check held-out quality, or diagnose SkillOpt runs.
---

# SkillOpt Runner

Use Microsoft SkillOpt to optimize agent skills, prompts, or instruction files in a
reproducible way. Keep the process simple: prepare clean data, configure an
adapter, run bounded optimization, evaluate on held-out examples, and report what
is actually supported by the artifacts.

## Core rules

1. **Separate the splits.** Training examples guide updates, validation examples
   select candidates, and held-out test examples are only for final reporting.
2. **Keep a frozen baseline.** Score the original skill or prompt on the same
   held-out test set before reporting an optimized result.
3. **Record the exact environment.** Capture SkillOpt commit, model backend,
   adapter code, dataset path, config file, command, and random seeds if used.
4. **Bound external calls.** Time out rollouts, reflection, and update steps so a
   single stuck backend does not consume the run.
5. **Label fallbacks honestly.** Deterministic or mocked runs can validate
   mechanics, but they are not live-LLM quality claims.
6. **Preserve deployable frontmatter.** If optimizing a skill file, keep required
   metadata such as `name` and `description` valid and single-line.

---

## Workflow

### 1. Clarify the target

Before running anything, identify:

- Target type: skill, prompt, instruction file, system prompt, or workflow guide
- Source file path and any supporting references/scripts
- Desired output behavior and required response format
- Available model/backend for rollouts
- Runtime limits, cost limits, and whether network calls are allowed
- Whether the user wants a live optimization run or a deterministic mechanics run

If the request is underspecified, ask for the target file, success criteria, and
allowed backend before starting.

### 2. Set up SkillOpt

Use an isolated checkout and virtual environment unless the user already has a
working installation.

```bash
git clone https://github.com/microsoft/SkillOpt.git /tmp/SkillOpt
python3 -m venv /tmp/skillopt-venv
/tmp/skillopt-venv/bin/pip install -U pip
/tmp/skillopt-venv/bin/pip install -e /tmp/SkillOpt
git -C /tmp/SkillOpt rev-parse --short HEAD
```

If `/tmp/SkillOpt` already exists, record the current commit before editing or
reinstalling it.

### 3. Prepare data

Create three splits for each target:

```text
data/<target>/
├── initial_skill.md        # or initial_prompt.md / initial_instruction.md
├── train/items.json        # examples used for optimization feedback
├── val/items.json          # examples used for candidate selection
└── test/items.json         # held-out examples used once for final reporting
```

Each item should include enough information for deterministic scoring or
repeatable grading:

```json
{
  "id": "case-001",
  "prompt": "User request to execute with the skill or prompt",
  "context": "Optional files, snippets, constraints, or setup notes",
  "checks": [
    { "type": "contains", "value": "required phrase or field" },
    { "type": "not_contains", "value": "forbidden claim" },
    { "type": "regex", "value": "^structured pattern" }
  ],
  "notes": "Why this case matters"
}
```

Good split hygiene:

- Put realistic examples in every split.
- Do not copy the same prompt between train, validation, and held-out test.
- Include negative checks for common overclaiming or unsafe behavior.
- Include at least one edge case that exercises boundaries or refusal behavior.
- Keep held-out cases hidden from the update prompt.

### 4. Configure the adapter

A SkillOpt adapter must be able to:

- Load split items.
- Inject the candidate skill/prompt/instruction into the rollout.
- Run the task through the selected backend.
- Score output using deterministic checks or a documented grader.
- Return structured per-example metrics and evidence.

Adapter outputs should include:

```json
{
  "case_id": "case-001",
  "score": 1.0,
  "passed": true,
  "output_path": "predictions/case-001/output.txt",
  "evidence": ["matched required field", "no forbidden claim found"]
}
```

Prefer deterministic checks when possible. If an LLM grader is necessary, keep a
fixed rubric, require evidence quotes, and store grader outputs as artifacts.

### 5. Run a baseline evaluation

Before optimization, evaluate the original target on held-out test cases.

Record:

- Baseline target path and content hash
- Held-out dataset path and content hash
- Scoring method
- Per-case pass/fail evidence
- Aggregate hard score and, if useful, partial/soft score

Do not change the held-out test set after seeing baseline results unless you
restart the comparison and clearly document the new dataset version.

### 6. Run SkillOpt

Use the project’s SkillOpt command shape if one already exists. Otherwise, run a
bounded training command and tee logs into a stable file:

```bash
cd /tmp/SkillOpt
PYTHONUNBUFFERED=1 \
PATH=/tmp/skillopt-venv/bin:$PATH \
/tmp/skillopt-venv/bin/python -u scripts/train.py \
  --config configs/<config>.yaml \
  --split_dir /absolute/path/to/data/<target> \
  --skill_init /absolute/path/to/data/<target>/initial_skill.md \
  --out_root /absolute/path/to/results/<target> \
  --num_steps 4 \
  2>&1 | tee /tmp/skillopt-<target>.log
```

If the local SkillOpt checkout uses different CLI flags, inspect its `scripts/`
and config files, then adapt the command while preserving the same principles:
train split for feedback, validation for selection, held-out only for final
reporting.

### 7. Collect artifacts

For every run, save:

- Config file used for the run
- Initial target file
- Candidate files per step/epoch
- Best selected target file
- Rollout predictions for train/validation/test
- Per-case scores and evidence
- Aggregate summary JSON
- Raw logs
- Notes on any patches, failures, retries, or fallback behavior

Use stable paths such as:

```text
results/<run-name>/
├── README.md
├── summary.json
├── best_skill.md
├── history.json
├── logs/
└── predictions/
```

### 8. Evaluate held-out quality

After SkillOpt selects the best candidate, evaluate that candidate on the frozen
held-out test split. Compare it only against the frozen baseline scored on the
same held-out split.

Report both aggregate and per-case results:

```markdown
| Target | Baseline hard | Baseline soft | SkillOpt hard | SkillOpt soft | Hard delta | Soft delta |
|---|---:|---:|---:|---:|---:|---:|
| example-skill | 66.7% | 88.9% | 100.0% | 96.3% | +33.3 | +7.4 |
```

If there is no clean held-out run, say so plainly and avoid quality claims.

### 9. Apply the selected result

When replacing a skill or prompt:

1. Keep required metadata valid.
2. Preserve useful scripts, assets, and references unless the optimized content
   intentionally changes how they are used.
3. Avoid adding process-history clutter to ordinary user-facing skill bodies.
4. Validate the final file with the project’s validator or a frontmatter/parser
   check.
5. Re-run at least smoke-level tests before publishing or installing.

---

## Troubleshooting

| Problem | Likely cause | Response |
| --- | --- | --- |
| Rollout hangs | Backend subprocess or network call is stuck | Add process timeout, capture logs, kill child processes, retry with fewer workers |
| Reflection/update hangs | Model backend blocks inside threaded code | Disable parallelism, lower concurrency, or use a direct API backend |
| Candidate degrades held-out score | Overfit to train/validation examples | Keep baseline, reject candidate, add broader validation cases |
| Validation improves but test fails | Split leakage or narrow eval data | Regenerate cleaner splits and rerun from the original target |
| Grader is inconsistent | Subjective rubric or missing evidence | Prefer deterministic checks; require quoted evidence for LLM grading |
| Mechanics run succeeds only with fallback | Live backend instability | Label as mechanics-only and do not make live quality claims |
| Optimized file breaks install | Invalid frontmatter or missing references | Restore metadata, check referenced files, validate before publishing |

### Process cleanup

After failures, check for lingering child processes before starting another run:

```bash
ps aux | grep -E 'SkillOpt|codex exec|python.*train.py' | grep -v grep
```

Terminate only processes that clearly belong to the failed run.

---

## Reporting template

Use this structure for the final report:

```markdown
# SkillOpt Run Report

## Target
- Name:
- Source file:
- Initial content hash:
- SkillOpt commit:
- Backend/model:
- Dataset version:

## Run Type
- Live LLM optimization / deterministic mechanics / mixed
- Steps or epochs:
- Timeout and concurrency limits:

## Results
| Split | Baseline hard | Baseline soft | SkillOpt hard | SkillOpt soft |
|---|---:|---:|---:|---:|
| held-out test |  |  |  |  |

## Selected Candidate
- Path:
- Why selected:
- Main improvements:
- Regressions or caveats:

## Artifacts
- Summary JSON:
- Best candidate:
- Logs:
- Predictions:

## Caveats
- Any backend failures:
- Any fallback behavior:
- Any limitations of the eval set:
```

---

## Common mistakes

- Reusing training examples as held-out test examples.
- Reporting validation scores as final quality.
- Comparing optimized held-out scores against an unrelated baseline score.
- Letting SkillOpt rewrite required frontmatter incorrectly.
- Publishing a candidate without validating installability.
- Hiding failed runs or fallback behavior.
- Treating deterministic mechanics checks as proof that live model quality
  improved.
- Leaving stale generated artifacts mixed with source files without documenting
  which files are authoritative.

---

## Completion checklist

Before calling the work done, verify:

- [ ] Target and backend were identified.
- [ ] Train, validation, and held-out test splits exist.
- [ ] Baseline was scored on the held-out test split.
- [ ] SkillOpt command, config, commit, and logs were recorded.
- [ ] Best candidate was evaluated on held-out test.
- [ ] Report compares baseline and optimized candidate on the same held-out set.
- [ ] Any fallback or failed backend behavior is clearly labeled.
- [ ] Final skill/prompt file validates and remains installable.
- [ ] No unrelated process-history notes were added to ordinary user-facing files.
- [ ] No lingering SkillOpt or backend subprocesses remain.

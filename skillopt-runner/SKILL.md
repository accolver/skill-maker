---
name: skillopt-runner
description: Run Microsoft SkillOpt benchmarks for agent skills with synthetic train/validation/held-out splits, stable adapter patching, multi-epoch runs, artifact collection, and honest comparison against Skill Maker baselines. Use when the user mentions SkillOpt, optimizing skills, benchmarking skills, multi-epoch skill optimization, held-out skill evals, overfitting checks, or comparing SkillOpt with Skill Maker.
---

# SkillOpt Runner

Run Microsoft SkillOpt experiments against agent skills without losing the
lessons learned from prior runs: held-out evaluation matters, SkillOpt needs a
custom adapter for agent-skill tasks, and live CLI backends can hang unless the
run is isolated, bounded, and documented carefully.

## Core principles

1. **Always separate train / validation / held-out test.** Train and validation
   are for SkillOpt; the final headline comparison uses held-out test only.
2. **Compare against the right Skill Maker baseline.** Use frozen Skill Maker
   held-out scores for transfer/generalization; label original Skill Maker eval
   scores as in-sample/regression scores if they reused the skill's own evals.
3. **Keep backends isolated.** Prevent installed user/project skills from
   contaminating target rollouts. Use temporary `HOME` and preserve real auth via
   `CODEX_HOME` when using Codex CLI.
4. **Bound every external agent call.** SkillOpt can hang at rollout, reflect, or
   final test evaluation. Use explicit timeouts, unbuffered logs, and inspect the
   prediction directory when progress stops.
5. **Document fallbacks honestly.** Deterministic or offline fallbacks are useful
   for proving the SkillOpt loop mechanics, but they are not clean live-LLM
   quality comparisons.

## Standard workflow

### 1. Prepare or refresh SkillOpt

```bash
git clone https://github.com/microsoft/SkillOpt.git /tmp/SkillOpt
python3 -m venv /tmp/skillopt-venv
/tmp/skillopt-venv/bin/pip install -e /tmp/SkillOpt
```

If `/tmp/SkillOpt` already exists, record its commit before changing it:

```bash
git -C /tmp/SkillOpt rev-parse --short HEAD
```

### 2. Patch SkillOpt for agent skill evals

From this repo, copy the custom adapter/config and register the environment:

```bash
python skillopt/scripts/patch-skillopt-for-codex.py /tmp/SkillOpt
```

The adapter should provide:

- `skillopt/envs/agent_skill_eval/adapter.py`
- `skillopt/envs/agent_skill_eval/dataloader.py`
- `configs/agent_skill_eval/default.yaml`
- train/eval registry entries for `agent_skill_eval`
- backend allowance for `codex_exec`

Before long runs, verify the patched adapter compiles:

```bash
python3 -m py_compile \
  /tmp/SkillOpt/skillopt/envs/agent_skill_eval/adapter.py \
  /tmp/SkillOpt/skillopt/envs/agent_skill_eval/dataloader.py
```

### 3. Create synthetic split data

Generate at least train, validation, and held-out test data. For this repo's
existing benchmark harness:

```bash
python skillopt/scripts/generate-synthetic-splits.py . --skillopt-root /tmp/SkillOpt
```

Expected locations are the repo-local synthetic data directory and the copied `/tmp/SkillOpt` data directory, each containing `<skill>/{train,val,test}/items.json`.

A tiny 3/3/3 split is acceptable for smoke tests but too noisy for conclusions.
For claims about quality, expand the split first.

### 4. Run frozen Skill Maker on held-out test

Run current repo skills only on held-out test:

```bash
python skillopt/scripts/run-skillmaker-heldout.py \
  skillopt/data/synthetic-agent-skill-v2 \
  skillopt/results/synthetic-v2/skillmaker-heldout
```

Report both hard and soft scores. Do not compare SkillOpt held-out results to
Skill Maker's original in-sample eval-loop numbers as if they were equivalent.

### 5. Run SkillOpt

For a one-step live smoke run, use the repo script or equivalent `train.py`
command:

```bash
PATH=/tmp/skillopt-venv/bin:$PATH \
CODEX_HOME="$HOME/.codex" \
CODEX_PROFILE=review \
CODEX_SANDBOX_MODE=read-only \
CODEX_CLI_BIN=codex \
PYTHONUNBUFFERED=1 \
skillopt/scripts/run-one-skillopt.sh \
  /tmp/SkillOpt <skill-name> /tmp/SkillOpt/outputs/synthetic-v2-<skill-name>
```

For multi-epoch runs, prefer an explicit shell wrapper so logs stream live:

```bash
cd /tmp/SkillOpt
PYTHONUNBUFFERED=1 \
CODEX_HOME="$HOME/.codex" \
CODEX_PROFILE=review \
CODEX_SANDBOX_MODE=read-only \
CODEX_CLI_BIN=codex \
/tmp/skillopt-venv/bin/python -u scripts/train.py \
  --config configs/agent_skill_eval/default.yaml \
  --split_dir /tmp/SkillOpt/data/agent_skill_eval_synthetic_v2/<skill-name> \
  --skill_init /tmp/SkillOpt/data/agent_skill_eval_synthetic_v2/<skill-name>/initial_skill.md \
  --out_root /tmp/SkillOpt/outputs/synthetic-v2-4epoch-<skill-name> \
  --num_epochs 4 \
  --batch_size 3 \
  --optimizer_model gpt-5.4-mini \
  --target_model gpt-5.4-mini \
  --cfg-options \
    env.exec_timeout=60 \
    model.optimizer_backend=codex_exec \
    model.target_backend=codex_exec \
    model.reasoning_effort=low \
    model.codex_exec_profile=review \
    model.codex_exec_sandbox=read-only \
    optimizer.use_slow_update=false \
    optimizer.use_meta_skill=false \
    evaluation.sel_env_num=3 \
    evaluation.test_env_num=3 \
    evaluation.gate_metric=soft \
  2>&1 | tee /tmp/skillopt-synthetic-v2-4epoch-<skill-name>.log
```

Use `slow_update=true` and `meta_skill=true` only after the fast path is stable;
those settings can multiply runtime and make hangs harder to diagnose.

## Stability playbook

### If the run hangs at baseline or rollout

Look under the active prediction directory:

```bash
find /tmp/SkillOpt/outputs/<run>/ -path '*/predictions/*' -maxdepth 6 -type f | sort | sed -n '1,160p'
```

Inspect the stuck item directory. Useful files are commonly:

- `target_user_prompt.txt`
- `target_system_prompt.txt`
- `target_prompt.txt`
- `answer.txt` / `last_message.txt`
- `codex.jsonl`, `codex.stderr`, or target stdout/stderr files
- `debug_before_popen.txt`, `debug_after_popen.txt`, `debug_timeout.txt`

If only prompt/debug-before files exist, the target subprocess likely wedged
before producing output.

### If Codex CLI hangs

Patch target calls to use:

- `timeout -k 5 <seconds> codex exec ...`
- `subprocess.Popen(..., start_new_session=True)`
- process-group kill on timeout: `os.killpg(proc.pid, 9)`
- temporary `HOME` outside the SkillOpt output directory
- preserved `CODEX_HOME=$HOME/.codex` for authentication

Do **not** set `HOME` to the rollout output directory; Codex may treat generated
files as workspace context and stall on later rollouts.

### If Pi subprocesses hang

Use:

```bash
pi -p --no-skills --no-tools --no-context-files --no-session --no-extensions \
  --model google/gemini-2.5-flash --thinking off
```

Pipe prompts via a file when stdin pipe behavior is suspect. If Pi still wedges
inside SkillOpt, switch to direct HTTP/API or a deterministic fallback and label
that run as a mechanics check.

### If direct Gemini calls hang inside threads

Avoid `signal.alarm` in worker threads; it fails with `signal only works in main
thread of the main interpreter`. Avoid macOS unsafe `fork()` after Objective-C
runtime initialization; it can crash with `objc_initializeAfterForkError`.

If using a fallback worker, prefer a separate process with `spawn`, or bypass
network calls for a deterministic mechanics run.

### If Gemini returns 404 for a model

Use currently available models such as:

- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`

Do not use retired model IDs like `gemini-2.0-flash-lite`.

## Deterministic fallback policy

Use deterministic fallback only when the user explicitly wants the SkillOpt loop
to complete and live model routes are blocked by hangs.

When using fallback:

1. Put results under a clearly named directory, e.g.
   `skillopt/results/synthetic-v2/multiepoch-fallback/`.
2. State that the run verifies orchestration mechanics, not clean LLM quality.
3. Record accept/reject counts, best step, validation score, held-out score, and
   the exact fallback behavior.
4. Keep the clean live run results separate.

## Reporting format

Always include two tables when both are available:

### Clean held-out comparison

| Skill | Skill Maker hard | Skill Maker soft | SkillOpt hard | SkillOpt soft | Hard delta | Soft delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |

### Multi-epoch mechanics run

| Skill | Epochs | Accept / Reject | Best step | Held-out hard | Held-out soft | Caveat |
| --- | ---: | ---: | ---: | ---: | ---: | --- |

In the narrative, say which table is a quality comparison and which table is a
mechanics check.

## Common mistakes

| Mistake | Why it matters | Correct action |
| --- | --- | --- |
| Comparing SkillOpt held-out to Skill Maker in-sample scores | Overstates Skill Maker or mixes protocols | Compare held-out to held-out; label in-sample separately |
| Using the held-out test split for iteration decisions | Overfits final evaluation | Train on train, gate on validation, evaluate test once at the end |
| Ending after a timeout without artifacts | Loses the useful failure evidence | Preserve logs, prompt files, predictions, and partial summaries |
| Treating deterministic fallback wins as live SkillOpt wins | Misleads future decisions | Label as fallback mechanics run |
| Running without `PYTHONUNBUFFERED=1` | No live progress during long hangs | Use `python -u` and `tee` logs |
| Letting installed skills load in target rollouts | Contaminates benchmark | Use no-skills/no-tools modes or isolated `HOME` |
| Trusting a 3-item validation split | Very noisy acceptance gate | Expand data before drawing quality conclusions |

## Final validation checklist

Before reporting results:

- `summary.json` exists for every run.
- Frozen Skill Maker held-out results are present.
- SkillOpt best/final held-out results are present.
- Candidate and best skill artifacts are copied into repo results.
- JSON artifacts load with `json.load`.
- Python scripts compile with `python3 -m py_compile`.
- `ps` shows no lingering `SkillOpt`, `codex exec`, or `pi -p` processes.
- The report explicitly states caveats about data size, backend fallbacks, and
  whether Skill Maker was frozen or retrained.
